"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { SOCIAL_POST_IMAGE_SIZES } from "@/lib/social-media-display";
import {
  socialFeedCarouselIndex,
  socialFeedCarouselLabel,
  socialFeedCarouselShowLabel,
  socialFeedCarouselVideoUsesMux,
} from "@/lib/social-feed-carousel";
import { socialFollowingMuxCarouselSlideRole } from "@/lib/social-following-mux-active";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_CAROUSEL_BLEED_CLASS,
  SOCIAL_FEED_CAROUSEL_COUNT_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_ACTIVE_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_HIT_CLASS,
  SOCIAL_FEED_CAROUSEL_DOTS_CLASS,
  SOCIAL_FEED_CAROUSEL_SLIDE_CLASS,
  SOCIAL_FEED_CAROUSEL_TRACK_CLASS,
} from "@/lib/social-chrome";
import type { SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SocialMediaImage } from "./social-media-image";
import {
  SocialFollowingMuxWarm,
  useSocialFollowingMuxObserve,
  useSocialFollowingMuxRole,
} from "./social-following-mux-band";
import { SocialMuxPlayer } from "./social-mux-player";

// Adam lock 2026-09-25. One full-bleed stage, swipe, dots, N of M.
// Video slides mount Mux only. A leftover cookie or proxy URL is not a
// playable face. Stories do not render this.
// Following band: the visible Mux slide mounts. The next Mux slide warms.
// docs/design-locks/social-home-following-mux-active-gate-lock-v1.md

function CarouselSlideFace({
  item,
  band,
  fit,
}: {
  item: SocialPostMediaItem;
  band: "mount" | "warm" | "closed" | "unbanded";
  fit: "cover" | "contain";
}) {
  if (item.kind === "video") {
    if (!socialFeedCarouselVideoUsesMux(item) || !item.playbackId) {
      return <div data-social-carousel-mux-missing="" className="absolute inset-0 bg-surface-muted" />;
    }
    if (band === "warm") {
      return <SocialFollowingMuxWarm playbackId={item.playbackId} playbackPolicy={item.playbackPolicy} />;
    }
    if (band === "closed") return null;
    return (
      <SocialMuxPlayer
        playbackId={item.playbackId}
        playbackPolicy={item.playbackPolicy}
        fit={fit}
        className={
          fit === "contain"
            ? "social-feed-immersive-media absolute inset-0 size-full object-contain"
            : "absolute inset-0 size-full object-cover"
        }
      />
    );
  }
  return (
    <SocialMediaImage
      src={item.url}
      sizes={SOCIAL_POST_IMAGE_SIZES}
      loading="eager"
      fit={fit}
    />
  );
}

export function SocialFeedCarousel({
  items,
  onOpen,
  muxBandId,
  fit = "cover",
  frame = "feed",
}: {
  items: readonly SocialPostMediaItem[];
  onOpen?: (index: number) => void;
  muxBandId?: string;
  /** Feed cards cover-crop. The comment-open pane contains the picture. */
  fit?: "cover" | "contain";
  frame?: "feed" | "pane";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const role = useSocialFollowingMuxRole(muxBandId);
  useSocialFollowingMuxObserve(muxBandId, rootRef);
  const total = items.length;
  const label = socialFeedCarouselLabel(index, total);
  const muxIndexes = items.flatMap((item, slide) =>
    item.kind === "video" && socialFeedCarouselVideoUsesMux(item) ? [slide] : [],
  );
  const banded = role !== "unbanded";

  function go(next: number) {
    const bounded = Math.min(total - 1, Math.max(0, next));
    const track = trackRef.current;
    setIndex(bounded);
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: bounded * track.clientWidth,
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    setIndex(socialFeedCarouselIndex(track.scrollLeft, track.clientWidth, total));
  }

  return (
    <div
      ref={rootRef}
      data-social-post-media=""
      data-social-post-carousel=""
      data-social-mux-band={banded ? muxBandId : undefined}
      data-social-mux-slot={banded ? role : undefined}
      role="region"
      aria-roledescription="carousel"
      aria-label={SOCIAL.post.carousel}
      className={cn(
        SOCIAL_FEED_CAROUSEL_BLEED_CLASS,
        frame === "pane" && "social-post-open-carousel h-full min-h-0",
      )}
    >
      <div
        ref={trackRef}
        data-social-post-carousel-track=""
        className={cn(SOCIAL_FEED_CAROUSEL_TRACK_CLASS, frame === "pane" && "h-full")}
        onScroll={onScroll}
      >
        {items.map((item, slide) => {
          const slideRole = socialFollowingMuxCarouselSlideRole({
            postRole: role,
            index: slide,
            visibleIndex: index,
            muxIndexes,
          });
          const muxSlide = item.kind === "video" && socialFeedCarouselVideoUsesMux(item);
          const slideSlot =
            banded && muxSlide && slideRole !== "mount" ? slideRole : undefined;
          return (
            <div
              key={`${item.playbackId ?? item.url}-${slide}`}
              data-social-post-carousel-slide=""
              data-social-post-image={item.kind === "image" ? "" : undefined}
              data-social-mux-slot={slideSlot}
              className={SOCIAL_FEED_CAROUSEL_SLIDE_CLASS}
              aria-hidden={slide === index ? undefined : true}
            >
              <CarouselSlideFace item={item} band={slideRole} fit={fit} />
              {onOpen ? (
                <button
                  type="button"
                  data-social-feed-media-open=""
                  aria-label={item.kind === "video" ? SOCIAL.post.viewVideo : SOCIAL.post.viewPhoto}
                  className="absolute inset-0 z-[1] cursor-pointer"
                  onClick={() => onOpen(slide)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p data-social-post-carousel-count="" aria-live="polite" className={SOCIAL_FEED_CAROUSEL_COUNT_CLASS}>
        {label}
      </p>
      <div data-social-post-carousel-dots="" className={SOCIAL_FEED_CAROUSEL_DOTS_CLASS}>
        {items.map((item, slide) => {
          const active = slide === index;
          return (
            <button
              key={`${item.playbackId ?? item.url}-dot-${slide}`}
              type="button"
              data-social-post-carousel-dot={active ? "active" : "idle"}
              aria-current={active ? "true" : undefined}
              aria-label={socialFeedCarouselShowLabel(slide, total)}
              className={SOCIAL_FEED_CAROUSEL_DOT_HIT_CLASS}
              onClick={() => go(slide)}
            >
              <span className={active ? SOCIAL_FEED_CAROUSEL_DOT_ACTIVE_CLASS : SOCIAL_FEED_CAROUSEL_DOT_CLASS} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
