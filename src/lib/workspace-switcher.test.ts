import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { USER_MENU } from "./user-menu";
import { availableWorkspaceOptions, WORKSPACE_EDUCATION_HREF } from "./workspace-menu";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import {
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
  phoneWorkspaceSwitcherPrefetchHrefs,
  prefetchWorkspaceWaffleIntent,
  workspaceWaffleIntentPrefetchHrefs,
  WORKSPACE_WAFFLE_HOME,
  workspaceWaffleHomeDest,
  WORKSPACE_SWITCHER_LANES_CLASS,
  WORKSPACE_SWITCHER_LANE_CLASS,
  WORKSPACE_SWITCHER_LANE_OFF_CLASS,
  WORKSPACE_SWITCHER_LANE_ON_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_ICON_WEIGHT,
  selectWorkspaceLane,
  workspaceSliderSegments,
  workspaceSwitcherLaneClass,
  workspaceSwitcherNextSegmentIndex,
  workspaceSwitcherPersistLane,
  workspaceSwitcherTriggerLabel,
  workspaceSwitcherTriggerName,
  APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS,
  APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS,
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_ABSENT,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS,
  WORKSPACE_WAFFLE_GRID_CLASS,
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
  WORKSPACE_WAFFLE_HOME_CHECK_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS,
  WORKSPACE_WAFFLE_HOME_ICON_CLASS,
  WORKSPACE_WAFFLE_ICON_CLASS,
  WORKSPACE_WAFFLE_ORDER,
  WORKSPACE_WAFFLE_TILE_CURRENT_CLASS,
  WORKSPACE_WAFFLE_TILE_LABEL_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
  workspaceWaffleTiles,
} from "./workspace-switcher";
import { persistWorkspaceCookie, workspaceHome } from "./workspace";
import { HOUSE_SEGMENTED_ITEM_ON_CLASS, HOUSE_SEGMENTED_THUMB_CLASS } from "./house-shell";

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
    // Screening chrome: lanes are plain words — no track, no pill.
    expect(WORKSPACE_SWITCHER_LANES_CLASS).not.toContain("rounded-full");
    expect(WORKSPACE_SWITCHER_LANES_CLASS).not.toContain("bg-surface-muted");
    expect(workspaceSwitcherLaneClass(true)).toContain("text-ink");
    expect(workspaceSwitcherLaneClass(true)).not.toContain("text-white");
    expect(workspaceSwitcherLaneClass(false)).toContain("text-ink-3 dark:text-ink-2");
    expect(workspaceSwitcherNextSegmentIndex(0, 3, -1)).toBe(2);
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toContain("relative");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).toBe("bg-surface-muted");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).not.toContain("bg-accent");
  });

  it("keeps the Workspaces panel portaled and the current check accent", () => {
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("t-label");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("text-ink-3");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("pt-[var(--space-3)]");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("pb-[var(--space-3)]");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).not.toMatch(/px-/);
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).not.toMatch(/font-/);
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).toContain("py-[var(--space-1)]");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).not.toMatch(/px-/);
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("grid-cols-2");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("gap-[var(--space-3)]");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("pb-[var(--space-4)]");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).not.toMatch(/px-/);
    expect(WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS).toContain("px-[var(--space-4)]");
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
    // Screening chrome: 8 on both faces (phone emblem → grid button;
    // desktop mark · hairline · lanes · Exit); md+ stretches to the bar.
    expect(APP_HEADER_LEADING_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("md:self-stretch");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:flex-col");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:items-start");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).toBe("relative min-w-0 overflow-visible");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).not.toMatch(/overflow-hidden/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("shrink-0");
    // Phone hits abut; desktop controls are 8 apart (screening chrome).
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(/(?:^|\s)gap-0(?:\s|$)/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(/\d+px/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("min-w-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(src).toContain("Phone hits abut (no gap); desktop");
    expect(src).not.toContain("--space-2 on every breakpoint");
    const phoneGap = APP_HEADER_LEADING_CLASS.match(
      /(?<![a-z0-9:-])gap-\[var\((--space-\d+)\)\]/,
    )?.[1];
    expect(phoneGap).toBe("--space-2");
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

  it("keeps waffle tiles on Layer 1 in the desktop lane order — no Home, no Staff unless entitled", () => {
    expect(WORKSPACE_WAFFLE_ORDER).toEqual(["aggregation", "social", "education", "staff"]);
    expect(workspaceWaffleTiles().map((tile) => tile.mode)).toEqual([
      "aggregation",
      "social",
      "education",
    ]);
    expect(workspaceWaffleTiles().map((tile) => tile.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(workspaceWaffleTiles().map((tile) => tile.mode)).not.toContain("staff");
    expect(workspaceWaffleTiles().map((tile) => tile.label)).not.toContain("Home");
    expect(
      workspaceWaffleTiles(availableWorkspaceOptions({ isGcStaff: true })).map((tile) => tile.mode),
    ).toEqual(["aggregation", "social", "education", "staff"]);
    expect(
      workspaceWaffleTiles(availableWorkspaceOptions({ isGcStaff: true })).map((tile) => tile.label),
    ).toEqual(["Aggregation", "Social", "Education", "Staff"]);
    expect(workspaceWaffleTiles(availableWorkspaceOptions().slice(0, 1)).map((tile) => tile.mode)).toEqual([
      "aggregation",
    ]);
    expect(phoneWorkspaceSwitcherPrefetchHrefs()).toEqual([
      "/home",
      ...workspaceWaffleTiles().map((tile) => tile.href),
    ]);
    expect(workspaceWaffleIntentPrefetchHrefs()).toEqual([
      "/aggregation/dashboard",
      "/social",
      "/education",
    ]);
    expect(
      workspaceWaffleIntentPrefetchHrefs(availableWorkspaceOptions({ isGcStaff: true })),
    ).toEqual(["/aggregation/dashboard", "/social", "/education", "/staff/queue"]);
    expect(
      workspaceWaffleIntentPrefetchHrefs(availableWorkspaceOptions({ isGcStaff: true }), "social"),
    ).toEqual(["/aggregation/dashboard", "/education", "/staff/queue"]);
    expect(workspaceWaffleIntentPrefetchHrefs(availableWorkspaceOptions(), "aggregation")).toEqual([
      "/social",
      "/education",
    ]);
    const prefetch = vi.fn();
    expect(
      prefetchWorkspaceWaffleIntent(prefetch, [
        "/aggregation/dashboard",
        "/staff/queue",
        "/aggregation/dashboard",
      ]),
    ).toEqual(["/aggregation/dashboard", "/staff/queue"]);
    expect(prefetch.mock.calls).toEqual([
      ["/aggregation/dashboard", { kind: "full" }],
      ["/staff/queue", { kind: "full" }],
    ]);
    expect(WORKSPACE_WAFFLE_HOME).toEqual({ id: "home", label: "Home", href: "/home" });
    expect(WORKSPACE_WAFFLE_HOME.label).not.toBe("Industry news");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).toContain("t-body-sm");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).toContain("self-start");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).toContain("w-fit");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).not.toContain("min-h-");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).not.toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).not.toMatch(/bg-/);
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CLASS).not.toContain("rounded-");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS).toBe("text-ink-3");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS).toBe("text-ink-2");
    expect(WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS).not.toMatch(/bg-/);
    expect(WORKSPACE_WAFFLE_HOME_ICON_CLASS).toBe("size-4 shrink-0");
    expect(WORKSPACE_WAFFLE_ICON_CLASS).toBe("size-6 shrink-0");
    expect(WORKSPACE_WAFFLE_HOME_CHECK_CLASS).toBe("size-3 shrink-0 text-ink-3");
    expect(WORKSPACE_WAFFLE_HOME_CHECK_CLASS).not.toContain("text-accent");
    expect(src).not.toContain("WORKSPACE_WAFFLE_HOME_ROW_CLASS");
    expect(src).not.toContain("min-h-12");
    expect(workspaceWaffleHomeDest("/social", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/social/explore", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/education", "education")).toBe("/home");
    expect(workspaceWaffleHomeDest("/aggregation/dashboard", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/staff/queue", "staff")).toBe("/home");
    expect(workspaceWaffleHomeDest("/co-productions", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/settings", "social")).toBe("/home");
    expect(workspaceWaffleHomeDest("/home/news", "aggregation")).toBe("/home");
    expect(workspaceWaffleHomeDest("/home", "aggregation")).toBeNull();
    expect(workspaceSliderSegments().map((pill) => pill.id)).toEqual([
      "home",
      ...workspaceWaffleTiles().map((tile) => tile.mode),
    ]);
    expect(workspaceSliderSegments().map((pill) => pill.id)).toEqual([
      "home",
      "aggregation",
      "social",
      "education",
    ]);
    expect(workspaceSliderSegments().map((pill) => pill.label)).toEqual([
      "Home",
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(workspaceSliderSegments()[0]).toEqual({ id: "home", label: "Home", href: "/home" });
    expect(
      workspaceSliderSegments(availableWorkspaceOptions({ isGcStaff: true })).map((pill) => pill.id),
    ).toEqual(["home", "aggregation", "social", "education", "staff"]);
    expect(workspaceSliderSegments().map((pill) => pill.id)).not.toContain("co-productions");
    expect(WORKSPACE_WAFFLE_FORBIDDEN_LABELS).toContain("Feed");
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
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).toBe("hidden w-[232px] shrink-0 xl:flex");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("flex-1");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("w-[420px]");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("md:max-w-[420px]");
  });

  // Screening chrome: the phone grid button names where you are — the
  // lane the desktop underline lights — and is the grid alone where no
  // lane is lit. Accessible name starts with the visible name.
  it("names the phone grid button with the lit lane, or nothing where none is lit", () => {
    const staff = availableWorkspaceOptions({ isGcStaff: true });
    expect(workspaceSwitcherTriggerName("/home", "aggregation")).toBe("Home");
    expect(workspaceSwitcherTriggerName("/home/news", "social")).toBe("Home");
    expect(workspaceSwitcherTriggerName("/aggregation/dashboard", "aggregation")).toBe("Aggregation");
    expect(workspaceSwitcherTriggerName("/social", "social")).toBe("Social");
    expect(workspaceSwitcherTriggerName("/social/u/ada", "aggregation")).toBe("Social");
    expect(workspaceSwitcherTriggerName("/education", "education")).toBe("Education");
    expect(workspaceSwitcherTriggerName("/staff/queue", "staff", staff)).toBe("Staff");
    for (const path of ["/settings", "/activity", "/help", "/co-productions"]) {
      expect(workspaceSwitcherTriggerName(path, "social", staff), path).toBeNull();
    }
    expect(workspaceSwitcherTriggerLabel("Social")).toBe("Social, Workspaces");
    expect(workspaceSwitcherTriggerLabel(null)).toBe("Workspaces");
    // 44 tall, hugs its content (never a fixed width), 13 / 500 ink.
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toBe(
      "relative flex h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] px-[var(--space-2)] text-[length:var(--text-xs)] font-medium text-ink transition-colors hover:bg-surface-muted",
    );
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).not.toMatch(/(?:^|\s)w-\[|size-\[/);
    expect(housePhoneForbidsTruncate(WORKSPACE_WAFFLE_TRIGGER_CLASS)).toBe(true);
    expect(WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS).toBe("size-4 shrink-0");
    expect(WORKSPACE_WAFFLE_TRIGGER_ICON_WEIGHT).toBe("fill");
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

  it("hops the Home segment to /home without a workspace cookie; lanes still write it", () => {
    const writes: string[] = [];
    vi.stubGlobal("document", {
      get cookie() {
        return writes.at(-1) ?? "";
      },
      set cookie(value: string) {
        writes.push(value);
      },
    });
    try {
      const options = availableWorkspaceOptions();
      const [home, aggregation] = workspaceSliderSegments(options);
      const navigate = vi.fn();
      expect(
        selectWorkspaceLane({ shellPath: "/social", workspace: "social", lane: home!, options, navigate }),
      ).toBe("/home");
      expect(navigate.mock.calls).toEqual([["/home"]]);
      expect(writes).toEqual([]);

      // /home/news is Home-lit but still hops to the Home land.
      expect(
        selectWorkspaceLane({ shellPath: "/home/news", workspace: "aggregation", lane: home!, options, navigate }),
      ).toBe("/home");
      expect(writes).toEqual([]);

      // Already on /home: no hop, no write.
      expect(
        selectWorkspaceLane({ shellPath: "/home", workspace: "aggregation", lane: home!, options, navigate }),
      ).toBeNull();
      expect(navigate).toHaveBeenCalledTimes(2);

      // A workspace lane from Home writes the existing cookie, then hops.
      expect(
        selectWorkspaceLane({ shellPath: "/home", workspace: "aggregation", lane: aggregation!, options, navigate }),
      ).toBe("/aggregation/dashboard");
      expect(writes.at(-1)).toContain("24frame_workspace=aggregation");
      expect(navigate.mock.calls.at(-1)).toEqual(["/aggregation/dashboard"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // Screening chrome (Adam 2026-10-04, "Yes, everywhere"): plain words,
  // 13px, idle 500 quiet ink, current 600 ink with a 2px ink underline
  // on the bar's bottom edge. No track, thumb, or grey pill.
  it("paints the desktop lanes as plain words with an ink underline on the current one", () => {
    expect(WORKSPACE_SWITCHER_LANES_CLASS).toBe("flex shrink-0 self-stretch");
    expect(WORKSPACE_SWITCHER_LANE_CLASS).toBe(
      "relative inline-flex shrink-0 cursor-pointer select-none items-center whitespace-nowrap px-[10px] text-[length:var(--text-xs)] transition-colors",
    );
    expect(WORKSPACE_SWITCHER_LANE_ON_CLASS).toBe("font-semibold text-ink shadow-[inset_0_-2px_0_var(--text)]");
    expect(WORKSPACE_SWITCHER_LANE_OFF_CLASS).toBe("font-medium text-ink-3 dark:text-ink-2 hover:text-ink");
    expect(workspaceSwitcherLaneClass(true)).toBe(`${WORKSPACE_SWITCHER_LANE_CLASS} ${WORKSPACE_SWITCHER_LANE_ON_CLASS}`);
    expect(workspaceSwitcherLaneClass(false)).toBe(`${WORKSPACE_SWITCHER_LANE_CLASS} ${WORKSPACE_SWITCHER_LANE_OFF_CLASS}`);
    expect(WORKSPACE_SWITCHER_LANE_CLASS).not.toContain("truncate");
    expect(WORKSPACE_SWITCHER_LANE_CLASS).not.toContain("rounded");
    expect(`${WORKSPACE_SWITCHER_LANES_CLASS} ${WORKSPACE_SWITCHER_LANE_CLASS} ${WORKSPACE_SWITCHER_LANE_ON_CLASS}`).not.toMatch(/bg-|accent/);
    expect(`${WORKSPACE_SWITCHER_LANE_ON_CLASS} ${WORKSPACE_SWITCHER_LANE_OFF_CLASS}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(src).not.toContain("WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS");
    expect(src).not.toContain("HOUSE_SEGMENTED_TRACK_CLASS");
    // Other segmented tracks keep the shared accent thumb.
    expect(HOUSE_SEGMENTED_THUMB_CLASS).toContain("bg-accent");
    expect(HOUSE_SEGMENTED_ITEM_ON_CLASS).toBe("text-white");
  });
});
