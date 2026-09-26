import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import FollowsLoading from "@/app/(app)/social/u/[handle]/follows/loading";

import {
  HOUSE_CLIENT_SHELL,
  houseApplyCachedChild,
  houseBlankOutlet,
  houseBlankOutletRepeats,
  houseCanIngest,
  houseClientHistoryState,
  houseExactHref,
  houseFocusBelongsToInactiveScreen,
  houseHomePeriodHop,
  houseHrefKey,
  houseMayClientOwnHop,
  houseNavHop,
  housePaintedKeys,
  houseReadScroll,
  houseReconcileOwnedHref,
  houseRememberPainted,
  houseRememberScroll,
  houseResolveDisplay,
  houseScreenKey,
  houseSocialHomePanelHop,
  houseSyncChildSeen,
  houseShouldClientNavigate,
  houseShouldKeepAlive,
  houseSyncPainted,
  houseTouchOrder,
  houseWorkspaceLandKey,
  isHouseClientOwnedPath,
  resetHousePaintedForTests,
} from "@/lib/house-client-shell";
import { isHouseRscFallback } from "@/components/chrome/house-client-shell";
import { SOCIAL_ROUTES } from "@/lib/social";

describe("house client shell SoT", () => {
  it("owns Social hot paths and Home land", () => {
    expect(isHouseClientOwnedPath(SOCIAL_ROUTES.home)).toBe(true);
    expect(isHouseClientOwnedPath(SOCIAL_ROUTES.explore)).toBe(true);
    expect(isHouseClientOwnedPath(SOCIAL_ROUTES.profile)).toBe(true);
    expect(isHouseClientOwnedPath(SOCIAL_ROUTES.profileEdit)).toBe(true);
    expect(isHouseClientOwnedPath(`${SOCIAL_ROUTES.profileEdit}/bio`)).toBe(true);
    expect(isHouseClientOwnedPath("/social/p/11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isHouseClientOwnedPath("/social/u/ada")).toBe(true);
    expect(isHouseClientOwnedPath("/home")).toBe(true);
    expect(isHouseClientOwnedPath("/login")).toBe(false);
  });

  it("keys dests by the query params that change the painted tree", () => {
    expect(houseScreenKey("/social")).toBe("/social");
    expect(houseScreenKey("/social", "?topic=Music")).toBe("/social");
    expect(houseScreenKey("/social", "?lane=for-you")).toBe("/social");
    expect(houseScreenKey("/social", "?topic=music&lane=for-you")).toBe("/social");
    expect(houseExactHref("/social?topic=music")).toBe("/social?topic=music");
    expect(houseScreenKey("/social", "?after=abc")).toBe("/social?after=abc");
    expect(houseScreenKey("/social/explore", "?q=ada")).toBe("/social/explore?q=ada");
    expect(houseScreenKey("/social/explore", "?tag=night")).toBe("/social/explore?tag=night");
    expect(houseScreenKey("/social/explore", "?person=ada")).toBe("/social/explore?person=ada");
    expect(houseScreenKey("/social/explore", "?discover=1&q=ada")).toBe("/social/explore?q=ada&discover=1");
    expect(houseScreenKey("/social/profile", "?tab=credits")).toBe("/social/profile");
    expect(houseScreenKey("/social/profile", "?tab=activity&activity=comments")).toBe("/social/profile");
    expect(houseScreenKey("/social/u/ada", "?tab=highlights")).toBe("/social/u/ada");
    expect(houseScreenKey("/social/u/ada", "?tab=activity&activity=videos")).toBe("/social/u/ada");
    expect(houseHrefKey("/social/profile?tab=credits")).toBe("/social/profile");
    expect(houseExactHref("/social/profile?tab=credits")).toBe("/social/profile?tab=credits");
    expect(houseExactHref("/social/profile")).toBe("/social/profile");
    expect(houseScreenKey("/social/u/ada/follows", "?tab=following&q=ada")).toBe(
      "/social/u/ada/follows?tab=following&q=ada",
    );
    expect(houseScreenKey("/home", "?period=ytd")).toBe("/home");
    expect(houseScreenKey("/home", "?period=2026-09")).toBe("/home");
    expect(houseScreenKey("/", "?period=ytd")).toBe("/");
    expect(houseHomePeriodHop("/home", "/home?period=ytd")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=2026-09")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=ytd")).toBe(false);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=ytd&ai=1")).toBe(false);
    expect(houseHomePeriodHop("/home", "/home/news")).toBe(false);
    expect(houseHomePeriodHop("/social", "/social?topic=music")).toBe(false);
    expect(houseBlankOutletRepeats("load")).toBe(false);
    expect(houseBlankOutletRepeats("refresh")).toBe(true);
    expect(houseBlankOutletRepeats("none")).toBe(false);
    expect(houseHrefKey("/social/explore")).toBe("/social/explore");
    expect(houseShouldClientNavigate("/social?topic=Music", ["/social"])).toBe(true);
    expect(houseSocialHomePanelHop("/social", "/social?topic=music")).toBe(true);
    expect(houseSocialHomePanelHop("/social", "/social?lane=for-you")).toBe(true);
    expect(houseSocialHomePanelHop("/social?topic=music", "/social?topic=music")).toBe(false);
    expect(houseSocialHomePanelHop("/social?lane=for-you", "/social")).toBe(true);
    expect(houseSocialHomePanelHop("/social/explore", "/social?topic=music")).toBe(false);
    expect(houseShouldClientNavigate("/social/profile?tab=credits", ["/social/profile"])).toBe(true);
    expect(houseShouldClientNavigate("/social/u/ada?activity=comments", ["/social/u/ada"])).toBe(true);
    expect(houseWorkspaceLandKey("/social/u/ada")).toBe("/social");
    expect(houseWorkspaceLandKey("/home/news")).toBe("/home");
    expect(HOUSE_CLIENT_SHELL.cacheCap).toBeGreaterThanOrEqual(6);
  });

  it("does not keep live camera dests mounted", () => {
    expect(houseShouldKeepAlive("/social/create/live")).toBe(false);
    expect(houseShouldKeepAlive("/social/stories/new")).toBe(false);
    expect(houseShouldKeepAlive("/social")).toBe(true);
    expect(houseShouldClientNavigate("/social/create/live", ["/social/create/live"])).toBe(false);
  });

  it("does not pushState-exit a cold create screen", () => {
    expect(houseMayClientOwnHop("/social/stories/new", "/social/stories/new")).toBe(false);
    expect(houseMayClientOwnHop("/social", "/social/stories/new")).toBe(false);
    expect(houseMayClientOwnHop("/social/stories/new", "/social")).toBe(false);
    expect(houseMayClientOwnHop("/social/create/live", "/social/create/live")).toBe(false);
    expect(houseMayClientOwnHop("/social/create/live", "/social")).toBe(false);
    expect(houseMayClientOwnHop("/social", "/social")).toBe(true);
    expect(houseMayClientOwnHop("/social", "/social/explore")).toBe(true);
    const provider = readFileSync("src/components/chrome/house-client-shell.tsx", "utf8");
    expect(provider).toContain("if (!houseMayClientOwnHop(parsed.pathname, nextPath)) return false");
    const close = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    expect(close).toContain("HouseLink");
    expect(close).toContain('href={SOCIAL_ROUTES.home}');
    expect(close).toContain('data-social-story-close=""');
  });

  it("remembers scroll per screen key", () => {
    resetHousePaintedForTests();
    houseRememberScroll("/social", 480);
    expect(houseReadScroll("/social")).toBe(480);
    expect(houseReadScroll("/social/explore")).toBe(0);
  });

  it("remembers painted screens for warm client hops", () => {
    resetHousePaintedForTests();
    houseRememberPainted("/social");
    houseRememberPainted("/social/explore");
    expect(housePaintedKeys()[0]).toBe("/social/explore");
    expect(houseShouldClientNavigate("/social", housePaintedKeys())).toBe(true);
    resetHousePaintedForTests();
    expect(houseShouldClientNavigate("/social", housePaintedKeys())).toBe(false);
  });

  it("does not swallow a profile return when Next is stuck on that pathname", () => {
    expect(houseNavHop({ cached: true, ownedIsDest: false, nextIsDest: true })).toBe("owned");
    expect(houseNavHop({ cached: true, ownedIsDest: true, nextIsDest: true })).toBe("stay");
    expect(houseNavHop({ cached: false, ownedIsDest: false, nextIsDest: true })).toBe("refresh-next");
    expect(houseNavHop({ cached: false, ownedIsDest: false, nextIsDest: false })).toBe("next");
    expect(
      houseNavHop({ cached: true, ownedIsDest: false, nextIsDest: false, sameScreen: true }),
    ).toBe("owned");
    expect(
      houseNavHop({ cached: false, ownedIsDest: false, nextIsDest: false, sameScreen: true }),
    ).toBe("owned");
    expect(
      houseNavHop({ cached: true, ownedIsDest: true, nextIsDest: false, sameScreen: true }),
    ).toBe("stay");
    const provider = readFileSync("src/components/chrome/house-client-shell.tsx", "utf8");
    expect(provider).toContain("sameScreen: houseHrefKey(href) === houseHrefKey(dest)");
    expect(provider).toContain("houseExactHref(href) === houseExactHref(dest)");
    expect(provider).toContain("houseExactHref(seenNextHref) !== houseExactHref(nextHref)");
    expect(houseFocusBelongsToInactiveScreen(true, true)).toBe(true);
    expect(houseFocusBelongsToInactiveScreen(false, true)).toBe(false);
    expect(houseFocusBelongsToInactiveScreen(true, false)).toBe(false);
  });

  it("client-navigates only when the dest is owned and already mounted", () => {
    const cached = ["/social", "/social/explore", "/social/profile"];
    expect(houseShouldClientNavigate("/social", cached)).toBe(true);
    expect(houseShouldClientNavigate("/social/explore", cached)).toBe(true);
    expect(houseShouldClientNavigate("/social/p/11111111-1111-4111-8111-111111111111", cached)).toBe(
      false,
    );
    expect(houseShouldClientNavigate("/login", cached)).toBe(false);
    expect(houseShouldClientNavigate("/social", [])).toBe(false);
  });

  it("clears owned href when Next navigates to a different dest", () => {
    expect(houseReconcileOwnedHref("/social", "/social", "/social/explore")).toBeNull();
    expect(houseReconcileOwnedHref("/social", "/social/explore", "/social/explore")).toBe(
      "/social",
    );
    expect(houseReconcileOwnedHref("/social", "/social/search", "/social/explore")).toBeNull();
    expect(houseReconcileOwnedHref(null, "/social", "/social")).toBeNull();
    expect(
      houseReconcileOwnedHref(
        "/social/profile?tab=credits",
        "/social/profile",
        "/social/profile",
      ),
    ).toBe("/social/profile?tab=credits");
    expect(
      houseReconcileOwnedHref(
        "/social/profile?tab=credits",
        "/social/profile?tab=credits",
        "/social/profile",
      ),
    ).toBeNull();
    expect(
      houseReconcileOwnedHref(
        "/social/u/ada?tab=highlights",
        "/social/u/ada?activity=comments",
        "/social/u/ada",
      ),
    ).toBeNull();
  });

  it("touches a revisited screen to the front of the cap", () => {
    expect(houseTouchOrder(["/social", "/social/explore", "/home"], "/home", 8)).toEqual([
      "/home",
      "/social",
      "/social/explore",
    ]);
    expect(houseTouchOrder(["/a", "/b", "/c"], "/d", 3)).toEqual(["/d", "/a", "/b"]);
  });

  it("treats the RSC fallback marker as a skeleton, not a screen", () => {
    const fallback = createElement("div", { "data-house-rsc-fallback": "" }, null);
    expect(isValidElement(fallback)).toBe(true);
    expect(isHouseRscFallback(fallback)).toBe(true);
    expect(isHouseRscFallback(createElement("div", null, "Home"))).toBe(false);
  });
});

describe("houseCanIngest — stable-ingest guard", () => {
  it("blocks ingest when children are stale (pathname-flip render)", () => {
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", false, false, true),
    ).toBe(false);
    expect(
      houseCanIngest("/social/explore", "/social/explore", "/social/explore", false, false, true),
    ).toBe(false);
  });

  it("allows ingest once children are fresh (RSC slot has swapped)", () => {
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", false, false, false),
    ).toBe(true);
  });

  it("blocks ingest when children is an RSC fallback", () => {
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", true, false, false),
    ).toBe(false);
  });

  it("blocks ingest when the key is already in the store", () => {
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", false, true, false),
    ).toBe(false);
  });

  it("replaces a stored tree when a proven-fresh child differs", () => {
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", false, true, false, true),
    ).toBe(true);
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", false, true, true, true),
    ).toBe(false);
    expect(
      houseCanIngest("/social/profile", "/social/profile", "/social/profile", true, true, false, true),
    ).toBe(false);
  });

  it("blocks ingest when activeKey differs from nextKey (warm hop while Next lags)", () => {
    expect(
      houseCanIngest("/social", "/social/profile", "/social", false, false, false),
    ).toBe(false);
  });

  it("blocks ingest for non-keepalive dests", () => {
    expect(
      houseCanIngest("/social/create/live", "/social/create/live", "/social/create/live", false, false, false),
    ).toBe(false);
  });
});

