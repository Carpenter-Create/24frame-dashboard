import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  AVATAR_ACCEPT,
  AVATAR_CONTENT_TYPES,
  AVATAR_KEY_PREFIX,
  AVATAR_MAX_BYTES,
  AVATAR_OBJECT_NAME,
  AVATAR_SIGNED_URL_TTL_SECONDS,
  ACCOUNT_PHOTO_HREF,
  accountPhotoSrc,
  AVATAR_CLEARED,
  avatarObjectKey,
  avatarRecheckObjectKey,
  avatarQuarantineObjectKey,
  avatarServeKey,
  isAvatarContentType,
  isAvatarObjectKey,
} from "./account-avatar";

const UID = "11111111-1111-4111-8111-111111111111";
const here = dirname(fileURLToPath(import.meta.url));
const avatarSrc = readFileSync(join(here, "account-avatar.ts"), "utf8");
const s3AvatarsSrc = readFileSync(join(here, "s3-avatars.ts"), "utf8");
const s3TitlesSrc = readFileSync(join(here, "s3.ts"), "utf8");
const assetsSrc = readFileSync(join(here, "assets.ts"), "utf8");
const layoutSrc = readFileSync(join(here, "../app/(app)/layout.tsx"), "utf8");
const settingsSrc = readFileSync(join(here, "../components/settings/profile-settings.tsx"), "utf8");
const formSrc = readFileSync(join(here, "../app/(app)/account/account-profile-form.tsx"), "utf8");
const socialProfileSrc = readFileSync(join(here, "../app/(app)/social/profile/page.tsx"), "utf8");
const socialFormsSrc = readFileSync(join(here, "../components/social/social-profile-photo-form.tsx"), "utf8");
const uploadSrc = readFileSync(join(here, "../app/(app)/account/actions.ts"), "utf8");
const photoRouteSrc = readFileSync(join(here, "../app/api/account/photo/route.ts"), "utf8");

describe("avatarObjectKey", () => {
  it("is avatars/{user-id}/avatar and nothing else", () => {
    expect(avatarObjectKey(UID)).toBe(`avatars/${UID}/avatar`);
    expect(AVATAR_KEY_PREFIX).toBe("avatars");
    expect(AVATAR_OBJECT_NAME).toBe("avatar");
    expect(isAvatarObjectKey(`avatars/${UID}/avatar`, UID)).toBe(true);
    const objectId = "22222222-2222-4222-8222-222222222222";
    const recheck = avatarRecheckObjectKey(UID, objectId);
    expect(recheck).toBe(`avatars/${UID}/recheck/${objectId}`);
    expect(recheck).not.toBe(avatarObjectKey(UID));
    expect(avatarServeKey(UID, null)).toBe(avatarObjectKey(UID));
    expect(avatarServeKey(UID, avatarObjectKey(UID))).toBe(avatarObjectKey(UID));
    expect(avatarServeKey(UID, recheck)).toBe(recheck);
    expect(avatarServeKey(UID, AVATAR_CLEARED)).toBeNull();
    const other = "33333333-3333-4333-8333-333333333333";
    const foreign = avatarRecheckObjectKey(other, objectId);
    expect(avatarServeKey(UID, foreign)).toBe(avatarObjectKey(UID));
    expect(avatarServeKey(UID, foreign)).not.toBe(foreign);
    const quarantine = avatarQuarantineObjectKey(UID, objectId);
    expect(avatarServeKey(UID, quarantine)).toBeNull();
    expect(avatarServeKey(UID, avatarQuarantineObjectKey(other, objectId))).toBeNull();
  });

  it("rejects a non-UUID so title paths cannot be smuggled in", () => {
    expect(() => avatarObjectKey("u1")).toThrow(/UUID/);
    expect(() => avatarObjectKey("../titles/x")).toThrow(/UUID/);
    expect(() => avatarObjectKey(`orgs/o/titles/t/poster/${UID}/file`)).toThrow(/UUID/);
    expect(isAvatarObjectKey(`orgs/o/titles/t/poster/${UID}/file`, UID)).toBe(false);
    expect(isAvatarObjectKey(`avatars/${UID}/avatar`, "22222222-2222-4222-8222-222222222222")).toBe(
      false,
    );
  });
});

describe("accountPhotoSrc", () => {
  it("keeps a signed GET and treats empty as no face", () => {
    expect(accountPhotoSrc("https://s3.example/signed-avatar")).toBe(
      "https://s3.example/signed-avatar",
    );
    expect(accountPhotoSrc("  https://s3.example/signed-avatar  ")).toBe(
      "https://s3.example/signed-avatar",
    );
    expect(accountPhotoSrc(null)).toBeNull();
    expect(accountPhotoSrc(undefined)).toBeNull();
    expect(accountPhotoSrc("")).toBeNull();
    expect(accountPhotoSrc("   ")).toBeNull();
    expect(accountPhotoSrc(ACCOUNT_PHOTO_HREF)).toBe(ACCOUNT_PHOTO_HREF);
    expect(ACCOUNT_PHOTO_HREF).toBe("/api/account/photo");
  });
});

