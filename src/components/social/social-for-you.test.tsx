import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import {
  COURSE_FEATURE_CARD_CLASS,
  COURSE_FEATURE_META_CLASS,
  COURSE_FEATURE_TITLE_CLASS,
  type CourseRow,
} from "@/lib/courses";
import {
  SOCIAL_FEED_ASIDE_AVATAR_CLASS,
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_ROW_CLASS,
  SOCIAL_FEED_ASIDE_SUBHEAD_CLASS,
  SOCIAL_FEED_HEADING_CLASS,
  SOCIAL_FOLLOW_COMPACT_CLASS,
  SOCIAL_FOLLOW_QUIET_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_FOR_YOU_RAIL_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";
import { SocialForYouRail } from "./social-for-you";

const COURSE: CourseRow = {
  id: "c1",
  slug: "catalog-basics",
  title: "Catalog basics",
  description: null,
  cover_key: "courses/c1/cover.png",
  is_flagship_free: true,
  price_cents: null,
  catalog_code: "EDU-1",
  status: "published",
  position: 1,
  instructor_id: null,
  created_at: "2026-09-01T12:00:00.000Z",
};

describe("SocialForYouRail person identity", () => {
  it("uses the house person row: handle over name, Member omitted, Follow kept", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail
        people={[
          { id: "u2", handle: "joshua", display_name: "Member" },
          { id: "u3", handle: "maya", display_name: "Maya Chen" },
        ]}
        faces={new Map()}
      />,
    );
    expect(html).toContain(SOCIAL.forYou.people);
    expect(html).toContain('data-social-for-you-person="u2"');
    expect(html).toContain("data-social-person-row");
    expect(html).toContain("@joshua");
    expect(html).not.toContain(">Member<");
    expect(html).toContain("@maya");
    expect(html).toContain("Maya Chen");
    expect(html.indexOf("@maya")).toBeLessThan(html.indexOf("Maya Chen"));
    expect(html).toContain("data-social-follow");
    expect(html).toContain(SOCIAL.follow.follow);
    expect(html).not.toContain("Member");
  });

  it("shows the signed profile photo on Suggested people when a URL exists", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail
        people={[{ id: "u3", handle: "joshua", display_name: "Joshua A" }]}
        faces={new Map([["u3", "https://s3.example/joshua-face"]])}
      />,
    );
    expect(html).toContain("data-social-person-row");
    expect(html).toContain("https%3A%2F%2Fs3.example%2Fjoshua-face");
    expect(html).not.toContain("JA");
    expect(html).not.toContain("Actor");
  });

  it("does not preload a signed course cover inside the hidden rail", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail
        people={[]}
        faces={new Map()}
        latestCourse={COURSE}
        latestCourseCoverUrl="https://s3.example/courses/c1/cover.png"
      />,
    );
    expect(html).toContain('src="https://s3.example/courses/c1/cover.png"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('rel="preload"');
    expect(html).toContain("data-social-latest-course");
  });

  // H · Feed rail (founder 2026-10-05; decision 5, "sure": "For you"
  // stays the slider option and this rail's heading). Replaces the G
  // borderless aside (eyebrows, a hairline, a hairline Follow, no heading).
  // docs/design-locks/social-feed-register-lock-v1.md
  it("renders the Feed rail: the For you heading, a soft grey course card, people rows, grey Follow", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail
        layout="aside"
        people={[{ id: "u3", handle: "maya", display_name: "Maya Chen" }]}
        faces={new Map()}
        latestCourse={COURSE}
        latestCourseCoverUrl={null}
      />,
    );
    expect(html).toContain(
      `data-social-for-you-layout="aside" aria-label="${SOCIAL.forYou.title}" class="${SOCIAL_FEED_ASIDE_CLASS}"`,
    );
    expect(html).not.toContain(SOCIAL_FOR_YOU_RAIL_CLASS);
    expect(html).not.toContain(SOCIAL_FOR_YOU_CARD_CLASS);
    // The heading: "For you", 20 / 480, 44 tall (level with the slider).
    expect(html).toContain(
      `<h2 data-social-for-you-heading="" class="${SOCIAL_FEED_ASIDE_HEADING_CLASS}">${SOCIAL.forYou.title}</h2>`,
    );
    expect(SOCIAL_FEED_ASIDE_HEADING_CLASS).toContain(SOCIAL_FEED_HEADING_CLASS);
    expect(SOCIAL_FEED_ASIDE_HEADING_CLASS).toContain("h-11");
    // The course: one soft grey card that is one link — cover, label, title.
    expect(html).toContain('data-course-card-density="feature"');
    expect(html).toContain(`class="${COURSE_FEATURE_CARD_CLASS}"`);
    expect(COURSE_FEATURE_CARD_CLASS).toContain("rounded-[var(--radius-xl)] bg-surface-muted p-4");
    expect(COURSE_FEATURE_CARD_CLASS).not.toMatch(/border|shadow/);
    expect(html).toContain(
      `<span data-course-card-meta="" class="${COURSE_FEATURE_META_CLASS}">${SOCIAL.forYou.latestCourseEyebrow}</span>`,
    );
    expect(html).toContain(`<span class="${COURSE_FEATURE_TITLE_CLASS}">${COURSE.title}</span>`);
    expect(html.match(/<a /g)?.length).toBe(2); // the course card, the person row
    // No signed cover: the glance plate, without the in-plate title.
    expect(html).toContain('data-course-cover-tone="plate"');
    expect(html).not.toContain("data-course-cover-title");
    // People: a 17 / 600 heading, 56 rows, a 40 avatar, the grey 36 Follow.
    expect(html).toContain(`<h3 class="${SOCIAL_FEED_ASIDE_SUBHEAD_CLASS}">${SOCIAL.forYou.people}</h3>`);
    expect(html).toContain(`class="${SOCIAL_FEED_ASIDE_ROW_CLASS}"`);
    expect(html).toContain(SOCIAL_FEED_ASIDE_AVATAR_CLASS);
    const course = html.indexOf("data-social-latest-course");
    const people = html.indexOf("data-social-for-you-people");
    expect(course).toBeGreaterThan(html.indexOf("data-social-for-you-heading"));
    expect(course).toBeLessThan(people);
    expect(html).not.toContain("data-social-for-you-rule");
    expect(html).toContain(`class="${SOCIAL_FOLLOW_QUIET_CLASS}"`);
    expect(html).not.toContain(SOCIAL_FOLLOW_COMPACT_CLASS);
    expect(SOCIAL_FOLLOW_QUIET_CLASS).toContain("rounded-full bg-surface-muted");
    // No accent fill (the glance plate's accent-contrast band is not one).
    expect(html).not.toMatch(/bg-accent(?![-\w])/);
  });

  it("shows no heading on an empty Feed rail", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail layout="aside" people={[]} faces={new Map()} latestCourse={null} />,
    );
    expect(html).toContain('data-social-for-you-layout="aside"');
    expect(html).not.toContain("data-social-for-you-heading");
    expect(html).not.toContain(`>${SOCIAL.forYou.title}<`);
  });

  it("keeps the framed rail (Profile, Messages, Create) unchanged", () => {
    const html = renderToStaticMarkup(
      <SocialForYouRail people={[{ id: "u3", handle: "maya", display_name: "Maya Chen" }]} faces={new Map()} />,
    );
    expect(html).toContain(SOCIAL_FOR_YOU_RAIL_CLASS);
    expect(html).toContain(SOCIAL.forYou.title);
    expect(html).toContain(SOCIAL_FOLLOW_COMPACT_CLASS);
    expect(html).not.toContain(SOCIAL_FOLLOW_QUIET_CLASS);
  });
});
