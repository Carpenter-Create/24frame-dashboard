"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { SocialCommentTrigger } from "@/components/social/social-comment-thread";
import { SocialLikeButton } from "@/components/social/social-engagement";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialMuxPlayer } from "@/components/social/social-mux-player";
import { SocialPostShareButton } from "@/components/social/social-post-share-sheet";
import { SocialAvatar } from "@/components/social/social-avatar";
import { cn } from "@/lib/cn";
import { SOCIAL, socialMemberHref, socialPersonIdentity } from "@/lib/social";
import {
  SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS,
  SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS,
  SOCIAL_POST_ACTION_GLYPH,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
} from "@/lib/social-chrome";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

// Vertical For You. Tap stays on this host (play/pause). Author is the
// only leave. Comment and Share sheets mount over the same item.
// docs/design-locks/social-explore-for-you-immersive-lock-v2.md

export function SocialExploreForYouStream({
  items,
  emptyLabel,
}: {
  items: readonly SocialExploreForYouItem[];
  emptyLabel: string | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || items.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.exploreIndex);
        if (!Number.isFinite(index) || index === activeRef.current) return;
        activeRef.current = index;
        setActive(index);
        setHeld(false);
      },
      { root, threshold: [0.6, 0.75, 1] },
    );
    for (const slide of root.querySelectorAll<HTMLElement>("[data-explore-index]")) {
      observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <div
      ref={scrollerRef}
      data-social-explore-stream=""
      aria-label={SOCIAL.explore.forYou}
      className={SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS}
    >
      {items.length === 0 ? (
        <div className={cn(SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS, "flex items-center px-[var(--space-4)]")}>
          <p data-social-explore-empty="" className="t-body text-band-ink break-words">
            {emptyLabel}
          </p>
        </div>
      ) : (
        items.map((item, index) => (
          <SocialExploreForYouSlide
            key={item.postId}
            item={item}
            index={index}
            active={index === active}
            paused={index === active && held}
            onToggle={() => {
              if (index !== active) return;
              setHeld((value) => !value);
            }}
          />
        ))
      )}
    </div>
  );
}

function SocialExploreForYouSlide({
  item,
  index,
  active,
  paused,
  onToggle,
}: {
  item: SocialExploreForYouItem;
  index: number;
  active: boolean;
  paused: boolean;
  onToggle: () => void;
}) {
  const playing = active && !paused;
  const person = item.authorHandle
    ? socialPersonIdentity({ handle: item.authorHandle, displayName: item.authorName })
    : null;
  const profileHref = person?.handle ? socialMemberHref(person.handle) : null;
  const username = person?.handleLabel || item.authorName;

  return (
    <article
      data-social-explore-item={item.postId}
      data-explore-index={index}
      data-social-explore-active={active ? "" : undefined}
      className={SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS}
    >
      <SocialMuxPlayer
        playbackId={item.playbackId}
        playbackPolicy={item.playbackPolicy}
        fit="cover"
        chromeless
        autoPlay={playing}
        muted={false}
        className="absolute inset-0 size-full bg-[#0A0A0B] object-cover"
      />
      <button
        type="button"
        data-social-explore-media=""
        aria-label={playing ? SOCIAL.explore.pause : SOCIAL.explore.play}
        aria-pressed={playing}
        className="absolute inset-0 z-10"
        onClick={onToggle}
      />
      <div data-social-explore-caption="" className={SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS}>
        {profileHref ? (
          <Link
            href={profileHref}
            data-social-explore-author=""
            className="pointer-events-auto flex items-center gap-[var(--space-2)] text-band-ink"
          >
            <SocialAvatar name={person?.avatarName || username} photoUrl={item.authorPhotoUrl} size="sm" />
            <span className="t-body font-medium break-words">{username}</span>
          </Link>
        ) : username ? (
          <span className="t-body font-medium text-band-ink break-words">{username}</span>
        ) : null}
        {item.body ? (
          <p className={cn(SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS, "whitespace-pre-wrap")}>{item.body}</p>
        ) : null}
      </div>
      <div data-social-explore-rail="" className={SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS}>
        {item.canLike ? (
          <SocialLikeButton
            postId={item.postId}
            liked={item.liked}
            likeCount={item.likeCount}
            icon
            tone="stage"
          />
        ) : (
          <span className={cn(SOCIAL_POST_ACTION_HIT_CLASS, "text-band-ink")}>
            <SocialIcon
              name="heart"
              size={SOCIAL_POST_ACTION_GLYPH}
              className={SOCIAL_POST_ACTION_HEART_NUDGE_CLASS}
            />
          </span>
        )}
        <SocialCommentTrigger
          post={{
            id: item.postId,
            commentCount: item.commentCount,
            canComment: item.canLike,
          }}
          icon
          tone="stage"
        />
        <SocialPostShareButton postId={item.postId} tone="stage" />
      </div>
    </article>
  );
}
