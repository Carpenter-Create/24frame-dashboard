import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { DELIVER_CHUNK, type DeliverTitleRow, type GrantChoice } from "@/lib/deliver-stepper";
import { UNPAGINATED_MAX, probeRange, rangeFor, splitProbe } from "@/lib/list-bounds";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Bound for every /gc/deliveries companion list. Below PostgREST max_rows (1000)
 * so our probe bites first. Parents on the page are already ≤ LIST_PAGE (200);
 * this is the child-row ceiling across those IDs.
 */
export const GC_DELIVERIES_COMPANION_LIMIT = UNPAGINATED_MAX;

export type BoundedCompanion<T> = { rows: T[]; truncated: boolean };

export type GrantCompanionRow = {
  id: string;
  title_id: string;
  rights_type: string;
  territory_mode: string;
  territories: string[] | null;
};

export type MasterCompanionRow = {
  id: string;
  title_id: string;
  original_filename: string | null;
  bytes: number;
};

export type LinkCompanionRow = {
  id: string;
  delivery_id: string | null;
  asset_id: string | null;
  expires_at: string;
  revoked_at: string | null;
};

export type SessionCompanionRow = {
  id: string;
  link_id: string;
  name: string;
  company: string;
  email: string;
  expires_at: string;
  revoked_at: string | null;
};

export type EventCompanionRow = {
  link_id: string;
  event_type: Database["public"]["Enums"]["portal_event"];
  email: string | null;
  company: string | null;
  occurred_at: string;
};

export type GcDeliveryCompanions = {
  grants: BoundedCompanion<GrantCompanionRow>;
  masters: BoundedCompanion<MasterCompanionRow>;
  links: BoundedCompanion<LinkCompanionRow>;
  sessions: BoundedCompanion<SessionCompanionRow>;
  events: BoundedCompanion<EventCompanionRow>;
};

export function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function portalCompanionsTruncated(companions: GcDeliveryCompanions): boolean {
  return (
    companions.masters.truncated ||
    companions.links.truncated ||
    companions.sessions.truncated ||
    companions.events.truncated
  );
}

async function probeScopedList<T>(
  ids: string[],
  query: (ids: string[], range: [number, number]) => PromiseLike<{ data: T[] | null }>,
): Promise<BoundedCompanion<T>> {
  if (ids.length === 0) return { rows: [], truncated: false };
  const { data } = await query(ids, probeRange(GC_DELIVERIES_COMPANION_LIMIT));
  return splitProbe(data, GC_DELIVERIES_COMPANION_LIMIT);
}

/**
 * Companion reads for staff /gc/deliveries.
 *
 * Unbounded, PostgREST silently returns the first 1,000 rows — grants, masters,
 * links, sessions, and the access log all looked complete when they were not.
 * Each list is scoped to IDs already on the page (or the title picker) and
 * probed one past the cap so truncation is visible.
 */
export async function loadGcDeliveryCompanions(
  supabase: ServerClient,
  ids: {
    formTitleIds: string[];
    pageTitleIds: string[];
    pageDeliveryIds: string[];
  },
): Promise<GcDeliveryCompanions> {
  const formTitleIds = uniqueIds(ids.formTitleIds);
  const pageTitleIds = uniqueIds(ids.pageTitleIds);
  const pageDeliveryIds = uniqueIds(ids.pageDeliveryIds);

  const [grants, masters, links] = await Promise.all([
    probeScopedList<GrantCompanionRow>(formTitleIds, (titleIds, range) =>
      supabase
        .from("rights_grants")
        .select("id, title_id, rights_type, territory_mode, territories")
        .is("effective_to", null)
        .in("title_id", titleIds)
        .range(...range),
    ),
    probeScopedList<MasterCompanionRow>(pageTitleIds, (titleIds, range) =>
      supabase
        .from("assets")
        .select("id, title_id, original_filename, bytes")
        .eq("kind", "master")
        .in("title_id", titleIds)
        .range(...range),
    ),
    probeScopedList<LinkCompanionRow>(pageDeliveryIds, (deliveryIds, range) =>
      supabase
        .from("portal_links")
        .select("id, delivery_id, asset_id, expires_at, revoked_at, created_at")
        .eq("purpose", "master_download")
        .in("delivery_id", deliveryIds)
        .order("created_at", { ascending: false })
        .range(...range),
    ),
  ]);

  const pageLinkIds = uniqueIds(links.rows.map((link) => link.id));
  const [sessions, events] = await Promise.all([
    probeScopedList<SessionCompanionRow>(pageLinkIds, (linkIds, range) =>
      supabase
        .from("portal_sessions")
        .select("id, link_id, name, company, email, expires_at, revoked_at")
        .in("link_id", linkIds)
        .order("created_at", { ascending: false })
        .range(...range),
    ),
    probeScopedList<EventCompanionRow>(pageLinkIds, (linkIds, range) =>
      supabase
        .from("portal_access_events")
        .select("link_id, event_type, email, company, occurred_at")
        .in("link_id", linkIds)
        .order("occurred_at", { ascending: false })
        .range(...range),
    ),
  ]);

  return { grants, masters, links, sessions, events };
}

function deliverChunks(ids: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += DELIVER_CHUNK) out.push(ids.slice(i, i + DELIVER_CHUNK));
  return out;
}

/**
 * The Deliver window's selection (up to 500 titles): the titles (never a
 * deleted one) and their current grants, each read per chunk of 50 ids. Every
 * chunk checks its error, and each grant chunk is probed, so a failed or
 * cut-off read is refused, never shown as "no grants". Database text goes to
 * the server log only.
 */
export async function loadDeliverChoiceRows(
  supabase: ServerClient,
  titleIds: readonly string[],
): Promise<{ titles: DeliverTitleRow[]; grants: GrantChoice[] } | { error: "load_failed" | "load_too_many" }> {
  const chunks = deliverChunks(uniqueIds([...titleIds]));
  const [titleReads, grantReads] = await Promise.all([
    Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("titles")
          .select("id, title, status")
          .in("id", chunk)
          .is("deleted_at", null)
          .range(...rangeFor(DELIVER_CHUNK)),
      ),
    ),
    Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("rights_grants")
          .select("id, title_id, rights_type, territory_mode, territories, window_start, window_end")
          .is("effective_to", null)
          .in("title_id", chunk)
          .range(...probeRange(UNPAGINATED_MAX)),
      ),
    ),
  ]);

  const titles: DeliverTitleRow[] = [];
  for (const { data, error } of titleReads) {
    if (error) {
      console.error("[deliver] titles read failed", error.code, error.message);
      return { error: "load_failed" };
    }
    titles.push(...(data ?? []));
  }
  const grants: GrantChoice[] = [];
  for (const { data, error } of grantReads) {
    if (error) {
      console.error("[deliver] rights_grants read failed", error.code, error.message);
      return { error: "load_failed" };
    }
    const part = splitProbe(data, UNPAGINATED_MAX);
    if (part.truncated) return { error: "load_too_many" };
    grants.push(...part.rows);
  }
  return { titles, grants };
}
