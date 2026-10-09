import { describe, expect, it } from "vitest";

import { AVATAR_CLEARED, avatarObjectKey, avatarRecheckObjectKey } from "./account-avatar";
import { deleteAvatarOrphans, deleteOrphansWantsExecute } from "../../scripts/social/delete-avatar-orphans";
import { unholdLiveAvatars, unholdWantsExecute } from "../../scripts/social/unhold-live-avatars";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("unholdLiveAvatars", () => {
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
        { id: "c", avatar_key: live },
      ],
      [{ id: "d", avatar_key: canonical }],
    ];
    const cursors: (string | null)[] = [];
    const cleared: string[] = [];
    const dry = await unholdLiveAvatars({
      execute: false,
      pageSize: 3,
      loadPage: async (afterId) => {
        cursors.push(afterId);
        return pages[cursors.length - 1] ?? [];
      },
      readTags: async (key) => (key === live ? [{ Key: "gc-hold", Value: "keep" }] : []),
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(cursors).toEqual([null, "c"]);
    expect(dry).toMatchObject({ dryRun: true, pages: 2, checked: 3, held: 1, cleared: 0, unverified: 0 });
    expect(cleared).toEqual([]);

    const executed = await unholdLiveAvatars({
      execute: true,
      pageSize: 3,
      loadPage: async (afterId) => (afterId === null ? pages[0]! : pages[1]!),
      readTags: async (key) => (key === live ? [{ Key: "gc-hold", Value: "keep" }] : []),
      clearTag: async (key) => {
        cleared.push(key);
      },
    });
    expect(executed).toMatchObject({ dryRun: false, held: 1, cleared: 1, unverified: 0 });
    expect(cleared).toEqual([live]);
  });

  it("counts a tag read failure as unverified and does not clear it", async () => {
    const key = avatarObjectKey(USER);
    const cleared: string[] = [];
    const report = await unholdLiveAvatars({
      execute: true,
      pageSize: 10,
      loadPage: async () => [{ id: "a", avatar_key: key }],
      readTags: async () => {
        throw new Error("timeout");
      },
      clearTag: async (row) => {
        cleared.push(row);
      },
    });
    expect(report).toMatchObject({ checked: 1, held: 0, cleared: 0, unverified: 1 });
    expect(cleared).toEqual([]);
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
});
