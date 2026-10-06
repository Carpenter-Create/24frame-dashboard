import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { menuHostClass } from "@/lib/menu-host";
import { USER_MENU, USER_MENU_ABSENT } from "@/lib/user-menu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({ signOut: vi.fn() }));

import { signOut } from "@/app/actions";
import { onUserMenuLogOut, UserMenu, UserMenuIdentity } from "./user-menu";

const here = dirname(fileURLToPath(import.meta.url));
const menuSrc = readFileSync(join(here, "user-menu.tsx"), "utf8");
const sheetSrc = readFileSync(join(here, "account-sheet.tsx"), "utf8");

function visibleText(html: string): string {
  return html.replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

describe("UserMenuIdentity", () => {
  it("renders avatar and email, and omits a name when none is provided", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenuIdentity, { email: "ada@example.com" }),
    );
    expect(html).toContain('data-user-menu-avatar=""');
    expect(html).toContain('data-user-menu-email=""');
    expect(html).toContain("ada@example.com");
    expect(html).toContain(">A<");
    expect(html).not.toContain("<img");
    expect(html).toContain("size-14");
    expect(html).toContain("t-body-sm text-ink-3");
    expect(html).not.toContain("data-user-menu-name");
    expect(visibleText(html)).not.toMatch(/Notifications|Privacy|Phone|Job/);
  });

  it("renders a name row only when a real display name is passed", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenuIdentity, { email: "ada@example.com", name: "Ada Lovelace" }),
    );
    expect(html).toContain('data-user-menu-name=""');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("t-heading text-ink");
    expect(html).not.toContain("t-body font-normal");
    expect(html).toContain("t-body-sm text-ink-3");
  });

  it("does not invent a name from the email local-part", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenuIdentity, { email: "jane.doe@studio.com" }),
    );
    expect(html).not.toContain("data-user-menu-name");
    expect(html).not.toContain("Jane Doe");
    expect(html).toContain("jane.doe@studio.com");
  });

  it("shows the signed face when one exists and keeps the initial when empty", () => {
    const withFace = renderToStaticMarkup(
      createElement(UserMenuIdentity, {
        email: "ada@example.com",
        photoUrl: "https://s3.example/signed-avatar",
      }),
    );
    const empty = renderToStaticMarkup(
      createElement(UserMenuIdentity, { email: "ada@example.com", photoUrl: null }),
    );

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace).toContain("data-identity-photo");
    expect(withFace).not.toContain(">A<");
    expect(empty).toContain(">A<");
    expect(empty).not.toContain("<img");
  });
});

describe("UserMenu trigger", () => {
  it("shows the email initial and does not mount a header theme control", () => {
    const html = renderToStaticMarkup(createElement(UserMenu, { email: "nina@studio.com" }));
    expect(html).toContain('data-user-menu-trigger=""');
    expect(html).toContain("N");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Switch to dark mode");
    expect(html).not.toContain("Switch to light mode");
  });

  it("shows the signed face on both header avatars and keeps the initial when empty", () => {
    const withFace = renderToStaticMarkup(
      createElement(UserMenu, {
        email: "nina@studio.com",
        photoUrl: "https://s3.example/signed-avatar",
      }),
    );
    const empty = renderToStaticMarkup(createElement(UserMenu, { email: "nina@studio.com" }));

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace.match(/src="https:\/\/s3\.example\/signed-avatar"/g)?.length).toBe(2);
    expect(withFace).not.toContain(">N<");
    expect(empty).toContain(">N<");
    expect(empty).not.toContain("<img");
  });
});

describe("UserMenu close control", () => {
  it("opens the mobile 544:561 / 537:557 sheet and the desktop 629:795 dropdown from the avatar", () => {
    expect(menuSrc).toContain("PhoneAccountMenu");
    expect(menuSrc).toContain("DesktopAccountMenu");
    expect(menuSrc).toContain("<MenuDualHost");
    expect(menuSrc).toContain('shape="slot"');
    expect(menuSrc).not.toContain("defaultWorkspace");
    expect(sheetSrc).toContain('data-user-menu-desktop=""');
    expect(sheetSrc).toContain('menuHostClass("desktop")');
    expect(menuHostClass("desktop")).toBe("hidden md:block");
    expect(menuHostClass("phone")).toBe("md:hidden");
    expect(sheetSrc).toContain("ACCOUNT_SHEET_ITEMS");
    expect(sheetSrc).toContain("<AccountMenuDropdown");
    expect(sheetSrc).toContain("<AccountSheet");
    expect(sheetSrc).toContain("desktop-avatar-menu-coinbase-lock-v1.md");
    expect(sheetSrc).toContain("537:557");
    expect(menuSrc).not.toContain("data-account-sheet-close");
    expect(menuSrc).not.toContain("data-mobile-nav-sheet");
  });
});

