"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";

import { HouseLink } from "@/components/chrome/house-link";
import { HouseWindowAsk, HouseWindowFrame, useHouseWindow } from "@/components/chrome/house-window";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { houseNavIgnorePendingClick } from "@/lib/house-nav-pending";
import { SOCIAL, socialFeedRelativeTime, socialGroupHref, socialMemberHref } from "@/lib/social";
import type { SocialPostMediaItem } from "@/lib/social-author-post-card";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_COMMENT_FIELD_CLASS,
  SOCIAL_COMMENTS_WINDOW_AVATAR_EMPTY_CLASS,
  SOCIAL_COMMENTS_WINDOW_COMPOSER_CLASS,
  SOCIAL_COMMENTS_WINDOW_HEAD_CLASS,
  SOCIAL_COMMENTS_WINDOW_MEDIA_CLASS,
  SOCIAL_COMMENTS_WINDOW_NEED_PROFILE_CLASS,
  SOCIAL_COMMENTS_WINDOW_NOTICE_CLASS,
  SOCIAL_COMMENTS_WINDOW_POST_CLASS,
  SOCIAL_COMMENTS_WINDOW_RULE_CLASS,
  SOCIAL_COMMENTS_WINDOW_THREAD_CLASS,
  SOCIAL_COMMENTS_WINDOW_WORDS_CLASS,
  SOCIAL_POST_AUTHOR_CLASS,
  SOCIAL_POST_BYLINE_CLASS,
  SOCIAL_POST_COUNT_CHIP_CLASS,
  SOCIAL_POST_GROUP_CLASS,
  SOCIAL_POST_META_CLASS,
  SOCIAL_POST_META_DOT_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_PLAY_DISC_CLASS,
  SOCIAL_POST_PLAY_DISC_GLYPH,
  SOCIAL_POST_TIME_CLASS,
} from "@/lib/social-chrome";
import { COMMENT_BODY_MAX } from "@/lib/social-comments";
import {
  SOCIAL_COMMENTS_WINDOW_IMAGE_SIZES,
  socialCommentDraftDirty,
  socialCommentsLeaveClick,
  socialCommentsVideoFrame,
  type SocialCommentsPost,
} from "@/lib/social-comments-window";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import {
  socialFeedVideoFrame,
  socialFeedVideoPosterSrc,
  socialPostPhotoAspect,
  type SocialFeedVideoFrame,
} from "@/lib/social-media-display";
import {
  loadSocialMuxPlaybackTokens,
  readSocialMuxPlaybackTokenCache,
  socialMuxPlaybackRequiresTokens,
} from "@/lib/social-mux";

import { SocialAvatar } from "./social-avatar";
import { SocialCommentRow, type SocialCommentLeave } from "./social-comment-row";
import { SocialFeedVideoPoster } from "./social-feed-video-poster";
import { SocialIcon } from "./social-icon";
import { SocialMediaImage } from "./social-media-image";
import { SocialPostCaptionPlace } from "./social-post-owner";
import type { SocialCommentThreadState } from "./use-social-comment-thread";

// Desktop Comments: the house window over the page
// (docs/design-locks/social-comments-window-lock-v1.md, phase 1), on the
// house window shell. X · Comments; the post (author, live caption, one
// still) and the thread scroll in an 80vh frame; the composer is the pinned
// foot. No Done: Post is the one action, and ⌘/Ctrl+Enter posts. X, Esc, the
// scrim and the links out ask before typed text is lost. Closing while a
// comment is sending closes at once (Q7). The phone keeps its sheet.

const ATTR = "social-comment-thread";