describe("houseResolveDisplay — cold-nav display", () => {
  it("shows the cached screen when activeKey is known", () => {
    const result = houseResolveDisplay("/social", true, false);
    expect(result).toEqual({ displayKey: "/social", showIngress: false });
  });

  it("shows ingress (skeleton) when children is an RSC fallback", () => {
    const result = houseResolveDisplay("/social/profile", false, true);
    expect(result).toEqual({ displayKey: null, showIngress: true });
  });

  it("does not show the previous screen when the URL key is not stored", () => {
    const result = houseResolveDisplay("/social/profile", false, false);
    expect(result).toEqual({ displayKey: null, showIngress: false });
    expect(result.displayKey).not.toBe("/social/dms");
  });

  it("paints the live tree when the active key is missing and the child is fresh", () => {
    expect(houseResolveDisplay("/social", false, false, true)).toEqual({
      displayKey: null,
      showIngress: true,
    });
  });
});

describe("cold-nav poison prevention (integration)", () => {
  it("cold nav must NOT mark the dest painted when children are stale", () => {
    resetHousePaintedForTests();
    houseRememberPainted("/social");

    const nextKey = "/social/profile";
    const canIngest = houseCanIngest(nextKey, nextKey, nextKey, false, false, true);
    expect(canIngest).toBe(false);

    expect(housePaintedKeys()).not.toContain("/social/profile");
    expect(housePaintedKeys()).toContain("/social");
  });

  it("after children refresh, ingest is allowed and housePaintedKeys includes the new key", () => {
    resetHousePaintedForTests();
    const nextKey = "/social/profile";
    const canIngest = houseCanIngest(nextKey, nextKey, nextKey, false, false, false);
    expect(canIngest).toBe(true);

    houseRememberPainted(nextKey);
    expect(housePaintedKeys()).toContain("/social/profile");
  });

  it("fallback children never get remembered as painted", () => {
    resetHousePaintedForTests();
    const canIngest = houseCanIngest(
      "/social/profile",
      "/social/profile",
      "/social/profile",
      true,
      false,
      false,
    );
    expect(canIngest).toBe(false);
    expect(housePaintedKeys()).not.toContain("/social/profile");
  });

  it("warm hop still client-navigates only when key is painted", () => {
    resetHousePaintedForTests();
    houseRememberPainted("/social");
    houseRememberPainted("/social/explore");

    expect(houseShouldClientNavigate("/social/explore", housePaintedKeys())).toBe(true);
    expect(houseShouldClientNavigate("/social/profile", housePaintedKeys())).toBe(false);
  });
});

