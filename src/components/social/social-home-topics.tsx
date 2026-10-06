"use client";

import { useEffect, useState, type FocusEvent } from "react";

import { HouseLink } from "@/components/chrome/house-link";
import { SocialIcon } from "@/components/social/social-icon";
import { cn } from "@/lib/cn";
import {
  SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_FADE_PX,
  SOCIAL_HOME_TOPIC_MORE_CLASS,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
  socialHomeTopicChipClass,
  socialHomeTopicClass,
} from "@/lib/social-chrome";
import {
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_LABELS,
  type SocialCategoryLabel,
} from "@/lib/social-categories";
import { SOCIAL, type SocialHomeLane } from "@/lib/social";
import { socialRowFocusShift, socialRowItemUnderFade } from "@/lib/social-feed-reels";
import { socialHomeAxisHref } from "@/lib/social-home-location";

import { useSocialHomeLive } from "./social-home-live";
import { useSocialRowEdges } from "./use-social-row-edges";

const NO_CUT: ReadonlySet<string> = new Set();

// Keyboard focus draws the house ring (:focus-visible); a mouse press does
// not. A browser without the selector reads as "not keyboard".
function socialFocusIsKeyboard(node: Element): boolean {
  try {
    return node.matches(":focus-visible");
  } catch {
    return false;
  }
}

// Topics as secondary chips (H register §3.2; founder 2026-10-05, "I
// like the designs. Let's use them."): All, then the 15 topics A to Z.
// Idle chips are plain ink-2 words; the current chip is the accent wash
// with accent-ink type. The row scrolls sideways; every label shows
// whole, and a chip under the fade hides until it scrolls clear (cards
// lock). A fade over the trailing edge carries the round grey "More
// topics" (scrolls the row on); both leave at the end. Lane state is the
// slider above (same hook).
// docs/design-locks/social-feed-register-lock-v1.md
// docs/design-locks/social-feed-cards-lock-v1.md
export function SocialHomeTopics({
  active = SOCIAL_CATEGORY_ALL,
  lane = "following",
}: {
  active?: SocialCategoryLabel;
  lane?: SocialHomeLane;
}) {
  const live = useSocialHomeLive(lane, active);
  const { ref: rowRef, end: atEnd } = useSocialRowEdges<HTMLDivElement>();
  // A chip whose end passes under the fade hides (opacity and pointer
  // events, not visibility: Tab still reaches it, and the focus handler
  // scrolls it clear). The observer's root is the track less the fade, so
  // it reports each chip crossing into or out of the fade; the lib rule
  // decides. At the row's end the fade is gone and every chip shows.
  const [cut, setCut] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const node = rowRef.current;
    if (atEnd || !node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const portEnd = node.getBoundingClientRect().right;
        setCut((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const label = (entry.target as HTMLElement).dataset.socialHomeTopic ?? "";
            const under = socialRowItemUnderFade({
              itemEnd: entry.boundingClientRect.right,
              portEnd,
              fade: SOCIAL_HOME_TOPIC_FADE_PX,
            });
            if (under) next.add(label);
            else next.delete(label);
          }
          return next;
        });
      },
      { root: node, rootMargin: `0px -${SOCIAL_HOME_TOPIC_FADE_PX}px 0px 0px`, threshold: [0, 1] },
    );
    for (const chip of node.querySelectorAll("[data-social-home-topic]")) observer.observe(chip);
    return () => observer.disconnect();
  }, [rowRef, atEnd]);
  const hidden = atEnd ? NO_CUT : cut;

  function more() {
    const node = rowRef.current;
    if (!node) return;
    node.scrollBy({ left: Math.max(1, Math.round(node.clientWidth * 0.6)), behavior: "smooth" });
  }

  // Keyboard focus only: a chip the browser leaves under the fade and
  // More topics scrolls clear of the track's own scroll padding (the CSS
  // holds the fade width). A mouse press never moves the row under the
  // pointer, so the click still lands on the chip pressed.
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
              className={cn(socialHomeTopicClass(current), hidden.has(label) && SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS)}
            >
              <span className={socialHomeTopicChipClass(current)}>{label}</span>
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
            <SocialIcon name="caret-right" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
