"use client";

import { HouseLink } from "@/components/chrome/house-link";
import { SOCIAL_HOME_LANE_TABS_CLASS, socialHomeLaneTabClass } from "@/lib/social-chrome";
import type { SocialCategoryLabel } from "@/lib/social-categories";
import { SOCIAL, SOCIAL_HOME_LANES, type SocialHomeLane } from "@/lib/social";
import { socialHomeAxisHref } from "@/lib/social-home-location";

import { useSocialHomeLive } from "./social-home-live";

function laneLabel(lane: SocialHomeLane): string {
  return lane === "for-you" ? SOCIAL.home.forYouTab : SOCIAL.home.followingTab;
}

// Following / For you as E's text tabs, on their own row above the topic
// words, phone and desktop (Adam pick 2026-10-04). Same lane hook and
// URLs as the lane chips they replace: the tab selects in the click
// (owned href) and the cold slot pushes the RSC; the topic is kept.
// docs/design-locks/social-home-lane-tabs-lock-v1.md
export function SocialHomeLaneTabs({
  lane = "following",
  topic,
}: {
  lane?: SocialHomeLane;
  topic: SocialCategoryLabel;
}) {
  const live = useSocialHomeLive(lane, topic);
  return (
    <nav aria-label={SOCIAL.home.lanesLabel} data-social-home-lanes="" className={SOCIAL_HOME_LANE_TABS_CLASS}>
      {SOCIAL_HOME_LANES.map((item) => {
        const current = item === live.lane;
        return (
          <HouseLink
            key={item}
            href={socialHomeAxisHref(item, live.topic)}
            data-social-home-lane={item}
            data-social-home-lane-active={current ? "" : undefined}
            aria-current={current ? "page" : undefined}
            className={socialHomeLaneTabClass(current)}
          >
            {laneLabel(item)}
          </HouseLink>
        );
      })}
    </nav>
  );
}
