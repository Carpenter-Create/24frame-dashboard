// House app-shell chrome — one grammar for Aggregation · Social · Education.
// Tokens stay in tokens.css. Do not fork workspace-scoped token files.
// Page canvas is --bg (white). Grey modules are --surface-muted (#F4F4F6)
// r16 only when a module is needed — never a page wash. Cards that stay
// white use hairline. No shadow. Shell chrome is the H register
// (Adam 2026-10-05, the shell register lock v1 in docs/design-locks):
// a full-height 240 side menu with the brand mark in its top band and a
// hairline right edge (no card); an 80 header whose workspace switch is
// the primary pill slider (muted track, ink thumb); round grey 44
// controls; the current side-menu row and the phone dock's current glyph
// in the accent register. The Settings and Education course rails keep
// the Sporty Blue tint wash + accent-ink type. Status badges stay ink.
// Exclusive choice menus use SegmentedTrack (white on accent thumb; the
// workspace slider's thumb is ink). Standalone dest and news source
// lenses are already SegmentedTrack. Period chips stay muted. Sporty
// Blue fill is reserved for the primary CTA, the selected Settings rail
// pill, dest/news selected pills, links, Social's Create circle in the
// phone dock, the unread dots, and the Ask sparkle.
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

/** Phone header right air: 12 (H register; the board's 0 12 0 16
 *  bar pad). The 44 avatar photo is the account hit. */
export const HOUSE_PHONE_TRAILING_GUTTER_CLASS = "max-md:pr-[var(--space-3)]";

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

// Side menu column, every workspace and Settings. H register
// (Adam 2026-10-05, the shell register lock v1 in docs/design-locks):
// flush to the viewport's left edge, the FULL height (the header starts
// at its right edge and does not cross it), no card: the page canvas
// with one hairline on its right. Its top band holds the brand mark.
// Width is RAIL_WIDTH_CLASS (--sidebar-width: 240, 80 collapsed).
// Supersedes the screening chrome's column under the header (200 / 64).
export const HOUSE_RAIL_COLUMN_CLASS =
  "fixed bottom-0 left-0 top-0 z-30 hidden flex-col md:flex";

/** The side menu's top band: as tall as the header (80), the existing
 *  brand mark with its ink at 32 (the house gutter), vertically centred.
 *  No hairline under it. Collapsed (80 wide) the mark is centred. */
export const HOUSE_RAIL_BRAND_BAND_CLASS =
  "flex h-[var(--header-height)] shrink-0 items-center pl-[var(--shell-gutter-inline-start)]";

export const HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS =
  "flex h-[var(--header-height)] shrink-0 items-center justify-center";

/** The brand link inside the band: a 44 tall hit around the mark. */
export const HOUSE_RAIL_BRAND_LINK_CLASS =
  "inline-flex h-[var(--header-control-size)] shrink-0 items-center";

/** Scroll body between the band and the collapse foot. */
export const HOUSE_RAIL_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto";

/** Foot: the collapse control at the bottom of the column, 24 in and 24
 *  up (expanded) or centred (collapsed). The same element in both
 *  states, so React keeps the one button and keyboard focus stays on it. */
export const HOUSE_RAIL_FOOT_CLASS = "flex shrink-0 px-[var(--space-6)] pb-[var(--space-6)] pt-[var(--space-2)]";

export const HOUSE_RAIL_FOOT_COLLAPSED_CLASS =
  "flex shrink-0 justify-center pb-[var(--space-6)] pt-[var(--space-2)]";

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

// Side menu (dest rail) — every workspace, Home included. H
// register (Adam 2026-10-05, "I like the designs. Let's use them.";
// the shell register lock v1 in docs/design-locks). Rows are 56
// tall pills (radius full, pad 16, 8 apart) with a 24 Phosphor glyph,
// 16 to a 17 / 500 label. Idle: no fill, Regular glyph and label in
// ink. Current: the accent wash with the FILLED glyph and the label in
// accent-ink; the weight stays 500. No tiles and no workspace eyebrow
// (the header slider already names the workspace). Social's Create is
// an ordinary row (PlusSquare). One current row per path
// (houseRailActiveIndex). Collapsed (80): 56 circle links, the current
// one washed. Messages carries an 8 accent unread dot at the row's end;
// the count stays in the accessible name. Settings and the Education
// course rail keep HOUSE_RAIL_ACTIVE_CLASS. Supersedes the screening
// chrome's 36 rows, 18 glyphs, muted current, and accent Create tile.
export const HOUSE_DEST_RAIL_NAV_CLASS =
  "flex flex-col gap-[var(--space-2)] px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-2)]";

export const HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS =
  "flex flex-col items-center gap-[var(--space-2)] pb-[var(--space-4)] pt-[var(--space-2)]";

