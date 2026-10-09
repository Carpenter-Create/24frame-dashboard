// HouseOverlay dual-host lock v1.
// Job picks the host. Do not skin one host as another.
// G1 job map · G2 scrim · G3 AppSheet · G4 HouseDialog · G5 HouseDrawer
// G6 MenuSurface · G7 no fifth host / no mixed chrome · G8 out of scope.
//
// Scrim is the house ink token at 40%. Live --text is that ink role.
// Never a raw hex. Hairline is --border / border-hairline. White is bg-surface.
// Radius 16 is the house card corner. Menu radius 12 has no token — the
// lock measure, same literal the account panel already uses.

export const HOUSE_OVERLAY_LOCK = "HouseOverlay dual-host lock v1" as const;

export const HOUSE_OVERLAY_HOSTS = [
  "app-sheet",
  "menu-surface",
  "house-dialog",
  "house-drawer",
] as const;

export type HouseOverlayHost = (typeof HOUSE_OVERLAY_HOSTS)[number];

/** A transient account/system · C single-value · D hamburger. */
export const HOUSE_OVERLAY_JOBS = [
  "account-system",
  "single-value",
  "hamburger",
  "confirm",
  "side-edit",
  "anchored",
  "object-edit",
] as const;

export type HouseOverlayJob = (typeof HOUSE_OVERLAY_JOBS)[number];

export type HouseOverlayViewport = "phone" | "desktop";

export const HOUSE_OVERLAY_JOB_HOST: Record<
  HouseOverlayJob,
  { phone: HouseOverlayHost | null; desktop: HouseOverlayHost | null }
> = {
  "account-system": { phone: "app-sheet", desktop: "menu-surface" },
  "single-value": { phone: "app-sheet", desktop: "menu-surface" },
  hamburger: { phone: "app-sheet", desktop: null },
  confirm: { phone: "app-sheet", desktop: "house-dialog" },
  "side-edit": { phone: "app-sheet", desktop: "house-drawer" },
  anchored: { phone: "app-sheet", desktop: "menu-surface" },
  // One object edited over the page that shows it: the composer, Edit
  // profile. Desktop is the HouseDialog window; phone is the full sheet.
  "object-edit": { phone: "app-sheet", desktop: "house-dialog" },
};

export function houseOverlayHost(
  job: HouseOverlayJob,
  viewport: HouseOverlayViewport,
): HouseOverlayHost | null {
  return HOUSE_OVERLAY_JOB_HOST[job][viewport];
}

// G2 — one scrim. Ink token at 40%. No blur, no frost.
export const HOUSE_OVERLAY_SCRIM_CLASS = "absolute inset-0 bg-ink/40";

// G3 — phone AppSheet. Bottom, full width, top radius 16, pad 16,
// max 90vh, white, no shadow, safe-area bottom. Never on desktop.
export const APP_SHEET_LOCK_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col justify-end md:hidden";

export const APP_SHEET_LOCK_SURFACE_CLASS =
  "flex w-full max-h-[90vh] flex-col rounded-t-[16px] bg-surface p-[var(--space-4)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] shadow-none";

// Durable side edit on phone is a full push, still AppSheet, still md:hidden.
export const APP_SHEET_FULL_HOST_CLASS =
  "fixed inset-0 z-50 flex h-dvh w-full flex-col bg-surface md:hidden";

// G4 — HouseDialog. Centered. Confirm max 400, short form max 480.
// Radius 16, pad 24, hairline, no shadow, max 80vh.
export const HOUSE_DIALOG_CONFIRM_CLASS = "w-[min(92vw,400px)]";

export const HOUSE_DIALOG_FORM_CLASS = "w-[min(92vw,480px)]";

// The window (amended 2026-10-09, Adam): HouseDialog's third width, for one
// object edited over the page that shows it. 600 wide, radius 24, no edge,
// no shadow. One geometry for every window — the composer and Edit profile
// both compose from it, so they never drift.
export const HOUSE_DIALOG_WINDOW_CLASS = "w-[min(92vw,600px)] rounded-[var(--radius-xl)] border-0";

export const HOUSE_DIALOG_PANEL_CLASS =
  "m-auto h-fit max-h-[80vh] overflow-visible rounded-[16px] border border-hairline bg-surface p-[var(--space-6)] text-ink shadow-none backdrop:bg-ink/40";

export const HOUSE_DIALOG_HOST_CLASS =
  "fixed inset-0 z-50 hidden items-center justify-center md:flex";

// G5 — HouseDrawer. Right 400, 100vh, pad 24, hairline left seam, no shadow.
// Phone never a side strip: the host is hidden below md.
export const HOUSE_DRAWER_HOST_CLASS = "fixed inset-0 z-50 hidden md:block";

export const HOUSE_DRAWER_PANEL_CLASS =
  "absolute inset-y-0 right-0 flex h-[100vh] w-[400px] flex-col border-l border-hairline bg-surface p-[var(--space-6)] shadow-none";

/** One class string skinning two hosts. A drawer panel is not mixed. */
export function overlayClassMixesHosts(className: string): boolean {
  const sheet = /justify-end|rounded-t-\[16px\]|rounded-t-\[var\(--radius-lg\)\]/.test(className);
  const centered = className.includes("md:items-center") && className.includes("md:justify-center");
  const desktopCard = className.includes("md:rounded-") || className.includes("md:max-w-");
  return (sheet && centered) || (sheet && desktopCard);
}
