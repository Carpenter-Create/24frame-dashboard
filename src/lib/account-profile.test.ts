import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_PROFILE,
  COMPANY_PROFILE,
  COMPANY_PROFILE_SAVED_MS,
  accountNameSchema,
  authDisplayName,
  companySaveSchema,
} from "./account-profile";
import { USER_MENU, userMenuName } from "./user-menu";
import { accountSheetIdentity } from "./account-sheet";

const here = dirname(fileURLToPath(import.meta.url));
const actionSrc = readFileSync(join(here, "../app/(app)/account/actions.ts"), "utf8");
const authSrc = readFileSync(join(here, "./supabase/auth.ts"), "utf8");
const pageSrc = readFileSync(join(here, "../components/settings/profile-settings.tsx"), "utf8");
const layoutSrc = readFileSync(join(here, "../app/(app)/layout.tsx"), "utf8");
const formSrc = readFileSync(join(here, "../app/(app)/account/account-profile-form.tsx"), "utf8");
const companyFormSrc = readFileSync(
  join(here, "../app/(app)/account/company-profile-form.tsx"),
  "utf8",
);
const companyEditorSrc = readFileSync(
  join(here, "../components/settings/company-name-editor.tsx"),
  "utf8",
);
const inputSrc = readFileSync(join(here, "../components/ui/input.tsx"), "utf8");
const globalsSrc = readFileSync(join(here, "../app/globals.css"), "utf8");

describe("account profile copy", () => {
  it("keeps Profile and Company titles, no banned voice", () => {
    expect(ACCOUNT_PROFILE.title).toBe("Profile");
    expect(ACCOUNT_PROFILE.href).toBe("/settings/profile");
    expect(ACCOUNT_PROFILE.href).not.toBe("/account/profile");
    expect(COMPANY_PROFILE.title).toBe("Company");
    expect(COMPANY_PROFILE.subtitle).toBe(
      "Name of the company aggregation workspace on this account.",
    );
    expect(COMPANY_PROFILE.href).toBe("/settings/organization");
    expect(COMPANY_PROFILE.editHref).toBe("/settings/organization/company");
    expect(ACCOUNT_PROFILE.href).toBe(USER_MENU.profileHref);
    expect(ACCOUNT_PROFILE).not.toHaveProperty("subtitle");
    expect(ACCOUNT_PROFILE.uploadPhoto).toBe("Upload photo");
    expect(ACCOUNT_PROFILE.cropTitle).toBe("Reposition");
    expect(ACCOUNT_PROFILE.cropSave).toBe("Save photo");
    expect(ACCOUNT_PROFILE.dropPhoto).toBe("Drop a photo");
    expect(ACCOUNT_PROFILE.photoType).toBe("Use a JPEG, PNG, or WebP photo.");
    expect(ACCOUNT_PROFILE.photoRemoveFailed).toBe("Could not remove photo.");
    expect(ACCOUNT_PROFILE.nameLabel).toBe("Name");
    expect(ACCOUNT_PROFILE.nameHelper).toBe("Shown on this account.");
    expect(ACCOUNT_PROFILE.emailHint).toBe("Sign-in email. It cannot be changed here.");
    expect(ACCOUNT_PROFILE.emailLocked).toBe("Cannot be changed here.");
    expect(ACCOUNT_PROFILE.emptyValue).toBe("\u2014");
    const blob = `${ACCOUNT_PROFILE.uploadPhoto} ${COMPANY_PROFILE.subtitle}`;
    expect(blob).not.toMatch(/seamless|frictionless|elevate|amplify|unleash|supercharge/i);
  });
});

describe("account name schemas", () => {
  it("trims display names, allows empty, and rejects oversized or non-string values", () => {
    expect(accountNameSchema.parse("  Ada  ")).toBe("Ada");
    expect(accountNameSchema.parse("   ")).toBe("");
    expect(accountNameSchema.safeParse("x".repeat(ACCOUNT_NAME_MAX + 1)).success).toBe(false);
    expect(accountNameSchema.safeParse(12).success).toBe(false);
  });

  it("requires a company name and the rendered org id", () => {
    expect(
      companySaveSchema.parse({
        orgId: "11111111-1111-4111-8111-111111111111",
        name: "  Acme  ",
      }),
    ).toEqual({
      orgId: "11111111-1111-4111-8111-111111111111",
      name: "Acme",
    });
    expect(
      companySaveSchema.safeParse({
        orgId: "11111111-1111-4111-8111-111111111111",
        name: "   ",
      }).success,
    ).toBe(false);
    expect(companySaveSchema.safeParse({ orgId: "not-a-uuid", name: "Acme" }).success).toBe(false);
  });
});

describe("authDisplayName", () => {
  it("reads user_metadata.display_name and trims", () => {
    expect(authDisplayName({ user_metadata: { display_name: "  Ada Lovelace  " } })).toBe(
      "Ada Lovelace",
    );
    expect(authDisplayName({ user_metadata: { display_name: "Ada Lovelace" } })).toBe(
      userMenuName("Ada Lovelace"),
    );
  });

  it("stays empty when the field is missing or whitespace", () => {
    expect(authDisplayName({})).toBeNull();
    expect(authDisplayName({ user_metadata: {} })).toBeNull();
    expect(authDisplayName({ user_metadata: { display_name: "   " } })).toBeNull();
    expect(authDisplayName({ user_metadata: { display_name: "" } })).toBeNull();
    expect(authDisplayName(null)).toBeNull();
  });

  it("does not invent a name from the email local-part", () => {
    const email = "jane.doe@studio.com";
    expect(authDisplayName({ email, user_metadata: {} })).toBeNull();
    expect(authDisplayName({ email, user_metadata: { display_name: email.split("@")[0] } })).toBe(
      "jane.doe",
    );
    expect(authDisplayName({ email })).toBeNull();
    expect(authDisplayName({ display_name: "Should not read top-level" })).toBeNull();
  });
});

