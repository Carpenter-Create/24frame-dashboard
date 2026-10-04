// Shared top lead chrome for Aggregation · Social · Education · Home.
// Phone: Asset 8 emblem on every workspace (logoVisible always).
// Emblem on the left. Workspace switch is the trailing waffle.
// No workspace name in the header.
// Emblem owns the phone left next to the workspace trigger.
// No hamburger — leading or trailing.
// Destinations live in HousePhoneBottomNav (in-workspace only).
// Phone emblem returns to Home (/home), the industry news feed.
// Desktop wordmark stays the workspace home. Neither opens the rail.
// Phone grammar IA A:
//   Left inline: [emblem]. No workspace word.
//   Trailing: [search if needed] [24Frame AI] [bell] [waffle] [avatar]
//   Trailing rhythm: one --space-2 gap between distinct siblings.
//   Phone icon hits are the 44 tap (HOUSE_HEADER_TRAILING_HIT_CLASS).
//   The glyph inside is the shared 24 box. No negative margin.
//   #452 -mx collapsed AI onto the bell.
//   Avatar follows --header-avatar-size (~28, 1.15× the 24 box).
//   Bottom: HousePhoneBottomNav dests for the current workspace.
// Phone/tablet (max-md) uses the waffle. Desktop md+ puts the
// sliding Layer 1 row (Home · Aggregation · Social · Education ·
// Staff) right after the brand mark and hides the waffle. Dock
// dests stay local. docs/design-locks/shell-unified-chrome-lock-v1.md
// 24Frame AI sits immediately left of the notification bell on every
// house chrome path (Home · Social · Aggregation · Education ·
// Settings). The header control toggles the Mercury ?ai=1 overlay
// window, never a workspace hop. Second click uses the same close
// path as X / Escape. Expand/collapse stays overlay-scoped. Close
// strips ?ai=1 and leaves the current path. Ask AI is header + Home
// module only (#465). One trail. Theme is the avatar drill, not a
// header glyph.
// Desktop md+ trailing is [search] · Ask · bell · avatar. No waffle.
// Search (Social and Education only) is the 240 pill from xl and
// its icon form below xl. Ask shows its "Ask 24Frame AI" label
// from xl; below xl it is the 44 circle. The Ask
// control is shared so phone and desktop do not fork a second mark.
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
// Desktop shell gutters (lock v2): start 32 / end 32 via
// HOUSE_SHELL_GUTTER_X_CLASS. Not --content-inset. Phone left keeps
// --space-6; phone right uses --chrome-gutter so the avatar is not
// flush. Dest rail stays on --chrome-gutter — this lock does not
// reopen rail or soft-nav geometry.
//
// G9 — lead chrome stays pinned to the viewport. Mac rubber-band /
// pull-down overscroll must not carry the header. Document/body is
// not the scroll ancestor. The shell is a viewport column; page
// scroll lives on main. Social + Education share this contract —
// not an Aggregation-only sticky hack. Phone follows the same pin.

import {
  HOUSE_HEADER_SEARCH_GAP_CLASS,
  HOUSE_SHELL_GUTTER_X_CLASS,
  HOUSE_ICON_BUTTON_CLASS,
  HOUSE_PHONE_TRAILING_GUTTER_CLASS,
} from "@/lib/house-shell";

export const HOUSE_LEAD_SEARCH_WIDTH_PX = 240;

export const HOUSE_LEAD_SHELL_CLASS =
  "flex h-dvh flex-col overflow-hidden overscroll-none";

export const HOUSE_LEAD_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain";

// Stack pins header + Education under-nav as one unit. Do not put
// overflow-hidden on this row (#412).
export const HOUSE_LEAD_STACK_CLASS = "sticky top-0 z-40 shrink-0";

// Phone: --space-6 lead · --chrome-gutter trail. md+ uses the shell
// gutter pair (32 / 32). Do not put overflow-hidden on this row (#412).
export const HOUSE_LEAD_PHONE_PAD_CLASS =
  `max-md:pl-[var(--space-6)] ${HOUSE_PHONE_TRAILING_GUTTER_CLASS}`;

// relative: Settings phone back is absolute against this row so the
// 24 emblem stays put.
export const HOUSE_LEAD_CHROME_CLASS = `relative flex items-center justify-end gap-4 border-b border-hairline bg-surface/85 backdrop-blur h-[var(--header-height)] ${HOUSE_LEAD_PHONE_PAD_CLASS} ${HOUSE_SHELL_GUTTER_X_CLASS}`;

export const HOUSE_LEAD_LOGO_CLASS = "inline-flex shrink-0 items-center";

// md+ the brand slot never shrinks: the switcher must not paint over
// the wordmark (shell-unified-chrome-lock-v1 — the brand mark is
// unchanged). Phone keeps min-w-0.
export const HOUSE_LEAD_SLOT_CLASS = `min-w-0 items-center md:shrink-0 ${HOUSE_HEADER_SEARCH_GAP_CLASS}`;

