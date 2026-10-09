// Shared top lead chrome for Home · Aggregation · Social · Education ·
// Staff. H register (Adam 2026-10-05, "I like the designs.
// Let's use them."; the shell register lock v1 in docs/design-locks).
// Phone: Asset 8 emblem on every workspace (logoVisible always), then
// the grey workspace pill (filled grid + the current workspace's name,
// 15 / 600 ink), which opens the workspace sheet. Below 360 the pill is
// the grid alone (still 44). No hamburger — leading or trailing.
// Destinations live in HousePhoneBottomNav (in-workspace only).
// Phone emblem returns to Home (/home), the industry news feed.
// The desktop brand mark (BrandLogo, unchanged) lives in the side
// menu's top band, linking to the workspace home; where a page has no
// side menu (Co-Productions, Help, Activity, the story stages, Explore)
// it heads this bar instead (brandInHeader). Neither opens the rail.
// Phone bar (--header-height: 56, the same as desktop):
//   Left: [emblem] [workspace pill].
//   Trailing: [search if needed] [24Frame AI] [bell] [account], 4 apart.
//   Every phone target is 44: round grey buttons and the 44 avatar
//   photo. No negative margin (#452 -mx collapsed AI onto the bell).
//   Pads 16 lead / 12 trail.
//   Bottom: HousePhoneBottomNav dests for the current workspace.
// Desktop lg+ leads with the workspace pill slider (Home · Aggregation ·
// Social · Education · Staff: muted track, ink thumb, 17 / 600, 44).
// md to lg (768–1023) leads with the same grey workspace pill as phone
// (it opens the popover): the slider cannot fit beside the 240 side
// menu and the trailing controls there. Dock dests stay local.
// 24Frame AI sits immediately left of the notification bell on every
// house chrome path (Home · Social · Aggregation · Education ·
// Settings). The header control toggles the Mercury ?ai=1 overlay
// window, never a workspace hop. Second click uses the same close
// path as X / Escape. Expand/collapse stays overlay-scoped. Close
// strips ?ai=1 and leaves the current path. Ask AI is header + Home
// module only (#465). One trail. Theme is the avatar drill, not a
// header glyph.
// Desktop md+ trailing is [search] · Ask · bell · avatar, 8 apart, at
// least 24 after the slider. Every control is a 44 circle: round grey
// (muted fill, 20 ink glyph) for search, Ask (its sparkle in accent)
// and the bell (an accent unread dot, never a count); the avatar is the
// 44 photo. Search (Social and Education only) is the wide grey pill
// (44, 240–360, flexes) from xl and the round grey icon below xl. Ask
// never shows a visible label: "Ask 24Frame AI" is its accessible name
// and its tooltip. The Ask control is shared so phone and desktop do
// not fork a second mark.
// Social live explore search and Education quiet courses/videos
// search share Facebook-compact geometry (04-facebook.png SoT)
// via one HouseLeadSearch primitive — never twin files.
// Phone Education search is a full-width row under dest chips — not
// in the top nav. The Workspaces menu portals above this stack so it
// cannot clip under dest chips or search (header backdrop-blur).
// Phone Social is a trailing magnifying-glass that
// opens a dedicated sheet. Aggregation mid-lead stays empty
// (agg-search-no). Logo inset does not drift when the search slot is
// empty. Do not invent a fourth product or an Aggregation search.
//
// Desktop pads: the bar starts at the side menu's edge, so its lead pad
// is the board's 24 (HOUSE_LEAD_DESKTOP_PAD_CLASS); where the brand mark
// heads the bar (no side menu) the lead pad is the shell gutter 32, so
// the mark's ink sits at 32 as it does in the side menu. The end pad
// stays the shell gutter 32 (gutter lock v2), so the avatar's ink lines
// up with the page's right edge (the board's 24 is not adopted).
// Phone pads are 16 lead / 12 trail (HOUSE_LEAD_PHONE_PAD_CLASS).
//
// G9 — lead chrome stays pinned to the viewport. Mac rubber-band /
// pull-down overscroll must not carry the header. Document/body is
// not the scroll ancestor. The shell is a viewport column; page
// scroll lives on main. Social + Education share this contract —
// not an Aggregation-only sticky hack. Phone follows the same pin.

import { cn } from "@/lib/cn";
import {
  HOUSE_SEARCH_PILL_CLASS,
  HOUSE_SHELL_GUTTER_X_CLASS,
  HOUSE_PHONE_TRAILING_GUTTER_CLASS,
} from "@/lib/house-shell";

