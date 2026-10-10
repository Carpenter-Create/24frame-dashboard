import {
  SOCIAL_CREATE_KIND_PARAM,
  SOCIAL_FOLLOWS_SEARCH_PARAM,
  SOCIAL_PROFILE_TAB_PARAM,
  SOCIAL_ROUTES,
} from "@/lib/social";
import { socialFrameAiThreadPath } from "@/lib/social-frame-ai";
import { SOCIAL_FOLLOWING_WALL_CURSOR_PARAM } from "@/lib/social-home-bounds";
import { readSocialHomeLocation } from "@/lib/social-home-location";
import { isSettingsPath } from "@/lib/settings";
import { HOME_ROOT } from "@/lib/workspace";

// House client-shell SoT.
// Chrome (dock / rails / workspace switcher) stays mounted in AppShell.
// The center is Next's current screen (HouseScreenOutlet). Every screen
// change is a Next navigation; the shell owns only panel query on the
// screen Next is showing (profile ?tab=, Social Home lane/topic, Home
// ?period=), so a chip flips in the click.

export const HOUSE_CLIENT_SHELL = {
  rscFallbackAttr: "data-house-rsc-fallback",
  screenAttr: "data-house-screen",
  screenActiveAttr: "data-house-screen-active",
  scrollAttr: "data-house-lead-scroll",
} as const;

export function houseShouldKeepAlive(pathname: string): boolean {
  // Live capture keeps camera/mic on mount; Settings Back is a real Next
  // hop. Neither takes a pushState panel hop.
  if (isSettingsPath(pathname)) return false;
  return pathname !== SOCIAL_ROUTES.createLive && pathname !== SOCIAL_ROUTES.storiesNew;
}

/**
 * pushState is safe only when the screen being left and the Next address
 * are both panel-capable. Cold create (`stories/new`, go live) and
 * Settings must return false from `navigateOwned` so Link performs a real
 * Next navigation.
 */
export function houseMayClientOwnHop(currentPathname: string, nextPathname: string): boolean {
  return houseShouldKeepAlive(currentPathname) && houseShouldKeepAlive(nextPathname);
}

export function houseScreenQueryNames(pathname: string): readonly string[] {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname || "/";
  if (path === SOCIAL_ROUTES.home) {
    // Lane and topic are client panel state on the mounted Home screen,
    // same as profile ?tab=. Cursor is its own screen.
    return [SOCIAL_FOLLOWING_WALL_CURSOR_PARAM];
  }
  if (path === SOCIAL_ROUTES.explore) {
    // `v` opens For You at one reel (feed Reels rail). Its own screen, so
    // a new `v` is a Next navigation that loads that reel.
    return ["q", "tag", "person", "discover", "v"];
  }
  if (path === SOCIAL_ROUTES.search) {
    return ["q"];
  }
  if (path === SOCIAL_ROUTES.create) return [SOCIAL_CREATE_KIND_PARAM];
  // Own profile and /social/u/[handle] keep ?tab= and ?activity= in the
  // address bar, but those params are client panel state on one mounted
  // screen. A Next hop would RSC-remount the face and rails.
  if (path === SOCIAL_ROUTES.profile || /^\/social\/u\/[^/]+$/.test(path)) {
    return [];
  }
  if (path.startsWith("/social/u/") && path.endsWith("/follows")) {
    return [SOCIAL_PROFILE_TAB_PARAM, SOCIAL_FOLLOWS_SEARCH_PARAM];
  }
  // 24Frame AI thread. post/story must be their own screen. A query this
  // list does not name shares the inbox key, so /social/dms?ai=1 pushStates
  // and the overlay never opens.
  if (path === socialFrameAiThreadPath()) return ["post", "story"];
  // Account Home `?period=` is panel state on the mounted /home screen,
  // same as Social lane/topic.
  return [];
}

function housePathname(pathname: string): string {
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname || "/";
}

/** Path plus the raw query. Stay / owned-href equality uses this, not the screen key. */
export function houseExactHref(href: string): string {
  const { pathname, search } = parseHouseHref(href);
  return `${housePathname(pathname)}${search}`;
}

/** No owned hop is still loading: the browser's address is the shell's.
 *  Only a Home lane/topic or Home period hop runs ahead of Next (the click
 *  owns the href with no pushState, and Next still has to load it). A
 *  profile ?tab= / ?activity= hop pushStates and stays client-only, so
 *  Next's address stays behind for as long as that pill is on; it is
 *  settled. */
export function houseAddressSettled(href: string, nextHref: string): boolean {
  return !houseSocialHomePanelHop(nextHref, href) && !houseHomePeriodHop(nextHref, href);
}

