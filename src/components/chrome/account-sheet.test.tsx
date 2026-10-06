import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions", () => ({ signOut: vi.fn() }));

import { NAV, GC_NAV, MOBILE_NAV } from "@/lib/nav";
import {
  ACCOUNT_MENU_ROOT_ATTR,
  ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS,
  ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS,
  ACCOUNT_MENU_DROPDOWN_HOST_CLASS,
  ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS,
  ACCOUNT_MENU_DROPDOWN_ROW_CLASS,
  ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS,
  ACCOUNT_MENU_DROPDOWN_VERSION_CLASS,
  ACCOUNT_SHEET,
  ACCOUNT_SHEET_ABSENT,
  ACCOUNT_SHEET_HEAD_CLASS,
  ACCOUNT_SHEET_HOST_CLASS,
  ACCOUNT_SHEET_ITEMS,
  ACCOUNT_SHEET_LEFTOVER_CLASS,
  ACCOUNT_SHEET_LOGOUT_CLASS,
  ACCOUNT_SHEET_PIN_CLASS,
  ACCOUNT_SHEET_SCROLL_CLASS,
  ACCOUNT_SHEET_STAGE_CLASS,
  ACCOUNT_SHEET_SURFACE_CLASS,
  ACCOUNT_SHEET_VERSION_CLASS,
} from "@/lib/account-sheet";
import {
  APP_SHEET_RISE_CLASS,
  APP_SHEET_SCRIM_CLASS,
  APP_SHEET_SCRIM_FADE_CLASS,
  CLOSE_44_CLASS,
  SHEET_GROUP_CHEVRON_CLASS,
  SHEET_GROUP_INSET_ITEM_CLASS,
  SHEET_GROUP_ITEM_CLASS,
} from "@/lib/house-sheet";
import { HOUSE_HEADER_TRAILING_AVATAR_CLASS } from "@/lib/house-lead-chrome";
import { USER_MENU, userMenuVersion } from "@/lib/user-menu";
import {
  AccountMenuDropdown,
  AccountSheet,
  DesktopAccountMenu,
  MobileAccountMenu,
} from "./account-sheet";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "account-sheet.tsx"), "utf8");
const houseSrc = readFileSync(join(here, "house.tsx"), "utf8");
const menuSrc = readFileSync(join(here, "user-menu.tsx"), "utf8");
const destsSrc = readFileSync(join(here, "house-phone-bottom-nav.tsx"), "utf8");
const headerSrc = readFileSync(join(here, "messages-app-header.tsx"), "utf8");
const landingSrc = readFileSync(join(here, "../messages/ask-frame-ai-landing.tsx"), "utf8");

function attrClass(html: string, attr: string): string {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const classThenAttr = html.match(new RegExp(`class="([^"]*)"[^>]*${escaped}`));
  const attrThenClass = html.match(new RegExp(`${escaped}[^>]*class="([^"]*)"`));
  return classThenAttr?.[1] ?? attrThenClass?.[1] ?? "";
}

function tagWith(html: string, attr: string): string {
  const idx = html.indexOf(attr);
  if (idx < 0) return "";
  return html.slice(html.lastIndexOf("<", idx), html.indexOf(">", idx) + 1);
}

function buttonClass(html: string, attr: string): string {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const classThenAttr = html.match(new RegExp(`<button class="([^"]*)"[^>]*${escaped}`));
  const attrThenClass = html.match(new RegExp(`<button[^>]*${escaped}[^>]*class="([^"]*)"`));
  return classThenAttr?.[1] ?? attrThenClass?.[1] ?? "";
}

function minBoxPx(className: string, prop: "min-h" | "min-w"): number {
  const match = className.match(new RegExp(`${prop}-\\[(\\d+)px\\]`));
  return match ? Number(match[1]) : 0;
}

function renderSheet(
  email = "ada@example.com",
  name?: string | null,
  photoUrl?: string | null,
  pathname = "/",
): string {
  return renderToStaticMarkup(
    <AccountSheet
      email={email}
      name={name}
      photoUrl={photoUrl}
      pathname={pathname}
      onClose={() => undefined}
    />,
  );
}

function renderDropdown(
  email = "ada@example.com",
  name?: string | null,
  photoUrl?: string | null,
): string {
  return renderToStaticMarkup(
    <AccountMenuDropdown
      email={email}
      name={name}
      photoUrl={photoUrl}
      pathname="/"
      onClose={() => undefined}
    />,
  );
}

describe("MobileAccountMenu trigger", () => {
  it("is the existing 32 avatar, phone-only, and does not open the nav sheet", () => {
    navigation.pathname = "/";
    const html = renderToStaticMarkup(<MobileAccountMenu email="nina@studio.com" />);

    expect(html).toContain("data-account-sheet-trigger");
    expect(html).toContain(ACCOUNT_SHEET.sheet);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("md:hidden");
    expect(html).toContain(HOUSE_HEADER_TRAILING_AVATAR_CLASS);
    expect(html).toContain("size-[var(--header-avatar-size)]");
    expect(html).toContain("rounded-full");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain(">N<");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data-account-sheet=\"\"");
    expect(html).not.toContain("data-mobile-nav-sheet");
    expect(html).not.toContain("data-mobile-nav-trigger");
    expect(src).toContain("createPortal");
    expect(src).toContain("document.body");
    expect(src).not.toContain("data-mobile-nav");
  });

  it("shows the signed face on the 32 trigger and keeps the initial when empty", () => {
    navigation.pathname = "/";
    const withFace = renderToStaticMarkup(
      <MobileAccountMenu email="nina@studio.com" photoUrl="https://s3.example/signed-avatar" />,
    );
    const empty = renderToStaticMarkup(<MobileAccountMenu email="nina@studio.com" />);

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace).toContain("overflow-hidden");
    expect(withFace).not.toContain(">N<");
    expect(empty).toContain(">N<");
    expect(empty).not.toContain("<img");
    expect(src).toContain("accountPhotoSrc");
    expect(src).not.toContain("signedAvatarUrl");
    expect(src).not.toContain("uploadAccountPhoto");
  });
});

