"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/cn";
import { SOCIAL_MUX_PLAYER_CLASS } from "@/lib/social-chrome";
import {
  SOCIAL_MUX_PLAYBACK_ROUTE,
  socialMuxCoveringPoster,
  socialMuxPlaybackRequiresTokens,
  socialMuxPlaybackTokensFromJson,
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
}: {
  src: string;
  fit: "cover" | "contain";
  onReady?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumb hold until decoded frames
    <img
      alt=""
      src={src}
      data-social-mux-poster=""
      onLoad={onReady}
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
  const [mint, setMint] = useState<{ playbackId: string; tokens: SocialMuxPlaybackTokens } | null>(null);
  const [paintedId, setPaintedId] = useState<string | null>(null);
  const tokens = signed && mint?.playbackId === playbackId ? mint.tokens : null;
  const painted = paintedId === playbackId;
  const poster = socialMuxThumbnailUrl(playbackId, tokens?.thumbnail);
  const releaseHold = () => {
    onPaint?.();
  };
  const paint = () => {
    setPaintedId(playbackId);
    releaseHold();
  };
  useEffect(() => {
    if (!signed) return;
    const controller = new AbortController();
    void fetch(`${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(playbackId)}`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const next = socialMuxPlaybackTokensFromJson(body);
        if (next) setMint({ playbackId, tokens: next });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controller.abort();
  }, [playbackId, signed]);

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
              Then the JWT thumb stays up until loadeddata, same as public. */}
          {socialMuxCoveringPoster(signed, Boolean(tokens)) ? (
            <span data-social-mux-poster="pending" className="absolute inset-0 size-full" />
          ) : tokens ? (
            <>
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
                poster={poster}
                style={playerStyle(chromeless, fit)}
              />
              {painted ? null : (
                <MuxPoster
                  src={socialMuxThumbnailUrl(playbackId, tokens.thumbnail)}
                  fit={fit}
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
