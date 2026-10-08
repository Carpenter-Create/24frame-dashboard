// Social measured chrome. Tokens only — no hex.
// Desktop Home Circle-primary: Figma 176:1085 / 176:1346.
// Prior desktop: 169:964 / 169:1281 (164:1136 / 164:1360 still in place).
// Mobile Home: Figma 169:1519 Stories then Topics then Following wall.
// Pill hide stays 160:1129.
// Profile ship: Figma 129:215 / 129:415 / 129:615.
// Profile share sheet: Figma 155:194 / 155:372.
// Create ship: Figma 135:585 / 135:1037 / 135:1214.
// Stories ship: Figma 138:163 / 138:889 / 138:943.
// Stories studio: Figma 146:230 / 146:1050 / 146:1072 / 146:1099
//   desktop 146:1125 / 146:1147 / 146:1173 / 147:251.
// Stories picker: Figma 144:1218 / 144:1444.
// No glass, no drop shadow. App-shell chrome (search, rail, filters) uses
// house-shell. Feed / stories / create measured IA stays here.

import {
  HOUSE_FILTER_OFF_CLASS,
  HOUSE_FILTER_ON_CLASS,
  HOUSE_MODULE_CLASS,
  HOUSE_PILL_SELECTED_CLASS,
  HOUSE_RAIL_PANEL_CLASS,
  HOUSE_SCROLL_ROW_CLASS,
} from "@/lib/house-shell";
import { HOUSE_VOICE_FOCUS_HOST_CLASS } from "@/lib/form-control";
import {
  HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS,
  HOUSE_PHONE_DOCK_CHROME_PB_CLASS,
} from "@/lib/house-phone-dock";
import { HOUSE_PHONE_STACK_CLASS, HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import {
  SETTINGS_DIALOG_ERROR_CLASS,
  SETTINGS_DIALOG_HELP_CLASS,
  SETTINGS_DIALOG_LABEL_CLASS,
} from "@/lib/settings";

export const SOCIAL_FIGMA_HOME = "176:1085";
export const SOCIAL_FIGMA_HOME_EMPTY = "176:1346";
export const SOCIAL_FIGMA_HOME_MOBILE = "169:1519";
export const SOCIAL_FIGMA_HOME_MOBILE_SCROLL = "160:1129";
export const SOCIAL_FIGMA_HOME_DESKTOP_PRIOR = ["169:964", "169:1281", "164:1136", "164:1360"] as const;

// Desktop Social content row. The left dest rail is the house slot
// (`--sidebar-width` via RAIL_WIDTH_CLASS). It stays left-pinned.
// This row is only the tight pair to the right of that rail:
// center 720 + gutter 32 + For You 300 = 1052.
// Adam 2026-09-22: the fixed gutter between center and For You is 32.
// Adam 2026-09-22 lock: Middle is 720. Pair max is 1052.
// Lock v2: at lg the pair stays that fixed width and its trailing
// edge sits on the shell gutter so For You lines up with the avatar.
// Leftover air stays on the lead side of the pair. Do not
// justify-between the row. Do not pack the pair to the start. Do not
// slide the rail inward. Do not stretch the center past 720. For You
// stays 300. Do not full-bleed the inner cards. Phone is full-bleed:
// the pair cap applies at lg, when the For You rail appears.
// Complete class strings below — Tailwind does not see interpolations.
export const SOCIAL_DESKTOP_MEASURE = {
  gutter: 32,
  center: 720,
  right: 300,
  padR: 16,
} as const;

export const SOCIAL_CONTENT_PAIR_WIDTH =
  SOCIAL_DESKTOP_MEASURE.center +
  SOCIAL_DESKTOP_MEASURE.gutter +
  SOCIAL_DESKTOP_MEASURE.right;
export const SOCIAL_FIGMA_PROFILE = ["129:215", "129:415", "129:615"] as const;
export const SOCIAL_FIGMA_PROFILE_OWN = ["181:230", "181:2000"] as const;
export const SOCIAL_FIGMA_PROFILE_EDIT = ["180:206", "180:1946", "181:2184"] as const;
export const SOCIAL_FIGMA_PROFILE_BIO = ["180:2004", "180:2026"] as const;
export const SOCIAL_FIGMA_PROFILE_SHARE = ["155:194", "155:372"] as const;
export const SOCIAL_FIGMA_CREATE = ["135:585", "135:1037", "135:1214"] as const;
export const SOCIAL_FIGMA_STORIES = ["138:163", "138:889", "138:943"] as const;
export const SOCIAL_FIGMA_STORY_STUDIO = [
  "146:230",
  "146:1050",
  "146:1072",
  "146:1099",
  "146:1125",
  "146:1147",
  "146:1173",
  "147:251",
] as const;
export const SOCIAL_FIGMA_STORY_PICKER = ["144:1218", "144:1444"] as const;

// Dest rail width is RAIL_WIDTH_CLASS. Panel chrome matches Aggregation.
export const SOCIAL_RAIL_PANEL_CLASS = HOUSE_RAIL_PANEL_CLASS;
export const SOCIAL_FOR_YOU_WIDTH_CLASS = "w-[300px]";
const socialCenterMaxClass = "lg:max-w-[720px]";
export const SOCIAL_CENTER_WIDTH_CLASS = `w-full min-w-0 ${socialCenterMaxClass}`;
// Desktop header → content inset. Measured Home topic row sits 8px
// under the hairline. Profile cover and the Messages title sat on
// the frame's 16. One class moves the main column and the For You
// rail together. Phone keeps pt-4 (16).
// docs/design-locks/shell-desktop-header-content-inset-lock-v1.md
export const SOCIAL_DESKTOP_HEADER_INSET_CLASS = "md:pt-[var(--space-2)]";

// Phone keeps --chrome-gutter. Desktop lead stays the dest-rail
// chrome gutter. Desktop trail is the shell gutter (avatar ink).
// Desktop top is the shared header inset. Bottom stays 16.
export const SOCIAL_DESKTOP_FRAME_PAD_CLASS =
  `w-full pt-4 pb-4 ${SOCIAL_DESKTOP_HEADER_INSET_CLASS} max-md:px-[var(--chrome-gutter)] md:pl-[var(--chrome-gutter)] md:pr-[var(--shell-gutter-inline-end)]`;

export const SOCIAL_PAGE_CLASS =
  "flex flex-col gap-[var(--space-4)] pb-[var(--space-12)]";

// One shell for every Social row. At lg the row is the 1052 pair,
// end-aligned so For You's trailing edge is the shell gutter.
// Below lg there is no max-width and no auto margin: For You is
// display:none and the center stays full-bleed.
export const SOCIAL_HOME_LAYOUT_CLASS =
  "flex w-full items-start gap-[32px] lg:ml-auto lg:max-w-[1052px]";

// Shared center column. Home, Explore, Messages, and Profile use this
// string — no width fork. flex-1 shrinks the center when the lg canvas
// is narrower than the pair. The literal lg cap stops the grow at 720.
// w-full keeps phone, and the save-hop overlay, full-bleed of
// their parent.
const socialShellCenterClass =
  `flex min-w-0 w-full flex-1 flex-col gap-2 ${socialCenterMaxClass}`;

export const SOCIAL_HOME_CENTER_CLASS = socialShellCenterClass;

// Profile desktop row matches Home: this column plus SocialForYouRail
// at lg+. Explore and Messages use that same row. The center stays
// the shared 720. The pair stays tight. Phone stays the full phone canvas.
export const SOCIAL_PROFILE_CENTER_CLASS = socialShellCenterClass;

// 40px face. Export name stays so search, home, and overview share one SoT.
export const SOCIAL_AVATAR_32_CLASS =
  "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

export const SOCIAL_SURFACE_RADIUS_CLASS = "rounded-[var(--radius-lg)]";

// ---------------------------------------------------------------------
// Cards (founder 2026-10-06: "notice how every single facebook post type
// is clearly in its own surface?"; Direction B, "B."). The canvas stays
// white. Every post and every Feed module sits on one soft grey card; a
// control inside a card flips to the page white, so the card reads as its
// own section. These few constants are the whole surface treatment: a
// later tweak of the card grey (an open founder choice) or of the in-card
// fill is a one-line change here. Tokens only.
// docs/design-locks/social-feed-cards-lock-v1.md
// ---------------------------------------------------------------------

// Phone only. The social frame pads 16. These utilities cancel that
// gutter so a row meets the viewport. They are max-md, so desktop
// column inset stays. Every card (a post, the stories, the composer,
// Reels) meets the viewport on phone through this; the text rows inside
// a card keep their own 16.
export const SOCIAL_MOBILE_BLEED_CLASS =
  "max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]";

/** The card fill: --surface-muted on the white canvas; dark, --surface on --bg. */
export const SOCIAL_CARD_FILL_CLASS = "bg-surface-muted dark:bg-surface";

/** A control inside a card: the page white; dark, --surface-muted (lighter than the dark card). */
export const SOCIAL_IN_CARD_FILL_CLASS = "bg-surface dark:bg-surface-muted";

/** The in-card fill as an edge colour: a ring cut from it (Create story's plus). */
export const SOCIAL_IN_CARD_EDGE_CLASS = "border-surface dark:border-surface-muted";

// The card's face: the fill, radius 24, no edge, no shadow. Phone: the
// card meets the viewport at radius 0 (8 of white between cards). For a
// host that sets its own flow (the composer's row, the empty panel).
export const SOCIAL_FEED_CARD_SURFACE_CLASS =
  `rounded-[var(--radius-xl)] ${SOCIAL_CARD_FILL_CLASS} ${SOCIAL_MOBILE_BLEED_CLASS} max-md:rounded-none`;

// The card: every post and every Feed module, as a column.
export const SOCIAL_FEED_CARD_CLASS = `flex min-w-0 shrink-0 flex-col ${SOCIAL_FEED_CARD_SURFACE_CLASS}`;

export const SOCIAL_FOR_YOU_RAIL_CLASS =
  `hidden ${SOCIAL_FOR_YOU_WIDTH_CLASS} shrink-0 flex-col gap-4 ${SOCIAL_SURFACE_RADIUS_CLASS} border border-hairline bg-surface p-4 lg:flex`;

// The empty panel is a card (the Feed's empty wall, the For you lane,
// Profile's empty tabs): centred, pad 24 / 48.
export const SOCIAL_EMPTY_PANEL_CLASS =
  `flex flex-col items-center justify-center gap-[var(--space-4)] px-[var(--space-6)] py-[var(--space-12)] text-center ${SOCIAL_FEED_CARD_SURFACE_CLASS}`;

// Profile Posts empty — own + public one SoT. Quiet: no tall muted
// well, no second Edit. Title is the one short line.
export const SOCIAL_PROFILE_POSTS_EMPTY_CLASS =
  "flex flex-col items-center justify-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-4)] text-center";

// House pills (h 44, radius full, pad 20, 15 / 500): one accent
// primary; the rest on the in-card fill.
const SOCIAL_EMPTY_PILL_BASE_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-center text-[length:var(--text-sm)] font-medium leading-5";
export const SOCIAL_EMPTY_ACTION_CLASS = `${SOCIAL_EMPTY_PILL_BASE_CLASS} bg-accent text-accent-contrast`;
export const SOCIAL_EMPTY_ACTION_SECONDARY_CLASS =
  `${SOCIAL_EMPTY_PILL_BASE_CLASS} ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors hover:bg-hairline`;

export const SOCIAL_CHECKLIST_CLASS =
  "flex flex-col gap-[var(--space-2)] rounded-[8px] border border-hairline bg-surface p-[var(--space-4)]";

export const SOCIAL_CHECKLIST_TRACK_CLASS =
  "h-1 w-full overflow-hidden rounded-full bg-surface-muted";

export const SOCIAL_CHECKLIST_TRACK_NESTED_CLASS =
  "h-1 w-full overflow-hidden rounded-full bg-surface";

export const SOCIAL_CHECKLIST_ROW_CLASS = "border-b border-hairline py-[var(--space-3)]";

export const SOCIAL_CHECKLIST_ROW_LAST_CLASS = "py-[var(--space-3)]";

// Same-family social chip hit. Home topic rail is the size source of
// truth (density lock v1.1 §C: 32 / h-8). Profile roles, topic tags,
// profession chips, and the idle topic pill compose this string.
// Workspace / dest / news SegmentedTrack stays on HOUSE_PILL_MEASURE_CLASS.
// Do not copy this class list.
// docs/design-locks/social-home-spine-density-lock-v1.1.md
export const SOCIAL_CHIP_HIT_CLASS =
  "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-[var(--space-4)] t-body-sm";

export const SOCIAL_PILL_CLASS = SOCIAL_CHIP_HIT_CLASS;

export const SOCIAL_PILL_ACTIVE_CLASS = HOUSE_FILTER_ON_CLASS;

export const SOCIAL_PILL_IDLE_CLASS = HOUSE_FILTER_OFF_CLASS;

export const SOCIAL_ACTION_CLASS =
  "inline-flex items-center justify-center rounded-[8px] bg-accent px-[var(--space-6)] py-[var(--space-2)] t-body-sm font-medium text-accent-contrast";

export const SOCIAL_ACTION_SECONDARY_CLASS =
  "inline-flex items-center justify-center rounded-[8px] border border-hairline bg-surface px-[var(--space-6)] py-[var(--space-2)] t-body-sm font-medium text-ink";

export const SOCIAL_ACTION_QUIET_CLASS =
  "inline-flex items-center justify-center rounded-[8px] bg-surface-muted px-[var(--space-3)] py-[6px] t-body-sm font-medium text-ink";

export const SOCIAL_STORY_CARD_CLASS =
  "flex h-[144px] w-[96px] shrink-0 items-center justify-center rounded-[12px] p-[3px]";

export const SOCIAL_STORY_FACE_CLASS =
  "flex size-full flex-col items-center justify-center gap-[var(--space-2)] rounded-[9px] px-[var(--space-2)] py-[var(--space-4)]";

export const SOCIAL_STORY_MEDIA_CLASS =
  "relative size-full overflow-hidden rounded-[9px] bg-surface-muted";

// Adam 2026-09-20 — Create Story is Social chrome, not an eyebrow.
// t-label uppercase + 0.12em track stacked CREATE / STORY as a
// leftover specialty face. Same token as Topics / Share something /
// Create sheet tiles. One SoT for phone + desktop — no device fork.
// The Feed's story tiles (G) moved to SOCIAL_HOME_STORY_* below; this
// stays for the /social/stories surface.
export const SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS =
  "t-body-sm font-medium text-ink";

export const SOCIAL_STORIES_CARD_CLASS =
  `flex h-[168px] w-[112px] shrink-0 items-center justify-center ${SOCIAL_SURFACE_RADIUS_CLASS} p-[3px]`;

export const SOCIAL_STORIES_FACE_CLASS =
  "flex size-full flex-col items-center justify-center gap-[var(--space-2)] rounded-[13px] px-[var(--space-2)] py-[var(--space-4)]";

export const SOCIAL_STORIES_MEDIA_CLASS =
  "relative size-full overflow-hidden rounded-[13px] bg-surface-muted";

// Same plus SoT as SOCIAL_HOME_STORY_PLUS_CLASS: accent well, white glyph.
export const SOCIAL_STORIES_PLUS_WELL_CLASS =
  "flex size-9 items-center justify-center rounded-full bg-accent text-accent-contrast";

export const SOCIAL_STORIES_EMPTY_ACTION_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-[var(--space-4)] py-[10px] t-body-sm font-medium text-accent-contrast";

// Desktop open lock: full-viewport near-black stage. The light 420px
// column card is out. #0A0A0B has no house token (--bg and --text flip;
// --band is #1b1f23). One class, not hex in the component.
export const SOCIAL_STORY_STAGE_CLASS =
  "fixed inset-0 z-50 bg-[#0A0A0B] text-band-ink";

// Open viewer hold surface. select-none plus the callout utility: a long-press
// pauses, and iOS must not select the stage or raise the system callout.
// Text fields opt back in in globals.css.
export const SOCIAL_STORY_HOLD_SURFACE_CLASS = "select-none social-story-no-callout";

// Rich calm v1.4 — paint on the viewer and rail. Durations live in globals.css.
// A still has no media duration; the fill uses this display interval.
// Not a capture cap.
export const SOCIAL_STORY_STILL_PROGRESS_MS = 5000;
// Write compose still names this open class. The CSS fade stays out:
// stories open-smooth forbids that keyframe in globals.css.
export const SOCIAL_STORY_STAGE_IN_CLASS = "social-story-stage-in";
export const SOCIAL_STORY_ACTIVATE_NEXT_CLASS = "social-story-activate";
export const SOCIAL_STORY_ACTIVATE_PREV_CLASS = "social-story-activate-prev";
export const SOCIAL_STORY_PROGRESS_FILL_CLASS = "social-story-progress";

export const SOCIAL_STORY_ACTIVE_CARD_CLASS =
  "relative h-full w-full overflow-hidden bg-[#0A0A0B] md:h-[min(90vh-16px,840px)] md:w-[calc(min(90vh-16px,840px)*9/16)] md:shrink-0 md:rounded-[16px]";

export const SOCIAL_STORY_NEIGHBOR_CARD_CLASS =
  "relative hidden h-[calc(min(90vh-16px,840px)*0.72)] w-[calc(min(90vh-16px,840px)*0.72*9/16)] shrink-0 overflow-hidden rounded-[16px] bg-[#0A0A0B] opacity-45 md:block";

export const SOCIAL_STORY_PROGRESS_BAR_CLASS = "h-0.5 flex-1 rounded-full";
// Instagram parity v1: 2px track and 2px gap. h-0.5 / gap-0.5 are 2px.
export const SOCIAL_STORY_PROGRESS_ROW_CLASS = "flex gap-0.5";

export const SOCIAL_STORY_CARET_CLASS =
  "absolute top-1/2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-band-ink/12 text-band-ink md:flex";

// Glass amend: frosted wash on the dark stage. Not paper (bg-surface).
// ~15% band-ink is inside the 12–20% white wash. Hairline is band-ink/20.
export const SOCIAL_STORY_GLASS_FIELD_CLASS =
  "flex h-10 w-full min-w-0 flex-1 items-center rounded-full border border-band-ink/20 bg-band-ink/15 px-4 text-left t-body-sm backdrop-blur";

export const SOCIAL_STORY_REPLY_PILL_CLASS = `${SOCIAL_STORY_GLASS_FIELD_CLASS} text-band-ink/70`;

// Stories viewer IG actions lock v1. One bottom row on phone and desktop.
// Gap 8, pad x 16, pad y 8. Hit 40. Liked heart stays Sporty Blue on the
// dark stage — dark-mode --accent is the soft flip, not this control.
export const SOCIAL_STORY_ACTIONS_ROW_CLASS =
  "absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 px-4 py-2";

export const SOCIAL_STORY_ACTIONS_CLUSTER_CLASS = "flex shrink-0 items-center gap-2";

export const SOCIAL_STORY_ACTION_HIT_CLASS =
  "flex size-10 shrink-0 items-center justify-center transition-colors duration-[120ms] active:opacity-70";

export const SOCIAL_STORY_ACTION_IDLE_CLASS = "text-band-ink/70";

export const SOCIAL_STORY_HEART_LIKED_CLASS = "text-[#1769FF]";

// Feed composer (H register §5.3; cards lock): one card (pad 16 / 12,
// phone 8 under the stories card, desktop 16) holding one 44 row: the 44
// avatar, 12, the "Share something" pill (the in-card fill, radius full,
// 44, 17 / 420 ink-2, pad 16) that opens the write sheet, then 8 (phone
// 4) and a round 44 Photo, 8 (4), a round 44 Camera (20 ink glyphs), both
// on the in-card fill. Prompt copy, the write sheet, and the pickers are
// unchanged. docs/design-locks/social-feed-cards-lock-v1.md
export const SOCIAL_COMPOSER_CLASS =
  `mt-2 flex min-w-0 shrink-0 items-center gap-1 px-4 py-3 md:mt-4 md:gap-2 ${SOCIAL_FEED_CARD_SURFACE_CLASS}`;

export const SOCIAL_COMPOSER_ROW_CLASS =
  "group flex min-w-0 flex-1 items-center gap-3 text-left";

export const SOCIAL_COMPOSER_AVATAR_CLASS = "size-11";

// Below 360 the composer's avatar steps out (as the phone bar's workspace
// name does; the bar keeps the member's photo), so "Share something"
// stays one line in its 44 pill at 320 and both pickers stay.
export const SOCIAL_COMPOSER_AVATAR_NARROW_CLASS = "max-[359px]:hidden";

export const SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS = "flex shrink-0 items-center gap-1 md:gap-2";

// Round 44 on the in-card fill (H register §3.3 round control).
export const SOCIAL_COMPOSER_AFFORDANCE_CLASS =
  `inline-flex size-11 shrink-0 items-center justify-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors hover:bg-hairline`;

export const SOCIAL_COMPOSER_AFFORDANCE_GLYPH = 20;
export const SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS = "text-ink";

// The prompt pill on the in-card fill. Hover steps the fill to the
// hairline grey, as the round controls do.
export const SOCIAL_COMPOSER_FIELD_CLASS =
  `flex h-11 min-w-0 flex-1 items-center rounded-full border-0 ${SOCIAL_IN_CARD_FILL_CLASS} px-4 text-[length:var(--text-base)] text-ink-2 outline-none transition-colors group-hover:bg-hairline`;

export const SOCIAL_COMPOSER_MEDIA_CLASS =
  "relative flex size-9 shrink-0 cursor-pointer items-center justify-center text-ink-2";

export const SOCIAL_FOLLOW_COMPACT_CLASS =
  "inline-flex items-center rounded-[8px] bg-accent px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-accent-contrast";

// Feed For you rail (H register §3.3 small secondary; cards lock): a 36
// pill on the in-card fill (the rail's people sit in a grey card), 15 /
// 500 ink, pad 16. No hairline, no accent fill.
export const SOCIAL_FOLLOW_QUIET_CLASS =
  `inline-flex h-9 shrink-0 items-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} px-4 text-[length:var(--text-sm)] font-medium text-ink transition-colors hover:bg-hairline`;

export const SOCIAL_FOLLOW_COMPACT_IDLE_CLASS =
  "inline-flex items-center rounded-[8px] border border-hairline bg-surface px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-ink";

// The framed For you rail's inner modules (Profile, Messages, Create):
// the house module inside the rail's hairline panel.
export const SOCIAL_FOR_YOU_CARD_CLASS =
  `${HOUSE_MODULE_CLASS} flex w-full flex-col gap-2 p-4`;

// The Feed's For you lane: Suggested people as a card (cards lock).
export const SOCIAL_FOR_YOU_LANE_CARD_CLASS = `${SOCIAL_FEED_CARD_CLASS} gap-2 p-4`;

// Restores the 16 a viewport bleed removed. The frame gutter is the
// white side canvas.
export const SOCIAL_MOBILE_BLEED_PAD_CLASS = "max-md:px-[var(--chrome-gutter)]";

// The post face (header, words, media, actions, the permalink's
// comments) is the cards block below ("Cards · posts").
// docs/design-locks/social-feed-cards-lock-v1.md

// Messages inbox list. No full-width hairline — vertical pad is the
// rhythm. The frame gutter keeps the face inset, so this row does not
// bleed. Unread is Sporty Blue via the accent token (light #1769FF).
// docs/design-locks/social-dms-inbox-ig-lock-v1.md
export const SOCIAL_DM_INBOX_HEADER_CLASS =
  "flex items-center justify-between gap-[var(--space-3)] py-[var(--space-2)]";

export const SOCIAL_DM_INBOX_TITLE_CLASS =
  "min-w-0 break-words t-heading font-semibold text-ink";

export const SOCIAL_DM_INBOX_COMPOSE_CLASS =
  "ml-auto flex size-[var(--header-control-size)] min-h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center rounded-full text-ink";

export const SOCIAL_DM_INBOX_ROW_CLASS = "py-[var(--space-3)]";

export const SOCIAL_DM_INBOX_UNREAD_DOT_CLASS = "size-2 shrink-0 rounded-full bg-accent";

// Pinned 24Frame AI face. Same circle as a person avatar. The sparkle
// is half the face. docs/design-locks/social-frame-ai-pin-lock-v1.md
export const SOCIAL_FRAME_AI_FACE_CLASS =
  "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-accent";

// Like · Comment · Share on a dark stage (the immersive dock, the
// Explore rail, the create preview): bare hits, glyph 24, gap 8 between
// hit edges. The feed post face is the H block's round grey actions
// (H · Posts). Phosphor Heart ink sits about 1px above the bubble in
// both weights, so both states share one translateY(1px).
// docs/design-locks/social-home-post-actions-align-lock-v1.md
// docs/design-locks/social-home-density-craft-sequel-lock-v1.md
export const SOCIAL_POST_ACTIONS_GAP_CLASS = "gap-2";

export const SOCIAL_POST_ACTION_HIT_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center text-ink-2 active:opacity-70";

export const SOCIAL_POST_ACTION_HEART_NUDGE_CLASS = "translate-y-px";

// Liked heart on a dark stage. Sporty Blue from the post-actions lock.
// Dark-mode --accent is the soft flip, not this control.
// docs/design-locks/social-home-post-actions-align-lock-v1.md
export const SOCIAL_POST_ACTION_LIKED_CLASS = "text-[#1769FF]";

// Feed photo scale + tap immersive v1.
// docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md
// Immersive actions cite the align lock: hit 40, glyph 24, gap 8. The
// feed's still cap is superseded by the H photo frame (true shape).
export const SOCIAL_POST_ACTION_GLYPH = 24;

export const SOCIAL_POST_ACTIONS_ROW_CLASS =
  `flex items-center ${SOCIAL_POST_ACTIONS_GAP_CLASS}`;

// #0A0A0B has no house token (--band is #1b1f23). One class, same
// precedent as the story stage. Desktop uses this same fullscreen
// stage — a trailing caption column is out.
// z-[45] is the stage on document.body. The comment host (z-50) mounts
// inside this stage and paints above the dock. The Share sheet is a
// separate body portal at z-[60], above the stage. Do not raise this.
export const SOCIAL_FEED_IMMERSIVE_STAGE_CLASS =
  "fixed inset-0 z-[45] bg-[#0A0A0B] text-band-ink social-feed-immersive-in";

export const SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS =
  "absolute left-0 top-[env(safe-area-inset-top)] z-30 flex size-[44px] min-h-[44px] min-w-[44px] items-center justify-center text-band-ink";

// Phone immersive video. Mux mute sits in the bottom bar, under
// Like / Comment / Share. This is the phone mute: top-trailing, same
// row as Close, clear of the dock and of PiP / fullscreen.
// md:hidden — desktop keeps the mute in the player bar.
export const SOCIAL_FEED_IMMERSIVE_MUTE_CLASS =
  "absolute right-0 top-[env(safe-area-inset-top)] z-30 flex size-[44px] min-h-[44px] min-w-[44px] items-center justify-center text-band-ink md:hidden";

export const SOCIAL_FEED_IMMERSIVE_DOCK_CLASS =
  "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[var(--space-2)] bg-[linear-gradient(to_top,rgb(0_0_0/0.4),rgb(0_0_0/0)_120px)] px-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] pt-[var(--space-4)]";

export const SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS = "t-body text-band-ink break-words";

// Explore For You v2. The media is the canvas. Same near-black stage as
// SOCIAL_STORY_STAGE_CLASS. Phone is fixed to the viewport and cover-fills
// it. Desktop md+ keeps that stage in the column under the house header.
// The desktop player is a centered 9:16 box inside the stage (see
// .social-explore-player). No z-index, so the phone dock (z-40) and
// sheets (z-50) overlay the stage. #0A0A0B has no house token. Not a
// rounded card, not a paper well. Phone For You is viewport-fixed and
// headerless. Desktop md+ does not cover the house header.
// The surface dest-rail card stays off this route.
// Media Immersion Doctrine: soft / flat / pasted / framed card = FAIL.
// docs/design-locks/social-explore-for-you-immersive-lock-v2.md
// docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md
// Screening chrome: over the dark stage the bar is the opaque page
// canvas (its 85% glass read as grey over the stage), so the muted Exit
// chip reads as on the board. Selector reaches through `contents`.
export const SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS =
  "hidden md:contents [&_[data-app-header]]:bg-bg";

// Desktop header control. Hidden below md so phone Explore has no Exit.
// H register (Adam 2026-10-05,
// the shell register lock v1 in docs/design-locks §3.3 Secondary):
// a grey pill 44, radius full, pad 16 / 20, a 20 X, 8, then "Exit" at
// 17 / 600 ink, 16 after the switcher (the leading row's gap).
// Supersedes the screening chrome's muted 34 chip.
export const SOCIAL_EXPLORE_EXIT_CLASS =
  "hidden h-[var(--header-desktop-control-size)] min-h-[var(--header-desktop-control-size)] shrink-0 items-center gap-[var(--space-2)] whitespace-nowrap rounded-full bg-surface-muted pl-[var(--space-4)] pr-5 text-[length:var(--text-base)] font-semibold text-ink transition-colors hover:bg-hairline md:inline-flex";

/** The Exit X: 20, the round-button glyph size. */
export const SOCIAL_EXPLORE_EXIT_ICON_SIZE = 20;

export const SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS =
  "max-md:fixed max-md:inset-0 overflow-hidden bg-[#0A0A0B] md:absolute md:inset-0";

export const SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS =
  "absolute inset-0 overflow-hidden bg-[#0A0A0B] text-band-ink";

export const SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS =
  "social-explore-scroll absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain";

export const SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS =
  "social-explore-slide relative h-full min-h-full w-full shrink-0 snap-start snap-always";

// Phone: this box is the slide (full-bleed cover). Desktop geometry is
// .social-explore-player in globals.css — a centered 9:16 frame.
export const SOCIAL_EXPLORE_FOR_YOU_PLAYER_CLASS = "social-explore-player";

// Trailing rail. Like · Comment · Share keep hit 40, glyph 24, gap 8.
// Mute is inserted above Like: glyph 20, same 40 hit. The column is not redrawn.
// docs/design-locks/social-home-post-actions-align-lock-v1.md
// docs/design-locks/stories-viewer-mute-control-lock-v1.md
export const SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS =
  `pointer-events-auto absolute right-[var(--space-2)] z-20 flex flex-col items-center gap-[var(--space-2)] bottom-[max(var(--space-4),env(safe-area-inset-bottom))] ${HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS}`;

// Scrim ~40% → 0 over 120. Right pad clears the 40 hit plus the gap.
// Phone bottom clears the overlay dock so the caption stays on the video.
export const SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS =
  `pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-[var(--space-2)] bg-[linear-gradient(to_top,rgb(0_0_0/0.4),rgb(0_0_0/0)_120px)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] pl-[var(--space-4)] pr-[calc(var(--space-4)+40px+var(--space-2))] pt-[var(--space-4)] ${HOUSE_PHONE_DOCK_CHROME_PB_CLASS}`;

export const SOCIAL_EXPLORE_FOR_YOU_SEARCH_CLASS =
  "absolute inset-x-[var(--space-4)] top-[max(var(--space-4),env(safe-area-inset-top))] z-30";

export const SOCIAL_EXPLORE_FOR_YOU_DISCOVER_CLASS =
  "absolute inset-x-[var(--space-4)] top-[calc(max(var(--space-4),env(safe-area-inset-top))+3rem)] z-30 flex max-h-[50%] flex-col gap-[var(--space-2)] overflow-y-auto";

// The under-post time line and the Option A gutter moved into the H
// block (H · Posts): the time sits in the credit row, the wall is 24 /
// 48. docs/design-locks/social-feed-register-lock-v1.md §7

// Comment thread — house app-sheet rise. Same host/scrim as Create.
// Composer stays at the bottom. Do not fork a second sheet grammar.
export const SOCIAL_COMMENT_SHEET_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col justify-end md:hidden";

export const SOCIAL_COMMENT_SHEET_SURFACE_CLASS =
  "relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-[16px] bg-surface p-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] app-sheet-rise";

export const SOCIAL_COMMENT_SHEET_SCRIM_CLASS =
  "absolute inset-0 bg-ink/40 app-sheet-scrim-fade";

export const SOCIAL_COMMENT_COMPOSER_CLASS =
  "flex items-end gap-2 border-t border-hairline bg-surface px-4 py-3";

export const SOCIAL_ACTIVITY_PILLS_CLASS = HOUSE_SCROLL_ROW_CLASS;

export const SOCIAL_ACTIVITY_COMMENT_SNIPPET_CLASS =
  "break-words whitespace-pre-wrap t-body-sm text-ink";

export const SOCIAL_CREATE_CTA_CLASS =
  "inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-accent px-4 py-3 t-body font-semibold text-accent-contrast";

// Topic/Profession chip box. Same hit as the Home topic rail
// (SOCIAL_CHIP_HIT_CLASS). Width hugs the label. Display stays
// surface fill. Edit select composes idle outline + HOUSE_PILL_SELECTED_CLASS.
export const SOCIAL_TOPIC_CHIP_MEASURE_CLASS = `w-fit ${SOCIAL_CHIP_HIT_CLASS}`;

export const SOCIAL_TOPIC_CHIP_CLASS =
  `${SOCIAL_TOPIC_CHIP_MEASURE_CLASS} ${HOUSE_FILTER_OFF_CLASS}`;

export const SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS =
  `${SOCIAL_TOPIC_CHIP_MEASURE_CLASS} max-w-full border border-hairline bg-surface text-ink`;

export const SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS =
  `${SOCIAL_TOPIC_CHIP_MEASURE_CLASS} max-w-full ${HOUSE_PILL_SELECTED_CLASS}`;

export const SOCIAL_TOPIC_CHIP_BANK_CLASS = "flex flex-wrap gap-2";

// Shared Professions / Topics select face. Selected band + count →
// helper → search → grouped banks with section air. Sentence-case
// group labels — never t-label ALL-CAPS. Roles and Topics consume
// this grammar; do not fork a lookalike.
export const SOCIAL_PROFILE_CHIP_FACE_CLASS = "flex flex-col gap-[var(--space-6)]";
export const SOCIAL_PROFILE_CHIP_BAND_CLASS = "flex flex-col gap-[var(--space-3)]";
export const SOCIAL_PROFILE_CHIP_COUNT_CLASS = "t-body-sm text-ink-2";
export const SOCIAL_PROFILE_CHIP_HELP_CLASS = SETTINGS_DIALOG_HELP_CLASS;
export const SOCIAL_PROFILE_CHIP_GROUPS_CLASS = "flex flex-col gap-[var(--space-6)]";
export const SOCIAL_PROFILE_CHIP_GROUP_CLASS = "flex flex-col gap-[var(--space-3)]";
export const SOCIAL_PROFILE_CHIP_GROUP_LABEL_CLASS =
  "t-body-sm font-medium normal-case tracking-normal text-ink-2";

export function socialTopicChipSelectClass(selected: boolean): string {
  return selected ? SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS : SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS;
}

// Profile Stage — docs/design-locks/social-profile-stage-lock-v1.md
// (founder picks 2026-10-04: Layout "A · Stage"; cover frame "Frame once,
// phone area shown"). One SoT for own /social/profile and public
// /social/u/[handle], their skeleton, save-hop and loading overlay.
// Supersedes the header geometry of social-profile-header-linkedin-lock-v1
// (4:1 band, overlapping avatar, desktop card, edge-to-edge phone head);
// its editor and storage rules stay. Tokens only. Never truncate.
//
// Stage = the hero wrapper. It is the `hero` container the overlay steps
// read, and the group the cover editor switches. Steps by hero width (the
// numbers live in SOCIAL_PROFILE_STAGE_HERO): tight, desktop below 28rem
// (the 388 column at 1024 beside For You) — avatar 48, pad 16, name 28;
// compact, the phone sizes — avatar 64, name 28, handle 13, pad 20; large
// from 40rem — avatar 80, name 56, handle 15, pad 28. Each step keeps a
// two-line name inside 16:7 at the narrowest hero it serves.
// It does not clip, so the Edit cover menu can drop past a short hero.
// Phone: the card sits 12 from the screen (the frame gutter is 16, so it
// pulls 4 out of it, top included).
// Stretched, not w-full, so the phone pull widens it on both sides.
export const SOCIAL_PROFILE_STAGE_CLASS =
  "@container/hero group/hero relative min-w-0 max-md:-mx-1 max-md:-mt-1";

// The frame aspect, shared by the hero card and its cover layer. 16:7 at
// every desktop width (= editor frame = crop). Portrait phones get the
// 61:55 card (mockup 366×330), which shows the centred phone-safe part of
// the same crop; from 30rem of viewport (landscape phones, small tablets)
// the card is the 16:7 frame, so it never outgrows a landscape screen.
// While the cover editor is open the card is the 16:7 frame everywhere.
const socialProfileFrameAspectClass =
  "aspect-[61/55] min-[30rem]:aspect-[16/7] group-has-[[data-social-cover-drag]]/hero:aspect-[16/7]";

// Hero card. --radius-xl corners, --band fill, so with no cover the name
// still sits on band. overflow-clip, not hidden: the card is not a scroll
// container, so a name too long for the frame grows the card instead of
// being cut; the cover keeps its own frame box at the top.
export const SOCIAL_PROFILE_HERO_CLASS =
  `relative isolate flex min-w-0 w-full flex-col justify-end overflow-clip rounded-[var(--radius-xl)] bg-band ${socialProfileFrameAspectClass}`;

// The cover layer under the identity: its own frame box at the top of the
// card, never the card's content height, so the saved crop always shows
// exactly as framed (frame once). A taller card (a name of three or more
// lines) shows the --band fill below it. A failed load shows the band.
export const SOCIAL_PROFILE_COVER_CLASS =
  `absolute inset-x-0 top-0 overflow-hidden ${socialProfileFrameAspectClass}`;

export const SOCIAL_PROFILE_COVER_IMAGE_CLASS = "absolute inset-0 size-full object-cover";

// Identity over the cover, bottom-left, in band-ink. Hidden while the
// cover editor is open: the drag surface shows the photo alone, at full
// opacity, with the phone outline.
export const SOCIAL_PROFILE_HEAD_CLASS =
  "relative z-10 flex min-w-0 w-full flex-col text-band-ink group-has-[[data-social-cover-drag]]/hero:hidden";

// Scrim, built from the --band token. The avatar row (12 of photo above
// the avatar, then the avatar) eases from band/75 at the avatar's foot to
// clear at the row's top on a smoothstep curve, so there is no edge where
// it meets the name stack; the name stack sits on a solid band/75. Name and
// handle keep at least 4.5:1 on any photo, white included, in both themes
// (checked in headless Chromium). pt-3 is the least photo above the avatar
// (SOCIAL_PROFILE_STAGE_HERO.topGapPx): a name too long for the frame grows
// the hero instead of pushing the avatar to its edge.
export const SOCIAL_PROFILE_AVATAR_ROW_CLASS =
  "flex min-w-0 w-full items-end bg-[linear-gradient(to_top,color-mix(in_oklab,var(--band)_75%,transparent),color-mix(in_oklab,var(--band)_67%,transparent)_20%,color-mix(in_oklab,var(--band)_49%,transparent)_40%,color-mix(in_oklab,var(--band)_26%,transparent)_60%,color-mix(in_oklab,var(--band)_8%,transparent)_80%,transparent)] px-5 pt-3 md:@max-[28rem]/hero:px-4 @min-[40rem]/hero:px-7";

export const SOCIAL_PROFILE_AVATAR_SLOT_CLASS = "relative w-fit shrink-0";

// Avatar on the cover: 64, 48 at the tight step, 80 at the large step; a
// 3px --band-ink ring. A live-story ring sits straight outside it.
export const SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS =
  "size-16 border-[3px] border-band-ink text-[length:var(--text-lg)] ring-offset-0 md:@max-[28rem]/hero:size-12 @min-[40rem]/hero:size-20";

// Owner avatar edit badge. 28 → 32, 44+ hit (after:-inset-2). Focus shows
// on any photo: the house accent outline plus a band-ink ring.
export const SOCIAL_PROFILE_AVATAR_EDIT_CLASS =
  "absolute bottom-0 right-0 z-10 flex size-7 items-center justify-center rounded-full border border-hairline bg-surface text-ink after:absolute after:-inset-2 after:content-[''] focus-visible:rounded-full! focus-visible:ring-2 focus-visible:ring-band-ink @min-[40rem]/hero:size-8";

// Name and handle on the solid scrim. Gap avatar → name 12 (tight 8, large
// 16), name → handle 4 (large 8). Name: house title (28/480/-0.028em), house
// hero size (56/480, --tracking-display, leading 1) at the large step.
// Handle 13 → 15 in band-ink at 84%. Both wrap; never truncate.
export const SOCIAL_PROFILE_NAME_STACK_CLASS =
  "flex min-w-0 w-full flex-col gap-1 bg-band/75 px-5 pb-5 pt-3 md:@max-[28rem]/hero:px-4 md:@max-[28rem]/hero:pb-4 md:@max-[28rem]/hero:pt-2 @min-[40rem]/hero:gap-2 @min-[40rem]/hero:px-7 @min-[40rem]/hero:pb-7 @min-[40rem]/hero:pt-4";

export const SOCIAL_PROFILE_NAME_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} t-title text-band-ink @min-[40rem]/hero:text-[length:var(--text-hero)] @min-[40rem]/hero:leading-none @min-[40rem]/hero:tracking-display`;

export const SOCIAL_PROFILE_HANDLE_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} text-[length:var(--text-xs)] leading-snug text-band-ink/84 @min-[40rem]/hero:text-[length:var(--text-sm)]`;

