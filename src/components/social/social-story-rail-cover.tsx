"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { SocialMediaImage } from "@/components/social/social-media-image";
import { SocialStoryMuxThumb } from "@/components/social/social-story-mux-thumb";
import { SOCIAL_STORY_CARD_IMAGE_SIZES } from "@/lib/social-media-display";
import { socialStoryRailCover } from "@/lib/social-edge";
import { socialMuxPlaybackRequiresTokens } from "@/lib/social-mux";
import { SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN } from "@/lib/social-story-rail-mint";

// Home tall card fill. Story stills only. Video is not a native src.
// Signed Mux JWTs and story-still media URLs wait until the card
// intersects. Then loading=eager: the rail is overflow-x, and iOS
// Safari's lazy loader misses those images and paints the broken-image
// glyph on a card that is on screen.
// docs/design-locks/stories-home-rail-mint-on-visible-lock-v1.md

function useStoryRailThumbVisible(enabled: boolean): {
  ref: RefObject<HTMLSpanElement | null>;
  visible: boolean;
} {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { root: null, rootMargin: SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, visible]);

  return { ref, visible };
}

export function SocialStoryRailCover({
  media,
  authorId,
}: {
  media: unknown;
  authorId: string;
}) {
  const cover = socialStoryRailCover(media, authorId);
  const signedMux = Boolean(cover?.playbackId && socialMuxPlaybackRequiresTokens(cover.playbackPolicy));
  const proxyStill = Boolean(cover && !cover.playbackId && cover.kind === "image" && cover.url);
  const { ref, visible } = useStoryRailThumbVisible(signedMux || proxyStill);

  if (cover?.playbackId) {
    return (
      <span ref={ref} className="absolute inset-0 size-full">
        <SocialStoryMuxThumb
          playbackId={cover.playbackId}
          playbackPolicy={cover.playbackPolicy}
          url={cover.url}
          needed={!signedMux || visible}
        />
      </span>
    );
  }
  if (!cover || cover.kind !== "image" || !cover.url) {
    if (cover?.kind === "video") {
      return <div data-social-video-closed="" className="absolute inset-0 size-full object-cover" />;
    }
    return null;
  }
  if (!visible) {
    return (
      <span
        ref={ref}
        data-social-story-rail-cover="held"
        className="absolute inset-0 size-full"
      />
    );
  }
  return (
    <span ref={ref} className="absolute inset-0 size-full">
      <SocialMediaImage
        src={cover.url}
        sizes={SOCIAL_STORY_CARD_IMAGE_SIZES}
        alt=""
        loading="eager"
        className="absolute inset-0 size-full object-cover"
      />
    </span>
  );
}
