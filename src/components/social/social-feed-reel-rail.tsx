"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialStoryMuxThumb } from "@/components/social/social-story-mux-thumb";
import { HOUSE_CLIENT_SHELL } from "@/lib/house-client-shell";
import { houseNavIgnorePendingClick } from "@/lib/house-nav-pending";
import {
  SOCIAL_FEED_HEADING_CLASS,
  SOCIAL_FEED_REEL_AUTHOR_CLASS,
  SOCIAL_FEED_REEL_CAPTION_CLASS,
  SOCIAL_FEED_REEL_FACE_CLASS,
  SOCIAL_FEED_REEL_NAME_CLASS,
  SOCIAL_FEED_REEL_SCRIM_CLASS,
  SOCIAL_FEED_REEL_TILE_CLASS,
  SOCIAL_FEED_REEL_VIGNETTE_CLASS,
  SOCIAL_FEED_REELS_ARROWS_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_REELS_ITEM_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
  socialFeedReelsArrowClass,
} from "@/lib/social-chrome";
import {
  rememberSocialFeedReelReturn,
  SOCIAL_FEED_REEL_NEAR_ROOT_MARGIN,
  SOCIAL_FEED_REEL_STEP_PX,
  takeSocialFeedReelScroll,
  type SocialFeedReelTile,
} from "@/lib/social-feed-reels";
import { SOCIAL } from "@/lib/social";

import { useSocialRowEdges } from "./use-social-row-edges";

// Feed Reels row (Adam pick 2026-10-04; the H register's face,
// 2026-10-05). A row of 9:16 stills from the For you Explore list, under
// a "Reels" heading. Sideways on its own; the page keeps scrolling down.
// Desktop's round grey arrows page by two tiles; phone swipes with snap.
// Each tile is a link to Explore opened at that reel. Stills only: no
// player mounts here (one-player gate). Thumbnails wait until the rail is
// near the viewport. The tap notes where it left, so Exit can take Back
// and this rail can return to the same sideways spot.
// docs/design-locks/social-feed-reel-rail-lock-v1.md (data, cadence)
// docs/design-locks/social-feed-register-lock-v1.md (face)

function useRailNear(): { ref: RefObject<HTMLElement | null>; near: boolean } {
  const ref = useRef<HTMLElement | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return undefined;
    const node = ref.current;
    // No IntersectionObserver: stills stay held (same as the story rail).
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    // The page scrolls inside main (house shell), not the window. A null
    // root would widen only the viewport while main still clips the rail,
    // so the 600px lead would never apply. Observe against main.
    const root = document.querySelector<HTMLElement>(`[${HOUSE_CLIENT_SHELL.scrollAttr}]`) ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { root, rootMargin: SOCIAL_FEED_REEL_NEAR_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return { ref, near };
}

export function SocialFeedReelRail({
  rail,
  tiles,
}: {
  rail: number;
  tiles: readonly SocialFeedReelTile[];
}) {
  const { ref: trackRef, start: atStart, end: atEnd, measure } = useSocialRowEdges<HTMLUListElement>();
  const { ref: sectionRef, near } = useRailNear();

  // Back from Explore: the rail returns to where the tap left it.
  useLayoutEffect(() => {
    const left = takeSocialFeedReelScroll(rail);
    const node = trackRef.current;
    if (left === null || !node) return;
    node.scrollLeft = left;
    measure();
  }, [rail, trackRef, measure]);

  function page(direction: 1 | -1) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * SOCIAL_FEED_REEL_STEP_PX, behavior: "smooth" });
  }

  return (
    <section
      ref={sectionRef}
      aria-label={SOCIAL.reels.title}
      data-social-feed-reels={rail}
      className={SOCIAL_FEED_REELS_CLASS}
    >
      <div className={SOCIAL_FEED_REELS_HEAD_CLASS}>
        <h2 className={SOCIAL_FEED_HEADING_CLASS}>{SOCIAL.reels.title}</h2>
        <div data-social-feed-reels-arrows="" className={SOCIAL_FEED_REELS_ARROWS_CLASS}>
          <button
            type="button"
            aria-label={SOCIAL.reels.previous}
            aria-disabled={atStart ? "true" : undefined}
            data-social-feed-reels-prev=""
            className={socialFeedReelsArrowClass(atStart)}
            onClick={() => {
              if (!atStart) page(-1);
            }}
          >
            <SocialIcon name="caret-left" size={20} />
          </button>
          <button
            type="button"
            aria-label={SOCIAL.reels.next}
            aria-disabled={atEnd ? "true" : undefined}
            data-social-feed-reels-next=""
            className={socialFeedReelsArrowClass(atEnd)}
            onClick={() => {
              if (!atEnd) page(1);
            }}
          >
            <SocialIcon name="caret-right" size={20} />
          </button>
        </div>
      </div>
      <ul ref={trackRef} data-social-feed-reels-track="" className={SOCIAL_FEED_REELS_TRACK_CLASS}>
        {tiles.map((tile) => (
          <li key={tile.postId} className={SOCIAL_FEED_REELS_ITEM_CLASS}>
            <Link
              href={tile.href}
              prefetch={false}
              aria-label={tile.label}
              data-social-feed-reel={tile.postId}
              className={SOCIAL_FEED_REEL_TILE_CLASS}
              onClick={(event) => {
                // A modified click opens a new tab and this tab stays put:
                // no note, or a later remount would jump to a stale spot.
                if (event.defaultPrevented || houseNavIgnorePendingClick(event)) return;
                rememberSocialFeedReelReturn({
                  explore: tile.href,
                  rail,
                  left: trackRef.current?.scrollLeft ?? 0,
                });
              }}
            >
              {near ? (
                <SocialStoryMuxThumb
                  playbackId={tile.playbackId}
                  playbackPolicy={tile.playbackPolicy}
                  url=""
                />
              ) : (
                <span data-social-feed-reel-still="held" className="absolute inset-0" />
              )}
              <span className={SOCIAL_FEED_REEL_VIGNETTE_CLASS} />
              <span className={SOCIAL_FEED_REEL_SCRIM_CLASS}>
                <span className={SOCIAL_FEED_REEL_AUTHOR_CLASS}>
                  {/* Portrait waits with the still; eager once near (iOS
                      Safari drops lazy images in a sideways scroller). */}
                  <SocialAvatar
                    name={tile.authorName}
                    photoUrl={near ? tile.authorPhotoUrl : null}
                    size="sm"
                    loading="eager"
                    className={SOCIAL_FEED_REEL_FACE_CLASS}
                  />
                  <span className={SOCIAL_FEED_REEL_NAME_CLASS}>{tile.authorName}</span>
                </span>
                {tile.caption ? (
                  <span className={SOCIAL_FEED_REEL_CAPTION_CLASS}>{tile.caption}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
