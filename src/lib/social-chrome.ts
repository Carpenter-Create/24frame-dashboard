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
  HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_ON_CLASS,
  HOUSE_PILL_SLIDER_THUMB_CLASS,
  HOUSE_PILL_SLIDER_THUMB_DURATION_MS,
  HOUSE_PILL_SLIDER_TRACK_CLASS,
  HOUSE_RAIL_PANEL_CLASS,
  HOUSE_SCROLL_ROW_CLASS,
  HOUSE_SECTION_AIR_CLASS,
} from "@/lib/house-shell";
import { HOUSE_VOICE_FOCUS_HOST_CLASS } from "@/lib/form-control";
import {
  HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS,
  HOUSE_PHONE_DOCK_CHROME_PB_CLASS,
} from "@/lib/house-phone-dock";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
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

export const SOCIAL_FOR_YOU_RAIL_CLASS =
  `hidden ${SOCIAL_FOR_YOU_WIDTH_CLASS} shrink-0 flex-col gap-4 ${SOCIAL_SURFACE_RADIUS_CLASS} border border-hairline bg-surface p-4 lg:flex`;

export const SOCIAL_CARD_CLASS =
  "flex flex-col gap-[var(--space-3)] rounded-[8px] border border-hairline bg-surface p-[var(--space-4)]";

export const SOCIAL_CARD_MUTED_CLASS =
  "flex flex-col gap-[var(--space-3)] rounded-[8px] bg-surface-muted p-[var(--space-4)]";

export const SOCIAL_EMPTY_PANEL_CLASS =
  `flex flex-col items-center justify-center gap-[var(--space-4)] ${SOCIAL_SURFACE_RADIUS_CLASS} bg-surface-muted px-[var(--space-6)] py-[var(--space-12)] text-center`;

// Profile Posts empty — own + public one SoT. Quiet: no tall muted
// well, no second Edit. Title is the one short line.
export const SOCIAL_PROFILE_POSTS_EMPTY_CLASS =
  "flex flex-col items-center justify-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-4)] text-center";

export const SOCIAL_EMPTY_ACTION_CLASS =
  "inline-flex items-center justify-center rounded-[8px] bg-accent px-[var(--space-4)] py-[10px] t-body-sm font-medium text-accent-contrast";

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

// Feed composer (H register §5.3; founder 2026-10-05, "I like the
// designs. Let's use them."). One 44 row, no bar: the 44 avatar, 12, a
// grey "Share something" pill (flex, --surface-muted, radius full, 44,
// 17 / 420 ink-2, pad 16) that opens the write sheet with the avatar,
// then 8 (phone 4) and a round grey 44 Photo, 8 (4), a round grey 44
// Camera (20 ink glyphs). Supersedes the G composer bar (52, radius 16,
// one muted bar). Prompt copy, the write sheet, and the pickers are
// unchanged. Stack air: 24 under the stories.
// docs/design-locks/social-feed-register-lock-v1.md
export const SOCIAL_COMPOSER_CLASS =
  "mt-6 flex w-full items-center gap-1 md:gap-2";

export const SOCIAL_COMPOSER_ROW_CLASS =
  "group flex min-w-0 flex-1 items-center gap-3 text-left";

export const SOCIAL_COMPOSER_AVATAR_CLASS = "size-11";

// Below 360 the composer's avatar steps out (as the phone bar's workspace
// name does; the bar keeps the member's photo), so "Share something"
// stays one line in its 44 pill at 320 and both pickers stay.
export const SOCIAL_COMPOSER_AVATAR_NARROW_CLASS = "max-[359px]:hidden";

export const SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS = "flex shrink-0 items-center gap-1 md:gap-2";

// Round grey 44 (H register §3.3), the header's control face.
export const SOCIAL_COMPOSER_AFFORDANCE_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-hairline";

export const SOCIAL_COMPOSER_AFFORDANCE_GLYPH = 20;
export const SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS = "text-ink";

// The grey prompt pill. Hover steps the fill to the hairline grey, as the
// round grey controls do.
export const SOCIAL_COMPOSER_FIELD_CLASS =
  "flex h-11 min-w-0 flex-1 items-center rounded-full border-0 bg-surface-muted px-4 text-[length:var(--text-base)] text-ink-2 outline-none transition-colors group-hover:bg-hairline";

