import {
  SOCIAL_CREATE_KIND_PARAM,
  SOCIAL_FOLLOWS_SEARCH_PARAM,
  SOCIAL_PROFILE_TAB_PARAM,
  SOCIAL_ROUTES,
} from "@/lib/social";
import { SOCIAL_FOLLOWING_WALL_CURSOR_PARAM } from "@/lib/social-home-bounds";
import { readSocialHomeLocation } from "@/lib/social-home-location";
import { EDUCATION_ROOT, HOME_ROOT, SOCIAL_ROOT, STAFF_ROOT } from "@/lib/workspace";

// House client-shell SoT.
// Chrome (dock / rails / workspace switcher) stays mounted in AppShell.
// Visited screens stay mounted in HouseScreenCache. Soft RSC is boot /
// refresh only — a warm dock tap must not wait on a signed-URL waterfall.
//
// Client-owned: Social hot paths + last-visited workspace lands.
// Still RSC: auth gate, first document, Aggregation/Education/Staff first
// visit, and any dest that has never been painted this session.

export const HOUSE_CLIENT_SHELL = {
  cacheCap: 8,
  rscFallbackAttr: "data-house-rsc-fallback",
  screenAttr: "data-house-screen",
  screenActiveAttr: "data-house-screen-active",
  scrollAttr: "data-house-lead-scroll",
} as const;

/** Blank outlet recovery. Retries until a slot or ingress paints. */
export const HOUSE_BLANK_OUTLET_RETRY_MS = 50;

const HOUSE_EXACT_SCREENS = new Set<string>([
  SOCIAL_ROUTES.home,
  SOCIAL_ROUTES.explore,
  SOCIAL_ROUTES.profile,
  SOCIAL_ROUTES.profileEdit,
  SOCIAL_ROUTES.dms,
  SOCIAL_ROUTES.create,
  SOCIAL_ROUTES.stories,
  HOME_ROOT,
  "/",
]);

export function isHouseClientOwnedPath(pathname: string): boolean {
  if (HOUSE_EXACT_SCREENS.has(pathname)) return true;
  if (pathname.startsWith(`${SOCIAL_ROUTES.profileEdit}/`)) return true;
  if (pathname.startsWith(`${SOCIAL_ROUTES.home}/p/`)) return true;
  if (pathname.startsWith(`${SOCIAL_ROUTES.home}/u/`)) return true;
  if (pathname.startsWith(`${HOME_ROOT}/`)) return true;
  if (pathname.startsWith(`${SOCIAL_ROOT}/`)) return true;
  return false;
}

export function houseShouldKeepAlive(pathname: string): boolean {
  // Live capture keeps camera/mic on mount. Hidden keep-alive would
  // leave the stream open after a dock tap. Cold RSC remounts those dests.
  return pathname !== SOCIAL_ROUTES.createLive && pathname !== SOCIAL_ROUTES.storiesNew;
}

/**
 * pushState soft-exit is safe only when the screen being left and the
 * Next address are both keep-alive. Cold create (`stories/new`, go live)
 * must return false from `navigateOwned` so Link performs a real Next
 * navigation. Otherwise a cached `/social` hop rewrites the address bar
 * and leaves the create stage painted.
 */
export function houseMayClientOwnHop(currentPathname: string, nextPathname: string): boolean {
  return houseShouldKeepAlive(currentPathname) && houseShouldKeepAlive(nextPathname);
}

