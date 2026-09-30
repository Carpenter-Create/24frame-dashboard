"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

import { cn } from "@/lib/cn";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import { SOCIAL_POST_MEDIA_CLASS } from "@/lib/social-chrome";
import { socialFeedUsesCarousel } from "@/lib/social-feed-carousel";
import {
  SOCIAL_FEED_VIDEO_PENDING_CLASS,
  SOCIAL_POST_IMAGE_SIZES,
  socialFeedFrameOnScreen,
  socialFeedVideoFrame,
  socialFeedVideoPosterSrc,
  socialMediaFrameClass,
  type SocialFeedVideoFrame,
} from "@/lib/social-media-display";
import {
  loadSocialMuxPlaybackTokens,
  readSocialMuxPlaybackTokenCache,
  socialMuxPlaybackRequiresTokens,
} from "@/lib/social-mux";
import { SOCIAL } from "@/lib/social";

import { SocialFeedCarousel } from "./social-feed-carousel";
import { SocialFeedVideo } from "./social-feed-video";
import { SocialFeedVideoPoster } from "./social-feed-video-poster";
import {
  useSocialFollowingMuxMarkOnScreen,
  useSocialFollowingMuxOnScreen,
} from "./social-following-mux-band";
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
      <SocialMediaImage src={item.url} sizes={SOCIAL_POST_IMAGE_SIZES} loading="eager" />
      {open}
    </div>
  );
}

function readFrameRect(node: HTMLElement): { top: number; bottom: number } | null {
  if (typeof node.getBoundingClientRect !== "function") return null;
  try {
    const rect = node.getBoundingClientRect();
    if (!rect || typeof rect.top !== "number" || typeof rect.bottom !== "number") return null;
    return { top: rect.top, bottom: rect.bottom };
  } catch {
    return null;
  }
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
  const frameRef = useRef<HTMLDivElement>(null);
  const onScreen = useSocialFollowingMuxOnScreen(muxBandId);
  const markOnScreen = useSocialFollowingMuxMarkOnScreen();
  const signed = socialMuxPlaybackRequiresTokens(item.playbackPolicy);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const cachedToken = item.playbackId
    ? readSocialMuxPlaybackTokenCache(item.playbackId)?.thumbnail ?? null
    : null;
  const token = mintedToken ?? cachedToken;
  const videoFrame = stored ?? probed;
  const posterSrc = socialFeedVideoPosterSrc({
    playbackId: item.playbackId,
    playbackPolicy: item.playbackPolicy,
    thumbnailToken: token,
  });

  useLayoutEffect(() => {
    if (!muxBandId || !markOnScreen) return;
    const node = frameRef.current;
    if (!node) return;
    const rect = readFrameRect(node);
    const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
    if (rect && socialFeedFrameOnScreen(rect, viewportHeight)) markOnScreen(muxBandId);
  }, [muxBandId, markOnScreen]);

  useEffect(() => {
    if (!signed || !onScreen || !item.playbackId) return undefined;
    if (readSocialMuxPlaybackTokenCache(item.playbackId)) return undefined;
    const controller = new AbortController();
    void loadSocialMuxPlaybackTokens(item.playbackId, controller.signal).then((next) => {
      if (controller.signal.aborted || !next) return;
      setMintedToken(next.thumbnail);
    });
    return () => controller.abort();
  }, [signed, onScreen, item.playbackId]);

  function onPosterLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (stored) return;
    const next = socialFeedVideoFrame({
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
    if (next) setProbed(next);
  }

  return (
    <div
      ref={frameRef}
      data-social-feed-media-frame=""
      data-social-feed-video-frame={videoFrame?.orientation}
      className={videoFrame?.className ?? SOCIAL_FEED_VIDEO_PENDING_CLASS}
      style={videoFrame?.style}
    >
      {posterSrc ? (
        <SocialFeedVideoPoster src={posterSrc} frame={videoFrame} onLoad={onPosterLoad} />
      ) : null}
      {videoFrame || posterSrc ? (
        <div className="absolute inset-0 z-[1]">
          <SocialFeedVideo item={item} muxBandId={muxBandId} className="size-full object-cover" />
        </div>
      ) : (
        <SocialFeedVideo
          item={item}
          muxBandId={muxBandId}
          className="relative block h-auto w-full object-contain"
        />
      )}
      {open}
    </div>
  );
}