export function SocialCommentsWindow({
  thread,
  post,
  canComment,
  container,
  onClose,
}: {
  thread: SocialCommentThreadState;
  /** The post the thread is on (display only); absent draws the thread alone. */
  post?: SocialCommentsPost;
  canComment: boolean;
  /** The layer that owns the window (the immersive stage), else the body. */
  container?: Element | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const dirty = socialCommentDraftDirty(thread.body);
  const [win, winRefs] = useHouseWindow({
    attr: ATTR,
    face: "thread",
    indexFace: "thread",
    dirty: socialCommentDraftDirty(thread.body),
    // Posting is optimistic: nothing turns inert, and closing never waits.
    busy: false,
    holdOpen: false,
    onDone: send,
    onBack: () => undefined,
    onClose,
    onDiscard: () => thread.setBody(""),
    phone: "hidden",
  });

  // The field on open (after the shell has focused the frame).
  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: true });
  }, []);

  /** Post the field; your new comment scrolls into view. */
  function send() {
    if (!thread.submit()) return;
    window.requestAnimationFrame(() => {
      const body = winRefs.bodyRef.current;
      if (body) body.scrollTop = body.scrollHeight;
    });
  }

  // A link out shares the close path: a modified click passes, typed text
  // asks first, otherwise the window closes and the house link hops.
  const leave: SocialCommentLeave = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const next = socialCommentsLeaveClick({ modified: houseNavIgnorePendingClick(event), dirty });
    if (next === "pass") return;
    if (next === "ask") {
      event.preventDefault();
      win.ask(() => {
        onClose();
        router.push(href);
      });
      return;
    }
    onClose();
  };

  const foot = (
    <>
      {thread.error ? (
        <div className={SOCIAL_COMMENTS_WINDOW_NOTICE_CLASS}>
          <InlineNotice tone="error">{thread.error}</InlineNotice>
        </div>
      ) : null}
      {canComment ? (
        <form
          data-social-comment-composer=""
          className={SOCIAL_COMMENTS_WINDOW_COMPOSER_CLASS}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <Textarea
            ref={fieldRef}
            id={fieldId}
            name="body"
            value={thread.body}
            maxLength={COMMENT_BODY_MAX}
            rows={2}
            variant="bare"
            placeholder={SOCIAL.post.commentPlaceholder}
            aria-label={SOCIAL.post.commentPlaceholder}
            className={SOCIAL_COMMENT_FIELD_CLASS}
            onChange={(event) => thread.setBody(event.target.value)}
          />
          <button
            type="submit"
            disabled={thread.pending || !dirty}
            className={cn(SOCIAL_ACTION_CLASS, "shrink-0")}
          >
            {SOCIAL.post.commentSubmit}
          </button>
        </form>
      ) : (
        <p className={SOCIAL_COMMENTS_WINDOW_NEED_PROFILE_CLASS}>{SOCIAL.cta.needProfile}</p>
      )}
    </>
  );

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={SOCIAL.post.commentsTitle}
      motion={null}
      closeLabel={SOCIAL.create.close}
      // One face: Back is never drawn, but the shell's header takes it.
      backLabel={SOCIAL.profile.back}
      closeIcon={<SocialIcon name="x" size={SOCIAL_ICON_SIZE_HEADER} />}
      backIcon={<SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />}
      fill
      container={container}
      foot={foot}
      ask={
        <HouseWindowAsk
          attr={ATTR}
          variant="strip"
          titleId={win.askTitleId}
          title={SOCIAL.profile.discardTitle}
          lines={[]}
          keepLabel={SOCIAL.profile.discardKeep}
          discardLabel={SOCIAL.profile.discardConfirm}
          onKeep={win.keepEditing}
          onDiscard={win.discard}
        />
      }
    >
      {post ? (
        <>
          <SocialCommentsWindowPost post={post} onLeave={leave} />
          <div aria-hidden className={SOCIAL_COMMENTS_WINDOW_RULE_CLASS} />
        </>
      ) : null}
      <div data-social-comment-thread-list="" className={SOCIAL_COMMENTS_WINDOW_THREAD_CLASS}>
        {thread.loading ? null : thread.comments.length === 0 ? (
          <p data-social-comment-empty="" className="py-8 text-center t-body-sm text-ink-2">
            {SOCIAL.post.commentEmpty}
          </p>
        ) : (
          thread.comments.map((comment) => (
            <SocialCommentRow key={comment.id} comment={comment} onRemove={thread.remove} onLeave={leave} />
          ))
        )}
      </div>
    </HouseWindowFrame>
  );
}

