"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/cn";
import { SOCIAL_MUX_PLAYER_CLASS } from "@/lib/social-chrome";
import {
  loadSocialMuxPlaybackTokens,
  readSocialMuxPlaybackTokenCache,
  socialMuxCoveringPoster,
  socialMuxPlaybackRequiresTokens,
  socialMuxSignedPlayerReady,
  socialMuxThumbnailUrl,
  type SocialMuxPlaybackPolicy,
  type SocialMuxPlaybackTokens,
} from "@/lib/social-mux";
import type { QuietMuxPlayerStyle } from "@/lib/social-mux-player-quiet";

// Mux Player is browser-only. SSR paints the host so feed tests stay
// static. Signed policy mints tokens on the Node route. Public policy
// and rows with no policy play the playback id alone.
// Adaptive Auto — no quality Settings control in v1.
// Feed face is cover. Immersive passes contain.
// docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md

const MuxPlayer = dynamic(() => import("./social-mux-player-mount"), { ssr: false });

function MuxPoster({
  src,
  fit,
  onReady,
  onDecoded,
}: {
  src: string;
  fit: "cover" | "contain";
  onReady?: () => void;
  onDecoded?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumb hold until decoded frames
    <img
      alt=""
      src={src}
      data-social-mux-poster=""
      onLoad={() => {
        onDecoded?.();
        onReady?.();
      }}
      onError={onReady}
      className={cn(
        "pointer-events-none absolute inset-0 size-full",
        fit === "contain" ? "object-contain" : "object-cover",
      )}
    />
  );
}

function playerStyle(chromeless: boolean, fit: "cover" | "contain"): QuietMuxPlayerStyle {
  const cover = {
    aspectRatio: "auto",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  } as const;
  const contain = {
    aspectRatio: "auto",
    width: "100%",
    height: "100%",
    objectFit: "contain",
  } as const;
  const base = fit === "contain" ? contain : cover;
  if (!chromeless) return base;
  return {
    ...base,
    "--controls": "none",
  };
}

export function SocialMuxPlayer({
  playbackId,
  playbackPolicy,
  className,
  fit = "cover",
  muted = false,
  autoPlay = false,
  chromeless = false,
  onPaint,
  onForcedMute,
}: {
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  className?: string;
  fit?: "cover" | "contain";
  muted?: boolean;
  autoPlay?: boolean;
  chromeless?: boolean;
  onPaint?: () => void;
  onForcedMute?: () => void;
}) {
  const signed = socialMuxPlaybackRequiresTokens(playbackPolicy);
  const cached = signed ? readSocialMuxPlaybackTokenCache(playbackId) : null;
  const [mint, setMint] = useState<{ playbackId: string; tokens: SocialMuxPlaybackTokens } | null>(null);
  const [paintedId, setPaintedId] = useState<string | null>(null);
  const [posterReadyId, setPosterReadyId] = useState<string | null>(null);
  const tokens = signed ? (mint?.playbackId === playbackId ? mint.tokens : cached) : null;
  const painted = paintedId === playbackId;
  const posterReady = posterReadyId === playbackId;
  const poster = socialMuxThumbnailUrl(playbackId, tokens?.thumbnail);
  const signedPoster = tokens ? socialMuxThumbnailUrl(playbackId, tokens.thumbnail) : null;
  const releaseHold = () => {
    onPaint?.();
  };
  const paint = () => {
    setPaintedId(playbackId);
    releaseHold();
  };
  useEffect(() => {
    if (!signed) return;
    if (readSocialMuxPlaybackTokenCache(playbackId)) return;
    const controller = new AbortController();
    void loadSocialMuxPlaybackTokens(playbackId, controller.signal).then((next) => {
      if (controller.signal.aborted || !next) return;
      setMint({ playbackId, tokens: next });
    });
    return () => controller.abort();
  }, [playbackId, signed]);
  useEffect(() => {
    if (!signed || !tokens) return;
    void import("./social-mux-player-mount");
  }, [signed, tokens]);

  return (
    <div
      data-social-mux-player={playbackId}
      data-social-mux-playback={signed ? (tokens ? "signed" : "pending") : "public"}
      data-social-post-video=""
      className={cn(
        "relative",
        SOCIAL_MUX_PLAYER_CLASS,
        fit === "contain" && "social-feed-immersive-media object-contain",
        className,
      )}
    >
      {signed ? (
        <>
          {/* No image.mux.com request before the thumbnail JWT — that 403
              is the Safari broken-image glyph. Empty span until tokens.
              Then the JWT thumb paints and decodes before the player mounts,
              and stays up until loadeddata, same as public. */}
          {socialMuxCoveringPoster(signed, Boolean(tokens)) ? (
            <span data-social-mux-poster="pending" className="absolute inset-0 size-full" />
          ) : null}
          {signedPoster && tokens ? (
            <>
              {socialMuxSignedPlayerReady(Boolean(tokens), posterReady) ? (
                <MuxPlayer
                  playbackId={playbackId}
                  tokens={{
                    playback: tokens.playback,
                    thumbnail: tokens.thumbnail,
                    storyboard: tokens.storyboard,
                  }}
                  streamType="on-demand"
                  autoPlay={autoPlay}
                  muted={muted}
                  onForcedMute={onForcedMute}
                  preload="metadata"
                  onLoadedData={paint}
                  poster={signedPoster}
                  style={playerStyle(chromeless, fit)}
                />
              ) : null}
              {painted ? null : (
                <MuxPoster
                  src={signedPoster}
                  fit={fit}
                  onDecoded={() => setPosterReadyId(playbackId)}
                  onReady={releaseHold}
                />
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          <MuxPlayer
            playbackId={playbackId}
            streamType="on-demand"
            autoPlay={autoPlay}
            muted={muted}
            onForcedMute={onForcedMute}
            preload="metadata"
            onLoadedData={paint}
            poster={poster}
            style={playerStyle(chromeless, fit)}
          />
          {painted ? null : <MuxPoster src={poster} fit={fit} onReady={releaseHold} />}
        </>
      )}
    </div>
  );
}
