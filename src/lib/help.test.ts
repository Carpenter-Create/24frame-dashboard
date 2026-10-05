import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DASHBOARD_HREF } from "./dashboard-admin";
import { HOME_ROOT } from "./workspace";
import { HELP, HELP_ABSENT, HELP_HELPER_CLASS, HELP_ROW_CLASS, HELP_SECTION_CLASS, HELP_STACK, HELP_STACK_CLASS, HELP_TITLE_CLASS, helpHeaderBack, isHelpPath } from "./help";
import {
  SETTINGS_DRILL_ROW_CLASS,
  SETTINGS_EDIT_HELPER_CLASS,
  SETTINGS_GROUP_CLASS,
  SETTINGS_HUB_NAV,
  SETTINGS_PANE_TITLE_CLASS,
  SETTINGS_SECTION_CLASS,
} from "./settings";
import { USER_MENU, USER_MENU_ACTIONS } from "./user-menu";

describe("help stack lock", () => {
  it("is the Get Help index — same door as the avatar menu", () => {
    expect(HELP.title).toBe("Get Help");
    expect(HELP.title).toBe(USER_MENU.help);
    expect(HELP.href).toBe("/help");
    expect(HELP.href).toBe(USER_MENU.helpHref);
    expect(HELP.helper).toBe("Help center, support, and feedback.");
    expect(USER_MENU_ACTIONS.map((item) => item.href)).toContain("/help");
  });

  it("keeps Give feedback on /help/feedback — blank now, form later", () => {
    expect(HELP.feedback).toBe("Give feedback");
    expect(HELP.feedbackHref).toBe("/help/feedback");
    expect(HELP.feedbackHelper).toBe("The form is coming.");
    expect(HELP.feedbackEmpty).toBe("Feedback is empty.");
    expect(HELP.feedbackHref).not.toBe("/account/feedback");
    expect(HELP.feedbackHref).not.toMatch(/^\/settings/);
    expect(HELP).not.toHaveProperty("feedbackForm");
  });

  it("stubs Help center and Contact support — no URL or mailto SoT", () => {
    expect(HELP.center).toBe("Help center");
    expect(HELP.centerHref).toBe("/help/center");
    expect(HELP.centerEmpty).toBe("Help center is empty.");
    expect(HELP.support).toBe("Contact support");
    expect(HELP.supportHref).toBe("/help/support");
    expect(HELP.supportEmpty).toBe("Contact support is empty.");
    expect(HELP).not.toHaveProperty("centerUrl");
    expect(HELP).not.toHaveProperty("supportMailto");
    expect(HELP.centerHref).not.toMatch(/^https?:/);
    expect(HELP.supportHref).not.toMatch(/^mailto:/);
  });

  it("locks Coinbase-style stack order and keeps it off Settings hub", () => {
    expect(HELP_STACK.map((item) => item.kind)).toEqual(["center", "support", "feedback"]);
    expect(HELP_STACK.map((item) => item.label)).toEqual([
      "Help center",
      "Contact support",
      "Give feedback",
    ]);
    expect(HELP_STACK.map((item) => item.href)).toEqual([
      "/help/center",
      "/help/support",
      "/help/feedback",
    ]);
    expect(SETTINGS_HUB_NAV.map((item) => item.href).join(" ")).not.toContain("/help");
  });

  it("does not invent a help desk, FAQ, or support inbox", () => {
    const blob = `${HELP.title} ${HELP.helper} ${HELP.center} ${HELP.centerEmpty} ${HELP.support} ${HELP.supportEmpty} ${HELP.feedback} ${HELP.feedbackHelper} ${HELP.feedbackEmpty}`;
    for (const absent of HELP_ABSENT) {
      expect(blob).not.toContain(absent);
    }
    expect(blob).not.toMatch(/seamless|frictionless|elevate|amplify|unleash|supercharge/i);
    expect(HELP).not.toHaveProperty("articles");
    expect(HELP).not.toHaveProperty("empty");
  });

  it("backs the index to Home and panes to Get Help", () => {
    expect(isHelpPath("/help")).toBe(true);
    expect(isHelpPath("/help/feedback")).toBe(true);
    expect(isHelpPath("/settings")).toBe(false);
    expect(helpHeaderBack("/help")).toEqual({
      href: HOME_ROOT,
      label: HELP.back,
    });
    expect(helpHeaderBack("/help").label).not.toBe("Home");
    expect(helpHeaderBack("/help").label).not.toBe("Aggregation");
    expect(HELP.homeHref).toBe(HOME_ROOT);
    expect(HELP.homeHref).not.toBe(DASHBOARD_HREF);
    expect(HELP.homeHref).not.toContain("/aggregation");
    expect(helpHeaderBack("/help/feedback")).toEqual({
      href: HELP.href,
      label: HELP.title,
    });
    expect(helpHeaderBack("/help/center")).toEqual({
      href: HELP.href,
      label: HELP.title,
    });
    expect(helpHeaderBack(null)).toEqual({
      href: HOME_ROOT,
      label: HELP.back,
    });
    expect(HELP.back).toBe("Back");
    expect(HELP_TITLE_CLASS).toBe(SETTINGS_PANE_TITLE_CLASS);
    expect(HELP_STACK_CLASS).toBe(SETTINGS_GROUP_CLASS);
    expect(HELP_ROW_CLASS).toBe(SETTINGS_DRILL_ROW_CLASS);
    expect(HELP_HELPER_CLASS).toBe(SETTINGS_EDIT_HELPER_CLASS);
    expect(HELP_SECTION_CLASS).toBe(SETTINGS_SECTION_CLASS);
    expect(isHelpPath("/education/help")).toBe(false);
    expect(isHelpPath("/education")).toBe(false);
  });

  it("reuses the house Settings inset-group SoT — no lookalike stack", () => {
    const stack = readFileSync("src/components/help/help-stack.tsx", "utf8");
    const lead = readFileSync("src/components/help/help-page-lead.tsx", "utf8");
    expect(stack).toContain("SettingsGroupList");
    expect(stack).toContain("SettingsGroupRow");
    expect(stack).toContain("SettingsDrillRow");
    expect(stack).not.toContain("SETTINGS_DRILL_LIST_CLASS");
    expect(lead).toContain("PAGE_LEAD_STACK_CLASS");
    expect(lead).toContain("PageHeaderBackLink");
    expect(lead).toContain("<SettingsHubBackLink");
    expect(lead).not.toContain('href="/aggregation"');
    expect(lead).not.toMatch(/from ["']@\/components\/settings\/settings-page-lead["']/);
  });
});
