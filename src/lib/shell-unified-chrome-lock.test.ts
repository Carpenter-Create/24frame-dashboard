import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lock = readFileSync("docs/design-locks/shell-unified-chrome-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const slider = readFileSync("docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md", "utf8");
const waffle = readFileSync("docs/design-locks/shell-workspace-waffle-layer-lock-v1.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");

describe("shell unified chrome lock v1 (Adam 2026-10-04)", () => {
  it("records the founder direction verbatim and the picked options", () => {
    expect(lock).toContain("**Date:** 2026-10-04");
    expect(lock).toContain(
      "be mindful that the header nav, and likely the side menu nav need to be consistent across all workspaces ... we want users to easily and quickly be able to toggle from one workspace to another (home, aggregation, social, education)",
    );
    expect(lock).toContain("keep our brand typography and colors too");
    expect(lock).toContain("default is light mode but users can go to dark mode");
    for (const pick of ['"Behind the grid button"', '"Rename to Feed"', '"Shell first"', '"A · Stage"']) {
      expect(lock).toContain(pick);
    }
    expect(lock).toContain("https://claude.ai/artifact/5pzjARNyFwvLXxcY5qUh4k");
  });

  it("locks the header, switcher, rail, dock, and Feed tokens", () => {
    expect(lock).toContain("**Home · Aggregation · Social · Education · Staff**");
    expect(lock).toContain("**[search] · Ask 24Frame AI · bell · avatar**");
    expect(lock).toContain("**[28 icon tile + label]**");
    expect(lock).toContain("**Home · Industry news**");
    expect(lock).toContain("**Aggregation · Social · Education · Staff**");
    expect(lock).toContain("`bg-accent text-accent-contrast`");
    expect(lock).toContain("Phosphor **Rows**");
    expect(lock).toContain("**Go to Feed**");
    expect(lock).toContain("A \"24\" tile, or any change to the brand mark");
    expect(lock).toContain("Search on Home, Aggregation, or Staff");
  });

  it("records the review fixes: Explore budget, Home frame, dock scope, keyboard, measured numbers", () => {
    expect(lock).toContain("(`md:shrink-0`), so nothing paints over the wordmark");
    expect(lock).toContain("| Explore, `md` to `lg` |");
    expect(lock).toContain("the accessible name stays **Exit**");
    expect(lock).toContain("| Keyboard | One Tab stop, always");
    expect(lock).toContain("returns focus to the icon");
    expect(lock).toContain("main + 22rem News from a **960** frame");
    expect(lock).toContain("| Other docks | Home, Aggregation, Education, Staff keep the light chip");
    expect(lock).toContain("4px accent mark");
    expect(lock).toContain("## Measured (Chromium, Geist, compiled CSS, light and dark)");
    expect(lock).toContain("## Founder check (open)");
    expect(lock).toContain("**Ask glyph colour.**");
    // The old limits line described an overlap the code no longer has.
    expect(lock).not.toContain("the trailing icons overlap the last segment");
    expect(lock).not.toContain("One dock primitive, so this holds in every workspace");
    const explore = readFileSync("docs/design-locks/social-explore-for-you-immersive-lock-v2.md", "utf8");
    expect(explore).toContain("from `md` to `lg` the chip shows only its X");
  });

  it("is indexed and supersedes the older shell locks in place", () => {
    expect(readme).toContain("[`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md)");
    expect(slider).toContain("**Superseded in part 2026-10-04** by [`shell-unified-chrome-lock-v1.md`]");
    expect(waffle).toContain("**Amended 2026-10-04:** [`shell-unified-chrome-lock-v1.md`]");
    expect(current).toContain("docs/design-locks/shell-unified-chrome-lock-v1.md");
    const sectionAt = current.indexOf("## Shared shell chrome");
    expect(sectionAt).toBeGreaterThan(-1);
    const section = current.slice(sectionAt, current.indexOf("---", sectionAt));
    expect(section).toContain("Home has its");
    expect(section).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
