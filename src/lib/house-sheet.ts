import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";

// Locked house sheet primitives. Classes live here so account and nav
// consume one scale — do not restyle per page.
// Figma: Close/44 543:562, Text action 543:563, Identity 543:565, Group
// 543:570, App sheet 543:576.
// Thread ··· chrome lives on the shared menu surface, not here.

export const CLOSE_44_CLASS =
  "flex size-[44px] min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-3";

export const TEXT_ACTION_CLASS = "t-body-sm text-accent";

// House empty line — same 17 Regular as catalog / titles empties.
// Do not invent product copy in the primitive.
export const HOUSE_EMPTY_CLASS = "t-body text-ink-2";

// 544:561 row chevron — 16 Phosphor Bold, tertiary. Same register as Close/44.
export const SHEET_GROUP_CHEVRON_CLASS = "size-4 shrink-0 text-ink-3";

export const IDENTITY_BLOCK_CLASS = "flex min-w-0 items-center gap-[var(--space-4)]";

export const IDENTITY_AVATAR_CLASS =
  "flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-muted t-body text-ink-2";

// Name over email beside the face. The column can shrink (min-w-0) and
// both lines take the house phone wrap (gospel 2026-09-19), so a long
// name or email wraps and stops at the close X instead of running off
// the sheet.
export const IDENTITY_WHO_CLASS = "flex min-w-0 flex-col items-start gap-[var(--space-2)]";

export const IDENTITY_NAME_CLASS = `${HOUSE_PHONE_WRAP_CLASS} t-heading text-ink`;

export const IDENTITY_EMAIL_CLASS = `${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink-3`;

export const SHEET_GROUP_CLASS = "flex flex-col items-start gap-[var(--space-6)]";

export const SHEET_GROUP_LABEL_CLASS =
  "text-[length:var(--text-xs)] font-normal uppercase tracking-[0.08em] text-ink-2";

export const SHEET_GROUP_ITEM_CLASS =
  "flex w-full items-center justify-between text-[length:var(--text-base)] font-normal leading-6 text-ink";

// Inset grouped list — Adam lock 2026-09-22. A row sits inside a
// rounded card that floats in the sheet pad. Hairline only between
// rows in the same card. Default SHEET_GROUP_CLASS stays the eyebrow
// stack; callers opt in. House tokens only.
export const SHEET_GROUP_INSET_SHELL_CLASS =
  "overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-surface-muted";

export const SHEET_GROUP_INSET_CLASS =
  `flex w-full flex-col ${SHEET_GROUP_INSET_SHELL_CLASS}`;

export const SHEET_GROUP_INSET_ITEM_CLASS =
  `${SHEET_GROUP_ITEM_CLASS} px-[var(--space-4)] py-[var(--space-3)]`;

// Leading inset: the rule starts at the label and runs to the card edge.
export const SHEET_GROUP_INSET_RULE_CLASS = "ml-[var(--space-4)]";

// App-sheet motion — one duration/easing for the account instance.
// Rise from the bottom, ease-out, no bounce. Reduced
// motion skips the slide. Do not restyle per page.
export const APP_SHEET_MOTION_DURATION_MS = 320;
export const APP_SHEET_MOTION_EASING = "ease-out";
export const APP_SHEET_RISE_CLASS = "app-sheet-rise";
export const APP_SHEET_SCRIM_FADE_CLASS = "app-sheet-scrim-fade";

// Phone host — HouseOverlay dual-host lock v1 G3.
// Column + justify-end, full width, from the bottom. md:hidden so
// AppSheet never paints on desktop. Do not promote this into a modal.
export const APP_SHEET_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col justify-end md:hidden";

// Pad 16. Safe-area sits in the bottom pad. Radius 16, max 90vh, no shadow.
// Gap between children is the sheet stack; it is not a second pad.
export const APP_SHEET_PAD_CLASS =
  "p-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))]";

export const APP_SHEET_CHROME_CLASS =
  `flex w-full max-h-[90vh] flex-col rounded-t-[16px] bg-surface ${APP_SHEET_PAD_CLASS} shadow-none app-sheet-rise`;

export const APP_SHEET_SURFACE_CLASS =
  `${APP_SHEET_CHROME_CLASS} gap-[var(--space-6)]`;

export const APP_SHEET_HEAD_CLASS = "flex h-14 shrink-0 items-center";

export const APP_SHEET_HAIRLINE_CLASS = "h-px w-full bg-hairline";

export const APP_SHEET_SCRIM_CLASS = "absolute inset-0 bg-ink/40 app-sheet-scrim-fade";

// The house danger ink: the one red the house already draws (no --danger
// token yet: a founder colour call, docs/known-divergences.md D3). This
// constant serves its new uses (a post's Remove row and the ask's danger
// action, social-post-owner-menu-lock-v1). The four other literals
// (button.tsx, menu-surface.ts, account-sheet.ts, social-chrome.ts) wait
// for the token, so all five move at once. Never a second hex.
export const HOUSE_DANGER_INK_CLASS = "text-[#c4564a]";

// Thread ··· item glyphs only — surface chrome is MenuSurface.
export const THREAD_POPOVER_ICON_CLASS = "size-4 shrink-0 text-ink-3";

export const THREAD_POPOVER_DELETE_ICON_CLASS = `size-4 shrink-0 ${HOUSE_DANGER_INK_CLASS}`;
