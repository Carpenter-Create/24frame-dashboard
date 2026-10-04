import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialProfileEditTopicsHref } from "@/lib/social";
import { SOCIAL_TOPIC_CHIP_BANK_CLASS, SOCIAL_TOPIC_CHIP_CLASS } from "@/lib/social-chrome";
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

  it("lines the chips up with the Stage face and tabs: no side inset on phone or desktop", () => {
    const html = renderToStaticMarkup(<SocialProfileInterests topics={["Acting"]} />);
    const tokens = (html.match(/^<div[^>]*\bclass="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    // The face under the hero starts at the column edge at every width
    // (docs/design-locks/social-profile-stage-lock-v1.md), so the panel adds
    // no horizontal inset at any breakpoint.
    expect(tokens.filter((token) => /^(?:[\w-]+:)*-?(?:px|pl|pr|ps|pe|mx|ml|mr|ms|me)-/.test(token))).toEqual([]);
    expect(tokens).toContain("py-[var(--space-4)]");
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
