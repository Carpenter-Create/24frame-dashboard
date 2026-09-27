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
// The src is socialMuxThumbnailUrl, so a public still and a signed JWT
// thumb are both the first frame.

export function SocialStoryMuxThumb({
  playbackId,
  playbackPolicy,
  url,
}: {
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  url: string;
}) {
  const signed = socialMuxPlaybackRequiresTokens(playbackPolicy);
  // Home rail cards are keyed by author, so this instance survives a new
  // story. A thumbnail JWT is valid only for the playback id that minted it.
  // The check is on render: a new id does not paint the previous JWT.
  // Same bind as SocialMuxPlayer. Leaving this effect clears the mint, so
  // signed false→true on the same id cannot keep the previous token.
  const [mint, setMint] = useState<{ playbackId: string; token: string } | null>(null);
  const token = signed && mint?.playbackId === playbackId ? mint.token : null;

  useEffect(() => {
    if (!signed) return;
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
  }, [playbackId, signed]);

  const src = signed
    ? token
      ? socialMuxThumbnailUrl(playbackId, token)
      : ""
    : url || socialMuxThumbnailUrl(playbackId);
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
