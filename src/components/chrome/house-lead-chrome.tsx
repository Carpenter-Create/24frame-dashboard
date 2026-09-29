import { HouseLink } from "./house-link";

import { ActivityBell } from "@/components/activity/activity-bell";
import { BrandLogo } from "./brand-logo";
import { AskAssistantHeaderLink } from "./ask-assistant-header";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { cn } from "@/lib/cn";
import type { ActivityItem } from "@/lib/activity";
import {
  HOUSE_HEADER_TRAILING_SLOT_CLASS,
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_LOGO_CLASS,
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_SLOT_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
} from "@/lib/house-lead-chrome";
import { PRODUCT_NAME } from "@/lib/product";
import { clampWorkspaceMode, workspaceHome, type WorkspaceMode } from "@/lib/workspace";
import { availableWorkspaceOptions } from "@/lib/workspace-menu";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
} from "@/lib/workspace-switcher";

export function HouseLeadChrome({
  workspace: requestedWorkspace,
  isGcStaff = false,
  settingsPage = false,
  logoVisible = "always",
  leadingNav,
  trailingNav,
  search,
  underNav,
  trailingSearch,
  afterLead,
  headerExit,
  activityUnread = 0,
  activityItems = [],
  accountMenu,
}: {
  workspace: WorkspaceMode;
  isGcStaff?: boolean;
  settingsPage?: boolean;
  logoVisible?: "always" | "desktop";
  leadingNav?: React.ReactNode;
  trailingNav?: React.ReactNode;
  search?: React.ReactNode;
  underNav?: React.ReactNode;
  trailingSearch?: React.ReactNode;
  afterLead?: React.ReactNode;
  headerExit?: React.ReactNode;
  activityUnread?: Promise<number> | number;
  activityItems?: Promise<ActivityItem[]> | ActivityItem[];
  accountMenu: React.ReactNode;
}) {
  const workspace = clampWorkspaceMode(requestedWorkspace, isGcStaff);
  const workspaceOptions = availableWorkspaceOptions({ isGcStaff });
  const social = workspace === "social";
  // Settings, Get Help, and Activity are account chrome —
  // Education search stays off even if the cookie still says
  // education.
  const education = workspace === "education" && !settingsPage;

  return (
    <div data-house-lead-stack="" className={HOUSE_LEAD_STACK_CLASS}>
      <header
        data-app-header=""
        data-house-lead-chrome=""
        data-house-full-width-top=""
        data-social-top-bar={social ? "" : undefined}
        className={HOUSE_LEAD_CHROME_CLASS}
        style={{ minHeight: "var(--header-height)" }}
      >
        <div data-app-header-leading="" className={APP_HEADER_LEADING_CLASS}>
          {leadingNav}
          <div
            data-house-lead=""
            data-app-header-brand-search=""
            data-social-header-lead={social ? "" : undefined}
            className={cn(
              logoVisible === "always" ? "flex" : "hidden md:flex",
              HOUSE_LEAD_SLOT_CLASS,
            )}
          >
            <HouseLink
              href={workspaceHome(workspace)}
              prefetch={social ? true : undefined}
              aria-label={PRODUCT_NAME}
              data-brand-emblem=""
              className={HOUSE_LEAD_LOGO_CLASS}
            >
              <BrandLogo />
            </HouseLink>
            {search ? (
              <div
                data-house-lead-search=""
                data-education-header-search-host={education ? "desktop" : undefined}
                className={HOUSE_LEAD_SEARCH_DESKTOP_CLASS}
              >
                {search}
              </div>
            ) : null}
          </div>
          {afterLead}
          {headerExit}
        </div>
        <div data-app-header-trailing="" className={APP_HEADER_TRAILING_CLUSTER_CLASS}>
          {trailingSearch ? (
            <div
              data-social-header-actions={social ? "" : undefined}
              className={HOUSE_HEADER_TRAILING_SLOT_CLASS}
            >
              {trailingSearch}
            </div>
          ) : null}
          {trailingNav ? (
            <div data-app-header-trailing-nav="" className="md:hidden">
              {trailingNav}
            </div>
          ) : null}
          <div
            data-app-header-workspace-desktop=""
            className={APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS}
          >
            <WorkspaceSwitcher
              presentation="pills"
              current={workspace}
              options={workspaceOptions}
              isGcStaff={isGcStaff}
            />
          </div>
          <AskAssistantHeaderLink />
          <ActivityBell unread={activityUnread} items={activityItems} workspace={workspace} />
          <div
            data-app-header-workspace-waffle=""
            className={APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS}
          >
            <WorkspaceSwitcher
              presentation="waffle"
              current={workspace}
              options={workspaceOptions}
              isGcStaff={isGcStaff}
            />
          </div>
          {accountMenu}
        </div>
      </header>
      {underNav ? (
        <div
          data-house-under-nav=""
          data-education-header-search-host={education ? "phone" : undefined}
          className={HOUSE_LEAD_UNDER_NAV_CLASS}
        >
          {underNav}
        </div>
      ) : null}
    </div>
  );
}
