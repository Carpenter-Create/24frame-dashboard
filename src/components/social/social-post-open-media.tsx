"use client";

import { SocialFeedCarousel } from "@/components/social/social-feed-carousel";
import { SocialFeedVideo } from "@/components/social/social-feed-video";
import { SocialMediaImage } from "@/components/social/social-media-image";
import type { SocialPostMediaItem } from "@/lib/social-author-post-card";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";

// Comment-open picture. Contain, so a portrait is not cover-cropped.
// Two or more items reuse the feed carousel with the pane frame.
// docs/design-locks/social-post-comment-open-lock-v1.md

export function SocialPostOpenMedia({ items }: { items: readonly SocialPostMediaItem[] }) {
  const item = items[0];
  if (!item) return null;
  if (socialFeedUsesCarousel(items.length)) {
    return (
      <div data-social-post-open-media="" className="social-post-open-media relative h-full min-h-0 w-full">
        <SocialFeedCarousel items={items} fit="contain" frame="pane" />
      </div>
    );
  }
  return (
    <div data-social-post-open-media="" className="social-post-open-media relative h-full min-h-0 w-full">
      {item.kind === "video" ? (
        <SocialFeedVideo
          item={item}
          fit="contain"
          chromeless
          className="social-feed-immersive-media absolute inset-0 size-full object-contain"
        />
      ) : (
        <SocialMediaImage
          src={item.url}
          sizes="(min-width: 768px) 60vw, 100vw"
          fit="contain"
        />
      )}
    </div>
  );
}
