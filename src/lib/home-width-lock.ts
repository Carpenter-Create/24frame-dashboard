// Home width SoT. Stamp: HOME-width-lock.md.
// Desktop shell L/R follow shell-desktop-horizontal-gutter-lock-v2 (32 / 32).
// Header stays full-bleed. Phone unchanged. Home shows the dest rail
// since 2026-10-04 (shell-unified-chrome-lock-v1): main starts after
// --sidebar-width and the 32 / 32 sit inside main. HOME_CONTENT_COLUMN_PX
// is the rail-free frame (Co-Productions); HOME_RAIL_CONTENT_COLUMN_PX
// is /home and /home/news with the rail open.

export const HOME_FIGMA_FRAME_PX = 1440;
/** Desktop shell inline start. Matches `--shell-gutter-inline-start`. */
export const HOME_LEFT_INSET_PX = 32;
/** Desktop shell inline end. Matches `--shell-gutter-inline-end`. */
export const HOME_RIGHT_INSET_PX = 32;
export const HOME_CONTENT_COLUMN_PX =
  HOME_FIGMA_FRAME_PX - HOME_LEFT_INSET_PX - HOME_RIGHT_INSET_PX;
/** Dest-rail slot Home sits behind. Matches `--sidebar-width` (200,
 *  screening chrome; was 256). */
export const HOME_DEST_RAIL_PX = 200;
export const HOME_RAIL_CONTENT_COLUMN_PX = HOME_CONTENT_COLUMN_PX - HOME_DEST_RAIL_PX;

export const HOME_WIDTH_LOCK = {
  figmaFrame: HOME_FIGMA_FRAME_PX,
  leftInset: HOME_LEFT_INSET_PX,
  rightInset: HOME_RIGHT_INSET_PX,
  contentColumn: HOME_CONTENT_COLUMN_PX,
} as const;