// Owner Edit cover: glass over the photo (--surface at 86%, backdrop blur,
// hairline), 16 from the desktop corner, 12 on phone. Desktop: pencil and
// the existing label, 36 tall. Phone: a 36 pencil circle, the label
// sr-only. 44 hit either way. The anchor sits on the stage, outside the
// hero's clip, so the menu can drop below a short hero.
export const SOCIAL_PROFILE_COVER_PILL_ANCHOR_CLASS = "absolute right-3 top-3 z-20 md:right-4 md:top-4";

export const SOCIAL_PROFILE_COVER_EDIT_CLASS =
  "relative flex size-9 items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface/86 text-ink backdrop-blur-[16px] hover:bg-surface disabled:opacity-60 after:absolute after:-inset-1 after:content-[''] focus-visible:rounded-full! focus-visible:ring-2 focus-visible:ring-band-ink md:w-auto md:pl-3 md:pr-3.5 md:text-[length:var(--text-xs)] md:font-medium";

export const SOCIAL_PROFILE_COVER_EDIT_LABEL_CLASS = "max-md:sr-only";

export const SOCIAL_PROFILE_COVER_MENU_CLASS =
  "absolute right-0 top-[calc(100%+4px)] z-20 flex min-w-[200px] flex-col rounded-[8px] border border-hairline bg-surface py-1";

