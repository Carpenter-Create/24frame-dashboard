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
export const SOCIAL_ICON_SIZE_PROFILE_LINK = 20;
// Profile action-row Share is the glyph inside a 44px hit.
export const SOCIAL_ICON_SIZE_SHARE = 20;
export const SOCIAL_ICON_SIZE_PROFILE_PLAY = 16;
export const SOCIAL_ICON_SIZE_SHARE_SHEET_CLOSE = 18;
export const SOCIAL_ICON_SIZE_SHARE_SHEET_ACTION = 22;
export const SOCIAL_ICON_SIZE_STORY_PICKER = 24;
export const SOCIAL_ICON_SIZE_STORY_PICKER_CLOSE = 18;
export const SOCIAL_ICON_SIZE_STORY_FOOTNOTE = 14;
export const SOCIAL_ICON_SIZE_STORY_STUDIO = 20;
export const SOCIAL_ICON_SIZE_STORY_PLAY = 28;
