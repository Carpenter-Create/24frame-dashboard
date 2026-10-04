// Rail-collapse chevron tokens and sidebar-collapsed cookie.
// House names only. Data attr values stay on RAIL_COLLAPSE_*.

import { HOUSE_SHELL_QUIET_INK_CLASS } from "@/lib/house-shell";

export const RAIL_COLLAPSE_CHEVRON = "chevron";

// Screening chrome (docs/design-locks/shell-screening-chrome-lock-v1.md):
// expanded, the collapse control is a 28 radius-6 box beside the
// workspace eyebrow; collapsed, the expand control is a 40×32 radius-10
// box at the top of the 64 column. Quiet ink, muted wash on hover.
export const RAIL_COLLAPSE_CHEVRON_CLASS =
  `flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${HOUSE_SHELL_QUIET_INK_CLASS} transition-colors hover:bg-surface-muted hover:text-ink`;

export const RAIL_EXPAND_CHEVRON_CLASS =
  `flex h-8 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] ${HOUSE_SHELL_QUIET_INK_CLASS} transition-colors hover:bg-surface-muted hover:text-ink`;

export const RAIL_COLLAPSE_CHEVRON_ICON_CLASS = "h-4 w-4";

export const RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT = "bold" as const;

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
