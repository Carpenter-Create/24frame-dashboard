import { HouseLink } from "@/components/chrome/house-link";

import { cn } from "@/lib/cn";
import {
  SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_IDLE_CLASS,
  SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS,
  SOCIAL_PROFILE_SECTION_TABS_CLASS,
} from "@/lib/social-chrome";
import {
  SOCIAL_PROFILE_TABS,
  socialProfileTabHref,
  socialProfileTabLabel,
  type SocialProfileTab,
} from "@/lib/social";

// Section pills (docs/design-locks/social-profile-stage-lock-v1.md).
// Desktop: a row of pills. Phone: one full-width segmented row.
export function SocialProfileTabs({
  baseHref,
  active,
  tabs = SOCIAL_PROFILE_TABS,
}: {
  baseHref: string;
  active: SocialProfileTab;
  /** Visible slice of SOCIAL_PROFILE_TABS. Defaults to the full shared list. */
  tabs?: readonly SocialProfileTab[];
}) {
  const current = tabs.includes(active) ? active : (tabs[0] ?? active);
  return (
    <div data-social-profile-tabs="" className={SOCIAL_PROFILE_SECTION_TABS_CLASS}>
      {tabs.map((tab) => (
        <HouseLink
          key={tab}
          href={socialProfileTabHref(baseHref, tab)}
          data-social-profile-tab={tab}
          data-social-profile-tab-active={current === tab ? "" : undefined}
          aria-current={current === tab ? "page" : undefined}
          className={cn(
            SOCIAL_PROFILE_SECTION_TAB_CLASS,
            current === tab ? SOCIAL_PROFILE_SECTION_TAB_ACTIVE_CLASS : SOCIAL_PROFILE_SECTION_TAB_IDLE_CLASS,
          )}
        >
          <span className={SOCIAL_PROFILE_SECTION_TAB_LABEL_CLASS}>{socialProfileTabLabel(tab)}</span>
        </HouseLink>
      ))}
    </div>
  );
}
