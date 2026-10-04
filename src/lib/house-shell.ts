// House app-shell chrome — one grammar for Aggregation · Social · Education.
// Tokens stay in tokens.css. Do not fork workspace-scoped token files.
// Page canvas is --bg (white). Grey modules are --surface-muted (#F4F4F6)
// r16 only when a module is needed — never a page wash. Cards that stay
// white use hairline. No shadow. Shell chrome is the screening room
// (Adam 2026-10-04, docs/design-locks/shell-screening-chrome-lock-v1.md):
// the side menu is a column with a hairline right edge (no card), the
// header's workspace switch is text lanes with an ink underline, and
// header controls are 34 radius-10 boxes on desktop. The Settings and
// Education course rails keep the Sporty Blue tint wash + accent-ink
// type. Status badges stay ink. Exclusive choice menus use
// SegmentedTrack (white on accent thumb). Standalone dest and news
// source lenses are already SegmentedTrack. Period chips stay muted.
// Sporty Blue fill is reserved for the primary CTA, the selected
// Settings rail pill, dest/news selected pills, links, Social's Create
// (side-menu tile and phone dock circle), and the Ask sparkle.
// Stay on the social/fun chrome lane — do not flatten toward a
// professional register.

export const HOUSE_PAGE_CANVAS_CLASS = "bg-bg";

/** Phone trail, dest-rail inset, and centered canvas. Not desktop shell L/R. */
export const HOUSE_CHROME_GUTTER = "var(--chrome-gutter)";

/**
 * Desktop shell horizontal gutters.
 * docs/design-locks/shell-desktop-horizontal-gutter-lock-v2.md
 * Start 32 (viewport → logo ink). End 32 (viewport → avatar ink).
 * Phone does not use this class.
 */
export const HOUSE_SHELL_GUTTER_X_CLASS =
  "md:pl-[var(--shell-gutter-inline-start)] md:pr-[var(--shell-gutter-inline-end)]";

/** Phone header right air. The 44 account hit holds the 30 avatar, so
 *  8 here leaves the avatar 15 from the viewport edge (screening chrome;
 *  was --chrome-gutter with a bare 28 avatar). */
export const HOUSE_PHONE_TRAILING_GUTTER_CLASS = "max-md:pr-[var(--space-2)]";

export const HOUSE_CANVAS_X_CLASS = "px-[var(--chrome-gutter)]";

/** Dest-rail slot. Alias of `--sidebar-width` — not a second measure. */
export const HOUSE_ACCESS_RAIL_WIDTH = "var(--access-rail-width)";

/** Home canvas at 1440: 32 shell start + 32 shell end + 1376 column. */
export const HOUSE_HOME_CONTENT_WIDTH = "var(--home-content-width)";

/** Home modules: shell start left · shell end right. Lead stays full-bleed. */
export const HOUSE_HOME_RAIL_COLUMN_CLASS =
  "w-full md:ml-[var(--shell-gutter-inline-start)] md:mr-[var(--shell-gutter-inline-end)] md:w-[calc(100%-var(--shell-gutter-inline-start)-var(--shell-gutter-inline-end))]";

/**
 * Aggregation dashboard cards. Desktop trailing edge is the shell
 * gutter so card ink lines up with the avatar. Lead side stays the
 * dest-rail chrome gutter. Phone stays --chrome-gutter both sides.
 * Not the Education page-max canvas.
 */
export const HOUSE_AGG_SHELL_COLUMN_CLASS =
  "w-full pb-24 pt-8 max-md:pb-0 max-md:px-[var(--chrome-gutter)] md:pl-[var(--chrome-gutter)] md:pr-[var(--shell-gutter-inline-end)]";

// Side menu column, every workspace and Settings (Adam 2026-10-04,
// docs/design-locks/shell-screening-chrome-lock-v1.md). Flush to the
// viewport's left edge under the header, full height, no card: the
// page canvas with one hairline on its right. Width is RAIL_WIDTH_CLASS
// (--sidebar-width: 200, 64 collapsed). Supersedes the floating r16
// card (256 slot, 240 panel, 16 inset).
export const HOUSE_RAIL_COLUMN_CLASS =
  "fixed bottom-0 left-0 top-[var(--header-height)] z-30 hidden flex-col md:flex";

