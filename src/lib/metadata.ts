import { z } from "zod";
import { ISO_COUNTRIES } from "@/lib/territories";
import { LANGUAGES } from "@/lib/languages";

export type Tier = "required" | "recommended" | "optional";
export type FieldType = "text" | "textarea" | "number" | "select" | "list";
export type FieldDef = {
  key: string;
  label: string;
  tier: Tier;
  type: FieldType;
  vocab?: { value: string; label: string }[]; // for `select`
};

// Provisional genre + rating vocabularies (Option B — swap when vendors confirm).
export const GENRES: { value: string; label: string }[] = [
  "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance",
  "Sci-Fi", "Sport", "Thriller", "War", "Western",
].map((g) => ({ value: g.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: g }));

export const RATINGS: { value: string; label: string }[] = [
  "G", "PG", "PG-13", "R", "NC-17", "NR",
].map((r) => ({ value: r, label: r }));

// By name, so a long list reads in order (ISO_COUNTRIES is grouped by region).
const COUNTRIES = Object.entries(ISO_COUNTRIES)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "en"));

// THE canonical field registry — single source for the form AND the validator.
export const METADATA_FIELDS: FieldDef[] = [
  { key: "synopsis", label: "Synopsis", tier: "required", type: "textarea" },
  { key: "runtime_minutes", label: "Runtime (minutes)", tier: "required", type: "number" },
  { key: "release_year", label: "Release year", tier: "required", type: "number" },
  { key: "genre", label: "Genre", tier: "required", type: "select", vocab: GENRES },
  { key: "primary_language", label: "Primary language", tier: "required", type: "select", vocab: LANGUAGES },
  { key: "country_of_origin", label: "Country of origin", tier: "required", type: "select", vocab: COUNTRIES },
  { key: "director", label: "Director", tier: "recommended", type: "text" },
  { key: "cast", label: "Cast", tier: "recommended", type: "list" },
  { key: "rating", label: "Rating", tier: "recommended", type: "select", vocab: RATINGS },
  { key: "keywords", label: "Keywords", tier: "recommended", type: "list" },
  { key: "alternate_title", label: "Alternate title", tier: "optional", type: "text" },
  { key: "production_company", label: "Production company", tier: "optional", type: "text" },
];

// The limits Adam approved (2026-10-09, "Add these limits"); the database
// checks the same ones (check_title_metadata, a founder-applied migration).
export const METADATA_TEXT_MAX = 200;
export const METADATA_SYNOPSIS_MAX = 4000;
export const METADATA_RUNTIME_MIN = 1;
export const METADATA_RUNTIME_MAX = 1000;
export const METADATA_YEAR_MIN = 1888;
export const METADATA_LIST_MAX = 50;

/** The latest release year a title may carry: next year plus five (Adam,
 *  "year 1888 to next year + 5"), so 2032 in 2026. */
export function metadataMaxYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1 + 5;
}

// Counted as the database counts (characters, not UTF-16 units).
function chars(min: number, max: number) {
  return z.string().refine((value) => {
    const length = Array.from(value).length;
    return length >= min && length <= max;
  });
}

function fieldSchema(f: FieldDef): z.ZodTypeAny {
  switch (f.type) {
    case "number":
      if (f.key === "release_year") {
        return z
          .number()
          .int()
          .min(METADATA_YEAR_MIN)
          .refine((year) => year <= metadataMaxYear());
      }
      return z.number().int().min(METADATA_RUNTIME_MIN).max(METADATA_RUNTIME_MAX);
    case "list":
      return z.array(chars(1, METADATA_TEXT_MAX)).max(METADATA_LIST_MAX);
    case "select": {
      const values = (f.vocab ?? []).map((v) => v.value);
      return z.enum(values as [string, ...string[]]);
    }
    case "textarea":
      return chars(1, METADATA_SYNOPSIS_MAX);
    default: // text
      return chars(1, METADATA_TEXT_MAX);
  }
}

/** What a field says when its value breaks its limit (Adam 2026-10-09,
 *  "Specific line"). */
export function metadataFieldError(key: string, now: Date = new Date()): string {
  const field = METADATA_FIELDS.find((f) => f.key === key);
  if (!field) return METADATA_ERRORS.unknown;
  switch (field.type) {
    case "number":
      return key === "release_year"
        ? METADATA_ERRORS.year(metadataMaxYear(now))
        : METADATA_ERRORS.runtime;
    case "list":
      return METADATA_ERRORS.list;
    case "select":
      return METADATA_ERRORS.select;
    case "textarea":
      return METADATA_ERRORS.synopsis;
    default:
      return METADATA_ERRORS.text;
  }
}

/** What a field says for this value: as metadataFieldError, except that a
 *  Cast or Keywords entry over 200 characters reads "Up to 200 characters per
 *  entry." (Bugbot on #801; Adam 2026-10-09, "approved, use the defaults").
 *  Over 50 entries still reads "Up to 50 entries.", and so does any other
 *  list problem. */
