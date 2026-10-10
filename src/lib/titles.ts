import {
  HOUSE_PHONE_CONTAIN_CLASS,
  HOUSE_PHONE_STACK_CLASS,
  HOUSE_PHONE_WRAP_CLASS,
} from "@/lib/house-phone-stack";
import type { Database } from "@/lib/supabase/database.types";

export type TitleStatus = Database["public"]["Enums"]["title_status"];

// Client-facing title vocabulary (founder-decided): in_review → "In review",
// in_delivery → "Submitted". "Approved" is derived (≥1 delivery live), not an enum value.
// DB enum key stays `live`.
export const TITLE_STATUS_LABELS: Record<TitleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  in_delivery: "Submitted",
  live: "Approved",
  takedown_requested: "Takedown requested",
  taken_down: "Taken down",
  archived: "Archived",
};

// The status a client sees. Once a title is live on ≥1 platform, show the derived
// "Approved · N of M platforms" rollup on top of its lifecycle state.
export function titleDisplayStatus(status: TitleStatus, liveCount: number, totalCount: number): string {
  if (status === "archived") return TITLE_STATUS_LABELS.archived;
  if (liveCount > 0) return `Approved · ${liveCount} of ${totalCount} platforms`;
  return TITLE_STATUS_LABELS[status];
}

// GC-facing status wording (assembly line: review → approved/ready → delivering → approved).
// Clients see TITLE_STATUS_LABELS; GC's operator view is clearer.
export const GC_TITLE_STATUS_LABELS: Partial<Record<TitleStatus, string>> = {
  in_review: "Needs review",
  in_delivery: "Approved · ready to deliver",
  live: "Approved",
  takedown_requested: "Takedown requested",
  taken_down: "Taken down",
};
export const gcTitleStatusLabel = (s: TitleStatus): string =>
  GC_TITLE_STATUS_LABELS[s] ?? TITLE_STATUS_LABELS[s];

export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

// Standalone, capitalized delivery-status labels for row/summary display. Distinct from the
// lowercase sentence-fragment DELIVERY_STATUS_LABELS in lib/notifications.ts, which is meant
// to sit inside a copy string ("…is now live on X"), not stand alone in a status column.
export const DELIVERY_STATUS_ROW_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  live: "Approved",
  rejected: "Rejected",
  taken_down: "Taken down",
};

// Title-detail deep-links into the other ops-spine routes. Copy in lib/, not JSX.
export const TITLE_DETAIL = {
  relatedLabel: "Related",
  deliveriesLink: "Deliveries",
  healthLink: "Attention",
  playTrailer: "Play trailer",
  sectionSynopsis: "Synopsis",
  sectionMetadata: "Metadata",
  sectionAssets: "Assets",
  sectionCredits: "Credits",
  sectionRights: "Rights & territories",
  rightsEmpty: "No rights granted yet.",
  sectionDeliveries: "Deliveries",
  editMetadata: "Edit",
  viewMetadata: "View",
  requiredNotice: (total: number) => `Complete the ${total} required metadata fields to submit this title for review.`,
} as const;

// The title page's windows, one query each: Metadata (`edit`,
// lib/title-details) and Add right (`add-right`, lib/add-right). Closing
// either strips both, so one address never opens two windows.
export const TITLE_PAGE_WINDOW_PARAMS = ["edit", "add-right"] as const;

// Title-detail phone containment. One SoT: house phone stack tokens.
// Clip sideways overflow on the page surface; stack ledgers on phone;
// wrap long IDs / filenames / URLs. Desktop ledger stays side-by-side.
export const TITLE_DETAIL_SURFACE_CLASS = HOUSE_PHONE_CONTAIN_CLASS;

export const TITLE_DETAIL_LEDGER_ROW_CLASS =
  `${HOUSE_PHONE_STACK_CLASS} gap-[var(--space-1)] px-5 py-3 md:flex-row md:items-start md:justify-between md:gap-4`;

export const TITLE_DETAIL_LEDGER_COPY_CLASS = `${HOUSE_PHONE_STACK_CLASS} gap-0.5`;

export const TITLE_DETAIL_LEDGER_META_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink-2 md:shrink-0 md:text-right`;

export const TITLE_DETAIL_ASSET_FILE_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink-3`;

export const TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS =
  `${HOUSE_PHONE_STACK_CLASS} gap-[var(--space-1)] t-body-sm md:flex-row md:items-baseline md:justify-between md:gap-4`;

export const TITLE_DETAIL_FORM_ROW_CLASS =
  `${HOUSE_PHONE_STACK_CLASS} gap-2 md:flex-row md:items-center`;