const FOLLOWS_KEY = houseScreenKey("/social/u/ada/follows", "?tab=following");
const FOLLOWS_PATH = "/social/u/ada/follows";

function walkLoadingFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkLoadingFiles(path, out);
    else if (name === "loading.tsx") out.push(path);
  }
  return out;
}

function routeFromLoadingFile(file: string): string {
  const route = file
    .replace(/\\/g, "/")
    .replace(/^src\/app\/\(app\)/, "")
    .replace(/\/loading\.tsx$/, "");
  return route || "/";
}

/**
 * Cold Profile → Following. Pathname flips first (stale profile), then
 * loading.tsx, then the resolved list. The shell must paint the skeleton
 * as ingress and store only the resolved list.
 */
function coldFollowsNav(loading: ReactNode, page: ReactNode) {
  const profile = createElement("div", { "data-social-profile": "" }, "profile");
  let nodes: Record<string, ReactNode> = { "/social/profile": profile };
  const has = (key: string) => key in nodes;

  const apply = (children: ReactNode, stale: boolean) => {
    const fallback = isHouseRscFallback(children);
    if (houseCanIngest(FOLLOWS_KEY, FOLLOWS_KEY, FOLLOWS_PATH, fallback, has(FOLLOWS_KEY), stale)) {
      nodes = { ...nodes, [FOLLOWS_KEY]: children };
    }
    return houseResolveDisplay(FOLLOWS_KEY, has(FOLLOWS_KEY), fallback);
  };

  return {
    flip: apply(profile, true),
    loading: apply(loading, false),
    page: apply(page, false),
    stored: nodes[FOLLOWS_KEY],
  };
}

