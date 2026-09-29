import { SocialFollowButton } from "@/components/social/social-engagement";
import { SocialPersonRow } from "@/components/social/social-person-row";
import { socialMemberHref } from "@/lib/social";
import type { SocialFollowsListPerson } from "@/lib/social-feed";

export function SocialFollowsList({
  people,
  faces,
  viewerId,
}: {
  people: readonly SocialFollowsListPerson[];
  faces: ReadonlyMap<string, string | null>;
  viewerId: string;
}) {
  return (
    <ul data-social-follows-list="" className="flex flex-col">
      {people.map((person) => (
        <li
          key={person.id}
          data-social-follows-row={person.id}
          className="flex items-center justify-between gap-3 px-4 py-2.5"
        >
          <SocialPersonRow
            handle={person.handle}
            displayName={person.display_name}
            photoUrl={faces.get(person.id)}
            href={socialMemberHref(person.handle)}
          />
          {person.id !== viewerId ? (
            <div className="shrink-0">
              <SocialFollowButton
                followeeId={person.id}
                handle={person.handle}
                following={person.following}
                viewerId={viewerId}
                followsYou={person.followsYou}
                compact
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
