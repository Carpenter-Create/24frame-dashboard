import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN } from "./social-story-rail-mint";

describe("story rail mint window", () => {
  it("looks ahead one card, not the ring", () => {
    expect(SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN).toBe("0px 160px 0px 160px");
    const margin = SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN.match(/\d+/g)?.map(Number) ?? [];
    expect(Math.max(...margin)).toBeLessThan(400);
    const cover = readFileSync("src/components/social/social-story-rail-cover.tsx", "utf8");
    const thumb = readFileSync("src/components/social/social-story-mux-thumb.tsx", "utf8");
    const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    expect(cover).toContain("SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN");
    expect(cover).toContain('loading="eager"');
    expect(cover).not.toContain('loading="lazy"');
    expect(thumb).toContain("if (!signed || !needed || provided) return");
    expect(home).toContain("warmStoryRailPlaybackTokens");
    expect(home).not.toContain("mintSocialMuxPlaybackTokens");
    expect(home).not.toContain("@/lib/social-mux-server");
  });
});
