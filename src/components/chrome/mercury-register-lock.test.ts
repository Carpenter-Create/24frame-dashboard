import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SETTINGS_PAGE_LEAD_BACK_CLASS } from "@/lib/settings";
import { SHEET_GROUP_CHEVRON_CLASS } from "@/lib/house-sheet";
import { USER_MENU_ACTIONS } from "@/lib/user-menu";

const settingsPages = [
  "src/app/(app)/settings/page.tsx",
  "src/app/(app)/settings/loading.tsx",
  "src/app/(app)/settings/profile/page.tsx",
  "src/app/(app)/settings/organization/page.tsx",
  "src/app/(app)/settings/organization/company/page.tsx",
  "src/app/(app)/settings/organization/entities/new/page.tsx",
  "src/app/(app)/settings/organization/entities/[entityId]/page.tsx",
  "src/app/(app)/settings/preferences/page.tsx",
  "src/app/(app)/settings/agreements/page.tsx",
  "src/app/(app)/settings/refer/page.tsx",
] as const;

const mercuryLayout = [
  "src/lib/account-sheet.ts",
  "src/lib/user-menu.ts",
  "src/components/chrome/user-menu.tsx",
] as const;

function src(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Adam Mercury register lock", () => {
  it("does not rewrite Settings/Profile page interiors — live Mercury stays", () => {
    for (const path of settingsPages) {
      const file = src(path);
      expect(file).not.toContain("@phosphor-icons/react");
      expect(file).not.toContain("84:46");
    }
    expect(USER_MENU_ACTIONS.map((item) => item.kind)[0]).toBe("settings");
    expect(src("src/components/chrome/house-lead-chrome.tsx")).toContain("WorkspaceSwitcher");
    expect(src("src/components/chrome/app-shell.tsx")).toContain("HouseLeadChrome");
    expect(src("src/components/chrome/account-sheet.tsx")).not.toContain(
      'data-user-menu-item="workspace"',
    );
    expect(src("src/components/chrome/account-sheet.tsx")).not.toContain("AccountWorkspaceRow");
  });

  it("keeps shared account/settings layout tokens — Phosphor is glyph-only", () => {
    for (const path of mercuryLayout) {
      expect(src(path)).not.toContain("@phosphor-icons/react");
    }
    expect(SHEET_GROUP_CHEVRON_CLASS).toBe("size-4 shrink-0 text-ink-3");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).not.toContain("text-ink");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).not.toContain("t-body");
    expect(src("src/components/chrome/account-sheet.tsx")).toContain(
      "className={SHEET_GROUP_CHEVRON_CLASS}",
    );
    expect(src("src/components/chrome/account-sheet.tsx")).toContain(
      'className="size-4 shrink-0"',
    );
    expect(src("src/components/settings/settings-page-lead.tsx")).toContain(
      "PageHeaderBackLink",
    );
  });

  it("measures node ids 75:5 / 75:132 / 75:2 / 61:2 — not discarded frame names", () => {
    const phosphor = src("src/lib/phosphor-icon.tsx");
    const nav = src("src/lib/nav.ts");
    const settingsRail = src("src/components/chrome/settings-rail.tsx");
    const sideNav = src("src/components/chrome/side-nav.tsx");
    expect(phosphor).toContain("75:5");
    expect(phosphor).toContain("75:132");
    expect(phosphor).toContain("75:2");
    expect(phosphor).toContain("61:2");
    expect(nav).toContain("75:5");
    expect(nav).toContain("61:2");
    expect(settingsRail).toContain("75:132");
    expect(sideNav).toContain("75:5");
    for (const file of [phosphor, nav, settingsRail, sideNav]) {
      expect(file).not.toContain("6:2");
      expect(file).not.toContain("6:3");
    }
    expect(phosphor).toContain("84:46");
    expect(phosphor).toContain("84:176");
    expect(phosphor).toContain("84:240");
    expect(phosphor).toContain("82:5");
    expect(phosphor).toContain("82:9");
    expect(phosphor).toContain("82:13");
    expect(src("src/components/chrome/rail-collapse.tsx")).toContain("CaretDoubleRight");
    expect(src("src/components/chrome/app-shell.tsx")).toContain("<RailCollapse");
    expect(src("src/components/chrome/account-sheet.tsx")).toContain("SignOut");
    expect(src("src/components/chrome/house-phone-bottom-nav.tsx")).toContain("housePhoneDestGlyph");
  });

  it("does not escalate Mercury past current — 16 Bold idle, no Social bleed", () => {

    const account = src("src/components/chrome/account-sheet.tsx");
    const settingsRail = src("src/components/chrome/settings-rail.tsx");
    const settingsLead = src("src/components/settings/settings-page-lead.tsx");
    for (const file of [account, settingsRail, settingsLead]) {
      expect(file).not.toContain("size-5");
      expect(file).not.toContain("size-6");
      expect(file).not.toContain("weight=\"fill\"");
      expect(file).not.toContain("#");
    }

    const nav = src("src/lib/nav.ts");
    expect(nav).not.toContain('family: "lucide"');
    expect(nav).toContain("SOCIAL_NAV");
    expect(nav).toContain('family: "phosphor"');
    // Social interiors stay on Social Figma V1 SocialIcon. House lead
    // search is shared chrome — Phosphor, not a Social interior fork.
    // Density lock v1.1 puts Photo and Camera on the composer via SocialIcon.
    const composer = src("src/components/social/social-home-composer.tsx");
    expect(composer).toContain("useSocialCompose()");
    expect(composer).not.toContain("<SocialWriteComposeSheet");
    expect(composer).not.toContain('socialCreateHref("text")');
    expect(composer).not.toContain("SocialCreateSheet");
    expect(composer).toContain("SocialIcon");
    // The fan's Media and Live tiles ("Match the fan", Adam 2026-10-08).
    expect(composer).toContain("name={MEDIA_TILE.icon}");
    expect(composer).toContain("name={LIVE_TILE.icon}");
    expect(composer).not.toContain('icon="camera"');
    expect(src("src/components/social/social-create-compose.tsx")).toContain("SocialIcon");
    expect(src("src/components/chrome/house-lead-search.tsx")).toContain("MagnifyingGlass");
    expect(src("src/components/chrome/house-lead-search.tsx")).not.toContain("lucide-react");
    expect(src("src/components/chrome/house-lead-search.tsx")).not.toContain("SocialIcon");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(src("src/app/(app)/social/profile/page.tsx")).not.toContain("AccountProfileForm");
  });
});
