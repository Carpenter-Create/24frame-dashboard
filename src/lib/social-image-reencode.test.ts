import { readFileSync } from "node:fs";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  reencodeSocialImage,
  runSocialImageRecheck,
  socialImageRecheckPlan,
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
});
