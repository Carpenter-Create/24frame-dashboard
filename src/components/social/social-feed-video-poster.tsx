"use client";

import type { SyntheticEvent } from "react";

import type { SocialFeedVideoFrame } from "@/lib/social-media-display";

// Mux thumbs are not a next/image host. The still is in flow with a
// definite height so the card paints before any scroll. Eager: a lazy
// absolute fill withholds the first screen until the user scrolls.

export function SocialFeedVideoPoster({
  src,
  frame,
  onLoad,
}: {
  src: string;
  frame: SocialFeedVideoFrame | null;
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Mux poster is not a next/image host
    <img
      alt=""
      src={src}
      loading="eager"
      decoding="async"
      data-social-feed-video-poster=""
      onLoad={onLoad}
      className={
        frame
          ? "absolute inset-0 z-0 block size-full object-cover"
          : "relative z-0 block h-auto w-full object-contain"
      }
    />
  );
}
