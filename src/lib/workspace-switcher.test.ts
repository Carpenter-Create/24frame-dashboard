import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { USER_MENU } from "./user-menu";
import { availableWorkspaceOptions, WORKSPACE_EDUCATION_HREF } from "./workspace-menu";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import {
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
  phoneWorkspaceSwitcherPrefetchHrefs,
  WORKSPACE_WAFFLE_HOME,
  workspaceWaffleHomeDest,
  WORKSPACE_SWITCHER_SEGMENTS_CLASS,
  workspaceSliderSegments,
  workspaceSwitcherNextSegmentIndex,
  workspaceSwitcherPersistLane,
  workspaceSwitcherSegmentClass,
  APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS,
  APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS,
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_ABSENT,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_SWITCHER_HOST_CLASS,
  WORKSPACE_SWITCHER_OPTION_CHECK_CLASS,
  WORKSPACE_SWITCHER_PANEL_CLASS,
  WORKSPACE_SWITCHER_SHORT_LABELS,
  workspaceSwitcherMenuStyle,
  workspaceSwitcherMenuTopPx,
  WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR,
  WORKSPACE_SWITCHER_MENU_GAP_PX,
  workspaceSwitcherOptions,
  WORKSPACE_WAFFLE_FORBIDDEN_LABELS,
  WORKSPACE_WAFFLE_ORDER,
  WORKSPACE_WAFFLE_TILE_CURRENT_CLASS,
  WORKSPACE_WAFFLE_TILE_LABEL_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
  workspaceWaffleTiles,
} from "./workspace-switcher";
import { persistWorkspaceCookie, workspaceHome } from "./workspace";

const src = readFileSync("src/lib/workspace-switcher.ts", "utf8");

const RETIRED_PILL_GRAMMAR = [
  "APP_HEADER_WORKSPACE_PILL_HOST_CLASS",
  "WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS",
  "WORKSPACE_SWITCHER_PILL_CHEVRON_CLASS",
  "WORKSPACE_SWITCHER_PILL_PANEL_CLASS",
  "workspaceSwitcherTriggerClass",
  "phoneWorkspaceSwitcherPills",
  "HOUSE_CONTROL_PILL_CLASS",
] as const;

