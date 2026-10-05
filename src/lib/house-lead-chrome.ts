// Shared top lead chrome for Home · Aggregation · Social · Education ·
// Staff. Screening chrome (Adam 2026-10-04, "Yes, everywhere";
// docs/design-locks/shell-screening-chrome-lock-v1.md).
// Phone: Asset 8 emblem on every workspace (logoVisible always), then
// the grid "switch workspace" button, which names the current
// workspace (13 / 500, ink). Supersedes "no workspace name in the
// header". No hamburger — leading or trailing.
// Destinations live in HousePhoneBottomNav (in-workspace only).
// Phone emblem returns to Home (/home), the industry news feed.
// Desktop wordmark stays the workspace home. Neither opens the rail.
// Phone bar (60):
//   Left: [emblem] [grid + workspace name].
//   Trailing: [search if needed] [24Frame AI] [bell] [account].
//   Every phone target is the 44 tap (HOUSE_HEADER_TRAILING_HIT_CLASS
//   and the 44 account hit around the 30 avatar). Hits abut (no gap);
//   20 glyphs leave 24 of air between them. No negative margin.
//   #452 -mx collapsed AI onto the bell.
//   Pads 16 lead / 8 trail so Social and Aggregation fit at 320.
//   Bottom: HousePhoneBottomNav dests for the current workspace.
// Phone/tablet (max-md) uses the grid button. Desktop md+ puts the
// brand mark, a 1×18 hairline, then the workspace lanes (Home ·
// Aggregation · Social · Education · Staff) as plain words with an ink
// underline on the current one, and hides the grid button. Dock
// dests stay local.
// 24Frame AI sits immediately left of the notification bell on every
// house chrome path (Home · Social · Aggregation · Education ·
// Settings). The header control toggles the Mercury ?ai=1 overlay
// window, never a workspace hop. Second click uses the same close
// path as X / Escape. Expand/collapse stays overlay-scoped. Close
// strips ?ai=1 and leaves the current path. Ask AI is header + Home
// module only (#465). One trail. Theme is the avatar drill, not a
// header glyph.
// Desktop md+ trailing is [search] · Ask · bell · avatar. No waffle.
// Controls are 34 tall, radius 10, 8 apart; the 28 avatar sits 4
// further out. Search (Social and Education only) is the 232×34 muted
// field from xl and its 34 icon form below xl. Ask shows its "Ask
// 24Frame AI" label in a 34 hairline pill from xl; below xl it is the
// 34 icon box. The Ask control is shared so phone and desktop do not
// fork a second mark.
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
// HOUSE_SHELL_GUTTER_X_CLASS. Not --content-inset. The board's 20 / 16
// header pad is not adopted (screening chrome lock, Assumption 1).
// Phone pads are 16 lead / 8 trail (HOUSE_LEAD_PHONE_PAD_CLASS). Dest
// rail stays on --chrome-gutter — this lock does not reopen rail or
// soft-nav geometry.
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

export const HOUSE_LEAD_SEARCH_WIDTH_PX = 232;

export const HOUSE_LEAD_SHELL_CLASS =
  "flex h-dvh flex-col overflow-hidden overscroll-none";

export const HOUSE_LEAD_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain";

// Stack pins header + Education under-nav as one unit. Do not put
// overflow-hidden on this row (#412).
export const HOUSE_LEAD_STACK_CLASS = "sticky top-0 z-40 shrink-0";

// Phone bar: --chrome-gutter (16) lead · --space-2 (8) trail. The
// board's 20 lead does not fit Social (search · Ask · bell · account)
// beside the named grid button at 320; 16 does. md+ uses the shell
// gutter pair (32 / 32). Do not put overflow-hidden on this row (#412).
export const HOUSE_LEAD_PHONE_PAD_CLASS =
  `max-md:pl-[var(--chrome-gutter)] ${HOUSE_PHONE_TRAILING_GUTTER_CLASS}`;

