// Rail-collapse chevron tokens and sidebar-collapsed cookie.
// House names only. Data attr values stay on RAIL_COLLAPSE_*.

export const RAIL_COLLAPSE_CHEVRON = "chevron";

// H register (the shell register lock v1 in docs/design-locks):
// the collapse control sits at the BOTTOM of the side menu — a quiet 44
// round transparent button with a 20 « in ink-2, 24 in and 24 up;
// collapsed, the same button (») centred at the bottom of the 80
// column. Muted wash on hover. It is one button in both states, in the
// same slot, so keyboard focus stays on it across the toggle.
// Supersedes the screening chrome's 28 / 40×32 boxes in the top row.
export const RAIL_COLLAPSE_CHEVRON_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink";

export const RAIL_EXPAND_CHEVRON_CLASS = RAIL_COLLAPSE_CHEVRON_CLASS;

export const RAIL_COLLAPSE_CHEVRON_ICON_CLASS = "size-5";

export const RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT = "regular" as const;

/** Shared side-menu width. Every workspace rail and Settings use this.
 *  Collapsed overrides `--sidebar-width` to the collapsed var. The
 *  column is the whole slot — no inset, no card. */
export const RAIL_WIDTH_CLASS = "w-[var(--sidebar-width)]";

export const RAIL_COLLAPSE_WIDTH_VAR = "var(--sidebar-width-collapsed)";

export const SIDEBAR_COLLAPSED_COOKIE = "24frame_sidebar_collapsed";

export const SIDEBAR_COLLAPSED_COOKIE_LEGACY = "gc_sidebar_collapsed";

const COOKIE_ATTRS = "path=/; max-age=31536000; samesite=lax";
const COOKIE_CLEAR_ATTRS = "path=/; max-age=0; samesite=lax";

export function parseSidebarCollapsedCookie(value: string | undefined | null): boolean {
  return value === "1";
}

/** Prefer the house cookie. Fall back to the one-time legacy name. */
export function readSidebarCollapsed(get: (name: string) => string | undefined): boolean {
  const next = get(SIDEBAR_COLLAPSED_COOKIE);
  if (next === "1" || next === "0") return next === "1";
  return parseSidebarCollapsedCookie(get(SIDEBAR_COLLAPSED_COOKIE_LEGACY));
}

export function sidebarCollapsedCookieWrite(collapsed: boolean): string {
  return `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; ${COOKIE_ATTRS}`;
}

export function sidebarCollapsedCookieClearLegacy(): string {
  return `${SIDEBAR_COLLAPSED_COOKIE_LEGACY}=; ${COOKIE_CLEAR_ATTRS}`;
}

export function shouldMigrateSidebarCollapsedCookie(cookieHeader: string): boolean {
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const hasLegacy = parts.some((part) => part.startsWith(`${SIDEBAR_COLLAPSED_COOKIE_LEGACY}=`));
  const hasNext = parts.some((part) => part.startsWith(`${SIDEBAR_COLLAPSED_COOKIE}=`));
  return hasLegacy && !hasNext;
}

export function persistSidebarCollapsed(collapsed: boolean): void {
  document.cookie = sidebarCollapsedCookieWrite(collapsed);
  document.cookie = sidebarCollapsedCookieClearLegacy();
}

export function migrateSidebarCollapsedCookie(collapsed: boolean): void {
  if (shouldMigrateSidebarCollapsedCookie(document.cookie)) {
    persistSidebarCollapsed(collapsed);
  }
}
