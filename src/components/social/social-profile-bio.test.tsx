import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SOCIAL, socialBioCounterLabel } from "@/lib/social";
import { SocialProfileBioDraftEditor, SocialProfileBioEditor } from "./social-profile-bio";

// --accent read from tokens.css, so this guard follows the pending GC accent checkpoint.
const ACCENT = readFileSync("src/app/tokens.css", "utf8").match(/--accent:\s*(#[0-9a-fA-F]{6});/)?.[1];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  updateSocialBio: vi.fn(),
}));

describe("SocialProfileBioEditor", () => {
  it("renders the 150 counter, privacy copy, and Sporty Blue check Done", () => {
    const bio = "Founder\nInvestor";
    const html = renderToStaticMarkup(<SocialProfileBioEditor bio={bio} />);
    expect(html).toContain("data-social-profile-bio");
    expect(html).toContain(SOCIAL.profile.bio);
    expect(html).toContain(SOCIAL.profile.bioLabel);
    expect(html).toContain("data-social-bio-count");
    expect(html).toContain(socialBioCounterLabel(bio));
    expect(html).toContain("16 / 150");
    expect(html).toContain("data-social-bio-textarea");
    expect(html).toContain("Founder\nInvestor");
    expect(html).toContain("data-social-bio-done");
    expect(html).toContain('data-social-icon="check"');
    expect(html).toContain("data-social-bio-privacy");
    expect(html).toContain(SOCIAL.profile.bioPrivacy);
    expect(html).toContain(`href="${"/social/profile/edit"}"`);
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Education");
    expect(ACCENT).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(html.toLowerCase()).not.toContain(String(ACCENT).toLowerCase());
    expect(html).toContain("t-control");
    expect(html).not.toMatch(/data-social-bio-textarea=""[^>]*t-body-sm/);
  });

  it("inside Edit is part of the one draft: same-tree Back, no Bio-only save", () => {
    const html = renderToStaticMarkup(
      <SocialProfileBioDraftEditor value={"Founder"} onChange={() => undefined} onBack={() => undefined} />,
    );
    expect(html).toContain("data-social-profile-bio-back");
    expect(html).not.toContain('href="/social/profile/edit"');
    expect(html).toContain("data-social-bio-textarea");
    expect(html).toContain(socialBioCounterLabel("Founder"));
    expect(html).not.toContain("data-social-bio-done");
    expect(html).not.toContain('data-social-icon="check"');
  });
});
