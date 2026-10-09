import { houseWindowClosedHref, houseWindowOpenHref, parseHouseWindowParam } from "@/lib/house-window";
import {
  METADATA_FIELDS,
  metadataFieldError,
  metadataTierCount,
  parseMetadata,
  type FieldDef,
  type Tier,
} from "@/lib/metadata";
import { PRODUCT_NAME } from "@/lib/product";
import { TITLE_PAGE_WINDOW_PARAMS } from "@/lib/titles";
import {
  RELEASE_TYPE_LABEL,
  checkReleaseInfo,
  formatReleaseDate,
  type ReleaseInfo,
  type ReleaseType,
} from "@/lib/releases";

// The title's Metadata window (docs/design-locks/aggregation-title-details-window-lock-v1.md):
// one window over the title page for its metadata and release info. The index
// shows Required, Recommended, Optional and Release; each opens its face.

export const TITLE_DETAILS_PARAM = "edit";

export type TitleDetailsFace = "index" | "required" | "recommended" | "optional" | "release";

export const TITLE_DETAILS_TIERS: readonly Tier[] = ["required", "recommended", "optional"];

const FACES: readonly TitleDetailsFace[] = ["index", ...TITLE_DETAILS_TIERS, "release"];

export const TITLE_DETAILS = {
  title: "Metadata",
  faces: {
    index: "Metadata",
    required: "Required",
    recommended: "Recommended",
    optional: "Optional",
    release: "Release",
  } satisfies Record<TitleDetailsFace, string>,
  // "{filled} of {total} complete" (Adam 2026-10-09, "4 of 6 complete").
  tierSummary: (filled: number, total: number) => `${filled} of ${total} complete`,
  reReleaseSummary: (date: string) => `${RELEASE_TYPE_LABEL.re_release} · ${date}`,
  close: "Close",
  back: "Back",
  done: "Done",
  edit: "Edit",
  view: "View",
  editMetadata: "Edit metadata",
  listHint: "Comma-separated",
  releaseType: "Type",
  originalReleaseDate: "Original release date",
  originalRelease: "Original release",
  releaseDate: "Release date",
  releaseDateSetBy: `Set by ${PRODUCT_NAME}`,
  // The ask, as Edit profile's (Adam 2026-10-09, "Reuse Edit's, name rows").
  discardTitle: "Discard changes?",
  discardOne: "{rows} isn't saved.",
  discardMany: "{rows} aren't saved.",
  discardAnd: "and",
  discardKeep: "Keep editing",
  discardConfirm: "Discard",
  notAuthenticated: "Not authenticated.",
  notAuthorized: "Not authorized.",
  saveFailed: "Could not save.",
} as const;

export function parseTitleDetailsFace(value: string | null): TitleDetailsFace {
  return FACES.includes(value as TitleDetailsFace) ? (value as TitleDetailsFace) : "index";
}

/** `?edit` / `?edit=<face>`: the window and its face, or null when absent. An
 *  unknown face opens the index. */
export function parseTitleDetailsWindow(search: string): TitleDetailsFace | null {
  return parseHouseWindowParam(search, TITLE_DETAILS_PARAM, parseTitleDetailsFace);
}

export function titleDetailsOpenHref(pathname: string, search: string, face: TitleDetailsFace = "index"): string {
  return houseWindowOpenHref(pathname, search, TITLE_DETAILS_PARAM, face, "index");
}

/** The page under the window: neither title-page window's query, so the
 *  page under Metadata never carries ?add-right (one window per address). */
export function titleDetailsClosedHref(pathname: string, search: string): string {
  return houseWindowClosedHref(pathname, search, TITLE_PAGE_WINDOW_PARAMS);
}

// ---- The draft -------------------------------------------------------------

/** Field values as typed: lists comma-separated, numbers as text. */
export type MetadataDraft = Record<string, string>;

export type ReleaseDraft = { type: ReleaseType; originalDate: string };

/** Stored metadata as the fields show it. */
export function metadataToDraft(data: Record<string, unknown>): MetadataDraft {
  const out: MetadataDraft = {};
  for (const f of METADATA_FIELDS) {
    const v = data?.[f.key];
    out[f.key] = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
  }
  return out;
}

function draftValue(f: FieldDef, raw: string): unknown {
  const value = raw.trim();
  if (value === "") return undefined;
  if (f.type === "number") return Number(value);
  if (f.type === "list") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return value;
}

/** The draft as stored values; an empty field is left out. */
export function draftToMetadata(draft: MetadataDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of METADATA_FIELDS) {
    const value = draftValue(f, draft[f.key] ?? "");
    if (value !== undefined) out[f.key] = value;
  }
  return out;
}

