"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { SocialCommentTrigger } from "@/components/social/social-comment-trigger";
import { SocialLikeButton } from "@/components/social/social-engagement";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialMuxPlayer } from "@/components/social/social-mux-player";
import { SocialPostShareButton } from "@/components/social/social-post-share-button";
import { SocialAvatar } from "@/components/social/social-avatar";
import { useSocialPostLiveBody } from "@/components/social/use-social-optimistic";
import { cn } from "@/lib/cn";
import { SOCIAL, socialMemberHref, socialPersonIdentity } from "@/lib/social";
import {
  loadSocialMuxPlaybackTokens,
  rememberSocialMuxPlaybackTokens,
  socialMuxPlaybackRequiresTokens,
  socialMuxThumbnailUrl,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";
import {
  SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_PLAYER_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS,
  SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS,
  SOCIAL_POST_ACTION_GLYPH,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
} from "@/lib/social-chrome";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

// Vertical For You. Tap stays on this host (play/pause). Author is the
// only leave. Comment and Share sheets mount over the same item.
// Active play() runs in an effect, after the player mounts, with no user
// gesture. Unmuted play() is NotAllowedError there; the quiet mount drops
// it, so the clip stays paused and the first tap only flips `held`.
// Muted play() is allowed. A cold session starts muted, before paint,
// so autoplay stays allowed. Unmute sets preferUnmuted on this host.
// Later Explore items stay unmuted until the user mutes. Tap on the media
// pauses. Tap on the rail mute control passes the muted flag through and
// writes that preference. If an unmuted play() is blocked, onForcedMute
// snaps muted for that attempt and retries muted play. It does not clear
// preferUnmuted. The control stays mounted for the whole item. An empty
// track list never hides it.
// Only the active slide mounts SocialMuxPlayer. Off-screen slides stay a
// poster or closed face. The loader mints the first two signed playbacks
// before paint and attaches those tokens only to that window. The stream
// seeds the session cache from tokens already on the slide and does not
// mint them again. It still warms the active id and the next one when
// those slides have no tokens, and does not mint every closed slide.
// Comment and Share close in place. Dismiss does not move the active index
// and does not leave Explore.
// Phone keeps fit cover on the full-bleed stage. Desktop md+ sizes
// .social-explore-player to a centered 9:16 box and forces contain,
// so a vertical is not cover-cropped into the wide column and a
// landscape letterboxes inside that box.
// docs/design-locks/social-explore-for-you-immersive-lock-v2.md
// docs/design-locks/stories-viewer-mute-control-lock-v1.md

export function SocialExploreForYouStream({
  items,
  emptyLabel,
}: {
  items: readonly SocialExploreForYouItem[];
  emptyLabel: string | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(true);
  // Session preference on this Explore host. Cold start is muted.
  // User unmute sets it; only a user Mute tap clears it. Item changes
  // apply it. Force-mute does not.
  const [preferUnmuted, setPreferUnmuted] = useState(false);
  const [mutedFor, setMutedFor] = useState<string | null>(null);
  const activeItemId = items[active]?.postId ?? "";
  if (activeItemId !== mutedFor) {
    setMutedFor(activeItemId);
    setMuted(!preferUnmuted);
  }

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || items.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.exploreIndex);
        if (!Number.isFinite(index) || index === activeRef.current) return;
        activeRef.current = index;
        setActive(index);
        setHeld(false);
      },
      { root, threshold: [0.6, 0.75, 1] },
    );
    for (const slide of root.querySelectorAll<HTMLElement>("[data-explore-index]")) {
      observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const controller = new AbortController();
    for (const item of [items[active], items[active + 1]]) {
      if (!item || !socialMuxPlaybackRequiresTokens(item.playbackPolicy)) continue;
      if (item.playbackTokens) {
        rememberSocialMuxPlaybackTokens(item.playbackId, item.playbackTokens);
        continue;
      }
      void loadSocialMuxPlaybackTokens(item.playbackId, controller.signal);
    }
    return () => controller.abort();
  }, [active, items]);

  return (
    <div
      ref={scrollerRef}
      data-social-explore-stream=""
      aria-label={SOCIAL.explore.forYou}
      className={SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS}
    >
      {items.length === 0 ? (
        <div className={cn(SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS, "flex items-center px-[var(--space-4)]")}>
          <p data-social-explore-empty="" className="t-body text-band-ink break-words">
            {emptyLabel}
          </p>
        </div>
      ) : (
        items.map((item, index) => (
          <SocialExploreForYouSlide
            key={item.postId}
            item={item}
            index={index}
            active={index === active}
            paused={index === active && held}
            muted={muted}
            onToggle={() => {
              if (index !== active) return;
              setHeld((value) => !value);
            }}
            onToggleMute={() => {
              if (index !== active) return;
              const nextMuted = !muted;
              setMuted(nextMuted);
              setPreferUnmuted(!nextMuted);
            }}
            onForcedMute={() => setMuted(true)}
          />
        ))
      )}
    </div>
  );
}