describe("avatar content rules", () => {
  it("allows jpeg/png/webp only, caps at 2 MB, and signs for 5 minutes", () => {
    expect(AVATAR_CONTENT_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(isAvatarContentType("image/jpeg")).toBe(true);
    expect(isAvatarContentType("image/png")).toBe(true);
    expect(isAvatarContentType("image/webp")).toBe(true);
    expect(isAvatarContentType("image/gif")).toBe(false);
    expect(isAvatarContentType("application/octet-stream")).toBe(false);
    expect(AVATAR_ACCEPT).toBe("image/jpeg,image/png,image/webp");
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(AVATAR_SIGNED_URL_TTL_SECONDS).toBe(300);
  });
});

describe("one face across chrome, Settings, and Social", () => {
  it("signs avatars/{user-id}/avatar from the session user and keeps one upload", () => {
    const chromeSrc = readFileSync(join(here, "app-shell-chrome.ts"), "utf8");
    expect(chromeSrc).not.toContain("hasAvatarObject");
    expect(chromeSrc).toContain("ACCOUNT_PHOTO_HREF");
    expect(chromeSrc).toContain("photoUrl: ACCOUNT_PHOTO_HREF");
    expect(layoutSrc).toContain("loadAppShellChrome()");
    expect(layoutSrc).not.toContain("signedAvatarUrl");
    expect(chromeSrc).not.toContain("signedAvatarUrl");
    expect(settingsSrc).toContain("ACCOUNT_PHOTO_HREF");
    expect(settingsSrc).not.toContain("signedAvatarUrl");
    expect(formSrc).toContain("uploadAccountPhoto");
    expect(formSrc).toContain("cropAvatarFile");
    expect(formSrc).toContain("AccountAvatarCrop");
    expect(socialProfileSrc).toContain("socialAvatarHref(profile.id)");
    expect(socialProfileSrc).not.toContain("SocialProfilePhotoForm");
    expect(socialProfileSrc).not.toContain("uploadAccountPhoto");
    expect(socialProfileSrc).not.toContain("putAvatarObject");
    expect(socialFormsSrc).toContain("uploadAccountPhoto");
    expect(socialFormsSrc).toContain('body.set("photo", file)');
    expect(socialFormsSrc).not.toContain("putAvatarObject");
    expect(socialFormsSrc).not.toContain("avatarObjectKey");
    expect(socialFormsSrc).not.toContain("S3_MEDIA");
    const uploadFn = uploadSrc.slice(
      uploadSrc.indexOf("export async function uploadAccountPhoto"),
      uploadSrc.indexOf("export async function removeAccountPhoto"),
    );
    expect(uploadFn).toContain("storeAvatarReplacement(");
    expect(uploadFn).toContain("deleteReplacedAvatarObjects(");
    expect(uploadFn.indexOf("storeAvatarReplacement(")).toBeLessThan(uploadFn.indexOf("deleteReplacedAvatarObjects("));
    expect(uploadFn).not.toContain("deleteAvatarObject(");
    expect(uploadSrc).toContain("deleteAvatarObject(ctx.user.id");
    expect(uploadSrc).toContain("removeAccountPhoto");
    expect(uploadSrc).toContain('revalidatePath("/", "layout")');
    expect(photoRouteSrc).toContain("avatarKeyFromProfileRead");
    expect(photoRouteSrc).toContain("signedAvatarUrl(user.id, pointer.key)");
    expect(photoRouteSrc).toContain("private, no-store");
    expect(photoRouteSrc).not.toContain("activeOrg");
    expect(layoutSrc).not.toContain("putAvatarObject");
    expect(layoutSrc).not.toContain("S3_BUCKET");
  });
});

describe("avatars stay off the title bucket", () => {
  it("never mentions S3_BUCKET, title keys, CloudFront, or Supabase Storage", () => {
    expect(avatarSrc).not.toContain("process.env.S3_BUCKET");
    expect(avatarSrc).not.toMatch(/orgs\/\$\{/);
    expect(s3AvatarsSrc).toContain("S3_AVATARS_BUCKET");
    expect(s3AvatarsSrc).toContain("must be a dedicated bucket, not S3_BUCKET");
    expect(s3AvatarsSrc).not.toMatch(/from ["']@\/lib\/s3["']/);
    expect(s3AvatarsSrc).not.toContain("CLOUDFRONT");
    expect(s3AvatarsSrc).not.toContain("supabase.storage");
    expect(s3TitlesSrc).not.toContain("S3_AVATARS_BUCKET");
    expect(assetsSrc).toContain("orgs/${orgId}/titles/");
    expect(assetsSrc).not.toContain("avatars/");
  });
});
