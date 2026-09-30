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
          ? "relative z-0 block max-w-full object-cover"
          : "relative z-0 block w-full object-contain"
      }
      style={
        frame
          ? {
              aspectRatio: frame.style.aspectRatio,
              width: "100%",
              height: "auto",
              maxHeight: frame.style.maxHeight,
            }
          : {
              width: "100%",
              height: "auto",
              maxHeight: "min(70vh, 560px)",
              objectFit: "contain",
            }
      }
    />
  );
}
