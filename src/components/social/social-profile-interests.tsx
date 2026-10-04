import { HouseLink } from "@/components/chrome/house-link";

import { SocialEmpty } from "@/components/social/social-empty";
import { cn } from "@/lib/cn";
import {
  SOCIAL_PROFILE_PANEL_INSET_CLASS,
  SOCIAL_TOPIC_CHIP_BANK_CLASS,
  SOCIAL_TOPIC_CHIP_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL, socialProfileEditTopicsHref } from "@/lib/social";
import { parseSocialProfileTopics } from "@/lib/social-profile-topics";

// Profile Interests tab. Same topic chip SoT the face used. Roles stay
// on the face. Choosing Topics stays the Edit profile drill.
export function SocialProfileInterests({
  topics,
  owner = false,
}: {
  topics?: readonly string[] | null;
  owner?: boolean;
}) {
  const interestTopics = parseSocialProfileTopics(topics ?? []);
  if (interestTopics.length === 0) {
    if (!owner) return null;
    return (
      <div data-social-profile-interests="" data-social-profile-interests-empty="">
        <SocialEmpty
          icon="squares-four"
          title={SOCIAL.profile.interestsEmpty}
          hint={SOCIAL.profile.interestsEmptyOwnHint}
        >
          <HouseLink
            href={socialProfileEditTopicsHref()}
            data-social-profile-interests-edit=""
            className="t-body-sm font-medium text-ink"
          >
            {SOCIAL.profile.topics}
          </HouseLink>
        </SocialEmpty>
      </div>
    );
  }

  return (
    <div
      data-social-profile-interests=""
      className={cn(
        SOCIAL_PROFILE_PANEL_INSET_CLASS,
        "py-[var(--space-4)]",
        SOCIAL_TOPIC_CHIP_BANK_CLASS,
      )}
    >
      {interestTopics.map((topic) => (
        <span key={topic} data-social-profile-topic={topic} className={SOCIAL_TOPIC_CHIP_CLASS}>
          {topic}
        </span>
      ))}
    </div>
  );
}
