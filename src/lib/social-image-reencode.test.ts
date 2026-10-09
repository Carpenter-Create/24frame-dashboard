import { readFileSync } from "node:fs";

import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

const publishS3 = vi.hoisted(() => ({
  headSocialMediaObject: vi.fn(),
  readSocialMediaObjectIfMatch: vi.fn(),
  putPublishedSocialImage: vi.fn(async () => undefined),
  copySocialMediaObject: vi.fn(),
}));

vi.mock("@/lib/s3-social-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/s3-social-media")>();
  return { ...actual, ...publishS3 };
});

import { publishSocialMediaItems } from "@/lib/social-media-publish";

import { AVATAR_CLEARED, avatarObjectKey, avatarRecheckObjectKey, avatarServeKey } from "@/lib/account-avatar";
import {
  blankSocialImageRecheckReport,
  recheckParentPages,
  recheckedSocialImageKey,
  recheckWantsExecute,
  reencodeSocialImage,
  runSocialImageRecheck,
  SOCIAL_IMAGE_RECHECK_ORDER,
  socialImageRecheckPlan,
  socialImageWasReencoded,
  socialPostHasLegacyS3Video,
  SOCIAL_IMAGE_REENCODED_METADATA,
} from "@/lib/social-image-reencode";

async function jpeg(): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 12, g: 34, b: 56 } } })
      .jpeg()
      .toBuffer(),
  );
}

