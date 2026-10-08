// One 24Frame account, workspace destinations persist in a cookie the
// same way 24frame_sidebar_collapsed persists the rail. Pathname still
// wins on destination routes so a /social bookmark shows Social
// destinations even if the cookie still says aggregation.
//
// Adam lock 2026-09-18: workspace owns the first path segment.
//   Home         /home
//   Aggregation  /aggregation
//   Social       /social
//   Education    /education
//   Staff        /staff
// Home is Home-owned — never nest /home under /aggregation. /home/news
// still uses Aggregation chrome so a Social cookie cannot steal it.
// Not a fifth workspace.
//
// Adam lock 2026-09-20: Staff is its own workspace cookie mode — not a
// Team block inside Aggregation. Chrome-first (#582) kept operator
// URLs under /aggregation/…; B path cut hard-cuts those surfaces to
// /staff/*. Client Dashboard / Titles / Attention / Reports stay
// /aggregation/*. Old aggregation queue/avails/channels/gc doors 404 —
// no leftover redirect SoT, no dual nav hrefs. Staff is
// switcher-visible only for isGcStaff. Members never see Staff /
// Team / Ops / GC_NAV. A forged staff cookie is clamped off.
//
// Adam hard lock 2026-09-20: Staff never appears for members.
// resolveWorkspaceMode can still return "staff" from a forged cookie on
// cookie-deferred paths (/settings, /help, /activity). clampWorkspaceMode
// is the chrome SoT — staff without isGcStaff becomes aggregation.
// persistWorkspaceCookie("staff") no-ops unless isGcStaff.
//
// Education: member browse/consume and staff CMS share the /education
// prefix. Role gates chrome, not a parallel product. Member land is
// /education. Staff CMS is /education/manage (collision at /education
// and /education/[slug] forced that one documented staff subpath).
//
// Adam amend 2026-09-18: no leftover redirects. 24Frame has no users
// yet. Hard-cut to these prefixes only.
// Founder lock 2026-09-19: signed-in default land is /home
// (AUTH_DEFAULT_NEXT). `/` hops to that SoT — not Aggregation dashboard.
//
// Adam lock 2026-09-19: Co-Productions is /co-productions — Home-pattern
// lead land, not a workspace cookie mode. Do not add it to WorkspaceMode
// or WORKSPACE_MODES.
//
// Adam lock 2026-09-19: Activity is chrome-level /activity. Cookie
// wins (same as /settings and /help). Do not treat it as Aggregation.
//
// Adam lock 2026-09-19: Get Help is chrome-level /help. Cookie still
// wins for resolveWorkspaceMode so a Social/Education cookie is not
// rewritten. Do not nest /education/help or treat Help as Education.
// Account chrome leaves workspace thumbs idle and hides the product
// rail (overviewLeadSelected + AppShell).

export const WORKSPACE_COOKIE = "24frame_workspace";

export type WorkspaceMode = "aggregation" | "social" | "education" | "staff";

export const WORKSPACE_MODES = ["aggregation", "social", "education", "staff"] as const;

// Operator surfaces live under /staff. Prefixes match GC_NAV + the
// (operator) staff layout. Client /aggregation/dashboard, titles,
// attention, reports stay aggregation.
export const STAFF_ROOT = "/staff";
export const STAFF_HOME_SEGMENT = "queue";

export const AGGREGATION_ROOT = "/aggregation";
export const HOME_ROOT = "/home";
export const SOCIAL_ROOT = "/social";
export const EDUCATION_ROOT = "/education";
export const EDUCATION_MANAGE_SEGMENT = "manage";

export const AGGREGATION_HOME_SEGMENT = "dashboard";

export function aggregationPath(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split("/"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "aggregation");
  return parts.length === 0 ? AGGREGATION_ROOT : `${AGGREGATION_ROOT}/${parts.join("/")}`;
}

