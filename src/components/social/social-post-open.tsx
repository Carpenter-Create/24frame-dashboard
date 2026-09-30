"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Close44, HouseEmpty } from "@/components/chrome/house";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialCommentThread } from "@/components/social/social-comment-thread";
import { SocialLikeButton, SocialLikeCount } from "@/components/social/social-engagement";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialPostOpenMedia } from "@/components/social/social-post-open-media";
import { SocialPostShareButton } from "@/components/social/social-post-share-button";
import { cn } from "@/lib/cn";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import {
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_OPEN_FRAME_CLASS,
  SOCIAL_POST_OPEN_FRAME_MEDIA_CLASS,
  SOCIAL_POST_OPEN_FRAME_TEXT_CLASS,
  SOCIAL_POST_OPEN_HOST_CLASS,
  SOCIAL_POST_OPEN_HOST_MEDIA_CLASS,
  SOCIAL_POST_OPEN_HOST_TEXT_CLASS,
  SOCIAL_POST_OPEN_MEDIA_PANE_CLASS,
  SOCIAL_POST_OPEN_RAIL_CLASS,
  SOCIAL_POST_OPEN_RAIL_MEDIA_CLASS,
  SOCIAL_POST_TIME_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import {
  socialImmersiveClearShellInert,
  socialImmersiveMarkShellInert,
} from "@/lib/social-feed-immersive";
import {
  displayHandle,
  SOCIAL,
  SOCIAL_ROUTES,
  socialFeedRelativeTime,
  socialGroupHref,
  socialMemberHref,
} from "@/lib/social";
import {
  socialPostOpenCloseHref,
  type SocialPostOpenDismiss,
} from "@/lib/social-post-open";

// docs/design-locks/social-post-comment-open-lock-v1.md

const NESTED_DISMISS_SELECTOR = [
  "[data-social-post-share-sheet]",
  '[data-house-overlay-host="house-dialog"]',
  '[data-house-overlay-host="app-sheet"]',
].join(", ");

function useSocialPostOpenDismiss(dismiss: SocialPostOpenDismiss) {
  const router = useRouter();
  return useCallback(() => {
    const href = socialPostOpenCloseHref({
      dismiss,
      referrer: document.referrer,
      origin: window.location.origin,
      href: window.location.href,
    });
    if (href === "back") {
      router.back();
      return;
    }
    router.push(href ?? SOCIAL_ROUTES.home);
  }, [dismiss, router]);
}

function useClientPortal() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function useSocialPostOpenHost(onDismiss: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useClientPortal();
  useEffect(() => {
    if (!mounted) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const scroller = document.querySelector("[data-house-lead-scroll]");
    const previousOverflow = scroller instanceof HTMLElement ? scroller.style.overflow : "";
    if (scroller instanceof HTMLElement) scroller.style.overflow = "hidden";
    const inerted = socialImmersiveMarkShellInert(document.body, dialog);
    const closes = dialog.querySelectorAll<HTMLElement>("[data-social-post-open-close]");
    const visible = [...closes].find((node) => node.getClientRects().length > 0);
    (visible ?? closes[0])?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(NESTED_DISMISS_SELECTOR)) return;
      event.preventDefault();
      onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      socialImmersiveClearShellInert(inerted);
      if (scroller instanceof HTMLElement) scroller.style.overflow = previousOverflow;
    };
  }, [mounted, onDismiss]);
  return { dialogRef, mounted };
}

function SocialPostOpenRoot({
  mounted,
  children,
}: {
  mounted: boolean;
  children: ReactNode;
}) {
  if (mounted && typeof document !== "undefined") return createPortal(children, document.body);
  return children;
}

export function SocialPostOpenMissing({ dismiss }: { dismiss: SocialPostOpenDismiss }) {
  const onDismiss = useSocialPostOpenDismiss(dismiss);
  const { dialogRef, mounted } = useSocialPostOpenHost(onDismiss);
  return (
    <SocialPostOpenRoot mounted={mounted}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={SOCIAL.post.title}
        data-social-post-missing=""
        data-social-post-open=""
        data-social-post-open-return={dismiss}
        className={cn(SOCIAL_POST_OPEN_HOST_CLASS, "bg-surface")}
      >
        <Close44
          label={SOCIAL.post.closeMedia}
          data-social-post-open-close=""
          onClick={onDismiss}
        />
        <HouseEmpty>{SOCIAL.post.missing}</HouseEmpty>
      </div>
    </SocialPostOpenRoot>
  );
}