export function houseScreenKey(pathname: string, search = ""): string {
  const path = housePathname(pathname);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const picked = new URLSearchParams();
  for (const name of houseScreenQueryNames(path)) {
    const value = params.get(name)?.trim() ?? "";
    if (value) picked.set(name, value);
  }
  const query = picked.toString();
  return query ? `${path}?${query}` : path;
}

export function houseHrefKey(href: string): string {
  const url = new URL(href, "https://24frame.local");
  return houseScreenKey(url.pathname, url.search);
}

export type HouseHop = "stay" | "panel" | "next";

/**
 * What a click may leave to the shell. The exact address it shows stays.
 * The same screen with other panel query is a panel hop on the mounted
 * screen. Any other screen is a Next navigation: the shell keeps no other
 * screen mounted to pushState to.
 */
export function houseHop(fromHref: string, destHref: string): HouseHop {
  if (houseExactHref(fromHref) === houseExactHref(destHref)) return "stay";
  return houseHrefKey(fromHref) === houseHrefKey(destHref) ? "panel" : "next";
}

/**
 * Home lane/topic stay on the mounted Home screen. Owning the href
 * lets the chip select in the click. Next still has to load the query;
 * pushState alone never fetches it.
 */
export function houseSocialHomePanelHop(currentHref: string, destHref: string): boolean {
  const current = parseHouseHref(currentHref);
  const dest = parseHouseHref(destHref);
  if (housePathname(current.pathname) !== SOCIAL_ROUTES.home) return false;
  if (housePathname(dest.pathname) !== SOCIAL_ROUTES.home) return false;
  if (houseExactHref(currentHref) === houseExactHref(destHref)) return false;
  const from = readSocialHomeLocation(current.search);
  const to = readSocialHomeLocation(dest.search);
  return from.lane !== to.lane || from.topic !== to.topic;
}

function housePeriodParam(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("period")?.trim() ?? "";
}

/**
 * Account Home Revenue presets stay on the mounted /home screen.
 * Owning the href lets the chip select in the click. Next still
 * has to load `?period=`; pushState alone never fetches it.
 * /home/news is a different page.
 */
export function houseHomePeriodHop(currentHref: string, destHref: string): boolean {
  const current = parseHouseHref(currentHref);
  const dest = parseHouseHref(destHref);
  if (housePathname(current.pathname) !== HOME_ROOT) return false;
  if (housePathname(dest.pathname) !== HOME_ROOT) return false;
  if (houseExactHref(currentHref) === houseExactHref(destHref)) return false;
  return housePeriodParam(current.search) !== housePeriodParam(dest.search);
}

export function parseHouseHref(href: string): { pathname: string; search: string } {
  const url = new URL(href, "https://24frame.local");
  return { pathname: url.pathname, search: url.search };
}

export function housePathFromLocation(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

// Panel hops keep ownedHref until Next catches up. A later Next
// navigation (another screen, form GET, router.push) must drop it so
// chrome follows the live RSC dest.
export function houseReconcileOwnedHref(
  ownedHref: string | null,
  nextHref: string,
  previousNextHref: string,
): string | null {
  if (!ownedHref) return null;
  // Caught up to the exact address, including a profile tab query.
  // Screen-key equality is not enough: ?tab= must stay owned until Next
  // actually shows that href, or the client panel snaps back.
  if (houseExactHref(ownedHref) === houseExactHref(nextHref)) return null;
  if (houseExactHref(nextHref) !== houseExactHref(previousNextHref)) return null;
  return ownedHref;
}

const houseScroll = new Map<string, number>();

export function houseRememberScroll(key: string, top: number): void {
  houseScroll.set(key, Math.max(0, top));
}

export function houseReadScroll(key: string): number {
  return houseScroll.get(key) ?? 0;
}

export function resetHouseScrollForTests(): void {
  houseScroll.clear();
}

/**
 * History entry for a panel hop.
 *
 * Next 16 patches `history.pushState` and, unless the state is marked
 * `__NA`, dispatches ACTION_RESTORE with the current FlightRouterState
 * and the new URL. `__NA` is the same flag Next sets on its own history
 * writes to skip that restore. The current flight tree is copied so Back
 * and Forward restore this screen instead of reloading.
 */
export function houseClientHistoryState(prior: unknown): Record<string, unknown> & {
  __NA: true;
  houseClient: true;
} {
  const base =
    prior !== null && typeof prior === "object" ? { ...(prior as Record<string, unknown>) } : {};
  return { ...base, __NA: true, houseClient: true };
}