function SocialExploreForYouSlide({
  item,
  index,
  active,
  paused,
  muted,
  onToggle,
  onToggleMute,
  onForcedMute,
}: {
  item: SocialExploreForYouItem;
  index: number;
  active: boolean;
  paused: boolean;
  muted: boolean;
  onToggle: () => void;
  onToggleMute: () => void;
  onForcedMute: () => void;
}) {
  const playing = active && !paused;
  const person = item.authorHandle
    ? socialPersonIdentity({ handle: item.authorHandle, displayName: item.authorName })
    : null;
  const profileHref = person?.handle ? socialMemberHref(person.handle) : null;
  const username = person?.handleLabel || item.authorName;
  // The caption as this device shows it (an owner's edit, no refresh).
  const body = useSocialPostLiveBody(item.postId, item.body);

  return (
    <article
      data-social-explore-item={item.postId}
      data-explore-index={index}
      data-social-explore-active={active ? "" : undefined}
      data-social-explore-active-index={active ? index : undefined}
      className={SOCIAL_EXPLORE_FOR_YOU_SLIDE_CLASS}
    >
      <div data-social-explore-player="" className={SOCIAL_EXPLORE_FOR_YOU_PLAYER_CLASS}>
        {active ? (
          <SocialMuxPlayer
            playbackId={item.playbackId}
            playbackPolicy={item.playbackPolicy}
            initialTokens={item.playbackTokens}
            fit="cover"
            chromeless
            autoPlay={playing}
            muted={muted}
            onForcedMute={onForcedMute}
            className="social-explore-stage-media absolute inset-0 size-full bg-[#0A0A0B] object-cover md:object-contain"
          />
        ) : (
          <ExploreForYouClosedFace
            playbackId={item.playbackId}
            playbackPolicy={item.playbackPolicy}
            playbackTokens={item.playbackTokens}
          />
        )}
      </div>
      <button
        type="button"
        data-social-explore-media=""
        aria-label={playing ? SOCIAL.explore.pause : SOCIAL.explore.play}
        aria-pressed={playing}
        className="absolute inset-0 z-10"
        onClick={onToggle}
      />
      <div data-social-explore-caption="" className={SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS}>
        {profileHref ? (
          <Link
            href={profileHref}
            data-social-explore-author=""
            className="pointer-events-auto flex items-center gap-[var(--space-2)] text-band-ink"
          >
            <SocialAvatar name={person?.avatarName || username} photoUrl={item.authorPhotoUrl} size="sm" />
            <span className="t-body font-medium break-words">{username}</span>
          </Link>
        ) : username ? (
          <span className="t-body font-medium text-band-ink break-words">{username}</span>
        ) : null}
        {body ? (
          <p className={cn(SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS, "whitespace-pre-wrap")}>{body}</p>
        ) : null}
      </div>
      <div data-social-explore-rail="" className={SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS}>
        <button
          type="button"
          data-social-explore-mute=""
          aria-label={muted ? SOCIAL.explore.unmute : SOCIAL.explore.mute}
          aria-pressed={muted}
          className={cn(SOCIAL_POST_ACTION_HIT_CLASS, "text-band-ink")}
          onClick={onToggleMute}
        >
          <SocialIcon weight="bold" name={muted ? "speaker-slash" : "speaker-high"} size={20} />
        </button>
        {item.canLike ? (
          <SocialLikeButton
            postId={item.postId}
            liked={item.liked}
            likeCount={item.likeCount}
            icon
            tone="stage"
          />
        ) : (
          <span className={cn(SOCIAL_POST_ACTION_HIT_CLASS, "text-band-ink")}>
            <SocialIcon
              weight="bold"
              name="heart"
              size={SOCIAL_POST_ACTION_GLYPH}
              className={SOCIAL_POST_ACTION_HEART_NUDGE_CLASS}
            />
          </span>
        )}
        <SocialCommentTrigger
          post={{
            id: item.postId,
            commentCount: item.commentCount,
            canComment: item.canLike,
          }}
          icon
          tone="stage"
        />
        <SocialPostShareButton postId={item.postId} tone="stage" />
      </div>
    </article>
  );
}

function ExploreForYouClosedFace({
  playbackId,
  playbackPolicy,
  playbackTokens,
}: {
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  playbackTokens?: SocialExploreForYouItem["playbackTokens"];
}) {
  const signed = socialMuxPlaybackRequiresTokens(playbackPolicy);
  const signedThumb = signed && playbackTokens
    ? socialMuxThumbnailUrl(playbackId, playbackTokens.thumbnail)
    : "";
  return (
    <div data-social-explore-closed="" className="absolute inset-0 size-full bg-[#0A0A0B]">
      {signedThumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- JWT still already minted for this slide
        <img
          alt=""
          src={signedThumb}
          data-social-explore-poster=""
          className="pointer-events-none absolute inset-0 size-full object-cover md:object-contain"
        />
      ) : signed ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- public Mux still, no playback mint
        <img
          alt=""
          src={socialMuxThumbnailUrl(playbackId)}
          data-social-explore-poster=""
          className="pointer-events-none absolute inset-0 size-full object-cover md:object-contain"
        />
      )}
    </div>
  );
}
