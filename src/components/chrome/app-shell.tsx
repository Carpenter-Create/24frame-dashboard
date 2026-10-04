"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import { HouseScreenOutlet, useHousePathname } from "./house-client-shell";

import { UserMenu } from "./user-menu";
import { SideNav } from "./side-nav";
import { SettingsRail } from "./settings-rail";
import { HouseLeadChrome } from "./house-lead-chrome";
import { HouseLeadSearch } from "./house-lead-search";
import { RailCollapse } from "./rail-collapse";
import { AskAssistantChromeProvider } from "@/components/messages/ask-frame-ai-chrome";
import { SocialExploreExit } from "@/components/social/social-explore-exit";
import { AskAiOverlayProvider } from "./ask-ai-overlay";
import { cn } from "@/lib/cn";
import { isAccountChromeNoRailPath } from "@/lib/account-chrome";
import { isActivityPath, type ActivityItem } from "@/lib/activity";
import type { AppShellChrome } from "@/lib/app-shell-chrome";
import type { MessagesSurface } from "@/lib/ask-frame-ai";
import {
  RAIL_COLLAPSE_WIDTH_VAR,
  RAIL_WIDTH_CLASS,
  migrateSidebarCollapsedCookie,
  persistSidebarCollapsed,
} from "@/lib/rail-collapse";
import {
  HOUSE_EXPLORE_HEADER_SEARCH_SLOT_CLASS,
  HOUSE_LEAD_SCROLL_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS,
  housePhoneShowsBottomDests,
} from "@/lib/house-phone-shell";
import {
  HOUSE_AGG_SHELL_COLUMN_CLASS,
  HOUSE_CANVAS_X_CLASS,
  HOUSE_HOME_RAIL_COLUMN_CLASS,
  HOUSE_RAIL_COLUMN_CLASS,
  HOUSE_RAIL_PANEL_CLASS,
} from "@/lib/house-shell";
import { isHelpPath } from "@/lib/help";
import { SettingsReturnRecorder } from "@/components/settings/settings-return-recorder";
import { isSettingsPath, SETTINGS_RAIL_PAD_CLASS } from "@/lib/settings";
import {
  SOCIAL_DESKTOP_FRAME_PAD_CLASS,
  SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS,
  SOCIAL_RAIL_PANEL_CLASS,
  SOCIAL_WRITE_COMPOSE_FRAME_CLASS,
} from "@/lib/social-chrome";
import { isCoProductionsPath } from "@/lib/co-productions";
import {
  isSocialDmComposePath,
  isSocialDmImmersivePath,
  isSocialDmThreadPath,
  isSocialExplorePath,
  isSocialStoryCreatePath,
  isSocialStoryOpenPath,
  isSocialWriteComposePath,
} from "@/lib/social";
import { isHomeOwnedPath, OVERVIEW_RAIL_OFF_WIDTH, overviewHidesRail } from "@/lib/overview";
import { QUEUE_HREF } from "@/lib/queue";
import { TITLES_HREF } from "@/lib/title-public-id";
import {
  AGGREGATION_HOME_SEGMENT,
  aggregationPath,
  clampWorkspaceMode,
  resolveWorkspaceMode,
  type WorkspaceMode,
} from "@/lib/workspace";
import { HousePhoneAppShell } from "./house-phone-app-shell";
import {
  rememberAccountChromeIdentity,
  stickyAccountChromeIdentity,
  type AccountChromeIdentity,
} from "@/lib/account-chrome-identity";

type Org = { id: string; name: string };