export const SOCIAL_COMPOSER_MEDIA_CLASS =
  "relative flex size-9 shrink-0 cursor-pointer items-center justify-center text-ink-2";

export const SOCIAL_FOLLOW_COMPACT_CLASS =
  "inline-flex items-center rounded-[8px] bg-accent px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-accent-contrast";

// Feed For you rail (H register §3.3 small secondary): a grey 36 pill,
// 15 / 600 ink, pad 16. No hairline, no accent fill.
export const SOCIAL_FOLLOW_QUIET_CLASS =
  "inline-flex h-9 shrink-0 items-center rounded-full bg-surface-muted px-4 text-[length:var(--text-sm)] font-semibold text-ink transition-colors hover:bg-hairline";

export const SOCIAL_FOLLOW_COMPACT_IDLE_CLASS =
  "inline-flex items-center rounded-[8px] border border-hairline bg-surface px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-ink";

export const SOCIAL_FOR_YOU_CARD_CLASS =
  `${HOUSE_MODULE_CLASS} flex w-full flex-col gap-2 p-4`;

// Phone only. The social frame pads 16. These utilities cancel that
// gutter so a row meets the viewport. They are max-md, so desktop
// column inset stays. Stories rail and a post's media (H · Posts) use
// this. Do not put them on the composer or the post's text rows.
export const SOCIAL_MOBILE_BLEED_CLASS =
  "max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]";

// Restores the 16 a viewport bleed removed. The frame gutter is the
// white side canvas.
export const SOCIAL_MOBILE_BLEED_PAD_CLASS = "max-md:px-[var(--chrome-gutter)]";

// The post face (author row, media, actions, likes, caption, comment
// trail, time; the muted Option A card) is the H block below
// ("H · Posts"). docs/design-locks/social-feed-register-lock-v1.md §7

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

// Grid: feed column 600, gap 48, For you rail 296 (pair 944). /social
// only. The rail shows from xl: beside the 240 side menu and the shell
// gutters the pair fits from 1248, so below xl the rail is display:none
// and the column keeps its 600 cap from md. The pair keeps the Social
// row's end alignment (its trailing edge on the shell gutter, the
// avatar's line). Desktop: 16 under the shared header inset (8), so the
// slider and the rail's heading sit 24 under the header, as drawn.
export const SOCIAL_FEED_MEASURE = { center: 600, gutter: 48, right: 296 } as const;
export const SOCIAL_FEED_PAIR_WIDTH =
  SOCIAL_FEED_MEASURE.center + SOCIAL_FEED_MEASURE.gutter + SOCIAL_FEED_MEASURE.right;
export const SOCIAL_FEED_LAYOUT_CLASS =
  "flex w-full items-start gap-12 md:pt-4 xl:ml-auto xl:max-w-[944px]";
export const SOCIAL_FEED_CENTER_CLASS =
  "flex min-w-0 w-full flex-1 flex-col md:max-w-[600px]";
export const SOCIAL_FEED_ASIDE_CLASS = "hidden w-[296px] shrink-0 flex-col xl:flex";

// The board's quiet ink is the house ink-3 in light and the house ink-2
// in dark: the house dark ink-3 is 3.9:1 on the dark page and fails AA
// for 13–20px labels, so quiet feed labels take ink-2 in dark. Existing
// tokens only; no new colour.
export const SOCIAL_FEED_QUIET_INK_CLASS = "text-ink-3 dark:text-ink-2";

// Feed headings ("Reels", "For you"): 20 / 480 / -0.02em, line 1.4, ink,
// normal case. Supersedes G's 13px uppercase eyebrow.
export const SOCIAL_FEED_HEADING_CLASS =
  "m-0 text-[length:var(--text-lg)] leading-[1.4] [font-weight:var(--type-title-weight)] tracking-[-0.02em] text-ink";

