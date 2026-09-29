"use client";

import { useEffect, useState } from "react";

import {
  SOCIAL_MUX_PLAYBACK_ROUTE,
  socialMuxPlaybackRequiresTokens,
  socialMuxPlaybackTokensFromJson,
  socialMuxThumbnailUrl,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";

// Rail poster only. Signed playback 403s on image.mux.com until the
// thumbnail JWT exists, and that host is not a next/image remote pattern.
// Paint nothing until the src can decode — an empty or unsigned src is
// the Safari broken-image glyph on the story card.
// Public thumbs always use socialMuxThumbnailUrl. A caller url can carry
// a stale time and must not override time=0. Signed still waits for the
// thumbnail JWT, then uses that token.
// The Home rail passes needed=false until the card intersects, so a full
// ring does not sign on mount. A direct mount still mints.

export function SocialStoryMuxThumb({
  playbackId,
  playbackPolicy,
  thumbnail = null,
  needed = true,
}: {
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  /** Accepted from the rail. Not read — a caller url must not override time=0. */
  url: string;
  /** Server warm for this playback id. Skips /api/social/mux-playback. */
  thumbnail?: { playbackId: string; token: string } | null;
  /** False withholds the playback JWT. Default true keeps a direct mount. */
  needed?: boolean;
}) {
  const signed = socialMuxPlaybackRequiresTokens(playbackPolicy);
  const provided =
    signed && thumbnail?.playbackId === playbackId && thumbnail.token ? thumbnail.token : null;
  // Home rail cards are keyed by author, so this instance survives a new
  // story. A thumbnail JWT is valid only for the playback id that minted it.
  // The check is on render: a new id does not paint the previous JWT.
  // Same bind as SocialMuxPlayer. Leaving this effect clears the mint, so
  // signed false→true on the same id cannot keep the previous token.
  const [mint, setMint] = useState<{ playbackId: string; token: string } | null>(null);
  const token = (signed && mint?.playbackId === playbackId ? mint.token : null) ?? provided;

  useEffect(() => {
    if (!signed || !needed || provided) return;
    const controller = new AbortController();
    void fetch(`${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(playbackId)}`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (controller.signal.aborted) return;
        const next = socialMuxPlaybackTokensFromJson(body);
        if (next) setMint({ playbackId, token: next.thumbnail });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => {
      controller.abort();
      setMint(null);
    };
  }, [playbackId, signed, needed, provided]);

  const src = signed
    ? token
      ? socialMuxThumbnailUrl(playbackId, token)
      : ""
    : socialMuxThumbnailUrl(playbackId);
  if (!src) {
    return <span data-social-story-mux-thumb="pending" className="absolute inset-0 size-full" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Mux poster is not a next/image host
    <img
      alt=""
      src={src}
      loading="eager"
      decoding="async"
      data-social-story-mux-thumb=""
      className="absolute inset-0 size-full object-cover"
    />
  );
}
