import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));
vi.mock("@/app/(app)/social/query-actions", () => ({ readSocialProfile: vi.fn() }));
vi.mock("@/app/(app)/social/actions", () => ({
  clearSocialProfileCover: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  saveSocialProfileCover: vi.fn(),
}));
vi.mock("@/app/(app)/account/actions", () => ({ uploadAccountPhoto: vi.fn() }));

import {
  SOCIAL_HOME_LAYOUT_CLASS,
  SOCIAL_PROFILE_CENTER_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
} from "@/lib/social-chrome";

import { SocialProfileOptimisticShell } from "./social-own-profile";

describe("Social profile save-hop and loading overlay", () => {
  it("paints the owner band inside the real layout row with the For You placeholder (G6)", () => {
    const html = renderToStaticMarkup(
      <SocialProfileOptimisticShell
        serverOverlay={{ handle: "ada", displayName: "Ada Lovelace", coverUrl: null }}
        fallback={<p data-fallback="">fallback</p>}
      />,
    );
    expect(html).not.toContain("data-fallback");
    const rootOpen = html.slice(0, html.indexOf(">"));
    expect(rootOpen).toContain("data-social-profile-optimistic");
    expect(rootOpen).toContain(`class="${SOCIAL_HOME_LAYOUT_CLASS}"`);
    const centerAt = html.indexOf(`class="${SOCIAL_PROFILE_CENTER_CLASS}"`);
    const identityAt = html.indexOf("data-social-profile-identity");
    const forYouAt = html.indexOf("data-social-for-you-skeleton");
    expect(centerAt).toBeGreaterThan(0);
    expect(identityAt).toBeGreaterThan(centerAt);
    expect(forYouAt).toBeGreaterThan(identityAt);
    // Owner with no cover keeps the wash band, so nothing jumps when the real face mounts.
    expect(html).toContain("data-social-profile-cover-empty");
    expect(html).toContain("bg-accent-wash");
    expect(html).toContain(SOCIAL_PROFILE_HEAD_OVERLAP_CLASS);
    // No editor chrome in the overlay.
    expect(html).not.toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("data-social-profile-head-trail");
  });

  it("passes owner on the real own face and the stored framing to the editor", () => {
    const src = readFileSync("src/components/social/social-own-profile.tsx", "utf8");
    const view = src.slice(src.indexOf("function SocialOwnProfileFaceView"));
    expect(view).toContain("owner");
    expect(view).toContain("coverFraming={coverFraming}");
  });
});
