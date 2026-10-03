"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useHouseClient } from "@/components/chrome/house-client-shell";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_CREATE_AVATAR_CLASS,
  SOCIAL_PERSON_PRIMARY_CLASS,
  SOCIAL_PERSON_SECONDARY_CLASS,
  SOCIAL_CREATE_CARD_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_STORY_STAGE_IN_CLASS,
  SOCIAL_WRITE_COMPOSE_CHROME_CLASS,
  SOCIAL_WRITE_COMPOSE_HOST_CLASS,
  SOCIAL_WRITE_COMPOSE_ROW_CLASS,
  SOCIAL_WRITE_COMPOSE_ROW_FIELD_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_CHROME_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_FORM_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_ROW_CLASS,
  bindSocialWriteComposeViewport,
  fitSocialWriteComposeField,
  SOCIAL_WRITE_COMPOSE_POST_CLASS,
  SOCIAL_WRITE_COMPOSE_PREVIEW_CLASS,
  SOCIAL_WRITE_COMPOSE_PROGRESS_FILL_CLASS,
  SOCIAL_WRITE_COMPOSE_PROGRESS_TRACK_CLASS,
  SOCIAL_WRITE_COMPOSE_X_CLASS,
} from "@/lib/social-chrome";
import {
  SOCIAL_MEDIA_ACCEPT,
  SOCIAL_MEDIA_MAX_ITEMS,
  socialMediaFrameFields,
  type SocialMediaItem,
  type SocialMediaKind,
} from "@/lib/social-media";
import { uploadSocialPostMedia } from "@/lib/social-media-upload";
import {
  commitSocialComposeMediaItem,
  composeSlotMayUpload,
  composeVideoUploadPixels,
  planSocialComposeAttach,
  SOCIAL_COMPOSE_PIXEL_WAIT_MS,
  type SocialComposeSourcePixels,
} from "@/lib/social-compose-video";
import {
  bindStoryReviewVideo,
  storyReviewFrameSeconds,
  storyReviewMediaSrc,
} from "@/lib/social-story-recorder";
import { HouseVoiceMic } from "@/components/chrome/house-voice-mic";
import { HOUSE_VOICE_FIELD_HOST_CLASS } from "@/lib/form-control";
import {
  SOCIAL_CREATE_MEDIA_ACCEPT,
  socialCreateMediaPreviewUrl,
  socialCreateMediaRows,
  socialCreateMediaStepAfterPick,
  type SocialCreateMediaStep,
} from "@/lib/social-create-media";
import { takeSocialHomeComposerMedia } from "@/lib/social-home-composer";
import { ingestSpeechLearning } from "@/lib/speech-learning";
import {
  displayHandle,
  leaveSocialWriteCompose,
  SOCIAL,
  SOCIAL_ROUTES,
  type SocialCreateKind,
} from "@/lib/social";
import {
  applyOptimisticSocialPost,
  beginSocialPostPublish,
  beginSocialPostPublishBusy,
  endSocialPostPublishBusy,
  failOptimisticSocialPost,
  persistSocialPost,
  runSocialOptimisticMutation,
} from "@/lib/social-optimistic";
import { cn } from "@/lib/cn";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SocialAvatar } from "./social-avatar";
import { SocialIcon } from "./social-icon";
import { FormError } from "./social-form-error";

function revokeBlobUrls(urls: Record<string, string>) {
  for (const url of Object.values(urls)) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}


type WriteComposeLocal = {
  localId: string;
  previewUrl: string;
  kind: SocialMediaKind;
  /** Null once the bytes are stored. 0–100 while a video is uploading. */
  progress: number | null;
  key: string | null;
};

export function SocialComposeUploadProgress({ percent }: { percent: number }) {
  const shown = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      data-social-create-upload-progress=""
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={shown}
      aria-label={SOCIAL.home.attaching}
      className={SOCIAL_WRITE_COMPOSE_PROGRESS_TRACK_CLASS}
    >
      <div className={SOCIAL_WRITE_COMPOSE_PROGRESS_FILL_CLASS} style={{ width: `${shown}%` }} />
    </div>
  );
}

