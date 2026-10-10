import { describe, expect, it, vi } from "vitest";

import { AVATAR_CLEARED, avatarObjectKey, avatarRecheckObjectKey } from "./account-avatar";
import {
  deleteAvatarOrphans,
  deleteOrphansWantsExecute,
  printDeleteAvatarOrphansResult,
} from "../../scripts/social/delete-avatar-orphans";
import { reportUnholdProcessFailure, unholdLiveAvatars, unholdWantsExecute } from "../../scripts/social/unhold-live-avatars";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("unholdLiveAvatars", () => {
  it("prints a plain-object unhold process message and exits 1", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const previousExit = process.exitCode;
    process.exitCode = undefined;
    try {
      reportUnholdProcessFailure({ message: "canceling statement due to statement timeout" });
      expect(errors).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledWith("canceling statement due to statement timeout");
      expect(process.exitCode).toBe(1);
    } finally {
      errors.mockRestore();
      process.exitCode = previousExit;
    }
  });

  it("is a dry run unless --execute is passed", () => {
    expect(unholdWantsExecute(["node", "unhold-live-avatars.ts"])).toBe(false);
    expect(unholdWantsExecute(["node", "unhold-live-avatars.ts", "--execute"])).toBe(true);
  });

  it("pages by id and removes any gc-hold value only when executing", async () => {
    const live = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
    const canonical = avatarObjectKey(OTHER);
    const pages = [
      [
        { id: "a", avatar_key: null },
        { id: "b", avatar_key: AVATAR_CLEARED },
        { id: USER, avatar_key: live },
      ],
      [{ id: OTHER, avatar_key: canonical }],
    ];
    const cursors: (string | null)[] = [];
    const cleared: string[] = [];
    const pointerReads: string[] = [];
    const dry = await unholdLiveAvatars({
      execute: false,
      pageSize: 3,
      loadPage: async (afterId) => {
        cursors.push(afterId);
        return pages[cursors.length - 1] ?? [];
      },
      readTags: async (key) => (key === live ? [{ Key: "gc-hold", Value: "keep" }] : []),
      readPointer: async (profileId) => {
        pointerReads.push(profileId);
        return live;
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(cursors).toEqual([null, USER]);
    expect(dry).toMatchObject({
      dryRun: true,
      pages: 2,
      checked: 3,
      held: 1,
      cleared: 0,
      skippedClears: 0,
      unverified: 0,
    });
    expect(cleared).toEqual([]);
    expect(pointerReads).toEqual([]);

    const executed = await unholdLiveAvatars({
      execute: true,
      pageSize: 3,
      loadPage: async (afterId) => (afterId === null ? pages[0]! : pages[1]!),
      readTags: async (key) => (key === live ? [{ Key: "gc-hold", Value: "keep" }] : []),
      readPointer: async (profileId) => {
        pointerReads.push(profileId);
        return live;
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(executed).toMatchObject({ dryRun: false, held: 1, cleared: 1, skippedClears: 0, unverified: 0 });
    expect(cleared).toEqual([live]);
    expect(pointerReads).toEqual([USER]);
  });

  it("skips the clear when a fresh read no longer names the key or the read fails", async () => {
    const stale = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
    const canonical = avatarObjectKey(USER);
    const cleared: string[] = [];
    const moved = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: stale }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => null,
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(moved).toMatchObject({ held: 1, cleared: 0, skippedClears: 1, unverified: 0 });
    expect(cleared).toEqual([]);

    const timedOut = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: stale }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => {
        throw new Error("timeout");
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(timedOut).toMatchObject({ held: 1, cleared: 0, skippedClears: 1, unverified: 0 });
    expect(cleared).toEqual([]);

    const stillNamed = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: canonical }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => null,
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(stillNamed).toMatchObject({ held: 1, cleared: 1, skippedClears: 0, unverified: 0 });
    expect(cleared).toEqual([canonical]);
  });

  it("clears a hold on a null pointer only when the fresh read is still null", async () => {
    const canonical = avatarObjectKey(USER);
    const moved = avatarRecheckObjectKey(USER, "44444444-4444-4444-8444-444444444444");
    const cleared: string[] = [];
    const pointerReads: string[] = [];
    const missing = Object.assign(new Error("NoSuchKey"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    });
    const absent = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: null }],
      readTags: async () => {
        throw missing;
      },
      readPointer: async () => {
        throw new Error("pointer was read for a missing canonical face");
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(absent).toMatchObject({ checked: 1, held: 0, cleared: 0, skippedClears: 0, unverified: 0 });
    expect(cleared).toEqual([]);

    const dry = await unholdLiveAvatars({
      execute: false,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: null }],
      readTags: async (key) => (key === canonical ? [{ Key: "gc-hold", Value: "quarantine" }] : []),
      readPointer: async (profileId) => {
        pointerReads.push(profileId);
        return null;
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(dry).toMatchObject({ held: 1, cleared: 0, skippedClears: 0 });
    expect(pointerReads).toEqual([]);

    const stillNull = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: null }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async (profileId) => {
        pointerReads.push(profileId);
        return null;
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(stillNull).toMatchObject({ held: 1, cleared: 1, skippedClears: 0, unverified: 0 });
    expect(cleared).toEqual([canonical]);
    expect(pointerReads).toEqual([USER]);

    const changed = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: null }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => moved,
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(changed).toMatchObject({ held: 1, cleared: 0, skippedClears: 1, unverified: 0 });
    expect(cleared).toEqual([canonical]);

    const timedOut = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: null }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => {
        throw new Error("timeout");
      },
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(timedOut).toMatchObject({ held: 1, cleared: 0, skippedClears: 1, unverified: 0 });
    expect(cleared).toEqual([canonical]);
  });

  it("counts a tag read failure as unverified and does not clear it", async () => {
    const key = avatarObjectKey(USER);
    const cleared: string[] = [];
    const report = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: key }],
      readTags: async () => {
        throw new Error("timeout");
      },
      readPointer: async () => {
        throw new Error("pointer was read after a failed tag read");
      },
      clearTag: async (row) => {
        cleared.push(row);
      },
    });
    expect(report).toMatchObject({ checked: 1, held: 0, cleared: 0, unverified: 1 });
    expect(cleared).toEqual([]);
  });

  it("skips a key owned by another profile and counts the row", async () => {
    const foreign = avatarObjectKey(OTHER);
    const cleared: string[] = [];
    const report = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: USER, avatar_key: foreign }],
      readTags: async () => [{ Key: "gc-hold", Value: "quarantine" }],
      readPointer: async () => foreign,
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(report).toMatchObject({ checked: 1, held: 0, cleared: 0, skippedClears: 1, unverified: 0 });
    expect(cleared).toEqual([]);
    expect(avatarObjectKey(USER)).not.toBe(foreign);
  });
});

