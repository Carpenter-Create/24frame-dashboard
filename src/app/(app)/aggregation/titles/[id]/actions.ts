"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { generateToken, hashToken } from "@/lib/portal";
import { escapeIlikePattern } from "@/lib/buyer-names";
import { resolveTerritories, type TerritoryMode } from "@/lib/territories";
import type { RightsType } from "@/lib/rights";
import { aggregationViewAsSurface } from "@/lib/aggregation-impersonation";
import {
  computeMetadataFindings,
  METADATA_FIELDS,
  METADATA_LOGIC_VERSION,
  normalizeStoredMetadata,
  parseMetadata,
  requiredComplete,
} from "@/lib/metadata";
import { checkReleaseInfo, releaseInfoSchema } from "@/lib/releases";
import { getOrgContext } from "@/lib/supabase/context";
import { RELEASE_FIELD, TITLE_DETAILS } from "@/lib/title-details";
import type { Json } from "@/lib/supabase/database.types";
import { purgeDeletedTitleStorage } from "@/lib/s3-title-purge";
import { TITLES_HREF, titleClientPath } from "@/lib/title-public-id";
import { TITLE_LIFECYCLE } from "@/lib/titles-lifecycle";
import { TITLE_DETAIL } from "@/lib/titles";

// Add a rights grant (expand = insert) for a title in the active org. Territories
// resolve to ISO codes server-side; the write goes through the add_rights_grant
// SECURITY DEFINER RPC (capability re-checked in the DB).
export async function addRights(input: {
  orgId: string;
  titleId: string;
  rightsTypes: RightsType[];
  mode: TerritoryMode;
  countryCodes: string[];
  exclusive: boolean;
  windowStart: string | null;
  windowEnd: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };
  if (input.rightsTypes.length === 0) return { error: "Select at least one rights type." };

  let territories: string[];
  try {
    territories = resolveTerritories(input.mode, input.countryCodes);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid territories." };
  }

  const { error } = await supabase.rpc("add_rights_grant", {
    p_org_id: input.orgId,
    p_title_id: input.titleId,
    p_rights_types: input.rightsTypes,
    p_mode: input.mode,
    p_territories: territories,
    p_exclusive: input.exclusive,
    p_window_start: input.windowStart ?? undefined,
    p_window_end: input.windowEnd ?? undefined,
    p_effective_from: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath(`${TITLES_HREF}/${input.titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}

// Set a title's screener source (master = the master doubles as the screener;
// dedicated = a separately-uploaded screener asset). Written via the
// set_screener_source RPC (operate-gated in the DB; titles is RPC-only-write).
export async function setScreenerSource(input: {
  titleId: string;
  source: "master" | "dedicated";
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("set_screener_source", {
    p_title_id: input.titleId,
    p_source: input.source,
  });
  if (error) return { error: error.message };

  revalidatePath(`${TITLES_HREF}/${input.titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}

// The title's Metadata window saves here: metadata and release info in one
// Done (docs/design-locks/aggregation-title-details-window-lock-v1.md).
// Nothing the browser sends decides who may write: the title is read under
// row security (another org's or a deleted title is never found), its org
// comes from that row, view-as is refused, and only the title org's
// operators write. Release is checked before anything is written; only the
// changed metadata fields are merged onto the stored record as read just
// before the write (the set RPC replaces the record, so two saves in the
// same instant can still race; an atomic merge in the RPC is founder SQL).
// Database text never reaches the browser.
const titleDetailsInput = z.object({
  titleId: z.string().uuid(),
  // Changed fields only; null clears one.
  metadata: z.record(z.string(), z.unknown()),
  // Null when Release did not change.
  release: releaseInfoSchema.nullable(),
});

export type SaveTitleDetailsResult =
  | { ok: true }
  | {
      ok: false;
      part: "access" | "metadata" | "release";
      /** The field at fault, when one is. */
      field: string | null;
      error: string;
      /** Metadata was written before Release failed. */
      metadataSaved: boolean;
    };

function refused(error: string): SaveTitleDetailsResult {
  return { ok: false, part: "access", field: null, error, metadataSaved: false };
}

export async function saveTitleDetails(input: unknown): Promise<SaveTitleDetailsResult> {
  const parsed = titleDetailsInput.safeParse(input);
  if (!parsed.success) return refused(TITLE_DETAILS.saveFailed);
  const { titleId, metadata: changes, release } = parsed.data;

  const user = await getAuthUser();
  if (!user) return refused(TITLE_DETAILS.notAuthenticated);
  const ctx = await getOrgContext();
  if (!ctx) return refused(TITLE_DETAILS.notAuthenticated);
  if (ctx.aggregationViewAs) return refused(TITLE_DETAILS.notAuthorized);

  const supabase = await createClient();
  const { data: title } = await supabase
    .from("titles")
    .select("id, org_id, catalog_id, release_type, original_release_date")
    .eq("id", titleId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!title) return refused(TITLE_DETAILS.notAuthorized);

  const titleRole =
    ctx.rows.find((m) => m.organizations.id === title.org_id)?.role ??
    (ctx.activeOrg?.id === title.org_id ? ctx.activeRole : null);
  const { canOperate } = aggregationViewAsSurface({
    viewAs: ctx.aggregationViewAs,
    canOperate: titleRole === "account_owner" || titleRole === "delivery_ops",
    isGcStaff: ctx.isGcStaff,
  });
  if (!canOperate) return refused(TITLE_DETAILS.notAuthorized);

  const releaseProblem = release ? checkReleaseInfo(release) : null;
  if (releaseProblem) {
    return { ok: false, part: "release", field: RELEASE_FIELD, error: releaseProblem, metadataSaved: false };
  }
  if (Object.keys(changes).some((key) => !METADATA_FIELDS.some((f) => f.key === key))) {
    return refused(TITLE_DETAILS.saveFailed);
  }

  let metadataSaved = false;
  if (Object.keys(changes).length > 0) {
    const { data: row, error: readError } = await supabase
      .from("title_metadata")
      .select("data")
      .eq("title_id", title.id)
      .maybeSingle();
    // A failed read is never "no record": merging onto nothing would store
    // only the changed fields and drop every other one.
    if (readError) {
      console.error("[title-details] title_metadata read failed", readError.message);
      return { ok: false, part: "metadata", field: null, error: TITLE_DETAILS.saveFailed, metadataSaved: false };
    }
    // Read as the window reads it (Bugbot on #801): a stored empty or a
    // number stored as text never blocks a save the window can't show.
    const merged = normalizeStoredMetadata(row?.data as Record<string, unknown> | null);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    const checked = parseMetadata(merged);
    if (!checked.ok) {
      return { ok: false, part: "metadata", field: checked.field, error: checked.error, metadataSaved: false };
    }
    const { error } = await supabase.rpc("set_title_metadata", {
      p_org_id: title.org_id,
      p_title_id: title.id,
      p_data: checked.data as Json,
    });
    if (error) {
      console.error("[title-details] set_title_metadata failed", error.message);
      return { ok: false, part: "metadata", field: null, error: TITLE_DETAILS.saveFailed, metadataSaved: false };
    }
    metadataSaved = true;
    // §19: metadata changed → refresh this title's validator findings. Best-effort: the
    // save already committed, so a refresh failure must not fail it.
    const { error: findingsError } = await supabase.rpc("reconcile_title_findings", {
      p_org_id: title.org_id,
      p_title_id: title.id,
      p_findings: computeMetadataFindings(checked.data as Record<string, unknown>) as unknown as Json,
      p_logic_version: METADATA_LOGIC_VERSION,
    });
    if (findingsError) console.error("[findings] reconcile after metadata save failed", findingsError.message);
  }

  const releaseDiffers =
    release !== null &&
    (release.releaseType !== title.release_type ||
      (release.releaseType === "re_release" ? release.originalReleaseDate : null) !==
        (title.release_type === "re_release" ? title.original_release_date : null));
  if (release && releaseDiffers) {
    const { error } = await supabase.rpc("set_title_release_info", {
      p_org_id: title.org_id,
      p_title_id: title.id,
      p_release_type: release.releaseType,
      p_original_release_date:
        release.releaseType === "re_release" ? (release.originalReleaseDate ?? undefined) : undefined,
    });
    if (error) {
      console.error("[title-details] set_title_release_info failed", error.message);
      if (metadataSaved) revalidateTitle(title.catalog_id);
      return { ok: false, part: "release", field: null, error: TITLE_DETAILS.saveFailed, metadataSaved };
    }
  }

  if (metadataSaved || releaseDiffers) revalidateTitle(title.catalog_id);
  return { ok: true };
}

function revalidateTitle(catalogId: string | null) {
  revalidatePath(titleClientPath(catalogId));
  revalidatePath(TITLES_HREF, "layout");
}

// Submit a draft title for chain-of-title review (§11): draft → in_review, via
// the submit_title RPC (operate-gated in the DB).
export async function submitTitle(
  orgId: string,
  titleId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  // Submit only with every required field filled with a value the checks
  // accept: the button can be stale, and a stored value from before the
  // limits must not pass (Codex on #801).
  const { data: stored, error: readError } = await supabase
    .from("title_metadata")
    .select("data")
    .eq("title_id", titleId)
    .maybeSingle();
  if (readError) return { error: TITLE_DETAILS.saveFailed };
  const complete = requiredComplete(stored?.data as Record<string, unknown> | null);
  if (complete.filled < complete.total) return { error: TITLE_DETAIL.requiredNotice(complete.total) };

  const { error } = await supabase.rpc("submit_title", { p_org_id: orgId, p_title_id: titleId });
  if (error) return { error: error.message };

  // §19: submit is a findings trigger too — refresh from current metadata (best-effort;
  // a reconcile failure must not fail the submit, which already committed).
  try {
    const { data: metaRow } = await supabase
      .from("title_metadata")
      .select("data")
      .eq("title_id", titleId)
      .maybeSingle();
    const findings = computeMetadataFindings((metaRow?.data as Record<string, unknown>) ?? {});
    await supabase.rpc("reconcile_title_findings", {
      p_org_id: orgId,
      p_title_id: titleId,
      p_findings: findings as unknown as Json,
      p_logic_version: METADATA_LOGIC_VERSION,
    });
  } catch (e) {
    console.error("[findings] reconcile after submit failed", e);
  }

  revalidatePath(`${TITLES_HREF}/${titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}

// Create (or replace) a screener share link for a named buyer. The raw token is persisted
// as share_token so the URL can be re-copied on later page loads — acceptable for a screener
// (view-only, still OTP-gated at the portal; the OTP is the real gate, not the URL).
// Authorization is the RPC itself — member_can(...,'operate') on the title's org plus the
// post-approval status gate — never this action.
//
// Links are per-buyer, not per-title: calling this again for the SAME recipient name is the
// "replace" — the RPC revokes that buyer's previous live link first, so a URL already sent to
// them stops resolving. A different name creates a second, independent link. Matching is
// case-insensitive in the DB but the casing the client types is what gets stored and shown, so
// "tubi" and "Tubi" collide (replace, not two rows) — do not add client-side normalisation that
// would contradict that.
//
// Unification (20260806000300): the match is on (title, recipient) alone — no author partition.
// Whoever created the earlier live link for that buyer, a same-name create replaces it. So the
// collision check below reads every live screener_view link on the title regardless of who
// created it; it does not need to know or care whether the caller is GC staff.
//
// A collision is a SILENT, DESTRUCTIVE replace from the client's point of view: typing a name
// that already has a live link kills the URL already emailed to that buyer with no signal that
// just happened. So unless the caller has explicitly asked to replace (the "Replace link"
// button on an existing row — a deliberate, informed action), check for a live link with the
// same name first and refuse with a message rather than silently swapping it out. The check
// uses `.ilike()` on the escaped, trimmed name so it matches the RPC's real matching SQL
// (`lower(recipient_name) is not distinct from lower(nullif(btrim(p_recipient_name), ''))`,
// 20260806000300) — see lib/buyer-names.ts for why the escaping matters (a name with a literal
// % or _ would otherwise become a wildcard).
export async function createBuyerScreenerLink(input: {
  titleId: string;
  recipientName: string;
  replace?: boolean;
}): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };
  const recipient = input.recipientName.trim();
  // 20260806000500: create_screener_link's client branch now enforces this in the database too
  // (raises "A buyer name is required") — that RPC guard, not this one, is what actually stops
  // a client from minting an unnamed link (e.g. by calling the RPC directly from the browser),
  // which the buyer-link gate would otherwise misclassify as GC's own operational link and
  // stream the master. This check only exists to fail fast with a form-friendly message instead
  // of a raw Postgres exception; keep its wording consistent with the RPC's, never contradictory.
  if (!recipient) return { error: "Enter the buyer's name." };

  if (!input.replace) {
    const { data: candidates } = await supabase
      .from("portal_links")
      .select("recipient_name")
      .eq("title_id", input.titleId)
      .eq("purpose", "screener_view")
      .is("revoked_at", null)
      // Fix round 3, item 7: an EXPIRED link is already dead to the buyer — the RPC's own
      // match predicate (20260806000300) only checks revoked_at is null, so calling create
      // again for that name silently revokes-and-replaces it with no live URL actually being
      // killed. Warning here anyway would block the ordinary "their old link lapsed, send a
      // new one" case behind an unnecessary confirmation click.
      .gt("expires_at", new Date().toISOString())
      .ilike("recipient_name", escapeIlikePattern(recipient))
      // At most one live row can match a given name (the RPC enforces that), so 1 would
      // suffice; 5 is a small defensive margin, not a real list — this is an existence check,
      // not a page.
      .limit(5);
    const existing = candidates?.[0];
    if (existing?.recipient_name) {
      return {
        error: `A link for ${existing.recipient_name} already exists. Use Replace link on that buyer to send a new URL, or enter a different name.`,
      };
    }
  }

  const token = generateToken();
  const { error } = await supabase.rpc("create_screener_link", {
    p_title_id: input.titleId,
    p_token_hash: hashToken(token),
    p_share_token: token,
    p_recipient_name: recipient,
  });
  if (error) return { error: error.message };

  const base = process.env.PORTAL_BASE_URL?.replace(/\/+$/, "") ?? "";
  revalidatePath(`${TITLES_HREF}/${input.titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return { url: `${base}/portal/${token}` };
}

// Withdraw the live link without minting a replacement — "stop sharing this".
export async function revokeBuyerScreenerLink(input: {
  linkId: string;
  titleId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("revoke_portal_link", { p_link_id: input.linkId });
  if (error) return { error: error.message };

  revalidatePath(`${TITLES_HREF}/${input.titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}

export async function deleteTitle(titleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  // Capture org_id before delete_title hides the row from RLS. S3 purge
  // runs after the RPC so authorization stays in the database; if purge
  // fails the catalog change has already committed and the sweeper retries.
  const { data: title, error: titleError } = await supabase
    .from("titles")
    .select("id, org_id")
    .eq("id", titleId)
    .maybeSingle();
  if (titleError) return { error: titleError.message };
  if (!title) return { error: "Title not found." };

  const { error } = await supabase.rpc("delete_title", { p_title_id: title.id });
  if (error) return { error: error.message };

  revalidatePath(TITLES_HREF);
  revalidatePath(`${TITLES_HREF}/${titleId}`);
  revalidatePath(TITLES_HREF, "layout");

  try {
    await purgeDeletedTitleStorage({
      orgId: title.org_id,
      titleId: title.id,
      markPurged: async () => {
        const marked = await supabase.rpc("mark_deleted_title_prefix_purged", {
          p_title_id: title.id,
        });
        return { error: marked.error };
      },
    });
  } catch (e) {
    console.error("[title-s3-purge] delete path failed", e);
    return { error: TITLE_LIFECYCLE.purgeFailed };
  }

  return {};
}

export async function archiveTitle(titleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("archive_title", { p_title_id: titleId });
  if (error) return { error: error.message };

  revalidatePath(TITLES_HREF);
  revalidatePath(`${TITLES_HREF}/${titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}

export async function restoreTitle(titleId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("restore_title", { p_title_id: titleId });
  if (error) return { error: error.message };

  revalidatePath(TITLES_HREF);
  revalidatePath(`${TITLES_HREF}/${titleId}`);
  revalidatePath(TITLES_HREF, "layout");
  return {};
}
