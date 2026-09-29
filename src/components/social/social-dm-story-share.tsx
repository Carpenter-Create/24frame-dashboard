"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialFeedVideo } from "@/components/social/social-feed-video";
import { SocialMediaImage } from "@/components/social/social-media-image";
import {
  callStoryShareHostFullscreen,
  storyShareFullscreenHost,
  type StoryShareFullscreenHost,
} from "@/lib/social-dm-story-fullscreen";
import { SOCIAL } from "@/lib/social";
import { isSocialMuxId, type SocialMuxPlaybackPolicy } from "@/lib/social-mux";

// Send craft v1.4. The card is the story frame. Media fills it.
// The author chip sits on the picture. Not a caption bar under a pasted still.
// Tap fullscreens the same SocialFeedVideo host. No second player.

function asFullscreenHost(node: Element | null): StoryShareFullscreenHost | null {
  if (!node || !(node instanceof HTMLElement)) return null;
  return node as HTMLElement & StoryShareFullscreenHost;
}

function fullscreenSameHost(well: HTMLElement) {
  const mux = well.querySelector("mux-player");
  callStoryShareHostFullscreen(
    storyShareFullscreenHost({
      video: asFullscreenHost(well.querySelector("video")),
      mux: asFullscreenHost(mux),
    }),
  );
}

function AuthorChip({
  authorName,
  authorPhotoUrl,
}: {
  authorName: string;
  authorPhotoUrl: string | null;
}) {
  if (!authorName) return null;
  return (
    <div
      data-social-dm-story-chip=""
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-[8px] bg-gradient-to-b from-black/60 to-transparent p-[8px]"
    >
      <SocialAvatar name={authorName} photoUrl={authorPhotoUrl} size="sm" className="size-6" />
      <div className="min-w-0">
        <p className="truncate t-body-sm text-white">{authorName}</p>
        <p className="t-label text-white/70">{SOCIAL.dms.storyMeta}</p>
      </div>
    </div>
  );
}

export function SocialDmStoryShare({
  authorName,
  authorPhotoUrl,
  unavailable,
  kind,
  url,
  playbackId,
  playbackPolicy,
  href,
}: {
  authorName: string;
  authorPhotoUrl: string | null;
  unavailable: boolean;
  kind: "image" | "video" | null;
  url: string | null;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  href: string | null;
}) {
  const frame = "absolute inset-0 size-full overflow-hidden bg-[#0A0A0B]";
  const muxPlay = kind === "video" && !!playbackId && isSocialMuxId(playbackId);
  let media: ReactNode = null;
  if (!unavailable && kind === "video" && (muxPlay || url)) {
    media = (
      <div
        data-social-dm-story-video=""
        className={frame}
        onClick={(event) => fullscreenSameHost(event.currentTarget)}
      >
        <SocialFeedVideo
          item={{ url: url ?? "", playbackId, playbackPolicy }}
          chromeless
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    );
  } else if (!unavailable && kind === "image" && url && href) {
    media = (
      <Link href={href} data-social-dm-story-photo="" className={`${frame} block`}>
        <SocialMediaImage src={url} sizes="168px" alt="" />
      </Link>
    );
  } else if (!unavailable && kind === "image" && url) {
    media = (
      <div data-social-dm-story-photo="" className={frame}>
        <SocialMediaImage src={url} sizes="168px" alt="" />
      </div>
    );
  } else {
    media = (
      <p className={`${frame} flex items-center justify-center px-[8px] text-center t-body-sm text-white/80 break-words`}>
        {SOCIAL.dms.storyUnavailable}
      </p>
    );
  }

  return (
    <article
      data-social-dm-story-share=""
      className="relative aspect-[9/16] w-[168px] shrink-0 overflow-hidden rounded-[8px] border border-hairline bg-[#0A0A0B]"
    >
      {media}
      <AuthorChip authorName={authorName} authorPhotoUrl={authorPhotoUrl} />
    </article>
  );
}
