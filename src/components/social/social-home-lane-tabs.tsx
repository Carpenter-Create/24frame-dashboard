"use client";

import { HouseLink } from "@/components/chrome/house-link";
import { SegmentedTrack } from "@/components/ui/segmented-track";
import {
  SOCIAL_FEED_SCOPE_CLASS,
  SOCIAL_FEED_SCOPE_THUMB_CLASS,
  SOCIAL_FEED_SCOPE_THUMB_DURATION_MS,
  SOCIAL_FEED_SCOPE_TRACK_CLASS,
  socialFeedScopeSegmentClass,
} from "@/lib/social-chrome";
import type { SocialCategoryLabel } from "@/lib/social-categories";
import { SEGMENTED_TRACK_PERSIST, segmentedItemOn } from "@/lib/segmented-track";
import { SOCIAL, SOCIAL_HOME_LANES, socialHomeLaneIndex, type SocialHomeLane } from "@/lib/social";
import { socialHomeAxisHref } from "@/lib/social-home-location";

import { useSocialHomeLive } from "./social-home-live";

function laneLabel(lane: SocialHomeLane): string {
  return lane === "for-you" ? SOCIAL.home.forYouTab : SOCIAL.home.followingTab;
}

// Following / For you as the primary pill slider (H register §3.1;
// founder 2026-10-05, "I like the designs. Let's use them."): the same
// house SegmentedTrack and ink thumb as the header's workspace slider,
// left-aligned at the head of the Feed, phone and desktop. Same lane hook
// and URLs as before: the segment selects in the click (owned href, so
// the thumb and the label ink move at once) and the cold slot pushes the
// RSC; the topic is kept. aria-current="page" on the lit segment.
// docs/design-locks/social-feed-register-lock-v1.md
export function SocialHomeLaneTabs({
  lane = "following",
  topic,
}: {
  lane?: SocialHomeLane;
  topic: SocialCategoryLabel;
}) {
  const live = useSocialHomeLive(lane, topic);
  const activeIndex = socialHomeLaneIndex(live.lane);
  return (
    <nav aria-label={SOCIAL.home.lanesLabel} data-social-home-lanes="" className={SOCIAL_FEED_SCOPE_CLASS}>
      <SegmentedTrack
        activeIndex={activeIndex}
        persistKey={SEGMENTED_TRACK_PERSIST.socialFeedScope}
        trackClass={SOCIAL_FEED_SCOPE_TRACK_CLASS}
        thumbClass={SOCIAL_FEED_SCOPE_THUMB_CLASS}
        durationMs={SOCIAL_FEED_SCOPE_THUMB_DURATION_MS}
        data-social-home-lanes-track=""
      >
        {({ selectedIndex }) =>
          SOCIAL_HOME_LANES.map((item, index) => {
            const current = index === activeIndex;
            const on = segmentedItemOn(index, selectedIndex);
            return (
              <HouseLink
                key={item}
                href={socialHomeAxisHref(item, live.topic)}
                data-segmented-item=""
                data-social-home-lane={item}
                data-social-home-lane-active={current ? "" : undefined}
                aria-current={current ? "page" : undefined}
                className={socialFeedScopeSegmentClass(on)}
              >
                {laneLabel(item)}
              </HouseLink>
            );
          })
        }
      </SegmentedTrack>
    </nav>
  );
}
