import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  isAnimatedRasterSrc,
  isLocalMediaPreviewSrc,
  isSessionGatedSocialSrc,
  socialAvatarImageSizes,
  socialMediaFrameClass,
  socialStoryMediaFrameClass,
  socialMediaOrientation,
} from "./social-media-display";

describe("social media display", () => {
  it("treats GIF paths as animated even with a signed query", () => {
    expect(isAnimatedRasterSrc("https://cf.example/posts/u/x.gif?X-Amz-Signature=a")).toBe(true);
    expect(isAnimatedRasterSrc("https://cf.example/posts/u/x.jpg?X-Amz-Signature=a")).toBe(false);
    expect(isAnimatedRasterSrc("/local.gif")).toBe(true);
  });

  it("treats only blob and data URLs as a local capture preview", () => {
    expect(isLocalMediaPreviewSrc("blob:https://local/1")).toBe(true);
    expect(isLocalMediaPreviewSrc("data:video/mp4;base64,AAA")).toBe(true);
    expect(isLocalMediaPreviewSrc("https://s3.example/welcome.mp4")).toBe(false);
    expect(isLocalMediaPreviewSrc("/api/social/media?key=posts/u/x.jpg")).toBe(false);
    expect(isLocalMediaPreviewSrc("")).toBe(false);
  });

  it("sizes profile faces for the 80px disk", () => {
    expect(socialAvatarImageSizes("profile")).toBe("80px");
    expect(socialAvatarImageSizes("sm")).toBe("36px");
  });

  it("treats same-origin Social signer routes as session-gated", () => {
    expect(isSessionGatedSocialSrc("/api/social/avatar/11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isSessionGatedSocialSrc("/api/social/media?key=posts/u/x.jpg")).toBe(true);
    expect(isSessionGatedSocialSrc("/api/social/media?key=posts/u/x.jpg#still")).toBe(true);
    expect(isSessionGatedSocialSrc("https://cf.example/posts/u/x.jpg")).toBe(false);
    expect(isSessionGatedSocialSrc("/api/account/photo")).toBe(false);
  });

  it("frames portrait 4:5 and landscape 16:9 from orientation, ratio, or kind default", () => {
    expect(socialMediaOrientation("portrait")).toBe("portrait");
    expect(socialMediaOrientation("landscape")).toBe("landscape");
    expect(socialMediaOrientation({ orientation: "portrait" })).toBe("portrait");
    expect(socialMediaOrientation({ width: 1080, height: 1350 })).toBe("portrait");
    expect(socialMediaOrientation({ width: 1920, height: 1080 })).toBe("landscape");
    expect(socialMediaOrientation({ aspect: 0.8 })).toBe("portrait");
    expect(socialMediaOrientation({ aspect: 16 / 9 })).toBe("landscape");
    expect(socialMediaOrientation({ kind: "image" })).toBe("portrait");
    expect(socialMediaOrientation({ kind: "video" })).toBe("landscape");
    expect(socialMediaFrameClass("portrait")).toBe(
      "aspect-[4/5] h-[min(70vh,560px,calc(100cqw*5/4))] w-full max-h-[min(70vh,560px)] object-cover object-center",
    );
    expect(socialMediaFrameClass("landscape")).toBe(
      "aspect-video h-[min(70vh,560px,calc(100cqw*9/16))] w-full max-h-[min(70vh,560px)] object-cover object-center",
    );
    expect(socialMediaFrameClass("portrait")).toContain("min(70vh,560px)");
    expect(socialMediaFrameClass("landscape")).toContain("min(70vh,560px)");
    expect(socialMediaFrameClass("portrait")).not.toContain("min(100vh");
    expect(socialMediaFrameClass({ kind: "image" })).toContain("aspect-[4/5]");
    expect(socialMediaFrameClass({ kind: "video" })).toContain("aspect-video");
    expect(socialMediaFrameClass({ kind: "video" })).not.toContain("aspect-square");
    expect(socialMediaFrameClass({ kind: "image" })).not.toContain("aspect-square");
    expect(socialStoryMediaFrameClass()).toBe("aspect-[9/16] w-full object-cover");
    expect(socialStoryMediaFrameClass()).not.toContain("aspect-video");
    expect(socialStoryMediaFrameClass()).not.toContain("aspect-[4/5]");
  });

  it("keeps published Social video off the media proxy and native video element", () => {
    const files = [
      "src/components/social/social-feed-video.tsx",
      "src/components/social/social-story-viewer.tsx",
      "src/components/social/social-story-rail-cover.tsx",
      "src/components/social/social-story-mux-thumb.tsx",
      "src/components/social/social-welcome-video.tsx",
      "src/app/(app)/social/explore/page.tsx",
      "src/app/(app)/social/stories/[id]/page.tsx",
      "src/lib/social-edge.ts",
      "src/lib/social-media-display.ts",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toContain("socialVideoDisplaySrc");
      expect(src).not.toContain("signedStoryPlaybackItems");
      expect(src).not.toContain("signedSocialMediaUrl");
      expect(src).not.toContain("#t=");
      if (file.endsWith(".tsx")) expect(src).not.toContain("<video");
    }
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    expect(player).toContain("onLoadedData={paint}");
    expect(player).toContain('data-social-mux-poster=""');
    expect(player).not.toContain("if (ready) onPaint?.()");
    const signedFace = player.slice(player.indexOf("{signed ? ("), player.indexOf(") : ("));
    expect(signedFace).toContain("onLoadedData={paint}");
    expect(signedFace).toContain('data-social-mux-poster="pending"');
    expect(signedFace).toContain("<MuxPoster");
    expect(signedFace).toContain("socialMuxThumbnailUrl(playbackId, tokens.thumbnail)");
    expect(signedFace).toContain("painted");
    expect(signedFace).not.toContain("<img");
    const pending = signedFace.slice(0, signedFace.indexOf("<MuxPoster"));
    expect(pending).not.toContain("socialMuxThumbnailUrl");
    expect(player).not.toContain("<video");
    expect(player).not.toContain("#t=");
  });
});