describe("UserMenu identity source lock", () => {
  it("does not manufacture a name in the shell or layout", () => {
    const layoutSrc = readFileSync(join(here, "../../app/(app)/layout.tsx"), "utf8");
    const chromeSrc = readFileSync(join(here, "../../lib/app-shell-chrome.ts"), "utf8");
    expect(layoutSrc).toContain("loadAppShellChrome()");
    expect(chromeSrc).toContain("email: ctx.user.email");
    expect(chromeSrc).toContain("name: ctx.user.name");
    expect(chromeSrc).toContain("photoUrl: ACCOUNT_PHOTO_HREF");
    expect(chromeSrc).not.toContain("hasAvatarObject");
    expect(chromeSrc).toContain("ACCOUNT_PHOTO_HREF");
    expect(layoutSrc).not.toContain("signedAvatarUrl");
    expect(chromeSrc).not.toContain("signedAvatarUrl");
    expect(chromeSrc).not.toContain("signedAvatarUrl(ctx.activeOrg");
    expect(chromeSrc).not.toContain("display_name");
    expect(chromeSrc).not.toContain("user_metadata");
    expect(chromeSrc).not.toContain("full_name");
    expect(chromeSrc).not.toContain("putAvatarObject");
    expect(chromeSrc).not.toContain("uploadAccountPhoto");
    expect(menuSrc).not.toContain("split(\"@\")");
    expect(menuSrc).not.toContain("local-part");
    expect(menuSrc).not.toContain("user_metadata");
  });
});

describe("UserMenu item lock (source)", () => {
  it("renders the shared USER_MENU_ACTIONS list on both instances", () => {
    expect(sheetSrc).toContain("items.map");
    expect(sheetSrc).toContain("ACCOUNT_SHEET_ITEMS");
    expect(sheetSrc).toContain("ACCOUNT_SHEET_PHONE_ITEMS");
    expect(sheetSrc).toContain("DesktopAccountMenu");
    expect(sheetSrc).toContain("MobileAccountMenu");
    expect(sheetSrc).toContain('data-user-menu-item="logOut"');
    expect(sheetSrc).not.toContain('setFace(face === "workspace" ? "main" : "workspace")');
    expect(sheetSrc).not.toContain('setFace("workspace")');
    expect(sheetSrc).not.toContain("onUserMenuAppearance");
    expect(sheetSrc).not.toContain("toggleDocumentTheme");
    expect(sheetSrc).not.toContain("applyDocumentThemePreference");
    expect(sheetSrc).toContain("appearancePreferenceLabel");
    expect(sheetSrc).not.toContain("THEME_STORAGE_KEY");
    expect(sheetSrc).not.toContain("ThemeGlyph");
    expect(sheetSrc).not.toContain("ThemeToggle");
    expect(sheetSrc).not.toContain("/account/appearance");
    expect(sheetSrc).not.toContain("/account/workspace");
    expect(sheetSrc).not.toContain("AccountWorkspaceRow");
    expect(sheetSrc).not.toContain("AccountWorkspaceFlyout");
    expect(sheetSrc).not.toContain("type=\"radio\"");
    expect(sheetSrc).not.toContain('setFace?.("appearance")');
    expect(sheetSrc).not.toContain("AccountSheetAppearance");
    for (const absent of USER_MENU_ABSENT) {
      expect(sheetSrc).not.toContain(absent);
    }
    expect(sheetSrc).not.toContain("/account/profile");
    expect(sheetSrc).not.toContain("/account/company");
  });

  it("keeps Profile as a Settings pane href and Theme on /settings/preferences/theme", () => {
    expect(USER_MENU.profile).toBe("Profile");
    expect(USER_MENU_ABSENT).not.toContain("Theme");
  });

  it("desktop panel items are the same list as mobile", () => {
    expect(sheetSrc).toContain("ACCOUNT_SHEET_ITEMS");
    expect(sheetSrc).toContain("ACCOUNT_SHEET_PHONE_ITEMS");
    expect(sheetSrc.indexOf("DesktopAccountMenu")).toBeGreaterThan(-1);
    expect(sheetSrc.indexOf("MobileAccountMenu")).toBeGreaterThan(-1);
    expect(sheetSrc).toContain("<AccountSheet");
    expect(sheetSrc).toContain("<AccountMenuDropdown");
  });
});