// Following / For you: the primary pill slider (H §3.1), the house
// SegmentedTrack with the shared pill-slider track, ink thumb (220 ms
// ease-out) and 17 / 600 labels; segments pad 20 on a page switch. It
// hugs its labels (about 221 wide) and leads the Feed, left-aligned, on
// phone and desktop (the frame's 16 on phone; 24 under the header on
// desktop). Supersedes G's text tabs with an ink underline.
export const SOCIAL_FEED_SCOPE_CLASS = "flex shrink-0";
export const SOCIAL_FEED_SCOPE_TRACK_CLASS = `${HOUSE_PILL_SLIDER_TRACK_CLASS} w-max`;
export const SOCIAL_FEED_SCOPE_THUMB_CLASS = HOUSE_PILL_SLIDER_THUMB_CLASS;
export const SOCIAL_FEED_SCOPE_THUMB_DURATION_MS = HOUSE_PILL_SLIDER_THUMB_DURATION_MS;
const SOCIAL_FEED_SCOPE_SEGMENT_BASE_CLASS = `${HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS} px-5`;
export const SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS =
  `${SOCIAL_FEED_SCOPE_SEGMENT_BASE_CLASS} ${HOUSE_PILL_SLIDER_SEGMENT_ON_CLASS}`;
export const SOCIAL_FEED_SCOPE_SEGMENT_OFF_CLASS =
  `${SOCIAL_FEED_SCOPE_SEGMENT_BASE_CLASS} ${HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS}`;
export function socialFeedScopeSegmentClass(on: boolean): string {
  return on ? SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS : SOCIAL_FEED_SCOPE_SEGMENT_OFF_CLASS;
}

// Topics: secondary chips (H §3.2). All first, then the 15 topics A to
// Z. Idle: no fill, 15 / 500 ink. Current: the accent wash with
// accent-ink 15 / 600 and aria-current. Desktop chips are 40 tall, pad
// 16, gap 4. Phone: a 44 hit holding a 36 pill (pad 14); the row meets
// the viewport and pads 16. Labels never truncate; the row scrolls
// sideways. A 96 page-colour fade over the trailing edge holds a round
// grey "More topics" (desktop 40, phone 44 at 16 in) that scrolls the
// row on; both leave at the end of the row. Supersedes G's plain words
// over an ink underline. Stack: 24 under the composer, 16 above the wall.
// Keyboard: the track's inline-end scroll padding equals the fade width
// (96), so a focused chip scrolls clear of the fade and More topics (the
// row's keyboard focus handler reads this padding: Chromium alone leaves
// a chip that sits whole inside the track under the fade). The track
// pads 5 top and bottom and takes it back in margin: the focus ring
// (2 + 3 offset) draws whole inside the scrollport and the row keeps its
// 44 / 40 height.
export const SOCIAL_HOME_TOPIC_ROW_CLASS =
  "relative mt-6 min-w-0 max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]";
export const SOCIAL_HOME_TOPIC_TRACK_CLASS =
  "no-scrollbar -my-[5px] flex gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap py-[5px] scroll-pe-24 max-md:px-4";
// The hit: 44 on phone, 40 on desktop (where the hit is the pill).
const SOCIAL_HOME_TOPIC_BASE_CLASS =
  "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full md:h-10";
export const SOCIAL_HOME_TOPIC_CLASS = `${SOCIAL_HOME_TOPIC_BASE_CLASS} text-ink`;
export const SOCIAL_HOME_TOPIC_CURRENT_CLASS = `${SOCIAL_HOME_TOPIC_BASE_CLASS} text-accent-ink`;
export function socialHomeTopicClass(current: boolean): string {
  return current ? SOCIAL_HOME_TOPIC_CURRENT_CLASS : SOCIAL_HOME_TOPIC_CLASS;
}
// The chip face: a 36 pill on phone (inside the 44 hit), 40 on desktop.
const SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS =
  "inline-flex h-9 items-center rounded-full px-3.5 text-[length:var(--text-sm)] leading-none md:h-10 md:px-4";
export const SOCIAL_HOME_TOPIC_CHIP_CLASS = `${SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS} font-medium`;
export const SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS =
  `${SOCIAL_HOME_TOPIC_CHIP_BASE_CLASS} bg-accent-wash font-semibold`;
export function socialHomeTopicChipClass(current: boolean): string {
  return current ? SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS : SOCIAL_HOME_TOPIC_CHIP_CLASS;
}
export const SOCIAL_HOME_TOPIC_FADE_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-[linear-gradient(90deg,transparent,var(--bg)_55%)] max-md:pr-4";
export const SOCIAL_HOME_TOPIC_MORE_CLASS =
  "pointer-events-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-hairline md:size-10";

