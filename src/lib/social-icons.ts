import type { CoverNudgeDirection } from "@/lib/social-profile-cover-frame";

// Social workspace Phosphor lock (Adam). Aggregation chrome and every
// dest rail (Social included) use NavGlyph / phosphor-icon.
// Bold for idle. Fill for the active job.

export const SOCIAL_PHOSPHOR_ICONS = [
  "house",
  "compass",
  "plus",
  "chat-circle",
  "user",
  "check",
  "image",
  "users",
  "warning-circle",
  "camera",
  "video-camera",
  "caret-left",
  "caret-right",
  "caret-up",
  "caret-down",
  "x",
  "heart",
  "film-strip",
  "film-slate",
  "squares-four",
  "magnifying-glass",
  "tray",
  "paper-plane-tilt",
  "play",
  "pause",
  "speaker-high",
  "speaker-slash",
  "share-network",
  "link",
  "download-simple",
  "text-t",
  "upload-simple",
  "camera-rotate",
  "lightning",
  "pencil-simple",
  "check-circle",
  "trash",
  "broadcast",
] as const;

export type SocialPhosphorIconName = (typeof SOCIAL_PHOSPHOR_ICONS)[number];

export const SOCIAL_ICON_SIZE_NAV = 20;
export const SOCIAL_ICON_SIZE_TAB = 22;
export const SOCIAL_ICON_SIZE_EMPTY = 40;
export const SOCIAL_ICON_SIZE_STORY_CREATE = 28;
export const SOCIAL_ICON_SIZE_STORY_PLUS = 20;
export const SOCIAL_ICON_SIZE_COMPOSER = 22;
export const SOCIAL_ICON_SIZE_CREATE_TILE = 32;
export const SOCIAL_ICON_SIZE_SEARCH = 16;
/** Post Like / Comment / Share glyph. Hit stays 40. */
export const SOCIAL_ICON_SIZE_POST_ACTION = 24;
export const SOCIAL_ICON_SIZE_HEADER = 20;
// Profile Stage links (docs/design-locks/social-profile-stage-lock-v1.md):
// quiet icon-only socials at 15, the website globe at 14 beside its host.
export const SOCIAL_ICON_SIZE_PROFILE_LINK = 15;
export const SOCIAL_ICON_SIZE_PROFILE_WEBSITE = 14;
// Edit cover pencil: in the desktop glass pill and the phone circle.
export const SOCIAL_ICON_SIZE_COVER_EDIT = 15;
// Cover editor nudge pad glyphs, by direction (social-profile-cover-grid-nudge-lock-v1).
export const SOCIAL_PROFILE_COVER_NUDGE_ICONS = {
  left: "caret-left",
  up: "caret-up",
  down: "caret-down",
  right: "caret-right",
} as const satisfies Record<CoverNudgeDirection, SocialPhosphorIconName>;
export const SOCIAL_ICON_SIZE_PROFILE_PLAY = 16;
export const SOCIAL_ICON_SIZE_SHARE_SHEET_CLOSE = 18;
export const SOCIAL_ICON_SIZE_SHARE_SHEET_ACTION = 22;
export const SOCIAL_ICON_SIZE_STORY_PICKER = 24;
export const SOCIAL_ICON_SIZE_STORY_PICKER_CLOSE = 18;
export const SOCIAL_ICON_SIZE_STORY_FOOTNOTE = 14;
export const SOCIAL_ICON_SIZE_STORY_STUDIO = 20;
export const SOCIAL_ICON_SIZE_STORY_PLAY = 28;