export const SOCIAL_PROFILE_COVER_MENU_ITEM_CLASS =
  "flex w-full items-center gap-3 px-3 py-2 text-left t-body-sm text-ink hover:bg-surface-muted";

// Reposition drag surface = the 16:7 frame, over the hero at every width.
// bg-band (near-black in both themes) hides the old cover and matches the
// JPEG's black under transparent pixels. One grid cell holds the preview
// and the phone outline, both in flow: a browser paints an element's own
// outline before its positioned descendants, so nothing positioned may sit
// inside or it would cover the inset focus ring. The `!` focus forms beat
// the unlayered global :focus-visible rule. overflow-hidden clips a zoomed
// preview to the frame; touch-none keeps two-finger pinch in the editor
// instead of zooming the page. The grid tracks are minmax(0, 1fr), so a
// zoomed preview wider than the frame never grows the cell.
export const SOCIAL_PROFILE_COVER_DRAG_CLASS =
  "absolute inset-0 z-30 grid grid-cols-1 grid-rows-1 overflow-hidden rounded-[var(--radius-xl)] bg-band touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]! focus-visible:rounded-[var(--radius-xl)]! data-[slack]:cursor-grab data-[slack]:active:cursor-grabbing";

// The editor preview inside the drag surface. In flow, never positioned:
// a browser paints an element's own outline before its positioned
// descendants, so an absolute image would cover the surface's inset focus
// ring. The grid cell (the 16:7 frame) gives size-full a definite box until
// the original decodes; then coverPreviewBox sizes and offsets it with
// percentage width, height and margins, which resolve against the cell.
// max-w-none lifts the preflight img max-width so a zoomed box can be wider
// than the frame; self-start and justify-self-start pin the box to the
// cell's top-left so the margins alone place it.
export const SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS =
  "block size-full max-w-none object-cover self-start justify-self-start [grid-area:1/1]";

