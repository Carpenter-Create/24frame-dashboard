"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SOCIAL_POST_MEDIA_CLASS } from "@/lib/social-chrome";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";
import {
  SOCIAL_FEED_VIDEO_PENDING_CLASS,
  SOCIAL_POST_IMAGE_SIZES,
  socialFeedVideoFrame,
  socialMediaFrameClass,
  type SocialFeedVideoFrame,
} from "@/lib/social-media-display";
import { SOCIAL } from "@/lib/social";

import { SocialFeedCarousel } from "./social-feed-carousel";
import { SocialFeedVideo } from "./social-feed-video";
import { SocialMediaImage } from "./social-media-image";

export function SocialPostMedia({
  items,
  onOpen,
  frameClass,
  muxBandId,
}: {
  items: readonly SocialPostMediaItem[];
  onOpen: (index: number) => void;
  frameClass?: string;
  muxBandId?: string;
}) {
  if (items.length === 0) return null;
  if (socialFeedUsesCarousel(items.length)) {
    return <SocialFeedCarousel items={items} onOpen={onOpen} muxBandId={muxBandId} />;
  }
  return (
    <div data-social-post-media="" className={cn("@container", SOCIAL_POST_MEDIA_CLASS)}>
      {items.map((item, index) => (
        <SocialPostMediaFrame
          key={item.playbackId ?? item.url}
          item={item}
          label={item.kind === "video" ? SOCIAL.post.viewVideo : SOCIAL.post.viewPhoto}
          frameClass={frameClass}
          muxBandId={muxBandId}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  );
}

function SocialPostMediaFrame({
  item,
  label,
  frameClass,
  muxBandId,
  onOpen,
}: {
  item: SocialPostMediaItem;
  label: string;
  frameClass?: string;
  muxBandId?: string;
  onOpen: () => void;
}) {
  const open = (
    <button
      type="button"
      data-social-feed-media-open=""
      aria-label={label}
      className="absolute inset-0 z-10 cursor-pointer"
      onClick={onOpen}
    />
  );
  if (item.kind === "video") {
    return (
      <SocialFeedVideoFrame item={item} muxBandId={muxBandId} open={open} />
    );
  }
  const frame = cn(
    frameClass ?? socialMediaFrameClass(item),
    "relative w-full overflow-hidden bg-surface-muted",
  );
  return (
    <div data-social-post-image="" data-social-feed-media-frame="" className={frame}>
      <SocialMediaImage src={item.url} sizes={SOCIAL_POST_IMAGE_SIZES} />
      {open}
    </div>
  );
}

function SocialFeedVideoFrame({
  item,
  muxBandId,
  open,
}: {
  item: SocialPostMediaItem;
  muxBandId?: string;
  open: ReactNode;
}) {
  const stored = socialFeedVideoFrame(item);
  const [probed, setProbed] = useState<SocialFeedVideoFrame | null>(null);
  useEffect(() => {
    if (socialFeedVideoFrame({ width: item.width, height: item.height })) return;
    if (!item.url || typeof Image === "undefined") return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const next = socialFeedVideoFrame({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      if (next) setProbed(next);
    };
    image.src = item.url;
    return () => {
      cancelled = true;
    };
  }, [item.url, item.width, item.height]);
  const videoFrame = stored ?? probed;
  return (
    <div
      data-social-feed-media-frame=""
      data-social-feed-video-frame={videoFrame?.orientation}
      className={videoFrame?.className ?? SOCIAL_FEED_VIDEO_PENDING_CLASS}
      style={videoFrame?.style}
    >
      <SocialFeedVideo
        item={item}
        muxBandId={muxBandId}
        className="absolute inset-0 size-full object-cover"
      />
      {open}
    </div>
  );
}
