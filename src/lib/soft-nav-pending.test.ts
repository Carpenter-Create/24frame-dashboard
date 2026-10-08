import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  houseHop,
  houseHrefKey,
  houseScreenKey,
  houseScreenQueryNames,
} from "@/lib/house-client-shell";
import { houseNavPendingSettled } from "@/lib/house-nav-pending";
import { SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_CATEGORY_ALL } from "@/lib/social-categories";
import { resolveSocialHomeLocation } from "@/lib/social-home-location";
import { workspacePillClickDest } from "@/lib/workspace-switcher";

const AGGREGATION_LOADING = [
  "src/app/(app)/aggregation/dashboard/loading.tsx",
  "src/app/(app)/aggregation/titles/loading.tsx",
  "src/app/(app)/aggregation/titles/[id]/loading.tsx",
  "src/app/(app)/aggregation/titles/[id]/metadata/loading.tsx",
  "src/app/(app)/aggregation/attention/loading.tsx",
  "src/app/(app)/aggregation/reports/loading.tsx",
  "src/app/(app)/aggregation/reports/[periodId]/loading.tsx",
] as const;

describe("soft-nav pending selection", () => {
  it("points Aggregation desktop, Settings, and the workspace waffle at markPending/activePath", () => {
    const sideNav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    const settings = readFileSync("src/components/chrome/settings-rail.tsx", "utf8");
    const pills = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
    expect(sideNav).toContain("houseRailActiveIndex(activePath, model, workspace)");
    expect(sideNav).not.toContain("social ? activePath : pathname");
    expect(sideNav).toContain("onClick={(event) => markPending(item.href, event)}");
    expect(sideNav).toContain("<SocialNavPendingProbe");
    expect(settings).toContain("useHouseNavPending");
    expect(settings).toContain("settingsHubSection(activePath)");
    expect(settings).toContain("markPending(item.href, event)");
    expect(settings).toContain("HouseNavPendingProbe");
    expect(pills).toContain("const chromePath = activePath || pathname");
    expect(pills).toContain("overviewLeadSelected(tile.mode, chromePath, current)");
    expect(pills).toContain("shellPath");
    expect(pills).toContain("house?.navigateOwned");
    expect(pills).toContain("markPending?.(dest, event)");
    expect(pills).toContain("if (navigateOwned?.(dest, event)) return");
    expect(pills).toContain("router.push(dest)");
    expect(pills).not.toContain("router.push(pill.href)");
    expect(pills).not.toContain("selectLeadPill(\n                  routeWorkspace,");
    expect(
      workspacePillClickDest({
        shellPath: "/social",
        workspace: "social",
        pill: { id: "home", href: "/home" },
        options: [],
      }),
    ).toBe("/home");
    expect(
      workspacePillClickDest({
        shellPath: "/home",
        workspace: "aggregation",
        pill: { id: "home", href: "/home" },
        options: [],
      }),
    ).toBeNull();
    expect(
      workspacePillClickDest({
        shellPath: "/social",
        workspace: "aggregation",
        pill: { id: "aggregation", href: "/aggregation/dashboard" },
        options: [{ mode: "aggregation" }],
      }),
    ).toBe("/aggregation/dashboard");
  });

  it("reads Home lane and topic from the owned href without swapping the center", () => {
    const topics = readFileSync("src/components/social/social-home-topics.tsx", "utf8");
    const slot = readFileSync("src/components/social/social-home-cold-slot.tsx", "utf8");
    const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    // The topic row reads the owned href. The lane stays in the address
    // (?lane=for-you); its slider is gone (founder 2026-10-08).
    expect(topics).toContain("useSocialHomeLive");
    expect(topics).toContain("data-social-home-topic");
    expect(home).not.toContain("SocialHomeLaneTabs");
    expect(slot).toContain("return children");
    expect(slot).toContain("router.push(house.href, { scroll: false })");
    expect(slot).toContain("pushed.current = null");
    expect(slot).not.toContain("<SocialHomeCenterSkeleton");
    expect(slot).not.toContain("<SocialForYouSkeleton");
    expect(slot).not.toContain("live.lane !== \"following\"");
    expect(home).toContain("<SocialHomeTopics active={topic} lane={lane}");
    expect(home).not.toContain("SocialHomeTabs");
    expect(home).toContain("<SocialHomeColdSlot");
    expect(home).toContain("<SocialHomeFollowingRail");
    expect(
      resolveSocialHomeLocation({
        owned: true,
        search: "?topic=music&lane=for-you",
        nextSearch: "",
        seedLane: "following",
        seedTopic: SOCIAL_CATEGORY_ALL,
      }),
    ).toEqual({ lane: "for-you", topic: "Music" });
    expect(
      resolveSocialHomeLocation({
        owned: false,
        search: "?topic=music",
        nextSearch: "",
        seedLane: "following",
        seedTopic: "Acting",
      }),
    ).toEqual({ lane: "following", topic: "Acting" });
  });
});

