import { describe, expect, it, vi } from "vitest";

import { USER_MENU } from "./user-menu";
import { availableWorkspaceOptions, WORKSPACE_EDUCATION_HREF } from "./workspace-menu";
import {
  DASHBOARD_TOP_PILL_BUTTON_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_TOP_PILL_CLUSTER_CLASS,
} from "./dashboard-craft";
import {
  phoneWorkspaceSwitcherPills,
  phoneWorkspaceSwitcherPrefetchHrefs,
  workspaceSwitcherLeadMarkLetter,
  workspaceSwitcherPersistLane,
  workspaceSwitcherTriggerMarkId,
  APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS,
  APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS,
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_PILL_HOST_CLASS,
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_ABSENT,
  WORKSPACE_SWITCHER_CHEVRON_CLASS,
  WORKSPACE_SWITCHER_CHEVRON_OPEN_CLASS,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_SWITCHER_HOST_CLASS,
  WORKSPACE_SWITCHER_MARK,
  WORKSPACE_SWITCHER_MARK_CLASS,
  WORKSPACE_SWITCHER_OPTION_CHECK_CLASS,
  WORKSPACE_SWITCHER_OPTION_CHECK_GUTTER_CLASS,
  WORKSPACE_SWITCHER_OPTION_CLASS,
  WORKSPACE_SWITCHER_OPTION_LABEL_CLASS,
  WORKSPACE_SWITCHER_OPTION_SELECTED_CLASS,
  WORKSPACE_SWITCHER_PANEL_CLASS,
  WORKSPACE_SWITCHER_PILL_CHEVRON_CLASS,
  WORKSPACE_SWITCHER_PILL_PANEL_CLASS,
  WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS,
  WORKSPACE_SWITCHER_SEGMENTS_CLASS,
  WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_ON_CLASS,
  WORKSPACE_SWITCHER_SHORT_LABELS,
  WORKSPACE_SWITCHER_STATIC_CLASS,
  WORKSPACE_SWITCHER_TRIGGER_CLASS,
  WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS,
  workspaceSwitcherChevronClass,
  workspaceSwitcherMarkLetter,
  workspaceSwitcherOptionClass,
  workspaceSwitcherOptions,
  workspaceSwitcherPanelClass,
  workspaceSwitcherMenuStyle,
  workspaceSwitcherMenuTopPx,
  WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR,
  WORKSPACE_SWITCHER_MENU_GAP_PX,
  workspaceSwitcherNextSegmentIndex,
  workspaceSwitcherSegmentClass,
  workspaceSwitcherSegmentLabel,
  workspaceSwitcherSegmentTabIndex,
  workspaceSwitcherShowsChevron,
  workspaceSwitcherShowsSegments,
  workspaceSwitcherTriggerClass,
} from "./workspace-switcher";
import { persistWorkspaceCookie, workspaceHome } from "./workspace";
import { housePhoneForbidsTruncate } from "./house-phone-stack";

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

  it("hides the chevron when only one workspace is reachable", () => {
    const single = workspaceSwitcherOptions().slice(0, 1);
    expect(workspaceSwitcherShowsChevron()).toBe(true);
    expect(workspaceSwitcherShowsChevron(availableWorkspaceOptions())).toBe(true);
    expect(workspaceSwitcherShowsChevron(single)).toBe(false);
    expect(workspaceSwitcherShowsChevron([])).toBe(false);
    expect(WORKSPACE_SWITCHER_CHEVRON_CLASS).toContain("size-4");
    expect(WORKSPACE_SWITCHER_STATIC_CLASS).toContain("t-body-sm");
    expect(WORKSPACE_SWITCHER_TRIGGER_CLASS).toContain("t-body-sm");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("border-hairline");
    expect(WORKSPACE_SWITCHER_OPTION_CLASS).toContain("t-body-sm");
  });

  it("keeps the chevron hidden at rest on md+ and always-on for phone", () => {
    expect(WORKSPACE_SWITCHER_TRIGGER_CLASS).toContain("group");
    expect(WORKSPACE_SWITCHER_CHEVRON_CLASS).toContain("opacity-0");
    expect(WORKSPACE_SWITCHER_CHEVRON_CLASS).toContain("max-md:opacity-100");
    expect(WORKSPACE_SWITCHER_CHEVRON_CLASS).toContain("group-hover:opacity-100");
    expect(WORKSPACE_SWITCHER_CHEVRON_CLASS).toContain("group-focus-visible:opacity-100");
    expect(WORKSPACE_SWITCHER_CHEVRON_OPEN_CLASS).toBe("opacity-100");
    expect(workspaceSwitcherChevronClass(false)).toBe(WORKSPACE_SWITCHER_CHEVRON_CLASS);
    expect(workspaceSwitcherChevronClass(true)).toBe(
      `${WORKSPACE_SWITCHER_CHEVRON_CLASS} ${WORKSPACE_SWITCHER_CHEVRON_OPEN_CLASS}`,
    );
    expect(workspaceSwitcherChevronClass(false)).not.toBe(workspaceSwitcherChevronClass(true));
  });

  it("keeps labels flush-left and trails a Sporty Blue check", () => {
    expect(WORKSPACE_SWITCHER_OPTION_CLASS).toContain("justify-between");
    expect(WORKSPACE_SWITCHER_OPTION_CLASS).toContain("px-[var(--space-4)]");
    expect(WORKSPACE_SWITCHER_OPTION_CLASS).not.toMatch(/\b(?:md|max-md):/);
    expect(WORKSPACE_SWITCHER_OPTION_LABEL_CLASS).toContain("text-left");
    expect(WORKSPACE_SWITCHER_OPTION_LABEL_CLASS).toContain("flex-1");
    expect(WORKSPACE_SWITCHER_OPTION_CHECK_GUTTER_CLASS).toBe("size-4 shrink-0");
    expect(WORKSPACE_SWITCHER_OPTION_CHECK_CLASS).toBe("text-accent");
    expect(WORKSPACE_SWITCHER_OPTION_SELECTED_CLASS).toBe("bg-surface-muted");
    expect(workspaceSwitcherOptionClass(false)).toBe(WORKSPACE_SWITCHER_OPTION_CLASS);
    expect(workspaceSwitcherOptionClass(true)).toBe(
      `${WORKSPACE_SWITCHER_OPTION_CLASS} ${WORKSPACE_SWITCHER_OPTION_SELECTED_CLASS}`,
    );
  });

  it("uses leading row marks and a quiet Workspaces heading — no identity header or Settings", () => {
    expect(workspaceSwitcherMarkLetter("aggregation")).toBe("A");
    expect(workspaceSwitcherMarkLetter("social")).toBe("S");
    expect(workspaceSwitcherMarkLetter("education")).toBe("E");
    expect(workspaceSwitcherMarkLetter("staff")).toBe("T");
    expect(WORKSPACE_SWITCHER_MARK).toEqual({
      aggregation: "A",
      social: "S",
      education: "E",
      staff: "T",
    });
    expect(WORKSPACE_SWITCHER_MARK_CLASS).toContain("size-6");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("t-label");
    expect(WORKSPACE_SWITCHER_HEADER_CLASS).toContain("text-ink-3");
    expect(WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS).toBe("whitespace-nowrap");
    expect(housePhoneForbidsTruncate(WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS)).toBe(true);
    expect(WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS).not.toContain("truncate");
    expect(WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS).not.toContain("break-words");
    expect(WORKSPACE_SWITCHER_TRIGGER_NAME_CLASS).not.toContain("whitespace-normal");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("z-50");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("shadow-none");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("absolute");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("top-full");
    for (const absent of WORKSPACE_SWITCHER_ABSENT) {
      expect(WORKSPACE_SWITCHER).not.toHaveProperty(absent);
    }
  });

  it("reserves desktop trailing workspace pills — phone switching is the header sheet", () => {
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:flex-col");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("max-md:items-start");
    expect(APP_HEADER_WORKSPACE_PILL_HOST_CLASS).toBe("shrink-0 overflow-visible md:hidden");
    expect(APP_HEADER_WORKSPACE_PILL_HOST_CLASS).not.toContain("w-full");
    expect(APP_HEADER_WORKSPACE_PILL_HOST_CLASS).not.toContain("min-w-0");
    expect(APP_HEADER_WORKSPACE_PILL_HOST_CLASS).not.toMatch(/overflow-hidden/);
    expect(WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS).toContain("shrink-0");
    expect(WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS).not.toContain("min-w-0");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).toBe("relative min-w-0 overflow-visible");
    expect(WORKSPACE_SWITCHER_HOST_CLASS).not.toMatch(/overflow-hidden/);
    expect(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS).toBe("hidden md:contents");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(
      /(?:^|\s)gap-\[var\(--space-3\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(workspaceSwitcherTriggerClass("pill")).toBe(WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS);
    expect(workspaceSwitcherTriggerClass("plain")).toBe(WORKSPACE_SWITCHER_TRIGGER_CLASS);
    expect(workspaceSwitcherPanelClass("pill")).toBe(WORKSPACE_SWITCHER_PILL_PANEL_CLASS);
    expect(workspaceSwitcherPanelClass()).toBe(WORKSPACE_SWITCHER_PANEL_CLASS);
    expect(WORKSPACE_SWITCHER_PILL_PANEL_CLASS).toBe(WORKSPACE_SWITCHER_PANEL_CLASS);
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("absolute");
    expect(workspaceSwitcherChevronClass(false, "pill")).toBe(WORKSPACE_SWITCHER_PILL_CHEVRON_CLASS);
    expect(workspaceSwitcherChevronClass(true, "pill")).toBe(WORKSPACE_SWITCHER_PILL_CHEVRON_CLASS);
    expect(WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS).toContain("border-hairline");
    expect(WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS).toContain("bg-surface-muted");
    expect(WORKSPACE_SWITCHER_PILL_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("z-50");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("absolute");
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
        tone: "pill",
        trigger: { bottom: 56, left: 24, right: 140 },
        chromeBottoms: [120],
        viewportWidth: 390,
      }),
    ).toEqual({ top: 128, left: 24 });
    expect(
      workspaceSwitcherMenuStyle({
        tone: "plain",
        trigger: { bottom: 56, left: 200, right: 360 },
        chromeBottoms: [96],
        viewportWidth: 390,
      }),
    ).toEqual({ top: 104, right: 30 });
  });

  it("keeps waffle tiles on Layer 1 in lock order — no Home, no Staff unless entitled", () => {
    expect(phoneWorkspaceSwitcherPills().map((pill) => pill.id)).toEqual([
      "social",
      "education",
      "aggregation",
    ]);
    expect(phoneWorkspaceSwitcherPills().map((pill) => pill.label)).toEqual([
      "Social",
      "Education",
      "Aggregation",
    ]);
    expect(phoneWorkspaceSwitcherPills().map((pill) => pill.id)).not.toContain("staff");
    expect(phoneWorkspaceSwitcherPills().map((pill) => pill.id)).not.toContain("home");
    expect(
      phoneWorkspaceSwitcherPills(availableWorkspaceOptions({ isGcStaff: true })).map(
        (pill) => pill.id,
      ),
    ).toEqual(["social", "education", "aggregation", "staff"]);
    expect(
      phoneWorkspaceSwitcherPills(availableWorkspaceOptions({ isGcStaff: true })).map(
        (pill) => pill.label,
      ),
    ).toEqual(["Social", "Education", "Aggregation", "Staff"]);
    expect(workspaceSwitcherLeadMarkLetter("home")).toBe("H");
    expect(workspaceSwitcherLeadMarkLetter("aggregation")).toBe("A");
    expect(workspaceSwitcherTriggerMarkId("/home", "aggregation")).toBe("home");
    expect(workspaceSwitcherTriggerMarkId("/social", "social")).toBe("social");
    expect(phoneWorkspaceSwitcherPrefetchHrefs().map((href) => href)).toEqual(
      phoneWorkspaceSwitcherPills().map((pill) => pill.href),
    );
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

  it("uses segmented track grammar for desktop sliding pills", () => {
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("flex");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("items-center");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toBe(DASHBOARD_TOP_PILL_CLUSTER_CLASS);
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("rounded-full");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("bg-surface-muted");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("rounded-full");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("px-[var(--space-4)]");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("py-[var(--space-2)]");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("t-body-sm");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toContain("transition-colors");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toMatch(/transition/);
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).not.toMatch(/transition/);
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_CLASS);
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS);
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).toBe("text-white");
    expect(WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS).toBe("text-ink-2");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).not.toContain("divide-x");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).toContain("transition-[left,width]");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).toContain("duration-[320ms]");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).toContain("ease-[cubic-bezier(0.22,1,0.36,1)]");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).toContain("inset-y-0");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).not.toContain("duration-200");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).not.toContain("transition-opacity");
    expect(WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS).not.toContain("p-[");
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).not.toContain("text-accent");
    expect(workspaceSwitcherShowsSegments()).toBe(true);
    expect(workspaceSwitcherShowsSegments(workspaceSwitcherOptions().slice(0, 1))).toBe(false);
    expect(workspaceSwitcherSegmentClass(true)).toBe(
      `${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}`,
    );
    expect(workspaceSwitcherSegmentClass(false)).toBe(
      `${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS}`,
    );
  });

  it("keeps full workspace names on desktop pills — no Agg/Edu/ellipsis", () => {
    expect(workspaceSwitcherSegmentLabel("aggregation")).toBe("Aggregation");
    expect(workspaceSwitcherSegmentLabel("social")).toBe("Social");
    expect(workspaceSwitcherSegmentLabel("education")).toBe("Education");
    expect(workspaceSwitcherSegmentLabel("staff")).toBe("Staff");
    expect(workspaceSwitcherSegmentLabel("staff")).not.toBe("Team");
    expect(WORKSPACE_SWITCHER_SHORT_LABELS).toEqual(["Agg", "Edu"]);
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("whitespace-nowrap");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toContain("shrink-0");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toContain("truncate");
    expect(WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS).toBe("whitespace-nowrap");
    expect(WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS).not.toContain("truncate");
    expect(WORKSPACE_SWITCHER_SEGMENTS_CLASS).toContain("shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("min-w-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS).toContain("md:hidden");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).toBe("hidden w-[240px] shrink-0 md:flex");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("flex-1");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("w-[420px]");
    expect(APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS).not.toContain("md:max-w-[420px]");
    expect(workspaceSwitcherSegmentTabIndex(true)).toBe(0);
    expect(workspaceSwitcherSegmentTabIndex(false)).toBe(-1);
    expect(workspaceSwitcherNextSegmentIndex(0, 3, 1)).toBe(1);
    expect(workspaceSwitcherNextSegmentIndex(2, 3, 1)).toBe(0);
    expect(workspaceSwitcherNextSegmentIndex(0, 3, -1)).toBe(2);
  });

  it("keeps the phone pill menu out of overflow-hidden ancestors and emblem air ≥ space-2", () => {
    const phoneGap = APP_HEADER_LEADING_CLASS.match(
      /(?<![a-z0-9:-])gap-\[var\((--space-\d+)\)\]/,
    )?.[1];
    expect(phoneGap).toBeTruthy();
    expect(Number(phoneGap?.replace("--space-", ""))).toBeGreaterThanOrEqual(2);
    expect(phoneGap).not.toBe("--space-1");
    expect(phoneGap).toBe("--space-3");

    for (const className of [
      APP_HEADER_LEADING_CLASS,
      APP_HEADER_WORKSPACE_PILL_HOST_CLASS,
      WORKSPACE_SWITCHER_HOST_CLASS,
    ]) {
      expect(className).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
      expect(className).toContain("overflow-visible");
    }
    expect(WORKSPACE_SWITCHER_PILL_PANEL_CLASS).toContain("overflow-hidden");
    expect(WORKSPACE_SWITCHER_PILL_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PILL_PANEL_CLASS).not.toContain("absolute");
  });
});
