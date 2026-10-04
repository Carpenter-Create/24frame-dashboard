import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialProfileVisibleTabs } from "@/lib/social";
import {
  SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_IDLE_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS,
  SOCIAL_PROFILE_SECTION_TABS_CLASS,
} from "@/lib/social-chrome";
import { SocialProfileTabs } from "./social-profile-tabs";

describe("SocialProfileTabs", () => {
  it("ships Activity | Highlights | Credits | Interests as section pills (Stage lock)", () => {
    const html = renderToStaticMarkup(
      <SocialProfileTabs baseHref="/social/profile" active="credits" />,
    );
    expect(html).toContain("data-social-profile-tabs");
    expect(html).toContain(`class="${SOCIAL_PROFILE_SECTION_TABS_CLASS}"`);
    // Phone: one full-width segmented row, never a sideways scroll.
    expect(html).not.toContain("overflow-x-auto");
    // No underline: no accent bar, no hairline rule.
    expect(html).not.toContain("h-0.5");
    expect(html).not.toContain("bg-hairline");
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain('data-social-profile-tab="highlights"');
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).toContain('data-social-profile-tab="interests"');
    expect(html).not.toContain('data-social-profile-tab="posts"');
    expect(html).toContain(SOCIAL.profile.activityTab);
    expect(html).toContain(SOCIAL.profile.highlightsTab);
    expect(html).toContain(SOCIAL.profile.creditsTab);
    expect(html).toContain(SOCIAL.profile.interestsTab);
    expect(html).toContain('href="/social/profile"');
    expect(html).toContain("/social/profile?tab=credits");
    expect(html).toContain("/social/profile?tab=highlights");
    expect(html).toContain("/social/profile?tab=interests");
    expect(html).not.toContain("/social/profile?tab=activity");
    expect(html.indexOf('data-social-profile-tab="activity"')).toBeLessThan(
      html.indexOf('data-social-profile-tab="highlights"'),
    );
    expect(html.indexOf('data-social-profile-tab="highlights"')).toBeLessThan(
      html.indexOf('data-social-profile-tab="credits"'),
    );
    expect(html.indexOf('data-social-profile-tab="credits"')).toBeLessThan(
      html.indexOf('data-social-profile-tab="interests"'),
    );
    expect(html).not.toContain("Education");
    expect(html).not.toContain("Reels");
    expect(html).not.toContain("Organization");
    expect(html).not.toContain("Following");
    expect(html).not.toContain("For you");
  });

  it("marks the active pill with the accent wash and 600 accent text; idle pills are ink-2", () => {
    const html = renderToStaticMarkup(<SocialProfileTabs baseHref="/social/u/ada" active="highlights" />);
    const openTag = (tab: string) => {
      const at = html.indexOf(`data-social-profile-tab="${tab}"`);
      return html.slice(html.lastIndexOf("<a", at), html.indexOf(">", at));
    };
    const active = openTag("highlights");
    expect(active).toContain('aria-current="page"');
    expect(active).toContain("data-social-profile-tab-active");
    for (const token of SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS.split(" ")) expect(active).toContain(token);
    expect(SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS).toBe("bg-accent-wash font-semibold text-accent");
    for (const tab of ["activity", "credits", "interests"]) {
      const idle = openTag(tab);
      expect(idle).not.toContain("aria-current");
      expect(idle).not.toContain("bg-accent-wash");
      expect(idle).toContain("text-ink-2");
    }
    expect(SOCIAL_PROFILE_SECTION_TAB_IDLE_CLASS).toContain("text-ink-2");
    const pill = SOCIAL_PROFILE_SECTION_TAB_CLASS.split(" ");
    // Desktop 36 pills that hug; phone equal 44 segments whose labels wrap.
    expect(pill).toEqual(expect.arrayContaining(["rounded-full", "min-h-11", "flex-1", "md:min-h-9", "md:flex-none", "break-words"]));
    expect(SOCIAL_PROFILE_SECTION_TAB_CLASS).not.toMatch(/whitespace-nowrap|truncate/);
    const row = SOCIAL_PROFILE_SECTION_TABS_CLASS.split(" ");
    expect(row).toEqual(expect.arrayContaining(["w-full", "bg-surface-muted", "rounded-full", "md:w-auto", "md:bg-transparent"]));
  });

  it("wraps each label inside its phone segment instead of spilling past it", () => {
    // Bare text in the inline-flex pill is an anonymous flex item that cannot
    // shrink below its longest word ("Highlights" spilled past its 67px
    // segment at 320). The label is its own shrinkable span that wraps.
    const html = renderToStaticMarkup(<SocialProfileTabs baseHref="/social/profile" active="activity" />);
    for (const label of [
      SOCIAL.profile.activityTab,
      SOCIAL.profile.highlightsTab,
      SOCIAL.profile.creditsTab,
      SOCIAL.profile.interestsTab,
    ]) {
      expect(html).toContain(`<span class="${SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS}">${label}</span>`);
    }
    expect(SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS.split(" ")).toEqual(expect.arrayContaining(["min-w-0", "break-words"]));
    // Phone segments carry no side padding, so a label only wraps when it is
    // wider than the whole segment; desktop pills keep their 16.
    const pill = SOCIAL_PROFILE_SECTION_TAB_CLASS.split(" ");
    expect(pill).toEqual(expect.arrayContaining(["px-0", "md:px-4"]));
    expect(pill).not.toContain("px-2");
  });

  it("omits Interests when the caller passes the visitor-empty slice", () => {
    const html = renderToStaticMarkup(
      <SocialProfileTabs
        baseHref="/social/u/ada"
        active="activity"
        tabs={socialProfileVisibleTabs({ owner: false, topicCount: 0 })}
      />,
    );
    expect(html).toContain('data-social-profile-tab="activity"');
    expect(html).toContain('data-social-profile-tab="credits"');
    expect(html).not.toContain('data-social-profile-tab="interests"');
    expect(html).not.toContain(SOCIAL.profile.interestsTab);
  });
});
