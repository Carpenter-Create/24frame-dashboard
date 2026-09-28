import { cn } from "@/lib/cn";
import { isSocialMuxId, type SocialMuxPlaybackPolicy } from "@/lib/social-mux";
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
}: {
  item: SocialFeedVideoItem;
  className?: string;
  fit?: "cover" | "contain";
  chromeless?: boolean;
}) {
  const fill = cn(fit === "contain" ? "size-full object-contain" : "size-full object-cover", className);
  if (item.playbackId && isSocialMuxId(item.playbackId)) {
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
  return <div data-social-video-closed="" data-social-post-video="" className={fill} />;
}