// Stories: the locked story cards (H §5.2; the stories card lock's
// geometry). 112×200 desktop / 108×192 phone (about 9:16), radius 16, gap 8,
// no border. The cover fills the card; top-left 8 the author's 36 (phone
// 32) avatar in a 2px ring with a 2px inner pad (accent unseen, hairline
// seen); the name ("Elena R.") on the picture in a 48 band scrim (the
// band at 72%), 13 / 500 band-ink, inset 8, wrapping, never cut. Create
// story first: the member's photo in the upper 120, the muted plate
// under it with "Create story" 15 / 500 ink near the bottom, and a 40
// (phone 36) accent circle with the plus, ringed 3 in muted, on the
// seam. Phone: the rail meets the viewport and pads 16. Supersedes G's
// 56×100 tiles with names under them. The track pads 5 top and bottom
// (taken back in margin) so a card's focus ring draws whole; 24 under
// the slider.
export const SOCIAL_HOME_STORIES_RAIL_CLASS =
  "no-scrollbar mt-[19px] -mb-[5px] flex gap-2 overflow-x-auto overscroll-x-contain py-[5px] max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))] max-md:px-4";
export const SOCIAL_HOME_STORY_CARD_CLASS =
  "relative block h-[192px] w-[108px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-surface-muted md:h-[200px] md:w-[112px]";
export const SOCIAL_HOME_STORY_MEDIA_CLASS = "absolute inset-0 bg-surface-muted";
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
  "absolute left-1/2 top-[99px] z-10 grid size-[42px] -translate-x-1/2 place-items-center rounded-full border-[3px] border-surface-muted bg-accent text-accent-contrast md:top-[97px] md:size-[46px]";
export const SOCIAL_HOME_STORY_CREATE_LABEL_CLASS =
  "absolute inset-x-0 bottom-3 px-2 text-center text-[length:var(--text-sm)] font-medium leading-5 text-ink break-words";

// Reels row (H §5.4). After every 3 posts in the post wall (lib plan,
// unchanged). Head 44: "Reels" as a 20 / 480 heading; on desktop two
// round grey 44 arrows, 8 apart (Previous at 40% at the start). Tiles
// 9:16, desktop 180×320 / phone 160×284, radius 16, gap 8, 16 under the
// head (phone 12); the arrows page by two tiles (376). Desktop: clipped
// at the 600 column (3 tiles and a peek). Phone: meets the viewport,
// pads 16, scroll-snap, no arrows; vertical pans pass through to the
// page. Air: 48 above and below on desktop (the wall gutter itself, H ·
// Posts), 28 on phone (4 here plus the 24 gutter). Stills only.
// Supersedes G's 30 head with a 13px eyebrow, the hairline 30 arrows,
// radius 10 and gap 12.
export const SOCIAL_FEED_REELS_CLASS =
  "my-1 flex min-w-0 flex-col max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))] md:my-0";
export const SOCIAL_FEED_REELS_HEAD_CLASS =
  "flex h-11 items-center justify-between max-md:px-4";
export const SOCIAL_FEED_REELS_ARROWS_CLASS = "hidden gap-2 md:flex";
const SOCIAL_FEED_REELS_ARROW_BASE_CLASS =
  "grid size-11 place-items-center rounded-full bg-surface-muted text-ink";
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
  "no-scrollbar m-0 mt-[7px] -mb-[5px] flex list-none gap-2 overflow-x-auto overscroll-x-contain px-0 py-[5px] [touch-action:pan-x_pan-y] max-md:snap-x max-md:snap-mandatory max-md:scroll-pl-4 max-md:px-4 md:mt-[11px]";
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

// The wall block under the topics: 16 air. Notices (truncated stories /
// followees) sit at its head, 12 apart.
export const SOCIAL_FEED_WALL_CLASS = "mt-4 flex min-w-0 flex-col gap-3";

