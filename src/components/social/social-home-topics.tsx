"use client";

import type { FocusEvent } from "react";

import { HouseLink } from "@/components/chrome/house-link";
import { SocialIcon } from "@/components/social/social-icon";
import {
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_MORE_CLASS,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
  socialHomeTopicClass,
  socialHomeTopicMarkClass,
} from "@/lib/social-chrome";
import {
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_LABELS,
  type SocialCategoryLabel,
} from "@/lib/social-categories";
import { SOCIAL, type SocialHomeLane } from "@/lib/social";
import { socialRowFocusShift } from "@/lib/social-feed-reels";
import { socialHomeAxisHref } from "@/lib/social-home-location";

import { useSocialHomeLive } from "./social-home-live";
import { useSocialRowEdges } from "./use-social-row-edges";

// Keyboard focus draws the house ring (:focus-visible); a mouse press does
// not. A browser without the selector reads as "not keyboard".
function socialFocusIsKeyboard(node: Element): boolean {
  try {
    return node.matches(":focus-visible");
  } catch {
    return false;
  }
}

// D topic words (Adam pick 2026-10-04): All, then the 15 topics A to Z.
// Plain words; the current one is ink over a 2px ink underline, no fill
// and no accent. The row scrolls sideways; every label shows whole. A
// fade over the trailing edge carries "More topics" (scrolls the row on);
// both leave at the end. Lane state is the tabs above (same hook).
// docs/design-locks/social-home-lane-tabs-lock-v1.md
export function SocialHomeTopics({
  active = SOCIAL_CATEGORY_ALL,
  lane = "following",
}: {
  active?: SocialCategoryLabel;
  lane?: SocialHomeLane;
}) {
  const live = useSocialHomeLive(lane, active);
  const { ref: rowRef, end: atEnd } = useSocialRowEdges<HTMLDivElement>();

  function more() {
    const node = rowRef.current;
    if (!node) return;
    node.scrollBy({ left: Math.max(1, Math.round(node.clientWidth * 0.6)), behavior: "smooth" });
  }

  // Keyboard focus only: a word the browser leaves under the fade and
  // More topics scrolls clear of the track's own scroll padding (the CSS
  // holds the fade width). A mouse press never moves the row under the
  // pointer, so the click still lands on the word pressed.
  function reveal(event: FocusEvent<HTMLDivElement>) {
    const node = rowRef.current;
    const item: Element = event.target;
    if (!node || item === node || typeof item.getBoundingClientRect !== "function") return;
    if (!socialFocusIsKeyboard(item)) return;
    const style = typeof getComputedStyle === "function" ? getComputedStyle(node) : null;
    const port = node.getBoundingClientRect();
    const box = item.getBoundingClientRect();
    const shift = socialRowFocusShift({
      itemStart: box.left,
      itemEnd: box.right,
      portStart: port.left,
      portEnd: port.right,
      padStart: Number.parseFloat(style?.scrollPaddingInlineStart ?? "") || 0,
      padEnd: Number.parseFloat(style?.scrollPaddingInlineEnd ?? "") || 0,
    });
    if (shift !== 0) node.scrollBy({ left: shift });
  }

  return (
    <div data-social-home-topics="" className={SOCIAL_HOME_TOPIC_ROW_CLASS}>
      <div
        ref={rowRef}
        role="group"
        aria-label={SOCIAL.home.topicsLabel}
        data-social-home-topics-rail=""
        className={SOCIAL_HOME_TOPIC_TRACK_CLASS}
        onFocus={reveal}
      >
        {SOCIAL_CATEGORY_LABELS.map((label) => {
          const current = label === live.topic;
          const nextTopic =
            label === SOCIAL_CATEGORY_ALL || label === live.topic ? SOCIAL_CATEGORY_ALL : label;
          return (
            <HouseLink
              key={label}
              href={socialHomeAxisHref(live.lane, nextTopic)}
              data-social-home-topic={label}
              data-social-home-topic-active={current ? "" : undefined}
              aria-current={current ? "true" : undefined}
              className={socialHomeTopicClass(current)}
            >
              <span className={socialHomeTopicMarkClass(current)}>{label}</span>
            </HouseLink>
          );
        })}
      </div>
      {atEnd ? null : (
        <div data-social-home-topics-fade="" className={SOCIAL_HOME_TOPIC_FADE_CLASS}>
          <button
            type="button"
            aria-label={SOCIAL.home.moreTopics}
            data-social-home-topics-more=""
            className={SOCIAL_HOME_TOPIC_MORE_CLASS}
            onClick={more}
          >
            <SocialIcon name="caret-right" size={16} className="md:size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