export const HOUSE_MODULE_CLASS =
  "rounded-[var(--radius-lg)] bg-surface-muted shadow-none";

export const HOUSE_RAIL_PANEL_CLASS = "border-r border-hairline bg-bg shadow-none";

/**
 * Quiet idle ink for the shell: header lanes, the side-menu eyebrow and
 * collapse control, and idle dock glyphs. The screening-room board's ink3
 * equals --text-tertiary in light but --text-secondary in dark, so dark
 * steps to ink-2 (dark --text-tertiary is under 4.5:1 for 13px type on
 * the dark page). Tokens only.
 */
export const HOUSE_SHELL_QUIET_INK_CLASS = "text-ink-3 dark:text-ink-2";

export const HOUSE_ICON_BUTTON_CLASS = "rounded-full";

export const HOUSE_CONTROL_PILL_CLASS = "rounded-full";

export const HOUSE_CARD_PAD = "px-[var(--space-4)] py-[var(--space-4)]";

export const HOUSE_RELATED_GAP_CLASS = "gap-[var(--space-2)]";

export const HOUSE_SECTION_AIR_CLASS = "gap-[var(--space-6)]";

// Logo → search air on Social + Education top bars. 16 related
// (house --space-4). Not flush, not mid-bar. Phone Education keeps
// the compact under-nav search; do not invent a desktop mid-bar.
export const HOUSE_HEADER_SEARCH_GAP_CLASS = "gap-[var(--space-4)]";

export const HOUSE_RAIL_TITLE_CLASS = "px-2 pb-1 t-label text-ink-3";

export const HOUSE_RAIL_ITEM_CLASS =
  "relative inline-flex w-full items-center rounded-full text-left t-body leading-6 t-rail transition-colors";

// Active = wash + accent ink. Idle inherits body 420. t-rail is tracking
// only (A4). No font-normal (400). Differentiate by color only; do not bold
// the rail (Coinbase-pop A2). The label is --accent-ink, not --accent:
// Sporty Blue on the wash is 4.07:1 (founder pick "Deeper blue text",
// Adam 2026-10-04; tokens.css).
export const HOUSE_RAIL_ACTIVE_CLASS = "bg-accent-wash text-accent-ink";

export const HOUSE_RAIL_IDLE_CLASS = "text-ink hover:bg-surface-muted";

// Side menu (dest rail) — every workspace, Home included. Screening
// chrome (Adam 2026-10-04, "Yes, everywhere";
// docs/design-locks/shell-screening-chrome-lock-v1.md). No icon
// tiles and no accent on rows: a 22 glyph slot holds an 18 Phosphor
// glyph (Regular idle, Bold current — the board's stroke 1.7 / 2).
// Rows are 36 tall, 13px, radius 10. Idle: 500, ink-2. Current:
// muted fill, 600, ink. One current row per path
// (houseRailActiveIndex). Social's Create is the menu's only accent:
// a 22 radius-6 accent tile with a plus (26 when collapsed).
// Collapsed: 40 icon links, the current one muted. Settings and the
// Education course rail keep HOUSE_RAIL_ACTIVE_CLASS. Supersedes the
// 28 icon tiles (shell-unified-chrome-lock-v1 §2).
export const HOUSE_DEST_RAIL_NAV_CLASS = "flex flex-col gap-0.5 px-[10px] py-[var(--space-3)]";

export const HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS =
  "flex flex-col items-center gap-[var(--space-1)] py-[var(--space-3)]";

/** Top row: workspace eyebrow + the 28 collapse control. */
export const HOUSE_DEST_RAIL_TOP_ROW_CLASS =
  "flex items-center justify-between pb-1.5 pl-[10px] pr-0.5";

/** Collapsed top row: the same element holding only the 40×32 expand
 *  control, so React keeps the one collapse button across the toggle
 *  and keyboard focus stays on it. */
