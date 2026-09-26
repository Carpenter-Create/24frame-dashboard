import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; tokens?: { playback?: string } }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-has-tokens": props.tokens ? "yes" : "no",
      });
    },
}));

import { SocialFeedVideo } from "./social-feed-video";

describe("SocialFeedVideo", () => {
  it("uses Mux Player when a playback id is present", () => {
    const html = renderToStaticMarkup(
      createElement(SocialFeedVideo, {
        item: { url: "https://image.mux.com/abc12345/thumbnail.webp", playbackId: "abc12345xx" },
        className: "h-[360px]",
      }),
    );
    expect(html).toContain('data-social-mux-player="abc12345xx"');
    expect(html).toContain("data-social-post-video");
    expect(html).not.toContain("<video");
  });

  it("plays public and missing policy with the playback id and no tokens", () => {
    for (const playbackPolicy of [undefined, "public" as const]) {
      const html = renderToStaticMarkup(
        createElement(SocialFeedVideo, {
          item: {
            url: "https://image.mux.com/abc12345/thumbnail.webp",
            playbackId: "abc12345xx",
            ...(playbackPolicy ? { playbackPolicy } : {}),
          },
        }),
      );
      expect(html).toContain('data-social-mux-playback="public"');
      expect(html).toContain('data-mux-player-stub="abc12345xx"');
      expect(html).toContain('data-mux-has-tokens="no"');
      expect(html).not.toContain('data-mux-has-tokens="yes"');
      expect(html).not.toContain("playback-token");
    }
  });

  it("holds signed playback until tokens exist and does not mount a tokenless player", () => {
    const html = renderToStaticMarkup(
      createElement(SocialFeedVideo, {
        item: {
          url: "https://image.mux.com/abc12345/thumbnail.webp",
          playbackId: "abc12345xx",
          playbackPolicy: "signed",
        },
      }),
    );
    expect(html).toContain('data-social-mux-player="abc12345xx"');
    expect(html).toContain('data-social-mux-playback="pending"');
    expect(html).toContain('data-social-mux-poster="pending"');
    expect(html).not.toContain('data-social-mux-poster=""');
    expect(html).not.toContain("https://image.mux.com/abc12345xx/thumbnail.webp");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("data-mux-player-stub");
    expect(html).not.toContain('data-mux-has-tokens="yes"');
  });

  it("fails closed when a Social video has no Mux playback id", () => {
    const html = renderToStaticMarkup(
      createElement(SocialFeedVideo, {
        item: { url: "https://cf.example/signed-video" },
      }),
    );
    expect(html).toContain("data-social-video-closed");
    expect(html).toContain("data-social-post-video");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("https://cf.example/signed-video");
    expect(html).not.toContain("data-social-mux-player");
  });

  it("does not add a quality Settings maze", () => {
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    expect(player).toContain("streamType=\"on-demand\"");
    expect(player).toContain("objectFit: \"cover\"");
    expect(player).toContain("aspectRatio: \"auto\"");
    expect(player).toContain('tokens={{');
    expect(player).toContain("SOCIAL_MUX_PLAYBACK_ROUTE");
    expect(player).toContain("socialMuxPlaybackRequiresTokens");
    expect(player).toContain("if (!signed) return");
    expect(player).toContain("playback: tokens.playback");
    expect(player).not.toContain("@/lib/social-mux-server");
    expect(player).not.toContain("maxResolution");
    expect(player).not.toContain("minResolution");
    expect(player).not.toContain("renditionOrder");
  });

  it("keeps a missing Mux poster on the house muted canvas, not Mux blue", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("--media-background-color: var(--surface-muted)");
    expect(css).toContain("--media-object-fit: cover");
  });
});
