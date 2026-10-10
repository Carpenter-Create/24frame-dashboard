"use client";

import { Suspense, use, useRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import type { AppShellChrome } from "@/lib/app-shell-chrome";
import { HOUSE_LEAD_SHELL_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_PAGE_CANVAS_CLASS } from "@/lib/house-shell";
import { clampWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";
import { useHousePathname } from "./house-client-shell";
import { HouseLeadScrollToTop } from "./house-lead-scroll-to-top";
import { HousePhoneBottomNav } from "./house-phone-bottom-nav";
import {
  HousePhoneBandContext,
  HousePhoneChromeContext,
  useHousePhoneBandValue,
  useHousePhoneChromeTracker,
} from "./house-phone-chrome-state";

// One phone shell primitive. Both Social and Access trees mount this
// so dest docks cannot fork. Desktop is unchanged — the bottom
// nav is md:hidden. Hide-on-scroll is owned here (house-phone-chrome):
// one tracker slides the bar over the workspace band and lands the dock
// with it at rest, for
// every workspace that uses this shell (shell-phone-workspace-band-lock-v1
// §5).
// The band reads its own half (HousePhoneBandContext, v1.5), so a dock
// flip never re-renders it.
// HouseLeadScrollToTop bridges the iOS status-bar tap to the nested
// `[data-house-lead-scroll]` scroller so every workspace answers a
// tap the same way (Adam 2026-09-19). Coarse-pointer devices only.
// Staff dests resolve from chrome — layout never passes isGcStaff.

export function HousePhoneAppShell({
  chrome,
  workspace,
  isGcStaff = false,
  homeOwned = false,
  accountChrome = false,
  coProductions = false,
  messagesUnread = 0,
  className,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  chrome?: Promise<AppShellChrome>;
  workspace: WorkspaceMode;
  isGcStaff?: boolean;
  homeOwned?: boolean;
  accountChrome?: boolean;
  coProductions?: boolean;
  /** Social DM unread total — the dock's Messages dot. */
  messagesUnread?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = useHousePathname();
  const phoneChrome = useHousePhoneChromeTracker(rootRef, pathname);
  const phoneBand = useHousePhoneBandValue(phoneChrome);
  return (
    <HousePhoneChromeContext.Provider value={phoneChrome}>
      <HousePhoneBandContext.Provider value={phoneBand}>
        <div
          ref={rootRef}
          data-house-phone-app-shell=""
          className={cn(HOUSE_LEAD_SHELL_CLASS, HOUSE_PAGE_CANVAS_CLASS, className)}
          style={style}
          {...rest}
        >
          <HouseLeadScrollToTop />
          {children}
          <PhoneDockSlot
            chrome={chrome}
            workspace={workspace}
            isGcStaff={isGcStaff}
            homeOwned={homeOwned}
            accountChrome={accountChrome}
            coProductions={coProductions}
            messagesUnread={messagesUnread}
          />
        </div>
      </HousePhoneBandContext.Provider>
    </HousePhoneChromeContext.Provider>
  );
}

function PhoneDockSlot({
  chrome,
  workspace,
  isGcStaff,
  homeOwned,
  accountChrome,
  coProductions,
  messagesUnread,
}: {
  chrome?: Promise<AppShellChrome>;
  workspace: WorkspaceMode;
  isGcStaff: boolean;
  homeOwned: boolean;
  accountChrome: boolean;
  coProductions: boolean;
  messagesUnread: number;
}) {
  const dock = (
    <HousePhoneBottomNav
      workspace={clampWorkspaceMode(workspace, isGcStaff)}
      isGcStaff={isGcStaff}
      homeOwned={homeOwned}
      accountChrome={accountChrome}
      coProductions={coProductions}
      messagesUnread={messagesUnread}
    />
  );
  if (!chrome) return dock;
  return (
    <Suspense fallback={dock}>
      <PhoneDockFromChrome
        chrome={chrome}
        workspace={workspace}
        homeOwned={homeOwned}
        accountChrome={accountChrome}
        coProductions={coProductions}
        messagesUnread={messagesUnread}
      />
    </Suspense>
  );
}

function PhoneDockFromChrome({
  chrome,
  workspace,
  homeOwned,
  accountChrome,
  coProductions,
  messagesUnread,
}: {
  chrome: Promise<AppShellChrome>;
  workspace: WorkspaceMode;
  homeOwned: boolean;
  accountChrome: boolean;
  coProductions: boolean;
  messagesUnread: number;
}) {
  const data = use(chrome);
  return (
    <HousePhoneBottomNav
      workspace={clampWorkspaceMode(workspace, data.isGcStaff)}
      isGcStaff={data.isGcStaff}
      homeOwned={homeOwned}
      accountChrome={accountChrome}
      coProductions={coProductions}
      messagesUnread={messagesUnread}
    />
  );
}