/** The Ask 24Frame AI overlay's own thread search caps at 232
 *  (messages-app-header). Not the shell header any more: the header's
 *  search pill flexes 240–360 (below). */
export const HOUSE_LEAD_SEARCH_WIDTH_PX = 232;

/** The header search pill flexes between these (the board's flex
 *  0 1 360px with a 240 floor). */
export const HOUSE_LEAD_SEARCH_MIN_WIDTH_PX = 240;

export const HOUSE_LEAD_SEARCH_MAX_WIDTH_PX = 360;

export const HOUSE_LEAD_SHELL_CLASS =
  "flex h-dvh flex-col overflow-hidden overscroll-none max-md:relative";

// Phone: the chrome floats over the top of this scroller, so in-page
// scroll-into-view stops at the chrome's visible bottom.
export const HOUSE_LEAD_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain max-md:scroll-pt-[var(--house-phone-chrome-visible,0px)]";

// Stack pins header + Education under-nav as one unit. Do not put
// overflow-hidden on this row (#412). md+ it starts at the side menu's
// right edge (--sidebar-width: 240, 80 collapsed, 0 where the page has
// no side menu), so the full-height side menu is never crossed.
// Phone: the stack leads with the workspace band and floats over the top
// of the page scroller (out of flow), so the bar can slide over the band
// with the finger while the page scrolls under it, at the finger's speed
// (shell-phone-workspace-band-lock-v1 §5). Page scroll stays on main (G9).
export const HOUSE_LEAD_STACK_CLASS =
  "sticky top-0 z-40 shrink-0 max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:pointer-events-none md:ml-[var(--sidebar-width)]";

/** Phone: what the chrome draws takes taps, and only sideways pans. A
 *  vertical drag on it is the bar's own (the tracker), never a scroll of the
 *  document (which would carry both rows, bounce the white page under
 *  Safari's bar, or start Safari's pull-to-refresh). The stack itself lets
 *  taps through, so the strip the covered bar leaves is the page's. */
export const HOUSE_PHONE_CHROME_TOUCH_CLASS =
  "max-md:pointer-events-auto max-md:touch-pan-x max-md:touch-pinch-zoom";

// The phone chrome's motion, written by the shell's tracker on the shell
// element (house-phone-chrome-state): the chrome's height, its visible
// height (less the bar's cover), and the bar's cover (0–56).
export const HOUSE_PHONE_CHROME_HEIGHT_VAR = "--house-phone-chrome-h";
export const HOUSE_PHONE_CHROME_VISIBLE_VAR = "--house-phone-chrome-visible";
export const HOUSE_PHONE_SHEET_Y_VAR = "--house-phone-sheet-y";
/** On the shell while the bar eases to rest (open or covered). */
export const HOUSE_PHONE_SHEET_SETTLE_ATTR = "data-house-phone-sheet-settle";

/** The bar, its corner fill, and the Education search row move together:
 *  up by the cover, 1:1 with the scroll (no easing), eased only while
 *  settling. Phone only. */
export const HOUSE_PHONE_SHEET_MOTION_CLASS =
  "max-md:translate-y-[calc(var(--house-phone-sheet-y,0px)*-1)] max-md:transition-[translate] max-md:duration-0 max-md:ease-out max-md:in-data-house-phone-sheet-settle:duration-[180ms]";

/** Sporty Blue behind the bar's rounded top corners: a 24 strip that rides
 *  just under the bar's top edge, so the corners show blue at rest and as
 *  the bar slides. */
export const HOUSE_LEAD_CORNER_FILL_CLASS = `pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] h-6 bg-workspace-band md:hidden ${HOUSE_PHONE_SHEET_MOTION_CLASS}`;

/** Phone: the page's first box, as tall as the floating chrome, so the
 *  page starts under it. The fallback is band + bar until it is measured. */
export const HOUSE_PHONE_CHROME_SPACER_CLASS =
  "shrink-0 md:hidden h-[var(--house-phone-chrome-h,calc(env(safe-area-inset-top)+7.5rem))]";

// Phone bar: --chrome-gutter (16) lead · --space-3 (12) trail (the
// board's 0 12 0 16). Do not put overflow-hidden on this row (#412).
export const HOUSE_LEAD_PHONE_PAD_CLASS =
  `max-md:pl-[var(--chrome-gutter)] ${HOUSE_PHONE_TRAILING_GUTTER_CLASS}`;

// md+ pads. Lead 24 after the side menu's edge (the board); the end
// stays the shell gutter 32 (gutter lock v2).
export const HOUSE_LEAD_DESKTOP_PAD_CLASS =
  "md:pl-[var(--space-6)] md:pr-[var(--shell-gutter-inline-end)]";

