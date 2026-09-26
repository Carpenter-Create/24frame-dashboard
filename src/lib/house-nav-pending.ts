import { houseScreenKey, houseScreenQueryNames, parseHouseHref } from "@/lib/house-client-shell";
import { OVERVIEW_HREF } from "@/lib/overview";
import { SOCIAL_ROUTES } from "@/lib/social";

// One pending / prefetch SoT for phone sheet + dock and the Social rail.
// Click paints the destination before the RSC page lands. No lookalike
// nav pending fork. Modified clicks are not same-document hops.

export type HouseNavClickLike = {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function houseNavIgnorePendingClick(event: HouseNavClickLike): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function houseNavActivePath(pathname: string, pendingHref: string | null): string {
  return pendingHref ?? pathname;
}

/** Lands that must match exactly — a child dest is a different hop. */
const HOUSE_NAV_EXACT_PENDING = new Set<string>([SOCIAL_ROUTES.home, OVERVIEW_HREF]);

function locationPath(location: string): string {
  const path = parseHouseHref(location).pathname;
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path || "/";
}

function slotKey(pathname: string, search: string): string | null {
  const names = houseScreenQueryNames(pathname);
  if (names.length === 0) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (!names.some((name) => (params.get(name)?.trim() ?? "") !== "")) return null;
  return houseScreenKey(pathname, search);
}

export function houseNavPendingSettled(location: string, pendingHref: string): boolean {
  if (HOUSE_NAV_EXACT_PENDING.has(pendingHref)) {
    return locationPath(location) === pendingHref;
  }
  const pending = parseHouseHref(pendingHref);
  const live = parseHouseHref(location);
  const pendingSlot = slotKey(pending.pathname, pending.search);
  const liveSlot = slotKey(live.pathname, live.search);
  // A filtered Explore hop is its own slot. Matching the bare pathname
  // would clear pending while keep-alive still shows the other tree.
  if (pendingSlot !== null || liveSlot !== null) {
    return pendingSlot === liveSlot && locationPath(live.pathname) === locationPath(pending.pathname);
  }
  const path = locationPath(location);
  const pendingPath = locationPath(pending.pathname);
  return path === pendingPath || path.startsWith(`${pendingPath}/`);
}

export function prefetchHrefList(
  prefetch: (href: string) => void,
  hrefs: readonly string[],
): void {
  for (const href of hrefs) prefetch(href);
}
