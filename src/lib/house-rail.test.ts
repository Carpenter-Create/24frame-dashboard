import { describe, expect, it } from "vitest";

import { HOME_PHONE_DESTS } from "./house-phone-shell";
import { houseRailActiveIndex, houseRailModel } from "./house-rail";
import type { WorkspaceMode } from "./workspace";

function activeLabel(
  pathname: string,
  workspace: WorkspaceMode,
  opts: { isGcStaff?: boolean; homeOwned?: boolean } = {},
): string | null {
  const model = houseRailModel({ isGcStaff: opts.isGcStaff ?? false, workspace, homeOwned: opts.homeOwned });
  const rows = [...model.items, ...model.staffItems];
  const index = houseRailActiveIndex(pathname, model, workspace);
  return index < 0 ? null : (rows[index]?.label ?? null);
}

describe("house dest rail model (shell-unified-chrome-lock-v1)", () => {
  it("titles every rail with its workspace and builds Home only from Home's dests", () => {
    expect(houseRailModel({ isGcStaff: false, workspace: "aggregation" }).eyebrow).toBe("Aggregation");
    expect(houseRailModel({ isGcStaff: false, workspace: "social" }).eyebrow).toBe("Social");
    expect(houseRailModel({ isGcStaff: false, workspace: "education" }).eyebrow).toBe("Education");
    expect(houseRailModel({ isGcStaff: true, workspace: "staff" }).eyebrow).toBe("Staff");

    const home = houseRailModel({ isGcStaff: true, workspace: "aggregation", homeOwned: true });
    expect(home.eyebrow).toBe("Home");
    expect(home.items.map((item) => item.label)).toEqual(["Home", "Industry news"]);
    expect(home.items.map((item) => item.href)).toEqual(HOME_PHONE_DESTS.map((item) => item.href));
    expect(home.staffItems).toEqual([]);

    expect(houseRailModel({ isGcStaff: false, workspace: "social" }).items.map((item) => item.label)).toEqual([
      "Feed",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(
      houseRailModel({ isGcStaff: true, workspace: "education" }).staffItems.map((item) => item.label),
    ).toEqual(["Manage courses"]);
  });

  it("lights exactly the row the path belongs to — one per path", () => {
    expect(activeLabel("/home", "aggregation", { homeOwned: true })).toBe("Home");
    expect(activeLabel("/home/news", "aggregation", { homeOwned: true })).toBe("Industry news");

    expect(activeLabel("/aggregation/dashboard", "aggregation")).toBe("Dashboard");
    expect(activeLabel("/aggregation/titles/abc", "aggregation")).toBe("Titles");
    expect(activeLabel("/aggregation/reports", "aggregation")).toBe("Reports");

    expect(activeLabel("/social", "social")).toBe("Feed");
    expect(activeLabel("/social/stories", "social")).toBeNull();
    expect(activeLabel("/social/explore", "social")).toBe("Explore");
    expect(activeLabel("/social/live", "social")).toBe("Create");
    expect(activeLabel("/social/u/ada", "social")).toBe("Profile");
    expect(activeLabel("/social/dms/x", "social")).toBe("Messages");

    // Browse and Manage share the /education prefix — only one lights.
    expect(activeLabel("/education", "education", { isGcStaff: true })).toBe("Education");
    expect(activeLabel("/education/manage", "education", { isGcStaff: true })).toBe("Manage courses");
    expect(activeLabel("/education/manage/x", "education", { isGcStaff: true })).toBe("Manage courses");

    expect(activeLabel("/staff/queue", "staff", { isGcStaff: true })).toBe("Queue");
  });
});