describe("soft-nav Explore query hops", () => {
  it("keeps q, tag, person, discover, and a ?v= reel as separate screens from default For You", () => {
    expect(houseScreenQueryNames(SOCIAL_ROUTES.explore)).toEqual(["q", "tag", "person", "discover", "v"]);
    // A feed reel tile opens /social/explore?v=<post>: a Next navigation that loads that reel.
    const reel = houseHrefKey("/social/explore?v=11111111-1111-4111-8111-111111111111");
    expect(reel).toBe("/social/explore?v=11111111-1111-4111-8111-111111111111");
    expect(houseHop(houseScreenKey(SOCIAL_ROUTES.explore), reel)).toBe("next");
    expect(houseHop("/social", reel)).toBe("next");
    const base = houseScreenKey(SOCIAL_ROUTES.explore);
    const keyword = houseHrefKey("/social/explore?q=ada");
    const tag = houseHrefKey("/social/explore?tag=night");
    const person = houseHrefKey("/social/explore?person=ada");
    const discover = houseHrefKey("/social/explore?discover=1&q=ada");
    expect(keyword).toBe("/social/explore?q=ada");
    expect(tag).toBe("/social/explore?tag=night");
    expect(person).toBe("/social/explore?person=ada");
    expect(discover).toBe("/social/explore?q=ada&discover=1");
    expect(new Set([base, keyword, tag, person, discover]).size).toBe(5);
    expect(houseHop(base, keyword)).toBe("next");
    expect(houseHop(keyword, tag)).toBe("next");
    expect(houseHop(base, person)).toBe("next");
    expect(houseHop(keyword, discover)).toBe("next");
    expect(houseNavPendingSettled(base, keyword)).toBe(false);
    expect(houseNavPendingSettled(keyword, keyword)).toBe(true);
    const pending = readFileSync("src/components/chrome/use-house-nav-pending.ts", "utf8");
    expect(pending).toContain("house?.href ?? pathname");
    expect(pending).toContain("houseNavPendingSettled(location, pendingHref)");
  });

  // Next loads the filter and its clear. The shell keeps no For You copy
  // to paint under either address.
  it("loads a tag filter and its clear through Next", () => {
    const base = houseScreenKey(SOCIAL_ROUTES.explore);
    const tag = houseHrefKey("/social/explore?tag=night");
    const cleared = houseHrefKey(SOCIAL_ROUTES.explore);
    expect(cleared).toBe(base);
    expect(tag).not.toBe(base);
    expect(houseHop("/social/explore", "/social/explore?tag=night")).toBe("next");
    expect(houseHop("/social/explore?tag=night", "/social/explore")).toBe("next");
    expect(houseNavPendingSettled(base, tag)).toBe(false);
    expect(houseNavPendingSettled(tag, base)).toBe(false);
  });
});

describe("soft-nav cold hop", () => {
  it("paints Next's screen with no blank-outlet timers or refresh", () => {
    const provider = readFileSync("src/components/chrome/house-client-shell.tsx", "utf8");
    const outlet = provider.slice(provider.indexOf("export function HouseScreenOutlet"));
    expect(outlet).toContain("{children}");
    expect(outlet).not.toContain("setInterval");
    expect(outlet).not.toContain("setTimeout");
    expect(outlet).not.toContain("router.refresh");
    expect(outlet).not.toContain("hidden=");
    expect(provider).not.toContain("router.replace");
    expect(provider).toContain("houseSocialHomePanelHop");
    expect(provider).toContain("houseHomePeriodHop");
    expect(provider).toContain("router.push(href, { scroll: false })");
    const home = readFileSync("src/app/(app)/home/loading.tsx", "utf8");
    expect(home).toContain("data-house-rsc-fallback");
    expect(home).toContain("min-h-[12rem]");
  });

  it("marks Settings and Aggregation loading as house ingress", () => {
    const settings = readFileSync("src/app/(app)/settings/loading.tsx", "utf8");
    expect(settings).toContain("data-house-rsc-fallback");
    for (const path of AGGREGATION_LOADING) {
      expect(readFileSync(path, "utf8")).toContain("data-house-rsc-fallback");
    }
  });

  it("keeps Aggregation layout sync and the Settings hub off HeadObject", () => {
    const layout = readFileSync("src/app/(app)/aggregation/layout.tsx", "utf8");
    const settings = readFileSync("src/components/settings/profile-settings.tsx", "utf8");
    expect(layout).toContain("export default function AggregationLayout");
    expect(layout).not.toContain("export default async function AggregationLayout");
    expect(layout).toContain("<Suspense");
    expect(layout.indexOf("{children}")).toBeGreaterThan(layout.indexOf("<Suspense"));
    expect(settings).toContain("ACCOUNT_PHOTO_HREF");
    expect(settings).not.toContain("signedAvatarUrl");
  });
});
