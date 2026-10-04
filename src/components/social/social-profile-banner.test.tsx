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

import {
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_COVER_EMPTY_CLASS,
} from "@/lib/social-chrome";
import { SocialProfileBanner, SocialProfileCoverBlock } from "./social-profile-banner";

describe("SocialProfileBanner", () => {
  it("omits the band when a visitor has no cover photo", () => {
    for (const coverUrl of [null, undefined, "", "   "]) {
      const html = renderToStaticMarkup(<SocialProfileBanner coverUrl={coverUrl} />);
      expect(html).toBe("");
      expect(html).not.toContain("data-social-profile-cover");
      expect(html).not.toContain("data-social-profile-cover-empty");
      expect(html).not.toContain(SOCIAL_PROFILE_COVER_CLASS);
      expect(html).not.toContain(SOCIAL_PROFILE_COVER_EMPTY_CLASS);
      expect(html).not.toContain("h-[112px]");
      expect(html).not.toContain("<img");
    }
  });

  it("renders a signed cover and omits the empty wash", () => {
    const html = renderToStaticMarkup(
      <SocialProfileBanner coverUrl="https://cf.example/cover.jpg" />,
    );
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-loading="lazy"');
    expect(html).not.toContain("data-priority");
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain("data-social-profile-cover");
    expect(html).toContain(SOCIAL_PROFILE_COVER_CLASS);
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain(SOCIAL_PROFILE_COVER_EMPTY_CLASS);
    expect(html).not.toContain("data-social-profile-cover-edit");
  });
});

describe("SocialProfileCoverBlock", () => {
  it("keeps the empty band and owner edit chrome when there is no cover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileCoverBlock
        coverUrl={null}
        coverEdit={<button type="button" data-social-profile-cover-edit="">Add cover photo</button>}
      />,
    );
    expect(html).toContain("data-social-profile-cover-block");
    expect(html).toContain("data-social-profile-cover");
    expect(html).toContain("data-social-profile-cover-empty");
    expect(html).toContain(SOCIAL_PROFILE_COVER_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_COVER_EMPTY_CLASS);
    expect(html).toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("<img");
  });

  it("renders a signed cover without the empty wash", () => {
    const html = renderToStaticMarkup(
      <SocialProfileCoverBlock
        coverUrl="  https://cf.example/cover.jpg  "
        coverEdit={<button type="button" data-social-profile-cover-edit="">Edit cover</button>}
      />,
    );
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-loading="lazy"');
    expect(html).not.toContain("data-priority");
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain(SOCIAL_PROFILE_COVER_EMPTY_CLASS);
  });
});

describe("SocialProfileCoverImage", () => {
  it("is the one cover image for visitors and owners, with a broken-src fallback", () => {
    const banner = readFileSync("src/components/social/social-profile-banner.tsx", "utf8");
    const visitor = banner.slice(
      banner.indexOf("export function SocialProfileBanner"),
      banner.indexOf("export function SocialProfileCoverBlock"),
    );
    const owner = banner.slice(banner.indexOf("export function SocialProfileCoverBlock"));
    expect(visitor).toContain("<SocialProfileCoverImage src={photo} />");
    expect(owner).toContain("<SocialProfileCoverImage src={photo} />");
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
