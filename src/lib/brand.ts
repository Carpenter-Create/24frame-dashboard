// Brand marks. Phone lead (max-md / iPhone-class) uses Asset 8
// emblem (`BRAND_EMBLEM_SRC`). md+ (iPad + desktop) uses the full
// 24Frame wordmark — Asset 4 (light, colored) and Asset 1 (dark,
// colored). Same SoT for Aggregation · Social · Education ·
// Overview. No workspace forks. Favicon / apple / PWA is the 1080
// PNG (Sporty Blue field, white 24 + corners). That PNG supersedes
// Asset 10 SVG for favicon/PWA only.

export const BRAND_LOGO_LIGHT_SRC = "/brand/24frame-logo-light.svg";
export const BRAND_LOGO_DARK_SRC = "/brand/24frame-logo-dark.svg";
export const BRAND_LOGO_VIEWBOX = "0 0 1087.49 280.11";
/** Optical height in the lead chrome. Brief range is 20–28. */
export const BRAND_LOGO_HEIGHT_PX = 24;

export const BRAND_EMBLEM_SRC = "/brand/24frame-emblem.svg";
/** Phone lead only. Hidden from the house `md` (768) split. */
export const BRAND_PHONE_EMBLEM_CLASS = "h-5 w-auto md:hidden";
/** Wordmark from `md` up. Hidden on phone. */
export const BRAND_DESKTOP_WORDMARK_CLASS = "hidden h-5 w-auto md:h-6";
/** The same emblem at every width: the collapsed (80) side menu's top
 *  band, where the 93-wide wordmark does not fit. */
export const BRAND_RAIL_EMBLEM_CLASS = "h-5 w-auto";
export const BRAND_ICON_SRC = "/brand/24frame-favicon.png";
export const BRAND_ICON_TYPE = "image/png";
export const BRAND_ICON_SIZE = "1080x1080";

export const BRAND_EMBLEM_VIEWBOX = "0 0 1055 634.59";
export const BRAND_ICON_VIEWBOX = "0 0 490.04 490.04";

export const BRAND_MARK_FILL = "#1769FF";
export const BRAND_CORNER_FILL_LIGHT = "#14171A";
export const BRAND_CORNER_FILL_DARK = "#fff";
export const BRAND_ICON_TILE_FILL = "#050835";

export const BRAND_EMBLEM_TWO_PATH =
  "M507.41,444.37v60.09H234.32v-29.52c0-30.57,4.31-55.52,12.91-74.86,8.61-19.33,21.36-35.32,38.22-47.99,16.88-12.64,37.44-24.24,61.7-34.78l11.59-5.29c22.14-10.19,39.89-20.29,53.25-30.3,13.13-9.83,19.8-22.65,20-38.44.02-.27.02-.56.02-.83,0-8.79-2.1-17.06-6.31-24.79-4.24-7.72-10.64-14.05-19.27-18.98-8.61-4.91-19.58-7.38-32.93-7.38s-24.95,2.72-34.81,8.18c-9.83,5.44-17.3,12.73-22.39,21.88-3.72,6.64-6.06,13.96-7.07,21.92h-71.29c1.81-23.7,8.34-43.66,19.56-59.9,12.67-18.26,29.43-31.89,50.35-40.85,20.92-8.97,43.84-13.45,68.81-13.45,27.41,0,50.5,4.84,69.33,14.5,18.8,9.68,33.11,22.77,42.97,39.29,9.84,16.53,14.76,34.96,14.76,55.34,0,1.7-.05,3.39-.11,5.07-1.05,22.68-9.21,43.75-24.41,63.21-16.35,20.92-44.02,40.7-83.04,59.32l-21.07,10.01c-15.81,7.38-28.39,14.67-37.71,21.88-9.3,7.2-15.9,14.49-19.76,21.88-3.88,7.38-5.8,15.65-5.8,24.79h195.58Z";

export const BRAND_EMBLEM_FOUR_POINTS =
  "822.14 389.48 600.62 389.48 779.31 135.43 699.34 135.43 525.36 380.04 525.36 439.12 728.21 439.12 728.21 504.46 795.17 504.46 795.17 474.29 747.77 438.64 822.14 438.64 822.14 389.48";

export const BRAND_EMBLEM_FOUR_DOT_PATH =
  "M800.99,317.34c0-21.62-17.52-39.14-39.14-39.14s-39.14,17.53-39.14,39.14,17.53,39.14,39.14,39.14,39.14-17.53,39.14-39.14";

export const BRAND_EMBLEM_CORNER_BR_POINTS =
  "817.9 634.59 817.9 559.85 1031.45 559.85 982.26 522.57 982.26 390.98 1055 390.98 1055 634.59 817.9 634.59";

export const BRAND_EMBLEM_CORNER_TL_POINTS =
  "237.1 0 237.1 74.74 23.55 74.74 72.74 112.02 72.74 243.61 0 243.61 0 0 237.1 0";