describe("AccountSheet 544:561 / 537:557", () => {
  it("rises from the bottom over a quiet scrim so the page stays under", () => {
    const html = renderSheet();
    const closeClass = buttonClass(html, "data-account-sheet-close");
    const headClass = attrClass(html, "data-account-sheet-head");
    const surfaceClass = attrClass(html, "data-account-sheet-surface");
    const scrimClass = attrClass(html, "data-account-sheet-scrim");
    const hostClass = attrClass(html, "data-account-sheet=\"\"");

    expect(html).toContain("data-account-sheet=\"\"");
    expect(html).toContain("data-account-sheet-scrim");
    expect(hostClass).toContain("md:hidden");
    expect(html).toContain('aria-label="Account"');
    expect(hostClass).toBe(ACCOUNT_SHEET_HOST_CLASS);
    expect(hostClass).toContain("justify-end");
    expect(hostClass).not.toContain("md:flex-row");
    expect(hostClass).not.toContain("md:items-end");
    expect(hostClass).not.toContain("bg-canvas");
    expect(scrimClass).toBe(APP_SHEET_SCRIM_CLASS);
    expect(scrimClass).toContain(APP_SHEET_SCRIM_FADE_CLASS);
    expect(surfaceClass).toBe(ACCOUNT_SHEET_SURFACE_CLASS);
    expect(surfaceClass).toContain(APP_SHEET_RISE_CLASS);
    expect(surfaceClass).toContain("h-auto");
    expect(surfaceClass).toContain("max-h-[90vh]");
    expect(surfaceClass).toContain("p-[var(--space-4)]");
    expect(surfaceClass).toContain("rounded-t-[16px]");
    expect(surfaceClass).toContain("bg-surface");
    expect(surfaceClass).toContain("shadow-none");
    expect(surfaceClass).not.toContain("px-[var(--space-6)]");
    expect(surfaceClass).not.toContain("pb-[var(--space-8)]");
    expect(surfaceClass).not.toContain("pb-[var(--space-12)]");
    expect(surfaceClass).not.toContain("pt-[calc(4px+var(--space-8))]");
    expect(surfaceClass).not.toContain("md:w-[390px]");
    expect(surfaceClass).not.toContain("w-[264px]");
    expect(surfaceClass).not.toContain("w-[277px]");
    expect(surfaceClass).not.toContain("top-[var(--header-height)]");
    expect(surfaceClass).not.toContain("rounded-t-[24px]");
    expect(headClass).toBe(ACCOUNT_SHEET_HEAD_CLASS);
    expect(headClass).toContain("min-h-12");
    expect(headClass).toContain("justify-between");
    expect(headClass).toContain("items-center");
    expect(closeClass).toContain("rounded-full");
    expect(closeClass).toContain("bg-surface-muted");
    expect(closeClass).toContain("text-ink-3");
    expect(closeClass).toContain("size-[44px]");
    expect(CLOSE_44_CLASS.split(" ").every((token) => closeClass.includes(token))).toBe(true);
    expect(minBoxPx(closeClass, "min-h")).toBeGreaterThanOrEqual(44);
    expect(minBoxPx(closeClass, "min-w")).toBeGreaterThanOrEqual(44);
    expect(src).toContain("<Close44");
    expect(src).not.toMatch(/duration-\d|ease-out|ease-in|@keyframes|bounce/i);
    expect(houseSrc).toContain('<X className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(src).toContain("event.key === \"Escape\"");
  });

  it("uses AppSheet pad 16 on the phone sheet and Coinbase MenuSurface chrome on the 280", () => {
    const html = renderSheet();
    const surfaceClass = attrClass(html, "data-account-sheet-surface");
    const accent = attrClass(html, "data-menu-surface-accent");

    expect(surfaceClass).toBe(ACCOUNT_SHEET_SURFACE_CLASS);
    expect(surfaceClass).toContain("p-[var(--space-4)]");
    expect(surfaceClass).not.toContain("px-[var(--space-6)]");
    expect(surfaceClass).not.toContain("pb-[var(--space-8)]");
    expect(surfaceClass).not.toContain("pb-[var(--space-12)]");
    expect(surfaceClass).not.toContain("pt-[calc(4px+var(--space-8))]");
    expect(accent).toContain("top-0");
    expect(accent).toContain("h-[4px]");
    expect(accent).toContain("w-1/2");
    expect(accent).toContain("left-0");
    expect(accent).toContain("bg-accent");
    expect(accent).not.toContain("#1769");
  });

  it("puts Identity and Close/44 on one top row, centers aligned", () => {
    const html = renderSheet("ada@example.com", "Ada Lovelace");
    const head = html.slice(
      html.indexOf("data-account-sheet-head"),
      html.indexOf("data-account-sheet-rule"),
    );
    expect(head).toContain("data-identity-block");
    expect(head).toContain("data-account-sheet-close");
    expect(head.indexOf("data-identity-block")).toBeLessThan(head.indexOf("data-account-sheet-close"));
    expect(head).toContain("Ada Lovelace");
    expect(head).toContain("ada@example.com");
    expect(attrClass(html, "data-account-sheet-head")).toContain("min-h-12");
    expect(attrClass(html, "data-account-sheet-head")).toContain("items-center");
    expect(attrClass(html, "data-account-sheet-head")).toContain("justify-between");
  });

  it("keeps the Identity half-bar on the hug sheet — theme is not a list row", () => {
    const main = renderSheet();
    const accent = attrClass(main, "data-menu-surface-accent");

    expect(main).toContain("data-menu-surface-accent");
    expect(accent).toContain("h-[4px]");
    expect(accent).toContain("w-1/2");
    expect(accent).toContain("left-0");
    expect(accent).toContain("top-0");
    expect(accent).toContain("bg-accent");
    expect(accent).not.toContain("w-full");
    expect(accent).not.toContain("bg-hairline");
    expect(main).toContain("data-identity-block");
    expect(main).toContain("data-account-sheet-close");
    expect(main).toContain('data-account-menu-face="main"');
    expect(main).not.toContain('data-sheet-group-item="appearance"');
    expect(main).not.toContain("data-account-menu-appearance-flyout");
    expect(src).toContain("<MenuSurfaceAccent");
    expect(src).not.toContain('{face === "main" ? <MenuSurfaceAccent /> : null}');
    expect(src).not.toContain("AccountSheetAppearance");
    expect(src).not.toContain("Adam Carpenter");
    expect(src).not.toContain("admin@ccbfg.com");
  });

  it("puts live Identity first: 48 circle, name 15 ink, email 13 tertiary, then hairline", () => {
    const html = renderSheet("ada@example.com");
    const identity = html.slice(
      html.indexOf("data-identity-block"),
      html.indexOf("data-account-sheet-rule"),
    );
    const settingsClass = attrClass(html, 'data-sheet-group-item="settings"');
    const nameClass = attrClass(html, "data-identity-name");
    const emailClass = attrClass(html, "data-identity-email");

    expect(html).toContain("data-identity-avatar");
    expect(html).toContain("data-identity-name");
    expect(html).toContain("data-identity-email");
    expect(identity).toContain(">A<");
    expect(identity).not.toContain("<img");
    expect(identity).not.toContain("—");
    expect(identity).toContain("ada@example.com");
    expect(identity).not.toContain("Ada Lovelace");
    expect(identity).not.toContain("Manage account");
    expect(nameClass).toContain("t-heading");
    expect(nameClass).not.toContain("t-body");
    expect(nameClass).toContain("text-ink");
    expect(nameClass).not.toContain("text-accent");
    expect(emailClass).toContain("t-body-sm");
    expect(emailClass).toContain("text-ink-3");
    expect(html).not.toContain(USER_MENU.profile);
    expect(html).not.toContain(`href="${USER_MENU.profileHref}"`);
    expect(html).toContain(USER_MENU.settings);
    expect(html).toContain(`href="${USER_MENU.settingsHref}"`);
    expect(settingsClass).toBe(SHEET_GROUP_INSET_ITEM_CLASS);
    expect(SHEET_GROUP_INSET_ITEM_CLASS.startsWith(SHEET_GROUP_ITEM_CLASS)).toBe(true);
    expect(src).toContain("<IdentityBlock");
    expect(html.indexOf("data-identity-block")).toBeLessThan(html.indexOf("data-account-sheet-rule"));
    expect(html.indexOf("data-account-sheet-rule")).toBeLessThan(html.indexOf('data-sheet-group-item="settings"'));
    expect(html).toContain("data-account-sheet-rule");
    expect(attrClass(html, "data-account-sheet-rule")).toContain("bg-hairline");
  });

  it("does not invent a name from the email local-part or render a dash", () => {
    const html = renderSheet("jane.doe@studio.com");
    expect(html).toContain("jane.doe@studio.com");
    expect(html).not.toContain("Jane Doe");
    expect(html).toContain("data-identity-name");
    expect(html).not.toContain("—");
    expect(html).not.toContain("jane.doe</");
  });

  it("shows a real name only when one is already passed", () => {
    const html = renderSheet("ada@example.com", "Ada Lovelace");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("data-identity-name");
  });

  it("shows the signed face in Identity and keeps the initial when empty", () => {
    const withFace = renderSheet("ada@example.com", "Ada Lovelace", "https://s3.example/signed-avatar");
    const empty = renderSheet("ada@example.com", "Ada Lovelace");
    const identity = withFace.slice(
      withFace.indexOf("data-identity-block"),
      withFace.indexOf("data-account-sheet-rule"),
    );

    expect(identity).toContain('src="https://s3.example/signed-avatar"');
    expect(identity).toContain("data-identity-photo");
    expect(identity).not.toContain(">A<");
    expect(empty).toContain(">A<");
    expect(empty).not.toContain("<img");
  });

  it("lists Settings — Theme — Get Help, then Log out with the footer", () => {
    const html = renderSheet();
    const group = html.slice(html.indexOf("data-sheet-group"));
    const settingsClass = attrClass(html, 'data-sheet-group-item="settings"');
    const logOutClass = attrClass(html, 'data-sheet-group-item="logOut"');

    expect(html).not.toContain("Manage account");
    expect(html).not.toContain("User Profile");
    expect(html).not.toContain("Company Profile");
    expect(html).not.toContain("Phone");
    expect(html).not.toContain("Job");
    expect(html).not.toContain("data-sheet-group-label");
    expect(html).not.toContain(">ACCOUNT<");
    expect(html).not.toContain("Workspace");
    expect(group).not.toContain("Profile");
    expect(group).not.toContain("Appearance");
    expect(group).toContain("Theme");
    expect(group.indexOf("Settings")).toBeLessThan(group.indexOf("Theme"));
    expect(group.indexOf("Theme")).toBeLessThan(group.indexOf("Get Help"));
    expect(html.indexOf("Get Help")).toBeLessThan(html.indexOf("Log out"));
    expect(html).not.toContain("24Frame AI");
    expect(html).not.toContain('data-sheet-group-item="workspace"');
    expect(html).not.toContain('data-sheet-group-item="profile"');
    expect(html).toContain('data-sheet-group-item="settings"');
    expect(html).toContain('data-sheet-group-item="theme"');
    expect(html).toContain('href="/settings/preferences/theme"');
    expect(html).not.toContain('href="/settings/theme"');
    expect(html).not.toContain('data-sheet-group-item="askAssistant"');
    expect(html).not.toContain('data-sheet-group-item="appearance"');
    expect(html).not.toContain('data-sheet-group-item="agreements"');
    expect(html).toContain('data-sheet-group-item="help"');
    expect(html).toContain('data-sheet-group-id="preferences"');
    expect(html).toContain('data-sheet-group-id="help"');
    expect(html).toContain('data-sheet-group-id="logOut"');
    expect(html).toContain("data-sheet-group-inset");
    expect(html).not.toContain("data-account-sheet-help-rule");
    expect(html.indexOf('data-sheet-group-item="settings"')).toBeLessThan(
      html.indexOf("data-sheet-group-rule"),
    );
    expect(html.indexOf("data-sheet-group-rule")).toBeLessThan(
      html.indexOf('data-sheet-group-item="theme"'),
    );
    expect(html.indexOf('data-sheet-group-item="theme"')).toBeLessThan(
      html.indexOf('data-sheet-group-item="help"'),
    );
    expect(html.match(/data-sheet-group-rule/g)).toHaveLength(1);
    expect(html).not.toContain('data-sheet-group-item="refer"');
    expect(html).not.toContain('data-sheet-group-item="feedback"');
    expect(html).toContain('data-sheet-group-item="logOut"');
    expect(html).not.toContain(`href="${USER_MENU.profileHref}"`);
    expect(html).toContain('data-sheet-group-item="settings"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain('href="/messages"');
    expect(html).not.toContain('href="?ai=1"');
    expect(src).not.toContain("<AskAiOpenButton");
    expect(src).not.toContain('data-sheet-group-item="askAssistant"');
    expect(src).toContain("onClick={onClose}");
    expect(html).not.toContain(`href="${USER_MENU.agreementsHref}"`);
    expect(html).toContain(`href="${USER_MENU.helpHref}"`);
    expect(html).not.toContain('href="/help/feedback"');
    expect(html).not.toContain(`href="${USER_MENU.referHref}"`);
    expect(html).not.toContain("/account/appearance");
    expect(html).not.toContain("/account/company");
    expect(html).not.toContain('href="/account/profile"');
    expect(html).not.toContain("/settings/profile");
    expect(ACCOUNT_SHEET_ITEMS).toBeDefined();
    expect(src).toContain('from "@/app/actions"');
    expect(src).toContain("void signOut()");
    expect(src).toContain("settingsLandHref");
    expect(src).toContain("<SheetGroupItem");
    expect(src).toContain("accountSheetGroupedRows");
    expect(src).not.toContain("<TextAction");
    expect(settingsClass).toBe(SHEET_GROUP_INSET_ITEM_CLASS);
    expect(settingsClass).toContain("px-[var(--space-4)]");
    expect(settingsClass).toContain("py-[var(--space-3)]");
    expect(attrClass(html, "data-sheet-group-inset")).toContain("rounded-[var(--radius-lg)]");
    expect(attrClass(html, "data-sheet-group-inset")).toContain("bg-surface-muted");
    expect(attrClass(html, "data-sheet-group-inset")).toContain("border-hairline");
    expect(attrClass(html, "data-sheet-group-inset")).not.toContain("gap-");
    expect(html).not.toContain("data-account-menu-workspace-mode");
    expect(html).not.toContain("Aggregation");
    expect(html).not.toContain("data-account-menu-workspace-flyout");
    expect(html).not.toContain("Education");
    expect(settingsClass).toContain("text-[length:var(--text-base)]");
    expect(settingsClass).toContain("font-normal");
    expect(settingsClass).toContain("text-ink");
    expect(settingsClass).not.toContain("t-body-sm");
    expect(settingsClass).not.toContain("text-accent");
    expect(logOutClass).toBe(ACCOUNT_SHEET_LOGOUT_CLASS);
    expect(logOutClass).toContain("text-accent");
    expect(logOutClass).not.toContain("text-ink ");
    expect(logOutClass).not.toContain("rounded-");
    expect(logOutClass).not.toContain("bg-surface-muted");
    const logOutCard = html.slice(html.indexOf('data-sheet-group-id="logOut"'));
    expect(logOutCard.indexOf('data-sheet-group-item="logOut"')).toBeGreaterThan(0);
    expect(logOutCard.slice(0, logOutCard.indexOf('data-sheet-group-item="logOut"'))).toContain(
      "data-sheet-group-inset",
    );
    expect(html).toContain(SHEET_GROUP_CHEVRON_CLASS);
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('viewBox="0 0 256 256"');
    expect(html).not.toContain("stroke-width");
    expect(html).not.toContain("lucide-");
    expect(html).not.toContain("ThemeGlyph");
    expect(html).not.toContain("data-account-menu-appearance-mode");
    expect(html).not.toContain("data-account-menu-appearance-flyout");
    expect(html).not.toContain("data-account-sheet-appearance-stack");
    expect(html).not.toContain("data-account-sheet-appearance-flyout-host");
    expect(html).not.toContain("System default");
    expect(html).not.toContain("Dark");
    expect(html).not.toContain("Auto");
  });

  it("opens Settings on the universal hub from every workspace", () => {
    for (const path of ["/", "/social", "/education", "/help", "/settings/profile"]) {
      const html = renderSheet("ada@example.com", null, null, path);
      expect(html).toContain('data-sheet-group-item="settings"');
      expect(html).toContain('href="/settings"');
      expect(html).not.toContain('href="/settings/education"');
      expect(html).not.toContain('href="/settings/social"');
      expect(html).not.toContain('href="/settings/you"');
      expect(html).not.toContain('href="/settings/aggregation"');
    }
    expect(src).toContain("settingsLandHref(pathname)");
  });

  it("keeps Log out with the footer — leftover is 24 house air, hairline only under Log out", () => {
    const html = renderSheet();
    const scrollEnd = html.indexOf("data-account-sheet-scroll");
    const logout = html.indexOf('data-sheet-group-item="logOut"');
    const footerRule = html.indexOf("data-account-sheet-footer-rule");
    const footer = html.indexOf('data-account-sheet-footer=""');
    const version = html.indexOf("data-account-sheet-version");
    const legal = html.indexOf("data-account-sheet-legal");
    const pinClass = attrClass(html, "data-account-sheet-pin");
    const scrollClass = attrClass(html, "data-account-sheet-scroll");
    const leftoverClass = attrClass(html, "data-account-sheet-leftover");
    const stageClass = attrClass(html, "data-account-sheet-stage");
    const groupEnd = html.indexOf("</div>", html.indexOf('data-sheet-group-item="settings"'));

    expect(html).not.toContain("data-account-sheet-logout-rule");
    expect(logout).toBeGreaterThan(scrollEnd);
    expect(footerRule).toBeGreaterThan(logout);
    expect(footer).toBeGreaterThan(footerRule);
    expect(version).toBeGreaterThan(footer);
    expect(legal).toBe(-1);
    expect(groupEnd).toBeGreaterThan(-1);
    expect(groupEnd).toBeLessThan(logout);
    expect(html.slice(html.indexOf("data-account-sheet-scroll"), logout)).not.toContain("Log out");
    expect(html.slice(html.indexOf("data-account-sheet-scroll"), logout)).not.toContain("v0.1.0");
    expect(scrollClass).not.toContain("flex-1");
    expect(scrollClass).toContain("min-h-0");
    expect(scrollClass).not.toContain("min-h-[var(--space-12)]");
    expect(scrollClass).toContain("overflow-y-auto");
    expect(scrollClass).toContain("overscroll-contain");
    expect(leftoverClass).toBe(ACCOUNT_SHEET_LEFTOVER_CLASS);
    expect(leftoverClass).toContain("h-[var(--space-6)]");
    expect(leftoverClass).not.toContain("h-[var(--space-12)]");
    expect(leftoverClass).toContain("shrink-0");
    expect(leftoverClass).not.toContain("flex-1");
    expect(leftoverClass).not.toContain("h-[48px]");
    expect(stageClass).toBe(ACCOUNT_SHEET_STAGE_CLASS);
    expect(stageClass).toContain("gap-[var(--space-6)]");
    expect(stageClass).not.toContain("flex-1");
    expect(attrClass(html, "data-account-sheet-surface")).toContain("overflow-hidden");
    expect(attrClass(html, "data-account-sheet-surface")).not.toContain("overflow-y-auto");
    expect(attrClass(html, "data-account-sheet-surface")).toContain("h-auto");
    expect(attrClass(html, "data-account-sheet-surface")).toContain("max-h-[90vh]");
    expect(attrClass(html, "data-account-sheet-surface").split(" ")).not.toContain("h-[90vh]");
    expect(attrClass(html, "data-account-sheet-surface")).not.toContain("gap-[var(--space-6)]");
    expect(pinClass).toBe(ACCOUNT_SHEET_PIN_CLASS);
    expect(pinClass).toContain("gap-[var(--space-4)]");
    expect(pinClass).not.toContain("gap-[var(--space-6)]");
    expect(pinClass).not.toContain("gap-[var(--space-12)]");
    expect(attrClass(html, "data-account-sheet-surface")).toContain("p-[var(--space-4)]");
    expect(attrClass(html, "data-account-sheet-surface")).not.toContain("pb-[var(--space-12)]");
    const lastItem = html.indexOf('data-sheet-group-item="help"');
    const betweenLastItemAndLogout = html.slice(lastItem, logout);
    expect(betweenLastItemAndLogout).toContain("data-account-sheet-leftover");
    expect(betweenLastItemAndLogout).not.toContain("data-account-menu-leftover");
    expect(betweenLastItemAndLogout).not.toContain("data-account-sheet-footer-rule");
    expect(betweenLastItemAndLogout).not.toContain("bg-hairline");
    expect(html.slice(logout, footer)).toContain("data-account-sheet-footer-rule");
    const logoutStack = html.slice(
      html.indexOf("data-account-sheet-logout-stack"),
      html.indexOf("</div>", html.indexOf("data-account-sheet-logout-stack")),
    );
    expect(logoutStack).toContain("logOut");
    expect(logoutStack).not.toContain("data-account-sheet-footer-rule");
    expect(logoutStack).not.toContain("bg-hairline");
    expect(src).toContain('data-account-sheet-pin=""');
    expect(src).toContain("<AccountMenuPin");
    expect(src.slice(
      src.indexOf("function AccountMenuLogOut"),
      src.indexOf("function AccountMenuPin"),
    )).not.toContain("AppSheetHairline");
    expect(src.slice(
      src.indexOf("function AccountMenuPin"),
      src.indexOf("function AccountMenuGroups"),
    )).toContain("AppSheetHairline");
    expect(src).not.toContain("data-account-sheet-logout-rule");
    expect(src).toContain("571:911 stays off");
    expect(src).toContain("618:785 overlay");
    expect(src).toContain("is void");
    expect(src).toContain("Log out → hairline 16");
    expect(src).toContain("Hairline → footer 16");
    expect(src).toContain("Footer → bottom 32");
    expect(src).toContain("Refer cannot paint over Log out");
    expect(src).not.toContain("Log out → hairline 48");
    expect(src).not.toContain("Footer → bottom 48");
    expect(html).toContain(userMenuVersion());
    expect(html).toContain(">v0.1.0<");
    expect(html).not.toContain("Legal");
    expect(html).not.toContain("globalcontent.co");
    expect(html).not.toContain("data-account-sheet-legal");
    expect(src).not.toContain("USER_MENU.legal");
    expect(src).not.toContain("globalcontent.co");
    expect(src).not.toContain("<TextAction");
    expect(src.match(/target="_blank"/g)?.length ?? 0).toBe(0);
    expect(attrClass(html, "data-account-sheet-version")).toBe(ACCOUNT_SHEET_VERSION_CLASS);
    expect(attrClass(html, "data-account-sheet-version")).toContain("leading-4");
    expect(attrClass(html, "data-account-sheet-version")).toContain("text-ink-3");
  });

  it("keeps the last item and Log out as separate rows — leftover is 24, pin does not stack", () => {
    const html = renderSheet();
    const scrollClass = attrClass(html, "data-account-sheet-scroll");
    const leftoverClass = attrClass(html, "data-account-sheet-leftover");
    const surfaceClass = attrClass(html, "data-account-sheet-surface");
    const pinClass = attrClass(html, "data-account-sheet-pin");
    const lastItem = html.indexOf('data-sheet-group-item="help"');
    const logout = html.indexOf('data-sheet-group-item="logOut"');
    const scroll = html.indexOf("data-account-sheet-scroll");
    const leftover = html.indexOf("data-account-sheet-leftover");
    const pin = html.indexOf("data-account-sheet-pin");
    const betweenLastItemAndLogout = html.slice(lastItem, logout);

    expect(lastItem).toBeGreaterThan(-1);
    expect(logout).toBeGreaterThan(lastItem);
    expect(leftover).toBeGreaterThan(scroll);
    expect(pin).toBeGreaterThan(leftover);
    expect(html.slice(scroll, leftover)).toContain("Settings");
    expect(html.slice(scroll, leftover)).not.toContain("Appearance");
    expect(html.slice(scroll, leftover)).toContain("Get Help");
    expect(html.slice(scroll, pin)).not.toContain("Log out");
    expect(html.slice(pin)).toContain("Log out");
    expect(betweenLastItemAndLogout).toContain("data-account-sheet-leftover");
    expect(betweenLastItemAndLogout).not.toContain("data-account-sheet-footer-rule");
    expect(scrollClass).toBe(ACCOUNT_SHEET_SCROLL_CLASS);
    expect(scrollClass).toContain("overflow-y-auto");
    expect(scrollClass).not.toContain("flex-1");
    expect(leftoverClass).toBe(ACCOUNT_SHEET_LEFTOVER_CLASS);
    expect(leftoverClass).toContain("shrink-0");
    expect(leftoverClass).not.toContain("flex-1");
    expect(surfaceClass).toContain("overflow-hidden");
    expect(surfaceClass).not.toContain("overflow-y-auto");
    expect(surfaceClass.split(" ")).not.toContain("h-[90dvh]");
    expect(pinClass).toBe(ACCOUNT_SHEET_PIN_CLASS);
    expect(pinClass).toContain("shrink-0");
    expect(src).toContain("house nav destinations");
    expect(src).toContain("Refer cannot paint over Log out");
  });

  it("does not dump the rail, 24Frame AI chrome, or Adobe leftovers", () => {
    const html = renderSheet();
    for (const item of [...NAV, ...GC_NAV]) {
      expect(html).not.toContain(item.label);
      if (item.href !== "/") expect(html).not.toContain(`href="${item.href}"`);
    }
    for (const absent of ACCOUNT_SHEET_ABSENT) {
      expect(html).not.toContain(absent);
    }
    expect(html).not.toContain(MOBILE_NAV.sheet);
    expect(html).not.toContain("data-mobile-nav-sheet");
    expect(html).not.toContain("data-ask-frame-ai");
    expect(html).not.toContain("MoreHorizontal");
    expect(html).not.toContain("grid-cols");
    expect(html).not.toContain("credits");
    expect(src).not.toContain("ThemeGlyph");
    expect(src).not.toContain("onUserMenuAppearance");
    expect(src).not.toContain("/account/appearance");
    expect(src).not.toContain("type=\"radio\"");
  });

  it("drills phone Theme to the shared picker with the stored value", () => {
    const sheet = renderSheet();

    expect(sheet).toContain("data-identity-block");
    expect(sheet).toContain("data-account-sheet-close");
    expect(sheet).not.toContain('data-sheet-group-item="profile"');
    expect(sheet).toContain('data-sheet-group-item="settings"');
    expect(sheet).not.toContain('data-sheet-group-item="askAssistant"');
    expect(sheet).not.toContain('data-sheet-group-item="appearance"');
    expect(sheet).toContain('data-account-menu-face="main"');
    expect(sheet).not.toContain('data-sheet-group-item="back"');
    expect(sheet).not.toContain('data-sheet-group-item="light"');
    expect(sheet).not.toContain("data-account-menu-appearance-flyout");
    expect(sheet).not.toContain("/account/appearance");
    expect(src).not.toContain("AccountSheetAppearance");
    expect(src).not.toContain("AccountBackChevron");
    expect(src).not.toContain("CaretLeft");
    expect(src).not.toContain("APPEARANCE.back");
    expect(sheet).not.toContain("data-account-menu-theme-switch");
    expect(sheet).not.toContain('role="switch"');
    expect(sheet).toContain('href="/settings/preferences/theme"');
    expect(sheet).not.toContain('href="/settings/theme"');
    expect(sheet).toContain("data-account-sheet-theme-value");
    expect(sheet).toContain(">Light<");
    expect(attrClass(sheet, 'data-sheet-group-item="theme"')).toContain("min-h-11");
    expect(attrClass(sheet, 'data-sheet-group-item="settings"')).not.toContain("min-h-11");
    expect(src).not.toContain("AppearanceCheck");
    expect(src).not.toContain("ACCOUNT_SHEET_APPEARANCE_COPY_CLASS");
    expect(src).not.toContain("AccountAppearanceFlyout");
    expect(src).not.toContain("Back to main menu");
    expect(src).toContain("618:785 overlay is void");
    expect(src).not.toContain("w-[342px]");
    expect(sheet).toContain("Log out");
    expect(sheet).not.toContain("System default");
    expect(sheet).not.toContain("data-appearance-check");
    expect(sheet).not.toContain('type="radio"');
    expect(sheet).not.toContain("purple");
  });

  it("does not restyle 24Frame AI landing or merge account into dest chips", () => {
    expect(headerSrc).toContain("531:542");
    expect(headerSrc).not.toContain("544:561");
    expect(headerSrc).not.toContain("account-sheet");
    expect(landingSrc).not.toContain("account-sheet");
    expect(landingSrc).not.toContain("AccountSheet");
    expect(landingSrc).not.toContain("544:561");
    expect(destsSrc).toContain("data-house-phone-bottom-nav");
    expect(destsSrc).not.toContain("data-mobile-nav-sheet");
    expect(destsSrc).not.toContain("AppSheetSurface");
    expect(destsSrc).not.toContain("Close44");
    expect(destsSrc).not.toContain("ACCOUNT");
    expect(destsSrc).not.toContain("Manage account");
    expect(destsSrc).not.toContain("User Profile");
    expect(destsSrc).not.toContain("Company Profile");
    expect(menuSrc).toContain("MobileAccountMenu");
    expect(menuSrc).toContain("DesktopAccountMenu");
    expect(src).not.toContain("531:542");
    expect(src).not.toContain("462:502");
  });
});

describe("AccountMenuDropdown Coinbase grammar", () => {
  it("hugs a 280 panel with a full-width blue bar and no leftover sheet air", () => {
    const html = renderDropdown("ada@example.com", "Ada Lovelace");
    const hostClass = attrClass(html, 'data-user-menu-desktop-panel=""');
    const surfaceClass = attrClass(html, "data-user-menu-desktop-surface");
    const dismissClass = attrClass(html, "data-user-menu-desktop-dismiss");
    const accentClass = attrClass(html, "data-account-menu-accent");

    expect(html).toContain("data-user-menu-desktop-panel");
    expect(html).toContain("data-user-menu-desktop-surface");
    expect(html).not.toContain("data-account-sheet=\"\"");
    expect(html).not.toContain("data-account-sheet-scrim");
    expect(html).not.toContain("data-account-menu-leftover");
    expect(html).not.toContain("data-sheet-group");
    expect(hostClass).toBe(ACCOUNT_MENU_DROPDOWN_HOST_CLASS);
    expect(hostClass).not.toContain("justify-end");
    expect(hostClass).not.toContain("h-dvh");
    expect(dismissClass).toBe(ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS);
    expect(dismissClass).not.toContain("bg-ink");
    expect(dismissClass).not.toContain(APP_SHEET_SCRIM_FADE_CLASS);
    expect(surfaceClass).toBe(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS);
    expect(surfaceClass).toContain("h-auto");
    expect(surfaceClass).toContain("w-[280px]");
    expect(surfaceClass).toContain("rounded-[12px]");
    expect(surfaceClass).toContain("border-hairline");
    expect(surfaceClass).toContain("bg-surface");
    expect(surfaceClass).toContain("shadow-none");
    expect(surfaceClass).not.toContain("p-[var(--space-2)]");
    expect(surfaceClass).toContain("overflow-hidden");
    expect(surfaceClass).not.toContain("px-");
    expect(surfaceClass).not.toContain("w-[264px]");
    expect(surfaceClass).not.toContain("h-[90dvh]");
    expect(surfaceClass).not.toContain(APP_SHEET_RISE_CLASS);
    expect(accentClass).toBe(ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS);
    expect(accentClass).toContain("h-[4px]");
    expect(accentClass).toContain("w-full");
    expect(accentClass).toContain("bg-accent");
    expect(accentClass).not.toContain("w-1/2");
    expect(html).not.toContain("data-menu-surface-accent");
    expect(html).toContain('data-account-menu-align="end"');
    expect(src).toContain("accountMenuDropdownAlignEnd");
    expect(src).toContain("useDesktopAccountMenuAlignEnd");
    expect(src).toContain("useAccountMenuDismiss(onClose, false)");
    expect(src).toContain("useHousePathname()");
    expect(html).toContain(`${ACCOUNT_MENU_ROOT_ATTR}=""`);
    expect(renderSheet()).toContain(`${ACCOUNT_MENU_ROOT_ATTR}=""`);
    expect(renderSheet()).toContain("data-menu-surface-accent");
    expect(renderSheet()).toContain("data-sheet-group");
  });

  it("puts a horizontal identity under the bar: avatar 40, name, email, Manage account", () => {
    const html = renderDropdown("ada@example.com", "Ada Lovelace");
    const long = renderDropdown(
      "very.long.local-part@studio.example.com",
      "Ada King-Noel Lovelace Byron",
    );
    const head = html.slice(
      html.indexOf("data-account-menu-head"),
      html.indexOf("data-account-menu-head-rule"),
    );
    const headClass = attrClass(html, 'data-account-menu-head=""');
    const nameClass = attrClass(html, "data-identity-name");
    const emailClass = attrClass(html, "data-identity-email");
    const avatarClass = attrClass(html, "data-identity-avatar");
    const manageClass = attrClass(html, "data-account-menu-manage");

    expect(html).not.toContain("data-account-sheet-close");
    expect(head).not.toContain("Close account");
    expect(head).not.toContain("data-identity-block");
    expect(head).toContain("Ada Lovelace");
    expect(head).toContain("ada@example.com");
    expect(head).toContain(USER_MENU.manageAccount);
    expect(headClass).toContain("items-center");
    expect(headClass).toContain("gap-[var(--space-3)]");
    expect(headClass).not.toContain("flex-col");
    expect(nameClass).toContain("truncate");
    expect(nameClass).toContain("font-medium");
    expect(nameClass).toContain("text-ink");
    expect(emailClass).toContain("truncate");
    expect(emailClass).toContain("text-ink-2");
    expect(avatarClass).toContain("size-10");
    expect(avatarClass).not.toContain("size-14");
    expect(manageClass).toContain("text-accent");
    expect(html).toContain('href="/settings/profile"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Adam Carpenter");
    expect(html).not.toContain("admin@ccbfg.com");
    expect(long).toContain("Ada King-Noel Lovelace Byron");
    expect(long).toContain("very.long.local-part@studio.example.com");
    expect(src).toContain("open ? closeMenu : openMenu");
    expect(src).toContain('variant="dropdown"');
    expect(src).toContain('variant="sheet"');
    expect(renderSheet("ada@example.com", "Ada Lovelace")).not.toContain("Manage account");
    expect(renderSheet("ada@example.com", "Ada Lovelace")).toContain("data-identity-block");
  });

  it("shows the signed face in the horizontal identity and keeps the initial when empty", () => {
    const withFace = renderDropdown(
      "ada@example.com",
      "Ada Lovelace",
      "https://s3.example/signed-avatar",
    );
    const empty = renderDropdown("ada@example.com", "Ada Lovelace");

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace).toContain("data-identity-photo");
    expect(withFace).not.toContain(">A<");
    expect(empty).toContain(">A<");
    expect(empty).not.toContain("<img");
  });

  it("paints flat rows — chevron only on Theme, danger Log out, version footer", () => {
    const html = renderDropdown();
    const settings = html.indexOf('data-account-menu-row="settings"');
    const theme = html.indexOf('data-account-menu-row="theme"');
    const help = html.indexOf('data-account-menu-row="help"');
    const logout = html.indexOf('data-account-menu-row="logOut"');
    const version = html.indexOf("data-account-menu-version");
    const headRule = html.indexOf("data-account-menu-head-rule");

    expect(html).not.toContain("data-account-sheet-pin");
    expect(html).not.toContain("data-sheet-group");
    expect(html).not.toContain("data-account-menu-leftover");
    expect(settings).toBeGreaterThan(headRule);
    expect(theme).toBeGreaterThan(settings);
    expect(help).toBeGreaterThan(theme);
    expect(logout).toBeGreaterThan(help);
    expect(version).toBeGreaterThan(logout);
    expect(attrClass(html, 'data-account-menu-row="settings"')).toBe(ACCOUNT_MENU_DROPDOWN_ROW_CLASS);
    expect(attrClass(html, 'data-account-menu-row="theme"')).toBe(ACCOUNT_MENU_DROPDOWN_ROW_CLASS);
    expect(attrClass(html, 'data-account-menu-row="help"')).toBe(ACCOUNT_MENU_DROPDOWN_ROW_CLASS);
    expect(attrClass(html, 'data-account-menu-row="logOut"')).toBe(ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS);
    expect(attrClass(html, 'data-account-menu-row="logOut"')).toContain("text-[#c4564a]");
    expect(attrClass(html, 'data-account-menu-row="logOut"')).not.toContain("text-accent");
    expect(attrClass(html, "data-account-menu-version")).toBe(ACCOUNT_MENU_DROPDOWN_VERSION_CLASS);
    expect(html).toContain('href="/settings"');
    expect(html).toContain('href="/settings/preferences/theme"');
    expect(html).not.toContain('href="/settings/theme"');
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain("data-account-menu-theme-switch");
    const themeRow = html.slice(theme, help);
    const settingsRow = html.slice(settings, theme);
    const helpRow = html.slice(help, logout);
    const logoutRow = html.slice(logout, version);
    expect(themeRow).toContain(SHEET_GROUP_CHEVRON_CLASS);
    expect(themeRow).toContain("data-account-menu-theme-value");
    expect(themeRow).toContain("Light");
    expect(themeRow).toContain("t-body");
    expect(settingsRow).not.toContain(SHEET_GROUP_CHEVRON_CLASS);
    expect(helpRow).not.toContain(SHEET_GROUP_CHEVRON_CLASS);
    expect(logoutRow).not.toContain(SHEET_GROUP_CHEVRON_CLASS);
    expect(html).toContain(">v0.1.0<");
    expect(html).not.toContain("Workspace");
    expect(html).not.toContain(">Profile<");
    expect(html).not.toContain("Appearance");
    expect(html).not.toContain("Agreements");
    expect(html).not.toContain("Give feedback");
    expect(html).not.toContain("Refer a friend");
    expect(html).not.toContain("Legal");
    expect(html).not.toContain("data-account-sheet-footer-rule");
    expect(html.match(/data-account-menu-head-rule/g)).toHaveLength(1);
    expect(renderSheet()).toContain('data-sheet-group-id="logOut"');
    expect(renderSheet()).toContain("text-accent");
    expect(renderSheet()).not.toContain("data-account-menu-theme-switch");
  });

  it("keeps the full-width Sporty Blue bar and does not open a theme flyout", () => {
    const main = renderDropdown();
    const accent = attrClass(main, "data-account-menu-accent");

    expect(main).not.toContain("data-menu-surface-accent");
    expect(accent).toContain("h-[4px]");
    expect(accent).toContain("w-full");
    expect(accent).toContain("bg-accent");
    expect(accent).not.toContain("w-1/2");
    expect(accent).not.toContain("#1769");
    expect(main).not.toContain("data-identity-block");
    expect(main).toContain('data-account-menu-row="settings"');
    expect(main).not.toContain("data-account-sheet-close");
    expect(main).not.toContain("data-account-menu-appearance-flyout");
    expect(main).not.toContain("System default");
    expect(main).not.toContain("Appearance");
    expect(main).not.toContain("purple");
    expect(main).not.toContain("violet");
    expect(src).not.toContain("accountMenuAppearanceFlyoutAlign");
    expect(src).not.toContain("AccountAppearanceFlyout");
    expect(src).toContain("<MenuSurfaceAccent");
    expect(renderSheet()).toContain("w-1/2");
  });

  it("opens from the desktop avatar and does not reuse the 90% sheet", () => {
    const html = renderToStaticMarkup(<DesktopAccountMenu email="nina@studio.com" />);
    expect(html).toContain("data-user-menu-desktop");
    expect(html).toContain("data-user-menu-trigger");
    expect(html).toContain("hidden md:block");
    expect(html).toContain(">N<");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data-user-menu-desktop-panel");
    expect(html).not.toContain("data-account-sheet=\"\"");
    expect(src).toContain("<AccountMenuDropdown");
    expect(src).toContain("DesktopAccountMenu");
    const desktop = src.slice(src.indexOf("export function DesktopAccountMenu"));
    expect(desktop).toContain("<AccountMenuDropdown");
    expect(desktop.slice(0, desktop.indexOf("export function AccountSheet"))).not.toContain(
      "<AccountSheet",
    );
  });

  it("shows the signed face on the desktop 32 trigger and keeps the initial when empty", () => {
    const withFace = renderToStaticMarkup(
      <DesktopAccountMenu email="nina@studio.com" photoUrl="https://s3.example/signed-avatar" />,
    );
    const empty = renderToStaticMarkup(<DesktopAccountMenu email="nina@studio.com" />);

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace).toContain("overflow-hidden");
    expect(withFace).not.toContain(">N<");
    expect(empty).toContain(">N<");
    expect(empty).not.toContain("<img");
  });

  it("applies align-end so the 280 right edge is flush to the avatar", () => {
    const html = renderToStaticMarkup(
      <AccountMenuDropdown
        email="ada@example.com"
        pathname="/"
        onClose={() => undefined}
        alignEnd={{ top: "calc(44px + var(--space-2))", right: "16px" }}
      />,
    );
    const surface = tagWith(html, "data-user-menu-desktop-surface");

    expect(html).toContain('data-account-menu-align="end"');
    expect(surface).toContain("calc(44px + var(--space-2))");
    expect(surface).toContain("16px");
    expect(surface).not.toContain("--header-height");
    expect(surface).not.toContain("--content-inset");
  });
});
