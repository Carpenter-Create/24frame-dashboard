import { ASK_ASSISTANT, ASSISTANT_NAME } from "@/lib/product";
import { DASHBOARD_ADMIN } from "@/lib/dashboard-admin";
import { DASHBOARD_ATTENTION } from "@/lib/dashboard-attention";
import { HOUSE_CHROME_GUTTER } from "@/lib/house-shell";
import {
  DASHBOARD_HOME,
  dashboardWhatChanged,
  type ClientHomeDoNextItem,
  type DashboardChangeRow,
} from "@/lib/dashboard-home";
import { NEWS_HOME_CAP, NEWS_HREF, NEWS_PAGE } from "@/lib/news";
import { REPORTS_HREF, REPORTS_PERIOD_ALL } from "@/lib/reports";
import { CO_PRODUCTIONS_HREF, CO_PRODUCTIONS_LABEL, isCoProductionsPath } from "@/lib/co-productions";
import { EDUCATION_HREF } from "@/lib/education";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { isActivityPath } from "@/lib/activity";
import { isHelpPath } from "@/lib/help";
import { isSettingsPath } from "@/lib/settings";
import { availableWorkspaceOptions, type WorkspaceMenuOption } from "@/lib/workspace-menu";
import type { WorkspaceMode } from "@/lib/workspace";

// Account Home is the leftmost unify-lead pill. Co-Productions is the
// rightmost (Adam 2026-09-19). Neither is a WorkspaceMode. Not Social
// Home (`/social` feed). Aggregation · Social · Education stay the
// three workspace destinations. /home/news is Home-owned 90-day
// history — same Home chrome, not a workspace and not an Aggregation /
// Social / Education destination. No leftover /overview or /news hops.
// Home IA v2 (Adam 2026-09-18) order: Revenue first, then Social ·
// Education · Needs you. Top performing is not on Home. News stays
// the Home news column (/home/news is View-all). Desktop dest rail:
// Adam 2026-10-04 (shell-unified-chrome-lock-v1) gives Home the same
// rail as every workspace, built only from Home's own dests (Home ·
// Industry news). Co-Productions stays rail-free. Copy lives here,
// not JSX.
// Home 24Frame AI module stays as a quiet overlay opener (Adam
// 2026-09-18 addendum). Out of sight = out of mind. Do not delete
// the teaser to "clean up" for the overlay. Tap opens `?ai=1` on
// the current path — never /messages or Aggregation land.

export const OVERVIEW_HREF = "/home";

export const OVERVIEW_SOCIAL_DM_CAP = 5;
export const OVERVIEW_EDUCATION_CAP = 3;
export const OVERVIEW_AI_NEXT_CAP = 3;
export const OVERVIEW_NEWS_CAP = NEWS_HOME_CAP;
export const OVERVIEW_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Home modules after the 2026-09-18 order rewrite. Revenue first. */
export const OVERVIEW_MODULE_ORDER = [
  "revenue",
  "social",
  "education",
  "needs-you",
  "ai-next",
] as const;

/** Phone stack: News is last so Needs you + AI stay above the rail.
 *  Phone-chrome / Home width: dest rail is gone; lead + main go full-canvas.
 *  Home modules inset separately (32 shell start + 32 shell end → 1376 at 1440). */
export const OVERVIEW_PHONE_MODULE_ORDER = [
  "revenue",
  "social",
  "education",
  "needs-you",
  "ai-next",
  "news",
] as const;

/** Desktop News rail measure inside the 1376 Home column.
 *  Adam 2026-09-18: 20rem → 22rem — modest news bump, left stack shrinks. */
export const OVERVIEW_NEWS_RAIL_WIDTH = "22rem";

/** Main↔News gutter — same chrome gap as Aggregation main↔dest rail. */
export const OVERVIEW_HOME_COLUMN_GUTTER = HOUSE_CHROME_GUTTER;

/** Home frame is a size container. Home sits beside the dest rail
 *  (shell-unified-chrome-lock-v1), so its grids follow the frame's
 *  width, not the viewport. 60rem (960) is the old rail-free `lg`
 *  frame (1024 − 32 − 32): two columns only when main keeps its
 *  592 floor beside the 22rem News column. 37rem (592) is the old
 *  phone `sm` frame (640 − 24 − 24). */
export const OVERVIEW_HOME_FRAME_CLASS = "@container w-full";

/** Desktop: News is the right rail. Phone uses the stacked areas.
 *  Vertical air is house section (24). Column gutter is chrome (16).
 *  Empty News keeps the 22rem column — do not stretch main. */
export const OVERVIEW_HOME_LAYOUT_CLASS =
  "grid w-full grid-cols-1 items-start " +
  "gap-y-[var(--space-6)] gap-x-[var(--chrome-gutter)] " +
  "[grid-template-areas:'revenue'_'social'_'education'_'needs'_'ai'_'news'] " +
  "@min-[60rem]:grid-cols-[minmax(0,1fr)_22rem] " +
  "@min-[60rem]:[grid-template-areas:'revenue_news'_'social_news'_'education_news'_'needs_news'_'ai_news']";

