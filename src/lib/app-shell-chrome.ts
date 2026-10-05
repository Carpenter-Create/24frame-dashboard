import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCOUNT_PHOTO_HREF } from "@/lib/account-avatar";
import type { ActivityItem } from "@/lib/activity";
import { APP_GATE_REDIRECT, appAccessBlocked } from "@/lib/app-access";
import { resolveMessagesSurface, type MessagesSurface } from "@/lib/ask-frame-ai";
import { loadActivityBellItems } from "@/lib/my-lists";
import { overviewSocialUnreadTotal } from "@/lib/overview";
import { loadDmInbox } from "@/lib/social-dms";
import { getActiveOrgTier } from "@/lib/org-tier";
import { readSidebarCollapsed } from "@/lib/rail-collapse";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, type OrgContext } from "@/lib/supabase/context";
import {
  clampWorkspaceMode,
  parseWorkspaceCookie,
  WORKSPACE_COOKIE,
  type WorkspaceMode,
} from "@/lib/workspace";

export type AppShellChrome = {
  email: string;
  name?: string | null;
  photoUrl: string | null;
  orgs: { id: string; name: string }[];
  activeOrgId: string | null;
  unread: Promise<number>;
  activityItems: Promise<ActivityItem[]>;
  /** Social DM unread total (the inbox's rooms): the Messages dot in
   *  the side menu and the phone dock. Not awaited; 0 on failure. */
  dmUnread: Promise<number>;
  isGcStaff: boolean;
  defaultCollapsed: boolean;
  messagesSurface: MessagesSurface;
  defaultWorkspace: WorkspaceMode;
};

// Same gates the (app) layout used to await before {children}. Middleware
// already bounces an empty session, and mid-onboarding on full page loads.
// This still enforces mid-onboarding on in-app navigations.
// Call from a Suspense sibling so Social loading.tsx can paint first.
export async function enforceAppAccess(): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (appAccessBlocked(ctx.activeOrg, ctx.isGcStaff)) redirect(APP_GATE_REDIRECT);
  return ctx;
}

// Identity + Aggregation-only chrome. Not awaited in the layout body.
// Face is the same-origin photo route; IdentityPhoto onError drops a miss.
// No S3 HEAD here — that import would pin Social Edge reads to Node.
export const loadAppShellChrome = cache(async (): Promise<AppShellChrome> => {
  const ctx = await enforceAppAccess();
  const jar = await cookies();
  const tier = ctx.activeOrg ? await getActiveOrgTier(ctx.activeOrg.id) : null;
  return {
    email: ctx.user.email,
    name: ctx.user.name,
    photoUrl: ACCOUNT_PHOTO_HREF,
    orgs: ctx.orgs,
    activeOrgId: ctx.activeOrg?.id ?? null,
    unread: ctx.unread,
    activityItems: Promise.resolve(
      createClient()
        .then((supabase) => loadActivityBellItems(supabase))
        .then((rows) => rows as ActivityItem[]),
    ).catch(() => []),
    dmUnread: Promise.resolve(
      createClient()
        .then((supabase) => loadDmInbox(supabase))
        .then((page) => overviewSocialUnreadTotal(page.rows)),
    ).catch(() => 0),
    isGcStaff: ctx.isGcStaff,
    defaultCollapsed: readSidebarCollapsed((name) => jar.get(name)?.value),
    messagesSurface: resolveMessagesSurface({
      isGcStaff: ctx.isGcStaff,
      hasActiveOrg: !!ctx.activeOrg,
      tier,
    }),
    defaultWorkspace: clampWorkspaceMode(
      parseWorkspaceCookie(jar.get(WORKSPACE_COOKIE)?.value),
      ctx.isGcStaff,
    ),
  };
});

export function appShellUnread(chrome: Promise<AppShellChrome>): Promise<number> {
  return chrome.then((data) => data.unread);
}

export function appShellDmUnread(chrome: Promise<AppShellChrome>): Promise<number> {
  return chrome.then((data) => data.dmUnread).catch(() => 0);
}

export function appShellActivityItems(
  chrome: Promise<AppShellChrome>,
): Promise<ActivityItem[]> {
  return chrome.then((data) => data.activityItems);
}