export const HOUSE_DEST_RAIL_TOP_ROW_COLLAPSED_CLASS = "flex shrink-0 justify-center";

/** Eyebrow: 13 / 500 / 0.06em / uppercase, quiet ink. */
export const HOUSE_DEST_RAIL_EYEBROW_CLASS = `text-[length:var(--text-xs)] font-medium uppercase leading-none tracking-[0.06em] ${HOUSE_SHELL_QUIET_INK_CLASS}`;

/** Staff section eyebrow inside a rail — same face, row inset. */
export const HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS = `px-[10px] pb-1.5 pt-1 ${HOUSE_DEST_RAIL_EYEBROW_CLASS}`;

/** Collapsed: the 24×1 hairline under the expand control. */
export const HOUSE_DEST_RAIL_COLLAPSED_RULE_CLASS = "mb-1.5 mt-1 h-px w-6 shrink-0 bg-hairline";

export const HOUSE_DEST_RAIL_DIVIDER_CLASS = "my-2 h-px w-full shrink-0 bg-hairline";

export const HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS = "my-2 h-px w-6 shrink-0 bg-hairline";

export const HOUSE_DEST_RAIL_ROW_CLASS =
  "relative flex h-9 w-full items-center gap-2.5 rounded-[var(--radius)] px-[10px] text-left text-[length:var(--text-xs)] transition-colors";

export const HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS =
  "relative flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] transition-colors";

export const HOUSE_DEST_RAIL_IDLE_CLASS = "font-medium text-ink-2 hover:bg-surface-muted hover:text-ink";

export const HOUSE_DEST_RAIL_ACTIVE_CLASS = "bg-surface-muted font-semibold text-ink";

export const HOUSE_DEST_RAIL_LABEL_CLASS = "min-w-0 flex-1 whitespace-nowrap text-left";

/** 22 slot that centres the 18 glyph, so labels line up with Create's tile. */
export const HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS = "flex w-[22px] shrink-0 justify-center";

export const HOUSE_DEST_RAIL_GLYPH_CLASS = "size-4.5 shrink-0";

export const HOUSE_DEST_RAIL_GLYPH_IDLE_WEIGHT = "regular" as const;

export const HOUSE_DEST_RAIL_GLYPH_ACTIVE_WEIGHT = "bold" as const;

export function houseDestRailGlyphWeight(active: boolean): "regular" | "bold" {
  return active ? HOUSE_DEST_RAIL_GLYPH_ACTIVE_WEIGHT : HOUSE_DEST_RAIL_GLYPH_IDLE_WEIGHT;
}

/** Social Create: the menu's only accent. 22 tile, radius 6, plus 14. */
export const HOUSE_DEST_RAIL_CREATE_TILE_CLASS =
  "flex size-[22px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-contrast";

/** Collapsed Create: 26 tile, plus 15. */
export const HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS =
  "flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-contrast";

export const HOUSE_DEST_RAIL_CREATE_GLYPH_CLASS = "size-3.5 shrink-0";

export const HOUSE_DEST_RAIL_CREATE_GLYPH_COLLAPSED_CLASS = "size-[15px] shrink-0";

export const HOUSE_SEARCH_PILL_CLASS = "rounded-full border-0 bg-surface-muted";

export const HOUSE_FILTER_ON_CLASS = "bg-ink text-surface";

export const HOUSE_FILTER_OFF_CLASS = "bg-surface-muted text-ink";

// Standalone selected pill: accent fill + white label/icon.
// Same selected grammar as HOUSE_SEGMENTED_THUMB + HOUSE_SEGMENTED_ITEM_ON.
// Phone dest chips and news source lens use SegmentedTrack, not this
// fill. HOUSE_FILTER_ON_CLASS (ink) is status / display chips only.
// Exclusive choice menus are SegmentedTrack. Adam lock 2026-09-19.
export const HOUSE_PILL_SELECTED_CLASS = "bg-accent text-white";

// Fat pill measure — one SoT. Same padding + type as workspace /
// header SegmentedTrack items. Width hugs the label; do not fork a
// skinny tag. Segmented items add track/hit classes on top.
export const HOUSE_PILL_MEASURE_CLASS =
  "rounded-full px-[var(--space-4)] py-[var(--space-2)] t-body-sm";

