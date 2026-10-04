import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

import { SocialStoryRailFace } from "./social-story-rail-face";

const AVATAR = "/api/social/avatar/11111111-1111-4111-8111-111111111111";

describe("SocialStoryRailFace", () => {
  it("paints a face URL and falls back to initials when the URL is missing", () => {
    const photo = renderToStaticMarkup(<SocialStoryRailFace name="Maya Chen" photoUrl={AVATAR} />);
    expect(photo).toContain(`src="${AVATAR}"`);
    expect(photo).not.toContain("MC");
    const missing = renderToStaticMarkup(<SocialStoryRailFace name="Maya Chen" photoUrl={null} />);
    expect(missing).toContain("MC");
    expect(missing).not.toContain("<img");
  });

  it("drops a 404 face the same way SocialAvatar drops a broken photo", () => {
    const src = readFileSync("src/components/social/social-story-rail-face.tsx", "utf8");
    const rail = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
    expect(src).toContain("onError={() => setBrokenSrc(face)}");
    expect(src).toContain("socialInitials(name)");
    expect(src).not.toContain("<img");
    expect(rail).toContain("SocialStoryRailFace");
    expect(rail).toContain("SocialStoryRailCover");
    expect(rail).not.toContain("SocialMediaImage");
    expect((rail.match(/<SocialStoryRailFace /g) ?? []).length).toBe(1);
    const home = rail.slice(rail.indexOf("function HomeStoryTiles"), rail.indexOf("export function SocialStoriesRail"));
    expect(home).toContain("SocialStoryRailCover");
    expect(home).not.toContain("SocialStoryRailFace");
  });
});
