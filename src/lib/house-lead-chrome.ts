// Shared top lead chrome for Aggregation · Social · Education · Home.
// Phone: Asset 8 emblem on every workspace (logoVisible always).
// Emblem on the left. Workspace switch is the trailing waffle.
// No workspace name in the header.
// Emblem owns the phone left next to the workspace trigger.
// No hamburger — leading or trailing.
// Destinations live in HousePhoneBottomNav (in-workspace only).
// Emblem is a workspace-home link, not the rail.
// Phone grammar IA A:
//   Left inline: [emblem]. No workspace word.
//   Trailing: [search if needed] [24Frame AI] [bell] [waffle] [avatar]
//   Trailing rhythm: one --space-2 gap between distinct siblings.
//   Phone icon hits hug the 24px glyph (HOUSE_HEADER_TRAILING_HIT_CLASS)
//   without negative margin. #452 -mx collapsed AI onto the bell.
//   Avatar follows --header-avatar-size (40 phone / 44 desktop).
//   Bottom: HousePhoneBottomNav dests for the current workspace.
// Phone and desktop share one waffle. Dock dests stay local.
// 24Frame AI sits immediately left of the notification bell on every
// house chrome path (Home · Social · Aggregation · Education ·
// Settings). The header control toggles the Mercury ?ai=1 overlay
// window, never a workspace hop. Second click uses the same close
// path as X / Escape. Expand/collapse stays overlay-scoped. Close
// strips ?ai=1 and leaves the current path. Ask AI is header + Home
// module only (#465). One trail. Theme is the avatar drill, not a
// header glyph.
// Desktop md+ keeps Ask · bell · waffle · avatar. The Ask
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

export const HOUSE_LEAD_SLOT_CLASS = `min-w-0 items-center ${HOUSE_HEADER_SEARCH_GAP_CLASS}`;

export const HOUSE_LEAD_SEARCH_DESKTOP_CLASS = "hidden w-[240px] shrink-0 md:flex";

export const HOUSE_LEAD_SEARCH_PHONE_CLASS = "w-full min-w-0 md:hidden";

export const HOUSE_LEAD_UNDER_NAV_CLASS = `flex w-full items-center md:hidden border-b border-hairline bg-surface/85 backdrop-blur ${HOUSE_LEAD_PHONE_PAD_CLASS} ${HOUSE_SHELL_GUTTER_X_CLASS} py-[var(--space-3)]`;

export const HOUSE_LEAD_SEARCH_PILL_CLASS =
  "flex h-[var(--header-search-height)] w-full min-w-0 items-center gap-2 px-3";

// Phone trailing optical rhythm (Adam 2026-09-18 fail after #452).
// Equal CSS gap was not equal air when glyphs sat in oversized hits
// beside the avatar. Phone hit hugs --header-control-size (24) so
// APP_HEADER_TRAILING_CLUSTER_CLASS phone --space-3 / desktop --space-4
// is edge-to-edge AI · bell · waffle · avatar. Do not cancel padding with -mx:
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

// Avatar follows --header-avatar-size on both breakpoints (40 phone,
// 44 desktop). No extra pad. The shared cluster gap is the only air
// to AI / bell / search.
export const HOUSE_HEADER_TRAILING_AVATAR_CLASS =
  "flex size-[var(--header-avatar-size)] shrink-0 items-center justify-center rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

// Shared header hit. Ask AI uses this box. The sun/moon control is gone.
export const HOUSE_THEME_TOGGLE_CLASS =
  `${HOUSE_HEADER_TRAILING_HIT_CLASS} text-ink-3 transition-colors hover:text-ink`;

// Header Ask AI uses the shared hit. Pressed ink marks open.
export const HOUSE_ASK_AI_HEADER_CLASS =
  `${HOUSE_THEME_TOGGLE_CLASS} aria-pressed:text-ink`;