// Where the brand mark heads the bar (no side menu), the lead pad is the
// shell gutter 32 so the mark's ink sits at 32, as in the side menu.
export const HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS = HOUSE_SHELL_GUTTER_X_CLASS;

// relative: Settings phone back is absolute against this row so the
// emblem stays put. Phone: no gap between the lead and the trailing
// cluster (the spacer is the lead's flex-1). md+: at least 24 between
// the lead (the slider) and the trailing cluster. Height is
// --header-height: 56 on desktop and phone. One hairline under it. The bar
// sits on the page canvas (--bg glass), like the side menu, so dark
// mode reads as one surface. Phone: the bar is a sheet over the workspace
// band — the opaque page colour (no glass, so no blue shows through) with
// a 24 top radius (--radius-xl) and the grab handle in an 8 strip above
// the 56 row (64 in all), so the handle clears the bar's round controls.
export const HOUSE_LEAD_CHROME_CLASS = `relative flex items-center justify-end gap-0 md:gap-[var(--space-6)] border-b border-hairline bg-bg/85 backdrop-blur max-md:rounded-t-[var(--radius-xl)] max-md:bg-bg max-md:backdrop-blur-none h-[var(--header-height)] max-md:h-[calc(var(--header-height)+var(--space-2))] max-md:pt-[var(--space-2)] ${HOUSE_LEAD_PHONE_PAD_CLASS} ${HOUSE_PHONE_CHROME_TOUCH_CLASS}`;

// Phone grab handle (Adam 2026-10-08, lock §5): the cue that the sheet
// moves. 36 × 4, centred 4 below the sheet's top edge, the tertiary ink
// at 40%. Drawn only; the pull itself is a vertical drag anywhere on the
// lead stack (house-phone-chrome), so no small touch target is added.
export const HOUSE_LEAD_GRIP_CLASS =
  "pointer-events-none absolute inset-x-0 top-[var(--space-1)] mx-auto h-1 w-9 rounded-full bg-ink-3/40 md:hidden";

// Phone emblem link (md:hidden at the call site): a 44 × 44 hit, so the
// tap target matches the other bar targets (H register: phone targets
// ≥ 44; the board's 44-wide link). The 33-wide mark is unchanged and
// does not move: the hit reaches 11 into the 16 lead gutter (pl 11,
// -ml 11), so its ink stays at 16 and the 8 to the workspace pill holds.
export const HOUSE_LEAD_LOGO_CLASS =
  "inline-flex h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center -ml-[11px] pl-[11px]";

// The brand slot never shrinks: the switcher must not paint over the
// mark (the brand mark is unchanged).
export const HOUSE_LEAD_SLOT_CLASS = "min-w-0 items-center md:shrink-0";

// Desktop Explore: the leading row also carries Exit, 16 after the
// switcher. Below lg, Exit is the same grey control with only its X (a
// 44 circle; the "Exit" word stays as its accessible name). Explore's
// header search shows only as the xl pill (no icon form on Explore), so
// the brand mark, the slider, and Exit fit from lg for GC staff.
export const HOUSE_HEADER_EXIT_COMPACT_CLASS =
  "max-lg:w-[var(--header-desktop-control-size)] max-lg:justify-center max-lg:px-0";

export const HOUSE_HEADER_EXIT_LABEL_CLASS = "max-lg:sr-only";

// Desktop search pill host. Trailing cluster, xl+ only — below xl the
// search is the round grey icon so the workspace slider never clips.
// Flexes 240–360 (flex 0 1 360px); the trailing cluster shrinks, not
// the leading slider.
export const HOUSE_LEAD_SEARCH_DESKTOP_CLASS =
  "hidden min-w-[240px] max-w-[360px] flex-[0_1_360px] xl:flex";

export const HOUSE_LEAD_SEARCH_PHONE_CLASS = "w-full min-w-0 md:hidden";

// Phone Education search row under the bar: 16 both sides, so the
// field starts on the emblem's edge. Opaque page colour: the stack
// behind it is the Sporty Blue workspace band (no glass tint).
export const HOUSE_LEAD_UNDER_NAV_CLASS = `flex w-full items-center md:hidden border-b border-hairline bg-bg max-md:pl-[var(--chrome-gutter)] max-md:pr-[var(--chrome-gutter)] ${HOUSE_SHELL_GUTTER_X_CLASS} py-[var(--space-3)] ${HOUSE_PHONE_CHROME_TOUCH_CLASS}`;

export const HOUSE_LEAD_SEARCH_PILL_CLASS =
  "flex h-[var(--header-search-height)] w-full min-w-0 items-center gap-2 px-3";