// For you rail (H §5.5; founder decision 5, "sure": "For you" stays the
// rail's heading as well as the slider option). The heading (20 / 480,
// 44 tall, level with the slider), 16, the latest course as one soft
// grey card (CourseCard "feature": --surface-muted, radius 24, pad 16, a
// 16:9 cover at radius 16, "Latest course · Education" 13 / 500 ink-2,
// the title 17 / 600), 24, "Suggested people" 17 / 600, 12, then 56
// rows (40 avatar, gap 12, radius 24 hover fill) with the grey 36 Follow.
// No hairlines, no border. Supersedes G's borderless eyebrow aside.
export const SOCIAL_FEED_ASIDE_HEADING_CLASS = `${SOCIAL_FEED_HEADING_CLASS} flex h-11 items-center`;
export const SOCIAL_FEED_ASIDE_COURSE_CLASS = "mt-4 flex min-w-0 flex-col";
export const SOCIAL_FEED_ASIDE_SECTION_CLASS = "mt-6 flex flex-col";
export const SOCIAL_FEED_ASIDE_SUBHEAD_CLASS =
  "m-0 text-[length:var(--text-base)] leading-6 font-semibold text-ink";
export const SOCIAL_FEED_ASIDE_ROWS_CLASS = "-mx-3 mt-3 flex flex-col";
export const SOCIAL_FEED_ASIDE_ROW_CLASS =
  "flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-xl)] px-3";
export const SOCIAL_FEED_ASIDE_PERSON_CLASS = "gap-3";
export const SOCIAL_FEED_ASIDE_AVATAR_CLASS = "size-10";

// ---------------------------------------------------------------------
// H · Posts (H §5.1; founder 2026-10-05). Everywhere SocialPostCard
// renders (Feed, Profile activity, a member's posts, the permalink).
// The media is the card: a photo fills the column at its true shape
// (1.91:1 to 4:5) at radius 24 with no card or frame; a video plays on
// the near-black screen (radius 24) under a band with the topic left and
// "Video" right. The register lands around the media: the credit row
// (the 40 avatar, the name 17 / 600, the time 15 ink-3), the round grey
// actions with their counts beside, the quiet ⋯, the 17 / 420 ink-2
// caption under (never clamped). A text-only post is the soft grey card
// (radius 24, pad 24, phone 16) with its body at 20 / 480 ink.
// Phone: the media meets the viewport (radius 0); the actions take their
// own row under the caption, aligned to the name. No role line: the
// founder chose "Members choose one; no line until they do" — the
// main-role picker ships later; the name block keeps its slot.
// Supersedes the Option A muted post card, the in-card author row over
// the media, the bare 40 hits, the likes line, the comment trail and the
// under-post time line.
// docs/design-locks/social-feed-register-lock-v1.md §7
// ---------------------------------------------------------------------

/** How the post face draws: a photo (or a swipe of media), a video, or text only. */
export type SocialPostKind = "photo" | "video" | "text";

/** Where a round action sits: on the page, or on the text post's grey card. */
export type SocialPostSurface = "page" | "card";

/** No media: text. One video: video. One still, or two or more items: photo (the frame). */
export function socialPostKind(media: readonly { kind: "image" | "video" }[]): SocialPostKind {
  if (media.length === 0) return "text";
  return media.length === 1 && media[0]?.kind === "video" ? "video" : "photo";
}

// Post wall: 24 between posts on phone, 48 on desktop (the Reels row
// takes the same gutter and adds none of its own on desktop). One list
// for the Feed, Profile activity, a member's posts and the permalink.
export const SOCIAL_FEED_GUTTER_CLASS = `flex flex-col ${HOUSE_SECTION_AIR_CLASS} md:gap-[var(--space-12)]`;

// A media post is no card: a plain block in the column.
export const SOCIAL_POST_CLASS = "block min-w-0 shrink-0";

// A text-only post: the soft grey card (H §3.4). Muted, radius 24, pad
// 24 (phone 16), no border, no shadow. Dark: the card is --surface (the
// board's dark muted) so its rounds, on --surface-muted (the board's
// dark onMuted), sit lighter than the card as they do in light (the
// build's dark --surface-muted is one step lighter than the board's,
// H §8.7, so the light mapping would invert them).
export const SOCIAL_POST_TEXT_CARD_CLASS =
  "block min-w-0 shrink-0 rounded-[var(--radius-xl)] bg-surface-muted p-4 md:p-6 dark:bg-surface";

