import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialProfileEditTopicsHref } from "@/lib/social";
import {
  SOCIAL_PROFILE_PANEL_INSET_CLASS,
  SOCIAL_TOPIC_CHIP_BANK_CLASS,
  SOCIAL_TOPIC_CHIP_CLASS,
} from "@/lib/social-chrome";
import { SocialProfileInterests } from "./social-profile-interests";

describe("SocialProfileInterests", () => {
  it("lists Topics with the existing chip grammar and no ellipsis", () => {
    const html = renderToStaticMarkup(
      <SocialProfileInterests topics={["Acting", "Financing"]} />,
    );
    expect(html).toContain("data-social-profile-interests");
    expect(html).not.toContain("data-social-profile-interests-empty");
    expect(html).toContain('data-social-profile-topic="Acting"');
    expect(html).toContain('data-social-profile-topic="Financing"');
    expect(html).toContain(SOCIAL_TOPIC_CHIP_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_CHIP_BANK_CLASS);
    expect(html).toContain("flex-wrap");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("h-8");
    expect(html).not.toContain("py-[var(--space-2)]");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("text-ellipsis");
    expect(html).not.toContain("Topics:");
    expect(html).not.toContain(socialProfileEditTopicsHref());
  });

  it("lines the chips up with the head text and tabs: on the phone frame, 24 in on desktop", () => {
    const html = renderToStaticMarkup(<SocialProfileInterests topics={["Acting"]} />);
    const tokens = (html.match(/^<div[^>]*\bclass="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    expect(tokens).toContain(SOCIAL_PROFILE_PANEL_INSET_CLASS);
    expect(tokens).toContain("md:px-[var(--space-6)]");
    // The phone head bleeds edge to edge and its text sits 16 from the screen
    // (header lock decision 2), so the panel adds no phone-side inset.
    expect(tokens.filter((token) => /^-?(?:px|pl|pr|ps|pe|mx|ml|mr|ms|me)-/.test(token))).toEqual([]);
  });

  it("shows a quiet empty on the own profile that opens the Topics drill", () => {
    const html = renderToStaticMarkup(<SocialProfileInterests topics={[]} owner />);
    expect(html).toContain("data-social-profile-interests-empty");
    expect(html).toContain(SOCIAL.profile.interestsEmpty);
    expect(html).toContain(SOCIAL.profile.interestsEmptyOwnHint);
    expect(html).toContain(`href="${socialProfileEditTopicsHref()}"`);
    expect(html).toContain(`>${SOCIAL.profile.topics}<`);
    expect(html).not.toContain("data-social-profile-topic=");
    expect(html).not.toContain("data-social-profile-edit-topics");
  });

  it("renders nothing for a visitor with no Topics", () => {
    const html = renderToStaticMarkup(<SocialProfileInterests topics={[]} />);
    expect(html).toBe("");
  });
});
