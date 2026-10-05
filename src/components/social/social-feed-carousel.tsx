"use client";

import { useRef, useState, type SyntheticEvent } from "react";

import { SOCIAL_POST_IMAGE_SIZES, socialPostPhotoAspect } from "@/lib/social-media-display";
import {
  socialFeedCarouselChip,
  socialFeedCarouselIndex,
  socialFeedCarouselLabel,
  socialFeedCarouselShowLabel,
  socialFeedCarouselVideoUsesMux,
} from "@/lib/social-feed-carousel";
import { socialFollowingMuxCarouselSlideRole } from "@/lib/social-following-mux-active";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_CAROUSEL_BLEED_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_ACTIVE_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_CLASS,
  SOCIAL_FEED_CAROUSEL_DOT_HIT_CLASS,
  SOCIAL_FEED_CAROUSEL_DOTS_CLASS,
  SOCIAL_FEED_CAROUSEL_SLIDE_CLASS,
  SOCIAL_FEED_CAROUSEL_TRACK_CLASS,
  SOCIAL_POST_COUNT_CHIP_CLASS,
  SOCIAL_POST_TOPIC_CHIP_CLASS,
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
// H · Posts (Adam 2026-10-05): the stage is the post's media block at
// the first still's true shape (1.91:1 … 4:5), radius 24 on desktop;
// the topic chip top-left and the "1 / 3" chip top-right (the live
// region still reads "1 of 3"). docs/design-locks/social-feed-register-lock-v1.md §7

function CarouselSlideFace({
  item,
  band,
  onLoad,
}: {
  item: SocialPostMediaItem;
  band: "mount" | "warm" | "closed" | "unbanded";
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
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
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return <SocialMediaImage src={item.url} sizes={SOCIAL_POST_IMAGE_SIZES} loading="eager" onLoad={onLoad} />;
}

export function SocialFeedCarousel({
  items,
  onOpen,
  muxBandId,
  topic = null,
}: {
  items: readonly SocialPostMediaItem[];
  onOpen?: (index: number) => void;
  muxBandId?: string;
  topic?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // The frame takes the first item's true shape: stored, then probed.
  const [probed, setProbed] = useState<number | null>(null);
  const first = items[0];
  const aspect = socialPostPhotoAspect(probed ? { aspect: probed } : first ?? { kind: "image" });
  function onFirstLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) setProbed(naturalWidth / naturalHeight);
  }
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
      className={SOCIAL_FEED_CAROUSEL_BLEED_CLASS}
      style={{ aspectRatio: String(aspect) }}
    >
      <div
        ref={trackRef}
        data-social-post-carousel-track=""
        className={SOCIAL_FEED_CAROUSEL_TRACK_CLASS}
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
              <CarouselSlideFace
                item={item}
                band={slideRole}
                onLoad={slide === 0 ? onFirstLoad : undefined}
              />
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
      {topic ? (
        <span data-social-post-topic="" className={SOCIAL_POST_TOPIC_CHIP_CLASS}>
          {topic}
        </span>
      ) : null}
      <p data-social-post-carousel-count="" aria-live="polite" className={SOCIAL_POST_COUNT_CHIP_CLASS}>
        <span aria-hidden="true">{socialFeedCarouselChip(index, total)}</span>
        <span className="sr-only">{label}</span>
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