export function SocialComposeVideoPreview({
  src,
  onPixels,
}: {
  src: string;
  onPixels?: (pixels: SocialComposeSourcePixels) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const onPixelsRef = useRef(onPixels);
  // Starts muted: iOS autoplays a clip only without sound.
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    onPixelsRef.current = onPixels;
  }, [onPixels]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    bindStoryReviewVideo(node, src);
    const frame = storyReviewFrameSeconds();
    // A muted loop, so a picked clip reads as video. With Reduce Motion on,
    // it plays only long enough for iOS to paint, then holds that frame.
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    node.loop = !still;
    let reported = false;
    let held = false;
    const reportPixels = () => {
      const pixels = composeVideoUploadPixels({ width: node.videoWidth, height: node.videoHeight });
      if (!pixels) return;
      reported = true;
      onPixelsRef.current?.(pixels);
    };
    // WebKit blob clips can still read 0 x 0 at loadeddata; the size shows up
    // once muted playback runs, and upload waits for it.
    // Holds once, so turning the sound on can still play the clip.
    const hold = () => {
      if (!reported) reportPixels();
      if (held || !still || !node.muted || node.videoWidth <= 0 || node.currentTime < frame) return;
      held = true;
      node.pause();
    };
    // iOS paints a blob only after muted playback, and the seek paints a
    // frame even when Low Power Mode refuses autoplay.
    const present = () => {
      reportPixels();
      if (node.currentTime < frame) {
        try {
          node.currentTime = frame;
        } catch {
          // WebKit can reject the seek until the moov is readable.
        }
      }
      void node.play().catch(() => undefined);
    };
    // The icon follows the element, including when bindStoryReviewVideo
    // re-mutes it or the system pauses audible media.
    const syncSound = () => setMuted(node.muted);
    node.addEventListener("loadedmetadata", reportPixels);
    node.addEventListener("loadeddata", present);
    node.addEventListener("timeupdate", hold);
    node.addEventListener("volumechange", syncSound);
    if (node.videoWidth > 0) reportPixels();
    if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) present();
    return () => {
      node.removeEventListener("loadedmetadata", reportPixels);
      node.removeEventListener("loadeddata", present);
      node.removeEventListener("timeupdate", hold);
      node.removeEventListener("volumechange", syncSound);
    };
  }, [src]);

  return (
    <>
      <video
        ref={ref}
        data-social-create-video=""
        src={storyReviewMediaSrc(src)}
        className="absolute inset-0 size-full object-cover"
        autoPlay
        loop
        playsInline
        muted
        preload="auto"
      />
      <button
        type="button"
        data-social-create-video-sound=""
        aria-label={muted ? SOCIAL.post.unmute : SOCIAL.post.mute}
        className={cn(
          SOCIAL_POST_ACTION_HIT_CLASS,
          "absolute left-[var(--space-2)] top-[var(--space-2)] z-10 bg-surface",
        )}
        onClick={() => {
          const node = ref.current;
          if (!node) return;
          const next = !node.muted;
          node.muted = next;
          setMuted(next);
          // Sound on is a tap, so playback with sound is allowed. Sound off
          // resumes the muted loop if the system paused it (not under Reduce
          // Motion, where loop is off and the frame stays held).
          if (!next || (node.paused && node.loop)) void node.play().catch(() => undefined);
        }}
      >
        <SocialIcon name={muted ? "speaker-slash" : "speaker-high"} size={20} />
      </button>
    </>
  );
}

function persistKeys(media: SocialMediaItem[]) {
  return media.map((item) => ({
    kind: item.kind,
    key: item.key,
    contentType: item.contentType,
    ...(item.provider === "mux" && item.playbackId
      ? {
          provider: "mux" as const,
          playbackId: item.playbackId,
          ...(item.uploadId ? { uploadId: item.uploadId } : {}),
          ...(item.assetId ? { assetId: item.assetId } : {}),
          ...(item.playbackPolicy ? { playbackPolicy: item.playbackPolicy } : {}),
        }
      : {}),
    ...(socialMediaFrameFields(item) ?? {}),
  }));
}

