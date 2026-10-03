// Shared mobile chrome tokens for the Ask overlay history clock. One 44
// hit, one 16 tertiary glyph. History lives in overlay header chrome
// (AskFrameAiHistoryClock) — never an absolute left-edge dock. Phone
// history is the #457 in-sheet surface. The dest hamburger is gone.
// The clock is house Phosphor (Bold idle).
// MOBILE_CHROME_HAMBURGER_* and CLOCK_DOCK tokens remain so the locked
// 44/16 sheet-pad math stays testable. Not Close/44 — that object is a
// muted circle. Do not restore size-4 at left-0; that clips the glyph.

import { HOUSE_ICON_BUTTON_CLASS } from "@/lib/house-shell";

export const MOBILE_CHROME_LEAD_PAD_PX = 24;
export const MOBILE_CHROME_SHEET_PAD_PX = 16;
export const MOBILE_CHROME_MESSAGES_FRAME_PAD_PX = 48;
export const MOBILE_CHROME_ICON_HIT_PX = 44;
export const MOBILE_CHROME_ICON_GLYPH_PX = 16;

export const MOBILE_CHROME_LEAD_PAD_CLASS = "px-[var(--space-6)]";

export const MOBILE_CHROME_ICON_BUTTON_CLASS =
  `flex size-[44px] min-h-[44px] min-w-[44px] shrink-0 items-center justify-center overflow-visible ${HOUSE_ICON_BUTTON_CLASS} text-ink-3`;

export const MOBILE_CHROME_ICON_CLASS = "size-4 overflow-visible";

export const MOBILE_CHROME_HAMBURGER_BUTTON_CLASS = `${MOBILE_CHROME_ICON_BUTTON_CLASS} md:hidden`;

/** Desktop keeps the locked size-4 clock. Mobile uses the shared 44 hit. */
export const ASK_FRAME_AI_CLOCK_BUTTON_CLASS = `${MOBILE_CHROME_ICON_BUTTON_CLASS} md:size-4 md:min-h-4 md:min-w-4`;

/** Desktop left-0. Phone: sheet pad — not content-inset −24px (clips off-screen). */
export const MOBILE_CHROME_CLOCK_DOCK_CLASS =
  "absolute top-0 left-0 max-md:left-[var(--space-4)]";

export function mobileChromeClockDockOffsetPx(
  sheetPadPx = MOBILE_CHROME_SHEET_PAD_PX,
): number {
  return sheetPadPx;
}

export function mobileChromeGlyphCenterPx(
  leadPx: number,
  hitPx = MOBILE_CHROME_ICON_HIT_PX,
): number {
  return leadPx + hitPx / 2;
}