/** Eyebrow: 13 / 500 / 0.06em / uppercase, quiet ink. Staff section only. */
export const HOUSE_DEST_RAIL_EYEBROW_CLASS = `text-[length:var(--text-xs)] font-medium uppercase leading-none tracking-[0.06em] ${HOUSE_SHELL_QUIET_INK_CLASS}`;

/** Staff section eyebrow inside a rail — same face, at the row's text inset. */
export const HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS = `px-[var(--space-4)] pb-1.5 pt-1 ${HOUSE_DEST_RAIL_EYEBROW_CLASS}`;

export const HOUSE_DEST_RAIL_DIVIDER_CLASS = "my-2 h-px w-full shrink-0 bg-hairline";

export const HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS = "my-2 h-px w-6 shrink-0 bg-hairline";

// min-h, not h: a long label wraps and the row grows; nothing is cut.
export const HOUSE_DEST_RAIL_ROW_CLASS =
  "relative flex min-h-14 w-full items-center gap-[var(--space-4)] rounded-full px-[var(--space-4)] text-left text-[length:var(--text-base)] font-medium transition-colors";

export const HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS =
  "relative flex size-14 shrink-0 items-center justify-center rounded-full transition-colors";

export const HOUSE_DEST_RAIL_IDLE_CLASS = "text-ink hover:bg-surface-muted";

export const HOUSE_DEST_RAIL_ACTIVE_CLASS = "bg-accent-wash text-accent-ink";

export const HOUSE_DEST_RAIL_LABEL_CLASS = "min-w-0 flex-1 text-left";

/** 24 slot for the 24 glyph. */
export const HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS = "flex w-6 shrink-0 justify-center";

export const HOUSE_DEST_RAIL_GLYPH_CLASS = "size-6 shrink-0";

export const HOUSE_DEST_RAIL_GLYPH_IDLE_WEIGHT = "regular" as const;

/** Current: the filled glyph (the board's filled icon), not Bold. */
export const HOUSE_DEST_RAIL_GLYPH_ACTIVE_WEIGHT = "fill" as const;

export function houseDestRailGlyphWeight(active: boolean): "regular" | "fill" {
  return active ? HOUSE_DEST_RAIL_GLYPH_ACTIVE_WEIGHT : HOUSE_DEST_RAIL_GLYPH_IDLE_WEIGHT;
}

/** Messages unread: an 8 accent dot at the row's right end (the row's
 *  16 pad). Not a count badge; never red. */
export const HOUSE_DEST_RAIL_UNREAD_DOT_CLASS =
  "ml-auto size-2 shrink-0 rounded-full bg-accent";

/** Collapsed: the same dot at the circle's top-right. */
export const HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS =
  "pointer-events-none absolute right-3 top-3 size-2 rounded-full bg-accent";

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

// Primary pill slider (H register §3.1; founder 2026-10-05, "I like the
// designs. Let's use them."). One pattern for every primary view switch:
// the header workspace slider and the Feed's Following / For you. It is
// this SegmentedTrack with an ink thumb: a muted track, radius full, no
// inset (the thumb is the full track height); the thumb slides 220 ms
// ease-out (the register's listed motion). Labels 17 / 600, 44 tall,
// never truncated; ink idle, the page colour on the thumb. The label ink
// snaps with the thumb's index (no colour transition). Dark: the thumb
// and labels flip with --text / --bg. Hosts set only the side pad (16 in
// the header, 20 on a page switch).
export const HOUSE_PILL_SLIDER_TRACK_CLASS = HOUSE_SEGMENTED_TRACK_CLASS;

export const HOUSE_PILL_SLIDER_THUMB_DURATION_MS = 220;

export const HOUSE_PILL_SLIDER_THUMB_CLASS =
  "pointer-events-none absolute inset-y-0 rounded-full bg-ink transition-[left,width] duration-[220ms] ease-out motion-reduce:transition-none";

// Before the thumb is placed (the server paint, until hydration measures
// it), the lit segment carries the thumb's ink itself, so its page-colour
// label never paints white on grey. SegmentedTrack drops
// data-segmented-pending once the thumb is placed; from then on the
// sliding thumb is the fill.
export const HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS =
  "in-data-segmented-pending:data-segmented-selected:bg-ink";

export const HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS =
  `relative z-10 inline-flex h-11 shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full text-[length:var(--text-base)] font-semibold ${HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS}`;

export const HOUSE_PILL_SLIDER_SEGMENT_ON_CLASS = "text-bg";

export const HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS = "text-ink";

/** Hide the accent thumb when no segment is selected (activeIndex < 0). */
export function houseSegmentedThumbHidden(activeIndex: number): boolean {
  return activeIndex < 0;
}
