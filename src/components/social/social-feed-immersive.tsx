"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SocialCommentTrigger } from "@/components/social/social-comment-trigger";
import { SocialLikeButton } from "@/components/social/social-engagement";
import { SocialFeedVideo } from "@/components/social/social-feed-video";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialMediaImage } from "@/components/social/social-media-image";
import { SocialPostShareButton } from "@/components/social/social-post-share-button";
import { useSocialPostLiveBody } from "@/components/social/use-social-optimistic";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { cn } from "@/lib/cn";
import { displayHandle, SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS,
  SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS,
  SOCIAL_FEED_IMMERSIVE_DOCK_CLASS,
  SOCIAL_FEED_IMMERSIVE_MEDIA_CLASS,
  SOCIAL_FEED_IMMERSIVE_MUTE_CLASS,
  SOCIAL_FEED_IMMERSIVE_STAGE_CLASS,
  SOCIAL_POST_ACTION_GLYPH,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTIONS_ROW_CLASS,
} from "@/lib/social-chrome";
import {
  SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR,
  SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR,
  socialImmersiveActiveFocusRoot,
  socialImmersiveCaptionNeedsMore,
  socialImmersiveClearShellInert,
  socialImmersiveEscapeDismisses,
  socialImmersiveFocusables,
  socialImmersiveMarkShellInert,
  socialImmersiveNestedSheetOpen,
  socialImmersiveTabWrapIndex,
} from "@/lib/social-feed-immersive";

// Tap immersive. One fullscreen stage on phone and desktop.
// docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md
// Share opens the existing post Share sheet. Comment stays the thread.

export function SocialFeedImmersive({
  post,
  index,
  onClose,
}: {
  post: SocialPostCardModel;
  index: number;
  onClose: () => void;
}) {
  const item = post.media[index];
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The caption as this device shows it (an owner's edit, no refresh).
  const body = useSocialPostLiveBody(post.id, post.body)?.trim() ?? "";
  const needsMore = body.length > 0 && socialImmersiveCaptionNeedsMore(body);
  const handle = post.authorHandle ? displayHandle(post.authorHandle).slice(1) : post.authorName;
  const label = item?.kind === "video" ? SOCIAL.post.viewVideo : SOCIAL.post.viewPhoto;
  const open = Boolean(item);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      const onEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      };
      window.addEventListener("keydown", onEscape);
      return () => window.removeEventListener("keydown", onEscape);
    }
    const scroller = document.querySelector("[data-house-lead-scroll]");
    const top = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
    const previous = scroller instanceof HTMLElement ? scroller.style.overflow : "";
    if (scroller instanceof HTMLElement) scroller.style.overflow = "hidden";
    const previouslyFocused =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
    const inerted = socialImmersiveMarkShellInert(document.body, dialog);
    dialog.querySelector<HTMLElement>("[data-social-feed-immersive-close]")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      // Comment listens on document. Share listens on window. Both are
      // still mounted for this Escape, so the stage must not dismiss too.
      if (event.key === "Escape") {
        event.stopPropagation();
        if (socialImmersiveEscapeDismisses(event.key, socialImmersiveNestedSheetOpen(document))) {
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const share = document.querySelector(SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR);
      const comment = dialog.querySelector(SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR);
      const root = socialImmersiveActiveFocusRoot(
        share instanceof HTMLElement ? share : null,
        comment instanceof HTMLElement ? comment : null,
        dialog,
      );
      const focusables = socialImmersiveFocusables(root);
      const active = document.activeElement;
      const index = socialImmersiveTabWrapIndex(
        focusables.length,
        active instanceof HTMLElement ? focusables.indexOf(active) : -1,
        active instanceof Node && root.contains(active),
        event.shiftKey,
      );
      if (index === null) return;
      event.preventDefault();
      focusables[index]?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      socialImmersiveClearShellInert(inerted);
      if (scroller instanceof HTMLElement) {
        scroller.style.overflow = previous;
        scroller.scrollTop = top;
      } else {
        window.scrollTo(0, top);
      }
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose, open]);

  if (!item) return null;

  const node = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-social-feed-immersive=""
      className={SOCIAL_FEED_IMMERSIVE_STAGE_CLASS}
    >
      <div data-social-feed-immersive-media="" className={SOCIAL_FEED_IMMERSIVE_MEDIA_CLASS}>
        {item.kind === "video" ? (
          <SocialFeedVideo
            item={item}
            fit="contain"
            muted={muted}
            className="social-feed-immersive-media absolute inset-0 size-full object-contain"
          />
        ) : (
          <SocialMediaImage src={item.url} sizes="100vw" fit="contain" />
        )}
      </div>
      <button
        type="button"
        data-social-feed-immersive-close=""
        aria-label={SOCIAL.post.closeMedia}
        className={SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS}
        onClick={onClose}
      >
        <SocialIcon weight="bold" name="x" size={22} />
      </button>
      {item.kind === "video" ? (
        <button
          type="button"
          data-social-feed-immersive-mute=""
          aria-label={muted ? SOCIAL.post.unmute : SOCIAL.post.mute}
          aria-pressed={muted}
          className={SOCIAL_FEED_IMMERSIVE_MUTE_CLASS}
          onClick={() => setMuted((value) => !value)}
        >
          <SocialIcon weight="bold" name={muted ? "speaker-slash" : "speaker-high"} size={20} />
        </button>
      ) : null}
      <div data-social-feed-immersive-dock="" className={SOCIAL_FEED_IMMERSIVE_DOCK_CLASS}>
        {body ? (
          <div data-social-feed-immersive-caption="">
            <p
              className={cn(
                SOCIAL_FEED_IMMERSIVE_CAPTION_CLASS,
                needsMore && !expanded && "line-clamp-3",
                expanded && "max-h-[40vh] overflow-y-auto whitespace-pre-wrap",
              )}
            >
              <span className="font-medium">{handle} </span>
              {body}
            </p>
            {needsMore && !expanded ? (
              <button
                type="button"
                data-social-feed-immersive-more=""
                className="t-body font-medium text-band-ink"
                onClick={() => setExpanded(true)}
              >
                {SOCIAL.post.captionMore}
              </button>
            ) : null}
          </div>
        ) : null}
        <div data-social-post-actions="" className={SOCIAL_POST_ACTIONS_ROW_CLASS}>
          {post.canLike ? (
            <SocialLikeButton
              postId={post.id}
              liked={post.liked}
              likeCount={post.likeCount}
              groupSlug={post.groupSlug ?? undefined}
              icon
              tone="stage"
            />
          ) : (
            <span className={cn(SOCIAL_POST_ACTION_HIT_CLASS, "text-band-ink")}>
              <SocialIcon weight="bold" name="heart" size={SOCIAL_POST_ACTION_GLYPH} />
            </span>
          )}
          <SocialCommentTrigger
            post={{
              id: post.id,
              commentCount: post.commentCount,
              groupSlug: post.groupSlug,
              canComment: post.canLike,
            }}
            icon
            tone="stage"
          />
          <SocialPostShareButton postId={post.id} tone="stage" />
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? node : createPortal(node, document.body);
}
