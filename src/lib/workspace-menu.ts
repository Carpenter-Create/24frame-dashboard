// Header workspace lanes. Lives in lib/, not JSX.
// Mercury trigger sits in the shared header-right cluster,
// left of the avatar — not the rail. Trailing cluster is
// switcher + avatar. One switcher. Popover lists only
// accessible lanes.
// Not a page. Not a route. Not an account-menu row. The lanes are
// Aggregation | Social | Education, the same for members and GC
// staff. Staff is not a lane: it is the account menu's Staff row,
// GC staff only (Adam 2026-10-08,
// docs/design-locks/staff-account-menu-lock-v1.md). Member Education
// land is /education. Staff CMS is /education/manage. Do not
// send members to /education/manage, /account/workspace, or
// /settings/workspace. Staff Manage courses is Education
// workspace manage, not Settings Preferences and not
// workspace land. Staff land is the first GC_NAV
// href (/staff/queue) — no new Staff dashboard page.

import { USER_MENU } from "@/lib/user-menu";
import {
  WORKSPACE_AGGREGATION_LABEL,
  WORKSPACE_SOCIAL_LABEL,
  WORKSPACE_STAFF_LABEL,
} from "@/lib/product";
import { EDUCATION_HREF } from "@/lib/education";
import { type WorkspaceMode, workspaceHome } from "@/lib/workspace";

export { WORKSPACE_STAFF_LABEL };

export const WORKSPACE_MENU = {
  title: USER_MENU.workspace,
} as const;

export const WORKSPACE_EDUCATION_LABEL = "Education";

/** Member Education destination — never staff CMS /education/manage. */
export const WORKSPACE_EDUCATION_HREF = EDUCATION_HREF;

export type WorkspaceMenuCandidateId = "aggregation" | "social" | "education";

export const WORKSPACE_MENU_CANDIDATES = [
  { id: "aggregation" as const, label: WORKSPACE_AGGREGATION_LABEL },
  { id: "social" as const, label: WORKSPACE_SOCIAL_LABEL },
  { id: "education" as const, label: WORKSPACE_EDUCATION_LABEL },
] as const;

export const WORKSPACE_FLYOUT_OPTIONS = [
  { mode: "aggregation" as const, label: WORKSPACE_AGGREGATION_LABEL },
  { mode: "social" as const, label: WORKSPACE_SOCIAL_LABEL },
  { mode: "education" as const, label: WORKSPACE_EDUCATION_LABEL },
] as const;

export type WorkspaceMenuOption = {
  mode: WorkspaceMode;
  label: string;
  href: string;
};

export function workspaceCandidateAccessible(id: WorkspaceMenuCandidateId): boolean {
  if (id === "education") return WORKSPACE_EDUCATION_HREF !== null;
  return true;
}

export function availableWorkspaceOptions(): readonly WorkspaceMenuOption[] {
  const options: WorkspaceMenuOption[] = [];
  for (const candidate of WORKSPACE_MENU_CANDIDATES) {
    if (!workspaceCandidateAccessible(candidate.id)) continue;
    if (candidate.id === "education") {
      options.push({
        mode: "education",
        label: candidate.label,
        href: WORKSPACE_EDUCATION_HREF,
      });
      continue;
    }
    options.push({
      mode: candidate.id,
      label: candidate.label,
      href: workspaceHome(candidate.id),
    });
  }
  return options;
}

export function workspaceModeLabel(mode: WorkspaceMode): string {
  if (mode === "social") return WORKSPACE_SOCIAL_LABEL;
  if (mode === "education") return WORKSPACE_EDUCATION_LABEL;
  if (mode === "staff") return WORKSPACE_STAFF_LABEL;
  return WORKSPACE_AGGREGATION_LABEL;
}