// relative: Settings phone back is absolute against this row so the
// emblem stays put. Phone: no gap between the lead and the trailing
// hits (the spacer is the lead's flex-1). md+: 16 between the lead
// and the trailing cluster (the board's 8 + 8 around its spacer).
// Height is --header-height: 52 desktop, 60 phone. The bar sits on the
// page canvas (--bg glass), like the side menu, so dark mode reads as
// one surface (the board's page token); light is unchanged (white).
export const HOUSE_LEAD_CHROME_CLASS = `relative flex items-center justify-end gap-0 md:gap-[var(--space-4)] border-b border-hairline bg-bg/85 backdrop-blur h-[var(--header-height)] ${HOUSE_LEAD_PHONE_PAD_CLASS} ${HOUSE_SHELL_GUTTER_X_CLASS}`;

// Phone emblem link (md:hidden at the call site): 44 tall, the board's
// wordmark box, so the tap target matches the other bar targets. The
// mark itself stays centred and unchanged; width stays the mark's own
// (a 44 width would not fit Social at 320).
export const HOUSE_LEAD_LOGO_CLASS =
  "inline-flex h-[var(--header-control-size)] shrink-0 items-center";

// md+ the brand slot never shrinks: the switcher must not paint over
// the wordmark (the brand mark is unchanged). 8 after the mark, then
// the 8 row gap, then the hairline divider. Phone keeps min-w-0.
export const HOUSE_LEAD_SLOT_CLASS = `min-w-0 items-center md:mr-[var(--space-2)] md:shrink-0 ${HOUSE_HEADER_SEARCH_GAP_CLASS}`;

// Desktop: the 1×18 hairline between the brand mark and the workspace
// lanes; 4 after it plus the 8 row gap. Phone has no divider.
export const HOUSE_LEAD_DIVIDER_CLASS =
  "hidden h-4.5 w-px shrink-0 bg-hairline md:mr-[var(--space-1)] md:block";

// Desktop Explore, md to lg: the leading row also carries Exit. Below
// lg, Exit is the same muted chip with only its X (34 box; the "Exit"
// word stays as its accessible name) and the header search icon steps
// out — Explore's own discover search sits on the media. From lg both
// return. Fits from 768 for members and staff.
export const HOUSE_HEADER_EXIT_COMPACT_CLASS =
  "max-lg:w-[var(--header-desktop-control-size)] max-lg:justify-center max-lg:px-0";

export const HOUSE_HEADER_EXIT_LABEL_CLASS = "max-lg:sr-only";

export const HOUSE_EXPLORE_HEADER_SEARCH_SLOT_CLASS = "hidden lg:contents";

// Desktop search field host. Trailing cluster, xl+ only — below xl
// the search is its icon form so the workspace lanes never clip.
export const HOUSE_LEAD_SEARCH_DESKTOP_CLASS = "hidden w-[232px] shrink-0 xl:flex";

export const HOUSE_LEAD_SEARCH_PHONE_CLASS = "w-full min-w-0 md:hidden";

// Phone Education search row under the bar: 16 both sides, so the
// field starts on the emblem's edge.
export const HOUSE_LEAD_UNDER_NAV_CLASS = `flex w-full items-center md:hidden border-b border-hairline bg-bg/85 backdrop-blur max-md:pl-[var(--chrome-gutter)] max-md:pr-[var(--chrome-gutter)] ${HOUSE_SHELL_GUTTER_X_CLASS} py-[var(--space-3)]`;

export const HOUSE_LEAD_SEARCH_PILL_CLASS =
  "flex h-[var(--header-search-height)] w-full min-w-0 items-center gap-2 px-3";

// Desktop header field (xl+): the board's "Search people" box —
// 232×34, radius 10, muted, 13px, 16 glyph, gap 8, pad 12. Same form,
// input, and voice mic as every HouseLeadSearch field; only the face
// is header-sized. Placeholder and glyph sit on ink-2 (ink-3 on the
// muted fill is under 4.5:1).
export const HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS =
  "flex h-[var(--header-desktop-control-size)] w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border-0 bg-surface-muted px-3 text-ink-2";

export const HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS =
  "h-full min-w-0 flex-1 text-[length:var(--text-xs)] text-ink placeholder:text-ink-2";

export const HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS = "size-4 shrink-0 text-ink-2";