describe("reencodeSocialImage", () => {
  it("stores a re-encoded image and drops a trailer", async () => {
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 13);
    trailer.set(clean);
    trailer.set(new TextEncoder().encode("TRAILER-AUDIO"), clean.byteLength);
    const encoded = await reencodeSocialImage(trailer, "image/jpeg");
    expect(encoded).not.toBeNull();
    expect(Buffer.from(encoded!).includes(Buffer.from("TRAILER-AUDIO"))).toBe(false);
    expect(await reencodeSocialImage(new Uint8Array([0xff, 0xd8]), "image/jpeg")).toBeNull();
    expect(await reencodeSocialImage(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg")).toBeNull();
    const fakeWebp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00,
    ]);
    expect(await reencodeSocialImage(fakeWebp, "image/webp")).toBeNull();
    const png = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer(),
    );
    expect(await reencodeSocialImage(png, "image/png")).not.toBeNull();
  });

  it("hides a post that will not decode, reports an avatar, and skips a byte-identical file", async () => {
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 13);
    trailer.set(clean);
    trailer.set(new TextEncoder().encode("TRAILER-AUDIO"), clean.byteLength);
    const stored: string[] = [];
    const hidden: string[] = [];
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        { surface: "post", parentId: "post-1", key: "posts/a/a.jpg", original: trailer, contentType: "image/jpeg" },
        {
          surface: "post",
          parentId: "post-2",
          key: "posts/a/b.jpg",
          original: new Uint8Array([0xff, 0xd8, 0xff]),
          contentType: "image/jpeg",
        },
        {
          surface: "avatar",
          parentId: "user-1",
          key: "avatars/user-1/avatar",
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
      ],
      store: async (item) => {
        stored.push(item.parentId);
      },
      hide: async (parent) => {
        hidden.push(parent.parentId);
      },
    });
    expect(hidden).toEqual(["post-2"]);
    expect(stored).toEqual(["post-1"]);
    expect(report).toMatchObject({ hide: 1, reported: 1, store: 1, dryRun: false });
    expect(socialImageRecheckPlan(clean, clean)).toBe("skip");
    expect(socialImageRecheckPlan(clean, null)).toBe("hide");

    const publish = readFileSync("src/lib/social-media-publish.ts", "utf8");
    const avatars = readFileSync("src/lib/s3-avatars.ts", "utf8");
    const actions = readFileSync("src/app/(app)/account/actions.ts", "utf8");
    expect(publish).toContain("reencodeSocialImage");
    expect(avatars).toContain("reencodeSocialImage");
    expect(actions).not.toContain("socialImageBytesMatchContentType");
  });

  it("hides a decode failure and retries a read error on the next run", async () => {
    const clean = await jpeg();
    const hidden: string[] = [];
    const notes: string[] = [];
    const first = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "post",
          parentId: "bad-file",
          key: "posts/a/bad.jpg",
          original: new Uint8Array([1, 2, 3, 4]),
          contentType: "image/jpeg",
        },
        {
          surface: "post",
          parentId: "dropped-read",
          key: "posts/a/net.jpg",
          original: new Uint8Array(),
          contentType: "image/jpeg",
          readError: "socket hang up",
        },
      ],
      store: async () => {
        throw new Error("store should not run");
      },
      hide: async (parent) => {
        hidden.push(parent.parentId);
      },
      report: (line) => {
        notes.push(line);
      },
    });
    expect(hidden).toEqual(["bad-file"]);
    expect(first).toMatchObject({ hide: 1, unfinished: 1, store: 0 });
    expect(notes.some((line) => line.includes("dropped-read") && line.includes("socket hang up"))).toBe(true);

    const trailer = new Uint8Array(clean.byteLength + 4);
    trailer.set(clean);
    trailer.set([9, 8, 7, 6], clean.byteLength);
    const stored: string[] = [];
    const second = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "post",
          parentId: "dropped-read",
          key: "posts/a/net.jpg",
          original: trailer,
          contentType: "image/jpeg",
        },
      ],
      store: async (item) => {
        stored.push(item.parentId);
      },
      hide: async (parent) => {
        hidden.push(parent.parentId);
      },
    });
    expect(stored).toEqual(["dropped-read"]);
    expect(second.hide).toBe(0);
    expect(second.unfinished).toBe(0);
    expect(hidden).toEqual(["bad-file"]);
  });

  it("applies EXIF orientation 6 and 8, and leaves an untagged image the same shape", async () => {
    const wide = await sharp({
      create: { width: 20, height: 10, channels: 3, background: { r: 180, g: 20, b: 20 } },
    })
      .jpeg()
      .toBuffer();
    for (const orientation of [6, 8] as const) {
      const tagged = new Uint8Array(await sharp(wide).withMetadata({ orientation }).toBuffer());
      const encoded = await reencodeSocialImage(tagged, "image/jpeg");
      expect(encoded).not.toBeNull();
      const meta = await sharp(encoded!).metadata();
      const upright = await sharp(await sharp(tagged).rotate().toBuffer()).metadata();
      expect(meta.width).toBe(upright.width);
      expect(meta.height).toBe(upright.height);
      expect(meta.width).toBe(10);
      expect(meta.height).toBe(20);
      expect(meta.orientation ?? 1).toBe(1);
    }
    const plain = new Uint8Array(wide);
    const same = await reencodeSocialImage(plain, "image/jpeg");
    const plainMeta = await sharp(same!).metadata();
    const sourceMeta = await sharp(plain).metadata();
    expect(plainMeta.width).toBe(sourceMeta.width);
    expect(plainMeta.height).toBe(sourceMeta.height);
    expect(plainMeta.width).toBe(20);
    expect(plainMeta.height).toBe(10);
  });

  it("counts a store error as unfinished and does not hide the parent", async () => {
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 4);
    trailer.set(clean);
    trailer.set([1, 2, 3, 4], clean.byteLength);
    const hidden: string[] = [];
    const stored: string[] = [];
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        { surface: "post", parentId: "slow", key: "posts/a/a.jpg", original: trailer, contentType: "image/jpeg" },
        { surface: "post", parentId: "next", key: "posts/a/b.jpg", original: trailer, contentType: "image/jpeg" },
      ],
      store: async (item) => {
        if (item.parentId === "slow") throw new Error("SlowDown 503");
        stored.push(item.parentId);
      },
      hide: async (parent) => {
        hidden.push(parent.parentId);
      },
    });
    expect(hidden).toEqual([]);
    expect(stored).toEqual(["next"]);
    expect(report).toMatchObject({ hide: 0, unfinished: 1, store: 1 });
  });

  it("does not store, hide, or clear during a dry run", async () => {
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 4);
    trailer.set(clean);
    trailer.set([9, 8, 7, 6], clean.byteLength);
    const cleared: string[] = [];
    const report = await runSocialImageRecheck({
      execute: false,
      items: [
        { surface: "post", parentId: "post-1", key: "posts/a/a.jpg", original: trailer, contentType: "image/jpeg" },
        {
          surface: "avatar",
          parentId: "user-1",
          key: "avatars/user-1/avatar",
          original: new Uint8Array([1, 2, 3]),
          contentType: "image/jpeg",
        },
      ],
      store: async () => {
        throw new Error("dry run stored");
      },
      hide: async () => {
        throw new Error("dry run hid");
      },
      clearAvatar: async (parentId) => {
        cleared.push(parentId);
      },
    });
    expect(report.dryRun).toBe(true);
    expect(report.store).toBe(1);
    expect(report.hide).toBe(0);
    expect(report.reported).toBe(1);
    expect(report.unfinished).toBe(0);
    expect(cleared).toEqual([]);
    expect(report.clearedAvatars).toEqual(["user-1"]);
  });

  it("clears an avatar that will not decode and leaves the original key unwritten", async () => {
    const cleared: string[] = [];
    const stored: string[] = [];
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "avatar",
          parentId: "11111111-1111-4111-8111-111111111111",
          key: "avatars/11111111-1111-4111-8111-111111111111/avatar",
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
      ],
      store: async (item) => {
        stored.push(item.key);
      },
      hide: async () => {
        throw new Error("avatar was hidden");
      },
      clearAvatar: async (parentId) => {
        cleared.push(parentId);
      },
    });
    expect(cleared).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(stored).toEqual([]);
    expect(report).toMatchObject({ reported: 1, hide: 0, store: 0, unfinished: 0 });
  });

  it("skips an image that was already re-encoded, so a rerun does not store", async () => {
    const stored: string[] = [];
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "post",
          parentId: "post-1",
          key: "posts/a/new.jpg",
          original: new Uint8Array([1]),
          contentType: "image/jpeg",
          alreadyReencoded: true,
        },
      ],
      store: async (item) => {
        stored.push(item.key);
      },
      hide: async () => {
        throw new Error("rerun hid");
      },
    });
    expect(stored).toEqual([]);
    expect(report).toMatchObject({ skip: 1, store: 0, hide: 0 });
    const user = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    const original = `posts/${user}/${object}.jpg`;
    const next = recheckedSocialImageKey(original, "image/jpeg", "33333333-3333-4333-8333-333333333333");
    expect(next).not.toBe(original);
    expect(next.startsWith(`posts/${user}/`)).toBe(true);
    expect(() => recheckedSocialImageKey(original, "image/jpeg", object)).toThrow(/overwrite/);
  });

  it("refuses a png that decodes only when failOn is none", async () => {
    const png = Buffer.from(
      await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 9, g: 8, b: 7 } } }).png().toBuffer(),
    );
    // Byte 22 of this PNG is rejected at failOn error and accepted at failOn none.
    const corrupt = Buffer.from(png);
    corrupt[22] = corrupt[22]! ^ 0xff;
    await expect(sharp(corrupt, { failOn: "error" }).png().toBuffer()).rejects.toThrow();
    const loose = await sharp(corrupt, { failOn: "none" }).png().toBuffer();
    expect(loose.byteLength).toBeGreaterThan(0);
    expect(await reencodeSocialImage(new Uint8Array(corrupt), "image/png")).toBeNull();
  });

  it("rechecks one parent page and drops it before reading the next", async () => {
    const seen: (string | null)[] = [];
    let released = true;
    const report = await recheckParentPages({
      execute: false,
      pageSize: 2,
      loadParents: async (afterId, limit) => {
        expect(released).toBe(true);
        expect(limit).toBe(2);
        seen.push(afterId);
        released = false;
        if (afterId === null) return [{ id: "a" }, { id: "b" }];
        return [{ id: "c" }];
      },
      recheck: async (parents) => {
        expect(parents.length).toBeGreaterThan(0);
        released = true;
        return { ...blankSocialImageRecheckReport(true), skip: parents.length };
      },
    });
    expect(seen).toEqual([null, "b"]);
    expect(report.skip).toBe(3);
    expect(SOCIAL_IMAGE_RECHECK_ORDER).toBe("id");
    expect(recheckWantsExecute(["node", "recheck-social-images.ts"])).toBe(false);
    expect(recheckWantsExecute(["node", "recheck-social-images.ts", "--execute"])).toBe(true);
    const { socialImageRecheckExecute } = await import("../../scripts/social/recheck-social-images");
    expect(socialImageRecheckExecute).toBe(false);
    const script = readFileSync("scripts/social/recheck-social-images.ts", "utf8");
    expect(script).toContain("const execute = socialImageRecheckExecute");
    expect(script).not.toContain("overwritePublishedSocialImage");
    expect(script).not.toContain("replaceAvatarObject");
    expect(script.split(".order(SOCIAL_IMAGE_RECHECK_ORDER)").length - 1).toBe(2);
    expect(script).toContain('.gt("id", afterId)');
    expect(script).not.toContain(".range(");
    expect(script).not.toContain('.eq("media", current as never)');
    expect(script).not.toContain('.eq("avatar_key", readKey ?? "")');
    expect(script).toContain("orphanedKeys");
    expect(script).toContain("quarantineAvatarObject");
  });

  it("visits every later row when the first page is hidden", async () => {
    const ids = ["00", "01", "02", "03", "04", "05"];
    const active = new Set(ids);
    const seen: string[] = [];
    const report = await recheckParentPages({
      execute: true,
      pageSize: 2,
      loadParents: async (afterId, limit) => {
        const rows = ids.filter((id) => active.has(id));
        if (typeof afterId === "number") return rows.slice(afterId, afterId + limit).map((id) => ({ id }));
        const keyed = rows.filter((id) => afterId === null || id > afterId);
        return keyed.slice(0, limit).map((id) => ({ id }));
      },
      recheck: async (parents) => {
        for (const parent of parents) {
          seen.push(parent.id);
          active.delete(parent.id);
        }
        return {
          ...blankSocialImageRecheckReport(false),
          hide: parents.length,
          hiddenPosts: parents.map((parent) => parent.id),
        };
      },
    });
    expect(seen).toEqual(ids);
    expect(report.hiddenPosts).toEqual(ids);
    expect(report.hide).toBe(6);
  });

  it("keeps an animated WebP that carries an orientation tag", async () => {
    const frame = async (red: number) =>
      sharp({
        create: { width: 8, height: 4, channels: 3, background: { r: red, g: 20, b: 40 } },
      })
        .png()
        .toBuffer();
    const animated = await sharp([await frame(200), await frame(10)], { join: { animated: true } })
      .webp()
      .toBuffer();
    const tagged = new Uint8Array(await sharp(animated, { animated: true }).withMetadata({ orientation: 6 }).toBuffer());
    const encoded = await reencodeSocialImage(tagged, "image/webp");
    expect(encoded).not.toBeNull();
    const meta = await sharp(encoded!, { animated: true }).metadata();
    expect(meta.pages).toBe(2);
    const hidden: string[] = [];
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "post",
          parentId: "anim",
          key: "posts/a/a.webp",
          original: tagged,
          contentType: "image/webp",
        },
      ],
      store: async () => undefined,
      hide: async (parent) => {
        hidden.push(parent.parentId);
      },
    });
    expect(hidden).toEqual([]);
    expect(report.hide).toBe(0);
    expect(report.hiddenPosts).toEqual([]);
    expect(socialPostHasLegacyS3Video([{ kind: "video", key: "posts/a/a.mp4", contentType: "video/mp4" }])).toBe(true);
    expect(socialPostHasLegacyS3Video([{ kind: "video", provider: "mux", assetId: "a", playbackId: "b" }])).toBe(false);
    expect(socialImageWasReencoded(undefined)).toBe(false);
    expect(socialImageWasReencoded({ [SOCIAL_IMAGE_REENCODED_METADATA]: "1" })).toBe(true);
    const user = "11111111-1111-4111-8111-111111111111";
    const staging = `posts/upload/${user}/22222222-2222-4222-8222-222222222222.webp`;
    publishS3.headSocialMediaObject.mockResolvedValue({
      etag: '"abc"',
      bytes: tagged.byteLength,
      contentType: "image/webp",
    });
    publishS3.readSocialMediaObjectIfMatch.mockResolvedValue(tagged);
    const published = await publishSocialMediaItems(
      [{ kind: "image", key: staging, contentType: "image/webp" }],
      user,
      "posts",
    );
    expect(published.ok).toBe(true);
    expect(publishS3.putPublishedSocialImage).toHaveBeenCalledTimes(1);
    const stored = (publishS3.putPublishedSocialImage.mock.calls as unknown as { body: Uint8Array }[][])[0]?.[0];
    expect(stored?.body.byteLength).toBeGreaterThan(0);
  });

  it("lists a skipped repoint and its orphan key, and does not count the store", async () => {
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 4);
    trailer.set(clean);
    trailer.set([1, 2, 3, 4], clean.byteLength);
    const report = await runSocialImageRecheck({
      execute: true,
      items: [
        { surface: "story", parentId: "story-1", key: "stories/a/a.jpg", original: trailer, contentType: "image/jpeg" },
      ],
      store: async () => ({ skipped: true, orphanKey: "stories/a/new.jpg" }),
      hide: async () => {
        throw new Error("skipped story was hidden");
      },
    });
    expect(report.store).toBe(0);
    expect(report.skippedParents).toEqual(["story:story-1"]);
    expect(report.orphanedKeys).toEqual(["stories/a/new.jpg"]);
    expect(report.unfinished).toBe(0);
  });

  it("skips an avatar clear when the pointer changed and lists an orphan from a failed store", async () => {
    const clean = await jpeg();
    const cleared: string[] = [];
    const skipped = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "avatar",
          parentId: "11111111-1111-4111-8111-111111111111",
          key: "avatars/11111111-1111-4111-8111-111111111111/avatar",
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
      ],
      store: async () => {
        throw new Error("clear path stored");
      },
      hide: async () => {
        throw new Error("clear path hid");
      },
      clearAvatar: async (parentId) => {
        cleared.push(parentId);
        return { skipped: true };
      },
    });
    expect(cleared).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(skipped.clearedAvatars).toEqual([]);
    expect(skipped.skippedParents).toEqual(["avatar:11111111-1111-4111-8111-111111111111"]);

    const trailer = new Uint8Array(clean.byteLength + 4);
    trailer.set(clean);
    trailer.set([1, 2, 3, 4], clean.byteLength);
    const failed = await runSocialImageRecheck({
      execute: true,
      items: [
        { surface: "post", parentId: "post-1", key: "posts/a/a.jpg", original: trailer, contentType: "image/jpeg" },
      ],
      store: async () => {
        throw Object.assign(new Error("update failed"), { orphanKey: "posts/a/orphan.jpg" });
      },
      hide: async () => {
        throw new Error("orphan was hidden");
      },
    });
    expect(failed.unfinished).toBe(1);
    expect(failed.hide).toBe(0);
    expect(failed.orphanedKeys).toEqual(["posts/a/orphan.jpg"]);
  });

  it("records a hidden post id and a hidden story id from the recheck itself", async () => {
    const report = await runSocialImageRecheck({
      execute: false,
      items: [
        {
          surface: "post",
          parentId: "post-hide",
          key: "posts/a/a.jpg",
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
        {
          surface: "story",
          parentId: "story-hide",
          key: "stories/a/a.jpg",
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
      ],
      store: async () => {
        throw new Error("hidden item was stored");
      },
      hide: async () => undefined,
    });
    expect(report.hiddenPosts).toEqual(["post-hide"]);
    expect(report.hiddenStories).toEqual(["story-hide"]);
    expect(report.hide).toBe(2);
  });

  it("repoints media with the JSON PostgREST filter and rejects a raw object", async () => {
    const { pointParentAtRecheckedMedia, socialMediaEqualityFilter } = await import(
      "../../scripts/social/recheck-social-images"
    );
    const source = readFileSync("scripts/social/recheck-social-images.ts", "utf8");
    const fn = source.slice(
      source.indexOf("export async function pointParentAtRecheckedMedia"),
      source.indexOf("type AvatarPointerQuery"),
    );
    expect(fn).toContain('.eq("media", socialMediaEqualityFilter(current))');
    expect(fn).not.toContain("socialMediaEqualityFilter(next)");
    const current = [{ kind: "image", key: "posts/a/old.jpg", contentType: "image/jpeg" }];
    const next = [{ kind: "image", key: "posts/a/new.jpg", contentType: "image/jpeg" }];
    const changed = [{ kind: "image", key: "posts/a/raced.jpg", contentType: "image/jpeg" }];
    const writer = (stored: unknown) => {
      const params = new URLSearchParams();
      const chain = {
        from() {
          return chain;
        },
        update() {
          return chain;
        },
        eq(column: string, value: unknown) {
          params.append(column, `eq.${value}`);
          return chain;
        },
        select() {
          const media = params.getAll("media");
          if (media.some((entry) => entry.includes("[object Object]"))) {
            return Promise.resolve({
              data: null,
              error: { code: "22P02", message: "invalid input syntax for type json" },
            });
          }
          const expected = `eq.${JSON.stringify(stored)}`;
          const matched = media.some((entry) => {
            if (entry !== expected) return false;
            try {
              return JSON.stringify(JSON.parse(entry.slice(3))) === JSON.stringify(stored);
            } catch {
              return false;
            }
          });
          if (!matched) return Promise.resolve({ data: [], error: null });
          return Promise.resolve({ data: [{ id: "parent" }], error: null });
        },
      };
      return chain;
    };
    const raw = await writer(current)
      .from()
      .update()
      .eq("id", "parent")
      .eq("media", current)
      .select();
    expect(raw.error).toMatchObject({ code: "22P02" });
    const pointed = await pointParentAtRecheckedMedia(writer(current), "posts", "parent", current, next);
    expect(pointed.error).toBeNull();
    expect(pointed.data).toEqual([{ id: "parent" }]);
    expect(socialMediaEqualityFilter(current)).toBe(JSON.stringify(current));
    const stale = await pointParentAtRecheckedMedia(writer(changed), "posts", "parent", current, next);
    expect(stale.error).toBeNull();
    expect(stale.data).toEqual([]);
    const commit = source.slice(
      source.indexOf("export async function commitRecheckedAvatar"),
      source.indexOf("/** Include a null pointer"),
    );
    const release = commit.indexOf("await releaseHold(parentId, nextKey)");
    const write = commit.indexOf("await writeAvatarPointer(admin, parentId, readKey, nextKey)");
    expect(release).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(release);
    const avatarStore = source.slice(source.lastIndexOf("store: async (item, bytes)"));
    expect(avatarStore).toContain("return await commitRecheckedAvatar(");
    expect(avatarStore.slice(0, avatarStore.indexOf("hide: async"))).not.toContain("writeAvatarPointer");
  });

  it("releases the avatar hold before the pointer moves and leaves the old face when the release fails", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const events: string[] = [];
    const writer = {
      from() {
        return writer;
      },
      update() {
        events.push("swap");
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: [{ id: user }], error: null });
      },
    };
    const committed = await commitRecheckedAvatar(writer, user, previous, next, async () => {
      events.push("release");
    });
    expect(committed).toEqual({});
    expect(events).toEqual(["release", "swap"]);
    events.length = 0;
    await expect(
      commitRecheckedAvatar(writer, user, previous, next, async () => {
        events.push("release");
        throw new Error("tag delete failed");
      }),
    ).rejects.toThrow(/tag delete failed/);
    expect(events).toEqual(["release"]);
  });

  it("re-tags the new key when a clear wins the pointer", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    const held: string[] = [];
    const skipped = await commitRecheckedAvatar(
      writer,
      user,
      previous,
      next,
      async () => undefined,
      async (_userId, key) => {
        held.push(key);
      },
      async () => previous,
    );
    expect(skipped).toEqual({ skipped: true, orphanKey: next });
    expect(held).toEqual([next]);
  });

  it("does not tag a recheck key when the swap errors and the re-read still shows the old pointer", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: null, error: { message: "FetchError: request timed out" } });
      },
    };
    const held: string[] = [];
    // The client errors at 150ms while the server PATCH waits on a row lock and then commits.
    // The re-read still shows the old pointer. That is not proof the swap rolled back.
    await expect(
      commitRecheckedAvatar(
        writer,
        user,
        previous,
        next,
        async () => undefined,
        async (_userId, key) => {
          held.push(key);
        },
        async () => previous,
      ),
    ).rejects.toMatchObject({ message: "FetchError: request timed out", orphanKey: next });
    expect(held).toEqual([]);
  });

  it("re-tags the new key when the swap error proves the transaction rolled back", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: null, error: { message: "new row violates check", code: "23514" } });
      },
    };
    const held: string[] = [];
    await expect(
      commitRecheckedAvatar(
        writer,
        user,
        previous,
        next,
        async () => undefined,
        async (_userId, key) => {
          held.push(key);
        },
        async () => previous,
      ),
    ).rejects.toThrow(/point avatar at rechecked image: new row violates check/);
    expect(held).toEqual([next]);
  });

  it("does not re-hold a recheck key without reading the pointer", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    const order: string[] = [];
    const skipped = await commitRecheckedAvatar(
      writer,
      user,
      previous,
      next,
      async () => undefined,
      async (_userId, key) => {
        order.push(`hold:${key}`);
      },
      async () => {
        order.push("read");
        return previous;
      },
    );
    expect(skipped).toEqual({ skipped: true, orphanKey: next });
    expect(order).toEqual(["read", `hold:${next}`]);
  });

  it("does not re-hold a recheck key when the pointer read times out", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    const held: string[] = [];
    await expect(
      commitRecheckedAvatar(
        writer,
        user,
        previous,
        next,
        async () => undefined,
        async (_userId, key) => {
          held.push(key);
        },
        async () => {
          throw Object.assign(new Error("socket timeout"), { name: "TimeoutError" });
        },
      ),
    ).rejects.toMatchObject({ name: "TimeoutError", message: "socket timeout", orphanKey: next });
    expect(held).toEqual([]);
  });

  it("treats a recheck pointer that already names the new key as committed", async () => {
    const { commitRecheckedAvatar } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const previous = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(user, "33333333-3333-4333-8333-333333333333");
    const writer = {
      from() {
        return writer;
      },
      update() {
        return writer;
      },
      eq() {
        return writer;
      },
      is() {
        return writer;
      },
      select() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    const held: string[] = [];
    await expect(
      commitRecheckedAvatar(
        writer,
        user,
        previous,
        next,
        async () => undefined,
        async (_userId, key) => {
          held.push(key);
        },
        async () => next,
      ),
    ).resolves.toEqual({});
    expect(held).toEqual([]);
  });

  it("HD4: a 403 on a recheck head counts as unfinished", async () => {
    const { readAvatarRecheckPage } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const key = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const forbidden = Object.assign(new Error("Forbidden"), {
      name: "Forbidden",
      $metadata: { httpStatusCode: 403 },
    });
    const page = await readAvatarRecheckPage(
      [{ id: user, avatar_key: key }],
      async () => {
        throw forbidden;
      },
      async () => {
        throw new Error("recheck key was read as the canonical face");
      },
    );
    expect(page.noObject).toBe(0);
    expect(page.notes.join("\n")).not.toContain("no_object");
    expect(page.notes.join("\n")).not.toContain("key does not match");
    expect(page.items).toEqual([
      expect.objectContaining({ parentId: user, key, readError: "Forbidden" }),
    ]);
  });

  it("quarantines a null legacy avatar and re-encodes a clean one onto a new pointer", async () => {
    const { avatarRecheckTarget, writeAvatarPointer } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    expect(avatarRecheckTarget({ id: user, avatar_key: null })).toEqual({
      kind: "canonical",
      key: avatarObjectKey(user),
    });
    expect(avatarServeKey(user, null)).toBe(avatarObjectKey(user));
    const match = (stored: string | null) => {
      const filters: { op: string; value: unknown }[] = [];
      const chain = {
        from() {
          return chain;
        },
        update() {
          return chain;
        },
        eq(column: string, value: unknown) {
          if (column === "avatar_key") filters.push({ op: "eq", value });
          return chain;
        },
        is(column: string, value: unknown) {
          if (column === "avatar_key") filters.push({ op: "is", value });
          return chain;
        },
        select() {
          const hit = filters.some((filter) => {
            if (filter.op === "is" && filter.value === null) return stored === null;
            return filter.op === "eq" && stored !== null && filter.value === stored;
          });
          return Promise.resolve(hit ? { data: [{ id: user }], error: null } : { data: [], error: null });
        },
      };
      return chain;
    };
    const cleared = await writeAvatarPointer(match(null), user, null, AVATAR_CLEARED);
    expect(cleared.data).toEqual([{ id: user }]);
    expect(avatarServeKey(user, AVATAR_CLEARED)).toBeNull();
    const quarantined: string[] = [];
    const polyglot = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "avatar",
          parentId: user,
          key: avatarObjectKey(user),
          original: new Uint8Array([0xff, 0xd8]),
          contentType: "image/jpeg",
        },
      ],
      store: async () => {
        throw new Error("polyglot was stored");
      },
      hide: async () => {
        throw new Error("polyglot was hidden");
      },
      clearAvatar: async (parentId) => {
        const wrote = await writeAvatarPointer(match(null), parentId, null, AVATAR_CLEARED);
        if (!wrote.data?.length) return { skipped: true };
        quarantined.push(parentId);
      },
    });
    expect(quarantined).toEqual([user]);
    expect(polyglot.clearedAvatars).toEqual([user]);
    const objectId = "22222222-2222-4222-8222-222222222222";
    const next = avatarRecheckObjectKey(user, objectId);
    const stored = await writeAvatarPointer(match(null), user, null, next);
    expect(stored.data).toEqual([{ id: user }]);
    expect(avatarServeKey(user, next)).toBe(next);
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 1);
    trailer.set(clean);
    trailer[clean.byteLength] = 1;
    const kept: string[] = [];
    const reencoded = await runSocialImageRecheck({
      execute: true,
      items: [
        {
          surface: "avatar",
          parentId: user,
          key: avatarObjectKey(user),
          original: trailer,
          contentType: "image/jpeg",
        },
      ],
      store: async (_item, bytes) => {
        expect(bytes.byteLength).toBeGreaterThan(0);
        const wrote = await writeAvatarPointer(match(null), user, null, next);
        if (!wrote.data?.length) return { skipped: true };
        kept.push(next);
      },
      hide: async () => {
        throw new Error("clean avatar was hidden");
      },
    });
    expect(kept).toEqual([next]);
    expect(reencoded.store).toBe(1);
    expect(reencoded.clearedAvatars).toEqual([]);
  });

  it("counts a 404 or NoSuchKey on the canonical avatar as no_object and skips it", async () => {
    const { readCanonicalAvatarForRecheck } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const key = avatarObjectKey(user);
    const stored: string[] = [];
    const cleared: string[] = [];
    const missing = [
      Object.assign(new Error("The specified key does not exist."), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
      Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }),
      { name: "NoSuchKey" },
    ];
    for (const error of missing) {
      const report = await recheckParentPages({
        execute: true,
        pageSize: 2,
        loadParents: async (afterId) => (afterId ? [] : [{ id: user }]),
        recheck: async () => {
          const outcome = await readCanonicalAvatarForRecheck(user, key, async () => {
            throw error;
          });
          const items = outcome === "no_object" ? [] : [outcome];
          const page = await runSocialImageRecheck({
            execute: true,
            items,
            store: async () => {
              stored.push(user);
            },
            hide: async () => {
              throw new Error("missing avatar was hidden");
            },
            clearAvatar: async () => {
              cleared.push(user);
            },
          });
          if (outcome === "no_object") page.no_object += 1;
          return page;
        },
      });
      expect(report.no_object).toBe(1);
      expect(report.unfinished).toBe(0);
      expect(report.store).toBe(0);
      expect(report.clearedAvatars).toEqual([]);
    }
    expect(stored).toEqual([]);
    expect(cleared).toEqual([]);
  });

  it("counts a 500 on the canonical avatar as unfinished and retries it", async () => {
    const { readCanonicalAvatarForRecheck } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const key = avatarObjectKey(user);
    const clean = await jpeg();
    const trailer = new Uint8Array(clean.byteLength + 1);
    trailer.set(clean);
    trailer[clean.byteLength] = 1;
    let attempt = 0;
    const stored: string[] = [];
    const read = async () => {
      attempt += 1;
      if (attempt === 1) {
        throw Object.assign(new Error("Internal Server Error"), {
          name: "InternalError",
          $metadata: { httpStatusCode: 500 },
        });
      }
      return { bytes: trailer, contentType: "image/jpeg" };
    };
    const run = () =>
      recheckParentPages({
        execute: true,
        pageSize: 2,
        loadParents: async (afterId) => (afterId ? [] : [{ id: user }]),
        recheck: async () => {
          const outcome = await readCanonicalAvatarForRecheck(user, key, read);
          const items = outcome === "no_object" ? [] : [outcome];
          const page = await runSocialImageRecheck({
            execute: true,
            items,
            store: async (item) => {
              stored.push(item.parentId);
            },
            hide: async () => {
              throw new Error("avatar read error was hidden");
            },
            clearAvatar: async () => {
              throw new Error("avatar read error was cleared");
            },
          });
          if (outcome === "no_object") page.no_object += 1;
          return page;
        },
      });
    const first = await run();
    expect(first.unfinished).toBe(1);
    expect(first.no_object).toBe(0);
    expect(first.store).toBe(0);
    expect(stored).toEqual([]);
    const second = await run();
    expect(stored).toEqual([user]);
    expect(second.unfinished).toBe(0);
    expect(second.no_object).toBe(0);
    expect(second.store).toBe(1);
  });

  it("counts a head error on a recheck key as unfinished and retries it", async () => {
    const { readAvatarRecheckPage } = await import("../../scripts/social/recheck-social-images");
    const user = "11111111-1111-4111-8111-111111111111";
    const key = avatarRecheckObjectKey(user, "22222222-2222-4222-8222-222222222222");
    const serverError = Object.assign(new Error("Internal Server Error"), {
      name: "InternalError",
      $metadata: { httpStatusCode: 500 },
    });
    const missing = [
      Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }),
      Object.assign(new Error("The specified key does not exist."), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
    ];
    const stored: string[] = [];
    const cleared: string[] = [];
    let heads = 0;
    const load = (head: () => Promise<{ reencoded: boolean }>) =>
      readAvatarRecheckPage([{ id: user, avatar_key: key }], head, async () => {
        throw new Error("recheck key was read as the canonical face");
      });
    const first = await load(async () => {
      heads += 1;
      throw serverError;
    });
    expect(first.noObject).toBe(0);
    expect(first.notes.join("\n")).not.toContain("key does not match");
    expect(first.items).toEqual([
      expect.objectContaining({ parentId: user, key, readError: "Internal Server Error" }),
    ]);
    const failed = await runSocialImageRecheck({
      execute: true,
      items: first.items,
      store: async () => {
        stored.push(user);
      },
      hide: async () => {
        throw new Error("recheck head error was hidden");
      },
      clearAvatar: async () => {
        cleared.push(user);
      },
    });
    expect(failed.unfinished).toBe(1);
    expect(failed.skip).toBe(0);
    expect(failed.no_object).toBe(0);
    expect(stored).toEqual([]);
    expect(cleared).toEqual([]);
    const again = await load(async () => ({ reencoded: true }));
    expect(again.notes).toEqual([]);
    expect(again.items[0]?.alreadyReencoded).toBe(true);
    const retried = await runSocialImageRecheck({
      execute: true,
      items: again.items,
      store: async () => {
        stored.push(user);
      },
      hide: async () => {
        throw new Error("recheck head error was hidden");
      },
      clearAvatar: async () => {
        cleared.push(user);
      },
    });
    expect(retried.unfinished).toBe(0);
    expect(retried.skip).toBe(1);
    expect(stored).toEqual([]);
    expect(heads).toBe(1);
    for (const error of missing) {
      const gone = await load(async () => {
        throw error;
      });
      expect(gone.items).toEqual([]);
      expect(gone.noObject).toBe(1);
      expect(gone.notes.join("\n")).toContain("no_object");
      expect(gone.notes.join("\n")).not.toContain("key does not match");
    }
  });
});