describe("workspace switcher lock", () => {
  it("names the control Workspace and the quiet menu heading Workspaces", () => {
    expect(WORKSPACE_SWITCHER.label).toBe("Workspace");
    expect(WORKSPACE_SWITCHER.label).toBe(USER_MENU.workspace);
    expect(WORKSPACE_SWITCHER.heading).toBe("Workspaces");
    expect(WORKSPACE_SWITCHER.close).toBe("Close workspaces");
    expect(WORKSPACE_SWITCHER).not.toHaveProperty("settings");
    expect(USER_MENU).not.toHaveProperty("workspaceHref");
  });

  it("lists only accessible lanes on Route A /education", () => {
    expect(workspaceSwitcherOptions().map((option) => option.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(workspaceSwitcherOptions().map((option) => option.href)).toEqual([
      "/aggregation/dashboard",
      "/social",
      "/education",
    ]);
    expect(workspaceSwitcherOptions(availableWorkspaceOptions({ isGcStaff: true })).map(
      (option) => option.label,
    )).toEqual(["Aggregation", "Social", "Education", "Staff"]);
    expect(workspaceSwitcherOptions(availableWorkspaceOptions({ isGcStaff: true })).map(
      (option) => option.href,
    )).toEqual(["/aggregation/dashboard", "/social", "/education", "/staff/queue"]);
    expect(availableWorkspaceOptions().map((option) => option.href)).toEqual(
      workspaceSwitcherOptions().map((option) => option.href),
    );
    expect(WORKSPACE_EDUCATION_HREF).toBe("/education");
    expect(workspaceHome("education")).toBe("/education");
    expect(workspaceHome("education")).not.toBe("/social/courses");
  });

  it("retires the labeled pill and splits slider vs waffle by host", () => {
    for (const token of RETIRED_PILL_GRAMMAR) {
      expect(src, token).not.toContain(token);
    }
    expect(src).not.toContain('tone === "pill"');
    expect(src).not.toContain("presentation: \"pills\"");
    expect(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS).toBe("hidden md:contents");
    expect(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS).toBe("shrink-0 md:hidden");
    expect(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS).not.toContain("md:contents");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("rounded-full");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("bg-surface-muted");
    expect(workspaceSwitcherSegmentClass(true)).toContain("text-white");
    expect(workspaceSwitcherSegmentClass(false)).toContain("text-ink-2");
    expect(workspaceSwitcherNextSegmentIndex(0, 3, -1)).toBe(2);
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toContain("relative");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).toBe("bg-surface-muted");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).not.toContain("bg-accent");
  });

  it("keeps the Workspaces panel portaled and the current check accent", () => {
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("t-label");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("text-ink-3");
    expect(WORKSPACE_SWITCHER_OPTION_CHECK_CLASS).toBe("text-accent");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("border-hairline");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("z-50");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("shadow-none");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("overflow-hidden");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("absolute");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("top-full");
    expect(WORKSPACE_WAFFLE_TILE_CURRENT_CLASS).toBe("bg-surface-muted");
    for (const absent of WORKSPACE_SWITCHER_ABSENT) {
      expect(WORKSPACE_SWITCHER).not.toHaveProperty(absent);
    }
  });

  it("keeps header cluster air and does not host a workspace pill", () => {
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:flex-col");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:items-start");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).toBe("relative min-w-0 overflow-visible");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).not.toMatch(/overflow-hidden/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(
      /(?:^|\s)gap-\[var\(--space-3\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(/\d+px/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("min-w-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(src).toContain("phone --space-3 / desktop md:gap-[var(--space-4)] (16)");
    expect(src).not.toContain("--space-2 on every breakpoint");
    const phoneGap = APP_HEADER_LEADING_CLASS.match(
      /(?<![a-z0-9:-])gap-\[var\((--space-\d+)\)\]/,
    )?.[1];
    expect(phoneGap).toBe("--space-3");
  });

  it("places the Workspaces menu below dest chips and Education search", () => {
    expect(WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR).not.toContain(
      "data-house-phone-dest-chips-host",
    );
    expect(WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR).toContain("data-house-under-nav");
    expect(WORKSPACE_SWITCHER_MENU_GAP_PX).toBe(8);
    expect(workspaceSwitcherMenuTopPx(56)).toBe(64);
    expect(workspaceSwitcherMenuTopPx(56, [96, 140])).toBe(148);
    expect(
      workspaceSwitcherMenuStyle({
        trigger: { bottom: 56, left: 200, right: 360 },
        chromeBottoms: [96],
        viewportWidth: 390,
      }),
    ).toEqual({ top: 104, right: 30 });
  });

  it("keeps waffle tiles on Layer 1 in lock order — no Home, no Staff unless entitled", () => {
    expect(WORKSPACE_WAFFLE_ORDER).toEqual(["social", "education", "aggregation", "staff"]);
    expect(workspaceWaffleTiles().map((tile) => tile.mode)).toEqual([
      "social",
      "education",
      "aggregation",
    ]);
    expect(workspaceWaffleTiles().map((tile) => tile.label)).toEqual([
      "Social",
      "Education",
      "Aggregation",
    ]);
    expect(workspaceWaffleTiles().map((tile) => tile.mode)).not.toContain("staff");
    expect(workspaceWaffleTiles().map((tile) => tile.label)).not.toContain("Home");
    expect(
      workspaceWaffleTiles(availableWorkspaceOptions({ isGcStaff: true })).map((tile) => tile.mode),
    ).toEqual(["social", "education", "aggregation", "staff"]);
    expect(
      workspaceWaffleTiles(availableWorkspaceOptions({ isGcStaff: true })).map((tile) => tile.label),
    ).toEqual(["Social", "Education", "Aggregation", "Staff"]);
    expect(workspaceWaffleTiles(availableWorkspaceOptions().slice(0, 1)).map((tile) => tile.mode)).toEqual([
      "aggregation",
    ]);
    expect(phoneWorkspaceSwitcherPrefetchHrefs()).toEqual([
      "/home",
      ...workspaceWaffleTiles().map((tile) => tile.href),
    ]);
    expect(WORKSPACE_WAFFLE_HOME).toEqual({ id: "home", label: "Home", href: "/home" });
    expect(workspaceWaffleHomeDest("/social", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/social/explore", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/education", "education")).toBe("/home");
    expect(workspaceWaffleHomeDest("/aggregation/dashboard", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/staff/queue", "staff")).toBe("/home");
    expect(workspaceWaffleHomeDest("/co-productions", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/settings", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/home/news", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/home", "aggregation")).toBeNull();
    expect(workspaceSliderSegments().map((tile) => tile.mode)).toEqual(
      workspaceWaffleTiles().map((tile) => tile.mode),
    );
    expect(
      workspaceSliderSegments(availableWorkspaceOptions({ isGcStaff: true })).map((tile) => tile.mode),
    ).toEqual(["social", "education", "aggregation", "staff"]);
    expect(workspaceSliderSegments().map((tile) => tile.label)).not.toContain("Home");
    for (const label of WORKSPACE_WAFFLE_FORBIDDEN_LABELS) {
      expect(workspaceWaffleTiles().map((tile) => tile.label)).not.toContain(label);
    }
    expect(WORKSPACE_WAFFLE_TILE_LABEL_CLASS).toBe("whitespace-normal");
    expect(housePhoneForbidsTruncate(WORKSPACE_WAFFLE_TILE_LABEL_CLASS)).toBe(true);
    expect(WORKSPACE_WAFFLE_TILE_LABEL_CLASS).not.toContain("truncate");
  });

  it("keeps full workspace names — no Agg/Edu", () => {
    expect(WORKSPACE_SWITCHER_SHORT_LABELS).toEqual(["Agg", "Edu"]);
    for (const label of workspaceWaffleTiles(availableWorkspaceOptions({ isGcStaff: true })).map(
      (tile) => tile.label,
    )) {
      expect(WORKSPACE_SWITCHER_SHORT_LABELS).not.toContain(label);
      expect(label).not.toBe("Team");
    }
    expect(APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS).toContain("md:hidden");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).toBe("hidden w-[240px] shrink-0 md:flex");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("flex-1");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("w-[420px]");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("md:max-w-[420px]");
  });

  it("keeps the existing workspace cookie write — no second scheme", () => {
    expect(persistWorkspaceCookie.name).toBe("persistWorkspaceCookie");
    expect(workspaceSwitcherPersistLane.name).toBe("workspaceSwitcherPersistLane");
    expect(workspaceHome("aggregation")).toBe("/aggregation/dashboard");
    expect(workspaceHome("social")).toBe("/social");
    expect(workspaceHome("staff")).toBe("/staff/queue");
    const writes: string[] = [];
    vi.stubGlobal("document", {
      get cookie() {
        return writes.at(-1) ?? "";
      },
      set cookie(value: string) {
        writes.push(value);
      },
    });
    workspaceSwitcherPersistLane("staff");
    expect(writes).toEqual([]);
    workspaceSwitcherPersistLane("staff", true);
    expect(writes.at(-1)).toContain("24frame_workspace=staff");
    vi.unstubAllGlobals();
  });
});
