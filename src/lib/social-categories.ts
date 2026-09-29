// Locked Social Home category lenses. Labels are founder-locked.
// Order is A→Z (locale-aware, case-insensitive) — Adam 2026-09-20.
// sortByLabelAlpha is the shared sorter. sortTopicsAlpha is the Topics
// wrapper; Professions display chips use the same helper. The exported
// Topics bank must already match it. One SoT for Home rail, profile
// Topics picker, and every other Topics chip surface. Do not reorder
// per device or per consumer. Do not fork a second localeCompare.
// Home only. Do not persist onto Explore or any other job.
// All resets. Re-tap of the active topic returns All.
// Do not consolidate, rename, or invent cousins.

export const SOCIAL_CATEGORY_ALL = "All" as const;

export function sortByLabelAlpha<T>(items: readonly T[], label: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    label(a).localeCompare(label(b), "en", { sensitivity: "base" }),
  );
}

export function sortTopicsAlpha<T extends string>(topics: readonly T[]): T[] {
  return sortByLabelAlpha(topics, (topic) => topic);
}

export const SOCIAL_CATEGORY_TOPICS = [
  "Acting",
  "AI filmmaking",
  "Animation",
  "Casting",
  "Cinematography",
  "Content creator",
  "Directors",
  "Distribution",
  "Film Festivals",
  "Financing",
  "Music",
  "Post-production",
  "Producers",
  "Screenwriting",
  "Vertical micro dramas",
] as const;

export const SOCIAL_CATEGORY_LABELS = [SOCIAL_CATEGORY_ALL, ...SOCIAL_CATEGORY_TOPICS] as const;

export type SocialCategoryTopic = (typeof SOCIAL_CATEGORY_TOPICS)[number];
export type SocialCategoryLabel = (typeof SOCIAL_CATEGORY_LABELS)[number];

export const SOCIAL_CATEGORY_PARAM = "topic";

export function socialCategorySlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LABEL_BY_SLUG = new Map<string, SocialCategoryLabel>(
  SOCIAL_CATEGORY_LABELS.map((label) => [socialCategorySlug(label), label]),
);

export function parseSocialCategoryParam(raw: string | string[] | undefined | null): SocialCategoryLabel {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return SOCIAL_CATEGORY_ALL;
  const trimmed = value.trim();
  if (!trimmed) return SOCIAL_CATEGORY_ALL;
  const fromSlug = LABEL_BY_SLUG.get(socialCategorySlug(trimmed));
  if (fromSlug) return fromSlug;
  const exact = SOCIAL_CATEGORY_LABELS.find((label) => label === trimmed);
  return exact ?? SOCIAL_CATEGORY_ALL;
}

export function normalizeSocialCategory(raw: string | null | undefined): SocialCategoryTopic | null {
  if (raw == null) return null;
  const parsed = parseSocialCategoryParam(raw);
  if (parsed === SOCIAL_CATEGORY_ALL) return null;
  return parsed;
}

export function isSocialHomeLensPath(pathname: string): boolean {
  return pathname === "/social";
}