export const OVERVIEW_AREA_REVENUE_CLASS = "[grid-area:revenue]";
export const OVERVIEW_AREA_SOCIAL_CLASS = "[grid-area:social]";
export const OVERVIEW_AREA_EDUCATION_CLASS = "[grid-area:education]";
export const OVERVIEW_AREA_NEEDS_CLASS = "[grid-area:needs]";
export const OVERVIEW_AREA_AI_CLASS = "[grid-area:ai]";
// Desktop News rail: page-sticky column + own scroller. The module
// header pins at top-0 *inside* this overflow — do not add a second
// sticky offset here. Stacked Home uses the page scroller. Same 60rem
// frame switch as the two-column grid.
export const OVERVIEW_AREA_NEWS_CLASS =
  "[grid-area:news] @min-[60rem]:sticky @min-[60rem]:top-[calc(var(--header-height)+var(--space-4))] @min-[60rem]:max-h-[calc(100dvh-var(--header-height)-var(--space-8))] @min-[60rem]:overflow-y-auto";

/** Inner pad + gap for tiles inside a Home module shell (Education covers, News cards). */
export const OVERVIEW_MODULE_NEST_CLASS =
  "gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)]";

/** Home Education covers. Columns follow the Home frame container:
 *  2-up from the 592 frame, 3-up once the frame is two-column (main
 *  ≥ 592, card ≥ ~179 — the old rail-free floor). */
export const OVERVIEW_EDUCATION_COVERS_CLASS =
  `grid grid-cols-1 ${OVERVIEW_MODULE_NEST_CLASS} @min-[37rem]:grid-cols-2 @min-[60rem]:grid-cols-3`;

/** Overview/Home trailing arrow tap target. Home-scoped helper — do not
 *  export as a global affordance. Glyph is HouseActionArrow (16 · Sporty
 *  Blue). Wrapper centers the glyph in an 8-token square so a phone tap
 *  hits accent-color easily without inventing a second arrow primitive.
 *
 *  `shrink-0` keeps the anchor from collapsing under a long module
 *  title in the header's `flex justify-between` row — without it,
 *  Safari squeezed the anchor to 0 width and the glyph vanished (Adam
 *  Production report 2026-09-19). */
export const OVERVIEW_MODULE_ARROW_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center text-accent";
export const OVERVIEW_RAIL_OFF_WIDTH = "0px";

export const OVERVIEW_PAGE = {
  /** Workspace pill / nav label. Page H1 is `homeGreeting`, not this string. */
  title: "Home",
  needsYou: "Needs you",
  thisWeek: "This week",
  aggregation: "Aggregation",
  social: "Social",
  education: "Education",
  revenue: DASHBOARD_ADMIN.revenue,
  revenueEmpty: DASHBOARD_ADMIN.revenueEmpty,
  revenueHref: REPORTS_HREF,
  socialUnread: "Unread",
  socialEmpty: SOCIAL.home.chatsEmpty,
  socialHref: SOCIAL_ROUTES.dms,
  educationEmpty: SOCIAL.courses.empty,
  educationHref: EDUCATION_HREF,
  news: NEWS_PAGE.title,
  newsEmpty: NEWS_PAGE.empty,
  newsHref: NEWS_HREF,
  newsViewAll: NEWS_PAGE.viewAll,
  needsYouEmpty: DASHBOARD_ATTENTION.empty,
  needsYouHref: DASHBOARD_ATTENTION.viewAllHref,
  weekEmpty: DASHBOARD_HOME.whatChangedEmpty,
  aiNext: ASSISTANT_NAME,
  aiNextEmpty: "Nothing is ready to submit next.",
  aiNextHref: "?ai=1",
  aiAsk: ASK_ASSISTANT,
} as const;

/** Home land with the shared Aggregation/Finance period query. */
export function overviewHref(input: { period?: string } = {}): string {
  const params = new URLSearchParams();
  if (input.period && input.period !== REPORTS_PERIOD_ALL) {
    params.set("period", input.period);
  }
  const query = params.toString();
  return query ? `${OVERVIEW_HREF}?${query}` : OVERVIEW_HREF;
}

/** Header trailing arrow — glyph-only HouseActionArrow (Adam 2026-09-19).
 *  Home gray module headers no longer trail with a word ("Aggregation",
 *  "View all", "Ask …"). Every module with an `href` now surfaces a house
 *  blue ArrowRight glyph in the trailing slot; the visible label survives
 *  only as the arrow's `aria-label` (screen readers still hear the
 *  destination). `label` therefore defaults to the module title when the
 *  caller does not pass a distinct `cta`. */
