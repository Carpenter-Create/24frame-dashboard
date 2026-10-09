import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ACCOUNT_SHEET_SURFACE_CLASS } from "./account-sheet";
import { APP_SHEET_CHROME_CLASS, APP_SHEET_HOST_CLASS, APP_SHEET_SCRIM_CLASS } from "./house-sheet";
import { HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS } from "./house-page-select";
import { MENU_SURFACE_CONTENT_CLASS, MENU_SURFACE_ITEM_CLASS, menuSurfaceContentClass } from "./menu-surface";
import { HOUSE_WINDOW_PANEL_CLASS } from "./house-window";
import { SOCIAL_COMMENT_SHEET_SURFACE_CLASS, SOCIAL_PROFILE_EDIT_HOST_CLASS } from "./social-chrome";
import { SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS } from "./social-write-compose-sheet";
import {
  APP_SHEET_FULL_HOST_CLASS,
  APP_SHEET_LOCK_HOST_CLASS,
  APP_SHEET_LOCK_SURFACE_CLASS,
  HOUSE_DIALOG_CONFIRM_CLASS,
  HOUSE_DIALOG_FORM_CLASS,
  HOUSE_DIALOG_HOST_CLASS,
  HOUSE_DIALOG_PANEL_CLASS,
  HOUSE_DIALOG_WINDOW_CLASS,
  HOUSE_DRAWER_HOST_CLASS,
  HOUSE_DRAWER_PANEL_CLASS,
  HOUSE_OVERLAY_HOSTS,
  HOUSE_OVERLAY_JOB_HOST,
  HOUSE_OVERLAY_JOBS,
  HOUSE_OVERLAY_LOCK,
  HOUSE_OVERLAY_SCRIM_CLASS,
  houseOverlayHost,
  overlayClassMixesHosts,
} from "./house-overlay";

function src(path: string) {
  return readFileSync(path, "utf8");
}