describe("account name persist read-after-write", () => {
  it("reads the same user_metadata.display_name the save writes, after a session refresh", () => {
    const written = accountNameSchema.parse("  Ada Lovelace  ");
    expect(written).toBe("Ada Lovelace");

    expect(authDisplayName({ user_metadata: {} })).toBeNull();
    expect(authDisplayName({ email: "ada@example.com" })).toBeNull();

    const fresh = authDisplayName({ user_metadata: { display_name: written } });
    expect(fresh).toBe("Ada Lovelace");
    expect(accountSheetIdentity("ada@example.com", fresh).name).toBe("Ada Lovelace");
    expect(userMenuName(fresh)).toBe("Ada Lovelace");

    expect(actionSrc).toContain("updateUser");
    expect(actionSrc).toContain("display_name");
    expect(actionSrc).toContain("refreshSession");
    expect(actionSrc.indexOf("updateUser")).toBeLessThan(actionSrc.indexOf("refreshSession"));
    const authImpl = authSrc.slice(authSrc.indexOf("export const getAuthUser"));
    expect(authImpl).toContain("await supabase.auth.getClaims()");
    expect(authImpl).toContain("authDisplayName");
    expect(authImpl).not.toMatch(/await supabase\.auth\.getUser\(/);
    expect(pageSrc).toContain("ctx.user.name");
    const chromeSrc = readFileSync(join(here, "app-shell-chrome.ts"), "utf8");
    expect(chromeSrc).toContain("name: ctx.user.name");
    expect(chromeSrc).toContain("photoUrl: ACCOUNT_PHOTO_HREF");
    expect(chromeSrc).not.toContain("hasAvatarObject");
    expect(chromeSrc).toContain("ACCOUNT_PHOTO_HREF");
    expect(layoutSrc).toContain("loadAppShellChrome()");
    expect(layoutSrc).not.toContain("signedAvatarUrl");
    expect(chromeSrc).not.toContain("signedAvatarUrl");
  });

  it("does not invent a name when the refreshed claims still have none", () => {
    expect(authDisplayName({ user_metadata: { display_name: "" } })).toBeNull();
    expect(accountSheetIdentity("jane.doe@studio.com", null).name).toBe("");
    expect(accountSheetIdentity("jane.doe@studio.com", null).name).not.toBe("jane.doe");
  });
});

describe("account field 16px lock", () => {
  it("uses the shared form-control primitive — no per-surface 16px override", () => {
    expect(globalsSrc).toMatch(/\.t-control\s*\{[\s\S]*?font-size:\s*16px/);
    expect(globalsSrc).toMatch(/\.t-body\s*\{[\s\S]*?font-size:\s*var\(--text-base\)/);
    expect(inputSrc).toContain("formControlClass");
    expect(inputSrc).not.toContain("t-body");
    expect(formSrc).toContain("<Input");
    expect(formSrc).not.toContain("ACCOUNT_FIELD_CLASS");
    expect(formSrc).toContain("TEXT_ACTION_CLASS");
    expect(formSrc).toContain("uploadAccountPhoto");
    expect(formSrc).toContain('#account-name")?.blur()');
    expect(formSrc).toContain("export function AccountNameForm");
    expect(formSrc).toContain("export function AccountPhotoField");
    expect(formSrc).toContain("AccountAvatarCrop");
    expect(formSrc).toContain("accountAvatarPickError");
    expect(formSrc).toContain("data-account-photo-drop");
    expect(formSrc).toContain("data-account-name-form");
    expect(companyEditorSrc).toContain("<Input");
    expect(companyEditorSrc).not.toContain("ACCOUNT_FIELD_CLASS");
    expect(companyEditorSrc).toContain('#company-name")?.blur()');
    expect(companyEditorSrc).toContain("DialogFooter");
    expect(companyFormSrc).toContain("<Dialog");
    expect(companyFormSrc).toContain("SettingsDrillRow");
    expect(companyFormSrc).toContain("SettingsGroupList");
    expect(companyFormSrc).toContain("company-edit");
    expect(companyFormSrc).not.toContain("COMPANY_PROFILE_VIEW_CLASS");
    expect(companyFormSrc).not.toContain("<Button");
  });
});

describe("company Saved notice", () => {
  it("auto-clears after a short delay and on a new edit", () => {
    expect(COMPANY_PROFILE.saved).toBe("Saved.");
    expect(COMPANY_PROFILE.edit).toBe("Edit");
    expect(COMPANY_PROFILE.cancel).toBe("Cancel");
    expect(COMPANY_PROFILE_SAVED_MS).toBe(2800);
    expect(companyFormSrc).toContain("COMPANY_PROFILE_SAVED_MS");
    expect(companyFormSrc).toContain("setTimeout");
    expect(companyFormSrc).toContain("clearTimeout");
    expect(companyFormSrc).toContain("setSaved(false)");
  });
});
