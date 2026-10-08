import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ACCOUNT_PHOTO_HREF, avatarObjectKey } from "./account-avatar";

// One avatar per person (Adam 2026-10-08): "the avatar should always use
// whatever the users 24frame avatar in their global settings is. however,
// if they update the avatar on social, then the avatar should upsert
// globally. two-way." Two-way by construction: one object
// (avatars/{user-id}/avatar), written only through the account actions,
// which Settings and every Social photo editor call.
const sources = execSync("git ls-files 'src/**/*.ts' 'src/**/*.tsx'", { encoding: "utf8" })
  .split("\n")
  .filter((file) => file && !file.includes(".test."));
const using = (needle: string) => sources.filter((file) => readFileSync(file, "utf8").includes(needle));

describe("one avatar, read and written from one place", () => {
  it("keys every face to the one object per person", () => {
    expect(avatarObjectKey("00000000-0000-4000-8000-000000000001")).toBe(
      "avatars/00000000-0000-4000-8000-000000000001/avatar",
    );
    expect(using("avatarObjectKey(").sort()).toEqual(["src/lib/account-avatar.ts", "src/lib/s3-avatars.ts"]);
  });

  it("writes it only through the account actions", () => {
    expect(using("putAvatarObject(").sort()).toEqual(["src/app/(app)/account/actions.ts", "src/lib/s3-avatars.ts"]);
    expect(using("deleteAvatarObject(").sort()).toEqual(["src/app/(app)/account/actions.ts", "src/lib/s3-avatars.ts"]);
  });

  it("has Social's photo editors upsert the global avatar, not a Social copy", () => {
    for (const file of [
      "src/components/social/social-profile-edit.tsx",
      "src/components/social/social-profile-avatar-edit.tsx",
      "src/components/social/social-profile-photo-form.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain('from "@/app/(app)/account/actions"');
      expect(source, file).toContain("uploadAccountPhoto(");
    }
    expect(ACCOUNT_PHOTO_HREF).toBe("/api/account/photo");
  });
});
