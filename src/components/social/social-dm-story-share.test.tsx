import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub() {
      return null;
    },
}));

import { SOCIAL, socialStoryHref } from "@/lib/social";
import { SocialDmStoryShare } from "./social-dm-story-share";

const author = {
  authorName: "Ada Lovelace",
  authorPhotoUrl: null,
};

describe("SocialDmStoryShare", () => {
  it("plays Mux video through SocialFeedVideo and fails closed without a playback id", () => {
    const src = readFileSync("src/components/social/social-dm-story-share.tsx", "utf8");
    const host = readFileSync("src/lib/social-dm-story-fullscreen.ts", "utf8");
    expect(src).toContain("SocialFeedVideo");
    expect(src).toContain("chromeless");
    expect(src).toContain('querySelector("video")');
    expect(src).toContain('querySelector("mux-player")');
    expect(src).not.toContain("[data-social-mux-player], video");
    expect(host).toContain("webkitEnterFullscreen");
    expect(host).toContain("requestFullscreen");
    expect(src).not.toContain("SocialMuxPlayer");
    expect(src).not.toContain("HouseOverlay");
    expect(src).not.toContain("poster=");

    const mux = renderToStaticMarkup(
      createElement(SocialDmStoryShare, {
        ...author,
        unavailable: false,
        kind: "video",
        url: "https://image.mux.com/abc12345xx/thumbnail.webp",
        playbackId: "abc12345xx",
        href: null,
      }),
    );
    expect(mux).toContain('data-social-dm-story-share=""');
    expect(mux).toContain("w-[168px]");
    expect(mux).toContain("aspect-[9/16]");
    expect(mux).toContain("rounded-[8px]");
    expect(mux).toContain("border-hairline");
    expect(mux).toContain("bg-[#0A0A0B]");
    expect(mux).toContain("data-social-dm-story-chip");
    expect(mux).toContain("absolute inset-x-0 top-0");
    expect(mux).not.toContain("<footer");
    expect(mux).not.toContain("bg-surface ");
    expect(mux).toContain("p-[8px]");
    expect(mux).toContain("size-6");
    expect(mux).toContain("Ada Lovelace");
    expect(mux).toContain(SOCIAL.dms.storyMeta);
    expect(mux).toContain('data-social-mux-player="abc12345xx"');
    expect(mux).toContain("data-social-post-video");
    expect(mux).toContain("data-social-dm-story-video");
    expect(mux).not.toContain("<video");
    expect(mux).toContain('data-social-mux-poster=""');
    expect(mux).toContain("https://image.mux.com/abc12345xx/thumbnail.webp");
    expect(mux).not.toContain("/social/stories");
    expect(mux).not.toContain("shadow");

    const signed = renderToStaticMarkup(
      createElement(SocialDmStoryShare, {
        ...author,
        unavailable: false,
        kind: "video",
        url: "",
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        playbackPolicy: "signed",
        href: null,
      }),
    );
    expect(signed).toContain('data-social-mux-player="uNbxnGLKJ00yfbijDO8COxT"');
    expect(signed).toContain('data-social-mux-playback="pending"');
    expect(signed).toContain('data-social-mux-poster="pending"');
    expect(signed).not.toContain("image.mux.com");
    expect(signed).not.toContain("<img");
    expect(signed).not.toContain(SOCIAL.dms.storyUnavailable);
    expect(signed).not.toContain("<video");
    expect(signed).not.toContain("/api/social/media");

    const file = renderToStaticMarkup(
      createElement(SocialDmStoryShare, {
        ...author,
        unavailable: false,
        kind: "video",
        url: "/api/social/media?key=clip.mp4",
        href: null,
      }),
    );
    expect(file).toContain("data-social-video-closed");
    expect(file).not.toContain("<video");
    expect(file).toContain("data-social-post-video");
    expect(file).not.toContain("/api/social/media");
    expect(file).not.toContain("<img");
    expect(file).not.toContain("/social/stories");
  });

  it("opens a photo in the stories viewer and withholds an expired story", () => {
    const photo = renderToStaticMarkup(
      createElement(SocialDmStoryShare, {
        ...author,
        unavailable: false,
        kind: "image",
        url: "/api/social/media?key=still.jpg",
        href: socialStoryHref("s1"),
      }),
    );
    expect(photo).toContain(`href="${socialStoryHref("s1")}"`);
    expect(photo).toContain("data-social-dm-story-photo");
    expect(photo).not.toContain("<video");
    expect(photo).not.toContain(`>${socialStoryHref("s1")}<`);

    const expired = renderToStaticMarkup(
      createElement(SocialDmStoryShare, {
        ...author,
        unavailable: true,
        kind: null,
        url: null,
        href: null,
      }),
    );
    expect(expired).toContain(SOCIAL.dms.storyUnavailable);
    expect(expired).not.toContain("/social/stories");
    expect(expired).not.toContain("<video");
    expect(expired).not.toContain("http");
  });
});