describe("deleteAvatarOrphans", () => {
  it("is a dry run unless --execute is passed", () => {
    expect(deleteOrphansWantsExecute(["node", "delete-avatar-orphans.ts", "avatars/a/avatar"])).toBe(false);
    expect(deleteOrphansWantsExecute(["node", "delete-avatar-orphans.ts", "--execute"])).toBe(true);
  });

  it("re-reads the pointer before each delete and skips a live or unread key", async () => {
    const live = avatarObjectKey(USER);
    const orphan = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
    const foreign = "posts/org/photo.jpg";
    const deleted: string[] = [];
    const dry = await deleteAvatarOrphans({
      execute: false,
      keys: [live, orphan, foreign],
      readPointer: async () => null,
      deleteKey: async (key) => {
        deleted.push(key);
      },
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.pending).toEqual([orphan]);
    expect(dry.liveKeys).toEqual([live]);
    expect(dry.unverifiedKeys).toEqual([foreign]);
    expect(deleted).toEqual([]);

    const executed = await deleteAvatarOrphans({
      execute: true,
      keys: [live, orphan],
      readPointer: async (userId) => (userId === USER ? null : live),
      deleteKey: async (key) => {
        deleted.push(key);
      },
    });
    expect(executed.deleted).toEqual([orphan]);
    expect(executed.liveKeys).toEqual([live]);
    expect(deleted).toEqual([orphan]);

    const unread = await deleteAvatarOrphans({
      execute: true,
      keys: [orphan],
      readPointer: async () => {
        throw new Error("timeout");
      },
      deleteKey: async (key) => {
        deleted.push(key);
      },
    });
    expect(unread.unverifiedKeys).toEqual([orphan]);
    expect(unread.deleted).toEqual([]);
    expect(deleted).toEqual([orphan]);
  });

  it("prints the partial report when a delete throws", async () => {
    const first = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
    const second = avatarRecheckObjectKey(USER, "44444444-4444-4444-8444-444444444444");
    const lines: string[] = [];
    const errors: string[] = [];
    const previousExit = process.exitCode;
    process.exitCode = undefined;
    try {
      await printDeleteAvatarOrphansResult(true, [first, second], {
        readPointer: async () => null,
        deleteKey: async (key) => {
          if (key === second) throw new Error("delete failed");
        },
        log: (line) => {
          lines.push(line);
        },
        fail: (line) => {
          errors.push(line);
        },
      });
      const printed = lines.map((line) => JSON.parse(line) as { deleted?: string[]; msg?: string });
      expect(printed).toEqual([
        expect.objectContaining({
          msg: "delete avatar orphans",
          deleted: [first],
        }),
      ]);
      expect(errors).toEqual(["delete failed"]);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExit;
    }
  });
});
