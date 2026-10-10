"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useHouseDesktop } from "@/components/chrome/house-overlay";
import {
  HouseWindowAsk,
  HouseWindowFrame,
  useHouseWindow,
  type HouseWindowRequest,
} from "@/components/chrome/house-window";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialMediaImage } from "@/components/social/social-media-image";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { type SocialPostMediaItem } from "@/lib/social-author-post-card";
import {
  SOCIAL_POST_PLAY_DISC_CLASS,
  SOCIAL_POST_PLAY_DISC_GLYPH,
  fitSocialWriteComposeField,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { isLocalMediaPreviewSrc, socialFeedVideoPosterSrc } from "@/lib/social-media-display";
import {
  loadSocialMuxPlaybackTokens,
  readSocialMuxPlaybackTokenCache,
  socialMuxPlaybackRequiresTokens,
} from "@/lib/social-mux";
import { socialPostCaptionDirty, socialPostCaptionDone } from "@/lib/social-post-own";
import { POST_BODY_MAX, SOCIAL } from "@/lib/social";
import {
  SOCIAL_POST_CAPTION_WINDOW_MEDIA_CLASS,
  SOCIAL_POST_CAPTION_WINDOW_ROW_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_AVATAR_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_COLUMN_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS,
} from "@/lib/social-write-compose-sheet";

// Edit caption: the house window over the post
// (docs/design-locks/social-post-caption-window-lock-v1.md), on the house
// window shell (components/chrome/house-window). One face: ✕ · Edit caption
// · Done over the 40 avatar beside the caption in the composer's type, and
// the post's media under it, read-only. A phone gets the same window as the
// full AppSheet. Leaving with changes asks inside the window; Esc,
// ⌘/Ctrl+Enter, Tab, the scrim and the ask are the shell's. The one host on
// the Social layout (social-post-caption-host) opens it and saves.

const ATTR = "social-caption-edit";

export function SocialPostCaptionWindow({
  authorName,
  authorPhotoUrl,
  media,
  hasMedia,
  baseline,
  initialDraft,
  initialError,
  waiting,
  requestRef,
  onSave,
  onClose,
}: {
  authorName: string;
  authorPhotoUrl: string | null;
  /** The media the card draws (read-only here; media never changes). */
  media: readonly SocialPostMediaItem[];
  /** The stored media, as the server counts it (an empty caption is allowed). */
  hasMedia: boolean;
  /** The caption as it shows on this device when the window opens. */
  baseline: string | null;
  initialDraft: string;
  initialError: string;
  /** A save of this post is still with the server: hold until it answers. */
  waiting: boolean;
  /** The entry asks the window to close (browser Back). True when it closed. */
  requestRef: HouseWindowRequest;
  /** Done with a changed caption: show it and save in the background. */
  onSave: (body: string | null, draft: string) => void;
  /** Leave with nothing to lose (clean close, unchanged Done, after Discard). */
  onClose: () => void;
}) {
  const desktop = useHouseDesktop();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState(initialError);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  function done() {
    const next = socialPostCaptionDone(draft, baseline, hasMedia);
    if (next.kind === "invalid") {
      setError(next.error);
      fieldRef.current?.focus();
      return;
    }
    if (next.kind === "unchanged") {
      onClose();
      return;
    }
    onSave(next.body, draft);
  }

  const [win, winRefs] = useHouseWindow({
    attr: ATTR,
    face: "caption",
    indexFace: "caption",
    dirty: socialPostCaptionDirty(draft, baseline),
    busy: waiting,
    holdOpen: waiting,
    onDone: done,
    // One face: there is nothing to go back to.
    onBack: () => undefined,
    onClose,
    // The draft goes with the window.
    onDiscard: () => undefined,
    requestRef,
    phone: "sheet",
  });

  // Fit the field as it attaches: before the shell measures the height the
  // window holds, so a long caption is not held at the field's minimum.
  const attachField = useCallback((node: HTMLTextAreaElement | null) => {
    fieldRef.current = node;
    if (node) fitSocialWriteComposeField(node);
  }, []);

  // Declared after the shell's own focus (the frame): the field takes focus
  // with the caret at the end, once the window is no longer waiting.
  useEffect(() => {
    if (waiting) return;
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }, [waiting]);

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={SOCIAL.post.editTitle}
      motion={null}
      closeLabel={SOCIAL.create.close}
      backLabel={SOCIAL.profile.back}
      doneLabel={SOCIAL.profile.done}
      closeIcon={<SocialIcon name="x" size={SOCIAL_ICON_SIZE_HEADER} />}
      backIcon={<SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />}
      ask={
        <HouseWindowAsk
          attr={ATTR}
          variant={desktop ? "strip" : "sheet"}
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
      <div data-social-caption-edit-face="" className={SOCIAL_POST_CAPTION_WINDOW_ROW_CLASS}>
        <SocialAvatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          size="sm"
          className={SOCIAL_WRITE_COMPOSE_DIALOG_AVATAR_CLASS}
        />
        <div className={SOCIAL_WRITE_COMPOSE_DIALOG_COLUMN_CLASS}>
          <label className="sr-only" htmlFor={fieldId}>
            {SOCIAL.post.editTitle}
          </label>
          <Textarea
            ref={attachField}
            variant="bare"
            id={fieldId}
            data-social-caption-edit-field=""
            rows={1}
            value={draft}
            maxLength={POST_BODY_MAX}
            placeholder={SOCIAL.home.captionPlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS}
            onChange={(event) => {
              setDraft(event.target.value);
              fitSocialWriteComposeField(event.currentTarget);
              if (error) setError("");
            }}
          />
          {error ? (
            <InlineNotice tone="error" id={errorId} data-social-caption-edit-error="">
              {error}
            </InlineNotice>
          ) : null}
          {media.length > 0 ? <SocialPostCaptionMedia items={media} /> : null}
        </div>
      </div>
    </HouseWindowFrame>
  );
}

/** The post's media under the caption, at the composer's preview size, every
 *  item stacked. Read-only: no button, no player, no remove, no add. */
export function SocialPostCaptionMedia({ items }: { items: readonly SocialPostMediaItem[] }) {
  return (
    <ul data-social-caption-edit-media="" className={SOCIAL_POST_CAPTION_WINDOW_MEDIA_CLASS}>
      {items.map((item, index) => (
        <li key={`${index}-${item.playbackId ?? item.url}`}>
          {item.kind === "video" ? (
            <SocialPostCaptionVideo item={item} />
          ) : (
            <div className={SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS}>
              <SocialMediaImage src={item.url} alt={SOCIAL.home.photoKind} sizes="600px" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A video's poster with the play disc. A signed poster takes the cached
 *  token or mints one (as the card does); a clip still on this device, or
 *  one with no poster yet, shows the muted box and the disc. */
function SocialPostCaptionVideo({ item }: { item: SocialPostMediaItem }) {
  const local = isLocalMediaPreviewSrc(item.url);
  const signed = socialMuxPlaybackRequiresTokens(item.playbackPolicy);
  const [minted, setMinted] = useState<string | null>(null);
  const cached = item.playbackId ? (readSocialMuxPlaybackTokenCache(item.playbackId)?.thumbnail ?? null) : null;
  const posterSrc = local
    ? ""
    : socialFeedVideoPosterSrc({
        playbackId: item.playbackId,
        playbackPolicy: item.playbackPolicy,
        thumbnailToken: minted ?? cached,
      });

  useEffect(() => {
    if (local || !signed || !item.playbackId) return undefined;
    if (readSocialMuxPlaybackTokenCache(item.playbackId)) return undefined;
    const controller = new AbortController();
    void loadSocialMuxPlaybackTokens(item.playbackId, controller.signal).then((next) => {
      if (controller.signal.aborted || !next) return;
      setMinted(next.thumbnail);
    });
    return () => controller.abort();
  }, [local, signed, item.playbackId]);

  return (
    <div role="img" aria-label={SOCIAL.home.videoKind} className={SOCIAL_WRITE_COMPOSE_DIALOG_PREVIEW_CLASS}>
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- Mux poster is not a next/image host
        <img alt="" aria-hidden src={posterSrc} decoding="async" className="absolute inset-0 block size-full object-cover" />
      ) : null}
      <span aria-hidden className={SOCIAL_POST_PLAY_DISC_CLASS}>
        <SocialIcon name="play" active size={SOCIAL_POST_PLAY_DISC_GLYPH} />
      </span>
    </div>
  );
}
