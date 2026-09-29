"use client";

import { cn } from "@/lib/cn";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SOCIAL_POST_MEDIA_CLASS } from "@/lib/social-chrome";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";
import { SOCIAL_POST_IMAGE_SIZES, socialMediaFrameClass } from "@/lib/social-media-display";
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
  const frame = cn(
    frameClass ?? socialMediaFrameClass(item),
    "relative w-full overflow-hidden bg-surface-muted",
  );
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
      <div data-social-feed-media-frame="" className={frame}>
        <SocialFeedVideo
          item={item}
          muxBandId={muxBandId}
          className="absolute inset-0 size-full object-cover"
        />
        {open}
      </div>
    );
  }
  return (
    <div data-social-post-image="" data-social-feed-media-frame="" className={frame}>
      <SocialMediaImage src={item.url} sizes={SOCIAL_POST_IMAGE_SIZES} />
      {open}
    </div>
  );
}