// Trailing hits. Phone: --header-control-size (44) circles that abut
// (APP_HEADER_TRAILING_CLUSTER_CLASS has no phone gap); the 20 glyph
// leaves 24 of air between neighbours. Do not cancel padding with
// -mx: that pulled adjacent hits to zero flex width and stacked the
// glyphs (#452). Desktop md+: --header-desktop-control-size (34)
// boxes, radius 10, 8 apart (screening chrome on the 52 bar).
export const HOUSE_HEADER_TRAILING_HIT_CLASS =
  `flex size-[var(--header-control-size)] min-h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center overflow-visible ${HOUSE_ICON_BUTTON_CLASS} md:size-[var(--header-desktop-control-size)] md:min-h-[var(--header-desktop-control-size)] md:min-w-[var(--header-desktop-control-size)] md:rounded-[var(--radius)]`;

// Phone wrappers stay contents so Ask · bell · search are
// flex siblings of the avatar and share the cluster gap. They are
// not a collapse device. Hits must occupy the control-size box.
export const HOUSE_HEADER_TRAILING_SLOT_CLASS = "contents";

export const HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS = "contents md:hidden";

// Avatar follows --header-avatar-size: 28 desktop, 30 phone.
// Desktop: the account trigger itself, 4 further out than the
// cluster's 8 gap (HOUSE_HEADER_DESKTOP_AVATAR_CLASS).
export const HOUSE_HEADER_TRAILING_AVATAR_CLASS =
  "flex size-[var(--header-avatar-size)] shrink-0 items-center justify-center rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

export const HOUSE_HEADER_DESKTOP_AVATAR_CLASS = `${HOUSE_HEADER_TRAILING_AVATAR_CLASS} ml-[var(--space-1)]`;

// Phone account: a 44 hit (same box as the other phone hits) holding
// the 30 avatar face, so every phone header target clears 44.
export const HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS =
  `flex size-[var(--header-control-size)] shrink-0 items-center justify-center ${HOUSE_ICON_BUTTON_CLASS}`;

export const HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS = `${HOUSE_HEADER_TRAILING_AVATAR_CLASS} overflow-hidden`;

// Shared header hit. Ask AI uses this box. The sun/moon control is gone.
// Idle ink-2 (the board's bell); phone glyphs carry their own ink.
export const HOUSE_THEME_TOGGLE_CLASS =
  `${HOUSE_HEADER_TRAILING_HIT_CLASS} text-ink-2 transition-colors hover:text-ink`;

// Header Ask AI uses the shared hit.
// xl+ widens the same control into a 34 hairline pill (radius 10,
// pad 10 / 12, gap 6) that carries the visible "Ask 24Frame AI" label
// (13 / 500, ink). Below xl it stays the 34 icon box; phone the 44
// circle. Phone never shows the label. The sparkle carries its
// own accent ink (HOUSE_ASK_AI_MARK_INK_CLASS, Adam 2026-10-04) and the
// label its own ink, so the hit's ink cannot show hover or open. Hover
// and open (aria-pressed) take the muted wash the bell and waffle use
// (ACTIVITY_BELL_TRIGGER_CLASS, WORKSPACE_WAFFLE_TRIGGER_CLASS). Idle
// stays bare.
export const HOUSE_ASK_AI_HEADER_CLASS =
  `${HOUSE_THEME_TOGGLE_CLASS} hover:bg-surface-muted aria-pressed:bg-surface-muted xl:w-auto xl:gap-1.5 xl:border xl:border-hairline xl:pl-[10px] xl:pr-3`;

export const HOUSE_ASK_AI_HEADER_LABEL_CLASS =
  "hidden whitespace-nowrap text-[length:var(--text-xs)] font-medium text-ink xl:inline";

// Search icon form. Phone and md to xl; the xl pill takes over.
// Same quiet hit as Ask and the bell. The phone glyph carries the
// phone idle ink (HOUSE_HEADER_TRAILING_PHONE_CLASS).
export const HOUSE_LEAD_SEARCH_ICON_CLASS = `${HOUSE_THEME_TOGGLE_CLASS} xl:hidden`;

// Education desktop icon form (md to xl) opens the quiet field in a
// small panel under the icon. Phone keeps the under-nav row.
export const HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS = "relative hidden md:flex xl:hidden";

export const HOUSE_LEAD_SEARCH_TOGGLE_PANEL_CLASS =
  "absolute right-0 top-full z-50 mt-[var(--space-2)] w-[240px] rounded-full bg-surface shadow-[var(--elevation-float)]";
