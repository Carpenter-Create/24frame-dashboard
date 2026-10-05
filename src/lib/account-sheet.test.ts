import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { USER_MENU, USER_MENU_ACTIONS, USER_MENU_PHONE_ACTIONS } from "@/lib/user-menu";
import { APP_SHEET_CHROME_CLASS, APP_SHEET_HOST_CLASS, APP_SHEET_RISE_CLASS } from "@/lib/house-sheet";
import { ASSISTANT_NAME } from "@/lib/product";
import * as accountSheet from "./account-sheet";
import {
  ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS,
  ACCOUNT_MENU_DROPDOWN_ALIGN,
  ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS,
  ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS,
  ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS,
  ACCOUNT_MENU_DROPDOWN_FOOTER_CLASS,
  ACCOUNT_MENU_DROPDOWN_GAP,
  ACCOUNT_SHEET_GROUP_CLASS,
  ACCOUNT_SHEET_GROUPS,
  accountSheetGroupedRows,
  ACCOUNT_MENU_DROPDOWN_HEAD_CLASS,
  ACCOUNT_MENU_DROPDOWN_HOST_CLASS,
  ACCOUNT_MENU_DROPDOWN_ICON_CLASS,
  ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS,
  ACCOUNT_MENU_DROPDOWN_MANAGE_CLASS,
  ACCOUNT_MENU_DROPDOWN_NAME_CLASS,
  ACCOUNT_MENU_DROPDOWN_ROW_CLASS,
  ACCOUNT_MENU_DROPDOWN_ROWS_CLASS,
  ACCOUNT_MENU_THEME_CHEVRON_CLASS,
  ACCOUNT_MENU_THEME_LABEL_CLASS,
  ACCOUNT_MENU_THEME_TRAILING_CLASS,
  ACCOUNT_MENU_THEME_VALUE_CLASS,
  ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS,
  ACCOUNT_MENU_DROPDOWN_VERSION_CLASS,
  ACCOUNT_MENU_DROPDOWN_WIDTH,
  accountMenuDropdownAlignEnd,
  ACCOUNT_SHEET,
  ACCOUNT_SHEET_ABSENT,
  ACCOUNT_SHEET_FOOTER_CLASS,
  ACCOUNT_SHEET_HEAD_CLASS,
  ACCOUNT_SHEET_HOST_CLASS,
  ACCOUNT_SHEET_ITEMS,
  ACCOUNT_SHEET_PHONE_ITEMS,
  ACCOUNT_SHEET_LEFTOVER,
  ACCOUNT_SHEET_LEFTOVER_CLASS,
  ACCOUNT_SHEET_LOGOUT_CLASS,
  ACCOUNT_SHEET_LOGOUT_STACK_CLASS,
  ACCOUNT_SHEET_PIN_CLASS,
  ACCOUNT_SHEET_SCROLL_CLASS,
  ACCOUNT_SHEET_STAGE_CLASS,
  ACCOUNT_SHEET_SURFACE_CLASS,
  ACCOUNT_SHEET_VERSION_CLASS,
  ACCOUNT_MENU_ROOT_ATTR,
  accountMenuDestinationClick,
  accountSheetIdentity,
  destinationClickClosesSheet,
} from "./account-sheet";