function SocialCommentsWindowPost({ post, onLeave }: { post: SocialCommentsPost; onLeave: SocialCommentLeave }) {
  const memberHref = post.authorHandle ? socialMemberHref(post.authorHandle) : null;
  const groupHref = post.groupSlug && post.groupName ? socialGroupHref(post.groupSlug) : null;
  const avatar = (
    <SocialAvatar
      name={post.authorName}
      photoUrl={post.authorPhotoUrl}
      size="post"
      emptyClassName={SOCIAL_COMMENTS_WINDOW_AVATAR_EMPTY_CLASS}
    />
  );
  return (
    <div data-social-comment-thread-post="" className={SOCIAL_COMMENTS_WINDOW_POST_CLASS}>
      <div className={SOCIAL_COMMENTS_WINDOW_HEAD_CLASS}>
        {/* The face repeats the name link for a pointer; the name is the
            one link in the tab order and the accessibility tree. */}
        {memberHref ? (
          <HouseLink
            href={memberHref}
            tabIndex={-1}
            aria-hidden
            className={SOCIAL_POST_AUTHOR_CLASS}
            onClick={(event) => onLeave(event, memberHref)}
          >
            {avatar}
          </HouseLink>
        ) : (
          <span className={SOCIAL_POST_AUTHOR_CLASS}>{avatar}</span>
        )}
        <div className={SOCIAL_POST_BYLINE_CLASS}>
          {memberHref ? (
            <HouseLink href={memberHref} className={SOCIAL_POST_NAME_CLASS} onClick={(event) => onLeave(event, memberHref)}>
              {post.authorName}
            </HouseLink>
          ) : (
            <span className={SOCIAL_POST_NAME_CLASS}>{post.authorName}</span>
          )}
          {post.createdAt || groupHref ? (
            <span className={SOCIAL_POST_META_CLASS}>
              {/* The time in its own plain slot (phase 2 may make it the link). */}
              {post.createdAt ? (
                <span className={SOCIAL_POST_TIME_CLASS}>
                  <time dateTime={post.createdAt}>{socialFeedRelativeTime(post.createdAt)}</time>
                </span>
              ) : null}
              {groupHref ? (
                <>
                  {post.createdAt ? (
                    <span aria-hidden className={SOCIAL_POST_META_DOT_CLASS}>
                      ·
                    </span>
                  ) : null}
                  <HouseLink href={groupHref} className={SOCIAL_POST_GROUP_CLASS} onClick={(event) => onLeave(event, groupHref)}>
                    {post.groupName}
                  </HouseLink>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
      <SocialPostCaptionPlace postId={post.id} serverBody={post.body} className={SOCIAL_COMMENTS_WINDOW_WORDS_CLASS} />
      <SocialCommentsWindowStill post={post} />
    </div>
  );
}

/** One still at its true shape: the item the window was opened on. No
 *  player and no tap (a playing feed or Explore video never gets a second
 *  player, and nothing opens from the window). */
function SocialCommentsWindowStill({ post }: { post: SocialCommentsPost }) {
  const item = post.media[post.mediaIndex];
  if (!item) return null;
  const chip =
    post.media.length > 1 ? (
      <span className={SOCIAL_POST_COUNT_CHIP_CLASS}>{SOCIAL.post.carouselChip(post.mediaIndex + 1, post.media.length)}</span>
    ) : null;
  return item.kind === "video" ? (
    <SocialCommentsWindowVideoStill key={item.playbackId ?? ""} item={item} chip={chip} />
  ) : (
    <SocialCommentsWindowPhotoStill key={item.url} item={item} chip={chip} />
  );
}

function SocialCommentsWindowPhotoStill({ item, chip }: { item: SocialPostMediaItem; chip: ReactNode }) {
  // The stored shape draws first; the still's natural size, once it loads,
  // is the true shape (held to 1.91:1 … 4:5), as on the card.
  const [probed, setProbed] = useState<number | null>(null);
  const aspect = socialPostPhotoAspect(probed ? { aspect: probed } : item);
  function onLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) setProbed(naturalWidth / naturalHeight);
  }
  return (
    <div
      data-social-comment-thread-media="image"
      className={SOCIAL_COMMENTS_WINDOW_MEDIA_CLASS}
      style={{ aspectRatio: String(aspect) }}
    >
      <SocialMediaImage src={item.url} sizes={SOCIAL_COMMENTS_WINDOW_IMAGE_SIZES} loading="eager" onLoad={onLoad} />
      {chip}
    </div>
  );
}

function SocialCommentsWindowVideoStill({ item, chip }: { item: SocialPostMediaItem; chip: ReactNode }) {
  const [probed, setProbed] = useState<SocialFeedVideoFrame | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const signed = socialMuxPlaybackRequiresTokens(item.playbackPolicy);
  const cachedToken = item.playbackId ? (readSocialMuxPlaybackTokenCache(item.playbackId)?.thumbnail ?? null) : null;
  const posterSrc = socialFeedVideoPosterSrc({
    playbackId: item.playbackId,
    playbackPolicy: item.playbackPolicy,
    thumbnailToken: mintedToken ?? cachedToken,
  });
  const frame = socialCommentsVideoFrame(item, probed);

  // A signed still not in the session cache: mint it through the gated
  // route, abortable, as the feed frame does (social-post-media). A failed
  // mint leaves the grey frame.
  useEffect(() => {
    if (!signed || !item.playbackId) return undefined;
    if (readSocialMuxPlaybackTokenCache(item.playbackId)) return undefined;
    const controller = new AbortController();
    void loadSocialMuxPlaybackTokens(item.playbackId, controller.signal).then((next) => {
      if (controller.signal.aborted || !next) return;
      setMintedToken(next.thumbnail);
    });
    return () => controller.abort();
  }, [signed, item.playbackId]);

  function onPosterLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (socialFeedVideoFrame(item)) return;
    const next = socialFeedVideoFrame({
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    });
    if (next) setProbed(next);
  }

  return (
    <div data-social-comment-thread-media="video" className={SOCIAL_COMMENTS_WINDOW_MEDIA_CLASS} style={frame.style}>
      {posterSrc ? <SocialFeedVideoPoster src={posterSrc} frame={frame} onLoad={onPosterLoad} /> : null}
      {/* The play disc says "video"; there is no player here. */}
      <span aria-hidden className={SOCIAL_POST_PLAY_DISC_CLASS}>
        <SocialIcon name="play" active size={SOCIAL_POST_PLAY_DISC_GLYPH} />
      </span>
      {chip}
    </div>
  );
}