// Phone-safe outline: the centred, full-height part of the frame phones
// show. Its box is set inline from coverPhoneSafeRegion, the one function
// the phone hero's geometry is tested against. Frame space, not image
// space, so it stays put at every zoom. In flow in the same grid cell, so
// it never covers the focus ring. Nothing outside it is dimmed: desktop
// shows the whole frame. A dashed band-ink line with a band hairline reads
// on any photo.
export const SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS =
  "pointer-events-none flex flex-col items-start self-start justify-self-start border-2 border-dashed border-band-ink outline outline-1 outline-band/60 [grid-area:1/1]";

export const SOCIAL_PROFILE_COVER_PHONE_LABEL_CLASS =
  "m-2 rounded-full bg-band/75 px-2 py-0.5 text-[length:var(--text-xs)] font-medium text-band-ink";

// Owner trail under the hero: the cover editor's hint, Zoom slider,
// Cancel/Save and errors, and the inline avatar crop, portal here. Never
// over the image. Empty (hidden) unless one of them is showing.
export const SOCIAL_PROFILE_HEAD_TRAIL_CLASS =
  "mt-3 flex min-w-0 flex-col gap-[var(--space-2)] empty:hidden";

// Zoom slider in the trail, above Cancel/Save. Visible label; the range is
// 44px tall so the thumb is a full touch target on phone.
export const SOCIAL_PROFILE_COVER_ZOOM_CLASS =
  "pointer-events-auto flex w-full items-center justify-end gap-[var(--space-3)] t-body-sm text-ink-2";

export const SOCIAL_PROFILE_COVER_ZOOM_INPUT_CLASS =
  "h-11 min-w-0 flex-1 md:max-w-[240px] cursor-pointer accent-accent disabled:cursor-default disabled:opacity-60";

// Editor copy in the trail.
export const SOCIAL_PROFILE_COVER_TRAIL_TEXT_CLASS =
  "text-right break-words t-body-sm text-ink-2";

export const SOCIAL_PROFILE_COVER_TRAIL_ACTIONS_CLASS =
  "flex flex-wrap justify-end gap-[var(--space-2)]";

// Merged over SOCIAL_ACTION_CLASS / SOCIAL_ACTION_SECONDARY_CLASS with cn
// so Cancel and Save fit the narrow phone trail.
export const SOCIAL_PROFILE_COVER_TRAIL_BUTTON_CLASS = "px-[var(--space-4)] disabled:opacity-60";

// Errors show in any mode (a failed Remove too), in the trail, not sr-only.
export const SOCIAL_PROFILE_COVER_TRAIL_NOTICE_CLASS = "min-w-0";

// Identity root: stage, owner trail, then the face below the hero. No
// card: the face sits on the page canvas. It is the `profile` container
// the face reads for its two-column step.
export const SOCIAL_PROFILE_IDENTITY_CLASS = "@container/profile flex min-w-0 w-full flex-col";

// Below the hero. Phone: one column in DOM order — intro, actions, stats
// strip, mutuals, roles, links. Desktop, once the column is 35rem wide: a
// two-column grid — intro, stats, mutuals and links on the left, the
// action pills on the right, roles across the bottom. Narrower desktop
// columns (768 with the rail open, 1024 and 1180 beside For You) keep the
// one-column order so the intro is never squeezed beside the pills. Rows
// are explicit and the grid has no row gap, so an absent item leaves no
// gap; each item carries its own top margin.
export const SOCIAL_PROFILE_FACE_CLASS =
  "flex min-w-0 w-full flex-col pt-3.5 md:pt-5 md:@min-[35rem]/profile:grid md:@min-[35rem]/profile:grid-cols-[minmax(0,1fr)_auto] md:@min-[35rem]/profile:items-start md:@min-[35rem]/profile:gap-x-6";

// Headline (bio first line) 17 → 20 at 480; tagline 15 ink-2.
export const SOCIAL_PROFILE_INTRO_CLASS =
  "flex min-w-0 flex-col gap-0.5 md:gap-1 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-1";

export const SOCIAL_PROFILE_HEADLINE_CLASS =
  `${HOUSE_PHONE_WRAP_CLASS} text-[length:var(--text-base)] leading-snug [font-weight:var(--type-title-weight)] tracking-tight text-ink md:text-[length:var(--text-lg)]`;

export const SOCIAL_PROFILE_TAGLINE_CLASS =
  "min-w-0 max-w-full break-words whitespace-pre-wrap t-body-sm text-ink-2";

// Action pills. Phone: one row, every action stretches. Desktop: pills
// hug their labels; in the two-column step they are the right column.
export const SOCIAL_PROFILE_ACTIONS_CLASS =
  "mt-3.5 flex w-full min-w-0 items-start gap-2 max-md:*:flex-1 md:@min-[35rem]/profile:col-start-2 md:@min-[35rem]/profile:row-span-4 md:@min-[35rem]/profile:row-start-1 md:@min-[35rem]/profile:mt-0 md:@min-[35rem]/profile:w-auto md:@min-[35rem]/profile:shrink-0";

// Primary (Edit profile, Follow): accent pill, 44. Secondary (Share
// profile, Following): hairline pill on the page. Labels wrap.
export const SOCIAL_PROFILE_ACTION_PILL_CLASS =
  "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full bg-accent px-5.5 py-2 text-center t-body-sm font-medium text-accent-contrast focus-visible:rounded-full!";

export const SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS =
  "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-hairline bg-surface px-5 py-2 text-center t-body-sm font-medium text-ink hover:bg-surface-muted focus-visible:rounded-full!";

// Stats. Desktop: one inline row at 15 — value ink 600 tabular, label
// ink-2, 20 apart. Phone: a surface-muted strip (radius 16) of three cells
// with hairline dividers, value 20/480 over a 13 label. Followers and
// following stay links.
export const SOCIAL_PROFILE_STATS_CLASS =
  "mt-2.5 w-full min-w-0 md:mt-3 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-2";

export const SOCIAL_PROFILE_STATS_GRID_CLASS =
  "grid w-full min-w-0 grid-cols-3 rounded-[var(--radius-lg)] bg-surface-muted md:flex md:flex-wrap md:items-baseline md:gap-x-5 md:gap-y-1 md:rounded-none md:bg-transparent";

export const SOCIAL_PROFILE_STAT_CLASS =
  "flex min-w-0 flex-col items-start border-l border-hairline px-3.5 py-2.5 text-left first:border-l-0 md:flex-row md:items-baseline md:gap-1 md:border-l-0 md:p-0";

export const SOCIAL_PROFILE_STAT_VALUE_CLASS =
  "t-data text-[length:var(--text-lg)] [font-weight:var(--type-title-weight)] text-ink md:text-[length:var(--text-sm)] md:font-semibold";

export const SOCIAL_PROFILE_STAT_LABEL_CLASS =
  "break-words text-[length:var(--text-xs)] text-ink-2 md:text-[length:var(--text-sm)]";

export const SOCIAL_PROFILE_MUTUALS_CLASS =
  "mt-2.5 flex min-w-0 items-center gap-2 md:mt-3 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-3";

// Links: found, never the focus (founder 2026-10-04). A quiet row, never a
// panel or a list: a website shows its host as 13 text beside a 14 globe;
// socials are icon-only hits in ink-3, 32 on desktop and 44 on phone
// (touch floor). Every public link is on the face; the row wraps.
export const SOCIAL_PROFILE_LINKS_CLASS =
  "-ml-1.5 mt-1 flex min-w-0 flex-wrap items-center gap-0.5 md:mt-2 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-4";

export const SOCIAL_PROFILE_LINK_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[8px] text-ink-3 hover:text-ink md:size-8";

export const SOCIAL_PROFILE_LINK_TEXT_CLASS =
  "inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-[8px] px-1.5 break-words text-[length:var(--text-xs)] text-ink-2 hover:text-ink md:min-h-8";

// Links sheet keeps readable host labels in a column. Not the face row.
export const SOCIAL_PROFILE_LINKS_SHEET_CLASS =
  "flex min-w-0 flex-col items-start gap-[var(--space-3)]";
export const SOCIAL_PROFILE_LINKS_SHEET_LINK_CLASS =
  "min-w-0 break-words t-body-sm text-ink-2 hover:text-ink";

// Roles as chips: 32 phone / 36 desktop, surface-muted, label 13/500.
// Every selected role, A→Z; the row wraps, never a sideways scroll and
// never +N. Plain chips: the codebase maps no icons to roles.
export const SOCIAL_PROFILE_ROLES_CLASS =
  "mt-2.5 flex min-w-0 flex-wrap gap-1.5 md:mt-4 md:gap-2 md:@min-[35rem]/profile:col-span-2 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-5";

export const SOCIAL_PROFILE_ROLE_PILL_CLASS =
  "inline-flex min-h-8 max-w-full items-center rounded-full bg-surface-muted px-3 py-1 break-words text-[length:var(--text-xs)] font-medium leading-snug text-ink md:min-h-9 md:px-3.5";

// ---------------------------------------------------------------------
// H · Feed (founder 2026-10-05, approving the H boards: "I like the
// designs. Let's use them."). The look is the H register (the primary
// pill slider, secondary chips, round grey controls, soft grey cards);
// the layout and media stay G's (stories, composer, the Reels row every 3
// posts). Tokens only; the board's hexes map to existing tokens.
// docs/design-locks/social-feed-register-lock-v1.md
// ---------------------------------------------------------------------

// Feed placement (founder 2026-10-07: "Measure and make sure our feed is
// in the identical placement with the identical width as the Facebook
// feed."). Facebook at 1440: the feed column is 680 wide, x 380 to 1060,
// centred on the viewport; its right column hugs the window's edge; the
// first card starts 16 under the bar. Supersedes H's 600 column and the
// end-aligned 944 pair from xl.
//
// Grid: feed column 680, gap 48, For you rail 296 (pair 1024). /social
// only. Desktop (md and up): the column fills a narrower frame and caps at
// 680; it is centred on the viewport, with the side menu open (240) or
// collapsed (80). Its lead space inside the frame (the feed container,
// 100%) is (100% - 680 - --sidebar-width - --chrome-gutter +
// --shell-gutter-inline-end) / 2, never below 0, so the column never
// slides under the side menu. The rail keeps its trailing edge on the
// shell gutter (the avatar's line, ml-auto) and shows only when the
// container fits the pair (1024, @container/feed); there the lead also
// stops at 100% - 1024, so the column keeps 680 and moves left just enough
// to keep the 48. Below 1024 the rail is display:none and the column stays
// centred. The lead reads the container, not whether the rail is drawn, so
// the column does not move between Following and For you. Phone: the full
// frame, unchanged. Desktop top: 8 under the shared header inset (8), so
// the stories card and the rail's heading start 16 under the header, as
// Facebook's first card does under its bar (no slider over the Feed,
// founder 2026-10-08).
// Complete class strings — Tailwind does not see interpolations.
// docs/design-locks/social-feed-cards-lock-v1.md §8
export const SOCIAL_FEED_MEASURE = { center: 680, gutter: 48, right: 296 } as const;
export const SOCIAL_FEED_PAIR_WIDTH =
  SOCIAL_FEED_MEASURE.center + SOCIAL_FEED_MEASURE.gutter + SOCIAL_FEED_MEASURE.right;
export const SOCIAL_FEED_LAYOUT_CLASS = "@container/feed flex w-full items-start gap-12 md:pt-2";
// The column's lead space (above). Below 1024: centred, clamped at 0.
// From 1024 (the rail fits): also at most 100% - 1024.
export const SOCIAL_FEED_LEAD_CLASS =
  "md:@max-[1024px]/feed:ml-[max(0px,calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2))] md:@min-[1024px]/feed:ml-[max(0px,min(calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2),calc(100%-1024px)))]";
export const SOCIAL_FEED_CENTER_CLASS =
  `flex min-w-0 w-full flex-1 flex-col md:max-w-[680px] ${SOCIAL_FEED_LEAD_CLASS}`;
