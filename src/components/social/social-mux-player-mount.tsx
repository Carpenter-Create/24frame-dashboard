"use client";

import { useEffect, useRef } from "react";

import {
  assignQuietMuxPlaybackFlags,
  mountQuietMuxPlayer,
  type QuietMuxHost,
  type QuietMuxPlayerElement,
  type QuietMuxPlayerProps,
} from "@/lib/social-mux-player-quiet";

// Browser-only. The React mux-player wrapper writes stream, poster, muted,
// preload, and style before the node is appended, which is the Media Chrome
// warning. This host appends a bare mux-player, then assigns those fields.
// Class and playsinline stay on the quiet mount. Callers cannot override them.
// Playback id, stream, preload, poster, style, and tokens identify the element.
// Mute and autoplay are written on that live element so a story keeps its place.

export default function SocialMuxPlayerMount(props: QuietMuxPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<QuietMuxPlayerElement | null>(null);
  const propsRef = useRef(props);
  // The value assignConnectedMuxPlayer already applied. The live-element
  // effect calls play() or pause() only when this changes.
  const appliedAutoPlayRef = useRef(props.autoPlay);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);
  const styleKey = Object.entries(props.style)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  const tokenKey = props.tokens
    ? `${props.tokens.playback}|${props.tokens.thumbnail}|${props.tokens.storyboard}`
    : "";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const onLoaded = () => propsRef.current.onLoadedData?.();

    void import("@mux/mux-player-react").then(() => {
      if (cancelled || !host.isConnected) return;
      const current = propsRef.current;
      const player = mountQuietMuxPlayer(
        host as unknown as QuietMuxHost,
        () => document.createElement("mux-player") as unknown as QuietMuxPlayerElement,
        {
          playbackId: current.playbackId,
          streamType: current.streamType,
          preload: current.preload,
          poster: current.poster,
          autoPlay: current.autoPlay,
          muted: current.muted,
          onForcedMute: current.onForcedMute,
          tokens: current.tokens,
          style: current.style,
          onLoadedData: onLoaded,
        },
      );
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      const player = playerRef.current;
      player?.removeEventListener("loadeddata", onLoaded);
      player?.remove();
      playerRef.current = null;
    };
  }, [props.playbackId, props.poster, props.preload, props.streamType, styleKey, tokenKey]);

  useEffect(() => {
    const autoPlayChanged = appliedAutoPlayRef.current !== props.autoPlay;
    appliedAutoPlayRef.current = props.autoPlay;
    const player = playerRef.current;
    if (!player?.isConnected) return;
    // Mute always lands. play() and pause() run only when autoPlay changed,
    // so a mute-only flip does not call play() again.
    assignQuietMuxPlaybackFlags(player, {
      autoPlay: props.autoPlay,
      muted: props.muted,
      autoPlayChanged,
      onForcedMute: propsRef.current.onForcedMute,
    });
  }, [props.autoPlay, props.muted]);

  return <div ref={hostRef} className="size-full" />;
}