// Gapped HOUSE_FILTER_PILL_* is not for choice menus. Choice menus
// use SegmentedTrack (HOUSE_SEGMENTED_* + SEGMENTED_TRACK_PERSIST).
// These tokens stay for status / display chips only (Titles status
// lens is HousePageSelect; catalogStatusPillClass stays a badge).
export const HOUSE_FILTER_PILL_CLASS = HOUSE_PILL_MEASURE_CLASS;

export const HOUSE_FILTER_PILL_CLUSTER_CLASS =
  "flex items-center gap-[var(--space-2)]";

export const HOUSE_PERIOD_SELECTED_CLASS = "bg-surface-muted";

// Segmented track — one continuous muted bar with a sliding solid accent thumb.
// Shared grammar for workspace pills and Top Performing Titles|Platforms|Territories.
// No track padding: first/last items sit flush to the track edges so the thumb
// reaches the full pill radius when the first or last segment is selected.
// Slide is left/width, not opacity: 320ms ease into rest. Remount
// persistence lives in SegmentedTrack. Selected ink (ITEM_ON / ITEM_OFF)
// follows the same visualIndex as the thumb and snaps — never
// transition-colors. Color-easing ON from ink-2 → white paints dark
// type on the accent thumb for the whole glide. Do not fork a second
// workspace chrome or a host-local pending selection.
export const HOUSE_SEGMENTED_THUMB_DURATION_MS = 320;

export const HOUSE_SEGMENTED_THUMB_EASE = [0.22, 1, 0.36, 1] as const;

export const HOUSE_SEGMENTED_TRACK_CLASS =
  "relative flex shrink-0 items-center rounded-full bg-surface-muted";

// Scroll-rail host. Overflow is sideways scroll, never wrap or
// ellipsis. May hold one chip row or a stacked two-row track that
// scrolls as one. Intentional gospel exception for chip rails.
// News sources and the house chip rail consume this — do not fork
// a workspace-local lookalike.
export const HOUSE_SCROLL_ROW_CLASS = "no-scrollbar w-full overflow-x-auto";

// Scroll-row track: at least the host width, grows with shrink-0 items
// so bg-surface-muted covers every segment inside overflow-x-auto.
// Short tracks keep HOUSE_SEGMENTED_TRACK_CLASS (workspace switcher,
// period presets, phone dests). Do not fork a news-only lookalike.
export const HOUSE_SEGMENTED_TRACK_SCROLL_CLASS = `${HOUSE_SEGMENTED_TRACK_CLASS} w-max min-w-full`;

export const HOUSE_SEGMENTED_THUMB_CLASS =
  "pointer-events-none absolute inset-y-0 rounded-full bg-accent transition-[left,width] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

// Shared pill item box. Height is this pad + t-body-sm only — one SoT
// for workspace / dest / news SegmentedTrack items. Social Home topic
// chips and same-family profile roles/tags use the h-8 hit in
// social-chrome (SOCIAL_CHIP_HIT_CLASS). Do not fold that hit back
// into this fat box.
export const HOUSE_PILL_ITEM_CLASS =
  `inline-flex shrink-0 items-center whitespace-nowrap ${HOUSE_PILL_MEASURE_CLASS}`;

export const HOUSE_SEGMENTED_ITEM_BASE_CLASS =
  `relative z-10 cursor-pointer select-none ${HOUSE_PILL_ITEM_CLASS}`;

export const HOUSE_SEGMENTED_ITEM_ON_CLASS = "text-white";

// Idle = muted secondary; active = white on accent thumb. Snap both
// ways — leaving may snap; never reintroduce dark-on-blue on ON.
export const HOUSE_SEGMENTED_ITEM_OFF_CLASS = "text-ink-2";

/** Hide the accent thumb when no segment is selected (activeIndex < 0). */
export function houseSegmentedThumbHidden(activeIndex: number): boolean {
  return activeIndex < 0;
}