export const SOCIAL_FEED_ASIDE_CLASS = "hidden w-[296px] shrink-0 flex-col ml-auto @min-[1024px]/feed:flex";

// The post page (/social/p/[id]): Back, the title and the post card in
// the Feed's column (cards lock open choice 3, default "match the Feed"):
// 680, centred on the viewport by the Feed's own centring, never below 0.
// It has no rail, so the Feed's move-left (which only keeps 48 to a drawn
// rail) does not apply: where the Feed shifts for its rail (a 1312 to 1431
// viewport with the side menu open, 1152 to 1431 collapsed) this column
// stays centred; at every other width it sits where the Feed's does. Its
// wrapper is a plain row (the % resolves against it, as the Feed's against
// its row); its top stays the shared header inset.
export const SOCIAL_POST_PAGE_LAYOUT_CLASS = "flex w-full items-start";
export const SOCIAL_POST_PAGE_LEAD_CLASS =
  "md:ml-[max(0px,calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2))]";
export const SOCIAL_POST_PAGE_CLASS =
  `flex w-full min-w-0 flex-col gap-[var(--space-4)] pb-[var(--space-12)] md:max-w-[680px] ${SOCIAL_POST_PAGE_LEAD_CLASS}`;

// The board's quiet ink is the house ink-3 in light and the house ink-2
// in dark: the house dark ink-3 is 3.9:1 on the dark page and fails AA
// for 13–20px labels, so quiet feed labels take ink-2 in dark. Existing
// tokens only; no new colour.
export const SOCIAL_FEED_QUIET_INK_CLASS = "text-ink-3 dark:text-ink-2";

// Feed headings ("Reels", "For you"): 20 / 480 / -0.02em, line 1.4, ink,
// normal case. Supersedes G's 13px uppercase eyebrow.
export const SOCIAL_FEED_HEADING_CLASS =
  "m-0 text-[length:var(--text-lg)] leading-[1.4] [font-weight:var(--type-title-weight)] tracking-[-0.02em] text-ink";

// Topics: secondary chips (H §3.2). All first, then the 15 topics A to
// Z. Idle: no fill, 15 / 500 ink-2 (cards lock, lighter ink). Current:
// the accent wash with accent-ink 15 / 500 and aria-current. A chip whose
// end passes under the fade hides until the row scrolls it clear
// (socialRowItemUnderFade): no word is ever drawn cut under the fade.
// Chips sit on the white canvas, not on a card. Desktop chips are 40 tall, pad
// 16, gap 4. Phone: a 44 hit holding a 36 pill (pad 14); the row meets
// the viewport and pads 16. Labels never truncate; the row scrolls
// sideways. A 96 page-colour fade over the trailing edge holds a round
// grey "More topics" (desktop 40; none on phone) that scrolls the
// row on; both leave at the end of the row. Supersedes G's plain words
// over an ink underline. Stack: 24 under the composer, 16 above the wall.
// Keyboard: the track's inline-end scroll padding equals the fade width
// (96), so a focused chip scrolls clear of the fade and More topics (the
// row's keyboard focus handler reads this padding: Chromium alone leaves
// a chip that sits whole inside the track under the fade). The track
// pads 5 top and bottom and takes it back in margin: the focus ring
// (2 + 3 offset) draws whole inside the scrollport and the row keeps its
// 44 / 40 height.
// Phone (Adam 2026-10-08, shell-phone-workspace-band-lock-v1, "remove
// the arrow and let the rows slide"): no fade, no More topics, and no
// chip hides — the row slides, and a chip cut at the screen edge is the
// scroll cue, the same rule as the workspace band. Desktop keeps the fade
// and More topics (a mouse wheel does not scroll sideways).
export const SOCIAL_HOME_TOPIC_ROW_CLASS =
  "relative mt-4 min-w-0 max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]";
export const SOCIAL_HOME_TOPIC_TRACK_CLASS =
  "no-scrollbar -my-[5px] flex gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap py-[5px] md:scroll-pe-24 max-md:px-4";
// The hit: 44 on phone, 40 on desktop (where the hit is the pill).
const SOCIAL_HOME_TOPIC_BASE_CLASS =
  "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full md:h-10";
export const SOCIAL_HOME_TOPIC_CLASS = `${SOCIAL_HOME_TOPIC_BASE_CLASS} text-ink-2`;
export const SOCIAL_HOME_TOPIC_CURRENT_CLASS = `${SOCIAL_HOME_TOPIC_BASE_CLASS} text-accent-ink`;
export function socialHomeTopicClass(current: boolean): string {
  return current ? SOCIAL_HOME_TOPIC_CURRENT_CLASS : SOCIAL_HOME_TOPIC_CLASS;
}
// The chip face: a 36 pill on phone (inside the 44 hit), 40 on desktop.
const SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS =
  "inline-flex h-9 items-center rounded-full px-3.5 text-[length:var(--text-sm)] leading-none md:h-10 md:px-4";
export const SOCIAL_HOME_TOPIC_CHIP_CLASS = `${SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS} font-medium`;
export const SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS =
  `${SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS} bg-accent-wash font-medium`;
export function socialHomeTopicChipClass(current: boolean): string {
  return current ? SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS : SOCIAL_HOME_TOPIC_CHIP_CLASS;
}
// A chip under the fade: not drawn and not a pointer target (a keyboard
// still reaches it; the focus handler scrolls it clear and it shows).
// Desktop only: on phone there is no fade, so no chip hides.
export const SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS = "md:pointer-events-none md:opacity-0";
// The fade's width (w-24) and the track's inline-end scroll padding
// (md:scroll-pe-24): 96. Desktop only (max-md:hidden).
export const SOCIAL_HOME_TOPIC_FADE_PX = 96;
export const SOCIAL_HOME_TOPIC_FADE_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-[linear-gradient(90deg,transparent,var(--bg)_55%)] max-md:hidden";
export const SOCIAL_HOME_TOPIC_MORE_CLASS =
  "pointer-events-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-hairline md:size-10";

// Stories: the locked story cards (H §5.2; the stories card lock's
// geometry). 112×200 desktop / 108×192 phone (about 9:16), radius 16, gap 8,
// no border. The cover fills the card; top-left 8 the author's 36 (phone
// 32) avatar in a 2px ring with a 2px inner pad (accent unseen, hairline
// seen); the name ("Elena R.") on the picture in a 48 band scrim (the
// band at 72%), 13 / 500 band-ink, inset 8, wrapping, never cut. Create
// story first: the member's photo in the upper 120, the plate (the
// in-card fill) under it with "Create story" 13 / 500 ink near the
// bottom, and a 40 (phone 36) accent circle with the plus, ringed 3 in
// the plate's fill, on the seam. Supersedes G's 56×100 tiles with names
// under them.
// Cards lock (founder 2026-10-06, "Stories have to stay at the top of
// the feed"): the rail is the Feed's first module, in its own card,
// always drawn in both lanes, also when its one tile is the member's
// own Create story. The tiles sit 8 in from the card (radius 16 inside
// 24, concentric, as the media); the track runs to the card's edge, so a
// tile scrolls under the card's rounded clip, and pads 8 at rest. The
// track pads 5 top and bottom (taken back in margin) so a tile's focus
// ring draws whole. It leads the column with no top margin: the 16 it
// kept under the Following / For you slider went with the slider
// (founder 2026-10-08), so the card starts where the slider did, 16 under
// the bar or header (Feed placement, cards lock §8).
export const SOCIAL_HOME_STORIES_CARD_CLASS = `overflow-hidden py-2 ${SOCIAL_FEED_CARD_CLASS}`;
export const SOCIAL_HOME_STORIES_RAIL_CLASS =
  "no-scrollbar -my-[5px] flex gap-2 overflow-x-auto overscroll-x-contain px-2 py-[5px] scroll-px-2";
export const SOCIAL_HOME_STORY_CARD_CLASS =
  `relative block h-[192px] w-[108px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] ${SOCIAL_IN_CARD_FILL_CLASS} md:h-[200px] md:w-[112px]`;
export const SOCIAL_HOME_STORY_MEDIA_CLASS = `absolute inset-0 ${SOCIAL_IN_CARD_FILL_CLASS}`;
const SOCIAL_HOME_STORY_FACE_RING_BASE_CLASS =
  "absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border-2 p-[2px] md:size-9";
export const SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS = `${SOCIAL_HOME_STORY_FACE_RING_BASE_CLASS} border-accent`;
export const SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS = `${SOCIAL_HOME_STORY_FACE_RING_BASE_CLASS} border-hairline`;
export function socialHomeStoryFaceRingClass(unseen: boolean): string {
  return unseen ? SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS : SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS;
}
export const SOCIAL_HOME_STORY_FACE_CLASS = "size-full";
export const SOCIAL_HOME_STORY_NAME_CLASS =
  "absolute inset-x-0 bottom-0 z-10 flex min-h-12 items-end bg-linear-to-t from-band/72 to-band/0 px-2 pb-2 text-left text-[length:var(--text-xs)] font-medium leading-tight text-band-ink break-words [overflow-wrap:anywhere]";
export const SOCIAL_HOME_STORY_CREATE_FACE_CLASS =
  "absolute inset-x-0 top-0 h-[120px] overflow-hidden bg-surface-muted";
export const SOCIAL_HOME_STORY_PLUS_CLASS =
  `absolute left-1/2 top-[99px] z-10 grid size-[42px] -translate-x-1/2 place-items-center rounded-full border-[3px] ${SOCIAL_IN_CARD_EDGE_CLASS} bg-accent text-accent-contrast md:top-[97px] md:size-[46px]`;
export const SOCIAL_HOME_STORY_CREATE_LABEL_CLASS =
  "absolute inset-x-0 bottom-3 px-2 text-center text-[length:var(--text-xs)] font-medium leading-[18px] text-ink break-words";

// Reels row (H §5.4). After every 3 posts in the post wall (lib plan,
// unchanged). Head 44: "Reels" as a 20 / 480 heading; on desktop two
// round 44 arrows on the in-card fill, 8 apart (Previous at 40% at the
// start). Tiles 9:16, desktop 180×320 / phone 160×284, radius 16, gap 8,
// 16 under the head (phone 12); the arrows page by two tiles (376).
// Cards lock: the row is one card (pad 12 top, 16 bottom); the head and
// the track pad 16 inside it and the track runs to the card's edge, so a
// tile scrolls under the card's rounded clip. Desktop: 3 tiles and a
// peek. Phone: the card meets the viewport, scroll-snap, no arrows;
// vertical pans pass through to the page. Air: the wall gutter (8 phone,
// 16 desktop). Stills only. Supersedes G's 30 head with a 13px eyebrow,
// the hairline 30 arrows, radius 10 and gap 12.
export const SOCIAL_FEED_REELS_CLASS = `overflow-hidden pt-3 pb-4 ${SOCIAL_FEED_CARD_CLASS}`;
export const SOCIAL_FEED_REELS_HEAD_CLASS = "flex h-11 items-center justify-between px-4";
export const SOCIAL_FEED_REELS_ARROWS_CLASS = "hidden gap-2 md:flex";
const SOCIAL_FEED_REELS_ARROW_BASE_CLASS =
  `grid size-11 place-items-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink`;
export const SOCIAL_FEED_REELS_ARROW_CLASS =
  `${SOCIAL_FEED_REELS_ARROW_BASE_CLASS} transition-colors hover:bg-hairline`;
export const SOCIAL_FEED_REELS_ARROW_OFF_CLASS =
  `${SOCIAL_FEED_REELS_ARROW_BASE_CLASS} cursor-default opacity-40`;
export function socialFeedReelsArrowClass(disabled: boolean): string {
  return disabled ? SOCIAL_FEED_REELS_ARROW_OFF_CLASS : SOCIAL_FEED_REELS_ARROW_CLASS;
}
// The track pads 5 top and bottom so a tile's focus ring (2 + 3 offset)
// draws whole inside the scrollport; mt 7 / 11 + 5 keeps the tiles 12 /
// 16 under the head and -mb 5 keeps the row's height.
export const SOCIAL_FEED_REELS_TRACK_CLASS =
  "no-scrollbar m-0 mt-[7px] -mb-[5px] flex list-none gap-2 overflow-x-auto overscroll-x-contain px-4 py-[5px] scroll-pl-4 [touch-action:pan-x_pan-y] max-md:snap-x max-md:snap-mandatory md:mt-[11px]";
export const SOCIAL_FEED_REELS_ITEM_CLASS = "shrink-0 snap-start";
export const SOCIAL_FEED_REEL_TILE_CLASS =
  "relative block h-[284px] w-40 overflow-hidden rounded-[var(--radius-lg)] bg-band md:h-80 md:w-[180px]";
// Edge vignette on the still (the board's inset 60px darkening), drawn as
// a radial gradient: no shadow utility in Social chrome.
export const SOCIAL_FEED_REEL_VIGNETTE_CLASS =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0)_45%,rgb(0_0_0/0.45)_100%)]";
export const SOCIAL_FEED_REEL_SCRIM_CLASS =
  "absolute inset-x-0 bottom-0 block bg-linear-to-t from-band/94 via-band/78 via-50% to-band/0 px-2.5 pb-2.5 pt-10 md:px-3 md:pb-3 md:pt-12";
export const SOCIAL_FEED_REEL_AUTHOR_CLASS = "flex min-w-0 items-center gap-2";
export const SOCIAL_FEED_REEL_FACE_CLASS = "size-6 shrink-0 ring-[1.5px] ring-band-ink/70";
export const SOCIAL_FEED_REEL_NAME_CLASS =
  "min-w-0 break-words [overflow-wrap:anywhere] text-[length:var(--text-xs)] font-semibold leading-tight text-band-ink";
export const SOCIAL_FEED_REEL_CAPTION_CLASS =
  "mt-1.5 block break-words [overflow-wrap:anywhere] text-[length:var(--text-xs)] leading-[1.35] text-band-ink";

// The wall block under the topics: 8 under them on phone, 16 on desktop;
// notices (truncated stories / followees) sit at its head, the cards'
// gutter apart.
export const SOCIAL_FEED_WALL_CLASS = "mt-2 flex min-w-0 flex-col gap-2 md:mt-4 md:gap-4";

