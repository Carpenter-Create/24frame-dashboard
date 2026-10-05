import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

import {
  SOCIAL_FEED_HEADING_CLASS,
  SOCIAL_FEED_REEL_CAPTION_CLASS,
  SOCIAL_FEED_REEL_FACE_CLASS,
  SOCIAL_FEED_REEL_NAME_CLASS,
  SOCIAL_FEED_REEL_SCRIM_CLASS,
  SOCIAL_FEED_REEL_TILE_CLASS,
  SOCIAL_FEED_REEL_VIGNETTE_CLASS,
  SOCIAL_FEED_REELS_ARROW_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_ARROWS_CLASS,
  SOCIAL_FEED_REELS_ITEM_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
} from "@/lib/social-chrome";
import { socialFeedReelTiles, type SocialFeedReelTile } from "@/lib/social-feed-reels";
import { SOCIAL } from "@/lib/social";

import { SocialFeedReelRail } from "./social-feed-reel-rail";

const AUTHOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function tiles(n: number, body = "Blocking the rooftop"): SocialFeedReelTile[] {
  return socialFeedReelTiles({
    hits: Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, authorId: AUTHOR, body })),
    mediaByPost: new Map(
      Array.from({ length: n }, (_, i) => [
        `r${i + 1}`,
        [
          {
            kind: "video" as const,
            url: "",
            contentType: "video/mp4" as const,
            playbackId: `ReelStill${i + 1}PlaybackA`,
            playbackPolicy: "signed" as const,
            width: 1080,
            height: 1920,
          },
        ],
      ]),
    ),
    authors: new Map([[AUTHOR, { handle: "priya", display_name: "Priya Nair" }]]),
  });
}

// docs/design-locks/social-feed-reel-rail-lock-v1.md
describe("SocialFeedReelRail", () => {
  // H · Feed (founder 2026-10-05; replaces the 13px uppercase eyebrow):
  // "Reels" is a 20 / 480 heading in normal case; the arrows are round grey 44s.
  it("renders the Reels section: a 20 / 480 heading, desktop arrows, a list of tile links", () => {
    const html = renderToStaticMarkup(<SocialFeedReelRail rail={0} tiles={tiles(4)} />);
    expect(html).toContain('<section aria-label="Reels" data-social-feed-reels="0"');
    expect(html).toContain(`<h2 class="${SOCIAL_FEED_HEADING_CLASS}">${SOCIAL.reels.title}</h2>`);
    expect(SOCIAL_FEED_HEADING_CLASS).not.toMatch(/uppercase|tracking-\[0\.06em\]/);
    const arrows = html.slice(html.indexOf("data-social-feed-reels-arrows"), html.indexOf("data-social-feed-reels-track"));
    expect(arrows.match(/<svg[^>]*width="20"/g)?.length).toBe(2);
    expect(arrows).not.toContain('width="14"');
    expect(html).toContain(`class="${SOCIAL_FEED_REELS_ARROWS_CLASS}"`);
    expect(SOCIAL_FEED_REELS_ARROWS_CLASS).toContain("hidden");
    expect(SOCIAL_FEED_REELS_ARROWS_CLASS).toContain("md:flex");
    // At rest the rail is at its start: Previous is off, Next is on.
    expect(html).toContain(
      `aria-label="${SOCIAL.reels.previous}" aria-disabled="true" data-social-feed-reels-prev="" class="${SOCIAL_FEED_REELS_ARROW_OFF_CLASS}"`,
    );
    expect(html).toContain(
      `aria-label="${SOCIAL.reels.next}" data-social-feed-reels-next="" class="${SOCIAL_FEED_REELS_ARROW_CLASS}"`,
    );
    expect(html).toContain(`<ul data-social-feed-reels-track="" class="${SOCIAL_FEED_REELS_TRACK_CLASS}">`);
    expect(html.split(`<li class="${SOCIAL_FEED_REELS_ITEM_CLASS}">`).length - 1).toBe(4);
    expect(html.split(`class="${SOCIAL_FEED_REEL_TILE_CLASS}"`).length - 1).toBe(4);
    expect(html).toContain('href="/social/explore?v=r1"');
    expect(html).toContain('aria-label="Priya Nair, Blocking the rooftop. Opens in Explore"');
  });

  it("lays out the tile: held still, vignette, band scrim, 24 portrait, name, caption", () => {
    const html = renderToStaticMarkup(<SocialFeedReelRail rail={1} tiles={tiles(2)} />);
    const tile = html.slice(html.indexOf('data-social-feed-reel="r1"'), html.indexOf('data-social-feed-reel="r2"'));
    expect(tile).toContain('data-social-feed-reel-still="held"');
    expect(tile.indexOf('data-social-feed-reel-still="held"')).toBeLessThan(tile.indexOf(SOCIAL_FEED_REEL_VIGNETTE_CLASS));
    expect(tile.indexOf(SOCIAL_FEED_REEL_VIGNETTE_CLASS)).toBeLessThan(tile.indexOf(SOCIAL_FEED_REEL_SCRIM_CLASS));
    expect(tile).toContain(SOCIAL_FEED_REEL_FACE_CLASS);
    expect(SOCIAL_FEED_REEL_FACE_CLASS).toContain("size-6");
    expect(tile).toContain(`<span class="${SOCIAL_FEED_REEL_NAME_CLASS}">Priya Nair</span>`);
    expect(tile).toContain(`<span class="${SOCIAL_FEED_REEL_CAPTION_CLASS}">Blocking the rooftop</span>`);
    // Stills only, held until near: no player, no video, no minted Mux URL.
    expect(html).not.toContain("<video");
    expect(html).not.toContain("data-social-mux-player");
    expect(html).not.toContain("image.mux.com");
    // The portrait waits with the still: initials until the rail is near.
    expect(html).not.toContain("<img");
    expect(html).not.toContain("/api/social/avatar/");
    expect(html).not.toMatch(/truncate|line-clamp|…/);
    expect(html).not.toContain("accent");
  });

  it("drops a caption that cannot sit whole on the tile, never cutting it", () => {
    const long = `${"Long first line ".repeat(8)}end`;
    const html = renderToStaticMarkup(<SocialFeedReelRail rail={0} tiles={tiles(2, long)} />);
    expect(html).not.toContain(`<span class="${SOCIAL_FEED_REEL_CAPTION_CLASS}">`);
    expect(html).toContain(`aria-label="Priya Nair, ${long}. Opens in Explore"`);
    expect(html).not.toContain("…");
  });
});
