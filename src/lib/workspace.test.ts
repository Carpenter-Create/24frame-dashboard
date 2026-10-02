import { describe, expect, it, vi } from "vitest";

import {
  clampWorkspaceMode,
  isEducationPath,
  isSocialPath,
  isStaffPath,
  parseWorkspaceCookie,
  persistWorkspaceCookie,
  resolveWorkspaceMode,
  STAFF_PATH_PREFIXES,
  WORKSPACE_COOKIE,
  WORKSPACE_MODES,
  workspaceCookieValue,
  workspaceCookieWrite,
  workspaceHome,
} from "./workspace";

describe("workspace mode", () => {
  it("persists aggregation, social, education, or staff in a cookie like the rail collapse", () => {
    expect(WORKSPACE_COOKIE).toBe("24frame_workspace");
    expect(WORKSPACE_MODES).toEqual(["aggregation", "social", "education", "staff"]);
    expect(WORKSPACE_MODES).not.toContain("news");
    expect(parseWorkspaceCookie(undefined)).toBe("aggregation");
    expect(parseWorkspaceCookie("social")).toBe("social");
    expect(parseWorkspaceCookie("education")).toBe("education");
    expect(parseWorkspaceCookie("staff")).toBe("staff");
    expect(parseWorkspaceCookie("nope")).toBe("aggregation");
    expect(workspaceCookieWrite("social")).toContain("24frame_workspace=social");
    expect(workspaceCookieWrite("education")).toContain("24frame_workspace=education");
    expect(workspaceCookieWrite("staff")).toContain("24frame_workspace=staff");
    expect(workspaceHome("social")).toBe("/social");
    expect(workspaceHome("education")).toBe("/education");
    expect(workspaceHome("aggregation")).toBe("/aggregation/dashboard");
    expect(workspaceHome("staff")).toBe("/staff/queue");
    expect(workspaceHome("education")).not.toBe("/social/courses");
    expect(workspaceCookieValue(null)).toBeNull();
    expect(workspaceCookieValue("")).toBeNull();
    expect(workspaceCookieValue("other=1")).toBeNull();
    expect(workspaceCookieValue("24frame_workspace=social")).toBe("social");
    expect(workspaceCookieValue("a=b; 24frame_workspace=education")).toBe("education");
    expect(workspaceCookieValue("24frame_workspace=")).toBeNull();
  });

  it("lets pathname win on destination routes and cookie win on shared ones", () => {
    expect(resolveWorkspaceMode("/social", "aggregation")).toBe("social");
    expect(resolveWorkspaceMode("/social/dms/abc", "aggregation")).toBe("social");
    expect(resolveWorkspaceMode("/social/leaderboard", "aggregation")).toBe("social");
    expect(resolveWorkspaceMode("/social/courses", "aggregation")).toBe("social");
    expect(resolveWorkspaceMode("/social/courses/welcome-to-24frame", "aggregation")).toBe(
      "social",
    );
    expect(isEducationPath("/social/courses")).toBe(false);
    expect(isEducationPath("/social/courses/welcome-to-24frame")).toBe(false);
    expect(isEducationPath("/education")).toBe(true);
    expect(isEducationPath("/education/welcome-to-24frame")).toBe(true);
    expect(isEducationPath("/education/manage")).toBe(true);
    expect(isEducationPath("/education/manage/orientation")).toBe(true);
    expect(isEducationPath("/gc/education")).toBe(false);
    expect(isEducationPath("/social")).toBe(false);
    expect(resolveWorkspaceMode("/education", "aggregation")).toBe("education");
    expect(resolveWorkspaceMode("/education/welcome-to-24frame", "social")).toBe("education");
    expect(isSocialPath("/social/courses")).toBe(true);
    expect(isSocialPath("/social")).toBe(true);
    expect(resolveWorkspaceMode("/aggregation/dashboard", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/reports", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/activity", "social")).toBe("social");
    expect(resolveWorkspaceMode("/activity", "education")).toBe("education");
    expect(resolveWorkspaceMode("/activity", "aggregation")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/activity", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/home/news", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/home/news", "education")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/messages", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/titles/1", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/home", "social")).toBe("aggregation");
    expect(resolveWorkspaceMode("/titles", "social")).toBe("social");
    expect(resolveWorkspaceMode("/dashboard", "education")).toBe("education");
    expect(resolveWorkspaceMode("/reports", "education")).toBe("education");
    expect(resolveWorkspaceMode("/settings", "social")).toBe("social");
    expect(resolveWorkspaceMode("/settings/profile", "social")).toBe("social");
    expect(resolveWorkspaceMode("/settings/organization", "education")).toBe("education");
    expect(resolveWorkspaceMode("/settings/preferences", "education")).toBe("education");
    expect(resolveWorkspaceMode("/settings/profile", "education")).toBe("education");
    expect(resolveWorkspaceMode("/help", "aggregation")).toBe("aggregation");
    expect(resolveWorkspaceMode("/help", "education")).toBe("education");
    expect(resolveWorkspaceMode("/co-productions", "social")).toBe("social");
    expect(resolveWorkspaceMode("/co-productions", "education")).toBe("education");
    expect(resolveWorkspaceMode("/activity", "staff")).toBe("staff");
    expect(resolveWorkspaceMode("/settings", "staff")).toBe("staff");
    expect(resolveWorkspaceMode("/help", "staff")).toBe("staff");
    expect(resolveWorkspaceMode("/co-productions", "staff")).toBe("staff");
  });

  it("resolves operator paths to staff and keeps client Aggregation paths aggregation", () => {
    expect(isStaffPath("/staff/queue")).toBe(true);
    expect(isStaffPath("/staff/avails")).toBe(true);
    expect(isStaffPath("/staff/channels")).toBe(true);
    expect(isStaffPath("/staff/channels/new")).toBe(true);
    expect(isStaffPath("/staff/gc/deliveries")).toBe(true);
    expect(isStaffPath("/staff/gc/finance")).toBe(true);
    expect(isStaffPath("/staff/gc/clients")).toBe(true);
    expect(isStaffPath("/staff/gc/titles/abc")).toBe(true);
    expect(isStaffPath("/aggregation/dashboard")).toBe(false);
    expect(isStaffPath("/aggregation/titles")).toBe(false);
    expect(isStaffPath("/aggregation/attention")).toBe(false);
    expect(isStaffPath("/aggregation/reports")).toBe(false);
    expect(isStaffPath("/aggregation/queue")).toBe(false);
    expect(isStaffPath("/aggregation/avails")).toBe(false);
    expect(isStaffPath("/aggregation/channels")).toBe(false);
    expect(isStaffPath("/aggregation/gc/deliveries")).toBe(false);
    expect(isStaffPath("/aggregation/gc/finance")).toBe(false);
    expect(isStaffPath("/aggregation/gc/clients")).toBe(false);
    expect(isStaffPath("/home")).toBe(false);
    expect(STAFF_PATH_PREFIXES).toEqual([
      "/staff/queue",
      "/staff/avails",
      "/staff/channels",
      "/staff/gc",
    ]);
    expect(STAFF_PATH_PREFIXES.every((href) => href.startsWith("/staff/"))).toBe(true);
    expect(STAFF_PATH_PREFIXES.some((href) => href.startsWith("/aggregation/"))).toBe(false);
    expect(resolveWorkspaceMode("/aggregation/queue", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/avails", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/gc/deliveries", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/staff/queue", "aggregation")).toBe("staff");
    expect(resolveWorkspaceMode("/staff/avails", "social")).toBe("staff");
    expect(resolveWorkspaceMode("/staff/gc/deliveries", "education")).toBe("staff");
    expect(resolveWorkspaceMode("/staff/channels/abc/edit", "aggregation")).toBe("staff");
    expect(resolveWorkspaceMode("/staff/gc/finance/p1", "aggregation")).toBe("staff");
    expect(resolveWorkspaceMode("/staff/gc/clients/org", "social")).toBe("staff");
    expect(resolveWorkspaceMode("/aggregation/dashboard", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/titles/1", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/attention", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/aggregation/reports", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/home", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/home/news", "staff")).toBe("aggregation");
    expect(resolveWorkspaceMode("/education/manage", "staff")).toBe("education");
  });

  it("clamps staff to aggregation unless isGcStaff — members never get staff chrome", () => {
    expect(clampWorkspaceMode("staff", false)).toBe("aggregation");
    expect(clampWorkspaceMode("staff", undefined)).toBe("aggregation");
    expect(clampWorkspaceMode("staff", true)).toBe("staff");
    expect(clampWorkspaceMode("aggregation", false)).toBe("aggregation");
    expect(clampWorkspaceMode("social", false)).toBe("social");
    expect(clampWorkspaceMode("education", false)).toBe("education");
    expect(clampWorkspaceMode("social", true)).toBe("social");
    expect(clampWorkspaceMode("aggregation", true)).toBe("aggregation");
    expect(clampWorkspaceMode(resolveWorkspaceMode("/settings", "staff"), false)).toBe(
      "aggregation",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/help", "staff"), false)).toBe("aggregation");
    expect(clampWorkspaceMode(resolveWorkspaceMode("/activity", "staff"), false)).toBe(
      "aggregation",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/home", "staff"), false)).toBe("aggregation");
    expect(clampWorkspaceMode(resolveWorkspaceMode("/settings", "staff"), true)).toBe("staff");
    expect(clampWorkspaceMode(resolveWorkspaceMode("/staff/queue", "aggregation"), false)).toBe(
      "aggregation",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/staff/queue", "staff"), false)).toBe(
      "aggregation",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/staff/queue", "aggregation"), true)).toBe(
      "staff",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/staff/queue", "staff"), true)).toBe("staff");
    expect(clampWorkspaceMode(resolveWorkspaceMode("/aggregation/dashboard", "staff"), false)).toBe(
      "aggregation",
    );
    expect(clampWorkspaceMode(resolveWorkspaceMode("/aggregation/queue", "staff"), false)).not.toBe(
      "staff",
    );
  });

  it("refuses to persist a staff cookie unless isGcStaff", () => {
    const writes: string[] = [];
    vi.stubGlobal("document", {
      get cookie() {
        return writes.at(-1) ?? "";
      },
      set cookie(value: string) {
        writes.push(value);
      },
    });
    persistWorkspaceCookie("staff");
    persistWorkspaceCookie("staff", false);
    persistWorkspaceCookie("staff", undefined);
    expect(writes).toEqual([]);
    persistWorkspaceCookie("social");
    expect(writes.at(-1)).toContain("24frame_workspace=social");
    persistWorkspaceCookie("staff", true);
    expect(writes.at(-1)).toContain("24frame_workspace=staff");
    vi.unstubAllGlobals();
  });
});
