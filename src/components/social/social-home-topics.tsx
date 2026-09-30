"use client";

import { HouseLink } from "@/components/chrome/house-link";

import { HouseChipRail } from "@/components/chrome/house-chip-rail";
import {
  SOCIAL_HOME_TOPICS_CLASS,
  SOCIAL_TOPIC_RAIL_ROWS,
  socialHomeLensChipClass,
} from "@/lib/social-chrome";
import {
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_LABELS,
  type SocialCategoryLabel,
} from "@/lib/social-categories";
import { SOCIAL, type SocialHomeLane } from "@/lib/social";
import { socialHomeAxisHref, socialHomeDesktopLensFilled } from "@/lib/social-home-location";

import { useSocialHomeLive } from "./social-home-live";

type SocialHomeRailChip =
  | { axis: "lane"; lane: SocialHomeLane }
  | { axis: "topic"; label: SocialCategoryLabel };

const SOCIAL_HOME_RAIL_CHIPS: readonly SocialHomeRailChip[] = [
  { axis: "lane", lane: "following" },
  { axis: "lane", lane: "for-you" },
  ...SOCIAL_CATEGORY_LABELS.map(
    (label): SocialHomeRailChip => ({ axis: "topic", label }),
  ),
];

function laneLabel(lane: SocialHomeLane): string {
  return lane === "for-you" ? SOCIAL.home.forYouTab : SOCIAL.home.followingTab;
}

// Lane chips lead the Topics rail. Phone fills lane and topic together.
// Desktop Home fills one lens. Filled pill only — no underline.
// docs/design-locks/social-home-density-craft-sequel-lock-v1.md
export function SocialHomeTopics({
  active = SOCIAL_CATEGORY_ALL,
  lane = "following",
}: {
  active?: SocialCategoryLabel;
  lane?: SocialHomeLane;
}) {
  const live = useSocialHomeLive(lane, active);
  return (
    <div data-social-home-topics="" className={SOCIAL_HOME_TOPICS_CLASS}>
      <HouseChipRail
        data-social-home-topics-rail=""
        rows={SOCIAL_TOPIC_RAIL_ROWS}
        items={SOCIAL_HOME_RAIL_CHIPS}
        renderItem={(item) => {
          if (item.axis === "lane") {
            const selected = item.lane === live.lane;
            return (
              <HouseLink
                key={item.lane}
                href={socialHomeAxisHref(item.lane, live.topic)}
                data-social-home-lane={item.lane}
                data-social-home-lane-active={selected ? "" : undefined}
                aria-pressed={selected}
                className={socialHomeLensChipClass(
                  selected,
                  socialHomeDesktopLensFilled({
                    axis: "lane",
                    lane: item.lane,
                    liveLane: live.lane,
                    liveTopic: live.topic,
                  }),
                )}
              >
                {laneLabel(item.lane)}
              </HouseLink>
            );
          }
          const selected = item.label === live.topic;
          const nextTopic =
            item.label === SOCIAL_CATEGORY_ALL || item.label === live.topic
              ? SOCIAL_CATEGORY_ALL
              : item.label;
          return (
            <HouseLink
              key={item.label}
              href={socialHomeAxisHref(live.lane, nextTopic)}
              data-social-home-topic={item.label}
              data-social-home-topic-active={selected ? "" : undefined}
              aria-current={selected ? "page" : undefined}
              className={socialHomeLensChipClass(
                selected,
                socialHomeDesktopLensFilled({
                  axis: "topic",
                  topic: item.label,
                  liveLane: live.lane,
                  liveTopic: live.topic,
                }),
              )}
            >
              {item.label}
            </HouseLink>
          );
        }}
      />
    </div>
  );
}
