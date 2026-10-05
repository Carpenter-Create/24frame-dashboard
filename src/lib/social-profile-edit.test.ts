import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { avatarObjectKey } from "@/lib/account-avatar";
import { FORM_CONTROL_TEXT_CLASS } from "@/lib/form-control";
import {
  SOCIAL_FIGMA_PROFILE_BIO,
  SOCIAL_FIGMA_PROFILE_EDIT,
  SOCIAL_FIGMA_PROFILE_OWN,
  SOCIAL_PROFILE_EDIT_HANDLE_CLASS,
  SOCIAL_PROFILE_EDIT_HANDLE_ERROR_CLASS,
} from "@/lib/social-chrome";
import {
  BIO_MAX,
  SOCIAL,
  SOCIAL_ROUTES,
  normalizeBio,
  socialBioCount,
  socialBioEnterSubmits,
  socialHandleDisplayError,
  socialProfilePublicUrl,
} from "@/lib/social";
import {
  SOCIAL_PROFILE_EDIT_LOCK,
  SOCIAL_PROFILE_OPTIMISTIC_COOKIE,
  applySocialProfileOptimistic,
  checkSocialProfileEditSave,
  clearSocialProfileOptimistic,
  durableSocialProfileOptimistic,
  mergeSocialProfileIdentity,
  parseSocialProfileOptimisticCookie,
  persistSocialProfileEdit,
  readSocialProfileOptimistic,
  readSocialProfileOptimisticCookie,
  readSocialProfileSaveHop,
  releaseSocialProfileSaveHop,
  socialProfileBioRowSummary,
  parseSocialProfileEditFace,
  socialProfileEditFace,
  socialProfileHandleRowSummary,
  socialProfileNameRowSummary,
  socialProfileEditFormData,
  socialProfileEditSeed,
  socialProfileOptimisticCookieWrite,
  socialProfileOptimisticFail,
  socialProfileOptimisticMatches,
  socialProfileOptimisticPublic,
  socialProfileSaveFieldError,
} from "@/lib/social-profile-edit";

const edit = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
const bio = readFileSync("src/components/social/social-profile-bio.tsx", "utf8");
const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const editPage = readFileSync("src/app/(app)/social/profile/edit/page.tsx", "utf8");
const bioPage = readFileSync("src/app/(app)/social/profile/edit/bio/page.tsx", "utf8");

