import { describe, expect, it, vi } from "vitest";

import { OVERVIEW_HREF } from "./overview";
import { SOCIAL_ROUTES } from "./social";
import {
  houseNavActivePath,
  houseNavIgnorePendingClick,
  houseNavPendingSettled,
  prefetchHrefList,
} from "./house-nav-pending";
import {
  socialNavActivePath,
  socialNavIgnorePendingClick,
  socialNavPendingSettled,
} from "./social-nav-pending";

describe("house nav pending", () => {
  it("treats the in-flight href as the active path", () => {
    expect(houseNavActivePath("/social", null)).toBe("/social");
    expect(houseNavActivePath("/social", "/education")).toBe("/education");
  });

  it("settles Social Home and Account Home only on exact land", () => {
    expect(houseNavPendingSettled(SOCIAL_ROUTES.home, SOCIAL_ROUTES.home)).toBe(true);
    expect(houseNavPendingSettled(SOCIAL_ROUTES.profile, SOCIAL_ROUTES.home)).toBe(false);
    expect(houseNavPendingSettled(OVERVIEW_HREF, OVERVIEW_HREF)).toBe(true);
    expect(houseNavPendingSettled("/home/news", OVERVIEW_HREF)).toBe(false);
  });

  it("settles nested dests on self or child paths", () => {
    expect(houseNavPendingSettled("/aggregation/titles", "/aggregation/titles")).toBe(true);
    expect(houseNavPendingSettled("/aggregation/titles/t1", "/aggregation/titles")).toBe(true);
    expect(houseNavPendingSettled("/education/slug", "/education")).toBe(true);
  });

  it("settles an Explore filter only when that query slot is the live location", () => {
    expect(houseNavPendingSettled("/social/explore?q=ada", "/social/explore?q=ada")).toBe(true);
    expect(houseNavPendingSettled("/social/explore?discover=1&q=ada", "/social/explore?q=ada&discover=1")).toBe(true);
    expect(houseNavPendingSettled("/social/explore?tag=night", "/social/explore?tag=night")).toBe(true);
    expect(houseNavPendingSettled("/social/explore?person=ada", "/social/explore?person=ada")).toBe(true);
    expect(houseNavPendingSettled("/social/explore", "/social/explore?q=ada")).toBe(false);
    expect(houseNavPendingSettled("/social/explore?q=ada", "/social/explore")).toBe(false);
    expect(houseNavPendingSettled("/social/explore?tag=night", "/social/explore?q=ada")).toBe(false);
    expect(houseNavPendingSettled("/social/explore?person=ada", "/social/explore?discover=1&q=ada")).toBe(false);
  });

  it("ignores modified and non-primary clicks", () => {
    const idle = { altKey: false, button: 0, ctrlKey: false, metaKey: false, shiftKey: false };
    expect(houseNavIgnorePendingClick(idle)).toBe(false);
    expect(houseNavIgnorePendingClick({ ...idle, metaKey: true })).toBe(true);
  });

  it("prefetches each href once through the shared helper", () => {
    const prefetch = vi.fn();
    prefetchHrefList(prefetch, ["/home", "/social", "/education"]);
    expect(prefetch.mock.calls.map((call) => call[0])).toEqual([
      "/home",
      "/social",
      "/education",
    ]);
  });

  it("keeps Social pending aliases on the house SoT", () => {
    expect(socialNavActivePath).toBe(houseNavActivePath);
    expect(socialNavIgnorePendingClick).toBe(houseNavIgnorePendingClick);
    expect(socialNavPendingSettled).toBe(houseNavPendingSettled);
    expect(prefetchHrefList.name).toBe("prefetchHrefList");
  });
});