export function socialPostClass(kind: SocialPostKind): string {
  return kind === "text" ? SOCIAL_POST_TEXT_CARD_CLASS : SOCIAL_POST_CLASS;
}

// The media block: phone meets the viewport (the frame gutter cancelled,
// radius 0); from md it is the column at radius 24, clipped.
export const SOCIAL_POST_MEDIA_CLASS =
  `relative block overflow-hidden ${SOCIAL_MOBILE_BLEED_CLASS} md:w-full md:rounded-[var(--radius-xl)]`;

// Adam lock 2026-09-25. Feed posts with 2 or more media items use one
// swipe stage. No collage grid. H register (Adam 2026-10-05): the stage
// is the post's media block (SOCIAL_POST_MEDIA_CLASS: phone meets the
// viewport, desktop radius 24) at the first still's true shape; the
// counter is the "1 / 3" chip top-right (SOCIAL_POST_COUNT_CHIP_CLASS),
// the topic chip top-left. The dots sit on the band at 72% so they read
// on any picture in both themes.
// docs/design-locks/social-feed-register-lock-v1.md §7
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

// The video's screen: near-black (--screen), the frame centred on it
// (letterbox / pillarbox), the band on top.
export const SOCIAL_POST_SCREEN_CLASS = "flex flex-col bg-screen";

// The screen band: 44, topic left and "Video" right, 13 / 500 band-ink
// at 72% (about 9.6:1 on the screen), inset 16. Wraps, never cut.
export const SOCIAL_POST_SCREEN_HEAD_CLASS =
  "flex min-h-11 items-center justify-between gap-4 px-4 py-1 text-[length:var(--text-xs)] font-medium leading-4 text-band-ink/72";
export const SOCIAL_POST_SCREEN_TOPIC_CLASS = "min-w-0 break-words";

// Chips on the photo: 28 tall, pad 10, radius full, the band at 72%,
// 13 / 500 band-ink, inset 16. The topic top-left, the counter ("1 / 3")
// top-right. Labels only: taps pass through to the photo.
const SOCIAL_POST_MEDIA_CHIP_BASE_CLASS =
  "pointer-events-none absolute top-4 z-[11] flex h-7 items-center rounded-full bg-band/72 px-2.5 text-[length:var(--text-xs)] font-medium leading-none text-band-ink";
export const SOCIAL_POST_TOPIC_CHIP_CLASS = `${SOCIAL_POST_MEDIA_CHIP_BASE_CLASS} left-4`;
export const SOCIAL_POST_COUNT_CHIP_CLASS = `${SOCIAL_POST_MEDIA_CHIP_BASE_CLASS} right-4 tabular-nums`;

// The credit avatar: a 40 circle the photo fills (no grey behind a
// photo). With no photo, the initials (15 / 600 ink-2) on muted; on the
// grey text card, on the card's onMuted (the page white; dark
// --surface-muted, see the card) so the circle still reads.
export const SOCIAL_AVATAR_POST_CLASS =
  "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[length:var(--text-sm)] font-semibold text-ink-2";
export function socialPostAvatarEmptyClass(surface: SocialPostSurface): string {
  return surface === "card" ? "bg-surface dark:bg-surface-muted" : "bg-surface-muted";
}

// Under the media: the credit row 12 down on phone, 16 on desktop. In
// the text card it starts at the card's pad. One wrapping row whose
// items reorder by breakpoint: phone is who · ⋯ / caption / actions;
// desktop is who · actions · ⋯ / caption.
export function socialPostFootClass(kind: SocialPostKind): string {
  return kind === "text"
    ? "flex flex-wrap items-center gap-x-2"
    : "mt-3 flex flex-wrap items-center gap-x-2 md:mt-4";
}

// Who: the author (avatar and name, one 44 link), the time, the group.
export const SOCIAL_POST_WHO_CLASS =
  "order-1 flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2";
export const SOCIAL_POST_AUTHOR_CLASS = "flex min-h-11 min-w-0 items-center gap-3";
// The name block: one line today. The role eyebrow's slot sits above
// the name (13 / 500 uppercase 0.06em) once members choose a main role.
export const SOCIAL_POST_NAME_STACK_CLASS = "flex min-w-0 flex-col";
export const SOCIAL_POST_NAME_CLASS =
  "min-w-0 break-words text-[length:var(--text-base)] font-semibold leading-6 text-ink";
