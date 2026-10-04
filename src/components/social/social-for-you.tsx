import { CourseCard } from "@/components/courses/course-card";
import { SocialFollowButton } from "@/components/social/social-engagement";
import { SocialPersonRow } from "@/components/social/social-person-row";
import {
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_RULE_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_EYEBROW_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_FOR_YOU_RAIL_CLASS,
} from "@/lib/social-chrome";
import type { CourseRow } from "@/lib/courses";
import { SOCIAL, socialMemberHref } from "@/lib/social";
import type { SocialSuggestedPerson } from "@/lib/social-feed";

export function SocialSuggestedPeople({
  people,
  faces,
  title = SOCIAL.forYou.people,
  framed = true,
}: {
  people: readonly SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
  title?: string;
  /** False: the Feed aside's borderless section (eyebrow, no card). */
  framed?: boolean;
}) {
  if (people.length === 0) return null;
  return (
    <div
      data-social-for-you-people=""
      className={framed ? SOCIAL_FOR_YOU_CARD_CLASS : SOCIAL_FEED_ASIDE_SECTION_CLASS}
    >
      <p className={framed ? "t-body-sm font-semibold text-ink" : SOCIAL_FEED_EYEBROW_CLASS}>{title}</p>
      {people.map((person) => (
        <div
          key={person.id}
          data-social-for-you-person={person.id}
          className="flex items-center justify-between gap-[10px]"
        >
          <SocialPersonRow
            handle={person.handle}
            displayName={person.display_name}
            photoUrl={faces.get(person.id)}
            href={socialMemberHref(person.handle)}
          />
          <SocialFollowButton
            followeeId={person.id}
            handle={person.handle}
            following={false}
            compact
            quiet={!framed}
          />
        </div>
      ))}
    </div>
  );
}

export function SocialForYouRail({
  people,
  faces,
  layout = "rail",
  latestCourse = null,
  latestCourseCoverUrl = null,
}: {
  people: readonly SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
  layout?: "rail" | "lane" | "aside";
  latestCourse?: CourseRow | null;
  latestCourseCoverUrl?: string | null;
}) {
  if (layout === "aside") {
    return (
      <SocialFeedForYouAside
        people={people}
        faces={faces}
        latestCourse={latestCourse}
        latestCourseCoverUrl={latestCourseCoverUrl}
      />
    );
  }
  return (
    <aside
      data-social-for-you=""
      data-social-for-you-layout={layout}
      className={layout === "lane" ? "flex w-full flex-col gap-3" : SOCIAL_FOR_YOU_RAIL_CLASS}
    >
      {layout === "rail" ? (
        <div className="flex items-center justify-between">
          <p className="t-body-sm font-medium text-ink-2">{SOCIAL.forYou.title}</p>
        </div>
      ) : null}
      <SocialSuggestedPeople people={people} faces={faces} />
      {layout === "rail" && latestCourse ? (
        <div data-social-latest-course="" className={SOCIAL_FOR_YOU_CARD_CLASS}>
          <p className="t-body-sm font-semibold text-ink">{SOCIAL.forYou.latestCourse}</p>
          <ul className="flex min-w-0 flex-col">
            {/* Rail is display:none until lg. An eager signed cover.png is
                hoisted as <link rel="preload"> and Chrome warns it was unused. */}
            <CourseCard
              course={latestCourse}
              coverUrl={latestCourseCoverUrl}
              density="discover"
              coverLoading="lazy"
            />
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

// Feed aside (G · D, Adam pick 2026-10-04). Borderless: no card, no
// "For you" eyebrow (the For you tab already says it). Latest course
// first, a hairline, then Suggested people; the section labels are the
// existing strings as eyebrows. Profile, Messages and Create keep the
// framed rail above.
function SocialFeedForYouAside({
  people,
  faces,
  latestCourse,
  latestCourseCoverUrl,
}: {
  people: readonly SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
  latestCourse: CourseRow | null;
  latestCourseCoverUrl: string | null;
}) {
  return (
    <aside data-social-for-you="" data-social-for-you-layout="aside" className={SOCIAL_FEED_ASIDE_CLASS}>
      {latestCourse ? (
        <div data-social-latest-course="" className={SOCIAL_FEED_ASIDE_SECTION_CLASS}>
          <p className={SOCIAL_FEED_EYEBROW_CLASS}>{SOCIAL.forYou.latestCourse}</p>
          <ul className="flex min-w-0 flex-col">
            {/* The aside is display:none until lg. An eager signed cover.png is
                hoisted as <link rel="preload"> and Chrome warns it was unused. */}
            <CourseCard
              course={latestCourse}
              coverUrl={latestCourseCoverUrl}
              density="discover"
              coverLoading="lazy"
            />
          </ul>
        </div>
      ) : null}
      {latestCourse && people.length > 0 ? (
        <div data-social-for-you-rule="" className={SOCIAL_FEED_ASIDE_RULE_CLASS} />
      ) : null}
      <SocialSuggestedPeople people={people} faces={faces} framed={false} />
    </aside>
  );
}
