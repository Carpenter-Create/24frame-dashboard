import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOME_DEST_RAIL_PX, HOME_LEFT_INSET_PX, HOME_RIGHT_INSET_PX } from "./home-width-lock";

const lock = readFileSync("docs/design-locks/shell-unified-chrome-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const slider = readFileSync("docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md", "utf8");
const waffle = readFileSync("docs/design-locks/shell-workspace-waffle-layer-lock-v1.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");

describe("shell unified chrome lock v1 (Adam 2026-10-04)", () => {
  // The long founder quote is guarded on its first clause under the
  // verbatim heading, so a prose fix elsewhere does not break the test.
  it("records the founder direction verbatim and the picked options", () => {
    expect(lock).toContain("**Date:** 2026-10-04");
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-04)");
    expect(lock).toContain("> be mindful that the header nav");
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
    // Settings and the Education course rail: wash row, accent-ink label
    // (founder pick "Deeper blue text", 2026-10-04).
    expect(lock).toContain("| Settings, Education course rail |");
    expect(lock).toContain("(`HOUSE_RAIL_ACTIVE_CLASS`)");
    expect(lock).toContain('"Deeper blue text" (Adam, 2026-10-04): 4.62:1');
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
    expect(lock).toContain("4px accent mark");
    expect(lock).toContain("## Measured");
    // The old limits line described an overlap the code no longer has.
    expect(lock).not.toContain("the trailing icons overlap the last segment");
    expect(lock).not.toContain("One dock primitive, so this holds in every workspace");
    const explore = readFileSync("docs/design-locks/social-explore-for-you-immersive-lock-v2.md", "utf8");
    expect(explore).toContain("from `md` to `lg` the chip shows only its X");
  });

  it("records the three founder picks as decisions and leaves no open founder check", () => {
    const decisionsAt = lock.indexOf("## Founder decisions");
    expect(decisionsAt).toBeGreaterThan(-1);
    const decisions = lock.slice(decisionsAt, lock.indexOf("## Verify-on-ship"));
    expect(decisions).toContain("None remain open on this lock.");
    for (const pick of ['**"Match everywhere"**', '**"Blue, as in the mockup"**', '**"Keep, stack as built"**']) {
      expect(decisions).toContain(pick);
    }
    // 1 — every dock uses the Social active style; the pick also accepts the Social mark and Create ring.
    expect(decisions).toContain("Every workspace's phone dock (Home, Aggregation, Education, Staff, and Social)");
    expect(decisions).toContain("no chip");
    expect(decisions).toContain("also accepts the Social dock mark and Create ring");
    // 2 — Ask sparkle accent; bell and search keep idle ink; the phone ink lock is amended.
    expect(decisions).toContain("`text-accent`");
    expect(decisions).toContain("Bell and search keep their idle ink");
    expect(decisions).toContain("Amends the phone chrome ink lock (`HOUSE_PHONE_CHROME_IDLE_INK_CLASS`");
    // 3 — narrow desktop accepted as built. The H register's 240 rail
    // moves the one-column range to 768–1263 (amended in place; the
    // screening chrome's 1223 and the picked range stay as history). One
    // marker for the range: the frame arithmetic below pins 1263 / 1264
    // open and 1103 / 1104 collapsed.
    expect(decisions).toContain("768 to 1263");
    expect(decisions).toContain("768 to 1223");
    expect(decisions).toContain("768 to 1279 when picked");
    expect(lock).not.toContain("one column from 768 to 1279 with the rail open");
    expect(lock).not.toContain("With the rail open that is one column from 768 to 1279,");
    expect(lock).toContain("**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`]");
    // The range is arithmetic, not a guess: the Home frame (viewport −
    // rail − 32 − 32) reaches 960 at 1264 open and 1104 collapsed.
    const frameAt = (viewport: number, rail: number) =>
      viewport - rail - HOME_LEFT_INSET_PX - HOME_RIGHT_INSET_PX;
    expect(frameAt(1263, HOME_DEST_RAIL_PX)).toBeLessThan(960);
    expect(frameAt(1264, HOME_DEST_RAIL_PX)).toBe(960);
    const tokens = readFileSync("src/app/tokens.css", "utf8");
    const collapsed = Number(tokens.match(/--sidebar-width-collapsed:\s*(\d+)px;/)?.[1]);
    expect(tokens).toMatch(new RegExp(`--sidebar-width:\\s*${HOME_DEST_RAIL_PX}px;`));
    expect(frameAt(1103, collapsed)).toBeLessThan(960);
    expect(frameAt(1104, collapsed)).toBe(960);
    expect(decisions).toContain("below 1024 (`md` to `lg`) Exit is the compact X-only chip");
    // The open list is gone, and so is every pinned "keep the chip" line.
    expect(lock).not.toContain("## Founder check (open)");
    expect(lock).not.toContain("**Ask glyph colour.**");
    expect(lock).not.toContain("Other docks keep the chip");
    expect(lock).not.toContain("keep the light chip");
    expect(lock).toContain("| Active dest, every dock |");
    expect(lock).toContain("| Other docks | Home, Aggregation, Education, Staff have no Create.");
    expect(lock).toContain("**G6.** Every dock: active accent ink + mark, no chip.");
    expect(lock).toContain("The sparkle is accent (`text-accent`)");
    // The phone ink lock in code records the amendment.
    const phoneShell = readFileSync("src/lib/house-phone-shell.ts", "utf8");
    expect(phoneShell).toContain('Amended Adam 2026-10-04 ("Blue, as in the mockup")');
    // The H register supersedes the screening chrome's ink mark (which had
    // superseded the accent mark of "Match everywhere"): the current dest
    // is the filled glyph in accent. The code records that.
    expect(phoneShell).toContain("supersedes the screening chrome's ink mark");
    expect(phoneShell).not.toContain('supersedes "Match everywhere"');
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