// Desktop header search (xl+): the H register's wide grey pill —
// 44 tall, radius full, muted, pad 0 16, a 20 glyph in ink-2, gap 12,
// 15 / 420 input (cards lock, lighter ink); placeholder and glyph on
// ink-2 (ink-3 on the muted fill is under 4.5:1). Same form, input, and
// voice mic as every HouseLeadSearch field; only the face is header-sized:
// the field pill and the shared grey pill skin, with the header's own
// height, gap, pad, and ink replacing the field pill's.
export const HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS = cn(
  HOUSE_LEAD_SEARCH_PILL_CLASS,
  HOUSE_SEARCH_PILL_CLASS,
  "h-[var(--header-control-size)] gap-[var(--space-3)] px-[var(--space-4)] text-ink-2",
);

export const HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS =
  "h-full min-w-0 flex-1 text-[length:var(--text-sm)] text-ink placeholder:text-ink-2";

export const HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS = "size-5 shrink-0 text-ink-2";

// Round grey 44 (H register §3.3): a muted circle with a 20 ink
// glyph. Every header control (search icon, Ask, bell) on phone and
// desktop. Hover and open (aria-pressed / aria-expanded) step the fill
// to the hairline grey, one ramp stop, in both themes. Phone hits are
// 4 apart, desktop 8 (APP_HEADER_TRAILING_CLUSTER_CLASS). Do not
// cancel the box with -mx (#452 stacked the glyphs).
export const HOUSE_HEADER_ROUND_BUTTON_CLASS =
  "flex size-[var(--header-control-size)] min-h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center overflow-visible rounded-full bg-surface-muted text-ink transition-colors hover:bg-hairline aria-pressed:bg-hairline aria-expanded:bg-hairline";

// Shared trailing hit: the round grey 44.
export const HOUSE_HEADER_TRAILING_HIT_CLASS = HOUSE_HEADER_ROUND_BUTTON_CLASS;

// Phone wrappers stay contents so Ask · bell · search are
// flex siblings of the avatar and share the cluster gap. They are
// not a collapse device. Hits must occupy the control-size box.
export const HOUSE_HEADER_TRAILING_SLOT_CLASS = "contents";

export const HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS = "contents md:hidden";

// Avatar follows --header-avatar-size: 44 on desktop and phone — the
// photo is the control. Initials sit on muted when there is no photo.
export const HOUSE_HEADER_TRAILING_AVATAR_CLASS =
  "flex size-[var(--header-avatar-size)] shrink-0 items-center justify-center rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

// Desktop: the account trigger itself, 8 out like every control.
export const HOUSE_HEADER_DESKTOP_AVATAR_CLASS = HOUSE_HEADER_TRAILING_AVATAR_CLASS;

// Phone account: the 44 hit holding the 44 photo face.
export const HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS =
  "flex size-[var(--header-control-size)] shrink-0 items-center justify-center rounded-full";

export const HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS = `${HOUSE_HEADER_TRAILING_AVATAR_CLASS} overflow-hidden`;

// Shared header hit (the round grey 44). Ask and the Activity page's
// settings gear use this box. The sun/moon control is gone.
export const HOUSE_THEME_TOGGLE_CLASS = HOUSE_HEADER_ROUND_BUTTON_CLASS;

// Ask 24Frame AI (founder 2026-10-05, decision 1): a round grey 44 with
// the 20 accent sparkle, on phone and desktop. No visible label at any
// width: "Ask 24Frame AI" is its accessible name and its tooltip
// (title). The sparkle carries its own accent ink
// (HOUSE_ASK_AI_MARK_INK_CLASS), so the hit's hover and open fill never
// repaint it. Supersedes the screening chrome's xl hairline pill with
// the visible label.
export const HOUSE_ASK_AI_HEADER_CLASS = HOUSE_HEADER_ROUND_BUTTON_CLASS;

// Search icon form. Phone and md to xl; the xl pill takes over.
export const HOUSE_LEAD_SEARCH_ICON_CLASS = `${HOUSE_HEADER_ROUND_BUTTON_CLASS} xl:hidden`;

// Education desktop icon form (md to xl) opens the quiet field in a
// small panel under the icon. Phone keeps the under-nav row.
export const HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS = "relative hidden md:flex xl:hidden";

// No shadow (only the phone dock floats): a hairline panel.
export const HOUSE_LEAD_SEARCH_TOGGLE_PANEL_CLASS =
  "absolute right-0 top-full z-50 mt-[var(--space-2)] w-[240px] rounded-full border border-hairline bg-surface";
