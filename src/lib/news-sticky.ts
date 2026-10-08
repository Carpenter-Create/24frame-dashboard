// Shared Industry news section-header pin. Home rail and /home/news
// share this class — do not fork twin sticky implementations.
//
// Chrome (HOUSE_LEAD_STACK z-40) is a sibling of the page scroller,
// so top-0 sits under it. Safe-area lives on the lead stack. The
// Home rail scroller is the news aside (lg:overflow-y-auto) — also
// top-0. z-10 stays under chrome and dest rail (z-30).
//
// Surface wash matches the host: muted panel on Home, page canvas
// on /home/news. Backdrop blur so cards do not read through.
// The Home grey panel is overflow-hidden by default — that clips
// sticky. News overrides to overflow-visible so the pin can take
// the aside / page scroller as its containing block.
//
// Page surface is chrome continuation — canvas wash + house air,
// never a bordered / rounded card floating in the 840 column.
// Vertical pad is house card py (--space-4). Top air rematches the
// Home frame (space-8 / phone space-6) via -mt + pt so the wash
// meets the lead chrome and the title does not jam to the pin.
// Horizontal measure stays on DASHBOARD_NEWS_HISTORY_COLUMN_CLASS
// inside the pin, so title + chips align with the feed.

export type NewsStickySurface = "rail" | "page";

export const NEWS_STICKY_PIN_CLASS = "sticky top-0 z-10 shrink-0 backdrop-blur max-md:top-[var(--house-phone-chrome-visible,0px)]";

export const NEWS_STICKY_RAIL_SURFACE_CLASS =
  "rounded-t-[var(--radius-lg)] bg-surface-muted/85";

export const NEWS_STICKY_PAGE_SURFACE_CLASS =
  "bg-bg/85 -mt-[var(--space-8)] pt-[var(--space-8)] pb-[var(--space-4)] max-md:-mt-[var(--space-6)] max-md:pt-[var(--space-6)]";

/** Lift overflow-hidden on the Home news panel so sticky can pin. */
export const NEWS_STICKY_RAIL_PANEL_CLASS = "overflow-visible";

export function newsStickyHeaderClass(surface: NewsStickySurface): string {
  return `${NEWS_STICKY_PIN_CLASS} ${
    surface === "rail" ? NEWS_STICKY_RAIL_SURFACE_CLASS : NEWS_STICKY_PAGE_SURFACE_CLASS
  }`;
}