describe("follows cold nav leaves the skeleton", () => {
  const page = createElement("div", { "data-social-follows": "" }, "list");

  it("marks every client-owned loading.tsx so the shell cannot cache it", () => {
    const owned = walkLoadingFiles("src/app/(app)").filter((file) =>
      isHouseClientOwnedPath(routeFromLoadingFile(file)),
    );
    expect(owned.length).toBeGreaterThan(0);
    const bare = owned.filter(
      (file) => !readFileSync(file, "utf8").includes(HOUSE_CLIENT_SHELL.rscFallbackAttr),
    );
    expect(bare).toEqual([]);
  });

  it("treats Follows loading as ingress and stores the resolved list", () => {
    const loading = FollowsLoading();
    expect(isHouseRscFallback(loading)).toBe(true);
    const nav = coldFollowsNav(loading, page);
    expect(nav.flip).toEqual({ displayKey: null, showIngress: false });
    expect(nav.loading).toEqual({ displayKey: null, showIngress: true });
    expect(nav.page).toEqual({ displayKey: FOLLOWS_KEY, showIngress: false });
    expect(nav.stored).toBe(page);
  });

  it("an unmarked skeleton is stored and blocks the resolved list", () => {
    const unmarked = createElement("div", { "data-social-follows-skeleton": "" });
    expect(isHouseRscFallback(unmarked)).toBe(false);
    const nav = coldFollowsNav(unmarked, page);
    expect(nav.loading).toEqual({ displayKey: FOLLOWS_KEY, showIngress: false });
    expect(nav.page.displayKey).toBe(FOLLOWS_KEY);
    expect(nav.page.showIngress).toBe(false);
    expect(nav.stored).toBe(unmarked);
    expect(nav.stored).not.toBe(page);
  });
});