export function staffPath(...segments: string[]): string {
  const parts = segments
    .flatMap((segment) => segment.split("/"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "staff");
  return parts.length === 0 ? STAFF_ROOT : `${STAFF_ROOT}/${parts.join("/")}`;
}

export const STAFF_PATH_PREFIXES = [
  staffPath("queue"),
  staffPath("avails"),
  staffPath("channels"),
  staffPath("music"),
  staffPath("gc"),
] as const;

export function parseWorkspaceCookie(value: string | undefined | null): WorkspaceMode {
  if (value === "social") return "social";
  if (value === "education") return "education";
  if (value === "staff") return "staff";
  return "aggregation";
}

/** Value of `24frame_workspace` inside a Cookie header, or null when absent. */
export function workspaceCookieValue(header: string | null | undefined): string | null {
  if (!header) return null;
  const needle = `${WORKSPACE_COOKIE}=`;
  for (const part of header.split(";")) {
    const row = part.trim();
    if (!row.startsWith(needle)) continue;
    const raw = row.slice(needle.length);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function workspaceHome(mode: WorkspaceMode): string {
  if (mode === "social") return SOCIAL_ROOT;
  if (mode === "education") return EDUCATION_ROOT;
  if (mode === "staff") return staffPath(STAFF_HOME_SEGMENT);
  return aggregationPath(AGGREGATION_HOME_SEGMENT);
}

export function isEducationManagePath(pathname: string): boolean {
  const manage = `${EDUCATION_ROOT}/${EDUCATION_MANAGE_SEGMENT}`;
  return pathname === manage || pathname.startsWith(`${manage}/`);
}

export function isEducationPath(pathname: string): boolean {
  return pathname === EDUCATION_ROOT || pathname.startsWith(`${EDUCATION_ROOT}/`);
}

export function isSocialPath(pathname: string): boolean {
  if (isEducationPath(pathname)) return false;
  return pathname === SOCIAL_ROOT || pathname.startsWith(`${SOCIAL_ROOT}/`);
}

export function isHomePath(pathname: string): boolean {
  return pathname === HOME_ROOT || pathname.startsWith(`${HOME_ROOT}/`);
}

export function isStaffPath(pathname: string): boolean {
  return pathname === STAFF_ROOT || pathname.startsWith(`${STAFF_ROOT}/`);
}

export function isAggregationPath(pathname: string): boolean {
  if (isStaffPath(pathname)) return false;
  if (pathname === "/" || pathname === AGGREGATION_ROOT || pathname.startsWith(`${AGGREGATION_ROOT}/`)) {
    return true;
  }
  return isHomePath(pathname);
}

export function isAggregationNavActive(
  pathname: string,
  canonicalHref: string,
  exact = false,
): boolean {
  if (exact) {
    return pathname === canonicalHref || pathname === "/";
  }
  return pathname === canonicalHref || pathname.startsWith(`${canonicalHref}/`);
}

export function resolveWorkspaceMode(pathname: string, cookie: WorkspaceMode): WorkspaceMode {
  if (isEducationPath(pathname)) return "education";
  if (isSocialPath(pathname)) return "social";
  if (isStaffPath(pathname)) return "staff";
  if (isAggregationPath(pathname)) return "aggregation";
  return cookie;
}

// Adam lock 2026-09-20: Staff is staff-only. A forged staff cookie or a
// /staff/* bookmark must never paint Staff chrome for members. Path
// resolve can still say staff; chrome callers clamp with isGcStaff.
// (operator) / gc_staff remains the authorization bounce.
// Chrome SoT: staff without isGcStaff is never the active workspace.
export function clampWorkspaceMode(
  mode: WorkspaceMode,
  isGcStaff: boolean | undefined,
): WorkspaceMode {
  if (mode === "staff" && !isGcStaff) return "aggregation";
  return mode;
}

export function workspaceCookieWrite(mode: WorkspaceMode): string {
  return `${WORKSPACE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function persistWorkspaceCookie(mode: WorkspaceMode, isGcStaff?: boolean): void {
  if (clampWorkspaceMode(mode, isGcStaff) !== mode) return;
  document.cookie = workspaceCookieWrite(mode);
}
