import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isSocialPath, resolveWorkspaceMode } from "@/lib/workspace";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const appLayout = readFileSync("src/app/(app)/layout.tsx", "utf8");
const appShell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const chrome = readFileSync("src/lib/app-shell-chrome.ts", "utf8");
const socialLayout = readFileSync("src/app/(app)/social/layout.tsx", "utf8");
const socialHome = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const socialExplore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
const socialDms = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
const socialProfile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const socialEdit = readFileSync("src/app/(app)/social/profile/edit/page.tsx", "utf8");
const socialBio = readFileSync("src/app/(app)/social/profile/edit/bio/page.tsx", "utf8");
const socialSession = readFileSync("src/lib/social-session.ts", "utf8");

const SOCIAL_NAV_PAGES = [
  "src/app/(app)/social/page.tsx",
  "src/app/(app)/social/explore/page.tsx",
  "src/app/(app)/social/dms/page.tsx",
  "src/app/(app)/social/profile/page.tsx",
  "src/app/(app)/social/profile/edit/page.tsx",
  "src/app/(app)/social/profile/edit/bio/page.tsx",
] as const;

const AGGREGATION_PAGE_MODULES = [
  "@/app/(app)/aggregation/dashboard/page",
  "@/app/(app)/aggregation/titles/page",
  "@/app/(app)/activity/page",
  "@/app/(app)/aggregation/reports/page",
] as const;

describe("Social nav leftover split (shared shell vs Social-local)", () => {
  it("keeps the root layout off the Social critical path", () => {
    expect(rootLayout).toContain("export default function RootLayout");
    expect(rootLayout).not.toContain("export default async function RootLayout");
    expect(rootLayout).not.toContain("getOrgContext");
    expect(rootLayout).not.toContain("cookies(");
    expect(rootLayout).not.toContain("hasAvatarObject");
    expect(rootLayout).not.toContain("getActiveOrgTier");
    expect(rootLayout).not.toContain("createClient");
    expect(rootLayout).toContain("ThemeSync");
  });

  it("streams the shared (app) shell so child loading.tsx can paint", () => {
    expect(appLayout).toContain("export default function AppLayout");
    expect(appLayout).not.toContain("export default async function AppLayout");
    expect(appLayout).toContain("loadAppShellChrome()");
    expect(appLayout).toContain("{children}");
    expect(appLayout).not.toMatch(/await getOrgContext/);
    expect(appLayout).not.toMatch(/await hasAvatarObject/);
    expect(appLayout).not.toMatch(/await getActiveOrgTier/);
    expect(chrome).toContain("cache(async");
    expect(chrome).not.toContain("hasAvatarObject");
    expect(chrome).toContain("photoUrl: ACCOUNT_PHOTO_HREF");
    expect(chrome).toContain("getActiveOrgTier");
    expect(appShell).toContain("HouseLeadChrome");
    expect(appShell).not.toContain("SocialTopBarFromChrome");
    expect(appShell).toContain("Do not use() this at the AppShell top");
  });

  it("keeps a stable Social segment layout mounted across Social destinations", () => {
    expect(existsSync("src/app/(app)/social/layout.tsx")).toBe(true);
    expect(socialLayout).toContain("export default function SocialLayout");
    expect(socialLayout).not.toContain("export default async function SocialLayout");
    expect(socialLayout).toContain("loadSocialSession()");
    expect(socialLayout).toContain("SocialProfileSaveHop");
    expect(socialLayout).toContain("{children}");
    expect(appShell).not.toMatch(/key=\{pathname\}/);
  });

  it("does not import Aggregation sibling pages on Social nav destinations", () => {
    for (const path of SOCIAL_NAV_PAGES) {
      const src = readFileSync(path, "utf8");
      for (const pageModule of AGGREGATION_PAGE_MODULES) {
        expect(src).not.toContain(pageModule);
      }
      expect(src).not.toContain('from "@/app/(app)/titles');
      expect(src).not.toContain('from "@/app/(app)/messages');
      expect(src).not.toContain('from "@/app/(app)/reports');
      expect(src).not.toContain("WorkspaceSwitcher");
      expect(src).not.toContain("data-app-home-frame");
      expect(src).not.toContain("data-app-messages-frame");
    }
    expect(isSocialPath("/social")).toBe(true);
    expect(isSocialPath("/social/explore")).toBe(true);
    expect(isSocialPath("/social/dms")).toBe(true);
    expect(isSocialPath("/social/profile")).toBe(true);
    expect(isSocialPath("/social/profile/edit")).toBe(true);
    expect(isSocialPath("/titles")).toBe(false);
    expect(resolveWorkspaceMode("/social/profile/edit", "aggregation")).toBe("social");
    expect(resolveWorkspaceMode("/aggregation/messages", "social")).toBe("aggregation");
    expect(appShell).toContain("socialChrome");
    expect(appShell).toContain("One return tree");
    expect(appShell).toContain("HouseLeadChrome");
  });

  it("parallelizes Social session and streams page slots on the nav pack", () => {
    expect(socialSession).toContain("Promise.all([getOrgContext(), createClient()])");
    expect(socialHome).toContain("requireSocialSession");
    expect(socialHome).toContain("<Suspense");
    expect(socialHome).not.toContain("SocialHomeRecentChatsSlot");
    expect(socialHome).toContain("SocialDesktopForYouSlot");
    expect(socialProfile).toContain("SocialDesktopForYouSlot");
    expect(socialExplore).toContain("requireSocialSession");
    expect(socialExplore).toContain("<Suspense");
    expect(socialExplore).toContain("SocialExploreForYouSkeleton");
    expect(socialExplore).not.toContain("fallback={<SocialExploreSkeleton");
    expect(socialDms).toContain("requireSocialSession");
    expect(socialDms).toContain("<Suspense");
    expect(socialDms).toContain("Promise.all");
    expect(socialProfile).toContain("requireSocialSession");
    expect(socialProfile).toContain("<Suspense");
    expect(socialEdit).toContain("requireSocialSession");
    expect(socialEdit).toContain("Promise.all");
    expect(socialEdit).toContain("signedAvatarUrl(ctx.user.id)");
    expect(socialBio).toContain("requireSocialSession");
  });
});