// For you rail (H §5.5; founder decision 5, "sure": "For you" stays the
// rail's heading; the Feed's slider is gone, founder 2026-10-08). The
// heading (20 / 480, 44 tall, level with the stories card that leads the
// Feed) on the canvas, 16, the latest course
// as one card (CourseCard "feature": the card fill, radius 24, pad 16, a
// 16:9 cover at radius 16, "Latest course · Education" 13 / 500 ink-2,
// the title 15 / 600), 16, then Suggested people as one card (pad 16,
// "Suggested people" 17 / 480, 8, 56 rows: 40 avatar, gap 12, with the 36
// Follow on the in-card fill). No hairlines, no border (cards lock).
export const SOCIAL_FEED_ASIDE_HEADING_CLASS = `${SOCIAL_FEED_HEADING_CLASS} flex h-11 items-center`;
export const SOCIAL_FEED_ASIDE_COURSE_CLASS = "mt-4 flex min-w-0 flex-col";
export const SOCIAL_FEED_ASIDE_SECTION_CLASS =
  `mt-4 flex flex-col rounded-[var(--radius-xl)] ${SOCIAL_CARD_FILL_CLASS} p-4 pb-2`;
export const SOCIAL_FEED_ASIDE_SUBHEAD_CLASS =
  "m-0 text-[length:var(--text-base)] leading-6 [font-weight:var(--type-title-weight)] text-ink";
export const SOCIAL_FEED_ASIDE_ROWS_CLASS = "-mx-3 mt-2 flex flex-col";
export const SOCIAL_FEED_ASIDE_ROW_CLASS =
  "flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-xl)] px-3";
export const SOCIAL_FEED_ASIDE_PERSON_CLASS = "gap-3";
export const SOCIAL_FEED_ASIDE_AVATAR_CLASS = "size-10";

// ---------------------------------------------------------------------
// Cards · posts (founder 2026-10-06: "the text only posts in the feed are
// not in a distinguished section/surface"; "notice how every single
// facebook post type is clearly in its own surface?"; Direction B, "B.").
// Every post kind (text, photo, swipe, landscape and vertical video,
// group, the optimistic post) is one card (SOCIAL_FEED_CARD_CLASS)
// everywhere SocialPostCard renders: the Feed in both lanes, Profile
// activity, a member's posts, a group, the permalink. Anatomy, header on
// top: the header (the 40 avatar, the name 15 / 600, the meta "2h ·
// Group" 13 / 420 ink-2, the owner ⋯), the words (15 / 420 body, desktop
// 17, never clamped), the media (inset 8 at radius 16, concentric with
// the card's 24; phone edge to edge), the actions (round 44 / desktop 40
// on the in-card fill, counts beside 15 / 420), then the permalink's
// comments. No screen and no "Video" band on a video. Supersedes register
// lock §7 ("the media is the card", the credit row under the media; G9,
// G11, G13; Assumption 9) and the text card of H §3.4.
// docs/design-locks/social-feed-cards-lock-v1.md
// ---------------------------------------------------------------------

/** How the post face draws: a photo (or a swipe of media), a video, or text only. */
export type SocialPostKind = "photo" | "video" | "text";

/** No media: text. One video: video. One still, or two or more items: photo (the frame). */
export function socialPostKind(media: readonly { kind: "image" | "video" }[]): SocialPostKind {
  if (media.length === 0) return "text";
  return media.length === 1 && media[0]?.kind === "video" ? "video" : "photo";
}

// Post wall: 8 of white between cards on phone, 16 on desktop. One list
// for the Feed, Profile activity, a member's posts and the permalink.
export const SOCIAL_FEED_GUTTER_CLASS = "flex flex-col gap-2 md:gap-4";

// Header: 16 in, 12 down (desktop 16). Phone: the avatar link is a 44
// hit (the 40 face, -2 each side so it keeps the 16 line) and the name
// and meta share one 44 row, wrapping; from md the name stacks over the
// meta beside the 40 face.
export const SOCIAL_POST_HEAD_CLASS = "flex min-w-0 items-center gap-3 px-4 pt-3 md:pt-4";
export const SOCIAL_POST_AUTHOR_CLASS =
  "flex shrink-0 items-center justify-center rounded-full max-md:-m-0.5 max-md:size-11";
export const SOCIAL_POST_BYLINE_CLASS =
  "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 md:flex-col md:items-start md:gap-0";
export const SOCIAL_POST_NAME_CLASS =
  "inline-flex min-h-11 min-w-0 items-center break-words text-[length:var(--text-sm)] font-semibold leading-5 text-ink md:min-h-0";
// The meta: "2h · Group" as one run, 13 / 420. ink-2: ink-3 on the grey
// card is 4.40:1 and fails AA.
export const SOCIAL_POST_META_CLASS =
  "flex min-w-0 flex-wrap items-center text-[length:var(--text-xs)] leading-[18px] [font-weight:var(--type-body-weight)] tabular-nums text-ink-2";
// The time (the permalink link): a 44 hit on phone with the text centred
// in it; the separator dot steps back into the hit's trailing pad so the
// run reads "2h · Group". Desktop hugs the text.
export const SOCIAL_POST_TIME_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0 md:justify-start";
export const SOCIAL_POST_META_DOT_CLASS = "px-1 max-md:-ml-2.5";
export const SOCIAL_POST_GROUP_CLASS =
  "inline-flex min-h-11 min-w-0 items-center break-words md:min-h-0";

// The words: a caption and a text-only body share one style. 15 / 420
// body, line 1.45; desktop 17 / 1.5. 12 under the header. Wraps; never
// clamped.
export const SOCIAL_POST_WORDS_CLASS =
  "whitespace-pre-wrap break-words px-4 pt-3 text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-body md:text-[length:var(--text-base)] md:leading-normal";
// The words' place when a post's media all dropped and it has no words
// (socialPostMediaAllDropped): one quiet line, the words' box at 15 / 420
// ink-2 on both devices (secondary text; ink-2 holds AA on the card).
export const SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS =
  "break-words px-4 pt-3 text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-ink-2";

// The media block: inset 8 at radius 16 inside the card (16 + 8 = the
// card's 24); phone edge to edge at radius 0. 12 under the words.
export const SOCIAL_POST_MEDIA_CLASS =
  "relative mx-2 mt-3 block overflow-hidden rounded-[var(--radius-lg)] max-md:mx-0 max-md:rounded-none";

// Actions: Like, Comment, Share, 8 apart, counts beside; the first round
// on the card's 16 line (the avatar's and the words' edge). 4 under the
// media (desktop 8), 8 above the card's end (desktop 12).
export const SOCIAL_POST_ACTIONS_CLASS =
  "flex items-center gap-2 px-4 pt-1 pb-2 md:pt-2 md:pb-3";

// The permalink's comments (and Profile's "You commented" line), inside
// the card under the actions: a hairline, then pad 16.
export const SOCIAL_POST_COMMENTS_CLASS = "border-t border-hairline px-4 pt-3 pb-4";

// Adam lock 2026-09-25. Feed posts with 2 or more media items use one
// swipe stage (the post's media block). No collage grid. The counter is
// the "1 / 3" chip top-right, the topic chip top-left. The dots sit on
// the band at 72% so they read on any picture in both themes.
export const SOCIAL_FEED_CAROUSEL_BLEED_CLASS = `${SOCIAL_POST_MEDIA_CLASS} bg-surface-muted`;

export const SOCIAL_FEED_CAROUSEL_TRACK_CLASS =
  "no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain";

export const SOCIAL_FEED_CAROUSEL_SLIDE_CLASS =
  "social-feed-carousel-slide relative w-full min-w-full shrink-0 snap-start overflow-hidden bg-surface-muted";

// The dots: drawn from md. The H board draws none on phone; the "1 / 3"
// chip reads the place and a finger swipes, so no 24 dot is drawn as a
// phone target. Below md they stay buttons in the accessibility tree,
// visually hidden (sr-only) until one has keyboard focus, then the row
// shows on the band: a keyboard, switch or screen-reader user still
// changes slides (the slides off screen are aria-hidden). A desktop
// pointer has no swipe, so the dots always show there.
export const SOCIAL_FEED_CAROUSEL_DOTS_CLASS =
  "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-band/72 px-2 max-md:not-focus-within:sr-only";

export const SOCIAL_FEED_CAROUSEL_DOT_HIT_CLASS =
  "flex size-6 shrink-0 items-center justify-center";

export const SOCIAL_FEED_CAROUSEL_DOT_CLASS = "size-2 rounded-full bg-band-ink/50";

export const SOCIAL_FEED_CAROUSEL_DOT_ACTIVE_CLASS = "size-2 rounded-full bg-band-ink";

// A photo's frame: the still at its true shape (the aspect is a style
// from socialPostPhotoAspect); the grey shows only while it loads.
export const SOCIAL_POST_PHOTO_FRAME_CLASS = "relative w-full bg-surface-muted";
// The wall skeleton's media: the frame at its default 4:5 (an image with
// no stored shape), square inside the clipped block.
export const SOCIAL_POST_PHOTO_SKELETON_CLASS = `${SOCIAL_POST_PHOTO_FRAME_CLASS} aspect-[4/5] rounded-none`;

// A video sits in the same media block as a photo: no screen, no band.
// The frame is the column at its shape (socialFeedVideoFrame: 4:5 to
// 2.39:1, taller cover-cropped to 4:5), soft grey while the still loads.
// No feed post draws on --screen any more (the token stays, unused).
export const SOCIAL_POST_SCREEN_CLASS = "relative bg-surface-muted";

// The static play disc on every video (it says "video"; no word on the
// frame): 56 (phone 48), the band at 72%, a 24 band-ink glyph. It steps
// out once a player has mounted in the frame (the frame is group/video),
// which draws its own centre button to the same values (globals.css
// .social-feed-play-disc), so the two never stack.
export const SOCIAL_POST_PLAY_DISC_CLASS =
  "pointer-events-none absolute left-1/2 top-1/2 z-[3] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-band/72 text-band-ink group-has-[mux-player]/video:hidden md:size-14";
export const SOCIAL_POST_PLAY_DISC_GLYPH = 24;

// Chips on the media: 28 tall, pad 10, radius full, the band at 72%,
// 13 / 500 band-ink, inset 16. The topic top-left, the counter ("1 / 3")
// top-right. Labels only: taps pass through to the media.
const SOCIAL_POST_MEDIA_CHIP_BASE_CLASS =
  "pointer-events-none absolute top-4 z-[11] flex h-7 items-center rounded-full bg-band/72 px-2.5 text-[length:var(--text-xs)] font-medium leading-none text-band-ink";
export const SOCIAL_POST_TOPIC_CHIP_CLASS = `${SOCIAL_POST_MEDIA_CHIP_BASE_CLASS} left-4`;
export const SOCIAL_POST_COUNT_CHIP_CLASS = `${SOCIAL_POST_MEDIA_CHIP_BASE_CLASS} right-4 tabular-nums`;

// The header avatar: a 40 circle the photo fills. With no photo, the
// initials (15 / 600 ink-2) on the in-card fill so the circle reads.
export const SOCIAL_AVATAR_POST_CLASS =
  "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[length:var(--text-sm)] font-semibold text-ink-2";
export const SOCIAL_POST_AVATAR_EMPTY_CLASS = SOCIAL_IN_CARD_FILL_CLASS;

// The round action: 44 (desktop 40) on the in-card fill, a 20 Regular
// ink glyph. Comment wraps the round and its count in one button.
const SOCIAL_POST_ROUND_FACE_CLASS =
  `inline-flex size-11 shrink-0 items-center justify-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors md:size-10`;
export const SOCIAL_POST_ROUND_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} hover:bg-hairline active:opacity-70`;
export const SOCIAL_POST_ROUND_IN_GROUP_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} group-hover:bg-hairline`;

// Liked: the filled heart in the accent (a glyph on the fill, 3:1+).
export const SOCIAL_POST_ROUND_LIKED_CLASS = "text-accent";

/** Round action glyph: 20 (H §3.3). The stage rails keep 24. */
export const SOCIAL_POST_ROUND_GLYPH = 20;

// The count beside a round: 15 / 420 ink-2, tabular, in a 44 (desktop
// 40) box so the phone hit stays whole. Likes: its own button (it opens
// who liked); comments: inside the Comment button.
export const SOCIAL_POST_COUNT_CLASS =
  "inline-flex h-11 min-w-11 items-center justify-center px-1 text-[length:var(--text-sm)] [font-weight:var(--type-body-weight)] tabular-nums text-ink-2 md:h-10 md:min-w-10";
export const SOCIAL_POST_COMMENT_CLASS = "group inline-flex shrink-0 items-center rounded-full";
export const SOCIAL_POST_LIKE_CLASS = "relative inline-flex shrink-0 items-center";

// The owner ⋯: a 44 (desktop 40) clear hit, glyph 20 ink-2, at the
// header's end with its glyph on the card's 16 line.
export const SOCIAL_POST_MORE_CLASS =
  "-mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hairline md:-mr-2.5 md:size-10";

// Comment rows (the permalink and the sheet): the 32 face, the name
// 13 / 600 over the body 15 / 420 body ink, the time 13 ink-2 (ink-3 on
// the grey card fails AA).
export const SOCIAL_COMMENT_ROW_AVATAR_CLASS = "size-8";
export const SOCIAL_COMMENT_ROW_NAME_CLASS =
  "block break-words text-[length:var(--text-xs)] font-semibold leading-[18px] text-ink";
export const SOCIAL_COMMENT_ROW_BODY_CLASS =
  "block whitespace-pre-wrap break-words text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-body";
export const SOCIAL_COMMENT_ROW_TIME_CLASS = "t-label text-ink-2";
// The permalink's composer inside the card: a field on the in-card fill.
export const SOCIAL_COMMENT_COMPOSER_IN_CARD_CLASS =
  `mt-3 flex items-end gap-2 rounded-[var(--radius-lg)] px-3 py-2 ${SOCIAL_IN_CARD_FILL_CLASS}`;
// The signed-out line under a thread: the sheet pads 16; inside the
// card the comments section already does.
export const SOCIAL_COMMENT_NEED_PROFILE_CLASS = "px-4 py-3 t-body-sm text-ink-2";
export const SOCIAL_COMMENT_NEED_PROFILE_IN_CARD_CLASS = "pt-3 t-body-sm text-ink-2";
// Profile activity's "You commented" line inside the post's card.
export const SOCIAL_ACTIVITY_COMMENTED_LABEL_CLASS = "t-label text-ink-2";

