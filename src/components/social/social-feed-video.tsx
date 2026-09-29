"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";
import { isSocialMuxId, type SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import {
  SocialFollowingMuxWarm,
  useSocialFollowingMuxObserve,
  useSocialFollowingMuxRole,
} from "./social-following-mux-band";
import { SocialMuxPlayer } from "./social-mux-player";

export type SocialFeedVideoItem = {
  url: string;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
};

export function SocialFeedVideo({
  item,
  className,
  fit = "cover",
  chromeless = false,
  muxBandId,
}: {
  item: SocialFeedVideoItem;
  className?: string;
  fit?: "cover" | "contain";
  chromeless?: boolean;
  muxBandId?: string;
}) {
  const playable = Boolean(item.playbackId && isSocialMuxId(item.playbackId));
  const bandId = playable ? muxBandId : undefined;
  const hostRef = useRef<HTMLDivElement>(null);
  const role = useSocialFollowingMuxRole(bandId);
  useSocialFollowingMuxObserve(bandId, hostRef);
  const fill = cn(fit === "contain" ? "size-full object-contain" : "size-full object-cover", className);
  if (!playable || !item.playbackId) {
    return <div data-social-video-closed="" data-social-post-video="" className={fill} />;
  }
  if (!muxBandId || role === "unbanded") {
    return (
      <SocialMuxPlayer
        playbackId={item.playbackId}
        playbackPolicy={item.playbackPolicy}
        fit={fit}
        chromeless={chromeless}
        className={fill}
      />
    );
  }
  return (
    <div
      ref={hostRef}
      data-social-mux-band={muxBandId}
      data-social-mux-slot={role}
      data-social-post-video=""
      className={fill}
    >
      {role === "mount" ? (
        <SocialMuxPlayer
          playbackId={item.playbackId}
          playbackPolicy={item.playbackPolicy}
          fit={fit}
          chromeless={chromeless}
          className={fill}
        />
      ) : null}
      {role === "warm" ? (
        <SocialFollowingMuxWarm playbackId={item.playbackId} playbackPolicy={item.playbackPolicy} />
      ) : null}
    </div>
  );
}
