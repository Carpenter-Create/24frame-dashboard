import { CourseCard } from "@/components/courses/course-card";
import { SocialFollowButton } from "@/components/social/social-engagement";
import { SocialPersonRow } from "@/components/social/social-person-row";
import {
  SOCIAL_FEED_ASIDE_AVATAR_CLASS,
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_COURSE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_PERSON_CLASS,
  SOCIAL_FEED_ASIDE_ROW_CLASS,
  SOCIAL_FEED_ASIDE_ROWS_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_ASIDE_SUBHEAD_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_FOR_YOU_LANE_CARD_CLASS,
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
  cardClassName = SOCIAL_FOR_YOU_CARD_CLASS,
}: {
  people: readonly SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
  title?: string;
  /** False: the Feed rail's section (a 17 / 480 heading over 56 rows). */
  framed?: boolean;
  /** The framed card: the rail's module, or the Feed lane's card. */
  cardClassName?: string;
}) {
  if (people.length === 0) return null;
  if (!framed) {
    return (
      <section data-social-for-you-people="" className={SOCIAL_FEED_ASIDE_SECTION_CLASS}>
        <h3 className={SOCIAL_FEED_ASIDE_SUBHEAD_CLASS}>{title}</h3>
        <ul className={SOCIAL_FEED_ASIDE_ROWS_CLASS}>
          {people.map((person) => (
            <li key={person.id} data-social-for-you-person={person.id} className={SOCIAL_FEED_ASIDE_ROW_CLASS}>
              <SocialPersonRow
                handle={person.handle}
                displayName={person.display_name}
                photoUrl={faces.get(person.id)}
                href={socialMemberHref(person.handle)}
                className={SOCIAL_FEED_ASIDE_PERSON_CLASS}
                avatarClassName={SOCIAL_FEED_ASIDE_AVATAR_CLASS}
              />
              <SocialFollowButton
                followeeId={person.id}
                handle={person.handle}
                following={false}
                compact
                quiet
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <div data-social-for-you-people="" className={cardClassName}>
      <p className="t-body-sm font-semibold text-ink">{title}</p>
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
      {/* Cards lock: in the Feed's For you lane the people are a card
          like every Feed module; the framed rail keeps its module. */}
      <SocialSuggestedPeople
        people={people}
        faces={faces}
        cardClassName={layout === "lane" ? SOCIAL_FOR_YOU_LANE_CARD_CLASS : SOCIAL_FOR_YOU_CARD_CLASS}
      />
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

// Feed For you rail (H register §5.5; founder 2026-10-05, decision 5:
// "For you" stays both as the slider option and as this rail's heading —
// "sure"). The "For you" heading level with the slider, the latest
// course as one card, then Suggested people as one card of 56 rows with
// Follow on the in-card fill (cards lock). No hairlines, no border.
// Profile, Messages and Create keep the framed rail above.
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
  const empty = !latestCourse && people.length === 0;
  return (
    <aside
      data-social-for-you=""
      data-social-for-you-layout="aside"
      aria-label={empty ? undefined : SOCIAL.forYou.title}
      className={SOCIAL_FEED_ASIDE_CLASS}
    >
      {empty ? null : (
        <h2 data-social-for-you-heading="" className={SOCIAL_FEED_ASIDE_HEADING_CLASS}>
          {SOCIAL.forYou.title}
        </h2>
      )}
      {latestCourse ? (
        <ul data-social-latest-course="" className={SOCIAL_FEED_ASIDE_COURSE_CLASS}>
          {/* The rail is display:none until the Feed fits it. An eager
              signed cover.png is hoisted as <link rel="preload"> and
              Chrome warns it was unused. */}
          <CourseCard
            course={latestCourse}
            coverUrl={latestCourseCoverUrl}
            density="feature"
            metaLabel={SOCIAL.forYou.latestCourseEyebrow}
            coverLoading="lazy"
          />
        </ul>
      ) : null}
      <SocialSuggestedPeople people={people} faces={faces} framed={false} />
    </aside>
  );
}
