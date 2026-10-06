import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { USER_MENU } from "./user-menu";
import {
  availableWorkspaceOptions,
  WORKSPACE_EDUCATION_HREF,
  WORKSPACE_EDUCATION_LABEL,
  WORKSPACE_FLYOUT_OPTIONS,
  WORKSPACE_MENU,
  WORKSPACE_MENU_CANDIDATES,
  workspaceCandidateAccessible,
  workspaceModeLabel,
} from "./workspace-menu";

const here = dirname(fileURLToPath(import.meta.url));

describe("workspace menu copy", () => {
  it("lists Aggregation, Social, and Education on Route A /education", () => {
    expect(WORKSPACE_MENU.title).toBe("Workspace");
    expect(WORKSPACE_MENU.title).toBe(USER_MENU.workspace);
    expect(WORKSPACE_MENU).not.toHaveProperty("back");
    expect(WORKSPACE_MENU).not.toHaveProperty("href");
    expect(WORKSPACE_MENU_CANDIDATES.map((option) => option.id)).toEqual([
      "aggregation",
      "social",
      "education",
    ]);
    expect(WORKSPACE_MENU_CANDIDATES.map((option) => option.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(workspaceCandidateAccessible("aggregation")).toBe(true);
    expect(workspaceCandidateAccessible("social")).toBe(true);
    expect(workspaceCandidateAccessible("education")).toBe(true);
    expect(WORKSPACE_FLYOUT_OPTIONS.map((option) => option.mode)).toEqual([
      "aggregation",
      "social",
      "education",
    ]);
    expect(WORKSPACE_FLYOUT_OPTIONS.map((option) => option.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(availableWorkspaceOptions().map((option) => option.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(availableWorkspaceOptions().map((option) => option.href)).toEqual([
      "/aggregation/dashboard",
      "/social",
      "/education",
    ]);
    expect(availableWorkspaceOptions().map((option) => option.mode)).not.toContain("staff");
    expect(availableWorkspaceOptions({ isGcStaff: true }).map((option) => option.label)).toEqual([
      "Aggregation",
      "Social",
      "Education",
      "Staff",
    ]);
    expect(availableWorkspaceOptions({ isGcStaff: true }).map((option) => option.href)).toEqual([
      "/aggregation/dashboard",
      "/social",
      "/education",
      "/staff/queue",
    ]);
    expect(availableWorkspaceOptions({ isGcStaff: false }).map((option) => option.mode)).not.toContain(
      "staff",
    );
    expect(availableWorkspaceOptions({ isGcStaff: undefined }).map((option) => option.mode)).not.toContain(
      "staff",
    );
    expect(availableWorkspaceOptions().some((option) => option.mode === "staff")).toBe(false);
    expect(availableWorkspaceOptions({ isGcStaff: false }).some((option) => option.label === "Staff")).toBe(
      false,
    );
    expect(WORKSPACE_EDUCATION_HREF).toBe("/education");
    expect(WORKSPACE_EDUCATION_HREF).not.toBe("/social/courses");
    expect(WORKSPACE_EDUCATION_LABEL).toBe("Education");
    expect(existsSync(join(here, "../app/(app)/education/page.tsx"))).toBe(true);
    expect(existsSync(join(here, "../app/(app)/account/workspace/page.tsx"))).toBe(false);
    expect(existsSync(join(here, "../app/(app)/social/courses/lessons/[id]/page.tsx"))).toBe(
      false,
    );
    expect(workspaceModeLabel("aggregation")).toBe("Aggregation");
    expect(workspaceModeLabel("social")).toBe("Social");
    expect(workspaceModeLabel("education")).toBe("Education");
    expect(workspaceModeLabel("staff")).toBe("Staff");
    expect(workspaceModeLabel("staff")).not.toBe("Team");
    expect(workspaceModeLabel("staff")).not.toBe("Ops");
  });
});