const SOCIAL_RAIL = [
  SOCIAL_ROUTES.home,
  SOCIAL_ROUTES.explore,
  SOCIAL_ROUTES.create,
  SOCIAL_ROUTES.dms,
  SOCIAL_ROUTES.profile,
] as const;

function railTree(key: string): { screen: string } {
  return { screen: key };
}

function cacheStep(
  seen: Parameters<typeof houseApplyCachedChild>[0]["seen"],
  key: string,
  child: unknown,
  nodes: Record<string, unknown>,
  order: readonly string[],
) {
  return houseApplyCachedChild({
    seen,
    nextKey: key,
    activeKey: key,
    nextPath: key,
    child,
    fallback: false,
    nodes,
    order,
  });
}

describe("Social rail cache flips", () => {
  it("treats the flip render as stale while the committed guard still has the old key", () => {
    const messages = railTree(SOCIAL_ROUTES.dms);
    const committed = { key: SOCIAL_ROUTES.dms, snapshot: null, child: messages };
    expect(committed.key).not.toBe(SOCIAL_ROUTES.profile);

    const flip = houseSyncChildSeen(committed, SOCIAL_ROUTES.profile, messages);
    expect(flip.childrenStale).toBe(true);

    const applied = cacheStep(committed, SOCIAL_ROUTES.profile, messages, { [SOCIAL_ROUTES.dms]: messages }, [SOCIAL_ROUTES.dms]);
    expect(applied.childrenStale).toBe(true);
    expect(applied.nodes[SOCIAL_ROUTES.profile]).toBeUndefined();
    expect(applied.displayKey).not.toBe(SOCIAL_ROUTES.profile);
    expect(applied.displayKey).not.toBe(SOCIAL_ROUTES.dms);
  });

  it("drops a poisoned slot and stores the fresh tree when it arrives", () => {
    const messages = railTree(SOCIAL_ROUTES.dms);
    const profile = railTree(SOCIAL_ROUTES.profile);
    const poisoned = cacheStep(
      { key: SOCIAL_ROUTES.profile, snapshot: messages, child: messages },
      SOCIAL_ROUTES.profile,
      messages,
      { [SOCIAL_ROUTES.profile]: messages },
      [SOCIAL_ROUTES.profile],
    );
    expect(poisoned.childrenStale).toBe(true);
    expect(poisoned.nodes[SOCIAL_ROUTES.profile]).toBeUndefined();
    expect(poisoned.displayKey).toBeNull();

    const healed = cacheStep(poisoned.seen, SOCIAL_ROUTES.profile, profile, poisoned.nodes, poisoned.order);
    expect(healed.childrenStale).toBe(false);
    expect(healed.nodes[SOCIAL_ROUTES.profile]).toBe(profile);
    expect(healed.displayKey).toBe(SOCIAL_ROUTES.profile);
  });

  it("replaces a poisoned slot when the fresh tree differs from the stored node", () => {
    const messages = railTree(SOCIAL_ROUTES.dms);
    const profile = railTree(SOCIAL_ROUTES.profile);
    const healed = cacheStep(
      { key: SOCIAL_ROUTES.profile, snapshot: null, child: messages },
      SOCIAL_ROUTES.profile,
      profile,
      { [SOCIAL_ROUTES.profile]: messages },
      [SOCIAL_ROUTES.profile],
    );
    expect(healed.childrenStale).toBe(false);
    expect(healed.nodes[SOCIAL_ROUTES.profile]).toBe(profile);
    expect(healed.nodes[SOCIAL_ROUTES.profile]).not.toBe(messages);
    expect(healed.displayKey).toBe(SOCIAL_ROUTES.profile);
  });

  it("keeps URL key, stored tree, and display aligned for every rail hop", () => {
    for (const from of SOCIAL_RAIL) {
      for (const to of SOCIAL_RAIL) {
        if (from === to) continue;
        const fromTree = railTree(from);
        const toTree = railTree(to);
        const booted = cacheStep(null, from, fromTree, {}, []);
        const settled = cacheStep(booted.seen, from, fromTree, booted.nodes, booted.order);
        expect(settled.nodes[from]).toBe(fromTree);
        expect(settled.displayKey).toBe(from);

        const flip = cacheStep(settled.seen, to, fromTree, settled.nodes, settled.order);
        const flipRestart = cacheStep(flip.seen, to, fromTree, flip.nodes, flip.order);
        expect(flip.childrenStale).toBe(true);
        expect(flipRestart.childrenStale).toBe(true);
        expect(flipRestart.nodes[to]).toBeUndefined();
        expect(flipRestart.displayKey).toBeNull();

        const landed = cacheStep(flipRestart.seen, to, toTree, flipRestart.nodes, flipRestart.order);
        expect(landed.childrenStale).toBe(false);
        expect(landed.nodes[to]).toBe(toTree);
        expect(landed.displayKey).toBe(to);
        expect(landed.nodes[from]).toBe(fromTree);
      }
    }
  });

  it("ingests a child that arrives in the same render as the key", () => {
    const messages = railTree(SOCIAL_ROUTES.dms);
    const profile = railTree(SOCIAL_ROUTES.profile);
    const booted = cacheStep(null, SOCIAL_ROUTES.dms, messages, {}, []);
    const settled = cacheStep(booted.seen, SOCIAL_ROUTES.dms, messages, booted.nodes, booted.order);
    const flip = cacheStep(settled.seen, SOCIAL_ROUTES.profile, profile, settled.nodes, settled.order);
    expect(flip.childrenStale).toBe(false);
    expect(flip.nodes[SOCIAL_ROUTES.profile]).toBe(profile);
    expect(flip.displayKey).toBe(SOCIAL_ROUTES.profile);
    expect(flip.showIngress).toBe(false);
    const restart = cacheStep(flip.seen, SOCIAL_ROUTES.profile, profile, flip.nodes, flip.order);
    expect(restart.displayKey).toBe(SOCIAL_ROUTES.profile);
    expect(restart.nodes[SOCIAL_ROUTES.profile]).toBe(profile);
  });

  it("keeps the mounted Home screen while a period query is still the loading fallback", () => {
    const home = railTree("/home");
    const booted = cacheStep(null, "/home", home, {}, []);
    const settled = cacheStep(booted.seen, "/home", home, booted.nodes, booted.order);
    const loading = railTree("home-loading");
    const during = houseApplyCachedChild({
      seen: settled.seen,
      nextKey: "/home",
      activeKey: "/home",
      nextPath: "/home",
      child: loading,
      fallback: true,
      nodes: settled.nodes,
      order: settled.order,
    });
    expect(during.displayKey).toBe("/home");
    expect(during.showIngress).toBe(false);
    expect(during.nodes["/home"]).toBe(home);
    expect(houseBlankOutlet(during.displayKey, during.showIngress, "/home", "/home")).toBe("none");
  });

  it("paints Home when the live tree arrives with the URL and the slot was empty", () => {
    const explore = railTree(SOCIAL_ROUTES.explore);
    const home = railTree(SOCIAL_ROUTES.home);
    const booted = cacheStep(null, SOCIAL_ROUTES.explore, explore, {}, []);
    const settled = cacheStep(booted.seen, SOCIAL_ROUTES.explore, explore, booted.nodes, booted.order);
    const landed = cacheStep(settled.seen, SOCIAL_ROUTES.home, home, settled.nodes, settled.order);
    expect(landed.childrenStale).toBe(false);
    expect(landed.displayKey).toBe(SOCIAL_ROUTES.home);
    expect(landed.nodes[SOCIAL_ROUTES.home]).toBe(home);
    expect(landed.showIngress).toBe(false);
    expect(landed.nodes[SOCIAL_ROUTES.explore]).toBe(explore);
    expect(houseBlankOutlet(landed.displayKey, landed.showIngress, SOCIAL_ROUTES.home, SOCIAL_ROUTES.home)).toBe(
      "none",
    );
  });

  it("does not leave a poisoned empty slot white once the settled tree is accepted", () => {
    const messages = railTree(SOCIAL_ROUTES.dms);
    const profile = railTree(SOCIAL_ROUTES.profile);
    const poisoned = cacheStep(
      { key: SOCIAL_ROUTES.profile, snapshot: messages, child: messages },
      SOCIAL_ROUTES.profile,
      messages,
      { [SOCIAL_ROUTES.profile]: messages },
      [SOCIAL_ROUTES.profile],
    );
    expect(poisoned.displayKey).toBeNull();
    expect(poisoned.showIngress).toBe(false);
    expect(houseBlankOutlet(poisoned.displayKey, poisoned.showIngress, SOCIAL_ROUTES.profile, SOCIAL_ROUTES.profile)).toBe(
      "refresh",
    );

    const accepted = houseApplyCachedChild({
      seen: poisoned.seen,
      nextKey: SOCIAL_ROUTES.profile,
      activeKey: SOCIAL_ROUTES.profile,
      nextPath: SOCIAL_ROUTES.profile,
      child: messages,
      fallback: false,
      nodes: poisoned.nodes,
      order: poisoned.order,
      acceptStale: true,
    });
    expect(accepted.childrenStale).toBe(false);
    expect(accepted.displayKey).toBe(SOCIAL_ROUTES.profile);
    expect(accepted.nodes[SOCIAL_ROUTES.profile]).toBe(messages);
    expect(accepted.showIngress).toBe(false);

    const real = cacheStep(accepted.seen, SOCIAL_ROUTES.profile, profile, accepted.nodes, accepted.order);
    expect(real.nodes[SOCIAL_ROUTES.profile]).toBe(profile);
    expect(real.nodes[SOCIAL_ROUTES.profile]).not.toBe(messages);
    expect(real.displayKey).toBe(SOCIAL_ROUTES.profile);
  });

  it("asks Next to load a warm hop whose slot is missing instead of painting the other screen", () => {
    const explore = railTree(SOCIAL_ROUTES.explore);
    const applied = houseApplyCachedChild({
      seen: { key: SOCIAL_ROUTES.explore, snapshot: null, child: explore },
      nextKey: SOCIAL_ROUTES.explore,
      activeKey: SOCIAL_ROUTES.home,
      nextPath: SOCIAL_ROUTES.explore,
      child: explore,
      fallback: false,
      nodes: { [SOCIAL_ROUTES.explore]: explore },
      order: [SOCIAL_ROUTES.explore],
    });
    expect(applied.displayKey).toBeNull();
    expect(applied.showIngress).toBe(false);
    expect(applied.displayKey).not.toBe(SOCIAL_ROUTES.explore);
    expect(applied.nodes[SOCIAL_ROUTES.home]).toBeUndefined();
    expect(houseBlankOutlet(applied.displayKey, applied.showIngress, SOCIAL_ROUTES.home, SOCIAL_ROUTES.explore)).toBe(
      "load",
    );
  });

  it("paints a non-keepalive dest instead of an empty slot", () => {
    const live = railTree("/social/create/live");
    const applied = houseApplyCachedChild({
      seen: null,
      nextKey: "/social/create/live",
      activeKey: "/social/create/live",
      nextPath: "/social/create/live",
      child: live,
      fallback: false,
      nodes: {},
      order: [],
    });
    expect(applied.nodes["/social/create/live"]).toBeUndefined();
    expect(applied.displayKey).toBeNull();
    expect(applied.showIngress).toBe(true);
  });

  it("drops a painted key that has no slot so Home is not a warm hop to white", () => {
    resetHousePaintedForTests();
    houseRememberPainted(SOCIAL_ROUTES.home);
    houseRememberPainted(SOCIAL_ROUTES.explore);
    houseSyncPainted([SOCIAL_ROUTES.explore]);
    expect(houseShouldClientNavigate(SOCIAL_ROUTES.home, housePaintedKeys())).toBe(false);
    expect(houseShouldClientNavigate(SOCIAL_ROUTES.explore, housePaintedKeys())).toBe(true);
    resetHousePaintedForTests();
  });

  it("marks warm history so Next does not restore the previous flight tree", () => {
    const prior = { __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: SOCIAL_ROUTES.dms } };
    const state = houseClientHistoryState(prior);
    expect(state.__NA).toBe(true);
    expect(state.houseClient).toBe(true);
    expect(state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({ tree: SOCIAL_ROUTES.dms });
    expect(houseClientHistoryState(null).__NA).toBe(true);
  });
});
