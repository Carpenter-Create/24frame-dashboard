import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { socialPostUploadPlan } from "@/lib/social-media-upload";

describe("social post upload kind", () => {
  it("sends a typeless iPhone MOV to Mux and keeps a still on the image path", () => {
    const clip = socialPostUploadPlan(new File([new Uint8Array([1, 2, 3])], "IMG_2048.MOV", { type: "" }));
    expect(clip).toMatchObject({ kind: "video" });
    expect(clip?.file.type).toBe("video/quicktime");
    expect(clip?.kind).not.toBe("image");

    const quicktime = socialPostUploadPlan(
      new File([new Uint8Array([1])], "clip.mov", { type: "video/quicktime" }),
    );
    expect(quicktime?.kind).toBe("video");

    const codecs = socialPostUploadPlan(
      new File([new Uint8Array([1])], "clip.mp4", { type: "video/mp4;codecs=avc1" }),
    );
    expect(codecs?.kind).toBe("video");
    expect(codecs?.file.type).toBe("video/mp4");

    const still = socialPostUploadPlan(new File([new Uint8Array([1])], "still.jpg", { type: "image/jpeg" }));
    expect(still?.kind).toBe("image");

    const jpg = socialPostUploadPlan(new File([new Uint8Array([1])], "still.jpg", { type: "image/jpg" }));
    expect(jpg?.kind).toBe("image");
    expect(jpg?.file.type).toBe("image/jpeg");

    expect(socialPostUploadPlan(new File([new Uint8Array([1])], "notes.pdf", { type: "application/pdf" }))).toBeNull();
    expect(SOCIAL.home.mediaType.length).toBeGreaterThan(0);
  });
});

describe("social post media upload SoT", () => {
  it("routes post and story videos to Mux and leaves stills on S3", () => {
    const src = readFileSync("src/lib/social-media-upload.ts", "utf8");
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    const forms = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const live = readFileSync("src/components/social/social-go-live.tsx", "utf8");
    const studio = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    expect(src).toContain("createSocialMuxUpload");
    expect(src).toContain("finalizeSocialMuxUpload");
    expect(src).toContain("presignSocialMediaUpload");
    expect(src).toContain('body.set("intent", options.intent ?? "video")');
    expect(src).toContain("socialPostUploadPlan");
    expect(src).not.toContain("original_quality");
    expect(src).not.toContain("socialMediaKindFor(file.type)");
    expect(src).not.toContain("probeSocialVideoPixels");
    expect(src).not.toContain("source_width");
    expect(src).not.toContain("source_height");
    expect(actions).not.toContain("source_width");
    expect(actions).not.toContain("source_height");
    expect(src).toContain('lane === "posts" || lane === "stories"');
    expect(src).not.toContain("NEXT_PUBLIC_MUX");
    expect(forms).toContain("uploadSocialPostMedia");
    expect(forms).not.toContain("originalQuality");
    expect(forms).not.toContain('data-social-create-media-step="review"');
    expect(live).toContain("uploadSocialPostMedia");
    expect(live).toContain('intent: "live"');
    expect(studio).toContain("presignSocialMediaUpload");
    expect(studio).toContain("uploadSocialMuxVideoFile");
    expect(studio).toContain('lane: "stories"');
  });

  it("PUTs stills, Stories, and welcome with Content-Type only — no Cache-Control", () => {
    const stills = readFileSync("src/lib/social-media-upload.ts", "utf8");
    const stories = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    const welcome = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
    const presign = readFileSync("src/lib/s3-social-media.ts", "utf8");
    for (const src of [stills, stories, welcome]) {
      expect(src).toContain('headers: { "Content-Type": signed.contentType }');
      expect(src).not.toContain("Cache-Control");
    }
    const putFn = presign.slice(
      presign.indexOf("export async function presignSocialMediaPut"),
      presign.indexOf("export async function presignSocialMediaGet"),
    );
    expect(putFn).toContain("new PutObjectCommand");
    expect(putFn).toContain("ContentType: contentType");
    expect(putFn).toContain("ContentLength: contentLength");
    expect(putFn).not.toContain("CacheControl:");
    expect(presign).toContain("ResponseCacheControl: privateMaxAgeCacheControl");
  });
});
