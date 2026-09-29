import { CourseCard } from "@/components/courses/course-card";
import { SocialFollowButton } from "@/components/social/social-engagement";
import { SocialPersonRow } from "@/components/social/social-person-row";
import {
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
}: {
  people: readonly SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
  title?: string;
}) {
  if (people.length === 0) return null;
  return (
    <div data-social-for-you-people="" className={SOCIAL_FOR_YOU_CARD_CLASS}>
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
  layout?: "rail" | "lane";
  latestCourse?: CourseRow | null;
  latestCourseCoverUrl?: string | null;
}) {
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
