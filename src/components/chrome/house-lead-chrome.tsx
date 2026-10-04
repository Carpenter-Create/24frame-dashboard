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
  HOUSE_LEAD_DIVIDER_CLASS,
  HOUSE_LEAD_LOGO_CLASS,
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_SLOT_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
} from "@/lib/house-lead-chrome";
import { PRODUCT_NAME } from "@/lib/product";
import { OVERVIEW_HREF } from "@/lib/overview";
import { clampWorkspaceMode, workspaceHome, type WorkspaceMode } from "@/lib/workspace";
import { availableWorkspaceOptions } from "@/lib/workspace-menu";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
} from "@/lib/workspace-switcher";

function HouseLeadMark({
  href,
  className,
  prefetch,
  home = false,
}: {
  href: string;
  className: string;
  prefetch?: boolean;
  home?: boolean;
}) {
  return (
    <HouseLink
      href={href}
      prefetch={prefetch}
      aria-label={PRODUCT_NAME}
      data-brand-emblem=""
      data-house-home={home ? "" : undefined}
      className={className}
    >
      <BrandLogo />
    </HouseLink>
  );
}

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
            <HouseLeadMark
              href={OVERVIEW_HREF}
              prefetch
              home
              className={cn(HOUSE_LEAD_LOGO_CLASS, "md:hidden")}
            />
            <HouseLeadMark
              href={workspaceHome(workspace)}
              prefetch={social ? true : undefined}
              className="hidden shrink-0 items-center md:inline-flex"
            />
          </div>
          {/* Phone: the grid button, naming the current workspace,
              right after the emblem. Hidden from md. */}
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
          {/* Desktop md+: brand mark, a 1×18 hairline, then the lanes
              Home · Aggregation · Social · Education · Staff. Same row
              on every workspace. */}
          <span aria-hidden="true" data-app-header-divider="" className={HOUSE_LEAD_DIVIDER_CLASS} />
          <div
            data-app-header-workspace-desktop=""
            className={APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS}
          >
            <WorkspaceSwitcher
              presentation="lanes"
              current={workspace}
              options={workspaceOptions}
              isGcStaff={isGcStaff}
            />
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
          {search ? (
            <div
              data-house-lead-search=""
              data-education-header-search-host={education ? "desktop" : undefined}
              className={HOUSE_LEAD_SEARCH_DESKTOP_CLASS}
            >
              {search}
            </div>
          ) : null}
          <AskAssistantHeaderLink />
          <ActivityBell unread={activityUnread} items={activityItems} workspace={workspace} />
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