export const SOCIAL_FIRST_WIN_CLASS =
  "flex flex-col items-center justify-center gap-2.5 rounded-[8px] border border-hairline bg-surface px-5 pb-4 pt-5 text-center";

export const SOCIAL_AVATAR_SM_CLASS =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

// A person's name, wherever it shows: the house phone wrap (gospel
// 2026-09-19: on phone a name never truncates; it wraps, and its row
// stacks). Each surface adds only its type and ink.
export const SOCIAL_PERSON_NAME_CLASS = `block ${HOUSE_PHONE_WRAP_CLASS}`;

// Person row and create-author stack. Primary is body; secondary is
// body-sm. Wrap. Never an 11px crumb.
export const SOCIAL_PERSON_PRIMARY_CLASS = `${SOCIAL_PERSON_NAME_CLASS} t-body-sm font-medium text-ink`;

export const SOCIAL_PERSON_SECONDARY_CLASS = `${SOCIAL_PERSON_NAME_CLASS} t-body-sm text-ink-2`;

// Story viewer header: on phone the author's name and the time stack
// beside the face, so a long name wraps; from md they share one line.
export const SOCIAL_STORY_VIEWER_AUTHOR_CLASS =
  `${HOUSE_PHONE_STACK_CLASS} flex-1 md:flex-row md:items-baseline md:gap-2`;

export const SOCIAL_STORY_VIEWER_AUTHOR_NAME_CLASS =
  `${SOCIAL_PERSON_NAME_CLASS} t-body-sm font-medium text-band-ink`;

export const SOCIAL_STORY_VIEWER_AUTHOR_TIME_CLASS = "shrink-0 t-label text-band-ink/65";

// Story send sheet (dark): the name under each face, and the name and
// handle in the search list, wrap; none is cut to one line.
export const SOCIAL_STORY_SEND_CELL_NAME_CLASS =
  `${SOCIAL_PERSON_NAME_CLASS} w-full text-center t-body-sm text-white`;

export const SOCIAL_STORY_SEND_NAME_CLASS = `${SOCIAL_PERSON_NAME_CLASS} t-body font-medium text-white`;

export const SOCIAL_STORY_SEND_HANDLE_CLASS = `${SOCIAL_PERSON_NAME_CLASS} t-body-sm text-white/60`;

// Story activity sheet (who viewed): the name wraps in this sheet's body
// type; the @handle under it is SOCIAL_PERSON_SECONDARY_CLASS.
export const SOCIAL_STORY_ACTIVITY_NAME_CLASS = `${SOCIAL_PERSON_NAME_CLASS} t-body text-ink`;

export const SOCIAL_AVATAR_LG_CLASS =
  "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-[length:var(--text-title)] font-semibold text-ink-2";

export const SOCIAL_AVATAR_PROFILE_CLASS =
  "flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-[18px] font-semibold text-ink-2";

export const SOCIAL_HANDLE_PILL_CLASS =
  "inline-flex items-center rounded-[8px] bg-surface-muted px-[10px] py-[6px] t-body-sm font-medium text-ink-2";

export const SOCIAL_PROFILE_TAB_CLASS =
  "flex shrink-0 flex-col items-center gap-2 whitespace-nowrap px-4 py-2.5 t-body md:gap-2 md:px-4";

// Profile section tabs (Stage lock): pills, no underline. Active:
// accent-wash fill, accent-ink text 600 (founder pick "Deeper blue text",
// 2026-10-04: 4.62:1 on the wash); idle ink-2 500. Desktop: a row of 36
// pills, 6 apart. Phone: one full-width segmented row on a muted track,
// equal segments 44 tall, labels centred with no side padding so a label
// has the whole segment; one wider than its segment ("Highlights" below
// about 340) wraps inside it, never past it and never a sideways scroll.
// The identity sits 8 above (centre column gap), so 16 here makes 24.
export const SOCIAL_PROFILE_SECTION_TABS_CLASS =
  "mt-4 flex w-full min-w-0 gap-1 rounded-full bg-surface-muted p-1 md:w-auto md:gap-1.5 md:rounded-none md:bg-transparent md:p-0";

export const SOCIAL_PROFILE_SECTION_TAB_CLASS =
  "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-0 py-1 text-center break-words t-body-sm focus-visible:rounded-full! md:min-h-9 md:flex-none md:px-4";

// The label is its own flex item. Bare text in the inline-flex pill is an
// anonymous item that cannot shrink below its longest word, so a long label
// spilled past its segment; min-w-0 lets this span shrink to the segment,
// and it wraps there (at a hyphenation point where the browser has one).
export const SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS = "min-w-0 break-words hyphens-auto";

export const SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS = "bg-accent-wash font-semibold text-accent-ink";

export const SOCIAL_PROFILE_SECTION_TAB_IDLE_CLASS = "font-medium text-ink-2 hover:text-ink";

export const SOCIAL_PROFILE_GRID_CLASS =
  "grid grid-cols-3 gap-px";

export const SOCIAL_PROFILE_TILE_CLASS =
  "relative aspect-square w-full overflow-hidden bg-surface-muted";

export const SOCIAL_PROFILE_PLAY_CLASS =
  "pointer-events-none absolute right-1.5 top-1.5 z-10 text-band-ink";

export const SOCIAL_HIGHLIGHT_RING_CLASS =
  "rounded-full border-2 border-accent p-[2px]";

// 180:206 / 180:1946 / 181:2184 — Edit profile. Mobile full page; desktop
// 480 sheet on wash. 180:2004 / 180:2026 — Bio editor. Tokens only.
export const SOCIAL_PROFILE_EDIT_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-surface md:hidden";

export const SOCIAL_PROFILE_EDIT_SHEET_CLASS =
  "flex h-full min-h-0 w-full flex-col overflow-y-auto bg-bg";

export const SOCIAL_PROFILE_EDIT_HEADER_CLASS =
  "flex h-16 shrink-0 items-center gap-2 border-b border-hairline bg-surface py-2 pl-2 pr-4";

export const SOCIAL_PROFILE_EDIT_BACK_CLASS =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink";

export const SOCIAL_PROFILE_EDIT_DONE_CLASS =
  "shrink-0 t-body-sm font-semibold text-accent";

export const SOCIAL_PROFILE_BIO_DONE_CLASS =
  "flex shrink-0 items-center justify-center rounded-full bg-accent px-3 py-2 text-accent-contrast";

export const SOCIAL_PROFILE_EDIT_BODY_CLASS =
  "flex flex-col gap-[var(--space-4)] px-4 pb-10 pt-5 md:p-5";

export const SOCIAL_WELCOME_VIDEO_CLASS =
  `overflow-hidden ${SOCIAL_SURFACE_RADIUS_CLASS} border border-hairline bg-surface`;

export const SOCIAL_PROFILE_EDIT_PHOTO_CLASS =
  "flex flex-col items-center justify-center gap-[var(--space-3)]";

export const SOCIAL_PROFILE_EDIT_AVATAR_CLASS =
  "relative flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-muted text-ink";

export const SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS =
  "border-accent bg-accent-wash";

export const SOCIAL_PROFILE_EDIT_PICTURE_CLASS =
  "t-body-sm font-medium text-accent";

export const SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_CLASS =
  "mx-auto mb-1 h-1 w-10 shrink-0 touch-none rounded-full bg-ink-3/40";

export const SOCIAL_PROFILE_AVATAR_SHEET_HANDLE_HIT_CLASS =
  "flex w-full cursor-grab justify-center py-2 touch-none";

export const SOCIAL_PROFILE_AVATAR_SHEET_LIST_CLASS = "flex w-full flex-col";

export const SOCIAL_PROFILE_AVATAR_SHEET_ROW_CLASS =
  "flex w-full items-center gap-3 py-3 text-left t-body text-ink";

export const SOCIAL_PROFILE_AVATAR_SHEET_DANGER_CLASS =
  "flex w-full items-center gap-3 py-3 text-left t-body text-[#c4564a]";

export const SOCIAL_PROFILE_EDIT_CARD_CLASS =
  `flex w-full flex-col overflow-hidden ${SOCIAL_SURFACE_RADIUS_CLASS} border border-hairline bg-surface px-4`;

export const SOCIAL_PROFILE_EDIT_ROW_CLASS =
  "flex w-full items-start gap-3 py-3";

export const SOCIAL_PROFILE_EDIT_SECTION_CLASS = "flex flex-col gap-3 py-3";

// House type SoT — Settings/drill-in labels, not t-label ALL-CAPS
// + 0.12em track. One line, no mid-word ellipsis. 128px still
// fits sentence-case field names in the label column.
export const SOCIAL_HANDLE_FIELD_LABEL_CLASS = SETTINGS_DIALOG_LABEL_CLASS;
export const SOCIAL_HANDLE_PREFIX_CLASS = "shrink-0 select-none font-medium text-ink-2";
export const SOCIAL_HANDLE_FIELD_CLASS =
  `flex w-full items-center rounded-[var(--radius-sm)] border border-hairline bg-surface px-3 py-2 ${HOUSE_VOICE_FOCUS_HOST_CLASS}`;

export const SOCIAL_PROFILE_EDIT_LABEL_CLASS =
  `w-32 shrink-0 whitespace-nowrap pt-0.5 ${SETTINGS_DIALOG_LABEL_CLASS}`;
export const SOCIAL_PROFILE_EDIT_HELP_CLASS = SETTINGS_DIALOG_HELP_CLASS;
export const SOCIAL_PROFILE_EDIT_ERROR_CLASS = SETTINGS_DIALOG_ERROR_CLASS;

export const SOCIAL_PROFILE_EDIT_HANDLE_CLASS =
  "flex min-w-0 flex-1 items-center rounded-[12px] bg-surface-muted px-3 py-2.5 t-control";

export const SOCIAL_PROFILE_EDIT_HANDLE_ERROR_CLASS =
  "flex min-w-0 flex-1 items-center rounded-[12px] border border-ink bg-surface-muted px-3 py-2.5 t-control";

export const SOCIAL_PROFILE_BIO_CARD_CLASS =
  "flex w-full flex-col gap-4 rounded-[16px] border border-hairline bg-surface p-4";

// 155:194 / 155:372 — wash overlay, QR card, three actions. No glass, no drop shadow.
export const SOCIAL_SHARE_SHEET_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-bg md:hidden";

export const SOCIAL_SHARE_SHEET_WASH_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-accent/18 to-transparent md:h-[520px] md:from-accent/12";

export const SOCIAL_SHARE_SHEET_CHROME_CLASS =
  "relative flex h-16 shrink-0 items-center px-[var(--space-4)]";

export const SOCIAL_SHARE_SHEET_CLOSE_CLASS =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-ink/8 text-ink";

export const SOCIAL_SHARE_SHEET_BODY_CLASS =
  "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[var(--space-6)] px-[var(--space-4)] pb-[var(--space-12)] md:gap-[var(--space-8)]";

export const SOCIAL_SHARE_SHEET_CARD_CLASS =
  "flex w-[310px] flex-col items-center justify-center gap-[var(--space-6)] rounded-[24px] border border-hairline bg-surface px-[var(--space-6)] py-[var(--space-8)] md:h-[420px] md:w-[360px]";

export const SOCIAL_SHARE_SHEET_QR_CLASS =
  "relative size-[240px] overflow-hidden bg-surface text-accent";

export const SOCIAL_SHARE_SHEET_MARK_CLASS =
  "absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[12px] border-2 border-accent bg-surface text-[16px] font-semibold text-accent";

export const SOCIAL_SHARE_SHEET_HANDLE_CLASS =
  "t-body font-semibold tracking-[0.06em] text-accent";

export const SOCIAL_SHARE_SHEET_ACTIONS_CLASS =
  "flex items-center justify-center gap-[var(--space-2)] md:gap-[var(--space-4)]";

export const SOCIAL_SHARE_SHEET_ACTION_CLASS =
  "flex w-[114px] flex-col items-center justify-center gap-[var(--space-2)] rounded-[16px] border border-hairline bg-surface py-[var(--space-4)] text-[length:var(--text-xs)] font-medium text-ink md:w-[128px]";

export const SOCIAL_CREATE_CARD_CLASS =
  "flex flex-col gap-3 rounded-[8px] border border-hairline bg-surface p-4 md:gap-4 md:p-6";

// Voice-first write compose. Edge-to-edge house light. No card cousin.
// docs/design-locks/write-compose-voice-first-immersive-lock-v1.md
export const SOCIAL_WRITE_COMPOSE_FRAME_CLASS = "min-h-dvh w-full";

export const SOCIAL_WRITE_COMPOSE_HOST_CLASS =
  "mx-auto flex h-dvh max-h-dvh min-h-0 w-full max-w-[680px] flex-col overflow-hidden bg-surface px-[var(--space-4)] pt-[max(0px,env(safe-area-inset-top))] pb-[max(var(--space-4),env(safe-area-inset-bottom))]";

// Share something entry hosts this compose in the house sheet.
// The sheet pad is the inset. Do not add a second pad or a viewport height.
// docs/design-locks/share-something-write-compose-sheet-lock-v1.md
export const SOCIAL_WRITE_COMPOSE_SHEET_FORM_CLASS =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-transparent";

export const SOCIAL_WRITE_COMPOSE_SHEET_CHROME_CLASS =
  "flex h-12 shrink-0 items-center justify-between gap-[var(--space-4)] border-b border-hairline";

export const SOCIAL_WRITE_COMPOSE_SHEET_ROW_CLASS =
  "mt-auto flex min-h-12 w-full min-w-0 items-end gap-[var(--space-2)] border-t border-hairline bg-transparent";

// §0. Row 48. Hairline on the bottom edge only. Pad H 16.
export const SOCIAL_WRITE_COMPOSE_CHROME_CLASS =
  "-mx-[var(--space-4)] flex h-12 items-center justify-between gap-[var(--space-4)] border-b border-hairline px-[var(--space-4)]";

export const SOCIAL_WRITE_COMPOSE_POST_CLASS =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-[8px] bg-accent px-[var(--space-4)] t-body-sm font-medium text-accent-contrast disabled:opacity-70";

export const SOCIAL_WRITE_COMPOSE_X_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center text-ink active:opacity-70";