describe("Social Profile Edit profile + Bio lock", () => {
  it("keeps the locked Figma frames and sole Edit profile entry", () => {
    expect(SOCIAL_FIGMA_PROFILE_EDIT).toEqual(["180:206", "180:1946", "181:2184"]);
    expect(SOCIAL_FIGMA_PROFILE_BIO).toEqual(["180:2004", "180:2026"]);
    expect(SOCIAL_FIGMA_PROFILE_OWN).toEqual(["181:230", "181:2000"]);
    expect(SOCIAL_PROFILE_EDIT_LOCK.entry).toBe("Edit profile");
    expect(SOCIAL_PROFILE_EDIT_LOCK.editHref).toBe("/social/profile/edit");
    expect(SOCIAL_PROFILE_EDIT_LOCK.bioHref).toBe("/social/profile/edit/bio");
    expect(profile).toContain("SOCIAL_ROUTES.profileEdit");
    expect(profile).toContain("SocialShareButton");
    expect(profile).not.toContain("#social-profile-edit");
    expect(profile).not.toContain("<details");
    expect(profile).not.toContain("<summary");
    expect(profile).not.toContain("Education");
    expect(edit).toContain("data-social-profile-edit");
    expect(edit).toContain(SOCIAL.profile.username);
    expect(edit).toContain("data-social-profile-edit-name-open");
    expect(edit).toContain("data-social-profile-edit-handle-open");
    expect(edit).not.toContain("socialProfilePublicUrl");
    expect(edit).toContain("uploadAccountPhoto");
    expect(edit).toContain("removeAccountPhoto");
    expect(edit).toContain("SocialProfileAvatarSheet");
    expect(edit).toContain("data-social-profile-edit-links-open");
    expect(edit).toContain("SocialProfileBioEditor");
    expect(edit).toContain("data-social-profile-edit-bio-open");
    expect(edit).not.toContain("SOCIAL_ROUTES.profileBio");
    expect(edit.slice(edit.indexOf("data-social-profile-edit-links-open"))).not.toContain("<Link");
    expect(SOCIAL_PROFILE_EDIT_LOCK.keepsDraftOnBio).toBe(true);
    expect(socialProfileEditFace(true)).toBe("bio");
    expect(socialProfileEditFace(false)).toBe("edit");
    expect(socialProfileEditFace("roles")).toBe("roles");
    expect(socialProfileEditFace("topics")).toBe("topics");
    expect(socialProfileEditFace("imdb")).toBe("imdb");
    expect(socialProfileEditFace("links")).toBe("links");
    expect(socialProfileEditFace("name")).toBe("name");
    expect(socialProfileEditFace("handle")).toBe("handle");
    expect(parseSocialProfileEditFace("topics")).toBe("topics");
    expect(parseSocialProfileEditFace("nope")).toBe("edit");
    expect(parseSocialProfileEditFace(undefined)).toBe("edit");
    expect(SOCIAL_PROFILE_EDIT_LOCK.profileUrlOnEditFace).toBe(false);
    expect(SOCIAL_PROFILE_EDIT_LOCK.handleBareField).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.indexDrillOnly).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.nameDrillIn).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.handleDrillIn).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.avatarSheet).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.professionsDrillIn).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.topicsDrillIn).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.imdbDrillIn).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.linksDrillIn).toBe(true);
    expect(edit).toContain("SettingsDrillRow");
    expect(edit).toContain("SocialProfileNameEditor");
    expect(edit).toContain("SocialProfileHandleEditor");
    expect(edit).not.toContain("SocialHandleField");
    expect(edit).toContain("SocialProfileRolesEditor");
    expect(edit).toContain("SocialProfileTopicsEditor");
    expect(edit).toContain("SocialProfileImdbEditor");
    expect(edit).toContain("SocialProfileLinksEditor");
    expect(edit).toContain('socialProfileEditFace("roles")');
    expect(edit).toContain('socialProfileEditFace("topics")');
    expect(edit).toContain('socialProfileEditFace("imdb")');
    expect(edit).toContain('socialProfileEditFace("links")');
    expect(edit).toContain('socialProfileEditFace("name")');
    expect(edit).toContain('socialProfileEditFace("handle")');
    expect(edit).not.toContain("SocialProfileRolesField");
    expect(edit).not.toContain("SocialProfileTopicsField");
    expect(socialProfileBioRowSummary("")).toBe(SOCIAL.profile.bioAdd);
    expect(socialProfileBioRowSummary("Writes engines.")).toBe("Writes engines.");
    expect(socialProfileNameRowSummary("")).toBe(SOCIAL.profile.nameAdd);
    expect(socialProfileNameRowSummary("Ada Lovelace")).toBe("Ada Lovelace");
    expect(socialProfileHandleRowSummary("")).toBe(SOCIAL.profile.usernameAdd);
    expect(socialProfileHandleRowSummary("ada")).toBe("@ada");
    expect(edit).not.toContain("Instagram");
    expect(edit).not.toContain("Reels");
  });

  it("locks handle UX and the empty-handle error", () => {
    expect(SOCIAL.profile.handleRequired).toBe("Handle is required");
    expect(SOCIAL_PROFILE_EDIT_LOCK.handleRequired).toBe("Handle is required");
    expect(SOCIAL_PROFILE_EDIT_LOCK.emptyPreview).toBe("https://24frame.co/@");
    expect(SOCIAL_PROFILE_EDIT_LOCK.profileUrlOnEditFace).toBe(false);
    expect(socialProfilePublicUrl("")).toBe("https://24frame.co/@");
    expect(edit).not.toContain("data-social-handle-url");
    expect(readFileSync("src/components/social/social-handle-field.tsx", "utf8")).toContain(
      "data-social-handle-required",
    );
    expect(edit).toContain("checkSocialProfileEditSave");
    expect(edit).toContain("handleInvalid");
    const saveSoT = readFileSync("src/lib/social-profile-edit.ts", "utf8");
    const handleFace = readFileSync("src/components/social/social-profile-handle-edit.tsx", "utf8");
    expect(saveSoT).toContain("socialHandleInputError");
    expect(saveSoT).not.toContain("socialHandleDisplayError");
    expect(handleFace).toContain("socialHandleDisplayError");
    expect(handleFace).toContain("socialHandleInputError");
    const forms = readFileSync("src/components/social/social-profile-create-form.tsx", "utf8");
    expect(forms).toContain("socialHandleDisplayError(next, prev)");
    expect(edit).not.toContain("app.24frame.co");
  });

  it("locks Bio to 150 chars, house privacy copy, and Sporty Blue check Done", () => {
    expect(BIO_MAX).toBe(150);
    expect(SOCIAL.profile.bioPrivacy).toBe("Your bio shows on your public profile.");
    expect(bio).toContain("data-social-bio-done");
    expect(bio).toContain('icon: true');
    const face = readFileSync("src/components/social/social-profile-edit-face.tsx", "utf8");
    expect(face).toContain('name="check"');
    expect(face).toContain("SOCIAL_PROFILE_BIO_DONE_CLASS");
    expect(bio).toContain("data-social-bio-privacy");
    expect(bio).toContain("maxLength={BIO_MAX}");
    expect(face).toContain('type="button"');
    expect(bio).not.toContain("onKeyDown");
    expect(bio).not.toContain("preventDefault");
    expect(bio).toContain("normalizeBio(value)");
    expect(bio.indexOf("onSaved(next)")).toBeLessThan(bio.indexOf("updateSocialBio(form)"));
    expect(bio).not.toContain("<form");
    expect(socialBioEnterSubmits()).toBe(false);
    expect(normalizeBio("Founder\nInvestor")).toBe("Founder\nInvestor");
    expect(socialBioCount("Founder\nInvestor")).toBe(16);
  });

  it("reuses the app-wide avatar SoT and edits links in place", () => {
    expect(avatarObjectKey("11111111-1111-4111-8111-111111111111")).toBe(
      "avatars/11111111-1111-4111-8111-111111111111/avatar",
    );
    expect(editPage).toContain("signedAvatarUrl");
    expect(editPage).not.toContain("putAvatarObject");
    expect(editPage).not.toContain("S3_AVATARS_BUCKET");
    expect(edit).toContain("uploadAccountPhoto");
    expect(edit).toContain("SOCIAL.profile.editPicture");
    expect(edit).toContain("socialProfileLinksRowSummary");
    expect(edit).toContain("parseSocialWebsiteUrlField");
    expect(edit).toContain("checkSocialProfileEditSave");
    expect(edit).toContain("router.push(SOCIAL_ROUTES.profile)");
    expect(edit).not.toContain("router.refresh()");
    expect(edit).toContain("flushSync");
    expect(edit.indexOf("flushSync")).toBeLessThan(edit.indexOf("router.push(SOCIAL_ROUTES.profile)"));
    expect(edit.indexOf("router.push(SOCIAL_ROUTES.profile)")).toBeLessThan(
      edit.indexOf("persistSocialProfileEdit(checked.form)"),
    );
    expect(edit).not.toContain("createSocialProfile");
    expect(edit).toContain("persistSocialProfileEdit");
    expect(readFileSync("src/lib/social-profile-edit.ts", "utf8")).toContain('form.set("links"');
    expect(edit).not.toContain("SOCIAL_ROUTES.profileBio}/link");
    expect(bioPage).toContain("SocialProfileBioEditor");
    expect(SOCIAL_ROUTES.profileEdit).toBe("/social/profile/edit");
  });

  it("puts Edit/Bio Name, Username, and Bio on the shared form-control primitive", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(globals).toMatch(/\.t-control\s*\{[\s\S]*?font-size:\s*16px/);
    expect(globals).toMatch(/\.t-body\s*\{[\s\S]*?font-size:\s*var\(--text-base\)/);
    expect(globals).toMatch(/\.t-body-sm\s*\{[\s\S]*?font-size:\s*var\(--text-sm\)/);
    expect(SOCIAL_PROFILE_EDIT_HANDLE_CLASS).toContain(FORM_CONTROL_TEXT_CLASS);
    expect(SOCIAL_PROFILE_EDIT_HANDLE_CLASS).not.toContain("t-body-sm");
    expect(SOCIAL_PROFILE_EDIT_HANDLE_ERROR_CLASS).toContain(FORM_CONTROL_TEXT_CLASS);
    expect(SOCIAL_PROFILE_EDIT_HANDLE_ERROR_CLASS).not.toContain("t-body-sm");
    const nameFace = readFileSync("src/components/social/social-profile-name.tsx", "utf8");
    const handleFace = readFileSync("src/components/social/social-profile-handle-edit.tsx", "utf8");
    expect(nameFace).toContain("<Input");
    expect(nameFace).toContain('variant="bare"');
    expect(nameFace).toContain('id="social-edit-first-name"');
    expect(nameFace).toContain('id="social-edit-middle-name"');
    expect(nameFace).toContain('id="social-edit-last-name"');
    expect(nameFace).not.toContain('id="social-edit-name"');
    expect(handleFace).toContain('id="social-edit-handle"');
    expect(edit).not.toContain("<Input");
    expect(edit).not.toContain('id="social-edit-first-name"');
    expect(edit).not.toContain('id="social-edit-handle"');
    expect(edit).toContain("SocialProfileRolesEditor");
    expect(edit).toContain("SocialProfileTopicsEditor");
    expect(edit).toContain("checkSocialProfileEditSave");
    expect(edit).toContain("SocialProfileImdbEditor");
    const saveSoT = readFileSync("src/lib/social-profile-edit.ts", "utf8");
    expect(saveSoT).toContain('form.set("crafts"');
    expect(saveSoT).toContain('form.set("topics"');
    expect(saveSoT).toContain('form.set("imdb_url"');
    expect(edit).toContain("AccountAvatarCrop");
    expect(edit).toContain("accountAvatarPickError");
    expect(edit).toContain("data-social-profile-edit-avatar-drop");
    expect(edit).toContain("SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS");
    expect(edit).toContain("data-dropping");
    expect(bio).toContain("<Textarea");
    expect(bio).toContain("data-social-bio-textarea");
    expect(edit).not.toContain("maximum-scale");
    expect(bio).not.toContain("maximum-scale");
    expect(layout).not.toContain("maximum-scale");
    expect(readFileSync("src/app/(app)/social/profile/loading.tsx", "utf8")).toContain(
      "SocialProfileOptimisticShell",
    );
    expect(readFileSync("src/app/(app)/social/profile/loading.tsx", "utf8")).toContain(
      "readSocialProfileOptimisticCookie",
    );
    expect(readFileSync("src/app/(app)/social/layout.tsx", "utf8")).toContain("SocialProfileSaveHop");
    expect(profile).toContain("readSocialProfileOptimisticCookie");
    expect(profile).toContain("mergeSocialProfileIdentity");
  });
});