describe("UserMenu actions", () => {
  beforeEach(() => {
    vi.mocked(signOut).mockClear();
  });

  it("Log out calls the existing signOut action", () => {
    onUserMenuLogOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(sheetSrc).toContain("void signOut()");
    expect(sheetSrc).toContain('from "@/app/actions"');
  });

  it("keeps the Identity half-bar on the parent while 613:888 is open", () => {
    expect(sheetSrc).toContain("<MenuSurfaceAccent");
    expect(sheetSrc).not.toContain('{face === "main" ? <MenuSurfaceAccent /> : null}');
    expect(sheetSrc).not.toContain("Adam Carpenter");
    expect(sheetSrc).not.toContain("admin@ccbfg.com");
  });

  it("keeps the theme picker off the avatar menu — Theme drills to the shared page", () => {
    expect(sheetSrc).toContain("data-account-menu-face");
    expect(sheetSrc).not.toContain("AccountSheetAppearance");
    expect(sheetSrc).not.toContain("AccountAppearanceRow");
    expect(sheetSrc).not.toContain("APPEARANCE_FLYOUT_OPTIONS.map");
    expect(sheetSrc).not.toContain("AppearanceCheck");
    expect(sheetSrc).not.toContain("applyDocumentThemePreference");
    expect(sheetSrc).not.toContain("data-account-menu-theme-switch");
    expect(sheetSrc).not.toContain('role="switch"');
    expect(sheetSrc).toContain("appearancePreferenceLabel");
    expect(sheetSrc).toContain("USER_MENU.themeHref");
    expect(sheetSrc).toContain("ACCOUNT_MENU_THEME_CHEVRON_CLASS");
    expect(sheetSrc).not.toContain("CaretLeft");
    expect(sheetSrc).not.toContain("AccountBackChevron");
    expect(sheetSrc).not.toContain("APPEARANCE.back");
    expect(sheetSrc).not.toContain("AccountAppearanceFlyout");
    expect(sheetSrc).not.toContain("accountMenuAppearanceFlyoutAlign");
    expect(sheetSrc).not.toContain("APPEARANCE_OPTIONS.map");
    expect(sheetSrc).not.toContain("Back to main menu");
    expect(sheetSrc).not.toContain('type="radio"');
    expect(sheetSrc).not.toContain("radiogroup");
    expect(sheetSrc).not.toContain("ThemeGlyph");
    expect(sheetSrc).not.toContain("ThemeToggle");
    expect(sheetSrc).not.toContain("/account/appearance");
    expect(sheetSrc).not.toContain("purple");
    expect(sheetSrc).not.toContain("violet");
  });
});

describe("UserMenu Mercury quiet craft", () => {
  it("keeps Theme off the header — the avatar door stays a drill", () => {
    const shellSrc = readFileSync(join(here, "app-shell.tsx"), "utf8");
    const leadSrc = readFileSync(join(here, "house-lead-chrome.tsx"), "utf8");
    expect(shellSrc).not.toContain("ThemeToggle");
    expect(shellSrc).not.toContain("ThemeGlyph");
    expect(menuSrc).not.toContain("ThemeToggle");
    expect(menuSrc).not.toContain("ThemeGlyph");
    expect(leadSrc).not.toContain("ThemeToggle");
    expect(leadSrc).not.toContain("data-theme-toggle");
    expect(sheetSrc).not.toContain("ThemeToggle");
    expect(leadSrc).not.toContain("data-app-header-desktop-trailing");
    expect(leadSrc).not.toContain("APP_HEADER_DESKTOP_TRAILING_CLASS");
    expect(sheetSrc).toContain('kind === "settings"');
  });
});
