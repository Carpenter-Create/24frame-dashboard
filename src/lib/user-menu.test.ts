import { describe, expect, it } from "vitest";

import {
  USER_MENU,
  USER_MENU_ABSENT,
  USER_MENU_ACTIONS,
  USER_MENU_PHONE_ACTIONS,
  userMenuAvatarInitial,
  userMenuName,
  userMenuPanel,
  userMenuVersion,
} from "./user-menu";
import { ASSISTANT_NAME } from "./product";

describe("user menu lock", () => {
  it("keeps one Apple stack on phone and desktop: Settings — Theme — Get Help", () => {
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).toEqual(["settings", "theme", "help"]);
    expect(USER_MENU_ACTIONS.map((item) => item.label)).toEqual(["Settings", "Theme", "Get Help"]);
    expect(USER_MENU.settings).toBe("Settings");
    expect(USER_MENU.settingsHref).toBe("/settings");
    expect(USER_MENU.theme).toBe("Theme");
    expect(USER_MENU.themeHref).toBe("/settings/preferences/theme");
    expect(USER_MENU.help).toBe("Get Help");
    expect(USER_MENU.helpHref).toBe("/help");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("profile");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("workspace");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("appearance");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("askAssistant");
    expect(USER_MENU_ACTIONS.map((item) => item.label)).not.toContain("Profile");
    expect(USER_MENU_ACTIONS.map((item) => item.label)).not.toContain("Workspace");
    expect(USER_MENU_ACTIONS.map((item) => item.label)).not.toContain("Appearance");
    expect(USER_MENU_PHONE_ACTIONS).toBe(USER_MENU_ACTIONS);
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.kind)).toEqual(["settings", "theme", "help"]);
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.kind)).not.toContain("appearance");
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.label)).not.toContain("Appearance");
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.kind)).not.toContain("askAssistant");
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.label)).not.toContain(ASSISTANT_NAME);
    expect(USER_MENU).not.toHaveProperty("askAssistant");
    expect(USER_MENU).not.toHaveProperty("askAssistantHref");
  });

  it("keeps Profile as a Settings pane href — Theme is /settings/preferences/theme", () => {
    expect(USER_MENU.profileHref).toBe("/settings/profile");
    expect(USER_MENU.agreementsHref).toBe("/settings/agreements");
    expect(USER_MENU.referHref).toBe("/settings/refer");
    expect(USER_MENU).not.toHaveProperty("legal");
    expect(USER_MENU).not.toHaveProperty("legalHref");
    expect(USER_MENU).not.toHaveProperty("appearanceHref");
    expect(USER_MENU).not.toHaveProperty("workspaceHref");
    expect(USER_MENU).not.toHaveProperty("companyProfile");
    expect(USER_MENU).not.toHaveProperty("companyProfileHref");
    expect(USER_MENU.appearance).toBe("Appearance");
    expect(USER_MENU.workspace).toBe("Workspace");
    expect(USER_MENU_ACTIONS[0]).toEqual({
      kind: "settings",
      label: "Settings",
      href: "/settings",
    });
    expect(USER_MENU_ACTIONS[1]).toEqual({
      kind: "theme",
      label: "Theme",
      href: "/settings/preferences/theme",
    });
    expect(USER_MENU_ACTIONS[2]).toEqual({
      kind: "help",
      label: "Get Help",
      href: "/help",
    });
    expect(USER_MENU_ACTIONS).toHaveLength(3);
    expect(USER_MENU_ABSENT).toContain("Workspace");
    expect(USER_MENU_ABSENT).toContain("Workspaces");
    expect(USER_MENU_ABSENT).toContain(ASSISTANT_NAME);
    expect(USER_MENU_ABSENT).not.toContain("Appearance");
  });

  it("does not invent /account/appearance, /account/profile, Company, Phone, Job, or leftovers", () => {
    const labels = USER_MENU_ACTIONS.map((item) => item.label);
    const hrefs = USER_MENU_ACTIONS.flatMap((item) => ("href" in item ? [item.href] : []));
    for (const absent of USER_MENU_ABSENT) {
      expect(labels).not.toContain(absent);
    }
    expect(labels).toContain("Settings");
    expect(labels).toContain("Theme");
    expect(labels).toContain("Get Help");
    expect(labels).not.toContain("User Profile");
    expect(labels).not.toContain("Agreements");
    expect(labels).not.toContain("Help");
    expect(labels).not.toContain("Give feedback");
    expect(labels).not.toContain("Refer a friend");
    expect(hrefs).toEqual(["/settings", "/settings/preferences/theme", "/help"]);
    expect(hrefs).not.toContain("/account/appearance");
    expect(hrefs).not.toContain("/settings/appearance");
    expect(hrefs).not.toContain("/settings/theme");
    expect(hrefs).not.toContain("/account/profile");
    expect(hrefs).not.toContain("/account/company");
    expect(hrefs).not.toContain("/account/settings");
    expect(hrefs.join(" ")).not.toMatch(/notifications|privacy|phone|job/i);
  });

  it("parks Legal and versions from package.json", () => {
    expect(USER_MENU_ABSENT).toContain("Legal");
    expect(userMenuVersion()).toBe("v0.1.0");
    expect(USER_MENU.versionPrefix).toBe("v");
  });
});

describe("user menu identity", () => {
  it("uses the email initial for the avatar, not a fabricated name", () => {
    expect(userMenuAvatarInitial("ada@example.com")).toBe("A");
    expect(userMenuAvatarInitial("  nina@studio.com")).toBe("N");
    expect(userMenuAvatarInitial("")).toBe("?");
  });

  it("omits the name row unless a real display name is already present", () => {
    expect(userMenuName(undefined)).toBeNull();
    expect(userMenuName(null)).toBeNull();
    expect(userMenuName("")).toBeNull();
    expect(userMenuName("   ")).toBeNull();
    expect(userMenuName("Ada Lovelace")).toBe("Ada Lovelace");
    expect(userMenuName("  Ada Lovelace  ")).toBe("Ada Lovelace");
  });

  it("does not derive a name from the email local-part", () => {
    const email = "jane.doe@studio.com";
    const panel = userMenuPanel(email);
    expect(panel.name).toBeNull();
    expect(panel.email).toBe(email);
    expect(panel.avatarInitial).toBe("J");
    expect(userMenuName(email.split("@")[0])).not.toBe(panel.name);
  });

  it("shows a name only when the caller already has one", () => {
    const named = userMenuPanel("ada@example.com", "Ada Lovelace");
    expect(named.name).toBe("Ada Lovelace");
    expect(named.email).toBe("ada@example.com");
    expect(named.actions).toEqual(USER_MENU_ACTIONS);
  });
});
