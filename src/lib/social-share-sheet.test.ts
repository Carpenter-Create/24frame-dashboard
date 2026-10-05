import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BRAND_MARK_FILL } from "@/lib/brand";
import { PRODUCT_NAME } from "@/lib/product";
import { socialProfilePublicUrl } from "@/lib/social";
import { SOCIAL_FIGMA_PROFILE_SHARE } from "@/lib/social-chrome";
import {
  copySocialProfileUrl,
  shareSocialProfile,
  socialProfileQrModules,
  socialShareCardFilename,
  socialShareCardLabel,
  socialSharePayload,
  SOCIAL_SHARE_CARD_SURFACE,
  SOCIAL_SHARE_QR_INK,
  SOCIAL_SHARE_QR_MARK,
} from "./social-share-sheet";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "social-share-sheet.ts"), "utf8");
const chrome = readFileSync(join(here, "social-chrome.ts"), "utf8");
const sheet = readFileSync(join(here, "../components/social/social-share-sheet.tsx"), "utf8");
const button = readFileSync(join(here, "../components/social/social-share-button.tsx"), "utf8");
const home = readFileSync(join(here, "../app/(app)/social/page.tsx"), "utf8");
const identity = readFileSync(join(here, "../components/social/social-profile-identity.tsx"), "utf8");

describe("Profile share sheet lock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("encodes the canonical apex URL into Sporty Blue QR payload and card label", () => {
    expect(socialSharePayload("Ada")).toEqual({
      title: "@Ada",
      url: "https://24frame.co/@Ada",
    });
    expect(socialSharePayload("AdamC")).toEqual({
      title: "@AdamC",
      url: "https://24frame.co/@AdamC",
    });
    expect(socialShareCardLabel("ada")).toBe("@ADA");
    expect(socialShareCardFilename("ada")).toBe(`${PRODUCT_NAME}-@ada.png`);
    expect(socialProfilePublicUrl("ada")).toBe("https://24frame.co/@ada");
    expect(socialProfilePublicUrl("AdamC")).toBe("https://24frame.co/@AdamC");
    expect(socialProfilePublicUrl("AdamC")).not.toContain("/social/@");
    const modules = socialProfileQrModules("https://24frame.co/@ada");
    expect(modules.length).toBeGreaterThan(20);
    expect(modules.some((row) => row.includes(true))).toBe(true);
    expect(SOCIAL_SHARE_QR_INK).toBe(BRAND_MARK_FILL);
    expect(SOCIAL_SHARE_QR_INK).toBe("#1769FF");
    expect(SOCIAL_SHARE_CARD_SURFACE).toBe("#ffffff");
    expect(SOCIAL_SHARE_QR_MARK).toBe("24");
  });

  it("shares natively when available and copies the same URL as fallback", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    await expect(shareSocialProfile("ada")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "@ada",
      url: "https://24frame.co/@ada",
    });
    expect(writeText).not.toHaveBeenCalled();

    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(shareSocialProfile("ada")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://24frame.co/@ada");

    await copySocialProfileUrl("maya");
    expect(writeText).toHaveBeenCalledWith("https://24frame.co/@maya");
  });

  it("does not treat a cancelled native share as a copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError")),
      clipboard: { writeText },
    });
    await expect(shareSocialProfile("ada")).rejects.toMatchObject({ name: "AbortError" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("locks the sheet to Profile own/public, house frames, and no cousin IA", () => {
    expect(SOCIAL_FIGMA_PROFILE_SHARE).toEqual(["155:194", "155:372"]);
    expect(chrome).toContain("155:194");
    expect(chrome).toContain("155:372");
    expect(chrome).not.toContain("SOCIAL_SHARE_TOAST_CLASS");
    expect(chrome).not.toMatch(/shadow-\[|drop-shadow|shadow-sm|shadow-md/);
    expect(sheet).toContain("data-social-share-sheet");
    expect(sheet).toContain("data-social-share-card");
    expect(sheet).toContain("data-social-share-profile");
    expect(sheet).toContain("data-social-share-copy");
    expect(sheet).toContain("data-social-share-download");
    expect(sheet).toContain("copySocialProfileUrl");
    expect(sheet).toContain("downloadSocialShareCard");
    expect(src).toContain("navigator.share");
    expect(sheet).not.toContain("WASH pill");
    expect(sheet).not.toContain("squares-four");
    expect(sheet).not.toContain("Education");
    expect(sheet).not.toContain("InlineNotice");
    expect(sheet).not.toContain("socialProfilePublicHost");
    expect(button).toContain("SocialShareSheet");
    expect(button).not.toContain("clipboard.writeText");
    expect(button).not.toContain("InlineNotice");
    expect(home).not.toContain("SocialShareButton");
    expect(home).not.toContain("SocialShareSheet");
    expect(identity).not.toContain("socialProfilePublicHost");
    expect(identity).not.toContain("data-social-profile-url");
    expect(src).toContain("errorCorrectionLevel: \"H\"");
    expect(src).toContain("socialProfilePublicUrl");
  });
});