export function houseScreenQueryNames(pathname: string): readonly string[] {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname || "/";
  if (path === SOCIAL_ROUTES.home) {
    // Lane and topic are client panel state on the mounted Home screen,
    // same as profile ?tab=. A separate cache slot waited on
    // SocialHomeCenter before the chip could show selected. Cursor
    // still splits the slot.
    return [SOCIAL_FOLLOWING_WALL_CURSOR_PARAM];
  }
  if (path === SOCIAL_ROUTES.explore) {
    return ["q", "tag", "person", "discover"];
  }
  if (path === SOCIAL_ROUTES.search) {
    return ["q"];
  }
  if (path === SOCIAL_ROUTES.create) return [SOCIAL_CREATE_KIND_PARAM];
  // Own profile and /social/u/[handle] keep ?tab= and ?activity= in the
  // address bar, but those params are client panel state on one mounted
  // screen. A new cache slot would RSC-remount the face and rails.
  if (path === SOCIAL_ROUTES.profile || /^\/social\/u\/[^/]+$/.test(path)) {
    return [];
  }
  if (path.startsWith("/social/u/") && path.endsWith("/follows")) {
    return [SOCIAL_PROFILE_TAB_PARAM, SOCIAL_FOLLOWS_SEARCH_PARAM];
  }
  // Account Home `?period=` is panel state on the mounted /home screen,
  // same as Social lane/topic. A separate slot painted home/loading.tsx
  // (a short fallback) under the already-selected Revenue chip.
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

/** Load pushes once. Repeating that href aborts the in-flight RSC hop. */
export function houseBlankOutletRepeats(action: "none" | "refresh" | "load"): boolean {
  return action === "refresh";
}

export function houseWorkspaceLandKey(pathname: string): string {
  if (pathname === "/" || pathname === HOME_ROOT || pathname.startsWith(`${HOME_ROOT}/`)) {
    return HOME_ROOT;
  }
  if (pathname === SOCIAL_ROOT || pathname.startsWith(`${SOCIAL_ROOT}/`)) return SOCIAL_ROOT;
  if (pathname === EDUCATION_ROOT || pathname.startsWith(`${EDUCATION_ROOT}/`)) return EDUCATION_ROOT;
  if (pathname === STAFF_ROOT || pathname.startsWith(`${STAFF_ROOT}/`)) return STAFF_ROOT;
  if (pathname.startsWith("/aggregation") || pathname.startsWith("/titles")) return "/aggregation";
  return pathname;
}

export function parseHouseHref(href: string): { pathname: string; search: string } {
  const url = new URL(href, "https://24frame.local");
  return { pathname: url.pathname, search: url.search };
}

export function housePathFromLocation(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function houseShouldClientNavigate(
  dest: string,
  cachedKeys: Iterable<string>,
): boolean {
  const parsed = parseHouseHref(dest);
  if (!isHouseClientOwnedPath(parsed.pathname)) return false;
  if (!houseShouldKeepAlive(parsed.pathname)) return false;
  return new Set(cachedKeys).has(houseHrefKey(dest));
}

export type HouseNavHop = "stay" | "owned" | "refresh-next" | "next";

/**
 * Exact href decides stay. Same screen key with a different href
 * (profile ?tab= or activity pill) pushStates on the mounted screen.
 * A different cached screen is owned. An uncached dest whose Next
 * address already matches must refresh — a plain Link click is a no-op.
 * Otherwise Next navigates.
 */
export function houseNavHop(input: {
  cached: boolean;
  /** Exact href match with the address the shell is showing. */
  ownedIsDest: boolean;
  /** Exact href match with the Next address. */
  nextIsDest: boolean;
  /** Dest shares the active screen key. */
  sameScreen?: boolean;
}): HouseNavHop {
  if (input.ownedIsDest) return "stay";
  if (input.sameScreen) return "owned";
  if (input.cached) return "owned";
  if (input.nextIsDest && !input.ownedIsDest) return "refresh-next";
  return "next";
}

/** Focus trapped in a hidden keep-alive screen eats later dock clicks. */
export function houseFocusBelongsToInactiveScreen(
  screenHidden: boolean,
  focusInsideScreen: boolean,
): boolean {
  return screenHidden && focusInsideScreen;
}

export function houseTouchOrder(
  order: readonly string[],
  key: string,
  cap: number = HOUSE_CLIENT_SHELL.cacheCap,
): string[] {
  return [key, ...order.filter((item) => item !== key)].slice(0, cap);
}

// Warm client hops keep ownedHref until Next catches up. A later cold
// Next navigation (uncached dest, form GET, router.push) must drop it
// so chrome and the screen cache follow the live RSC dest.
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

const paintedScreens = new Set<string>();
const houseScroll = new Map<string, number>();

export function houseRememberScroll(key: string, top: number): void {
  houseScroll.set(key, Math.max(0, top));
}

export function houseReadScroll(key: string): number {
  return houseScroll.get(key) ?? 0;
}

export function houseRememberPainted(key: string): string[] {
  const next = houseTouchOrder([...paintedScreens], key);
  paintedScreens.clear();
  for (const item of next) paintedScreens.add(item);
  return next;
}

export function houseForgetUnlisted(keys: readonly string[]): void {
  const keep = new Set(keys);
  for (const key of [...paintedScreens]) {
    if (!keep.has(key)) paintedScreens.delete(key);
  }
}

/** Painted keys are exactly the slots that hold a tree. An empty slot is not a warm hop. */
export function houseSyncPainted(keys: readonly string[]): void {
  paintedScreens.clear();
  for (const key of keys) paintedScreens.add(key);
}

export function housePaintedKeys(): string[] {
  return [...paintedScreens];
}

export function resetHousePaintedForTests(): void {
  paintedScreens.clear();
  houseScroll.clear();
}

/**
 * What the shell last committed for the live RSC slot.
 * `snapshot` is the child tree captured when the URL key moved and that
 * tree had not swapped yet. It stays set across the render-phase
 * restart so the same reference is still stale after setState commits.
 * `child` is the last tree rendered. A child that arrives already
 * different from `child` on the key-change render is not snapshotted.
 */
export type HouseChildSeen = {
  key: string;
  snapshot: unknown;
  child: unknown;
};

/**
 * Stale on the key-change render itself — do not wait for setState.
 *
 * Stale only when the live tree is still the previous screen
 * (`child === seen.child` on the flip, or still the flip snapshot).
 * A tree that already differs has swapped. Marking every key change
 * stale hid that screen: the slot stayed empty and the pane stayed white.
 * The committed guard still has the previous key on the flip render,
 * so sameness is `child === seen.child`, not `guard.key === nextKey`.
 */
export function houseSyncChildSeen(
  seen: HouseChildSeen | null,
  nextKey: string,
  child: unknown,
): { seen: HouseChildSeen; childrenStale: boolean } {
  if (seen === null) {
    return { seen: { key: nextKey, snapshot: null, child }, childrenStale: false };
  }

  const keyChanged = seen.key !== nextKey;
  const sameTree = child === seen.child;
  const childrenStale =
    (keyChanged && sameTree) ||
    (!keyChanged && seen.snapshot !== null && child === seen.snapshot);

  if (keyChanged) {
    return {
      seen: {
        key: nextKey,
        snapshot: sameTree ? child : null,
        child,
      },
      childrenStale,
    };
  }

  if (seen.snapshot !== null && child === seen.snapshot) {
    if (seen.child === child) return { seen, childrenStale };
    return { seen: { ...seen, child }, childrenStale };
  }

  if (seen.snapshot === null && seen.child === child) {
    return { seen, childrenStale };
  }

  return { seen: { key: nextKey, snapshot: null, child }, childrenStale };
}

/**
 * History entry for a warm client hop.
 *
 * Next 16 patches `history.pushState` and, unless the state is marked
 * `__NA`, dispatches ACTION_RESTORE with the *previous* FlightRouterState
 * and the new URL. That restore keeps the previous screen (and its rail
 * selection) mounted while the address bar already shows the dest.
 * `__NA` is the same flag Next sets on its own history writes to skip
 * that restore. The previous flight tree is copied so Back is not a
 * full reload.
 */
export function houseClientHistoryState(prior: unknown): Record<string, unknown> & {
  __NA: true;
  houseClient: true;
} {
  const base =
    prior !== null && typeof prior === "object" ? { ...(prior as Record<string, unknown>) } : {};
  return { ...base, __NA: true, houseClient: true };
}

/**
 * Stable-ingest guard. Returns true only when it is safe to capture
 * live `children` into the keep-alive store under `nextKey`.
 *
 * On a cold Next soft-nav the pathname flips before the RSC slot
 * swaps, so `children` is still the *previous* screen's tree.
 * Ingesting that stale tree under the new key poisons the cache.
 *
 * `childrenStale` comes from `houseSyncChildSeen`.
 */
export function houseCanIngest(
  nextKey: string,
  activeKey: string,
  nextPath: string,
  fallback: boolean,
  storeHasKey: boolean,
  childrenStale: boolean,
  storedDiffers = false,
): boolean {
  if (fallback) return false;
  if (storeHasKey && !storedDiffers) return false;
  if (!houseShouldKeepAlive(nextPath)) return false;
  if (activeKey !== nextKey) return false;
  if (childrenStale) return false;
  return true;
}

/**
 * One cache render. Stale is decided from the committed guard before
 * setState. A stale or fallback tree already stored under `nextKey`
 * is dropped. A proven-fresh tree replaces that slot.
 */
export function houseBlankOutlet(
  displayKey: string | null,
  showIngress: boolean,
  activeKey: string,
  nextKey: string,
): "none" | "refresh" | "load" {
  if (displayKey !== null || showIngress) return "none";
  // Owned URL with no slot. Next is still on the other screen — ask it to load this one.
  if (activeKey !== nextKey) return "load";
  // Next is already on this URL and the slot is empty. Revalidate, then accept the settled tree.
  return "refresh";
}

export function houseApplyCachedChild<T>(input: {
  seen: HouseChildSeen | null;
  nextKey: string;
  activeKey: string;
  nextPath: string;
  child: T;
  fallback: boolean;
  order: readonly string[];
  nodes: Record<string, T>;
  /** Next revalidated this URL and the tree did not change. It is the screen. */
  acceptStale?: boolean;
}): {
  seen: HouseChildSeen;
  childrenStale: boolean;
  order: readonly string[];
  nodes: Record<string, T>;
  displayKey: string | null;
  showIngress: boolean;
} {
  let advanced = houseSyncChildSeen(input.seen, input.nextKey, input.child);
  if (
    input.acceptStale &&
    input.activeKey === input.nextKey &&
    advanced.childrenStale &&
    !input.fallback
  ) {
    advanced = {
      seen: { key: input.nextKey, snapshot: null, child: input.child },
      childrenStale: false,
    };
  }
  let order = input.order;
  let nodes = input.nodes;

  const poisoned =
    (advanced.childrenStale || input.fallback) &&
    input.nextKey in nodes &&
    nodes[input.nextKey] === input.child;
  if (poisoned) {
    const nextNodes = { ...nodes };
    delete nextNodes[input.nextKey];
    nodes = nextNodes;
    order = order.filter((key) => key !== input.nextKey);
  }

  const has = input.nextKey in nodes;
  const storedDiffers = has && nodes[input.nextKey] !== input.child;
  if (
    houseCanIngest(
      input.nextKey,
      input.activeKey,
      input.nextPath,
      input.fallback,
      has,
      advanced.childrenStale,
      storedDiffers,
    )
  ) {
    const nextOrder = houseTouchOrder(order, input.nextKey);
    const nextNodes: Record<string, T> = { [input.nextKey]: input.child };
    for (const key of nextOrder) {
      // One element, one slot. A hidden copy of the same tree keeps it
      // display:none and the visible outlet stays white.
      if (key !== input.nextKey && key in nodes && nodes[key] !== input.child) {
        nextNodes[key] = nodes[key] as T;
      }
    }
    nodes = nextNodes;
    order = nextOrder.filter((key) => key in nextNodes);
  }

  if (input.activeKey in nodes && order[0] !== input.activeKey) {
    const nextOrder = houseTouchOrder(order, input.activeKey);
    const nextNodes: Record<string, T> = {};
    for (const key of nextOrder) {
      if (key in nodes) nextNodes[key] = nodes[key] as T;
    }
    nodes = nextNodes;
    order = nextOrder;
  }

  const hasSlot = input.activeKey in nodes && nodes[input.activeKey] != null;
  const paintLive =
    !advanced.childrenStale &&
    input.activeKey === input.nextKey &&
    !hasSlot &&
    !input.fallback;
  const display = houseResolveDisplay(input.activeKey, hasSlot, input.fallback, paintLive);
  const orderSame =
    order === input.order ||
    (order.length === input.order.length && order.every((key, index) => key === input.order[index]));
  if (advanced.seen === input.seen && nodes === input.nodes && orderSame) {
    return {
      seen: advanced.seen,
      childrenStale: advanced.childrenStale,
      order: input.order,
      nodes: input.nodes,
      displayKey: display.displayKey,
      showIngress: display.showIngress,
    };
  }

  return {
    seen: advanced.seen,
    childrenStale: advanced.childrenStale,
    order,
    nodes,
    displayKey: display.displayKey,
    showIngress: display.showIngress,
  };
}

/**
 * Resolves which cached screen to display and whether to paint
 * ingress (live RSC / loading skeleton).
 *
 * When activeKey is not in the store, the live children are either a
 * skeleton, the fresh screen, or still the previous screen. Paint the
 * skeleton and any fresh tree. Do not paint the previous screen — the
 * URL and rail have already moved. An empty slot must not stay empty
 * once the live tree is the screen for this key (`paintLive`).
 */
export function houseResolveDisplay(
  activeKey: string,
  known: boolean,
  fallback: boolean,
  paintLive = false,
): { displayKey: string | null; showIngress: boolean } {
  if (known) return { displayKey: activeKey, showIngress: false };
  if (fallback || paintLive) return { displayKey: null, showIngress: true };
  return { displayKey: null, showIngress: false };
}