export function SocialPostOpen({
  post,
  dismiss,
}: {
  post: SocialPostCardModel;
  dismiss: SocialPostOpenDismiss;
}) {
  const onDismiss = useSocialPostOpenDismiss(dismiss);
  const { dialogRef, mounted } = useSocialPostOpenHost(onDismiss);
  const media = post.media.length > 0;
  const body = post.body?.trim() ?? "";
  const handle = post.authorHandle ? displayHandle(post.authorHandle).slice(1) : post.authorName;
  const caption = body ? (
    <p
      data-social-post-open-caption=""
      className="whitespace-pre-wrap break-words t-body-sm text-ink"
    >
      {media ? <span className="font-semibold">{handle} </span> : null}
      {body}
    </p>
  ) : null;
  const actions = (
    <div data-social-post-actions="" className={SOCIAL_POST_ACTIONS_CLASS}>
      {post.canLike ? (
        <SocialLikeButton
          postId={post.id}
          liked={post.liked}
          likeCount={post.likeCount}
          groupSlug={post.groupSlug ?? undefined}
          icon
        />
      ) : (
        <span className={SOCIAL_POST_ACTION_HIT_CLASS}>
          <SocialIcon name="heart" size={SOCIAL_ICON_SIZE_POST_ACTION} />
        </span>
      )}
      <button
        type="button"
        data-social-post-open-compose=""
        aria-label={SOCIAL.post.commentsTitle}
        className={SOCIAL_POST_ACTION_HIT_CLASS}
        onClick={() => {
          document.getElementById("social-comment-body")?.focus();
        }}
      >
        <SocialIcon name="chat-circle" size={SOCIAL_ICON_SIZE_POST_ACTION} />
      </button>
      <SocialPostShareButton postId={post.id} />
    </div>
  );
  const node = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={SOCIAL.post.commentsTitle}
      data-social-post-open=""
      data-social-post-detail=""
      data-social-post-open-kind={media ? "media" : "text"}
      data-social-post-open-return={dismiss}
      className={cn(
        SOCIAL_POST_OPEN_HOST_CLASS,
        media ? SOCIAL_POST_OPEN_HOST_MEDIA_CLASS : SOCIAL_POST_OPEN_HOST_TEXT_CLASS,
      )}
    >
      <button
        type="button"
        data-social-post-open-scrim=""
        aria-label={SOCIAL.post.closeMedia}
        className="absolute inset-0 hidden md:block"
        onClick={onDismiss}
      />
      <div
        data-social-post-open-frame=""
        className={cn(
          SOCIAL_POST_OPEN_FRAME_CLASS,
          media ? SOCIAL_POST_OPEN_FRAME_MEDIA_CLASS : SOCIAL_POST_OPEN_FRAME_TEXT_CLASS,
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-end px-2 md:hidden">
          <Close44
            label={SOCIAL.post.closeMedia}
            data-social-post-open-close=""
            onClick={onDismiss}
          />
        </div>
        <Close44
          label={SOCIAL.post.closeMedia}
          data-social-post-open-close=""
          onClick={onDismiss}
          className={cn(
            "absolute z-20 hidden md:inline-flex",
            media
              ? "right-[var(--space-4)] top-[var(--space-4)] text-band-ink md:fixed"
              : "right-[var(--space-2)] top-[var(--space-2)]",
          )}
        />
        {media ? (
          <div data-social-post-open-stage="" className={SOCIAL_POST_OPEN_MEDIA_PANE_CLASS}>
            <SocialPostOpenMedia items={post.media} />
          </div>
        ) : null}
        <div
          data-social-post-open-rail=""
          className={cn(SOCIAL_POST_OPEN_RAIL_CLASS, media && SOCIAL_POST_OPEN_RAIL_MEDIA_CLASS)}
        >
          <div className={cn("flex min-w-0 items-center gap-2.5 px-4 py-3", !media && "pr-14")}>
            <SocialAvatar name={post.authorName} photoUrl={post.authorPhotoUrl} size="sm" />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
              {post.authorHandle ? (
                <Link
                  href={socialMemberHref(post.authorHandle)}
                  className="min-w-0 break-words t-body-sm font-semibold text-ink"
                >
                  {post.authorName}
                </Link>
              ) : (
                <span className="min-w-0 break-words t-body-sm font-semibold text-ink">
                  {post.authorName}
                </span>
              )}
              {post.groupSlug && post.groupName ? (
                <Link
                  href={socialGroupHref(post.groupSlug)}
                  className="min-w-0 break-words t-label text-ink-2"
                >
                  {post.groupName}
                </Link>
              ) : null}
              <time dateTime={post.createdAt} data-social-post-time="" className={SOCIAL_POST_TIME_CLASS}>
                {socialFeedRelativeTime(post.createdAt)}
              </time>
            </div>
          </div>
          <SocialCommentThread
            postId={post.id}
            groupSlug={post.groupSlug}
            canComment={post.canLike}
            commentCount={post.commentCount ?? 0}
            variant="panel"
            preamble={caption}
            footer={
              <div className="flex flex-col gap-2 px-4 py-2">
                {actions}
                <SocialLikeCount postId={post.id} liked={post.liked} likeCount={post.likeCount} />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
  return <SocialPostOpenRoot mounted={mounted}>{node}</SocialPostOpenRoot>;
}