describe("HouseOverlay dual-host lock v1", () => {
  it("G1 maps each job to one host per viewport", () => {
    expect(HOUSE_OVERLAY_LOCK).toBe("HouseOverlay dual-host lock v1");
    expect(HOUSE_OVERLAY_HOSTS).toEqual([
      "app-sheet",
      "menu-surface",
      "house-dialog",
      "house-drawer",
    ]);
    expect(HOUSE_OVERLAY_JOBS).toEqual([
      "account-system",
      "single-value",
      "hamburger",
      "confirm",
      "side-edit",
      "anchored",
      "object-edit",
    ]);
    // One object edited over the page that shows it (amended 2026-10-09):
    // the composer and Edit profile. Phone is the full sheet.
    expect(houseOverlayHost("object-edit", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("object-edit", "desktop")).toBe("house-dialog");

    expect(houseOverlayHost("account-system", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("account-system", "desktop")).toBe("menu-surface");
    expect(houseOverlayHost("single-value", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("single-value", "desktop")).toBe("menu-surface");
    expect(houseOverlayHost("hamburger", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("hamburger", "desktop")).toBeNull();
    expect(houseOverlayHost("confirm", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("confirm", "desktop")).toBe("house-dialog");
    expect(houseOverlayHost("side-edit", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("side-edit", "desktop")).toBe("house-drawer");
    expect(houseOverlayHost("anchored", "phone")).toBe("app-sheet");
    expect(houseOverlayHost("anchored", "desktop")).toBe("menu-surface");

    for (const job of HOUSE_OVERLAY_JOBS) {
      expect(HOUSE_OVERLAY_JOB_HOST[job].desktop).not.toBe("app-sheet");
      expect(HOUSE_OVERLAY_JOB_HOST[job].phone).not.toBe("house-drawer");
      expect(HOUSE_OVERLAY_JOB_HOST[job].phone).not.toBe("house-dialog");
    }
    expect(HOUSE_OVERLAY_JOB_HOST["side-edit"].desktop).not.toBe("house-dialog");
    expect(HOUSE_OVERLAY_JOB_HOST.confirm.desktop).not.toBe("house-drawer");
    expect(HOUSE_OVERLAY_JOB_HOST.anchored.desktop).not.toBe("house-drawer");
  });

  it("G2 uses one ink scrim at 40% with no blur and no raw hex", () => {
    expect(HOUSE_OVERLAY_SCRIM_CLASS).toBe("absolute inset-0 bg-ink/40");
    expect(HOUSE_OVERLAY_SCRIM_CLASS).not.toContain("backdrop-blur");
    expect(APP_SHEET_SCRIM_CLASS.startsWith(HOUSE_OVERLAY_SCRIM_CLASS)).toBe(true);
    const lock = src("src/lib/house-overlay.ts");
    expect(lock).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(lock).not.toContain("backdrop-blur");
  });

  it("G3 keeps AppSheet on the phone: bottom, r16, pad 16, 90vh, no shadow, md:hidden", () => {
    expect(APP_SHEET_LOCK_HOST_CLASS).toBe(APP_SHEET_HOST_CLASS);
    expect(APP_SHEET_FULL_HOST_CLASS).toContain("md:hidden");
    expect(APP_SHEET_FULL_HOST_CLASS).not.toContain("w-[400px]");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("rounded-t-[16px]");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("p-[var(--space-4)]");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("max-h-[90vh]");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("bg-surface");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("shadow-none");
    expect(APP_SHEET_LOCK_SURFACE_CLASS).toContain("env(safe-area-inset-bottom)");
    expect(src("src/components/chrome/house-overlay.tsx")).toContain("Close44");
    expect(src("src/lib/house-sheet.ts")).not.toContain("md:items-center");
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain(APP_SHEET_CHROME_CLASS);
  });

  it("G4 centers HouseDialog at 400 / 480 with a button footer and no sheet skin", () => {
    expect(HOUSE_DIALOG_CONFIRM_CLASS).toContain("400px");
    expect(HOUSE_DIALOG_FORM_CLASS).toContain("480px");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("rounded-[16px]");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("p-[var(--space-6)]");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("border-hairline");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("shadow-none");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("max-h-[80vh]");
    expect(HOUSE_DIALOG_PANEL_CLASS).toContain("backdrop:bg-ink/40");
    expect(HOUSE_DIALOG_HOST_CLASS).toContain("md:flex");
    expect(HOUSE_DIALOG_HOST_CLASS).toContain("hidden");
    const dialog = src("src/components/ui/dialog.tsx");
    expect(dialog).toContain("export function DialogFooter");
    expect(dialog).toContain("AppSheetFrame");
    expect(dialog).not.toContain("DIALOG_SHEET");
    expect(dialog).not.toContain('presentation="sheet"');
    expect(overlayClassMixesHosts(HOUSE_DIALOG_PANEL_CLASS)).toBe(false);
  });

  it("G4 window: one 600 geometry for every window (the composer, the house window shell)", () => {
    expect(HOUSE_DIALOG_WINDOW_CLASS).toBe("w-[min(92vw,600px)] rounded-[var(--radius-xl)] border-0");
    expect(SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS).toBe(`${HOUSE_DIALOG_WINDOW_CLASS} p-[var(--space-4)]`);
    expect(HOUSE_WINDOW_PANEL_CLASS.startsWith(HOUSE_DIALOG_WINDOW_CLASS)).toBe(true);
    expect(overlayClassMixesHosts(HOUSE_WINDOW_PANEL_CLASS)).toBe(false);
    const doc = src("docs/design-locks/house-overlay-dual-host-v1.md");
    expect(doc).toContain("Max width 600 for a window");
    expect(doc).toContain("No overlay over an empty page");
    const out = doc.slice(doc.indexOf("## OUT"), doc.indexOf("## Why"));
    expect(out).not.toContain("No Dialog for durable settings");
    expect(out).toContain("No Dialog for a Settings index or a Settings destination");
  });

  it("G5 puts durable side edit in a right drawer and never a phone side strip", () => {
    expect(HOUSE_DRAWER_HOST_CLASS).toContain("hidden");
    expect(HOUSE_DRAWER_HOST_CLASS).toContain("md:block");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("right-0");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("w-[400px]");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("h-[100vh]");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("p-[var(--space-6)]");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("border-l");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("border-hairline");
    expect(HOUSE_DRAWER_PANEL_CLASS).toContain("shadow-none");
    expect(overlayClassMixesHosts(HOUSE_DRAWER_PANEL_CLASS)).toBe(false);
    expect(overlayClassMixesHosts(HOUSE_DRAWER_HOST_CLASS)).toBe(false);

    const education = src("src/app/(app)/(operator)/education/manage/education-drawer.tsx");
    expect(education).toContain("HouseDrawerFrame");
    expect(education).toContain("AppSheetFrame");
    expect(education).not.toContain("w-[min(100%");
    expect(education).not.toContain("<Dialog");

    const legal = src("src/components/settings/legal-entities-section.tsx");
    expect(legal).toContain("HouseDrawerFrame");
    expect(legal).toContain("AppSheetFrame");
    expect(legal).not.toContain("<Dialog");

    expect(SOCIAL_PROFILE_EDIT_HOST_CLASS).toContain("md:hidden");
    expect(SOCIAL_PROFILE_EDIT_HOST_CLASS).not.toContain("w-[400px]");
    // Edit profile left the drawer (it floated over an empty page): it is
    // the window over the live profile now. Never a drawer over nothing.
    expect(src("src/components/social/social-profile-edit.tsx")).not.toContain("HouseDrawerFrame");
    expect(src("src/components/social/social-profile-edit-face.tsx")).not.toContain("HouseDrawerFrame");
    // Every object-edit window draws the one house window shell.
    expect(src("src/components/social/social-profile-edit-window.tsx")).toContain("HouseWindowFrame");
    // Comments is a house window too; the 480 dialog thread is gone
    // (social-comments-window-lock-v1).
    expect(src("src/components/social/social-comments-window.tsx")).toContain("HouseWindowFrame");
    const thread = src("src/components/social/social-comment-thread.tsx");
    expect(thread).not.toContain("HouseOverlayHead");
    expect(thread).not.toContain('size="form"');
    const shell = src("src/components/chrome/house-window.tsx");
    expect(shell).toContain("HouseDialogFrame");
    expect(shell).toContain("panelClassName={HOUSE_WINDOW_PANEL_CLASS}");
    expect(shell).not.toContain("HouseDrawerFrame");
  });

  it("G6 hugs MenuSurface at radius 12 with a 44px item and no shadow", () => {
    expect(MENU_SURFACE_CONTENT_CLASS).toContain("rounded-[12px]");
    expect(MENU_SURFACE_CONTENT_CLASS).toContain("border-hairline");
    expect(MENU_SURFACE_CONTENT_CLASS).toContain("shadow-none");
    expect(MENU_SURFACE_ITEM_CLASS).toContain("min-h-[44px]");
    expect(MENU_SURFACE_CONTENT_CLASS).not.toContain("rounded-[var(--radius)]");
    expect(menuSurfaceContentClass("sparse")).toContain("w-max");
    expect(menuSurfaceContentClass("sparse")).not.toContain("17.5rem");
    expect(src("src/components/chrome/menu-surface.tsx")).not.toContain("HouseDrawer");
    expect(src("src/components/social/social-profile-avatar-sheet.tsx")).not.toContain("HouseDrawer");
    expect(src("src/components/social/social-profile-avatar-sheet.tsx")).toContain(
      'data-house-overlay-host="menu-surface"',
    );
  });

  it("G7 rejects a fifth host and mixed chrome", () => {
    // dual-host gate: this line is the forbidden promote, not a host.
    expect(
      overlayClassMixesHosts(
        "fixed inset-0 flex flex-col justify-end md:items-center md:justify-center",
      ),
    ).toBe(true);
    expect(
      overlayClassMixesHosts(
        "justify-end rounded-t-[16px] md:max-w-[28rem] md:rounded-[16px]",
      ),
    ).toBe(true);
    expect(overlayClassMixesHosts(APP_SHEET_HOST_CLASS)).toBe(false);
    expect(SOCIAL_COMMENT_SHEET_SURFACE_CLASS).not.toContain("md:max-w");
    expect(SOCIAL_COMMENT_SHEET_SURFACE_CLASS).not.toContain("md:rounded");

    const account = src("src/components/chrome/account-sheet.tsx");
    expect(account).toContain('data-house-overlay-host="app-sheet"');
    expect(account).toContain('data-house-overlay-host="menu-surface"');
    expect(account).toContain("SheetGroup");
    expect(src("src/components/chrome/side-nav.tsx")).not.toContain("AppSheetFrame");
    expect(src("src/components/chrome/side-nav.tsx")).not.toContain("HouseDialog");
  });

  it("G8 leaves truncate, menu bodies, settings B, and parks alone", () => {
    expect(HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS).toContain("truncate");
    expect(src("src/components/chrome/ask-ai-overlay.tsx")).toContain(
      'className="truncate t-heading text-ink"',
    );
    expect(src("src/app/(app)/account/company-profile-form.tsx")).toContain("<Dialog");
    expect(src("src/app/(app)/account/company-profile-form.tsx")).not.toContain("HouseDrawer");
    expect(src("src/components/settings/company-name-editor.tsx")).not.toContain("HouseDrawer");
    expect(src("src/components/settings/preferences-settings.tsx")).not.toContain("HouseDrawer");
    expect(src("src/components/settings/preferences-settings.tsx")).not.toContain("AppSheetFrame");
    expect(src("src/components/social/social-story-studio.tsx")).not.toContain("data-house-overlay-host");
    expect(src("src/components/social/social-story-studio.tsx")).not.toContain("HouseDrawerFrame");
  });
});
