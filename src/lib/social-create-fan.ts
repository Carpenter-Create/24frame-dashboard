import { HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS } from "@/lib/house-phone-shell";

// Adam 2026-10-01. Phone dock + fans Media · Write · Go live in a
// semicircle above the floating dock. No Create bottom sheet on that
// button. Desktop rail keeps the Create dialog.
// Soft circles and Regular glyphs match the dock stroke. No accent fill.
// Side items sit high enough that a label under the circle clears the pill.
// Contrast pass (Adam PASS, same day): while open, a soft ink wash and
// a light blur sit over the feed, under the dock. Labels sit on soft
// surface pills so the words read on a photo. Not the house 40% sheet.

export const SOCIAL_CREATE_FAN_RADIUS_PX = 132;

/** Left, top, right. Degrees from the positive x-axis, counterclockwise. */
export const SOCIAL_CREATE_FAN_ANGLES_DEG = [140, 90, 40] as const;

export const SOCIAL_CREATE_FAN_MOTION_MS = 280;

export const SOCIAL_CREATE_FAN_STAGGER_MS = [0, 40, 80] as const;

export const SOCIAL_CREATE_FAN_DISMISS_MS =
  SOCIAL_CREATE_FAN_MOTION_MS +
  SOCIAL_CREATE_FAN_STAGGER_MS[SOCIAL_CREATE_FAN_STAGGER_MS.length - 1]!;

export function socialCreateFanPoint(
  angleDeg: number,
  radiusPx: number = SOCIAL_CREATE_FAN_RADIUS_PX,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round(Math.cos(rad) * radiusPx),
    y: Math.round(-Math.sin(rad) * radiusPx),
  };
}

export function socialCreateFanPoints(
  radiusPx: number = SOCIAL_CREATE_FAN_RADIUS_PX,
): { x: number; y: number }[] {
  return SOCIAL_CREATE_FAN_ANGLES_DEG.map((angle) => socialCreateFanPoint(angle, radiusPx));
}

export const SOCIAL_CREATE_FAN_ANCHOR_CLASS = "relative flex h-full min-w-0 flex-1";

export const SOCIAL_CREATE_FAN_PLUS_CLASS = "social-create-fan-plus";

export const SOCIAL_CREATE_FAN_MENU_CLASS =
  "pointer-events-none absolute left-1/2 top-1/2 z-10 size-0";

export const SOCIAL_CREATE_FAN_ITEM_CLASS =
  "social-create-fan-item absolute left-0 top-0 flex size-12 items-center justify-center no-underline";

export const SOCIAL_CREATE_FAN_CIRCLE_CLASS =
  "flex size-12 items-center justify-center rounded-full border border-hairline bg-surface text-ink-2 shadow-[var(--elevation-float)] active:bg-surface-muted";

// Soft surface pill. Snug vertical pad so the side labels still clear the dock.
// Full words, no truncate. Dark ink on surface — readable on any photo.
export const SOCIAL_CREATE_FAN_LABEL_CLASS =
  "absolute left-1/2 top-[calc(100%+var(--space-1))] w-max -translate-x-1/2 whitespace-normal rounded-full border border-hairline bg-surface px-[var(--space-2)] py-px text-center t-body-sm text-ink";

export const SOCIAL_CREATE_FAN_ICON_CLASS = HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS;

// Under the dock (z-40). Dims and softens the feed only. Lighter than
// the house sheet wash (ink/40, no blur). Tap dismisses.
export const SOCIAL_CREATE_FAN_SCRIM_CLASS =
  "social-create-fan-scrim fixed inset-0 z-30 bg-ink/25 backdrop-blur-sm";
