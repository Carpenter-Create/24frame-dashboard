import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
    priority,
    loading,
  }: {
    src: string;
    className?: string;
    priority?: boolean;
    loading?: "eager" | "lazy";
  }) =>
    createElement("img", {
      src,
      className,
      alt: "",
      loading,
      "data-priority": priority ? "" : undefined,
      "data-loading": loading,
    }),
}));

import { SOCIAL_PROFILE_COVER_CLASS } from "@/lib/social-chrome";
import { SocialProfileCover } from "./social-profile-banner";

describe("SocialProfileCover (Stage hero cover layer)", () => {
  it("renders nothing without a photo, so the hero's band shows", () => {
    for (const coverUrl of [null, undefined, "", "   "]) {
      const html = renderToStaticMarkup(<SocialProfileCover coverUrl={coverUrl} />);
      expect(html).toBe("");
    }
  });

  it("renders the signed cover lazily, as an object-cover layer of the hero", () => {
    const html = renderToStaticMarkup(<SocialProfileCover coverUrl="  https://cf.example/cover.jpg  " />);
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-loading="lazy"');
    expect(html).not.toContain("data-priority");
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain('data-social-profile-cover=""');
    expect(html).toContain(`class="${SOCIAL_PROFILE_COVER_CLASS}"`);
    // Its own frame box at the top of the hero (Stage lock), not the hero's
    // content height: a taller hero never re-crops the framed cover.
    expect(SOCIAL_PROFILE_COVER_CLASS).toBe(
      "absolute inset-x-0 top-0 overflow-hidden aspect-[61/55] min-[30rem]:aspect-[16/7] group-has-[[data-social-cover-drag]]/hero:aspect-[16/7]",
    );
    expect(html).toContain("object-cover");
    expect(html).not.toContain("data-social-profile-cover-edit");
  });
});

describe("SocialProfileCoverImage", () => {
  it("is the one cover image for visitors and owners, with a broken-src fallback", () => {
    const banner = readFileSync("src/components/social/social-profile-banner.tsx", "utf8");
    expect(banner).toContain("<SocialProfileCoverImage src={photo} />");
    expect(banner).not.toContain("<SocialMediaImage");
    const image = readFileSync("src/components/social/social-profile-cover-image.tsx", "utf8");
    expect(image.startsWith('"use client";')).toBe(true);
    expect(image).toContain("onError={() => setBrokenSrc(src)}");
    expect(image).toContain("if (brokenSrc === src) return null;");
    expect(image).toContain('loading="lazy"');
    expect(image).toContain("SOCIAL_PROFILE_COVER_IMAGE_SIZES");
    expect(image).not.toContain("priority");
  });
});
