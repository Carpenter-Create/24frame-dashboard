import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { USER_MENU } from "./user-menu";
import { availableWorkspaceOptions, type WorkspaceMenuOption } from "./workspace-menu";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import {
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
  phoneWorkspaceSwitcherPrefetchHrefs,
  prefetchWorkspaceWaffleIntent,
  workspaceWaffleIntentPrefetchHrefs,
  WORKSPACE_WAFFLE_HOME,
  workspaceWaffleHomeDest,
  WORKSPACE_SWITCHER_SEGMENT_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_ON_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS,
  WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_BARE_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_ICON_WEIGHT,
  WORKSPACE_WAFFLE_TRIGGER_NAME_CLASS,
  selectWorkspaceLane,
  workspaceSliderSegments,
  workspaceSwitcherSegmentClass,
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
  WORKSPACE_SWITCHER_PANEL_SURFACE_CLASS,
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
import { HOUSE_LEAD_SEARCH_DESKTOP_CLASS } from "./house-lead-chrome";
import { HOUSE_SEGMENTED_TRACK_CLASS } from "./house-shell";

const src = readFileSync("src/lib/workspace-switcher.ts", "utf8");

// Staff is never a lane (Adam 2026-10-08,
// docs/design-locks/staff-account-menu-lock-v1.md): even a caller that
// passes a "staff" option must not get a Staff tile, segment, or prefetch.
const withForgedStaff: readonly WorkspaceMenuOption[] = [
  ...availableWorkspaceOptions(),
  { mode: "staff", label: "Staff", href: "/staff/queue" },
];

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
    expect(workspaceSwitcherOptions().map((option) => option.mode)).not.toContain("staff");
    expect(workspaceSwitcherOptions().map((option) => option.href)).not.toContain("/staff/queue");
    expect(availableWorkspaceOptions().map((option) => option.href)).toEqual(
      workspaceSwitcherOptions().map((option) => option.href),
    );
    expect(workspaceHome("education")).toBe("/education");
    expect(workspaceHome("education")).not.toBe("/social/courses");
  });

  it("retires the labeled pill and splits slider vs waffle by host", () => {
    for (const token of RETIRED_PILL_GRAMMAR) {
      expect(src, token).not.toContain(token);
    }
    expect(src).not.toContain('tone === "pill"');
    expect(src).not.toContain("presentation: \"pills\"");
    // Coinbase register: the slider from lg; the grey pill below lg
    // (phone and md to lg, where the slider cannot fit beside the 240
    // side menu and the trailing controls).
    expect(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS).toBe("hidden lg:contents");
    // The grey pill is md to lg only; the phone face is the workspace band.
    expect(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS).toBe("hidden shrink-0 md:block lg:hidden");
    expect(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS).not.toContain("lg:contents");
    // The slider is the house muted track. The lit segment's label takes
    // the ON class and the idle ones the OFF class (the wash thumb with
    // accent-ink, cards lock, pinned in social-feed-cards-lock.test.ts).
    expect(WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS).toBe(HOUSE_SEGMENTED_TRACK_CLASS);
    expect(workspaceSwitcherSegmentClass(true).endsWith(` ${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}`)).toBe(true);
    expect(workspaceSwitcherSegmentClass(false).endsWith(` ${WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS}`)).toBe(true);
    expect(workspaceSwitcherSegmentClass(true)).not.toContain("text-white");
    expect(workspaceSwitcherNextSegmentIndex(0, 3, -1)).toBe(2);
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toContain("relative");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).toBe("bg-hairline");
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
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toBe("grid grid-cols-2 gap-[var(--space-3)] pb-[var(--space-4)]");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("grid-cols-2");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("gap-[var(--space-3)]");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("pb-[var(--space-4)]");
    expect(WORKSPACE_WAFFLE_GRID_CLASS).not.toMatch(/px-/);
    expect(WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS).toContain("px-[var(--space-4)]");
    expect(WORKSPACE_SWITCHER_OPTION_CHECK_CLASS).toBe("text-accent");
    expect(WORKSPACE_SWITCHER_PANEL_SURFACE_CLASS).toBe(
      "flex min-w-[16rem] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none",
    );
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toBe(`fixed z-50 ${WORKSPACE_SWITCHER_PANEL_SURFACE_CLASS}`);
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
    // Coinbase register: phone 8 (emblem → pill), desktop 16 (mark →
    // switcher → Exit). md+ the lead is its own width and never shrinks.
    expect(APP_HEADER_LEADING_CLASS).toBe(
      "mr-auto flex min-w-0 flex-1 items-center gap-[var(--space-2)] overflow-visible md:flex-none md:shrink-0 md:gap-[var(--space-4)]",
    );
    expect(APP_HEADER_LEADING_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("md:flex-none md:shrink-0");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("md:self-stretch");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).toContain("min-w-0");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:flex-col");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:items-start");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).toBe("relative min-w-0 overflow-visible");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).not.toMatch(/overflow-hidden/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toBe(
      "flex min-w-0 items-center gap-[var(--space-1)] md:gap-[var(--space-2)] max-md:shrink-0",
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("shrink-0");
    // Coinbase register: phone hits 4 apart; desktop controls 8 apart.
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-1\)\](?:\s|$)/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(/(?:^|\s)gap-0(?:\s|$)/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(/\d+px/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("min-w-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(src).toContain("Phone hits 4 apart; desktop");
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

  it("keeps waffle tiles on Layer 1 in the desktop lane order — no Home, never Staff", () => {
    expect(WORKSPACE_WAFFLE_ORDER).toEqual(["aggregation", "social", "education"]);
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
    // Even a forged "staff" option never becomes a tile (Adam 2026-10-08:
    // Staff is the account menu's row for GC staff, not a workspace).
    expect(workspaceWaffleTiles(withForgedStaff).map((tile) => tile.mode)).toEqual([
      "aggregation",
      "social",
      "education",
    ]);
    expect(workspaceWaffleTiles(withForgedStaff).map((tile) => tile.label)).not.toContain("Staff");
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
    expect(workspaceWaffleIntentPrefetchHrefs(withForgedStaff)).toEqual([
      "/aggregation/dashboard",
      "/social",
      "/education",
    ]);
    expect(workspaceWaffleIntentPrefetchHrefs(withForgedStaff, "social")).toEqual([
      "/aggregation/dashboard",
      "/education",
    ]);
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
    expect(workspaceSliderSegments(withForgedStaff).map((pill) => pill.id)).toEqual([
      "home",
      "aggregation",
      "social",
      "education",
    ]);
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
    for (const label of workspaceWaffleTiles(withForgedStaff).map((tile) => tile.label)) {
      expect(WORKSPACE_SWITCHER_SHORT_LABELS).not.toContain(label);
      expect(label).not.toBe("Team");
    }
    expect(APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS).toContain("md:hidden");
    // Coinbase register: the wide grey pill flexes 240–360 from xl.
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).toBe(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("w-[232px]");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("flex-1");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("w-[420px]");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("md:max-w-[420px]");
  });

  // Coinbase register: the grey workspace pill names where you are — the
  // segment the desktop slider lights — and is the grid alone where none
  // is lit. Accessible name starts with the visible name.
  it("names the grey workspace pill with the lit segment, or nothing where none is lit", () => {
    const staff = withForgedStaff;
    expect(workspaceSwitcherTriggerName("/home", "aggregation")).toBe("Home");
    expect(workspaceSwitcherTriggerName("/home/news", "social")).toBe("Home");
    expect(workspaceSwitcherTriggerName("/aggregation/dashboard", "aggregation")).toBe("Aggregation");
    expect(workspaceSwitcherTriggerName("/social", "social")).toBe("Social");
    expect(workspaceSwitcherTriggerName("/social/u/ada", "aggregation")).toBe("Social");
    expect(workspaceSwitcherTriggerName("/education", "education")).toBe("Education");
    // Staff is not a lane: a Staff page lights none, like Settings.
    expect(workspaceSwitcherTriggerName("/staff/queue", "staff")).toBeNull();
    expect(workspaceSwitcherTriggerName("/staff/queue", "staff", staff)).toBeNull();
    for (const path of ["/settings", "/activity", "/help", "/co-productions"]) {
      expect(workspaceSwitcherTriggerName(path, "social", staff), path).toBeNull();
    }
    expect(workspaceSwitcherTriggerLabel("Social")).toBe("Social, Workspaces");
    expect(workspaceSwitcherTriggerLabel(null)).toBe("Workspaces");
    // 44 tall grey pill, radius full, pad 12 / 16, an 18 filled grid, 8,
    // the name at 15 / 600 ink; hugs its content (never a fixed width).
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).toBe(
      "relative flex h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-full bg-surface-muted pl-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] font-semibold text-ink transition-colors hover:bg-hairline max-[359px]:w-[var(--header-control-size)] max-[359px]:px-0",
    );
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS).not.toMatch(/(?:^|\s)w-\[|(?:^|\s)size-\[/);
    expect(housePhoneForbidsTruncate(WORKSPACE_WAFFLE_TRIGGER_CLASS)).toBe(true);
    // Below 360 the visible name steps out (the bar fits at 320); the
    // accessible name keeps it. Where no segment is lit: the 44 circle.
    expect(WORKSPACE_WAFFLE_TRIGGER_NAME_CLASS).toBe("max-[359px]:hidden");
    expect(WORKSPACE_WAFFLE_TRIGGER_BARE_CLASS).toBe("w-[var(--header-control-size)] px-0");
    expect(WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS).toBe("size-[18px] shrink-0");
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
  // Founder 2026-10-05 ("I like the designs. Let's use them."): the
  // workspace switcher is the primary pill slider — muted track, no
  // inset, an ink thumb that slides 220ms ease-out, 17 / 600 labels 44
  // tall with 16 pads. Supersedes the screening chrome's text lanes.
  it("paints the desktop switcher as the pill slider — muted track, the sliding thumb, 44", () => {
    expect(WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS).toBe(
      "relative flex shrink-0 items-center rounded-full bg-surface-muted",
    );
    expect(WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS).not.toMatch(/(?:^|\s)p[xy]?-/);
    // The thumb, the segment (44, 15 / 500, the pending wash) and the ON /
    // OFF label inks are the cards lock's values (founder 2026-10-06),
    // pinned in src/lib/social-feed-cards-lock.test.ts.
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS).toBe(220);
    // Until the thumb is placed (the server paint), the lit segment
    // carries the thumb's fill itself, so "Social" reads on the server paint.
    const thumbFill = WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS.split(/\s+/).find((cls) => cls.startsWith("bg-"));
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain(`in-data-segmented-pending:data-segmented-selected:${thumbFill}`);
    expect(workspaceSwitcherSegmentClass(true)).toBe(`${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}`);
    expect(workspaceSwitcherSegmentClass(false)).toBe(`${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS}`);
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toContain("truncate");
    // Label ink snaps with the thumb's index (no colour transition).
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toContain("transition");
    expect(`${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS} ${WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    // The retired lanes are gone.
    expect(src).not.toContain("WORKSPACE_SWITCHER_LANE");
    expect(src).not.toContain("shadow-[inset_0_-2px_0_var(--text)]");
  });
});
