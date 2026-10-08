import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialCreateHref } from "./social";
import {
  SOCIAL_CREATE_MEDIA_ACCEPT,
  socialCreateKindFromMediaFile,
  socialCreateKindFromMediaFiles,
  socialCreateMediaHref,
  socialCreateMediaStepAfterPick,
  parseSocialCreateMediaStep,
} from "./social-create-media";

describe("Social Create Media SoT", () => {
  it("opens a mixed photo-and-video library, then one caption screen", () => {
    expect("next" in SOCIAL.create).toBe(false);
    expect(SOCIAL_CREATE_MEDIA_ACCEPT).toBe("image/*,video/*");
    expect(SOCIAL_CREATE_MEDIA_ACCEPT).not.toContain("image/jpeg");
    expect(socialCreateHref("media")).toBe("/social/create?kind=media");
    expect(socialCreateMediaHref()).toBe("/social/create?kind=media");
    expect(socialCreateMediaHref("caption")).toBe("/social/create?kind=media&step=caption");
    expect(parseSocialCreateMediaStep("caption")).toBe("caption");
    expect(parseSocialCreateMediaStep("review")).toBe("caption");
    expect(parseSocialCreateMediaStep("pick")).toBe("pick");
    expect(socialCreateKindFromMediaFile({ type: "image/jpeg" })).toBe("media");
    expect(socialCreateKindFromMediaFile({ type: "video/mp4" })).toBe("media");
    expect(socialCreateKindFromMediaFile({ type: "application/pdf" })).toBeNull();
    expect(socialCreateKindFromMediaFiles([{ type: "image/png" }])).toBe("media");
    expect(socialCreateMediaStepAfterPick([], "caption")).toBe("pick");
    expect(socialCreateMediaStepAfterPick([{}], null)).toBe("caption");
    expect(socialCreateMediaStepAfterPick([{}], "caption")).toBe("caption");

    const sheet = readFileSync("src/lib/social-create-sheet.ts", "utf8");
    const fan = readFileSync("src/components/social/social-create-fan.tsx", "utf8");
    const media = readFileSync("src/components/social/social-create-media.tsx", "utf8");
    const compose = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    const home = readFileSync("src/lib/social-home.ts", "utf8");
    expect(sheet).toContain('id: "media"');
    expect(sheet).not.toContain('id: "photo"');
    expect(sheet).not.toContain('id: "video"');
    expect(fan).toContain("openPicker();");
    expect(fan).toContain("event.preventDefault()");
    expect(media).toContain("SOCIAL_CREATE_MEDIA_ACCEPT");
    expect(media).toContain("stashSocialHomeComposerMedia");
    expect(media).toContain("socialCreateMediaHref()");
    expect(compose).toContain('data-social-create-media-step="pick"');
    expect(compose).toContain('data-social-create-media-step="caption"');
    expect(compose).not.toContain('data-social-create-media-step="review"');
    expect(compose).not.toContain("data-social-create-media-next");
    expect(compose).not.toContain("data-social-create-original-quality");
    expect(compose).toContain("SOCIAL_CREATE_MEDIA_ACCEPT");
    expect(compose).not.toContain("SOCIAL.create.dropEmpty");
    expect(compose).not.toContain("data-social-create-well");
    const createChunk = compose.slice(
      compose.indexOf("export function SocialCreateCompose"),
      compose.length,
    );
    expect(createChunk).toContain("disabled={uploading}");
    expect(createChunk).not.toContain("disabled={uploading ||");
    expect(createChunk).not.toContain("disabled={!body");
    expect(profile).not.toContain('socialCreateHref("media")');
    expect(home).toContain('socialCreateHref("media")');
  });
});