// §0.2. Diameter 220. #EEEEF0 is denser than --surface-muted. The 1px hairline sits inside the face.
export const SOCIAL_WRITE_VOICE_HERO_CLASS =
  "flex size-[220px] shrink-0 items-center justify-center rounded-full border border-hairline bg-[#EEEEF0] text-ink";

export const SOCIAL_WRITE_VOICE_HERO_LISTENING_CLASS = "ring-2 ring-accent";

// Recording: 10% Sporty tint (paints like --accent-wash). The glyph on it is
// --accent-ink (founder pick "Deeper blue text", Adam 2026-10-04): 4.61:1
// painted light, where --accent was 4.07:1. The ring stays --accent.
export const SOCIAL_WRITE_VOICE_HERO_RECORDING_CLASS = "bg-accent/10 text-accent-ink ring-2 ring-accent";

// §0.4. iMessage compose row. Type is transparent on white. Feed write has no mic.
// Hairline is the top edge only. No gray fill. Bottom pad is 16 above the safe area.
export const SOCIAL_WRITE_COMPOSE_ROW_CLASS =
  "-mx-[var(--space-4)] -mb-[max(var(--space-4),env(safe-area-inset-bottom))] mt-auto flex min-h-12 items-end gap-[var(--space-2)] border-t border-hairline bg-transparent px-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))]";

// 16px floor. text-sm (15px) makes iOS Safari zoom the page on focus.
// Flat caption. No elevation on the field.
export const SOCIAL_WRITE_COMPOSE_ROW_FIELD_CLASS =
  "max-h-[40vh] min-h-12 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-3 text-[16px] leading-normal text-ink caret-ink outline-none placeholder:text-ink-2";

/** Grow the caption up to 40vh. Past that, scroll so the caret line stays inside the field. */
export function fitSocialWriteComposeField(field: HTMLTextAreaElement): void {
  const view = field.ownerDocument.documentElement.clientHeight || 0;
  const max = Math.max(48, Math.round(view * 0.4));
  field.style.height = "0px";
  const needed = field.scrollHeight;
  field.style.height = `${Math.min(needed, max)}px`;
  field.scrollTop = field.scrollHeight;
}

/** Keep the compose inside the visual viewport so the keyboard does not cover the caret. */
export function bindSocialWriteComposeViewport(form: HTMLElement, refit?: () => void): () => void {
  if (typeof window === "undefined" || !window.visualViewport) return () => undefined;
  const vv = window.visualViewport;
  const apply = () => {
    form.style.height = `${Math.round(vv.height)}px`;
    form.style.maxHeight = `${Math.round(vv.height)}px`;
    form.style.transform = vv.offsetTop > 0 ? `translateY(${Math.round(vv.offsetTop)}px)` : "";
    refit?.();
  };
  apply();
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  return () => {
    vv.removeEventListener("resize", apply);
    vv.removeEventListener("scroll", apply);
  };
}

// §0.4. In-row dictate mic. Hit 40. Glyph 24 is the icon size. Compact Sporty listening — not the 220 face.
export const SOCIAL_WRITE_COMPOSE_MIC_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink";

export const SOCIAL_WRITE_COMPOSE_MIC_LISTENING_CLASS = "ring-2 ring-accent";

// Same tint and --accent-ink glyph as the 220 face recording state.
export const SOCIAL_WRITE_COMPOSE_MIC_RECORDING_CLASS = "bg-accent/10 text-accent-ink ring-2 ring-accent";

// §5. Full content width (host inset 16). Radius 16. Cap 50vh. object-cover face.
export const SOCIAL_WRITE_COMPOSE_PREVIEW_CLASS =
  "relative h-[50vh] max-h-[50vh] w-full overflow-hidden rounded-[16px] bg-surface-muted";

// §5 same-slot overlay (write-compose-voice-first-immersive-lock-v1).
// Video stays in this preview slot. Sporty is `bg-accent` (Post / active).
// Track is `bg-surface` so the bar reads on the muted face. No new hex.
// Shape matches house course-glance progress: h-1.5, rounded-full, accent fill.
export const SOCIAL_WRITE_COMPOSE_PROGRESS_TRACK_CLASS =
  "absolute inset-x-[var(--space-4)] bottom-[var(--space-4)] z-10 h-1.5 overflow-hidden rounded-full bg-surface";

export const SOCIAL_WRITE_COMPOSE_PROGRESS_FILL_CLASS = "h-full rounded-full bg-accent";

// §0.4. Media glyphs sit in the compose row, ahead of the field. Gap 8.
export const SOCIAL_WRITE_COMPOSE_ATTACH_ROW_CLASS = "flex items-center gap-2";

export const SOCIAL_CREATE_WELL_CLASS =
  "flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-hairline bg-surface-muted px-4 py-7 text-center md:h-[320px] md:gap-2.5 md:px-6 md:py-10";

export const SOCIAL_CREATE_AVATAR_CLASS =
  "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted t-body-sm font-semibold text-ink-2 md:size-12";

export const SOCIAL_STORY_PICKER_ROW_CLASS =
  "flex w-full items-center gap-4 rounded-[16px] border border-hairline bg-surface p-4 text-left";

export const SOCIAL_STORY_PICKER_WELL_CLASS =
  "flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink";

// Create-story stage. Lock v1.1. House tokens only. No drop shadow.
// Rail ~320, 240 below lg (founder 2026-10-07, lock v1.5 Fit): from 768
// the rail and the two cards fit with no sideways scroll. Stage muted.
// Two cards. Phone stacks.
export const SOCIAL_STORY_CREATE_HOST_CLASS =
  "flex min-h-full flex-1 flex-col bg-surface md:min-h-full md:flex-row";

export const SOCIAL_STORY_CREATE_RAIL_CLASS =
  "flex w-full shrink-0 flex-col border-hairline bg-surface p-[var(--space-4)] md:w-[240px] md:border-r lg:w-[320px]";

export const SOCIAL_STORY_CREATE_CLOSE_CLASS =
  "flex size-10 items-center justify-center rounded-full text-ink";

export const SOCIAL_STORY_CREATE_TITLE_CLASS = "t-heading mt-[var(--space-4)] text-ink";

export const SOCIAL_STORY_CREATE_IDENTITY_CLASS =
  "mt-[var(--space-6)] flex items-center gap-[var(--space-3)]";

export const SOCIAL_STORY_CREATE_NAME_CLASS =
  "t-body min-w-0 text-ink whitespace-normal break-words";

// The stage fills what the rail leaves, with no viewport floor (a 70vh
// floor ran the page 10 past a 360 × 740 phone), and may narrow below
// the cards' row, so the cards shrink instead of the page scrolling.
export const SOCIAL_STORY_CREATE_STAGE_CLASS =
  "flex min-w-0 flex-1 flex-col bg-surface-muted md:min-h-full";

// Safe centring: if the pair ever cannot fit (a smaller browser text size
// moves the rem breakpoints), the row starts at the stage's edge and
// scrolls instead of spilling left over the rail.
export const SOCIAL_STORY_CREATE_CARDS_CLASS =
  "flex flex-1 flex-col items-stretch justify-center gap-[var(--space-4)] p-[var(--space-4)] md:flex-row md:items-center md:justify-center-safe md:gap-[var(--space-6)]";

export const SOCIAL_STORY_CREATE_CARD_CLASS =
  "flex w-full min-h-[200px] flex-col items-center justify-center gap-[var(--space-4)] rounded-[var(--radius-lg)] px-[var(--space-4)] py-[var(--space-6)] text-center md:h-[420px] md:w-[280px] md:min-w-[220px] md:max-w-[280px]";

export const SOCIAL_STORY_PHOTO_CARD_CLASS =
  `${SOCIAL_STORY_CREATE_CARD_CLASS} bg-gradient-to-b from-accent to-ink text-accent-contrast`;

export const SOCIAL_STORY_VIDEO_CARD_CLASS =
  `${SOCIAL_STORY_CREATE_CARD_CLASS} bg-gradient-to-b from-ink to-ink-2 text-accent-contrast`;

export const SOCIAL_STORY_CREATE_ICON_WELL_CLASS =
  "flex size-14 shrink-0 items-center justify-center rounded-full bg-surface text-ink";

export const SOCIAL_STORY_CREATE_LABEL_CLASS =
  "t-body-sm max-w-full whitespace-normal break-words text-center text-accent-contrast";

export const SOCIAL_STORY_CREATE_SECONDARY_CLASS =
  "flex flex-1 flex-col items-center justify-center p-[var(--space-4)]";

export const SOCIAL_STORY_CREATE_SECONDARY_COLUMN_CLASS =
  "flex w-full max-w-[480px] flex-col gap-[var(--space-4)]";

export const SOCIAL_STORY_CREATE_BACK_CLASS = "self-start t-body text-ink";

export const SOCIAL_STORY_SHARE_ACTIONS_CLASS =
  "flex flex-wrap items-center justify-center gap-[var(--space-4)]";

export const SOCIAL_STORY_SHARE_RETAKE_CLASS =
  "inline-flex items-center justify-center rounded-full border border-hairline bg-surface px-[var(--space-6)] py-[var(--space-4)] t-body-sm font-semibold text-ink";

export const SOCIAL_STORY_SHARE_POST_CLASS =
  "inline-flex items-center justify-center rounded-full bg-accent px-[var(--space-6)] py-[var(--space-4)] t-body-sm font-semibold text-accent-contrast";

export const SOCIAL_STORY_SHARE_PREVIEW_CLASS =
  "max-h-[420px] w-full rounded-[var(--radius-lg)] object-contain";

export const SOCIAL_STORY_STUDIO_CLASS =
  "fixed inset-0 z-50 flex bg-band text-band-ink md:items-center md:justify-center";

export const SOCIAL_STORY_STUDIO_STAGE_CLASS =
  "relative flex h-full w-full flex-col overflow-hidden bg-band md:h-[746px] md:max-h-[90dvh] md:w-[420px] md:rounded-[16px] md:border md:border-band-ink/20";

// Lock v1.4: rectangular full-bleed viewfinder. Cover fills the stage pane.
// No face ring and no oval crop. Review stays cover as well.
export const SOCIAL_STORY_STUDIO_PREVIEW_CLASS =
  "absolute inset-0 size-full object-cover";

export const SOCIAL_STORY_STUDIO_PREVIEW_MIRROR_CLASS = "-scale-x-100";

export const SOCIAL_STORY_STUDIO_REVIEW_CLASS =
  "absolute inset-0 size-full object-cover";

export function socialStoryStudioPreviewClass(mirrored: boolean): string {
  return mirrored
    ? `${SOCIAL_STORY_STUDIO_PREVIEW_CLASS} ${SOCIAL_STORY_STUDIO_PREVIEW_MIRROR_CLASS}`
    : SOCIAL_STORY_STUDIO_PREVIEW_CLASS;
}

export const SOCIAL_STORY_STUDIO_CHROME_CLASS =
  "absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between bg-band/35 p-4";

// Lock v1.5 camera face. 48 bar, 16 inset, safe-area. Ink is band-ink on the feed.
export const SOCIAL_STORY_CAMERA_TOP_CLASS =
  "absolute inset-x-0 top-0 z-10 px-4 pt-[env(safe-area-inset-top,0px)]";

export const SOCIAL_STORY_CAMERA_TOP_ROW_CLASS =
  "grid h-12 grid-cols-3 items-center";

export const SOCIAL_STORY_CAMERA_HIT_CLASS =
  "flex size-11 items-center justify-center text-band-ink";

export const SOCIAL_STORY_CAMERA_BOTTOM_CLASS =
  "absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 pb-[env(safe-area-inset-bottom,0px)]";

export const SOCIAL_STORY_CAPTURE_ROW_CLASS =
  "grid grid-cols-3 items-center px-4";

export const SOCIAL_STORY_SHUTTER_CLASS =
  "flex size-[72px] items-center justify-center justify-self-center rounded-full border-4 border-band-ink";

export function socialStoryShutterFillClass(recording: boolean): string {
  return recording ? "size-14 rounded-full bg-accent" : "size-14 rounded-full bg-band-ink";
}

export const SOCIAL_STORY_GALLERY_CLASS =
  "flex size-12 items-center justify-center justify-self-start overflow-hidden rounded-[8px] bg-band-ink/12 text-band-ink";

export const SOCIAL_STORY_MODE_RAIL_CLASS =
  "flex h-12 items-center justify-center";

export const SOCIAL_STORY_MODE_LABEL_CLASS =
  "t-body-sm font-semibold text-accent underline underline-offset-8";

export const SOCIAL_STORY_STUDIO_ICON_CLASS =
  "flex size-10 items-center justify-center rounded-full bg-band-ink/12 text-band-ink";

export const SOCIAL_STORY_RECORD_CLASS =
  "flex size-20 items-center justify-center rounded-full border-[3px] border-band-ink bg-accent text-accent-contrast";

export const SOCIAL_STORY_STOP_CLASS =
  "size-6 rounded-[4px] bg-accent-contrast";

export const SOCIAL_STORY_REC_PILL_CLASS =
  "absolute left-1/2 top-[72px] z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1.5 t-label font-semibold text-accent-contrast";

// Posted confirm stays on the studio host. The thin white receipt is out.
// docs/design-locks/stories-upload-success-immersive-lock-v1.md
export const SOCIAL_STORY_POSTED_TITLE_CLASS = "t-body-sm font-medium text-band-ink";

export const SOCIAL_STORY_POSTED_SCRIM_CLASS =
  "absolute inset-x-0 bottom-0 z-10 flex flex-col items-center bg-gradient-to-t from-band/80 to-transparent px-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] pt-[var(--space-12)]";

export const SOCIAL_STORY_POSTED_CTA_CLASS =
  "inline-flex h-[var(--space-12)] items-center justify-center rounded-full bg-accent px-[var(--space-4)] t-body-sm font-medium text-accent-contrast";

export const SOCIAL_MUX_PLAYER_CLASS =
  "social-mux-player block size-full overflow-hidden bg-surface-muted object-cover";

// Quiet disc behind the paused-feed play glyph. Not a naked glyph.
// docs/design-locks/social-home-craft-wave-1-lock-v1.md
export const SOCIAL_FEED_PLAY_DISC_CLASS = "social-feed-play-disc";