// A group follows the time as "· Group": a 44-tall hit that wraps.
export const SOCIAL_POST_GROUP_CLASS =
  "inline-flex min-h-11 min-w-0 items-center break-words text-[length:var(--text-sm)] leading-6 text-ink-2";

// The time: 15, ink-3 on the page (ink-2 in dark, as the Feed's quiet
// ink), ink-2 on the grey card (ink-3 fails on muted). The permalink is
// a 44 hit that starts at the text, so the name keeps its 8.
export const SOCIAL_POST_TIME_CLASS =
  `inline-flex min-h-11 min-w-11 items-center text-[length:var(--text-sm)] leading-6 tracking-normal tabular-nums ${SOCIAL_FEED_QUIET_INK_CLASS}`;
export const SOCIAL_POST_TIME_CARD_CLASS =
  "inline-flex min-h-11 min-w-11 items-center text-[length:var(--text-sm)] leading-6 tracking-normal tabular-nums text-ink-2";

export function socialPostTimeClass(surface: SocialPostSurface): string {
  return surface === "card" ? SOCIAL_POST_TIME_CARD_CLASS : SOCIAL_POST_TIME_CLASS;
}

// Actions: Like, Comment, Share as round grey buttons (40 desktop, 44
// phone), 8 apart, counts beside. Desktop: right of the credit. Phone:
// their own row under the caption, aligned to the name (52 = the 40
// avatar + 12) on a media post, to the body on a text post.
export function socialPostActionsClass(kind: SocialPostKind): string {
  return kind === "text"
    ? "order-4 mt-3 flex basis-full items-center gap-2 md:order-2 md:mt-0 md:ml-auto md:basis-auto"
    : "order-4 mt-3 flex basis-full items-center gap-2 pl-[52px] md:order-2 md:mt-0 md:ml-auto md:basis-auto md:pl-0";
}