function publishOptimisticPost({
  body,
  media,
  previews,
  authorName,
  authorHandle,
  authorPhotoUrl,
  groupId,
  groupSlug,
  category,
  onLocalSuccess,
  onNavigate,
  onRestore,
  setError,
}: {
  body: string;
  media: SocialMediaItem[];
  previews?: Readonly<Record<string, string>>;
  authorName: string;
  authorHandle?: string | null;
  authorPhotoUrl?: string | null;
  groupId?: string;
  groupSlug?: string;
  category?: string;
  onLocalSuccess?: () => void;
  onNavigate?: () => void;
  onRestore?: () => void;
  setError: (error: string) => void;
}) {
  const started = beginSocialPostPublish({
    body,
    mediaItems: persistKeys(media),
    mediaPreview: media.flatMap((item) => {
      const url = previews?.[item.key] ?? "";
      if (!url && !item.playbackId) return [];
      return [
        {
          kind: item.kind,
          url,
          ...(item.playbackId ? { playbackId: item.playbackId } : {}),
          ...(item.playbackPolicy ? { playbackPolicy: item.playbackPolicy } : {}),
          ...(socialMediaFrameFields(item) ?? {}),
        },
      ];
    }),
    authorName,
    authorHandle,
    authorPhotoUrl,
    groupId,
    groupSlug,
    category,
  });
  if (!started.ok) {
    setError(started.error);
    return;
  }
  if (!beginSocialPostPublishBusy()) return;
  runSocialOptimisticMutation({
    apply: () => {
      applyOptimisticSocialPost(started.post);
      setError("");
      onLocalSuccess?.();
      onNavigate?.();
      return started.post.id;
    },
    persist: () => persistSocialPost(started.form),
    rollback: () => {
      failOptimisticSocialPost(started.post.id, ACCOUNT_PROFILE.saveFailed);
      endSocialPostPublishBusy();
      onRestore?.();
    },
    onError: (error) => {
      failOptimisticSocialPost(started.post.id, error);
      endSocialPostPublishBusy();
      onRestore?.();
      setError(error);
    },
    onSuccess: () => {
      endSocialPostPublishBusy();
    },
  });
}

async function uploadSocialMedia(files: ArrayLike<File> | null, current: SocialMediaItem[]) {
  return uploadSocialPostMedia(files, current, SOCIAL_MEDIA_MAX_ITEMS, "posts", {
    intent: "video",
  });
}

