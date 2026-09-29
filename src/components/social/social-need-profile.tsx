import { TextAction } from "@/components/chrome/house";

import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";

import { SocialEmpty } from "./social-empty";

export function SocialNeedProfile() {
  return (
    <div data-social-need-profile="" className="flex flex-col gap-[var(--space-2)]">
      <SocialEmpty icon="user" title={SOCIAL.cta.needProfile} />
      <TextAction href={SOCIAL_ROUTES.profile}>{SOCIAL.cta.profileHrefLabel}</TextAction>
    </div>
  );
}