// Shell composition ported from watershedportal, rethemed to GC tokens. Fixed sidebar +
// viewport-pinned lead chrome + centered content frame. Page scroll lives
// on main — not on a wrapper that includes the header (G9). The sidebar collapses to an icon-only rail; the
// state persists in a cookie (read by the (app) layout → `defaultCollapsed`, so there's no
// flash) and, when collapsed, overrides `--sidebar-width` so the header + main follow.
// Phone: the rail is gone (hidden + width tokens collapse). Local dests
// live in HousePhoneBottomNav — client dests on Aggregation, operator
// dests on Staff. Phone workspace switch is the header grid button,
// which names the current workspace. Desktop md+ uses the Layer 1
// lanes (Home · Aggregation · Social · Education · Staff) after the
// brand mark and a hairline (screening chrome,
// docs/design-locks/shell-screening-chrome-lock-v1.md). No hamburger.
// One return tree — Social is a flag, not a second shell. Workspace
// hops keep chrome mounted so the sheet and dock do not freeze.
// Desktop collapse path is unchanged. Width is `--sidebar-width`.
// Social mounts the same RailCollapse + cookie + RAIL_WIDTH_CLASS as
// Aggregation · Education · Staff. Do not pin Social expanded, invent a
// Social pixel width, or a Social-only chevron. /settings paths: the
// Access destinations leave. One dest-rail slot (pad 16) occupies that
// slot — Settings title + You / Social / Education / Aggregation. Not a
// second column. Collapse stays off. Phone list is the same sections;
// pushed panes back to Settings. Hamburger stays off. Avatar 32 stays.
// /home and /home/news show the Home rail — Home · Industry news —
// with the same eyebrow + rows as every workspace (Adam 2026-10-04,
// shell-unified-chrome-lock-v1; supersedes the 2026-09-18 no-rail
// Home). The rail is a 200 column with a hairline right edge, no card
// (screening chrome). Co-Productions stays rail-free.
// Home SoT (HOME-width-lock.md): Home modules keep the shell gutters
// 32 / 32 (shell-desktop-horizontal-gutter-lock-v2) inside main.
// Header full-bleed. No --page-max-width.
export function AppShell({
  chrome,
  email = "",
  name,
  photoUrl,
  messagesUnread,
  activityItems = Promise.resolve([]),
  isGcStaff = false,
  defaultCollapsed = false,
  defaultWorkspace = "aggregation",
  children,
}: {
  /** Layout chrome. Do not use() this at the AppShell top — that re-blocks {children}. */
  chrome?: Promise<AppShellChrome>;
  email?: string;
  name?: string | null;
  photoUrl?: string | null;
  orgs?: Org[];
  activeOrgId?: string | null;
  /** Promise, not a number — resolved inside HouseLeadChrome Suspense so the
   *  shell paints without waiting on the badge query. */
  messagesUnread: Promise<number>;
  activityItems?: Promise<ActivityItem[]>;
  isGcStaff?: boolean;
  defaultCollapsed?: boolean;
  /** Kept for callers. Overlay owns AI chrome; leftover /messages intercepts. */
  messagesSurface?: MessagesSurface;
  defaultWorkspace?: WorkspaceMode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [workspaceCookie, setWorkspaceCookie] = useState(() =>
    clampWorkspaceMode(defaultWorkspace, isGcStaff),
  );
  const [identity, setIdentity] = useState(() =>
    stickyAccountChromeIdentity({ email, name, photoUrl }),
  );
  const cookiesApplied = useRef(false);
  const collapseTouched = useRef(false);
  const pathname = useHousePathname();
  const workspace = resolveWorkspaceMode(
    pathname,
    clampWorkspaceMode(workspaceCookie, isGcStaff),
  );
  const applyChromeCookies = useCallback(
    (next: {
      defaultCollapsed: boolean;
      defaultWorkspace: WorkspaceMode;
      isGcStaff: boolean;
    }) => {
      if (cookiesApplied.current) return;
      cookiesApplied.current = true;
      if (!collapseTouched.current) {
        setCollapsed(next.defaultCollapsed);
      }
      setWorkspaceCookie(clampWorkspaceMode(next.defaultWorkspace, next.isGcStaff));
    },
    [],
  );
  const applyChromeIdentity = useCallback((next: AccountChromeIdentity) => {
    setIdentity(rememberAccountChromeIdentity(next));
  }, []);
  const cookieSync =
    chrome ? (
      <Suspense fallback={null}>
        <ChromeCookieSync
          chrome={chrome}
          onCookies={applyChromeCookies}
          onIdentity={applyChromeIdentity}
        />
      </Suspense>
    ) : null;
  // Catalog list pages opt out of the centered width cap so the shared
  // Titles frame can own content max-width (edge of sidebar → right edge).
  // Titles and staff Queue share that frame. Centered canvases keep
  // `--chrome-gutter`. Full-bleed Home shares `--shell-gutter-inline-*`
  // with the header. Aggregation dashboard cards share the trailing
  // shell gutter (avatar ink) and are not the Education page-max.
  // Messages keeps `--content-inset` vertical.
  const titlesBleed = pathname === TITLES_HREF || pathname === QUEUE_HREF;
  // Home frame: /home, /home/news, and Co-Productions. Only
  // Co-Productions still hides the rail (overviewHidesRail).
  const homeOwned = isHomeOwnedPath(pathname);
  const coProductions = isCoProductionsPath(pathname);
  const homeChrome = homeOwned || coProductions;
  // Home (`/` + /home chrome) stays off --page-max-width. /home uses the
  // shell gutter pair (32 / 32).
  const homePage = pathname === "/" || homeChrome;
  const aggregationCards = pathname === aggregationPath(AGGREGATION_HOME_SEGMENT);
  const settingsPage = isSettingsPath(pathname);
  const helpPage = isHelpPath(pathname);
  const activityPage = isActivityPath(pathname);
  // Adam lock 2026-09-20: Get Help and Activity share one no-rail
  // account chrome — header + content column only. No Aggregation
  // rail, no Settings rail, no twin. Settings keeps the same dest-rail
  // slot. Co-Productions still hides via overviewHidesRail.
  const accountChromeNoRail = isAccountChromeNoRailPath(pathname);
  const hideProductRail = overviewHidesRail(pathname) || accountChromeNoRail;
  // Create-story lock v1.1: dedicated stage. House lead stays.
  // Social dest-rail does not sit beside the Your story rail.
  const storyCreateStage = isSocialStoryCreatePath(pathname);
  const storyOpenStage = isSocialStoryOpenPath(pathname);
  // Immersive DM: thread and compose hide the Social header and phone dock.
  // Inbox keeps both. Desktop dest rail stays.
  const dmImmersiveStage = isSocialDmImmersivePath(pathname);
  const dmThreadStage = isSocialDmThreadPath(pathname);
  const dmComposeStage = isSocialDmComposePath(pathname);
  // Write compose owns the face on phone and desktop. Chrome returns on dismiss.
  const writeComposeStage = isSocialWriteComposePath(pathname);
  // Explore For You: the media is the canvas. Phone stays headerless
  // and viewport-fixed; the dock overlays the stage. Desktop md+ keeps
  // the house header above the media and a labeled Exit. The surface
  // dest-rail stays out. Media Immersion: not a card on a page.
  // The G board's 64 collapsed rail on Explore is deferred to the
  // Explore PR (shell-screening-chrome-lock-v1 §2 Explore, Departure 1);
  // this shell PR does not change the Explore stage.
  const exploreStage = isSocialExplorePath(pathname);
  const hideDestRail = hideProductRail || storyCreateStage || storyOpenStage || exploreStage;
  const socialChrome = workspace === "social" && !settingsPage && !hideProductRail;
  const accountChrome = settingsPage || helpPage || activityPage;
  const phoneDestDock =
    !storyCreateStage &&
    !storyOpenStage &&
    !dmImmersiveStage &&
    !writeComposeStage &&
    housePhoneShowsBottomDests({
      workspace,
      homeOwned,
      accountChrome,
      coProductions,
    });
  const phoneDestPad =
    phoneDestDock && !exploreStage ? HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS : undefined;

  useEffect(() => {
    migrateSidebarCollapsedCookie(collapsed);
  }, [collapsed]);

  const toggle = () => {
    collapseTouched.current = true;
    setCollapsed((c) => {
      const next = !c;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  const collapseWidthStyle = hideDestRail
    ? ({
        "--sidebar-width": OVERVIEW_RAIL_OFF_WIDTH,
        "--sidebar-width-collapsed": OVERVIEW_RAIL_OFF_WIDTH,
      } as React.CSSProperties)
    : collapsed && !settingsPage
      ? ({ "--sidebar-width": RAIL_COLLAPSE_WIDTH_VAR } as React.CSSProperties)
      : undefined;

  const leadChrome = (
    <HouseLeadChromeSlot
      chrome={chrome}
      isGcStaff={isGcStaff}
      workspace={workspace}
      settingsPage={settingsPage || helpPage || activityPage}
      logoVisible="always"
      headerExit={exploreStage ? <SocialExploreExit /> : undefined}
      search={
        socialChrome ? (
          <HouseLeadSearch tone="live" presentation="header" />
        ) : workspace === "education" && !settingsPage && !helpPage && !activityPage ? (
          <Suspense fallback={null}>
            <HouseLeadSearch tone="quiet" presentation="header" />
          </Suspense>
        ) : undefined
      }
      trailingSearch={
        socialChrome ? (
          exploreStage ? (
            // Explore md to lg: the icon steps out so lanes + Exit fit
            // (Explore's discover search sits on the media).
            <span data-explore-header-search="" className={HOUSE_EXPLORE_HEADER_SEARCH_SLOT_CLASS}>
              <HouseLeadSearch tone="live" presentation="icon" />
            </span>
          ) : (
            <HouseLeadSearch tone="live" presentation="icon" />
          )
        ) : workspace === "education" && !settingsPage && !helpPage && !activityPage ? (
          <Suspense fallback={null}>
            <HouseLeadSearch
              tone="quiet"
              presentation="icon"
              inputId="education-header-q-compact"
            />
          </Suspense>
        ) : undefined
      }
      underNav={
        socialChrome
          ? undefined
          : workspace === "education" && !settingsPage && !helpPage && !activityPage ? (
          <Suspense fallback={null}>
            <HouseLeadSearch tone="quiet" inputId="education-header-q-phone" />
          </Suspense>
        ) : undefined
      }
      activityUnread={messagesUnread}
      activityItems={activityItems}
      accountMenu={
        <AccountMenuSlot
          chrome={chrome}
          email={identity.email}
          name={identity.name}
          photoUrl={identity.photoUrl}
        />
      }
    />
  );

  return (
    <AskAiOverlayProvider>
    <AskAssistantChromeProvider>
    {cookieSync}
    <SettingsReturnRecorder />
    <HousePhoneAppShell
      chrome={chrome}
      workspace={workspace}
      isGcStaff={socialChrome ? false : isGcStaff}
      homeOwned={socialChrome ? false : homeOwned}
      accountChrome={accountChrome}
      coProductions={coProductions}
      data-social-workspace={socialChrome ? "" : undefined}
      data-education-workspace={workspace === "education" && !helpPage && !activityPage ? "" : undefined}
      data-home-chrome={homeChrome ? "" : undefined}
      data-help-chrome={helpPage ? "" : undefined}
      data-activity-chrome={activityPage ? "" : undefined}
      className={exploreStage ? "bg-[#0A0A0B]" : undefined}
      style={collapseWidthStyle}
    >
      {hideDestRail ? null : (
        <aside
          className={cn(
            HOUSE_RAIL_COLUMN_CLASS,
            RAIL_WIDTH_CLASS,
            socialChrome ? SOCIAL_RAIL_PANEL_CLASS : HOUSE_RAIL_PANEL_CLASS,
          )}
          data-app-rail=""
          data-social-rail={socialChrome ? "" : undefined}
          data-settings-rail={settingsPage ? "" : undefined}
        >
          {/* One column for every workspace rail (Social included). The
              side menu pads itself and carries the collapse control in
              its top row; Settings keeps its own pad and no collapse. */}
          <div
            className={cn("flex-1 overflow-y-auto", settingsPage ? SETTINGS_RAIL_PAD_CLASS : undefined)}
          >
            {settingsPage ? (
              <SettingsRail />
            ) : (
              <SideNavSlot
                chrome={chrome}
                isGcStaff={socialChrome ? false : isGcStaff}
                collapsed={collapsed}
                workspace={socialChrome ? "social" : workspace}
                homeOwned={homeOwned}
                collapseControl={<RailCollapse collapsed={collapsed} onToggle={toggle} />}
              />
            )}
          </div>
        </aside>
      )}

      {/* Full-width top + dest side nav — same HouseLeadChrome as Social.
          Phone IA: Asset 8 emblem on every workspace, then the grid
          button naming the current workspace (screening chrome). No
          hamburger. Local dests live in HousePhoneBottomNav. Home
          dests are Home + Industry news. Trailing is search (if
          needed) · 24Frame AI · bell · avatar. Theme is the
          avatar drill.
          Ask AI is header + Home module only
          (#465). Phone emblem returns to Home (/home). Desktop
          wordmark stays the workspace home. Neither opens the rail.
          Desktop leads with the wordmark, a hairline, then the
          workspace lanes (Home first); trailing is search (Social and
          Education only) · Ask · bell · avatar. No grid button. Brand sits
          on the full-width top, not a second rail chrome. Period
          stays on the Dashboard org row. No org switcher on any
          route. Aggregation, Home, and Staff mount no search.
          Education's quiet course/video search and Social live
          search are the 232×34 field from xl and an icon below xl. Phone
          Education search sits in a full-width row under the header —
          not in the top nav. Search also mounts on the Access
          leftover `/messages` path (retired — 404), and on mobile `/titles` (528:542).
          Phone avatar opens 544:561. Do not invent Move chrome or a
          second phone switcher. Studio secondary rail stays HOLD. */}
      {storyOpenStage || dmImmersiveStage || writeComposeStage ? null : exploreStage ? (
        <div
          data-social-explore-desktop-header=""
          className={SOCIAL_EXPLORE_DESKTOP_HEADER_HOST_CLASS}
        >
          {leadChrome}
        </div>
      ) : (
        leadChrome
      )}

      <main
        className={cn(HOUSE_LEAD_SCROLL_CLASS, phoneDestPad, exploreStage && "relative overflow-hidden")}
        data-app-social-frame={socialChrome ? "" : undefined}
        data-social-story-open={storyOpenStage ? "" : undefined}
        data-social-dm-thread={dmThreadStage ? "" : undefined}
        data-social-dm-compose={dmComposeStage ? "" : undefined}
        data-social-write-compose={writeComposeStage ? "" : undefined}
        data-social-explore-stage={exploreStage ? "" : undefined}
        data-house-lead-scroll=""
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <div
          className={
            storyOpenStage || dmImmersiveStage || writeComposeStage
              ? writeComposeStage
                ? SOCIAL_WRITE_COMPOSE_FRAME_CLASS
                : "min-h-full w-full"
              : storyCreateStage
              ? "flex min-h-full w-full flex-col"
              : exploreStage
              ? SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS
              : socialChrome
              ? SOCIAL_DESKTOP_FRAME_PAD_CLASS
              : titlesBleed
                ? "w-full pb-24 max-md:pb-0"
                : homePage
                  ? cn(
                      "py-[var(--space-8)] max-md:px-[var(--space-6)] max-md:pb-0 max-md:pt-[var(--space-6)]",
                      homeChrome
                        ? HOUSE_HOME_RAIL_COLUMN_CLASS
                        : cn("w-full", HOUSE_CANVAS_X_CLASS),
                    )
                  : aggregationCards
                    ? HOUSE_AGG_SHELL_COLUMN_CLASS
                    : cn("mx-auto w-full pb-24 pt-8 max-md:pb-0", HOUSE_CANVAS_X_CLASS)
          }
          data-app-home-frame={homePage ? "" : undefined}
          data-aggregation-shell-column={aggregationCards ? "" : undefined}
          style={
            socialChrome || titlesBleed || homePage || aggregationCards
              ? undefined
              : { maxWidth: "var(--page-max-width)" }
          }
        >
          <HouseScreenOutlet>{children}</HouseScreenOutlet>
        </div>
      </main>
    </HousePhoneAppShell>
    </AskAssistantChromeProvider>
    </AskAiOverlayProvider>
  );
}

function AccountMenuSlot({
  chrome,
  email,
  name,
  photoUrl,
}: {
  chrome?: Promise<AppShellChrome>;
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}) {
  const face = stickyAccountChromeIdentity({ email, name, photoUrl });
  if (!chrome) {
    return <UserMenu email={face.email} name={face.name} photoUrl={face.photoUrl} />;
  }
  return (
    <Suspense fallback={<UserMenu email={face.email} name={face.name} photoUrl={face.photoUrl} />}>
      <UserMenuFromChrome chrome={chrome} />
    </Suspense>
  );
}

function UserMenuFromChrome({
  chrome,
}: {
  chrome: Promise<AppShellChrome>;
}) {
  const data = use(chrome);
  rememberAccountChromeIdentity({
    email: data.email,
    name: data.name,
    photoUrl: data.photoUrl,
  });
  return <UserMenu email={data.email} name={data.name} photoUrl={data.photoUrl} />;
}

function ChromeCookieSync({
  chrome,
  onCookies,
  onIdentity,
}: {
  chrome: Promise<AppShellChrome>;
  onCookies: (next: {
    defaultCollapsed: boolean;
    defaultWorkspace: WorkspaceMode;
    isGcStaff: boolean;
  }) => void;
  onIdentity: (next: AccountChromeIdentity) => void;
}) {
  const data = use(chrome);
  useEffect(() => {
    onCookies({
      defaultCollapsed: data.defaultCollapsed,
      defaultWorkspace: data.defaultWorkspace,
      isGcStaff: data.isGcStaff,
    });
    onIdentity({
      email: data.email,
      name: data.name,
      photoUrl: data.photoUrl,
    });
  }, [
    data.defaultCollapsed,
    data.defaultWorkspace,
    data.isGcStaff,
    data.email,
    data.name,
    data.photoUrl,
    onCookies,
    onIdentity,
  ]);
  return null;
}

function HouseLeadChromeSlot({
  chrome,
  isGcStaff,
  ...props
}: {
  chrome?: Promise<AppShellChrome>;
  isGcStaff: boolean;
  workspace: WorkspaceMode;
  settingsPage?: boolean;
  logoVisible?: "always" | "desktop";
  headerExit?: React.ReactNode;
  search?: React.ReactNode;
  underNav?: React.ReactNode;
  trailingSearch?: React.ReactNode;
  activityUnread?: Promise<number> | number;
  activityItems?: Promise<ActivityItem[]> | ActivityItem[];
  accountMenu: React.ReactNode;
}) {
  if (!chrome) {
    return (
      <HouseLeadChrome
        isGcStaff={isGcStaff}
        {...props}
        workspace={clampWorkspaceMode(props.workspace, isGcStaff)}
      />
    );
  }
  return (
    <Suspense
      fallback={
        <HouseLeadChrome
          isGcStaff={isGcStaff}
          {...props}
          workspace={clampWorkspaceMode(props.workspace, isGcStaff)}
        />
      }
    >
      <HouseLeadChromeFromChrome chrome={chrome} {...props} />
    </Suspense>
  );
}

function HouseLeadChromeFromChrome({
  chrome,
  ...props
}: {
  chrome: Promise<AppShellChrome>;
  workspace: WorkspaceMode;
  settingsPage?: boolean;
  logoVisible?: "always" | "desktop";
  headerExit?: React.ReactNode;
  search?: React.ReactNode;
  underNav?: React.ReactNode;
  trailingSearch?: React.ReactNode;
  activityUnread?: Promise<number> | number;
  activityItems?: Promise<ActivityItem[]> | ActivityItem[];
  accountMenu: React.ReactNode;
}) {
  const data = use(chrome);
  return (
    <HouseLeadChrome
      isGcStaff={data.isGcStaff}
      {...props}
      workspace={clampWorkspaceMode(props.workspace, data.isGcStaff)}
    />
  );
}

function SideNavSlot({
  chrome,
  isGcStaff,
  collapsed,
  workspace,
  homeOwned,
  collapseControl,
}: {
  chrome?: Promise<AppShellChrome>;
  isGcStaff: boolean;
  collapsed: boolean;
  workspace: WorkspaceMode;
  homeOwned: boolean;
  collapseControl: React.ReactNode;
}) {
  if (!chrome) {
    return (
      <SideNav
        isGcStaff={isGcStaff}
        collapsed={collapsed}
        workspace={clampWorkspaceMode(workspace, isGcStaff)}
        homeOwned={homeOwned}
        collapseControl={collapseControl}
      />
    );
  }
  return (
    <Suspense
      fallback={
        <SideNav
          isGcStaff={isGcStaff}
          collapsed={collapsed}
          workspace={clampWorkspaceMode(workspace, isGcStaff)}
          homeOwned={homeOwned}
          collapseControl={collapseControl}
        />
      }
    >
      <SideNavFromChrome
        chrome={chrome}
        collapsed={collapsed}
        workspace={workspace}
        homeOwned={homeOwned}
        collapseControl={collapseControl}
      />
    </Suspense>
  );
}

function SideNavFromChrome({
  chrome,
  collapsed,
  workspace,
  homeOwned,
  collapseControl,
}: {
  chrome: Promise<AppShellChrome>;
  collapsed: boolean;
  workspace: WorkspaceMode;
  homeOwned: boolean;
  collapseControl: React.ReactNode;
}) {
  const data = use(chrome);
  return (
    <SideNav
      isGcStaff={data.isGcStaff}
      collapsed={collapsed}
      workspace={clampWorkspaceMode(workspace, data.isGcStaff)}
      homeOwned={homeOwned}
      collapseControl={collapseControl}
    />
  );
}