// The round grey action (H §3.3 round grey): muted on the page; on the
// grey card, the board's "onMuted", lighter than the card in both
// themes: the page white (--surface) in light, --surface-muted on the
// dark card (--surface). Glyph 20 ink.
const SOCIAL_POST_ROUND_FACE_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors md:size-10";
const SOCIAL_POST_ROUND_ON_CARD_FILL_CLASS = "bg-surface dark:bg-surface-muted";
export const SOCIAL_POST_ROUND_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} bg-surface-muted hover:bg-hairline active:opacity-70`;
export const SOCIAL_POST_ROUND_CARD_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} ${SOCIAL_POST_ROUND_ON_CARD_FILL_CLASS} hover:bg-hairline active:opacity-70`;
// The same face inside a wider button (Comment: the round and its count).
export const SOCIAL_POST_ROUND_IN_GROUP_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} bg-surface-muted group-hover:bg-hairline`;
export const SOCIAL_POST_ROUND_IN_GROUP_CARD_CLASS =
  `${SOCIAL_POST_ROUND_FACE_CLASS} ${SOCIAL_POST_ROUND_ON_CARD_FILL_CLASS} group-hover:bg-hairline`;

export function socialPostRoundClass(surface: SocialPostSurface, inGroup = false): string {
  if (inGroup) return surface === "card" ? SOCIAL_POST_ROUND_IN_GROUP_CARD_CLASS : SOCIAL_POST_ROUND_IN_GROUP_CLASS;
  return surface === "card" ? SOCIAL_POST_ROUND_CARD_CLASS : SOCIAL_POST_ROUND_CLASS;
}

// Liked: the filled heart in the accent (a glyph on grey, 3:1+ both themes).
export const SOCIAL_POST_ROUND_LIKED_CLASS = "text-accent";

/** Round action glyph: 20 (H §3.3). The stage rails keep 24. */
export const SOCIAL_POST_ROUND_GLYPH = 20;

// The count beside a round: 15 / 500 ink-2, tabular, in a 44 (desktop
// 40) box so the phone hit stays whole. Likes: its own button (it opens
// who liked); comments: inside the Comment button.
export const SOCIAL_POST_COUNT_CLASS =
  "inline-flex h-11 min-w-11 items-center justify-center px-1 text-[length:var(--text-sm)] font-medium tabular-nums text-ink-2 md:h-10 md:min-w-10";
export const SOCIAL_POST_COMMENT_CLASS = "group inline-flex shrink-0 items-center rounded-full";
export const SOCIAL_POST_LIKE_CLASS = "relative inline-flex shrink-0 items-center";

// The quiet ⋯ (owner menu): a 44 (desktop 40) clear hit, glyph 20
// ink-2. Phone: the credit row's end, its glyph pulled to the 16 edge.
export const SOCIAL_POST_MORE_CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hairline md:size-10";
export const SOCIAL_POST_MORE_SLOT_CLASS = "order-2 -mr-3 flex md:order-3 md:mr-0";

// The caption: under the credit row, aligned to the name (52), 17 / 420
// ink-2 line 1.5 on desktop, 15 / 1.45 on phone. Wraps; never clamped.
export const SOCIAL_POST_CAPTION_CLASS =
  "order-3 mt-2 basis-full whitespace-pre-wrap break-words pl-[52px] text-[length:var(--text-sm)] leading-[1.45] text-ink-2 md:order-4 md:text-[length:var(--text-base)] md:leading-normal";

// A text-only post's body: 20 / 480 ink, -0.02em, line 1.4, the card's
// full width, 12 under the credit row.
export const SOCIAL_POST_TEXT_BODY_CLASS =
  "order-3 mt-3 basis-full whitespace-pre-wrap break-words text-[length:var(--text-lg)] leading-[1.4] [font-weight:var(--type-title-weight)] tracking-[-0.02em] text-ink md:order-4";

export function socialPostBodyClass(kind: SocialPostKind): string {
  return kind === "text" ? SOCIAL_POST_TEXT_BODY_CLASS : SOCIAL_POST_CAPTION_CLASS;
}

export const SOCIAL_FIRST_WIN_CLASS =
  "flex flex-col items-center justify-center gap-2.5 rounded-[8px] border border-hairline bg-surface px-5 pb-4 pt-5 text-center";

export const SOCIAL_AVATAR_SM_CLASS =
  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted t-body-sm font-medium text-ink-2";

// Person row and create-author stack. Primary is body; secondary is
// body-sm. Wrap. Never an 11px crumb.
export const SOCIAL_PERSON_PRIMARY_CLASS = "block break-words t-body font-semibold text-ink";

export const SOCIAL_PERSON_SECONDARY_CLASS = "block break-words t-body-sm text-ink-2";

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
// Rail ~320. Stage muted. Two cards. Phone stacks.
export const SOCIAL_STORY_CREATE_HOST_CLASS =
  "flex min-h-full flex-1 flex-col bg-surface md:min-h-full md:flex-row";

export const SOCIAL_STORY_CREATE_RAIL_CLASS =
  "flex w-full shrink-0 flex-col border-hairline bg-surface p-[var(--space-4)] md:w-[320px] md:border-r";

export const SOCIAL_STORY_CREATE_CLOSE_CLASS =
  "flex size-10 items-center justify-center rounded-full text-ink";

export const SOCIAL_STORY_CREATE_TITLE_CLASS = "t-heading mt-[var(--space-4)] text-ink";

export const SOCIAL_STORY_CREATE_IDENTITY_CLASS =
  "mt-[var(--space-6)] flex items-center gap-[var(--space-3)]";

export const SOCIAL_STORY_CREATE_NAME_CLASS =
  "t-body min-w-0 text-ink whitespace-normal break-words";

export const SOCIAL_STORY_CREATE_STAGE_CLASS =
  "flex min-h-[70vh] flex-1 flex-col bg-surface-muted md:min-h-full";

export const SOCIAL_STORY_CREATE_CARDS_CLASS =
  "flex flex-1 flex-col items-stretch justify-center gap-[var(--space-4)] p-[var(--space-4)] md:flex-row md:items-center md:justify-center md:gap-[var(--space-6)]";

export const SOCIAL_STORY_CREATE_CARD_CLASS =
  "flex w-full min-h-[200px] flex-col items-center justify-center gap-[var(--space-4)] rounded-[var(--radius-lg)] px-[var(--space-4)] py-[var(--space-6)] text-center md:h-[420px] md:w-[280px] md:min-w-[220px] md:max-w-[280px] md:shrink-0";

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