// Desktop Explore, md to lg: the leading row also carries Exit, so
// five lanes (GC staff) + Exit + search · Ask · bell · avatar need
// ~852px. Below lg, Exit is the same filled chip with only its X
// (44 circle; the "Exit" word stays as its accessible name) and the
// header search icon steps out — Explore's own discover search sits
// on the media. From lg both return. Fits from 768 for members and
// staff.
export const HOUSE_HEADER_EXIT_COMPACT_CLASS =
  "max-lg:w-[var(--header-control-size)] max-lg:justify-center max-lg:px-0";

export const HOUSE_HEADER_EXIT_LABEL_CLASS = "max-lg:sr-only";

export const HOUSE_EXPLORE_HEADER_SEARCH_SLOT_CLASS = "hidden lg:contents";

// Desktop search pill. Trailing cluster, xl+ only — below xl the
// search is its icon form so the workspace row never clips.
export const HOUSE_LEAD_SEARCH_DESKTOP_CLASS = "hidden w-[240px] shrink-0 xl:flex";

export const HOUSE_LEAD_SEARCH_PHONE_CLASS = "w-full min-w-0 md:hidden";

export const HOUSE_LEAD_UNDER_NAV_CLASS = `flex w-full items-center md:hidden border-b border-hairline bg-surface/85 backdrop-blur ${HOUSE_LEAD_PHONE_PAD_CLASS} ${HOUSE_SHELL_GUTTER_X_CLASS} py-[var(--space-3)]`;

export const HOUSE_LEAD_SEARCH_PILL_CLASS =
  "flex h-[var(--header-search-height)] w-full min-w-0 items-center gap-2 px-3";

// Phone trailing optical rhythm (Adam 2026-09-18 fail after #452).
// Equal CSS gap was not equal air when glyphs sat in oversized hits
// beside the avatar. The hit is --header-control-size (44) so the
// tap stays 44 while the glyph stays the 24 box.
// APP_HEADER_TRAILING_CLUSTER_CLASS phone --space-3 / desktop --space-4
// is the air between those hits. Do not cancel padding with -mx:
// that pulled adjacent hits to zero flex width and stacked the glyphs.
// Do not add phone padding that overflows the control box.
// Desktop hits follow the same token (44 on the 88 bar).
// Circular quiet, no muted wash, no hairline box.
export const HOUSE_HEADER_TRAILING_HIT_CLASS =
  `flex size-[var(--header-control-size)] min-h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center overflow-visible ${HOUSE_ICON_BUTTON_CLASS}`;

// Phone wrappers stay contents so Ask · bell · search are
// flex siblings of the avatar and share the cluster gap. They are
// not a collapse device. Hits must occupy the control-size box.
export const HOUSE_HEADER_TRAILING_SLOT_CLASS = "contents";

export const HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS = "contents md:hidden";

// Avatar follows --header-avatar-size on both breakpoints (~28).
// No extra pad. The shared cluster gap is the only air
// to AI / bell / search / waffle.
export const HOUSE_HEADER_TRAILING_AVATAR_CLASS =
  "flex size-[var(--header-avatar-size)] shrink-0 items-center justify-center rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

// Shared header hit. Ask AI uses this box. The sun/moon control is gone.
export const HOUSE_THEME_TOGGLE_CLASS =
  `${HOUSE_HEADER_TRAILING_HIT_CLASS} text-ink-3 transition-colors hover:text-ink`;

// Header Ask AI uses the shared hit.
// xl+ widens the same control into a hairline pill that carries the
// visible "Ask 24Frame AI" label (Adam 2026-10-04). Below xl it stays
// the 44 circle. Phone never shows the label. The sparkle carries its
// own accent ink (HOUSE_ASK_AI_MARK_INK_CLASS, Adam 2026-10-04) and the
// label its own ink, so the hit's ink cannot show hover or open. Hover
// and open (aria-pressed) take the muted wash the bell and waffle use
// (ACTIVITY_BELL_TRIGGER_CLASS, WORKSPACE_WAFFLE_TRIGGER_CLASS). Idle
// stays bare.
export const HOUSE_ASK_AI_HEADER_CLASS =
  `${HOUSE_THEME_TOGGLE_CLASS} hover:bg-surface-muted aria-pressed:bg-surface-muted xl:w-auto xl:gap-[var(--space-2)] xl:border xl:border-hairline xl:pl-[var(--space-3)] xl:pr-[var(--space-4)]`;

export const HOUSE_ASK_AI_HEADER_LABEL_CLASS =
  "hidden whitespace-nowrap t-body-sm text-ink xl:inline";

// Search icon form. Phone and md to xl; the xl pill takes over.
// Same quiet hit as Ask and the bell. The phone glyph carries the
// phone idle ink (HOUSE_HEADER_TRAILING_PHONE_CLASS).
export const HOUSE_LEAD_SEARCH_ICON_CLASS = `${HOUSE_THEME_TOGGLE_CLASS} xl:hidden`;

// Education desktop icon form (md to xl) opens the quiet field in a
// small panel under the icon. Phone keeps the under-nav row.
export const HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS = "relative hidden md:flex xl:hidden";

export const HOUSE_LEAD_SEARCH_TOGGLE_PANEL_CLASS =
  "absolute right-0 top-full z-50 mt-[var(--space-2)] w-[240px] rounded-full bg-surface shadow-[var(--elevation-float)]";