describe("Social profile optimistic Save SoT", () => {
  afterEach(() => {
    clearSocialProfileOptimistic();
    vi.unstubAllGlobals();
  });

  const draft = {
    username: "ada",
    firstName: "Ada",
    middleName: "",
    lastName: "Lovelace",
    bio: "Writes engines.",
    crafts: ["director"],
    topics: ["Directors"],
    imdbUrl: "nm1234567",
    links: ["https://example.com"],
    photoUrl: "blob:photo",
    welcomeVideoUrl: null,
  };

  const server = {
    handle: "ada",
    displayName: "Ada Lovelace",
    bio: "Writes engines.",
    photoUrl: "https://s3.example/old",
    coverUrl: null,
    welcomeVideoUrl: null,
    crafts: ["director"],
    topics: ["Directors"],
    imdbUrl: "https://www.imdb.com/name/nm1234567/",
    websiteUrl: "https://example.com/",
  };

  it("applies the draft immediately and classifies handle vs form errors", () => {
    const checked = checkSocialProfileEditSave(draft);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.snapshot.handle).toBe("ada");
    expect(checked.snapshot.displayName).toBe("Ada Lovelace");
    expect(checked.form.get("handle")).toBe("ada");
    expect(checked.form.get("crafts")).toBe(JSON.stringify(["director"]));
    expect(checked.form.get("topics")).toBe(JSON.stringify(["Directors"]));
    expect(socialProfileEditFormData(draft).get("imdb_url")).toBe("nm1234567");
    expect(SOCIAL_PROFILE_EDIT_LOCK.optimisticSave).toBe(true);
    expect(SOCIAL_PROFILE_EDIT_LOCK.saveHop).toBe(true);

    applySocialProfileOptimistic(checked.snapshot);
    expect(readSocialProfileOptimistic()?.displayName).toBe("Ada Lovelace");
    expect(readSocialProfileSaveHop()).toBe(true);
    expect(socialProfileOptimisticPublic(checked.snapshot)).toBe(true);
    releaseSocialProfileSaveHop();
    expect(readSocialProfileSaveHop()).toBe(false);
    expect(readSocialProfileOptimistic()?.displayName).toBe("Ada Lovelace");
    const merged = mergeSocialProfileIdentity(
      { ...server, displayName: "Old Name", photoUrl: "https://s3.example/old" },
      checked.snapshot,
    );
    expect(merged.displayName).toBe("Ada Lovelace");
    expect(merged.photoUrl).toBe("blob:photo");

    expect(socialProfileSaveFieldError(SOCIAL.profile.handleTaken)).toBe("handle");
    expect(socialProfileSaveFieldError(SOCIAL.profile.imdbInvalid)).toBe("form");
    const failed = socialProfileOptimisticFail(checked.snapshot, SOCIAL.profile.handleTaken);
    expect(failed.handleError).toBe(SOCIAL.profile.handleTaken);
    expect(failed.error).toBe("");
    applySocialProfileOptimistic(failed);
    const seeded = socialProfileEditSeed({ ...server, displayName: "Old Name" });
    expect(seeded.displayName).toBe("Ada Lovelace");
    expect(seeded.handleError).toBe(SOCIAL.profile.handleTaken);
    expect(
      mergeSocialProfileIdentity({ ...server, displayName: "Old Name" }, failed).displayName,
    ).toBe("Old Name");
    expect(socialProfileOptimisticMatches(server, { ...checked.snapshot, photoUrl: server.photoUrl })).toBe(
      true,
    );
    expect(socialProfileOptimisticMatches(server, checked.snapshot)).toBe(false);
    clearSocialProfileOptimistic();
    expect(readSocialProfileOptimistic()).toBeNull();
  });

  it("rejects empty handle and invalid IMDb before persist", () => {
    expect(checkSocialProfileEditSave({ ...draft, username: "@ada" }).ok).toBe(true);
    expect(checkSocialProfileEditSave({ ...draft, username: "@" }).ok).toBe(false);
    expect(checkSocialProfileEditSave({ ...draft, username: "@" })).toEqual({
      ok: false,
      handleError: SOCIAL.profile.handleRequired,
    });
    expect(checkSocialProfileEditSave({ ...draft, username: "" })).toEqual({
      ok: false,
      handleError: SOCIAL.profile.handleRequired,
    });
    expect(
      socialHandleDisplayError("@", SOCIAL.profile.handleTaken),
    ).toBe(SOCIAL.profile.handleRequired);
    expect(checkSocialProfileEditSave({ ...draft, imdbUrl: "not-imdb" })).toEqual({
      ok: false,
      error: SOCIAL.profile.imdbInvalid,
    });
    const missingName = checkSocialProfileEditSave({ ...draft, firstName: "" });
    expect(missingName.ok).toBe(false);
    if (missingName.ok) return;
    expect(missingName.error).toBe(SOCIAL.profile.firstNameRequired);
  });

  it("persists over fetch so Done does not refresh the tree", async () => {
    expect(SOCIAL_PROFILE_EDIT_LOCK.saveHref).toBe("/api/social/profile");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const form = socialProfileEditFormData(draft);
    expect(await persistSocialProfileEdit(form)).toEqual({});
    expect(fetchMock).toHaveBeenCalledWith("/api/social/profile", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: SOCIAL.profile.handleTaken }), { status: 400 }),
    );
    expect(await persistSocialProfileEdit(form)).toEqual({ error: SOCIAL.profile.handleTaken });
    vi.unstubAllGlobals();
  });

  it("bridges the Save hop on a cookie the loading SSR can paint", () => {
    const checked = checkSocialProfileEditSave(draft);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const durable = durableSocialProfileOptimistic(checked.snapshot);
    expect(durable.photoUrl).toBeUndefined();
    expect(durable.displayName).toBe("Ada Lovelace");
    const cookie = socialProfileOptimisticCookieWrite(checked.snapshot);
    expect(cookie).toContain(`${SOCIAL_PROFILE_OPTIMISTIC_COOKIE}=`);
    expect(cookie).toContain("path=/social");
    expect(cookie).not.toContain("blob:");
    const encoded = cookie.slice(
      `${SOCIAL_PROFILE_OPTIMISTIC_COOKIE}=`.length,
      cookie.indexOf(";"),
    );
    expect(parseSocialProfileOptimisticCookie(encoded)?.displayName).toBe("Ada Lovelace");
    expect(
      readSocialProfileOptimisticCookie((name) =>
        name === SOCIAL_PROFILE_OPTIMISTIC_COOKIE ? encoded : undefined,
      )?.handle,
    ).toBe("ada");
    expect(
      parseSocialProfileOptimisticCookie(
        encodeURIComponent(JSON.stringify({ ...checked.snapshot, error: SOCIAL.profile.handleTaken })),
      ),
    ).toBeNull();
    applySocialProfileOptimistic(socialProfileOptimisticFail(checked.snapshot, SOCIAL.profile.handleTaken));
    expect(readSocialProfileSaveHop()).toBe(false);
    expect(socialProfileOptimisticPublic(readSocialProfileOptimistic())).toBe(false);
  });
});
