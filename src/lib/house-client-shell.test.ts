import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  houseClientHistoryState,
  houseExactHref,
  houseHomePeriodHop,
  houseHop,
  houseHrefKey,
  houseMayClientOwnHop,
  houseReadScroll,
  houseReconcileOwnedHref,
  houseRememberScroll,
  houseScreenKey,
  houseShouldKeepAlive,
  houseSocialHomePanelHop,
  resetHouseScrollForTests,
} from "@/lib/house-client-shell";
import { SOCIAL_ROUTES } from "@/lib/social";

const provider = readFileSync("src/components/chrome/house-client-shell.tsx", "utf8");

describe("house client shell SoT", () => {
  it("keys screens by the query params that change the page", () => {
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
    expect(houseScreenKey("/social/dms", "?ai=1")).toBe("/social/dms");
    expect(houseHrefKey("/social/dms?ai=1")).toBe(houseHrefKey("/social/dms"));
    expect(houseScreenKey("/social/dms/24frame-ai")).toBe("/social/dms/24frame-ai");
    expect(houseScreenKey("/social/dms/24frame-ai")).not.toBe(houseScreenKey("/social/dms", "?ai=1"));
    expect(houseScreenKey("/social/dms/24frame-ai", "?post=p1")).toBe("/social/dms/24frame-ai?post=p1");
    expect(houseScreenKey("/social/dms/24frame-ai", "?story=s1")).toBe("/social/dms/24frame-ai?story=s1");
    expect(houseHrefKey("/social/explore")).toBe("/social/explore");
  });

  it("names the Home period and Social Home lane hops", () => {
    expect(houseHomePeriodHop("/home", "/home?period=ytd")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=2026-09")).toBe(true);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=ytd")).toBe(false);
    expect(houseHomePeriodHop("/home?period=ytd", "/home?period=ytd&ai=1")).toBe(false);
    expect(houseHomePeriodHop("/home", "/home/news")).toBe(false);
    expect(houseHomePeriodHop("/social", "/social?topic=music")).toBe(false);
    expect(houseSocialHomePanelHop("/social", "/social?topic=music")).toBe(true);
    expect(houseSocialHomePanelHop("/social", "/social?lane=for-you")).toBe(true);
    expect(houseSocialHomePanelHop("/social?topic=music", "/social?topic=music")).toBe(false);
    expect(houseSocialHomePanelHop("/social?lane=for-you", "/social")).toBe(true);
    expect(houseSocialHomePanelHop("/social/explore", "/social?topic=music")).toBe(false);
  });

  it("does not take panel hops on live capture or Settings", () => {
    expect(houseShouldKeepAlive("/social/live")).toBe(false);
    expect(houseShouldKeepAlive("/social/stories/new")).toBe(false);
    expect(houseShouldKeepAlive("/social")).toBe(true);
    expect(houseShouldKeepAlive("/settings")).toBe(false);
    expect(houseShouldKeepAlive("/settings/profile")).toBe(false);
    expect(houseShouldKeepAlive("/settings/preferences/theme")).toBe(false);
    expect(houseMayClientOwnHop("/settings/profile", "/settings")).toBe(false);
    expect(houseMayClientOwnHop("/settings", "/social")).toBe(false);
    expect(houseMayClientOwnHop("/social", "/settings")).toBe(false);
  });

  it("does not pushState-exit a cold create screen", () => {
    expect(houseMayClientOwnHop("/social/stories/new", "/social/stories/new")).toBe(false);
    expect(houseMayClientOwnHop("/social", "/social/stories/new")).toBe(false);
    expect(houseMayClientOwnHop("/social/stories/new", "/social")).toBe(false);
    expect(houseMayClientOwnHop("/social/live", "/social/live")).toBe(false);
    expect(houseMayClientOwnHop("/social/live", "/social")).toBe(false);
    expect(houseMayClientOwnHop("/social", "/social")).toBe(true);
    expect(houseMayClientOwnHop("/social", "/social/explore")).toBe(true);
    expect(provider).toContain("if (!houseMayClientOwnHop(parsed.pathname, nextPath)) return false");
    const close = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    expect(close).toContain("HouseLink");
    expect(close).toContain('href={SOCIAL_ROUTES.home}');
    expect(close).toContain('data-social-story-close=""');
  });

  it("remembers scroll per screen key", () => {
    resetHouseScrollForTests();
    houseRememberScroll("/social", 480);
    expect(houseReadScroll("/social")).toBe(480);
    expect(houseReadScroll("/social/explore")).toBe(0);
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

  it("marks panel history so Next restores this screen on Back", () => {
    const prior = { __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: SOCIAL_ROUTES.dms } };
    const state = houseClientHistoryState(prior);
    expect(state.__NA).toBe(true);
    expect(state.houseClient).toBe(true);
    expect(state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({ tree: SOCIAL_ROUTES.dms });
    expect(houseClientHistoryState(null).__NA).toBe(true);
  });
});

// The shell keeps no other screen mounted. A stored copy of the layout's
// children renders Next's current route, so a pushState to another screen
// showed the screen being left.
describe("houseHop — only panel query stays on the shell", () => {
  it("stays on the exact address", () => {
    expect(houseHop("/social/profile?tab=credits", "/social/profile?tab=credits")).toBe("stay");
    expect(houseHop("/home", "/home/")).toBe("stay");
  });

  it("owns panel query on the screen it shows", () => {
    expect(houseHop("/social/profile", "/social/profile?tab=credits")).toBe("panel");
    expect(houseHop("/social/u/ada?tab=media", "/social/u/ada?activity=comments")).toBe("panel");
    expect(houseHop("/social?topic=music", "/social?lane=for-you")).toBe("panel");
    expect(houseHop("/home", "/home?period=ytd")).toBe("panel");
  });

  it("sends every other screen through Next", () => {
    for (const [from, dest] of [
      ["/social", "/social/explore"],
      ["/social", "/aggregation/dashboard"],
      ["/staff/queue", "/aggregation/titles"],
      ["/aggregation/titles", "/staff/queue"],
      ["/home", "/home/news"],
      ["/home", "/social"],
      ["/social/explore", "/social/explore?q=ada"],
      ["/social", "/social?after=abc"],
      ["/social/u/ada", "/social/u/bob"],
      ["/social/dms", "/social/dms/24frame-ai"],
    ]) {
      expect(houseHop(from, dest), `${from} → ${dest}`).toBe("next");
    }
  });

  it("leaves another screen to the caller's Link or push", () => {
    expect(provider).toContain('if (hop === "next") return false;');
    expect(provider).not.toContain("houseCommitHop");
    expect(provider).not.toContain("housePaintedKeys");
  });
});