/** Only the fields the draft changed; a cleared field is null. */
export function metadataChanges(
  baseline: Record<string, unknown>,
  draft: MetadataDraft,
): Record<string, unknown> {
  const before = draftToMetadata(metadataToDraft(baseline));
  const after = draftToMetadata(draft);
  const out: Record<string, unknown> = {};
  for (const f of METADATA_FIELDS) {
    const a = before[f.key];
    const b = after[f.key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out[f.key] = b === undefined ? null : b;
  }
  return out;
}

export function releaseDraft(info: ReleaseInfo): ReleaseDraft {
  return { type: info.releaseType, originalDate: info.originalReleaseDate ?? "" };
}

/** The release draft as saved: a new release keeps no original date. */
export function releaseInfoFromDraft(draft: ReleaseDraft): ReleaseInfo {
  return {
    releaseType: draft.type,
    originalReleaseDate: draft.type === "re_release" && draft.originalDate ? draft.originalDate : null,
  };
}

export function releaseChanged(baseline: ReleaseInfo, draft: ReleaseDraft): boolean {
  const next = releaseInfoFromDraft(draft);
  const before = releaseInfoFromDraft(releaseDraft(baseline));
  return next.releaseType !== before.releaseType || next.originalReleaseDate !== before.originalReleaseDate;
}

/** The rows with changes, in row order (for the ask's line). */
export function titleDetailsChangedRows(
  baseline: { metadata: Record<string, unknown>; release: ReleaseInfo },
  draft: { metadata: MetadataDraft; release: ReleaseDraft },
): TitleDetailsFace[] {
  const changed = new Set(Object.keys(metadataChanges(baseline.metadata, draft.metadata)));
  const rows: TitleDetailsFace[] = TITLE_DETAILS_TIERS.filter((tier) =>
    METADATA_FIELDS.some((f) => f.tier === tier && changed.has(f.key)),
  );
  if (releaseChanged(baseline.release, draft.release)) rows.push("release");
  return rows;
}

/** "Required isn't saved." · "Required and Release aren't saved." */
export function titleDetailsDiscardLine(rows: readonly TitleDetailsFace[]): string {
  if (rows.length === 0) return "";
  const labels = rows.map((row) => TITLE_DETAILS.faces[row]);
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} ${TITLE_DETAILS.discardAnd} ${labels[labels.length - 1]}`;
  const template = labels.length === 1 ? TITLE_DETAILS.discardOne : TITLE_DETAILS.discardMany;
  return template.replace("{rows}", joined);
}

// ---- Checks ----------------------------------------------------------------

export const RELEASE_FIELD = "original_release_date";

export type TitleDetailsProblem = { face: TitleDetailsFace; field: string; error: string };

/** The face a field is edited on. */
export function titleDetailsFaceForField(field: string): TitleDetailsFace {
  if (field === RELEASE_FIELD || field === "release_type") return "release";
  const tier = METADATA_FIELDS.find((f) => f.key === field)?.tier;
  return tier ?? "index";
}

/** The first field Done would refuse, in face and field order, or null. Each
 *  value is checked alone, so the problem named is the one shown first. */
export function checkTitleDetails(
  draft: { metadata: MetadataDraft; release: ReleaseDraft },
  now: Date = new Date(),
): TitleDetailsProblem | null {
  for (const tier of TITLE_DETAILS_TIERS) {
    for (const f of METADATA_FIELDS.filter((field) => field.tier === tier)) {
      const value = draftValue(f, draft.metadata[f.key] ?? "");
      if (value === undefined) continue;
      if (!parseMetadata({ [f.key]: value }).ok) {
        return { face: tier, field: f.key, error: metadataFieldError(f.key, now) };
      }
    }
  }
  const release = checkReleaseInfo(releaseInfoFromDraft(draft.release), now);
  if (release) return { face: "release", field: RELEASE_FIELD, error: release };
  return null;
}

// ---- The index rows ----------------------------------------------------------

export function titleDetailsTierSummary(draft: MetadataDraft, tier: Tier): string {
  const { filled, total } = metadataTierCount(draftToMetadata(draft), tier);
  return TITLE_DETAILS.tierSummary(filled, total);
}

export function titleDetailsReleaseSummary(draft: ReleaseDraft): string {
  if (draft.type === "re_release" && draft.originalDate) {
    return TITLE_DETAILS.reReleaseSummary(formatReleaseDate(draft.originalDate));
  }
  return RELEASE_TYPE_LABEL[draft.type];
}