export function metadataValueError(key: string, value: unknown, now: Date = new Date()): string {
  const field = METADATA_FIELDS.find((f) => f.key === key);
  if (
    field?.type === "list" &&
    Array.isArray(value) &&
    value.length <= METADATA_LIST_MAX &&
    value.some((entry) => typeof entry === "string" && Array.from(entry).length > METADATA_TEXT_MAX)
  ) {
    // An entry over 200 reads the text limit (an existing approved line).
    return METADATA_ERRORS.text;
  }
  return metadataFieldError(key, now);
}

export const METADATA_ERRORS = {
  runtime: "Enter whole minutes, 1 to 1,000.",
  year: (max: number) => `Enter a year from 1888 to ${max}.`,
  synopsis: "Up to 4,000 characters.",
  text: "Up to 200 characters.",
  list: "Up to 50 entries.",
  select: "Choose one from the list.",
  unknown: "Could not save.",
} as const;

// All fields optional → partial drafts are valid; provided fields are type/vocab
// checked. Unknown keys are stripped (zod object default). "The validator decides."
export const metadataSchema = z.object(
  Object.fromEntries(METADATA_FIELDS.map((f) => [f.key, fieldSchema(f).optional()])),
);

export type MetadataData = z.infer<typeof metadataSchema>;

export function parseMetadata(
  input: unknown,
): { ok: true; data: MetadataData } | { ok: false; error: string; field: string | null } {
  const r = metadataSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const first = r.error.issues[0];
  const key = first.path[0];
  const field = typeof key === "string" && METADATA_FIELDS.some((f) => f.key === key) ? key : null;
  const value = field && typeof input === "object" && input !== null ? (input as Record<string, unknown>)[field] : undefined;
  return { ok: false, error: field ? metadataValueError(field, value) : METADATA_ERRORS.unknown, field };
}

/** One tier's count for the window's rows: a field counts when it is filled
 *  and its value passes its check, so a row never reads complete and then
 *  fails on Done. */
export function metadataTierCount(
  values: Record<string, unknown>,
  tier: Tier,
): { filled: number; total: number } {
  const fields = METADATA_FIELDS.filter((f) => f.tier === tier);
  const filled = fields.filter(
    (f) => !isEmpty(values?.[f.key]) && fieldSchema(f).safeParse(values[f.key]).success,
  ).length;
  return { filled, total: fields.length };
}

// Required-tier completeness: drives the detail page's summary, its notice
// and Submit, and the submit action's own check. A field counts only when it
// is filled with a value the checks accept (read as the window reads it), so
// a stored value the limits now refuse never lets a title be submitted
// (Codex on #801). The database gate does the same only once the founder
// applies the draft in #799 (submit_title runs check_title_metadata on the
// record read as here, normalize_stored_title_metadata); until then the
// submit_title RPC checks only that the fields are filled.
export function requiredComplete(data: Record<string, unknown> | null | undefined): { filled: number; total: number } {
  return metadataTierCount(normalizeStoredMetadata(data), "required");
}

// A field counts as filled if present and non-empty (arrays: at least one entry).
function isEmpty(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  return v === undefined || v === null || v === "";
}

/** The stored record as the title's Metadata window reads it, so a save is
 *  never refused over a stored value the window shows as fine: empty values
 *  are dropped, a number stored as text reads as that number, and blank list
 *  entries are dropped. Nothing the window would show differently changes
 *  (list entries are never re-split). Keys outside the registry are left out,
 *  as parseMetadata leaves them out. */
export function normalizeStoredMetadata(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of METADATA_FIELDS) {
    const value = data?.[f.key];
    if (isEmpty(value)) continue;
    if (f.type === "number" && typeof value === "string") {
      const number = Number(value.trim());
      out[f.key] = value.trim() !== "" && Number.isFinite(number) ? number : value;
      continue;
    }
    if (f.type === "list" && Array.isArray(value)) {
      const entries = value.filter((entry) => !(typeof entry === "string" && entry.trim() === ""));
      if (entries.length > 0) out[f.key] = entries;
      continue;
    }
    out[f.key] = value;
  }
  return out;
}

// Bumped whenever the field registry / tiers change — every finding is stamped with it
// (rule 4), so "why was this flagged" stays explainable under the rules of the day (§19).
export const METADATA_LOGIC_VERSION = "metadata-v1";

export type FindingDescriptor = {
  code: string; // 'metadata.missing.<field>'
  severity: "high" | "low";
  message: string;
  field: string;
  tier: "required" | "recommended";
};

// THE validator (§19): metadata-completeness findings from the canonical registry.
// Required-tier gaps are high severity (requirements); recommended-tier gaps low.
// Optional fields never produce a finding. Deterministic + pure — the reconcile RPC
// persists the result and auto-resolves anything no longer present (precision over recall).
export function computeMetadataFindings(data: Record<string, unknown>): FindingDescriptor[] {
  const out: FindingDescriptor[] = [];
  for (const f of METADATA_FIELDS) {
    if (f.tier === "optional") continue;
    if (!isEmpty(data?.[f.key])) continue;
    out.push({
      code: `metadata.missing.${f.key}`,
      severity: f.tier === "required" ? "high" : "low",
      message: f.tier === "required" ? `${f.label} is required.` : `${f.label} is recommended.`,
      field: f.key,
      tier: f.tier,
    });
  }
  return out;
}
