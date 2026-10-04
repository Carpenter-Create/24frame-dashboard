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
  HOUSE_CHIP_RAIL_CLASS,
  HOUSE_CHIP_RAIL_ROW_CLASS,
  HOUSE_CHIP_RAIL_STACK_CLASS,
} from "@/lib/house-chip-rail";
import {
  HOUSE_FILTER_OFF_CLASS,
  HOUSE_FILTER_ON_CLASS,
  HOUSE_MODULE_CLASS,
  HOUSE_PILL_SELECTED_CLASS,
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

// Home spine only. Phone SoT. Density lock v1.1: 8 between Topics,
// composer, Stories, and the feed (supersedes v1's 16). Profile,
// Explore, and Messages keep the shared gap-2 center.
export const SOCIAL_HOME_SPINE_CLASS = "gap-[var(--space-2)]";

// Topics sit between the header hairline and the composer top rule.
// Desktop top air is the shared header inset (8), matching the spine
// gap, so this host does not pull on desktop. Phone frame top stays
// 16; the phone-only pull restores equal 8 air. Pill hit stays 32.
export const SOCIAL_HOME_TOPICS_CLASS =
  "min-w-0 py-0 max-md:-mt-[var(--space-2)]";

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

// Home tall FB-style cards. Phone SoT 136×240; desktop follows at 144×256.
// Density lock v1.1 — do not shrink back to v1 120×208, and do not
// shrink sparse rails (≤2 cards) or invent empty placeholders.
export const SOCIAL_HOME_STORY_CARD_CLASS =
  `relative h-[240px] w-[136px] shrink-0 overflow-hidden ${SOCIAL_SURFACE_RADIUS_CLASS} border border-hairline bg-surface md:h-[256px] md:w-[144px]`;

// Rail pad H 0, top 0, bottom 8. Gap 8. Same on phone and desktop.
export const SOCIAL_HOME_STORIES_TRACK_CLASS = "flex w-max gap-2 px-0 pt-0 pb-2";

// Create plate stays 72 phone / 80 md. The larger card grows the upper
// media face. Seam = card height − plate (168 phone / 176 md).
export const SOCIAL_HOME_STORY_CREATE_FACE_CLASS =
  "absolute inset-x-0 top-0 h-[168px] overflow-hidden bg-surface-muted md:h-[176px]";

// Accent circle + white plus glyph. Not a white-fill well (Plus fill
// knockout reads as white disc / blue +). border-surface is the seam
// ring only — not the well fill. Phone + desktop share this class.
// Centered on the photo/plate seam (168 phone / 176 md). 36 phone / 40 md.
export const SOCIAL_HOME_STORY_PLUS_CLASS =
  "absolute left-1/2 top-[150px] z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-surface bg-accent text-accent-contrast md:top-[156px] md:size-10";

// Adam 2026-09-20 — Create Story is Social chrome, not an eyebrow.
// t-label uppercase + 0.12em track stacked CREATE / STORY as a
// leftover specialty face. Same token as Topics / Share something /
// Create sheet tiles. One SoT for phone + desktop — no device fork.
export const SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS =
  "t-body-sm font-medium text-ink";

export const SOCIAL_HOME_STORY_CREATE_LABEL_CLASS =
  `absolute inset-x-0 bottom-0 flex h-[72px] items-center justify-center bg-surface px-2 text-center ${SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS} md:h-20`;

export const SOCIAL_HOME_STORY_FACE_RING_CLASS =
  "absolute left-2 top-2 z-10 flex size-8 items-center justify-center overflow-hidden rounded-full border-2 bg-surface p-[2px] md:size-9";

export const SOCIAL_HOME_STORY_FACE_CLASS =
  "flex size-full items-center justify-center overflow-hidden rounded-full bg-surface t-label font-semibold text-ink";

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

// Home composer share stage. Phone SoT; desktop uses this same row.
// FB-row lock v1.6. White band, pad Y 8, pad H 16. Content is 40,
// so the band is 56 before the rules. Hairline is top and bottom
// only: no side stroke, radius 0. The rules are the host borders.
// No sibling divider above the band.
// Field stays v1.2: transparent, no border, no shadow, no outline.
// Radius 20 is hit geometry only. Gap avatar→field 8.
// Photo then Camera stay v1.1: glyph 16, hit 32, gap 0, 8px after the
// field, ink-2. No labels. No Live/Feeling strip.
export const SOCIAL_COMPOSER_CLASS =
  "flex w-full items-center rounded-none border-x-0 border-y border-hairline bg-surface px-[var(--space-4)] py-[var(--space-2)] text-left";

export const SOCIAL_COMPOSER_ROW_CLASS =
  "flex min-w-0 flex-1 items-center gap-[var(--space-2)]";

// 8px after the field. Hits sit flush.
export const SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS =
  "ml-[var(--space-2)] flex shrink-0 items-center gap-0";

export const SOCIAL_COMPOSER_AFFORDANCE_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center bg-transparent text-ink-2";

export const SOCIAL_COMPOSER_FIELD_CLASS =
  "flex h-10 min-w-0 flex-1 items-center rounded-[20px] border-0 bg-transparent px-[var(--space-4)] t-body text-ink-2 outline-none";

export const SOCIAL_COMPOSER_MEDIA_CLASS =
  "relative flex size-9 shrink-0 cursor-pointer items-center justify-center text-ink-2";

export const SOCIAL_FOLLOW_COMPACT_CLASS =
  "inline-flex items-center rounded-[8px] bg-accent px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-accent-contrast";

export const SOCIAL_FOLLOW_COMPACT_IDLE_CLASS =
  "inline-flex items-center rounded-[8px] border border-hairline bg-surface px-[var(--space-3)] py-[var(--space-2)] t-body-sm font-semibold text-ink";

export const SOCIAL_FOR_YOU_CARD_CLASS =
  `${HOUSE_MODULE_CLASS} flex w-full flex-col gap-2 p-4`;

// Phone only. The social frame pads 16. These utilities cancel that
// gutter so a row meets the viewport. They are max-md, so desktop
// column inset stays. Stories rail uses this. The feed card does not.
// Do not put them on the composer, Topics, or SOCIAL_FEED_ROW_CLASS.
export const SOCIAL_MOBILE_BLEED_CLASS =
  "max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]";

// Restores the 16 a viewport bleed removed. The feed card does not
// use it. The frame gutter is the white side canvas.
export const SOCIAL_MOBILE_BLEED_PAD_CLASS = "max-md:px-[var(--chrome-gutter)]";

// Option A. Each post is a muted surface card on the white page.
// HOUSE_MODULE_CLASS is the card (radius-lg, surface-muted, no drop shadow).
// The #715 2px rules are off this row: they double-stacked with the
// card edge. No second rule. No shadow. Phone and desktop share it.
// No md fork for color or radius.
// The card does not bleed to the phone viewport. The frame gutter is
// the white side canvas. Do not put SOCIAL_MOBILE_BLEED_CLASS here.
// overflow-hidden clips media to the card radius.
// pb space-6 stays under the time, inside the card. It is not the
// separator. The separator is this card plus the gutter gap.
// Was space-4. The step up is the house 24, not a new scale.
// docs/design-locks/social-home-post-separation-lock-v1.md
// docs/design-locks/social-feed-under-post-time-lock-v1.md
export const SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS = "pb-[var(--space-6)]";

// Media → actions. The 24px glyph sits 8px down inside the 40 hit.
// mt-0 leaves that pad as the picture-to-glyph air (~8px).
// The #725 -mt space-1 pull (~4px, and the top of the hit overlapping
// the picture) is out. A positive margin is the old paragraph air.
// The hit stays 40×40 and no longer overlaps the picture.
// Text-only keeps SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS (8).
// docs/design-locks/social-home-post-separation-lock-v1.md
export const SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS = "mt-0";

// Icon row, then the likes / caption / time block. space-1 (4px)
// so the text is not glued to the glyphs. The 8px pad under the
// glyph stays inside the 40 hit. The #725 -mb space-1 pull is out:
// it drew the copy up into that pad. Feed card only — the immersive
// dock does not use this class.
export const SOCIAL_FEED_ACTIONS_META_CLASS =
  "flex flex-col gap-[var(--space-1)]";

// Likes, caption, comment trail, under-post time. 1.5 line-space:
// space-1 between the line boxes, leading-normal (1.5) on the copy.
// Not the #725 gap-0 collision, and not the space-2 / space-4
// paragraph gaps. Missing likes or caption drop out. Time stays
// its own line.
export const SOCIAL_FEED_META_ROW_GAP_CLASS =
  "flex flex-col gap-[var(--space-1)]";

// t-body-sm is line-height 1.6. leading-tight (1.25) was the #725
// single line-space and the lines read as one block. leading-normal
// is 1.5. Time stays SOCIAL_POST_TIME_CLASS (leading-none).
export const SOCIAL_FEED_META_COPY_CLASS = "leading-normal";

// Text-only keeps the prior 8 between the author row and actions.
// Text-only grammar itself stays frozen.
export const SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS = "mt-[var(--space-2)]";

// Block, not column flex. Callers put this on an inner row. The gutter's
// flex item is the shell (`block min-w-0 shrink-0` on the article), not
// this padded box. Mobile Safari drops padding-bottom on that column-flex
// item, so the caption sits on the next author. The inner row's border box,
// including this padding, sets the shell's height. A negative margin-bottom
// on the last child eats this padding the same way.
// shrink-0 on the shell is the gutter's main axis (vertical): the list
// scrolls instead of compressing the air.
// The card is HOUSE_MODULE_CLASS. overflow-hidden clips a full-width
// image to radius-lg. No viewport bleed. No border-y-2.
export const SOCIAL_FEED_ROW_CLASS =
  `block shrink-0 overflow-hidden ${HOUSE_MODULE_CLASS} ${SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS}`;

// Feed media fills the card width. px-0. It does not cancel the frame gutter:
// the card edge is the media edge, and the row clips the corners.
// mt space-4 is the author → media air (was space-2). Flex gap is gone
// so this margin is the only author-to-media space.
export const SOCIAL_POST_MEDIA_CLASS =
  "mt-[var(--space-4)] flex w-full flex-col gap-2 px-0";

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

// Named 16 inset family (--space-4). The feed row does not stack this
// on the phone bleed pad or the desktop frame pad — one 16 only.
// Author and meta use it. Media stays px-0 on SOCIAL_POST_MEDIA_CLASS.
export const SOCIAL_FEED_CHROME_CLASS = "px-[var(--space-4)]";

// Card edge → author. Horizontal 16 and top 16. The top was flush.
export const SOCIAL_FEED_AUTHOR_EDGE_CLASS = `${SOCIAL_FEED_CHROME_CLASS} pt-[var(--space-4)]`;

// Card edge → actions, likes, caption, and time. Same horizontal 16.
// The media→actions margin is the air above this block.
export const SOCIAL_FEED_META_EDGE_CLASS = SOCIAL_FEED_CHROME_CLASS;

// Like · Comment · Share. One triplet on phone and desktop.
// Hit 40, glyph 24 centered, gap 8 between hit edges.
// Phosphor Heart ink sits about 1px above the bubble in both
// weights, so both states share one translateY(1px). No other nudge.
// Feed card and immersive row share SOCIAL_POST_ACTIONS_GAP_CLASS.
// docs/design-locks/social-home-post-actions-align-lock-v1.md
// docs/design-locks/social-home-density-craft-sequel-lock-v1.md
export const SOCIAL_POST_ACTIONS_GAP_CLASS = "gap-2";

export const SOCIAL_POST_ACTIONS_CLASS =
  `flex flex-row items-center ${SOCIAL_POST_ACTIONS_GAP_CLASS}`;

// Glyph is 24 centered in the 40 hit, so the optical edge sits 8
// inside the hit. Pull the row back by that 8 so the glyph meets the
// same 16 text edge as likes and caption.
// docs/design-locks/social-home-craft-wave-1-lock-v1.md
export const SOCIAL_POST_ACTIONS_OPTICAL_CLASS = "-ml-[var(--space-2)]";

export const SOCIAL_POST_ACTION_HIT_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center text-ink-2 active:opacity-70";

export const SOCIAL_POST_ACTION_HEART_NUDGE_CLASS = "translate-y-px";

// Liked heart on a dark stage. Sporty Blue from the post-actions lock.
// Dark-mode --accent is the soft flip, not this control.
// docs/design-locks/social-home-post-actions-align-lock-v1.md
export const SOCIAL_POST_ACTION_LIKED_CLASS = "text-[#1769FF]";

// Phone only. Under the Home Stories rail, same hairline as the feed.
// The host is already bled, so the rule meets the viewport.
// Desktop stays without it.
// docs/design-locks/social-home-stories-feed-hairline-lock-v1.md
export const SOCIAL_STORIES_FEED_RULE_CLASS =
  "max-md:border-b max-md:border-solid max-md:border-hairline";

// Adam lock 2026-09-25. Feed posts with 2 or more media items use one
// swipe stage. The stage is the card width. The row's overflow-hidden
// clips it to the card radius. It does not meet the phone viewport.
// N=1 keeps socialMediaFrameClass. No collage grid.
export const SOCIAL_FEED_CAROUSEL_BLEED_CLASS = "relative px-0";

export const SOCIAL_FEED_CAROUSEL_TRACK_CLASS =
  "no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain";

export const SOCIAL_FEED_CAROUSEL_SLIDE_CLASS =
  "social-feed-carousel-slide relative w-full min-w-full shrink-0 snap-start overflow-hidden bg-surface-muted";

export const SOCIAL_FEED_CAROUSEL_COUNT_CLASS =
  "absolute right-[var(--space-3)] top-[var(--space-3)] z-10 rounded-full bg-ink/70 px-[var(--space-2)] py-[var(--space-1)] t-body-sm text-accent-contrast";

export const SOCIAL_FEED_CAROUSEL_DOTS_CLASS =
  "absolute bottom-[var(--space-3)] left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-[var(--space-2)] rounded-full bg-ink/50 px-[var(--space-2)]";

export const SOCIAL_FEED_CAROUSEL_DOT_HIT_CLASS =
  "flex size-6 shrink-0 items-center justify-center";

export const SOCIAL_FEED_CAROUSEL_DOT_CLASS = "size-2 rounded-full bg-accent-contrast/50";

export const SOCIAL_FEED_CAROUSEL_DOT_ACTIVE_CLASS = "size-2 rounded-full bg-accent-contrast";

// Feed photo scale + tap immersive v1.
// docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md
// Width stays the full-bleed media class. Height cap lives on
// socialMediaFrameClass and the carousel slide rule. Immersive
// actions cite the align lock: hit 40, glyph 24, gap 8.
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
export const SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS = "hidden md:contents";

// Desktop header chip. Hidden below md so phone Explore has no Exit.
// Filled ink on the light header so it reads as a control, not body text.
export const SOCIAL_EXPLORE_EXIT_CLASS =
  "hidden h-[var(--header-control-size)] min-h-[var(--header-control-size)] shrink-0 items-center gap-[var(--space-2)] whitespace-nowrap rounded-full bg-ink px-[var(--space-3)] t-body font-medium text-surface md:inline-flex";

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

// Under-post separator. House tertiary text-ink-3, the muted token.
// Not primary ink. Not text-ink-2.
// Never t-label (uppercase + 0.12em track turns `10h` into `10 H`).
// Own line: wrap instead of truncating. No breakpoint fork.
// block + leading-none: the permalink <a> must not grow a body 1.6
// strut under the glyphs. That strut is what opened the next-author gap.
// docs/design-locks/social-feed-under-post-time-lock-v1.md
export const SOCIAL_POST_TIME_CLASS =
  "block self-start max-w-full break-words text-[length:var(--text-xs)] font-normal leading-none tracking-normal text-ink-3";

// Option A. The gutter is the white page between surface cards.
// HOUSE_SECTION_AIR_CLASS is the only gap. No larger gap. No muted
// fill in the gap. No divide-y — a divide would sit beside the card
// edge. Home, Profile Activity, and author history share this list.
// docs/design-locks/social-home-post-separation-lock-v1.md
// docs/design-locks/social-home-craft-wave-1-lock-v1.md
export const SOCIAL_FEED_GUTTER_CLASS = `flex flex-col ${HOUSE_SECTION_AIR_CLASS}`;

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
// the unlayered global :focus-visible rule.
export const SOCIAL_PROFILE_COVER_DRAG_CLASS =
  "absolute inset-0 z-30 grid grid-cols-1 grid-rows-1 overflow-hidden rounded-[var(--radius-xl)] bg-band touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]! focus-visible:rounded-[var(--radius-xl)]! data-[slack]:cursor-grab data-[slack]:active:cursor-grabbing";

// The editor preview inside the drag surface. In flow, never positioned.
export const SOCIAL_PROFILE_COVER_DRAG_IMAGE_CLASS =
  "block size-full object-cover [grid-area:1/1]";

// Phone-safe outline: the centred, full-height part of the frame phones
// show. Its box is set inline from coverPhoneSafeRegion, the one function
// the phone hero's geometry is tested against. In flow in the same grid
// cell, so it never covers the focus ring. Nothing outside it is dimmed:
// desktop shows the whole frame. A dashed band-ink line with a band
// hairline reads on any photo.
export const SOCIAL_PROFILE_COVER_PHONE_OUTLINE_CLASS =
  "pointer-events-none flex flex-col items-start self-start justify-self-start border-2 border-dashed border-band-ink outline outline-1 outline-band/60 [grid-area:1/1]";

export const SOCIAL_PROFILE_COVER_PHONE_LABEL_CLASS =
  "m-2 rounded-full bg-band/75 px-2 py-0.5 text-[length:var(--text-xs)] font-medium text-band-ink";

// Owner trail under the hero: the cover editor's hint, public note,
// Cancel/Save and errors, and the inline avatar crop, portal here. Never
// over the image. Empty (hidden) unless one of them is showing.
export const SOCIAL_PROFILE_HEAD_TRAIL_CLASS =
  "mt-3 flex min-w-0 flex-col gap-[var(--space-2)] empty:hidden";

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

// Home Topics uses the house chip rail host. Not SegmentedTrack: lenses
// stay discrete chips (All first). Selected uses HOUSE_PILL_SELECTED_CLASS
// (accent fill + white). Density lock v1.1: chip hit is SOCIAL_CHIP_HIT_CLASS
// (32 / h-8), not the fat HOUSE_CHIP_RAIL_CHIP_CLASS. Type stays t-body-sm.
// One horizontal row. Phone scrolls — never truncate. HOUSE_CHIP_RAIL_ROWS
// stays 2 for every other chip-rail consumer.
export const SOCIAL_TOPIC_RAIL_ROWS = 1;
export const SOCIAL_TOPIC_RAIL_CLASS = HOUSE_CHIP_RAIL_CLASS;
export const SOCIAL_TOPIC_RAIL_STACK_CLASS = HOUSE_CHIP_RAIL_STACK_CLASS;
export const SOCIAL_TOPIC_CHIP_ROW_CLASS = HOUSE_CHIP_RAIL_ROW_CLASS;
export const SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS =
  `relative z-10 cursor-pointer select-none ${SOCIAL_CHIP_HIT_CLASS}`;
export const SOCIAL_TOPIC_RAIL_CHIP_CLASS =
  `${SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS} ${HOUSE_FILTER_OFF_CLASS}`;
export const SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS =
  `${SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS} ${HOUSE_PILL_SELECTED_CLASS}`;

export function socialTopicRailChipClass(selected: boolean): string {
  return selected ? SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS : SOCIAL_TOPIC_RAIL_CHIP_CLASS;
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