export function SocialPostCompose({
  groupId,
  groupSlug,
}: {
  groupId?: string;
  groupSlug?: string;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<SocialMediaItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(files: ArrayLike<File> | null) {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);
    setError("");
    setUploading(true);
    const result = await uploadSocialMedia(files, media);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.items) {
      setPreviews((current) => {
        const next = { ...current };
        result.items!.forEach((item, index) => {
          const file = chosen[index];
          if (file) next[item.key] = URL.createObjectURL(file);
        });
        return next;
      });
      setMedia((current) => [...current, ...result.items!]);
    }
  }

  return (
    <form
      data-social-post-form=""
      className="flex flex-col gap-[var(--space-3)]"
      onSubmit={(event) => {
        event.preventDefault();
        const draft = { body, media, previews };
        publishOptimisticPost({
          body,
          media,
          previews,
          authorName: SOCIAL.home.you,
          groupId,
          groupSlug,
          onLocalSuccess: () => {
            setBody("");
            setMedia([]);
            setPreviews({});
          },
          onRestore: () => {
            setBody(draft.body);
            setMedia(draft.media);
            setPreviews(draft.previews);
          },
          setError,
        });
      }}
    >
      {groupId ? <input type="hidden" name="group_id" value={groupId} /> : null}
      {groupSlug ? <input type="hidden" name="group_slug" value={groupSlug} /> : null}
      <label className="sr-only" htmlFor="social-post-body">
        {SOCIAL.home.compose}
      </label>
      <Textarea
        id="social-post-body"
        name="body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={SOCIAL.home.compose}
      />
      {media.length > 0 ? (
        <ul data-social-post-attachments="" className="flex flex-col gap-1">
          {media.map((item) => (
            <li key={item.key} className="flex items-center gap-[var(--space-2)] t-body-sm text-ink-2">
              <span>{item.kind === "video" ? SOCIAL.home.videoKind : SOCIAL.home.photoKind}</span>
              <button
                type="button"
                className={TEXT_ACTION_CLASS}
                onClick={() => setMedia((current) => current.filter((row) => row.key !== item.key))}
              >
                {SOCIAL.home.removeAttach}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-[var(--space-3)]">
        <button
          type="button"
          className={TEXT_ACTION_CLASS}
          disabled={media.length >= SOCIAL_MEDIA_MAX_ITEMS || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? SOCIAL.home.attaching : SOCIAL.home.attach}
        </button>
        <input
          ref={fileRef}
          id="social-post-media"
          type="file"
          accept={SOCIAL_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          aria-label={SOCIAL.home.attach}
          onChange={(e) => void onPick(e.target.files)}
        />
        <Button type="submit" disabled={uploading}>
          {SOCIAL.home.submit}
        </Button>
      </div>
      <FormError error={error} />
    </form>
  );
}

export function SocialCreateCompose({
  authorName = SOCIAL.home.you,
  authorHandle = null,
  authorPhotoUrl = null,
  initialKind = null,
  initialStep = null,
  presentation = "page",
  autoFocusBody = false,
  onDismiss,
}: {
  authorName?: string;
  authorHandle?: string | null;
  authorPhotoUrl?: string | null;
  initialKind?: SocialCreateKind | null;
  initialStep?: SocialCreateMediaStep | null;
  presentation?: "page" | "sheet";
  autoFocusBody?: boolean;
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const house = useHouseClient();
  const [pickedFiles, setPickedFiles] = useState(takeSocialHomeComposerMedia);
  const kind: SocialCreateKind = initialKind ?? "text";
  const [step, setStep] = useState<SocialCreateMediaStep>(() =>
    kind === "media" ? socialCreateMediaStepAfterPick(pickedFiles, initialStep) : "caption",
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(kind === "media" && pickedFiles.length > 0);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<SocialMediaItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [slotProgress, setSlotProgress] = useState<Record<string, number | null>>({});
  const [locals, setLocals] = useState<WriteComposeLocal[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef(new Map<string, AbortController>());
  const dismissedRef = useRef(new Set<string>());
  const pixelsRef = useRef(new Map<string, SocialComposeSourcePixels>());
  const pixelWaitersRef = useRef(new Map<string, Set<(pixels: SocialComposeSourcePixels | null) => void>>());
  const previewUrlsRef = useRef(previewUrls);
  const writeFormRef = useRef<HTMLFormElement>(null);
  const writeBodyRef = useRef<HTMLTextAreaElement>(null);
  const mediaRows = kind === "media" ? socialCreateMediaRows(pickedFiles) : { rows: [], error: "" };
  const formError = error || mediaRows.error;
  const mediaStep: SocialCreateMediaStep =
    kind === "media" && pickedFiles.length > 0 && mediaRows.rows.length === 0 ? "pick" : step;

  function publishComposePixels(localId: string, measured: SocialComposeSourcePixels) {
    const pixels = composeVideoUploadPixels(measured);
    if (!pixels) return;
    pixelsRef.current.set(localId, pixels);
    const waiters = pixelWaitersRef.current.get(localId);
    if (!waiters) return;
    for (const resolve of [...waiters]) resolve(pixels);
    pixelWaitersRef.current.delete(localId);
  }

  function waitForComposePixels(localId: string, signal: AbortSignal): Promise<SocialComposeSourcePixels | null> {
    const known = pixelsRef.current.get(localId);
    if (known) return Promise.resolve(known);
    if (signal.aborted || dismissedRef.current.has(localId)) return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: SocialComposeSourcePixels | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        pixelWaitersRef.current.get(localId)?.delete(finish);
        resolve(value);
      };
      const onAbort = () => finish(pixelsRef.current.get(localId) ?? null);
      const timer = window.setTimeout(() => {
        finish(pixelsRef.current.get(localId) ?? null);
      }, SOCIAL_COMPOSE_PIXEL_WAIT_MS);
      signal.addEventListener("abort", onAbort);
      const bucket = pixelWaitersRef.current.get(localId) ?? new Set();
      bucket.add(finish);
      pixelWaitersRef.current.set(localId, bucket);
      const raced = pixelsRef.current.get(localId);
      if (raced) finish(raced);
    });
  }

  useEffect(() => {
    if (presentation === "sheet") return undefined;
    const form = writeFormRef.current;
    if (!form) return undefined;
    return bindSocialWriteComposeViewport(form, () => {
      const field = writeBodyRef.current;
      if (field) fitSocialWriteComposeField(field);
    });
  }, [kind, presentation]);

  useEffect(() => {
    if (!autoFocusBody || kind !== "text") return undefined;
    writeBodyRef.current?.focus({ preventScroll: true });
    return undefined;
  }, [autoFocusBody, kind]);

  useEffect(() => {
    const controllers = uploadAbortRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
    };
  }, []);

  useEffect(() => {
    const field = writeBodyRef.current;
    if (!field) return;
    fitSocialWriteComposeField(field);
  }, [body, kind]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      revokeBlobUrls(previewUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    if (kind !== "media") return;
    const rows = socialCreateMediaRows(pickedFiles).rows;
    const needed = new Set(rows.map((row) => row.localId));
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setPreviewUrls((current) => {
        const next: Record<string, string> = {};
        for (const [id, url] of Object.entries(current)) {
          if (needed.has(id)) next[id] = url;
          else if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        }
        for (const row of rows) {
          if (next[row.localId]) continue;
          next[row.localId] = socialCreateMediaPreviewUrl(row.file);
        }
        const unchanged =
          Object.keys(next).length === Object.keys(current).length &&
          Object.keys(next).every((id) => next[id] === current[id]);
        return unchanged ? current : next;
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [kind, pickedFiles]);

  useEffect(() => {
    if (kind !== "media" || pickedFiles.length === 0) return;
    const planned = socialCreateMediaRows(pickedFiles);
    if (planned.rows.length === 0) return;
    if (!planned.rows.every((row) => row.localId in previewUrls)) return;
    const rows = planned.rows;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      const items: SocialMediaItem[] = [];
      const stored: Record<string, string> = {};
      for (const row of rows) {
        if (cancelled || controller.signal.aborted) return;
        const pixels =
          row.kind === "video" ? await waitForComposePixels(row.localId, controller.signal) : null;
        if (cancelled || controller.signal.aborted) return;
        const measured = row.kind === "video" ? composeVideoUploadPixels(pixels) : null;
        const result = await uploadSocialPostMedia([row.file], items, SOCIAL_MEDIA_MAX_ITEMS, "posts", {
          intent: "video",
          signal: controller.signal,
          onProgress:
            row.kind === "video"
              ? (progress) => {
                  const percent = progress.percent ?? 0;
                  setSlotProgress((current) => ({ ...current, [row.localId]: percent }));
                }
              : undefined,
        });
        if (cancelled || result.aborted) return;
        const uploaded = result.items?.[0];
        const item = uploaded
          ? row.kind === "video" && measured
            ? commitSocialComposeMediaItem(uploaded, measured)
            : uploaded
          : null;
        if (result.error || !item) {
          setError(result.error ?? (row.kind === "video" ? SOCIAL.home.videoPreparing : SOCIAL.home.uploadFailed));
          setUploading(false);
          return;
        }
        items.push(item);
        const url = previewUrls[row.localId];
        if (url) stored[item.key] = url;
        setSlotProgress((current) => ({ ...current, [row.localId]: null }));
      }
      if (cancelled) return;
      setPreviews(stored);
      setMedia(items);
      setUploading(false);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [kind, pickedFiles, previewUrls]);

  useEffect(() => {
    if (kind !== "media" || mediaStep !== "pick") return undefined;
    const input = fileRef.current;
    input?.click();
    function onCancel() {
      router.back();
    }
    input?.addEventListener("cancel", onCancel);
    return () => {
      input?.removeEventListener("cancel", onCancel);
    };
  }, [kind, mediaStep, router]);

  function dismissLocal(slot: WriteComposeLocal) {
    dismissedRef.current.add(slot.localId);
    uploadAbortRef.current.get(slot.localId)?.abort();
    uploadAbortRef.current.delete(slot.localId);
    pixelsRef.current.delete(slot.localId);
    URL.revokeObjectURL(slot.previewUrl);
    setLocals((current) => current.filter((row) => row.localId !== slot.localId));
    if (!slot.key) return;
    setMedia((current) => current.filter((row) => row.key !== slot.key));
    setPreviews((current) => {
      if (!slot.key || !(slot.key in current)) return current;
      const next = { ...current };
      delete next[slot.key];
      return next;
    });
  }

  async function attachWriteMedia(files: ArrayLike<File>) {
    const room = SOCIAL_MEDIA_MAX_ITEMS - media.length;
    if (room <= 0) {
      setError(SOCIAL.home.mediaLimit);
      return;
    }
    const prepared: WriteComposeLocal[] = [];
    const filesById = new Map<string, File>();
    for (const raw of Array.from(files).slice(0, room)) {
      const plan = planSocialComposeAttach(raw);
      if (!plan.ok) {
        setError(plan.error);
        continue;
      }
      const localId = crypto.randomUUID();
      filesById.set(localId, plan.file);
      prepared.push({
        localId,
        previewUrl: URL.createObjectURL(plan.file),
        kind: plan.kind,
        progress: plan.kind === "video" ? 0 : null,
        key: null,
      });
    }
    if (prepared.length === 0) return;
    setLocals((current) => [...current, ...prepared]);
    setUploading(true);
    for (const slot of prepared) {
      uploadAbortRef.current.set(slot.localId, new AbortController());
    }
    let carried = media;
    try {
      for (let index = 0; index < prepared.length; index += 1) {
        const slot = prepared[index];
        if (!slot) continue;
        const file = filesById.get(slot.localId);
        const controller = uploadAbortRef.current.get(slot.localId);
        if (
          !file ||
          dismissedRef.current.has(slot.localId) ||
          !controller ||
          !composeSlotMayUpload(controller.signal)
        ) {
          uploadAbortRef.current.delete(slot.localId);
          continue;
        }
        const result = await uploadSocialPostMedia([file], carried, SOCIAL_MEDIA_MAX_ITEMS, "posts", {
          ...(slot.kind === "video" ? { intent: "video" as const } : {}),
          signal: controller.signal,
          onProgress:
            slot.kind === "video"
              ? (progress) => {
                  const percent = progress.percent ?? 0;
                  setLocals((current) =>
                    current.map((row) =>
                      row.localId === slot.localId ? { ...row, progress: percent } : row,
                    ),
                  );
                }
              : undefined,
        });
        const stillWanted =
          uploadAbortRef.current.has(slot.localId) &&
          !dismissedRef.current.has(slot.localId) &&
          composeSlotMayUpload(controller.signal);
        if (!stillWanted || result.aborted) {
          uploadAbortRef.current.delete(slot.localId);
          continue;
        }
        const measuredNow =
          slot.kind === "video" && !result.error
            ? await waitForComposePixels(slot.localId, controller.signal)
            : null;
        uploadAbortRef.current.delete(slot.localId);
        if (dismissedRef.current.has(slot.localId)) continue;
        const uploaded = result.items?.[0];
        const item = uploaded
          ? commitSocialComposeMediaItem(uploaded, slot.kind === "video" ? measuredNow : null)
          : null;
        if (result.error || !item) {
          URL.revokeObjectURL(slot.previewUrl);
          const drop = new Set(prepared.slice(index).map((row) => row.localId));
          setLocals((current) => current.filter((row) => !drop.has(row.localId)));
          for (const rest of prepared.slice(index + 1)) {
            uploadAbortRef.current.get(rest.localId)?.abort();
            uploadAbortRef.current.delete(rest.localId);
            URL.revokeObjectURL(rest.previewUrl);
          }
          setError(result.error ?? (slot.kind === "video" ? SOCIAL.home.videoPreparing : SOCIAL.home.uploadFailed));
          break;
        }
        if (dismissedRef.current.has(slot.localId)) continue;
        carried = [...carried, item];
        setPreviews((current) => ({ ...current, [item.key]: slot.previewUrl }));
        setMedia((current) => [...current, item]);
        setLocals((current) =>
          current.map((row) =>
            row.localId === slot.localId ? { ...row, key: item.key, progress: null } : row,
          ),
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function onPick(files: ArrayLike<File> | null) {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
    if (kind === "text") {
      await attachWriteMedia(chosen);
      return;
    }
    const planned = socialCreateMediaRows(chosen);
    setPickedFiles(chosen);
    setMedia([]);
    setPreviews({});
    setSlotProgress({});
    if (planned.error) setError(planned.error);
    if (planned.rows.length === 0) {
      setUploading(false);
      setStep("pick");
      return;
    }
    setUploading(true);
    setStep("caption");
  }

  function dismissMediaRow(localId: string) {
    const row = mediaRows.rows.find((item) => item.localId === localId);
    if (!row) return;
    const next = pickedFiles.filter((_, index) => index !== row.index);
    setMedia([]);
    setPreviews({});
    setPickedFiles(next);
    if (next.length === 0) {
      setUploading(false);
      setStep("pick");
      return;
    }
    setUploading(true);
  }

  if (kind === "media" && mediaStep === "pick") {
    return (
      <div
        data-social-create-form=""
        data-social-create-kind="media"
        data-social-create-media-step="pick"
        className={SOCIAL_CREATE_CARD_CLASS}
      >
        <input
          ref={fileRef}
          type="file"
          accept={SOCIAL_CREATE_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          data-social-create-media-input=""
          aria-label={SOCIAL.create.media}
          onChange={(event) => void onPick(event.target.files)}
        />
        <FormError error={formError} />
      </div>
    );
  }

  if (kind === "text") {
    const previewSlots =
      locals.length > 0
        ? locals.map((slot) => ({
            id: slot.localId,
            kind: slot.kind,
            url: slot.previewUrl,
            progress: slot.progress,
            onRemove: () => dismissLocal(slot),
          }))
        : media.map((item) => ({
            id: item.key,
            kind: item.kind,
            url: previews[item.key] ?? "",
            progress: null as number | null,
            onRemove: () => {
              const url = previews[item.key];
              if (url) URL.revokeObjectURL(url);
              setMedia((current) => current.filter((row) => row.key !== item.key));
              setPreviews((current) => {
                if (!(item.key in current)) return current;
                const next = { ...current };
                delete next[item.key];
                return next;
              });
            },
          }));
    return (
      <form
        ref={writeFormRef}
        data-social-create-form=""
        data-social-create-kind="text"
        data-social-write-voice=""
        data-social-write-compose-presentation={presentation}
        className={cn(
          presentation === "sheet" ? SOCIAL_WRITE_COMPOSE_SHEET_FORM_CLASS : SOCIAL_WRITE_COMPOSE_HOST_CLASS,
          presentation === "sheet" ? undefined : SOCIAL_STORY_STAGE_IN_CLASS,
        )}
        onSubmit={(event) => {
          event.preventDefault();
          if (uploading) return;
          ingestSpeechLearning({
            text: body,
            source: "typed",
            workspace: "social",
          });
          publishOptimisticPost({
            body,
            media,
            previews,
            authorName,
            authorHandle,
            authorPhotoUrl,
            onNavigate: () => {
              if (onDismiss) {
                onDismiss();
                return;
              }
              router.push(SOCIAL_ROUTES.home);
            },
            setError,
          });
        }}
      >
        <div className={presentation === "sheet" ? SOCIAL_WRITE_COMPOSE_SHEET_CHROME_CLASS : SOCIAL_WRITE_COMPOSE_CHROME_CLASS}>
          <button
            type="button"
            data-social-create-dismiss=""
            aria-label={SOCIAL.create.close}
            className={SOCIAL_WRITE_COMPOSE_X_CLASS}
            onClick={() => {
              if (onDismiss) {
                onDismiss();
                return;
              }
              leaveSocialWriteCompose(
                () => house?.navigateOwned(SOCIAL_ROUTES.home) ?? false,
                () => router.push(SOCIAL_ROUTES.home),
              );
            }}
          >
            <SocialIcon name="x" size={22} className="text-ink" />
          </button>
          <button type="submit" disabled={uploading} className={SOCIAL_WRITE_COMPOSE_POST_CLASS}>
            {SOCIAL.home.submit}
          </button>
        </div>
        <div className="mt-[var(--space-2)] flex items-center gap-[var(--space-2)]" data-social-create-author="">
          <SocialAvatar name={authorName} photoUrl={authorPhotoUrl} size="sm" className="size-8" />
          <span className="min-w-0 break-words t-body font-medium text-ink">{authorName}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col pt-[var(--space-2)]">
          {previewSlots.length > 0 ? (
            <ul
              data-social-create-preview=""
              className="mt-[var(--space-2)] flex flex-col gap-[var(--space-2)]"
            >
              {previewSlots.map((slot) => (
                <li key={slot.id}>
                  <div className={SOCIAL_WRITE_COMPOSE_PREVIEW_CLASS}>
                    {slot.url && slot.kind === "video" ? (
                      <SocialComposeVideoPreview
                        src={slot.url}
                        onPixels={
                          locals.length > 0 ? (pixels) => publishComposePixels(slot.id, pixels) : undefined
                        }
                      />
                    ) : slot.url ? (
                      <Image
                        src={slot.url}
                        alt={SOCIAL.home.photoKind}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                      />
                    ) : null}
                    {slot.progress !== null ? (
                      <SocialComposeUploadProgress percent={slot.progress} />
                    ) : null}
                    <button
                      type="button"
                      aria-label={SOCIAL.home.removeAttach}
                      className={cn(
                        SOCIAL_POST_ACTION_HIT_CLASS,
                        "absolute right-[var(--space-2)] top-[var(--space-2)] z-10 bg-surface",
                      )}
                      onClick={slot.onRemove}
                    >
                      <SocialIcon name="x" size={20} className="text-ink-2" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="min-h-0 flex-1" data-social-write-stage="" />
          )}
        </div>
        <div
          className={presentation === "sheet" ? SOCIAL_WRITE_COMPOSE_SHEET_ROW_CLASS : SOCIAL_WRITE_COMPOSE_ROW_CLASS}
          data-social-write-compose-row=""
        >
          <label className="sr-only" htmlFor="social-create-body">
            {SOCIAL.home.composerPrompt}
          </label>
          <Textarea
            ref={writeBodyRef}
            variant="bare"
            id="social-create-body"
            name="body"
            rows={1}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              fitSocialWriteComposeField(e.currentTarget);
            }}
            placeholder={SOCIAL.home.composerPrompt}
            autoFocus={autoFocusBody}
            className={SOCIAL_WRITE_COMPOSE_ROW_FIELD_CLASS}
          />
          <button
            type="button"
            data-social-create-attach="library"
            aria-label={SOCIAL.home.attach}
            className={cn(SOCIAL_POST_ACTION_HIT_CLASS, "text-ink")}
            disabled={media.length >= SOCIAL_MEDIA_MAX_ITEMS || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <SocialIcon name="camera" size={SOCIAL_ICON_SIZE_POST_ACTION} className="text-ink" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={SOCIAL_MEDIA_ACCEPT}
            multiple
            className="sr-only"
            data-social-create-attach-input=""
            aria-label={SOCIAL.home.attach}
            onChange={(event) => void onPick(event.target.files)}
          />
        </div>
        <FormError error={formError} />
      </form>
    );
  }

  const mediaPostDisabled =
    uploading || media.length !== mediaRows.rows.length || mediaRows.rows.length === 0;

  return (
    <form
      data-social-create-form=""
      data-social-create-kind={kind}
      data-social-create-media-step="caption"
      className={SOCIAL_CREATE_CARD_CLASS}
      onSubmit={(event) => {
        event.preventDefault();
        if (mediaPostDisabled) return;
        ingestSpeechLearning({
          text: body,
          source: "typed",
          workspace: "social",
        });
        publishOptimisticPost({
          body,
          media,
          previews,
          authorName,
          authorHandle,
          authorPhotoUrl,
          onNavigate: () => {
            router.push(SOCIAL_ROUTES.home);
          },
          setError,
        });
      }}
    >
      <div className="flex items-center gap-3" data-social-create-author="">
        <SocialAvatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          size="sm"
          className={SOCIAL_CREATE_AVATAR_CLASS}
        />
        <span className="min-w-0">
          <span className={SOCIAL_PERSON_PRIMARY_CLASS}>{authorName}</span>
          {authorHandle ? (
            <span className={SOCIAL_PERSON_SECONDARY_CLASS}>{displayHandle(authorHandle)}</span>
          ) : null}
        </span>
      </div>
      {mediaRows.rows.length > 0 ? (
        <ul data-social-create-preview="" className="flex flex-col gap-[var(--space-2)]">
          {mediaRows.rows.map((row) => {
            const url = previewUrls[row.localId] ?? "";
            const progress = slotProgress[row.localId] ?? null;
            return (
              <li key={row.localId}>
                <div className={SOCIAL_WRITE_COMPOSE_PREVIEW_CLASS}>
                  {url && row.kind === "video" ? (
                    <SocialComposeVideoPreview
                      src={url}
                      onPixels={(pixels) => publishComposePixels(row.localId, pixels)}
                    />
                  ) : url ? (
                    <Image
                      src={url}
                      alt={SOCIAL.home.photoKind}
                      fill
                      unoptimized
                      sizes="100vw"
                      className="object-cover"
                    />
                  ) : null}
                  {progress !== null ? <SocialComposeUploadProgress percent={progress} /> : null}
                  <button
                    type="button"
                    aria-label={SOCIAL.home.removeAttach}
                    className={cn(
                      SOCIAL_POST_ACTION_HIT_CLASS,
                      "absolute right-[var(--space-2)] top-[var(--space-2)] z-10 bg-surface",
                    )}
                    onClick={() => dismissMediaRow(row.localId)}
                  >
                    <SocialIcon name="x" size={20} className="text-ink-2" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <label className="sr-only" htmlFor="social-create-body">
          {SOCIAL.create.caption}
        </label>
        <div data-social-create-dictate="" data-house-voice-host="" className={HOUSE_VOICE_FIELD_HOST_CLASS}>
          <Textarea
            variant="bare"
            id="social-create-body"
            name="body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={SOCIAL.home.captionPlaceholder}
            className="h-20 min-w-0 flex-1 px-0 py-1 placeholder:text-ink-2 md:h-24"
          />
          <HouseVoiceMic
            surface="dictate"
            workspace="social"
            getValue={() => body}
            onValue={setBody}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={mediaPostDisabled}
          className={SOCIAL_ACTION_CLASS}
        >
          {SOCIAL.home.submit}
        </button>
      </div>
      <FormError error={formError} />
    </form>
  );
}
