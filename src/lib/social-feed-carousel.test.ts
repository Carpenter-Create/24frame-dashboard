import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_CAROUSEL_MIN_ITEMS,
  socialFeedCarouselChip,
  socialFeedCarouselIndex,
  socialFeedCarouselLabel,
  socialFeedCarouselShowLabel,
  socialFeedCarouselVideoUsesMux,
  socialFeedUsesCarousel,
} from "@/lib/social-feed-carousel";

describe("social feed carousel", () => {
  it("opens a carousel only when a feed post has two or more media items", () => {
    expect(SOCIAL_FEED_CAROUSEL_MIN_ITEMS).toBe(2);
    expect(socialFeedUsesCarousel(0)).toBe(false);
    expect(socialFeedUsesCarousel(1)).toBe(false);
    expect(socialFeedUsesCarousel(2)).toBe(true);
    expect(socialFeedUsesCarousel(4)).toBe(true);
    expect(socialFeedUsesCarousel(1.5)).toBe(false);
  });

  it("maps scroll position onto a bounded slide index", () => {
    expect(socialFeedCarouselIndex(0, 390, 3)).toBe(0);
    expect(socialFeedCarouselIndex(390, 390, 3)).toBe(1);
    expect(socialFeedCarouselIndex(780, 390, 3)).toBe(2);
    expect(socialFeedCarouselIndex(200, 390, 3)).toBe(1);
    expect(socialFeedCarouselIndex(9000, 390, 3)).toBe(2);
    expect(socialFeedCarouselIndex(-20, 390, 3)).toBe(0);
    expect(socialFeedCarouselIndex(10, 0, 3)).toBe(0);
  });

  it("draws the counter chip as N / M while the live region says N of M", () => {
    expect(socialFeedCarouselChip(0, 3)).toBe("1 / 3");
    expect(socialFeedCarouselChip(2, 3)).toBe("3 / 3");
    expect(socialFeedCarouselChip(9, 3)).toBe("3 / 3");
    expect(socialFeedCarouselChip(0, 0)).toBe("0 / 0");
    expect(SOCIAL.post.carouselChip(1, 3)).toBe("1 / 3");
  });

  it("labels the visible slide as N of M", () => {
    expect(socialFeedCarouselLabel(0, 3)).toBe("1 of 3");
    expect(socialFeedCarouselLabel(2, 3)).toBe("3 of 3");
    expect(socialFeedCarouselLabel(0, 3)).toBe(SOCIAL.post.carouselCount(1, 3));
    expect(socialFeedCarouselShowLabel(1, 4)).toBe("Show media 2 of 4");
    expect(SOCIAL.post.carousel).toBe("Post media");
    expect(socialFeedCarouselLabel(0, 3)).not.toContain("—");
    expect(socialFeedCarouselShowLabel(0, 3)).not.toContain("—");
  });

  it("allows a carousel video slide only when it has a Mux playback id", () => {
    expect(socialFeedCarouselVideoUsesMux({ kind: "video", playbackId: "abc12345xx" })).toBe(true);
    expect(socialFeedCarouselVideoUsesMux({ kind: "video", playbackId: "" })).toBe(false);
    expect(socialFeedCarouselVideoUsesMux({ kind: "video" })).toBe(false);
    expect(
      socialFeedCarouselVideoUsesMux({ kind: "image", playbackId: "abc12345xx" }),
    ).toBe(false);
  });

  // H · Posts (founder 2026-10-05): every slide fills one box, the post's
  // photo frame at the first still's true shape (no 560 cap).
  // docs/design-locks/social-feed-register-lock-v1.md §7
  it("keeps one Media Immersion box for every slide (the photo frame's true shape) and out of Stories", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const card = readFileSync("src/components/social/social-post-media.tsx", "utf8");
    const carousel = readFileSync("src/components/social/social-feed-carousel.tsx", "utf8");
    const slide = css.slice(css.indexOf(".social-feed-carousel-slide {"));
    expect(slide.slice(0, slide.indexOf("}"))).toContain("height: 100%;");
    expect(slide.slice(0, slide.indexOf("}"))).not.toContain("min(70vh, 560px)");
    expect(carousel).toContain("style={{ aspectRatio: String(aspect) }}");
    expect(carousel).toContain("socialPostPhotoAspect(");
    expect(chrome).toContain("SOCIAL_FEED_CAROUSEL_BLEED_CLASS");
    expect(chrome).not.toContain("grid-cols-2");
    expect(carousel).not.toContain("<video");
    expect(carousel).not.toContain("socialVideoDisplaySrc");
    expect(carousel).not.toContain("grid-cols");
    expect(carousel).not.toContain("collage");
    expect(carousel).not.toContain("social-story");
    expect(carousel).toContain("SocialMuxPlayer");
    expect(card).toContain("socialFeedUsesCarousel");
    const stories = readFileSync("src/components/social/social-story-viewer.tsx", "utf8");
    expect(stories).not.toContain("social-feed-carousel");
    expect(stories).not.toContain("SocialFeedCarousel");
  });
});
