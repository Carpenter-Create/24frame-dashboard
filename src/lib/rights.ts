import type { Database } from "@/lib/supabase/database.types";

export type RightsType = Database["public"]["Enums"]["rights_type"];

// §9 taxonomy (founder-supplied). Category grouping is presentation only (not in
// the DB). Order drives the add-rights picker. Descriptions from the taxonomy.
export const RIGHTS_CATEGORIES: {
  category: string;
  types: { code: RightsType; label: string; description: string }[];
}[] = [
  {
    category: "Theatrical",
    types: [{ code: "theatrical", label: "Theatrical", description: "Commercial cinema exhibition." }],
  },
  {
    category: "Television",
    types: [
      { code: "fta", label: "FTA", description: "Free-to-Air over-the-air networks." },
      { code: "basic_cable", label: "Basic Cable", description: "Non-premium bundled networks." },
      { code: "pay_tv", label: "Pay TV", description: "Premium subscription linear networks." },
      { code: "dth_satellite", label: "DTH / Satellite", description: "Direct-to-Home satellite providers." },
      { code: "ppv", label: "PPV", description: "Pay-Per-View scheduled broadcast." },
    ],
  },
  {
    category: "Video-on-Demand",
    types: [
      { code: "pvod", label: "PVOD", description: "Premium early digital release." },
      { code: "svod", label: "SVOD", description: "Subscription streaming." },
      { code: "hvod", label: "HVOD", description: "Hybrid / ad-supported paid tiers." },
      { code: "tvod", label: "TVOD", description: "Transactional rental." },
      { code: "est", label: "EST", description: "Electronic sell-through purchase." },
      { code: "avod", label: "AVOD", description: "Advertising-based streaming." },
      { code: "fast", label: "FAST", description: "Free ad-supported streaming TV." },
      { code: "fvod", label: "FVOD", description: "Free VOD, flat license, no ads." },
      { code: "bvod", label: "BVOD", description: "Broadcaster catch-up apps." },
    ],
  },
  {
    category: "Out-of-Home & Institutional",
    types: [
      { code: "non_theatrical", label: "Non-Theatrical", description: "Closed-circuit / isolated markets." },
      { code: "hospitality", label: "Hospitality", description: "In-room hotel/hospital systems." },
      { code: "edu", label: "EDU", description: "Educational / institutional streaming." },
      { code: "ppl", label: "PPL", description: "Public performance license." },
    ],
  },
  {
    category: "Physical Media",
    types: [
      { code: "home_video", label: "Home Video", description: "Physical DVD/Blu-ray retail." },
      { code: "mod", label: "MOD", description: "Manufactured-on-Demand disc." },
    ],
  },
];

export const RIGHTS_META: Record<RightsType, { label: string; category: string }> =
  Object.fromEntries(
    RIGHTS_CATEGORIES.flatMap((c) => c.types.map((t) => [t.code, { label: t.label, category: c.category }])),
  ) as Record<RightsType, { label: string; category: string }>;

// Every rights type, in taxonomy order: the zod enum source for the Add right
// action (no runtime import of the generated types; rights.test.ts pins it to
// the database enum).
export const RIGHTS_TYPE_CODES: readonly RightsType[] = RIGHTS_CATEGORIES.flatMap((c) => c.types.map((t) => t.code));

// A grant's exclusivity as the rights list, the staff title page and the Add
// right window read it.
export const EXCLUSIVITY_LABEL = { exclusive: "Exclusive", nonExclusive: "Non-exclusive" } as const;

export function exclusivityLabel(exclusive: boolean): string {
  return exclusive ? EXCLUSIVITY_LABEL.exclusive : EXCLUSIVITY_LABEL.nonExclusive;
}