export function overviewModuleHeaderAction(
  title: string,
  href?: string,
  cta?: string,
): { href: string; label: string } | null {
  if (!href) return null;
  const label = (cta ?? title).trim();
  return { href, label };
}

export type OverviewLeadPillId = "home" | WorkspaceMode | "co-productions";

export type OverviewLeadPill = {
  id: OverviewLeadPillId;
  label: string;
  href: string;
};

function isPrefixed(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isOverviewPath(pathname: string): boolean {
  return isPrefixed(pathname, OVERVIEW_HREF);
}

/** Home-owned /home/news history. Not a workspace land. */
export function isNewsHistoryPath(pathname: string): boolean {
  return isPrefixed(pathname, NEWS_HREF);
}

/** Exact Home land — not a Home child such as /home/news. */
export function isHomeLandPath(pathname: string): boolean {
  return pathname === OVERVIEW_HREF;
}

/** Home unify-lead chrome: /home and Home-owned news. */
export function isHomeOwnedPath(pathname: string): boolean {
  return isOverviewPath(pathname) || isNewsHistoryPath(pathname);
}

/** Dest rail stays off Co-Productions only. Home (+ /home/news) shows the Home rail (Adam 2026-10-04). */
export function overviewHidesRail(pathname: string): boolean {
  return isCoProductionsPath(pathname);
}

export function overviewLeadPills(
  workspaces: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): OverviewLeadPill[] {
  return [
    { id: "home", label: OVERVIEW_PAGE.title, href: OVERVIEW_HREF },
    ...workspaces.map((option) => ({
      id: option.mode,
      label: option.label,
      href: option.href,
    })),
    { id: "co-productions", label: CO_PRODUCTIONS_LABEL, href: CO_PRODUCTIONS_HREF },
  ];
}

export function overviewLeadSelected(
  pillId: OverviewLeadPillId,
  pathname: string,
  workspace: WorkspaceMode,
): boolean {
  // Settings, Activity, and Get Help are chrome/account surfaces —
  // not Home, not Co-Productions, and not a workspace land. Those
  // paths must not light any lead pill. The workspace cookie stays.
  if (isSettingsPath(pathname) || isActivityPath(pathname) || isHelpPath(pathname)) {
    return false;
  }
  if (isCoProductionsPath(pathname)) return pillId === "co-productions";
  if (pillId === "co-productions") return false;
  const onHome = isHomeOwnedPath(pathname);
  if (pillId === "home") return onHome;
  return !onHome && workspace === pillId;
}

/** Selected unify-lead index, or -1 when none (Settings). Do not coerce to 0. */
export function overviewLeadActiveIndex(
  pathname: string,
  workspace: WorkspaceMode,
  pills: readonly Pick<OverviewLeadPill, "id">[] = overviewLeadPills(),
): number {
  return pills.findIndex((pill) => overviewLeadSelected(pill.id, pathname, workspace));
}

export function overviewTriggerLabel(
  pathname: string,
  workspaceLabel: string,
): string {
  if (isCoProductionsPath(pathname)) return CO_PRODUCTIONS_LABEL;
  return isHomeOwnedPath(pathname) ? OVERVIEW_PAGE.title : workspaceLabel;
}

/** Idle pills always navigate. Home pill always goes to /home, including
 *  from Home children such as /home/news — selected chrome is not a no-op. */
export function overviewLeadShouldNavigate(
  pathname: string,
  workspace: WorkspaceMode,
  pill: Pick<OverviewLeadPill, "id">,
): boolean {
  if (pill.id === "home") return !isHomeLandPath(pathname);
  if (pill.id === "co-productions") return !isCoProductionsPath(pathname);
  return !overviewLeadSelected(pill.id, pathname, workspace);
}

export function overviewSocialUnreadTotal(
  rows: readonly { unread_count: number }[],
): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.unread_count), 0);
}

export function overviewSocialChats<T>(
  rows: readonly T[],
  cap = OVERVIEW_SOCIAL_DM_CAP,
): T[] {
  return rows.slice(0, cap);
}

export function overviewEducationCourses<T>(
  rows: readonly T[],
  cap = OVERVIEW_EDUCATION_CAP,
): T[] {
  return rows.slice(0, cap);
}

export function overviewAiNextMoves<T extends ClientHomeDoNextItem>(
  rows: readonly T[],
  cap = OVERVIEW_AI_NEXT_CAP,
): T[] {
  return rows.slice(0, cap);
}

export function overviewWeekSince(now: number): number {
  return now - OVERVIEW_WEEK_MS;
}

export function overviewInWeek(iso: string | null | undefined, sinceMs: number): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  return Number.isFinite(at) && at >= sinceMs;
}

export function overviewWeekPulse(input: {
  titlesAdded: number;
  deliveriesUpdated: number;
  findingsOpened: number;
}): DashboardChangeRow[] {
  return dashboardWhatChanged(input);
}
