import { describe, expect, it } from "vitest";

import { avatarObjectKey, avatarRecheckObjectKey } from "@/lib/account-avatar";
import { bucketAvatarKeys, unfinishedSwapKeys } from "@/lib/avatar-key-report";

const USER = "11111111-1111-4111-8111-111111111111";
const NEXT = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
const PREVIOUS = avatarRecheckObjectKey(USER, "22222222-2222-4222-8222-222222222222");

describe("avatar key report buckets", () => {
  it("puts a named key in liveKeys and leaves orphanKeys empty", () => {
    expect(bucketAvatarKeys(USER, [NEXT, PREVIOUS], { ok: true, pointer: NEXT })).toEqual({
      orphanKeys: [PREVIOUS],
      liveKeys: [NEXT],
      unverifiedKeys: [],
    });
    expect(bucketAvatarKeys(USER, [avatarObjectKey(USER)], { ok: true, pointer: null })).toEqual({
      orphanKeys: [],
      liveKeys: [avatarObjectKey(USER)],
      unverifiedKeys: [],
    });
  });

  it("keeps a late commit off the orphan list", () => {
    expect(unfinishedSwapKeys(NEXT, PREVIOUS)).toEqual({
      orphanKeys: [],
      liveKeys: [],
      unverifiedKeys: [NEXT, PREVIOUS],
    });
    expect(unfinishedSwapKeys(NEXT, PREVIOUS).orphanKeys).not.toContain(NEXT);
    expect(unfinishedSwapKeys(NEXT, PREVIOUS).orphanKeys).not.toContain(PREVIOUS);
  });

  it("puts every key in unverifiedKeys when the pointer read failed", () => {
    expect(bucketAvatarKeys(USER, [NEXT], { ok: false })).toEqual({
      orphanKeys: [],
      liveKeys: [],
      unverifiedKeys: [NEXT],
    });
  });
});