describe("account sheet lock", () => {
  it("uses the same Settings — Theme — Get Help stack on desktop and the phone sheet", () => {
    expect(ACCOUNT_SHEET_ITEMS).toBe(USER_MENU_ACTIONS);
    expect(ACCOUNT_SHEET_PHONE_ITEMS).toBe(USER_MENU_PHONE_ACTIONS);
    expect(ACCOUNT_SHEET_PHONE_ITEMS).toBe(ACCOUNT_SHEET_ITEMS);
    expect(ACCOUNT_SHEET_ITEMS.map((item) => item.kind)).toEqual(["settings", "theme", "help"]);
    expect(ACCOUNT_SHEET_ITEMS.map((item) => item.label)).toEqual(["Settings", "Theme", "Get Help"]);
    expect(ACCOUNT_SHEET_PHONE_ITEMS.map((item) => item.kind)).toEqual(["settings", "theme", "help"]);
    expect(ACCOUNT_SHEET_PHONE_ITEMS.map((item) => item.kind)).not.toContain("appearance");
    expect(ACCOUNT_SHEET_PHONE_ITEMS.map((item) => item.label)).not.toContain("Appearance");
    expect(ACCOUNT_SHEET_ITEMS[0]?.kind).toBe("settings");
    expect(ACCOUNT_SHEET_ITEMS.map((item) => item.kind)).not.toContain("profile");
    expect(ACCOUNT_SHEET_ITEMS.map((item) => item.kind)).not.toContain("workspace");
    expect(ACCOUNT_SHEET_PHONE_ITEMS.map((item) => item.kind)).not.toContain("askAssistant");
    expect(ACCOUNT_SHEET_PHONE_ITEMS.map((item) => item.label)).not.toContain(ASSISTANT_NAME);
  });

  it("shares one inset grouping SoT — Settings + Theme, Get Help alone", () => {
    expect(ACCOUNT_SHEET_GROUPS.map((group) => group.id)).toEqual(["preferences", "help"]);
    expect(ACCOUNT_SHEET_GROUPS.map((group) => [...group.kinds])).toEqual([
      ["settings", "theme"],
      ["help"],
    ]);
    const desktop = accountSheetGroupedRows(ACCOUNT_SHEET_ITEMS);
    const phone = accountSheetGroupedRows(ACCOUNT_SHEET_PHONE_ITEMS);
    expect(phone).toEqual(desktop);
    expect(desktop.map((group) => group.items.map((item) => item.kind))).toEqual([
      ["settings", "theme"],
      ["help"],
    ]);
    expect(desktop.flatMap((group) => group.items.map((item) => item.kind))).not.toContain("profile");
    expect(desktop.flatMap((group) => group.items.map((item) => item.kind))).not.toContain("logOut");
  });

  it("wires Theme to /settings/preferences/theme — the Preferences nest", () => {
    const hrefs = ACCOUNT_SHEET_ITEMS.flatMap((item) => ("href" in item ? [item.href] : []));
    expect(hrefs).toEqual([USER_MENU.settingsHref, USER_MENU.themeHref, USER_MENU.helpHref]);
    expect(USER_MENU).not.toHaveProperty("appearanceHref");
    expect(hrefs).not.toContain("/account/appearance");
    expect(hrefs).toContain("/settings/preferences/theme");
    expect(hrefs).not.toContain("/settings/theme");
    expect(hrefs).not.toContain("/settings/appearance");
    expect(ACCOUNT_SHEET_PHONE_ITEMS.flatMap((item) => ("href" in item ? [item.href] : []))).toEqual([
      USER_MENU.settingsHref,
      USER_MENU.themeHref,
      USER_MENU.helpHref,
    ]);
    expect(USER_MENU).not.toHaveProperty("askAssistantHref");
    expect(hrefs).not.toContain("/account/company");
    expect(hrefs.join(" ")).not.toMatch(/notifications|phone|job/i);
    expect(hrefs).not.toContain("/settings/profile");
    expect(hrefs).toContain("/settings");
    expect(hrefs).toContain("/help");
    expect(hrefs).not.toContain("/help/feedback");
    expect(hrefs).not.toContain("/account/feedback");
    expect(hrefs).not.toContain("/account/profile");
    expect(hrefs.join(" ")).not.toContain("globalcontent.co");
  });

  it("does not dump the rail, Company, Phone, Job, or Adobe leftovers into the sheet", () => {
    const labels = ACCOUNT_SHEET_ITEMS.map((item) => item.label);
    expect(labels).not.toContain("Manage account");
    expect(ACCOUNT_SHEET).not.toHaveProperty("manage");
    expect(ACCOUNT_SHEET).not.toHaveProperty("group");
    for (const absent of ACCOUNT_SHEET_ABSENT) {
      expect(labels).not.toContain(absent);
    }
  });

  it("locks the phone account surface to shared AppSheet chrome — pad 16, hug", () => {
    expect(ACCOUNT_SHEET_HOST_CLASS).toBe(APP_SHEET_HOST_CLASS);
    expect(ACCOUNT_SHEET_HOST_CLASS).toContain("justify-end");
    expect(ACCOUNT_SHEET_HOST_CLASS).toContain("flex-col");
    expect(ACCOUNT_SHEET_HOST_CLASS).toContain("w-full");
    expect(ACCOUNT_SHEET_HOST_CLASS.split(" ")).not.toContain("items-end");
    expect(ACCOUNT_SHEET_HOST_CLASS).not.toContain("md:flex-row");
    expect(ACCOUNT_SHEET_HOST_CLASS).not.toContain("md:items-end");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toBe(
      `${APP_SHEET_CHROME_CLASS} account-sheet-surface relative z-10 h-auto overflow-hidden`,
    );
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("w-full");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain(APP_SHEET_RISE_CLASS);
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("h-auto");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("max-h-[90vh]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("p-[var(--space-4)]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("rounded-t-[16px]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("shadow-none");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("gap-[var(--space-6)]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("px-[var(--space-6)]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("pb-[var(--space-8)]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("pb-[var(--space-12)]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("pt-[calc(4px+var(--space-8))]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("app-sheet-rise");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("md:w-[390px]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("w-[264px]");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("w-[277px]");
    expect(ACCOUNT_SHEET_HEAD_CLASS).toContain("min-h-12");
    expect(ACCOUNT_SHEET_HEAD_CLASS).toContain("justify-between");
    expect(ACCOUNT_SHEET_HEAD_CLASS).toContain("items-center");
    expect(ACCOUNT_SHEET_STAGE_CLASS).toContain("gap-[var(--space-6)]");
    expect(ACCOUNT_SHEET_STAGE_CLASS).toContain("min-h-0");
    expect(ACCOUNT_SHEET_STAGE_CLASS).not.toContain("flex-1");
    expect(ACCOUNT_SHEET_SCROLL_CLASS).not.toContain("flex-1");
    expect(ACCOUNT_SHEET_SCROLL_CLASS).toContain("min-h-0");
    expect(ACCOUNT_SHEET_SCROLL_CLASS).not.toContain("min-h-[var(--space-12)]");
    expect(ACCOUNT_SHEET_SCROLL_CLASS).toContain("overflow-y-auto");
    expect(ACCOUNT_SHEET_SCROLL_CLASS).toContain("overscroll-contain");
    expect(ACCOUNT_SHEET_LEFTOVER).toBe(24);
    expect(ACCOUNT_SHEET_LEFTOVER).toBe(24);
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).toContain("h-[var(--space-6)]");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).not.toContain("h-[var(--space-12)]");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).toContain("shrink-0");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).not.toContain("flex-1");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).not.toContain("h-[48px]");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).not.toContain("h-[24px]");
    expect(ACCOUNT_SHEET_LEFTOVER_CLASS).not.toMatch(/h-\[\d+px\]/);
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain("overflow-hidden");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).not.toContain("overflow-y-auto");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).toContain("text-accent");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).not.toContain("text-ink");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).toContain("px-[var(--space-4)]");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).toContain("py-[var(--space-3)]");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).not.toContain("rounded-");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).not.toContain("bg-surface-muted");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).not.toContain("border-");
    expect(ACCOUNT_SHEET_LOGOUT_CLASS).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(ACCOUNT_SHEET_PIN_CLASS).toContain("gap-[var(--space-4)]");
    expect(ACCOUNT_SHEET_PIN_CLASS).not.toContain("gap-[var(--space-6)]");
    expect(ACCOUNT_SHEET_PIN_CLASS).not.toContain("gap-[var(--space-12)]");
    expect(ACCOUNT_SHEET_PIN_CLASS).toContain("shrink-0");
    expect(ACCOUNT_SHEET_LOGOUT_STACK_CLASS).toBe("flex w-full shrink-0 flex-col");
    expect(ACCOUNT_SHEET_LOGOUT_STACK_CLASS).not.toContain("gap-");
    expect(ACCOUNT_SHEET_LOGOUT_STACK_CLASS).not.toContain("hairline");
  });

  it("locks the desktop MenuSurface to Coinbase grammar — 280, full blue bar, flat rows", () => {
    expect(ACCOUNT_MENU_DROPDOWN_WIDTH).toBe(280);
    expect(ACCOUNT_MENU_DROPDOWN_HOST_CLASS).toBe("fixed inset-0 z-50");
    expect(ACCOUNT_MENU_DROPDOWN_HOST_CLASS).not.toContain("justify-end");
    expect(ACCOUNT_MENU_DROPDOWN_HOST_CLASS).not.toContain("h-dvh");
    expect(ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS).toBe("absolute inset-0");
    expect(ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS).not.toContain("bg-ink");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toBe(
      "absolute z-10 flex h-auto w-[280px] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface shadow-none",
    );
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("h-auto");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("w-[280px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("w-[264px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toMatch(/h-\[\d+px\]/);
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("min-h");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("h-[522px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("h-[570px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("h-[672px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("min-h-[672px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("min-h-[426px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("min-h-[384px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("h-[384px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("w-[384px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("rounded-[12px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("border-hairline");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("bg-surface");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("shadow-none");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toMatch(/shadow-(?:sm|md|lg)|elevation/);
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("px-");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("pb-");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("pt-");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("p-[var(--space-2)]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).toContain("overflow-hidden");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("--header-height");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("--content-inset");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("w-[277px]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("h-[90dvh]");
    expect(ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS).not.toContain("app-sheet-rise");
    expect(ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS).toContain("h-[4px]");
    expect(ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS).toContain("w-full");
    expect(ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS).toContain("bg-accent");
    expect(ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS).not.toContain("w-1/2");
    expect(ACCOUNT_MENU_DROPDOWN_HEAD_CLASS).toContain("items-center");
    expect(ACCOUNT_MENU_DROPDOWN_HEAD_CLASS).toContain("gap-[var(--space-3)]");
    expect(ACCOUNT_MENU_DROPDOWN_HEAD_CLASS).toContain("p-[var(--space-4)]");
    expect(ACCOUNT_MENU_DROPDOWN_HEAD_CLASS).not.toContain("flex-col");
    expect(ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS).toContain("size-10");
    expect(ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS).not.toContain("size-14");
    expect(ACCOUNT_MENU_DROPDOWN_NAME_CLASS).toContain("text-[length:var(--text-base)]");
    expect(ACCOUNT_MENU_DROPDOWN_NAME_CLASS).toContain("font-medium");
    expect(ACCOUNT_MENU_DROPDOWN_NAME_CLASS).toContain("text-ink");
    expect(ACCOUNT_MENU_DROPDOWN_NAME_CLASS).toContain("truncate");
    expect(ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS).toContain("text-[length:var(--text-xs)]");
    expect(ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS).toContain("text-ink-2");
    expect(ACCOUNT_MENU_DROPDOWN_MANAGE_CLASS).toContain("text-accent");
    expect(USER_MENU.manageAccount).toBe("Manage account");
    expect(USER_MENU.profileHref).toBe("/settings/profile");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).toContain("min-h-11");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).toContain("px-[var(--space-4)]");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).toContain("gap-[var(--space-3)]");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).toContain("hover:bg-surface-muted");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).not.toContain("rounded");
    expect(ACCOUNT_MENU_DROPDOWN_ROW_CLASS).not.toContain("SheetGroup");
    expect(ACCOUNT_MENU_DROPDOWN_ROWS_CLASS).not.toContain("gap-");
    expect(ACCOUNT_MENU_DROPDOWN_ICON_CLASS).toBe("size-5 shrink-0");
    expect(ACCOUNT_MENU_THEME_LABEL_CLASS).toContain("t-body");
    expect(ACCOUNT_MENU_THEME_LABEL_CLASS).toContain("text-ink");
    expect(ACCOUNT_MENU_THEME_VALUE_CLASS).toBe("t-body-sm text-ink-3");
    expect(ACCOUNT_MENU_THEME_TRAILING_CLASS).toContain("gap-[var(--space-2)]");
    expect(ACCOUNT_MENU_THEME_TRAILING_CLASS).toContain("items-center");
    expect(ACCOUNT_MENU_THEME_CHEVRON_CLASS).toBe("size-4 shrink-0 text-ink-3");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_DROPDOWN_SWITCH_TRACK_CLASS");
    expect(ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS).toContain("text-[#c4564a]");
    expect(ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS).not.toContain("text-accent");
    expect(ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS).not.toContain("rounded");
    expect(ACCOUNT_MENU_DROPDOWN_FOOTER_CLASS).toContain("pb-[var(--space-3)]");
    expect(ACCOUNT_MENU_DROPDOWN_VERSION_CLASS).toContain("text-[length:var(--text-xs)]");
    expect(ACCOUNT_MENU_DROPDOWN_VERSION_CLASS).toContain("text-ink-2");
    expect(ACCOUNT_SHEET_GROUP_CLASS).toContain("gap-[var(--space-4)]");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_DROPDOWN_HEIGHT");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_DROPDOWN_LEFTOVER");
  });

  it("keeps theme off the avatar menu — Settings Preferences is the SoT", () => {
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_APPEARANCE_ROW_CLASS");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_SHEET_APPEARANCE_COPY_CLASS");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_APPEARANCE_WASH_CLASS");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_MENU_APPEARANCE_FLYOUT_CLASS");
    expect(accountSheet).not.toHaveProperty("accountMenuAppearanceFlyoutAlign");
    expect(accountSheet).not.toHaveProperty("accountMenuAppearanceFlyoutRight");
    expect(ACCOUNT_SHEET_ABSENT).not.toContain("Appearance");
  });

  it("docks the desktop menu align-end to the avatar with 8px under the trigger", () => {
    const trigger = { bottom: 44, right: 800 };
    const align = accountMenuDropdownAlignEnd(trigger, 1000);
    const menuRight = 1000 - Number.parseFloat(align.right);

    expect(ACCOUNT_MENU_DROPDOWN_ALIGN).toBe("end");
    expect(ACCOUNT_MENU_DROPDOWN_GAP).toBe("var(--space-2)");
    expect(align.top).toBe("calc(44px + var(--space-2))");
    expect(align.right).toBe("200px");
    expect(menuRight).toBe(trigger.right);
    expect(align.right).not.toBe("48px");
    expect(align.top).not.toContain("--header-height");
    expect(align.right).not.toContain("--content-inset");
  });

  it("locks the footer on both menus to 13 Regular / 16 — version tertiary, Legal parked", () => {
    expect(ACCOUNT_SHEET_FOOTER_CLASS).toContain("h-4");
    expect(ACCOUNT_SHEET_VERSION_CLASS).toContain("t-body-sm");
    expect(ACCOUNT_SHEET_VERSION_CLASS).not.toContain("font-normal");
    expect(ACCOUNT_SHEET_VERSION_CLASS).toContain("leading-4");
    expect(ACCOUNT_SHEET_VERSION_CLASS).toContain("text-ink-3");
    expect(accountSheet).not.toHaveProperty("ACCOUNT_SHEET_LEGAL_CLASS");
    expect(ACCOUNT_SHEET_ABSENT).toContain("Legal");
    expect(ACCOUNT_SHEET_ABSENT).not.toContain("Appearance");
  });
});

describe("account sheet identity", () => {
  it("keeps name and email fields without dashes when empty", () => {
    const empty = accountSheetIdentity("");
    expect(empty.avatarInitial).toBe("?");
    expect(empty.photoUrl).toBeNull();
    expect(empty.name).toBe("");
    expect(empty.email).toBe("");
    expect(empty.name).not.toBe("—");
    expect(empty.email).not.toBe("—");
  });

  it("shows the real email and an empty name — never a local-part invention or dash", () => {
    const email = "jane.doe@studio.com";
    const panel = accountSheetIdentity(email);
    expect(panel.name).toBe("");
    expect(panel.email).toBe(email);
    expect(panel.avatarInitial).toBe("J");
    expect(panel.name).not.toBe("Jane Doe");
    expect(panel.name).not.toBe("jane.doe");
    expect(panel.name).not.toBe("—");
  });

  it("shows a name only when the caller already has one", () => {
    const named = accountSheetIdentity("ada@example.com", "Ada Lovelace");
    expect(named.name).toBe("Ada Lovelace");
    expect(named.email).toBe("ada@example.com");
    expect(named.avatarInitial).toBe("A");
    expect(named.photoUrl).toBeNull();
    expect(accountSheetIdentity("ada@example.com", "   ")).toEqual(
      accountSheetIdentity("ada@example.com"),
    );
  });

  it("carries the signed face when one exists and ignores a blank URL", () => {
    const withFace = accountSheetIdentity(
      "ada@example.com",
      "Ada Lovelace",
      "https://s3.example/signed-avatar",
    );
    expect(withFace.photoUrl).toBe("https://s3.example/signed-avatar");
    expect(withFace.avatarInitial).toBe("A");
    expect(accountSheetIdentity("ada@example.com", null, "   ").photoUrl).toBeNull();
    expect(accountSheetIdentity("ada@example.com", null, null).photoUrl).toBeNull();
  });
});

describe("account sheet destination close", () => {
  it("closes immediately only on the same href", () => {
    expect(destinationClickClosesSheet("/settings/profile", "/settings/profile")).toBe(true);
    expect(destinationClickClosesSheet("/settings/preferences", "/settings/preferences")).toBe(true);
    expect(destinationClickClosesSheet("/settings/profile", "/settings/you")).toBe(false);
    expect(destinationClickClosesSheet("/", "/settings/organization")).toBe(false);
    expect(destinationClickClosesSheet("/help", "/help")).toBe(true);
    expect(destinationClickClosesSheet("/settings/profile", "/help")).toBe(false);
  });
});

type ClickNode = {
  parentNode?: ClickNode | null;
  tagName?: string;
  getAttribute?: (name: string) => string | null;
};

function clickNode(tagName: string, attrs: Record<string, string>, parent: ClickNode | null): ClickNode {
  return {
    tagName,
    parentNode: parent,
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? (attrs[name] ?? null) : null),
  };
}

describe("account menu destination click", () => {
  const here = dirname(fileURLToPath(import.meta.url));

  it("treats the Theme glyph inside the menu as the Theme destination", () => {
    const root = clickNode("DIV", { [ACCOUNT_MENU_ROOT_ATTR]: "" }, null);
    const link = clickNode("A", { href: "/settings/preferences/theme" }, root);
    const glyph = clickNode("svg", {}, link);
    expect(accountMenuDestinationClick(glyph as unknown as EventTarget)).toBe(true);
    expect(accountMenuDestinationClick(link as unknown as EventTarget)).toBe(true);
  });

  it("ignores clicks that are not a menu destination", () => {
    const root = clickNode("DIV", { [ACCOUNT_MENU_ROOT_ATTR]: "" }, null);
    const outside = clickNode("A", { href: "/settings/preferences/theme" }, null);
    const logout = clickNode("BUTTON", {}, root);
    const hash = clickNode("A", { href: "#theme" }, root);
    const text = clickNode("", {}, clickNode("A", { href: "/help" }, root));
    expect(accountMenuDestinationClick(outside as unknown as EventTarget)).toBe(false);
    expect(accountMenuDestinationClick(logout as unknown as EventTarget)).toBe(false);
    expect(accountMenuDestinationClick(hash as unknown as EventTarget)).toBe(false);
    expect(accountMenuDestinationClick(text as unknown as EventTarget)).toBe(true);
    expect(accountMenuDestinationClick(null)).toBe(false);
  });

  it("closes from document capture and follows the house path, not Next's pathname", () => {
    const src = readFileSync(join(here, "../components/chrome/account-sheet.tsx"), "utf8");
    expect(src).toContain("const pathname = useHousePathname()");
    expect(src).not.toContain("const pathname = usePathname()");
    expect(src).toContain('document.addEventListener("click", onClick, true)');
    expect(src).toContain("accountMenuDestinationClick(event.target)");
    expect(src).toContain("houseNavIgnorePendingClick(event)");
    expect(src).toContain("event.defaultPrevented");
    expect(src).toContain("queueMicrotask(closeIfOwned)");
    expect(src).toContain("ACCOUNT_MENU_ROOT_ATTR");
  });
});
