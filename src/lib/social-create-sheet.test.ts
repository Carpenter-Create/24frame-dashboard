import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "./social";
import { SOCIAL_CREATE_TILES, socialCreateTile } from "./social-create-sheet";

describe("Social Create sheet SoT", () => {
  it("locks Media · Write · Go live onto existing compose paths", () => {
    expect(SOCIAL_CREATE_TILES.map((tile) => tile.id)).toEqual([
      "media",
      "write",
      "live",
    ]);
    expect(SOCIAL_CREATE_TILES.map((tile) => tile.label)).toEqual([
      SOCIAL.create.media,
      SOCIAL.create.write,
      SOCIAL.create.goLive,
    ]);
    expect(socialCreateTile("media")?.href).toBe(socialCreateHref("media"));
    expect(socialCreateTile("write")?.href).toBe(socialCreateHref("text"));
    expect(socialCreateTile("live")?.href).toBe(SOCIAL_ROUTES.createLive);
  });

  // docs/design-locks/social-desktop-create-composer-lock-v1.md (Adam
  // 2026-10-08, "Open the composer"): desktop Create has no chooser.
  it("desktop: Create opens the composer window — no chooser, no menu, no tiles", () => {
    const dests = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
    const rail = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
    const header = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
    const switcher = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const railCreate = readFileSync("src/components/social/social-rail-create.tsx", "utf8");
    expect(dests).toContain("SocialCreateFan");
    expect(dests).toContain('data-social-create-fan-trigger=""');
    expect(dests).not.toContain("SocialCreateSheet");
    expect(dests).not.toContain("data-social-create-sheet");
    expect(dests).toContain("housePhoneDestIsCreate");
    expect(dests).not.toContain("SocialCreateMenu");
    expect(rail).toContain("SocialRailCreate");
    expect(rail).toContain('data-social-create-compose="dest"');
    expect(rail).toContain("isSocialCreateDest");
    expect(rail).not.toContain("SocialCreateSheet");
    expect(rail).not.toContain("SocialCreateMenu");
    expect(composer).toContain("SocialWriteComposeSheet");
    expect(composer).not.toContain('socialCreateHref("text")');
    expect(composer).toContain("data-social-composer-write");
    expect(composer).not.toContain("SocialCreateSheet");
    expect(composer).not.toContain('data-social-create-sheet="composer"');
    expect(composer).not.toContain("SocialCreateMenu");
    expect(header).not.toContain("SocialCreateSheet");
    expect(header).not.toContain("SocialCreateMenu");
    expect(switcher).not.toContain("SocialCreateSheet");
    expect(shell).not.toContain("SocialCreateSheet");
    expect(existsSync("src/components/social/social-create-sheet.tsx")).toBe(false);
    expect(railCreate).toContain("<SocialWriteComposeSheet");
    expect(railCreate).toContain('"aria-haspopup": "dialog"');
    expect(railCreate).not.toContain("SOCIAL_CREATE_TILES");
    expect(railCreate).not.toContain("MenuSurface");
    expect(railCreate).not.toContain("DropdownMenu");
    expect(railCreate).not.toContain("backdrop-blur");
    expect(railCreate).not.toMatch(/YouTube|Instagram|TikTok|Facebook|Meta/);

    const sot = readFileSync("src/lib/social-create-sheet.ts", "utf8");
    expect(sot).toContain("Coinbase institutional");
    expect(sot).toContain("Social media spine");
    expect(sot).toContain("Not Mercury-stiff");
    expect(sot).toContain("Not LinkedIn-grey");
    expect(sot).not.toContain("HOUSE_PHONE_BOTTOM_NAV_CHIP_CLASS");
  });
});
