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
    expect(script).toContain('.eq("media", current as never)');
    expect(script.split('.eq("avatar_key", readKey ?? "")').length - 1).toBe(2);
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
});
