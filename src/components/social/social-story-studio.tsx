"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import { HouseLink } from "@/components/chrome/house-link";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SocialAvatar } from "./social-avatar";
import { SocialIcon } from "./social-icon";
import {
  createSocialStory,
  presignSocialMediaUpload,
} from "@/app/(app)/social/actions";
import { uploadSocialMuxVideoFile } from "@/lib/social-media-upload";
import {
  SOCIAL_STORY_CREATE_BACK_CLASS,
  SOCIAL_STORY_CREATE_CARDS_CLASS,
  SOCIAL_STORY_CREATE_CLOSE_CLASS,
  SOCIAL_STORY_CREATE_HOST_CLASS,
  SOCIAL_STORY_CREATE_ICON_WELL_CLASS,
  SOCIAL_STORY_CREATE_IDENTITY_CLASS,
  SOCIAL_STORY_CREATE_LABEL_CLASS,
  SOCIAL_STORY_CREATE_NAME_CLASS,
  SOCIAL_STORY_CREATE_RAIL_CLASS,
  SOCIAL_STORY_CREATE_SECONDARY_CLASS,
  SOCIAL_STORY_CREATE_SECONDARY_COLUMN_CLASS,
  SOCIAL_STORY_CREATE_STAGE_CLASS,
  SOCIAL_STORY_CREATE_TITLE_CLASS,
  SOCIAL_STORY_PHOTO_CARD_CLASS,
  SOCIAL_STORY_PICKER_ROW_CLASS,
  SOCIAL_STORY_PICKER_WELL_CLASS,
  SOCIAL_STORY_SHARE_ACTIONS_CLASS,
  SOCIAL_STORY_SHARE_POST_CLASS,
  SOCIAL_STORY_SHARE_PREVIEW_CLASS,
  SOCIAL_STORY_SHARE_RETAKE_CLASS,
  SOCIAL_STORY_VIDEO_CARD_CLASS,
  SOCIAL_STORY_CAMERA_BOTTOM_CLASS,
  SOCIAL_STORY_CAMERA_HIT_CLASS,
  SOCIAL_STORY_CAMERA_TOP_CLASS,
  SOCIAL_STORY_CAMERA_TOP_ROW_CLASS,
  SOCIAL_STORY_CAPTURE_ROW_CLASS,
  SOCIAL_STORY_GALLERY_CLASS,
  SOCIAL_STORY_MODE_LABEL_CLASS,
  SOCIAL_STORY_MODE_RAIL_CLASS,
  SOCIAL_STORY_POSTED_CTA_CLASS,
  SOCIAL_STORY_POSTED_SCRIM_CLASS,
  SOCIAL_STORY_POSTED_TITLE_CLASS,
  SOCIAL_STORY_SHUTTER_CLASS,
  SOCIAL_STORY_STUDIO_CHROME_CLASS,
  SOCIAL_STORY_STUDIO_CLASS,
  SOCIAL_STORY_STUDIO_ICON_CLASS,
  SOCIAL_STORY_STUDIO_REVIEW_CLASS,
  SOCIAL_STORY_STUDIO_STAGE_CLASS,
  socialStoryShutterFillClass,
  socialStoryStudioPreviewClass,
} from "@/lib/social-chrome";
import {
  SOCIAL_ICON_SIZE_STORY_PICKER,
  SOCIAL_ICON_SIZE_STORY_PLAY,
  SOCIAL_ICON_SIZE_STORY_STUDIO,
} from "@/lib/social-icons";
import {
  SOCIAL_IMAGE_MAX_BYTES,
  SOCIAL_VIDEO_CONTENT_TYPES,
  SOCIAL_VIDEO_MAX_BYTES,
  readStoryInputPick,
  socialMediaKindFor,
  storyImageAccept,
  storyPickFile,
  type SocialMediaContentType,
  type SocialMediaItem,
  type SocialMediaKind,
  type SocialVideoContentType,
} from "@/lib/social-media";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import {
  formatStoryRecorderClock,
  nextStoryStudioLive,
  bindStoryReviewVideo,
  cloneStoryUploadFile,
  probeStoryRecorderMimeType,
  resolveStoryRecorderBlobType,
  storyRecorderFileName,
  storyRecorderHoldMs,
  storyRecorderStopFlushMs,
  storyRecorderTimesliceMs,
  storyReviewArmMs,
  storyReviewFrameSeconds,
  storyReviewMediaSrc,
  prepareStoryUploadFile,
  setStoryCameraTorch,
  storyCameraSupportsTorch,
  storyRecorderVideoConstraints,
  storyUploadNotice,
  storyStoreNotice,
  storyVideoInputCount,
  captureStoryStillFrame,
  storyStudioIsLive,
  type StoryStillCanvas,
  storyStudioMirrorsPreview,
  type StoryStudioFacing,
} from "@/lib/social-story-recorder";

type StudioPhase = "stage" | "photo" | "video" | "preview" | "recording" | "review" | "posted";

type ReviewClip = {
  file: File;
  url: string;
  contentType: SocialMediaContentType;
  kind: SocialMediaKind;
};

// One posted face for Upload and Record. Media stays on the studio host.
// docs/design-locks/stories-upload-success-immersive-lock-v1.md
export function SocialStoryPostedConfirm({
  url,
  kind,
}: {
  url: string;
  kind: SocialMediaKind;
}) {
  return (
    <div
      data-social-story-posted=""
      data-social-story-studio="posted"
      className={SOCIAL_STORY_STUDIO_CLASS}
    >
      <div className={SOCIAL_STORY_STUDIO_STAGE_CLASS}>
        {kind === "video" ? (
          <video
            data-social-story-posted-media=""
            src={url}
            playsInline
            muted
            loop
            autoPlay
            className={SOCIAL_STORY_STUDIO_REVIEW_CLASS}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local blob before leaving the confirm
          <img
            data-social-story-posted-media=""
            src={url}
            alt=""
            className={SOCIAL_STORY_STUDIO_REVIEW_CLASS}
          />
        )}
        <div className={SOCIAL_STORY_STUDIO_CHROME_CLASS}>
          <HouseLink
            href={SOCIAL_ROUTES.home}
            aria-label={SOCIAL.stories.close}
            className={SOCIAL_STORY_STUDIO_ICON_CLASS}
          >
            <SocialIcon weight="bold" name="x" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
          </HouseLink>
          <p className={SOCIAL_STORY_POSTED_TITLE_CLASS}>{SOCIAL.stories.posted}</p>
          <span className="size-10" />
        </div>
        <div className={SOCIAL_STORY_POSTED_SCRIM_CLASS}>
          <HouseLink href={SOCIAL_ROUTES.home} data-social-story-view="" className={SOCIAL_STORY_POSTED_CTA_CLASS}>
            {SOCIAL.stories.viewStories}
          </HouseLink>
        </div>
      </div>
    </div>
  );
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function uploadStoryMedia(
  file: File,
  signal?: AbortSignal,
): Promise<{ item?: SocialMediaItem; error?: string }> {
  const kindHint = file.type.split(";")[0]?.trim().toLowerCase().startsWith("image/") ? "image" : "video";
  const prepared = prepareStoryUploadFile(file);
  if (prepared === "missing") return { error: storyUploadNotice("missing", kindHint) };
  if (prepared === "type") return { error: storyUploadNotice("type", kindHint) };
  const kind = socialMediaKindFor(prepared.type);
  if (kind === "video") {
    const uploaded = await uploadSocialMuxVideoFile(prepared, { lane: "stories", signal });
    if (signal?.aborted) return {};
    if (!uploaded.item?.playbackId) return { error: uploaded.error ?? storyStoreNotice("presign") };
    return { item: uploaded.item };
  }
  const body = new FormData();
  body.set("content_type", prepared.type);
  body.set("byte_length", String(prepared.size));
  body.set("lane", "stories");
  let signed: Awaited<ReturnType<typeof presignSocialMediaUpload>>;
  try {
    signed = await presignSocialMediaUpload(body);
  } catch (error) {
    console.error("story-put", "presign", error);
    return { error: storyStoreNotice("presign") };
  }
  if (signed.error) return { error: signed.error };
  if (!signed.url || !signed.key || !signed.kind || !signed.contentType) {
    console.error("story-put", "presign", "missing-url");
    return { error: storyStoreNotice("presign") };
  }
  try {
    const put = await fetch(signed.url, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType },
      body: prepared,
      signal,
    });
    if (!put.ok) {
      console.error("story-put", put.status, put.statusText, await put.text());
      return { error: storyStoreNotice("reject") };
    }
    if (kind !== "image") return { error: storyUploadNotice("type", kindHint) };
    return {
      item: {
        kind,
        key: signed.key,
        contentType: signed.contentType as SocialMediaContentType,
      },
    };
  } catch (error) {
    if (signal?.aborted) return {};
    console.error("story-put", error);
    return { error: storyStoreNotice("network") };
  }
}

export function SocialStoryCompose({
  displayName = SOCIAL.stories.you,
  photoUrl = null,
}: {
  displayName?: string;
  photoUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const stillRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartedRef = useRef(0);
  const clockStartedRef = useRef(0);
  const clockTimerRef = useRef<number | null>(null);
  const mimeRef = useRef<SocialVideoContentType>("video/webm");
  const recordingRef = useRef(false);
  const clipUrlRef = useRef<string | null>(null);
  const liveRef = useRef(0);
  const postRef = useRef(0);
  const postingRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const reviewArmRef = useRef(0);

  const [phase, setPhase] = useState<StudioPhase>("stage");
  const [still, setStill] = useState(false);
  const [facing, setFacing] = useState<StoryStudioFacing>("user");
  const [error, setError] = useState("");
  const [clock, setClock] = useState("0:00");
  const [clip, setClip] = useState<ReviewClip | null>(null);
  const [playing, setPlaying] = useState(false);
  const [posting, setPosting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchReady, setTorchReady] = useState(false);
  const [canFlip, setCanFlip] = useState(true);

  function setStillMode(next: boolean) {
    stillRef.current = next;
    setStill(next);
  }

  function clearHold() {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearClock() {
    if (clockTimerRef.current != null) {
      window.clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
    setClock("0:00");
  }

  function releasePreview() {
    liveRef.current = nextStoryStudioLive(liveRef.current);
    recordingRef.current = false;
    clearHold();
    clearClock();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // already stopped
        }
      }
    }
    recorderRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function releaseClip() {
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    clipUrlRef.current = null;
    setClip(null);
    setPlaying(false);
  }

  useEffect(() => {
    return () => {
      postRef.current = nextStoryStudioLive(postRef.current);
      uploadAbortRef.current?.abort();
      releasePreview();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    };
    // Unmount-only teardown. Live refs hold the current stream / recorder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "review") {
      stopStream(streamRef.current);
      streamRef.current = null;
      const liveNode = videoRef.current;
      if (liveNode) {
        liveNode.pause();
        liveNode.srcObject = null;
      }
      if (clip?.kind === "video" && clip.url) bindStoryReviewVideo(reviewRef.current, clip.url);
      return;
    }
    const node = videoRef.current;
    const stream = streamRef.current;
    if (!node || !stream) return;
    if (phase !== "preview" && phase !== "recording") return;
    node.srcObject = stream;
    node.muted = true;
    node.playsInline = true;
    void node.play().catch(() => undefined);
  }, [phase, clip]);

  async function acquireStream(nextFacing: StoryStudioFacing, audio: boolean): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(SOCIAL.stories.unavailable);
    }
    const video = storyRecorderVideoConstraints(nextFacing);
    if (!audio) return navigator.mediaDevices.getUserMedia({ video, audio: false });
    try {
      return await navigator.mediaDevices.getUserMedia({ video, audio: true });
    } catch {
      return navigator.mediaDevices.getUserMedia({ video, audio: false });
    }
  }

  async function attachPreview(nextFacing: StoryStudioFacing, live: number) {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const stream = await acquireStream(nextFacing, !stillRef.current);
    if (!storyStudioIsLive(liveRef.current, live)) {
      stopStream(stream);
      return false;
    }
    streamRef.current = stream;
    const node = videoRef.current;
    if (node) {
      node.srcObject = stream;
      node.muted = true;
      node.playsInline = true;
      await node.play().catch(() => undefined);
    }
    await refreshCameraChrome();
    return true;
  }

  async function refreshCameraChrome() {
    const track = streamRef.current?.getVideoTracks()[0];
    setTorchReady(storyCameraSupportsTorch(track));
    setTorchOn(false);
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCanFlip(storyVideoInputCount(devices) !== 1);
    } catch {
      setCanFlip(true);
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!storyCameraSupportsTorch(track)) {
      setTorchReady(false);
      setTorchOn(false);
      return;
    }
    const next = !torchOn;
    const lit = await setStoryCameraTorch(track, next);
    if (!lit) {
      setTorchReady(false);
      setTorchOn(false);
      return;
    }
    setTorchOn(next);
  }

  function openRoll() {
    if (recordingRef.current) return;
    if (stillRef.current) photoLibraryRef.current?.click();
    else fileRef.current?.click();
  }

  async function openStudio() {
    setError("");
    setStillMode(false);
    const probed = probeStoryRecorderMimeType(
      typeof MediaRecorder !== "undefined" ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : undefined,
    );
    if (!probed || typeof MediaRecorder === "undefined") {
      setError(SOCIAL.stories.unavailable);
      return;
    }
    mimeRef.current = probed.mimeType;
    const live = nextStoryStudioLive(liveRef.current);
    liveRef.current = live;
    setPhase("preview");
    try {
      const opened = await attachPreview(facing, live);
      if (!opened && storyStudioIsLive(liveRef.current, live)) {
        setPhase("video");
      }
    } catch {
      if (!storyStudioIsLive(liveRef.current, live)) return;
      releasePreview();
      setPhase("video");
      setError(SOCIAL.stories.permission);
    }
  }

  async function flipCamera() {
    if (phase !== "preview" || recordingRef.current) return;
    const next = facing === "user" ? "environment" : "user";
    const live = liveRef.current;
    try {
      const flipped = await attachPreview(next, live);
      if (flipped) setFacing(next);
    } catch {
      if (!storyStudioIsLive(liveRef.current, live)) return;
      try {
        await attachPreview(facing, live);
      } catch {
        setError(SOCIAL.stories.permission);
      }
    }
  }

  function startClock() {
    clockStartedRef.current = Date.now();
    clearClock();
    setClock("0:00");
    clockTimerRef.current = window.setInterval(() => {
      setClock(formatStoryRecorderClock(Date.now() - clockStartedRef.current));
    }, 250);
  }

  function startRecording() {
    const stream = streamRef.current;
    const probed = probeStoryRecorderMimeType(
      typeof MediaRecorder !== "undefined" ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : undefined,
    );
    if (!stream || !probed) {
      setError(SOCIAL.stories.unavailable);
      return;
    }
    // A pending seal from the previous take must not read this take's chunks.
    const live = nextStoryStudioLive(liveRef.current);
    liveRef.current = live;
    mimeRef.current = probed.mimeType;
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: probed.raw });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        setError(SOCIAL.stories.unavailable);
        return;
      }
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      // WebKit can emit the last chunk after onstop. Seal only after that flush.
      window.setTimeout(() => sealRecording(live), storyRecorderStopFlushMs());
    };
    const slice = storyRecorderTimesliceMs();
    if (slice == null) recorder.start();
    else recorder.start(slice);
    recorderRef.current = recorder;
    recordingRef.current = true;
    startClock();
    setPhase("recording");
  }

  function releaseLiveCamera() {
    const recorder = recorderRef.current;
    const recorderStream = recorder?.stream ?? null;
    if (recorder && recorder.state === "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorderRef.current = null;
    }
    const node = videoRef.current;
    if (node) {
      try {
        node.pause();
      } catch {
        // The live element may already be paused.
      }
      node.srcObject = null;
    }
    stopStream(recorderStream);
    stopStream(streamRef.current);
    streamRef.current = null;
  }

  function sealRecording(live: number) {
    if (!storyStudioIsLive(liveRef.current, live)) return;
    const contentType = resolveStoryRecorderBlobType(
      chunksRef.current[0] instanceof Blob ? chunksRef.current[0].type : mimeRef.current,
      mimeRef.current,
    );
    const blob = new Blob(chunksRef.current, { type: contentType });
    if (blob.size <= 0) {
      releaseLiveCamera();
      setError(SOCIAL.stories.mediaMissing);
      setPhase("video");
      return;
    }
    let file: File;
    try {
      file = new File([blob], storyRecorderFileName(contentType), { type: contentType });
    } catch {
      releaseLiveCamera();
      setError(storyUploadNotice("read"));
      setPhase("video");
      return;
    }
    // Release the camera before the review element mounts. iOS will not
    // paint a second video while the capture track is still live, and the
    // green indicator stays on until the element drops the stream.
    releaseLiveCamera();
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    const url = URL.createObjectURL(file);
    clipUrlRef.current = url;
    setClip({ file, url, contentType, kind: "video" });
    setPlaying(false);
    setError("");
    reviewArmRef.current = Date.now();
    setPhase("review");
  }

  function stopRecording() {
    clearHold();
    clearClock();
    recordingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function onRecordPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (recordingRef.current) {
      stopRecording();
      return;
    }
    holdStartedRef.current = Date.now();
    startRecording();
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
    }, storyRecorderHoldMs());
  }

  function onRecordPointerUp() {
    const held = Date.now() - holdStartedRef.current;
    clearHold();
    if (recordingRef.current && held >= storyRecorderHoldMs()) {
      stopRecording();
    }
  }

  function closeStudio() {
    postRef.current = nextStoryStudioLive(postRef.current);
    uploadAbortRef.current?.abort();
    postingRef.current = false;
    setPosting(false);
    const photo = stillRef.current;
    releasePreview();
    releaseClip();
    setStillMode(false);
    setPhase(photo ? "photo" : "video");
  }

  async function openPhotoCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(SOCIAL.stories.photoUnavailable);
      return;
    }
    setStillMode(true);
    const live = nextStoryStudioLive(liveRef.current);
    liveRef.current = live;
    setPhase("preview");
    try {
      const opened = await attachPreview(facing, live);
      if (!opened && storyStudioIsLive(liveRef.current, live)) {
        setStillMode(false);
        setPhase("photo");
      }
    } catch {
      if (!storyStudioIsLive(liveRef.current, live)) return;
      releasePreview();
      setStillMode(false);
      setPhase("photo");
      setError(SOCIAL.stories.photoPermission);
    }
  }

  async function takeStill() {
    const live = liveRef.current;
    const node = videoRef.current;
    if (!node || !stillRef.current) {
      setError(SOCIAL.stories.photoMissing);
      return;
    }
    if (node.videoWidth <= 0) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        node.addEventListener("loadeddata", done, { once: true });
        window.setTimeout(done, 800);
      });
    }
    if (!storyStudioIsLive(liveRef.current, live)) return;
    const current = videoRef.current;
    if (!current) {
      setError(SOCIAL.stories.photoMissing);
      return;
    }
    const file = await captureStoryStillFrame(current, document.createElement("canvas") as StoryStillCanvas);
    if (!storyStudioIsLive(liveRef.current, live)) return;
    if (!file) {
      setError(SOCIAL.stories.photoMissing);
      return;
    }
    releasePreview();
    setStillMode(false);
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    const url = URL.createObjectURL(file);
    clipUrlRef.current = url;
    setClip({
      file,
      url,
      contentType: file.type as SocialMediaContentType,
      kind: "image",
    });
    setPlaying(false);
    setError("");
    reviewArmRef.current = Date.now();
    setPhase("review");
  }

  function retake() {
    if (posting) return;
    if (Date.now() - reviewArmRef.current < storyReviewArmMs()) return;
    const image = clip?.kind === "image";
    postRef.current = nextStoryStudioLive(postRef.current);
    releaseClip();
    setError("");
    if (image) {
      setPhase("photo");
      return;
    }
    setPhase("preview");
    if (streamRef.current) return;
    const live = liveRef.current;
    void attachPreview(facing, live).catch(() => {
      if (!storyStudioIsLive(liveRef.current, live)) return;
      setError(SOCIAL.stories.permission);
      setPhase("video");
    });
  }

  function onPick(expected: SocialMediaKind, input: HTMLInputElement | null) {
    const picked = input ? readStoryInputPick(input) : null;
    if (!picked) return;
    setError("");
    const resolved = storyPickFile(picked);
    if (!resolved || resolved.kind !== expected) {
      setError(expected === "image" ? SOCIAL.stories.photoMediaType : SOCIAL.stories.mediaType);
      return;
    }
    const file = resolved.file;
    if (file.size <= 0) {
      setError(expected === "image" ? SOCIAL.stories.photoMissing : SOCIAL.stories.mediaMissing);
      return;
    }
    const max = expected === "image" ? SOCIAL_IMAGE_MAX_BYTES : SOCIAL_VIDEO_MAX_BYTES;
    if (file.size > max) {
      setError(SOCIAL.home.mediaTooLarge);
      return;
    }
    releasePreview();
    // A photo-camera gallery pick leaves still latched. The video file
    // input stays unmounted while still is on, so a later Upload does nothing.
    setStillMode(false);
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    const url = URL.createObjectURL(file);
    clipUrlRef.current = url;
    setClip({
      file,
      url,
      contentType: resolved.contentType,
      kind: resolved.kind,
    });
    setPlaying(false);
    // Library pick has no shutter ghost-click. Post can run on the next click.
    reviewArmRef.current = 0;
    setPhase("review");
  }

  function restoreReviewPlayback(objectUrl: string) {
    bindStoryReviewVideo(reviewRef.current, objectUrl);
  }

  function playReview() {
    if (postingRef.current) return;
    const url = clipUrlRef.current;
    const node = reviewRef.current;
    if (!url || !node) {
      setError(SOCIAL.stories.mediaMissing);
      return;
    }
    const mediaSrc = storyReviewMediaSrc(url);
    if (node.getAttribute("src") !== mediaSrc && node.src !== mediaSrc) {
      bindStoryReviewVideo(node, url);
    }
    node.muted = false;
    void node.play().catch(() => undefined);
  }

  async function postClip() {
    if (posting || postingRef.current) return;
    if (Date.now() - reviewArmRef.current < storyReviewArmMs()) return;
    if (!clip?.file || clip.file.size <= 0) {
      setError(clip?.kind === "image" ? SOCIAL.stories.photoMissing : SOCIAL.stories.mediaMissing);
      return;
    }
    const postId = nextStoryStudioLive(postRef.current);
    postRef.current = postId;
    const objectUrl = clip.url;
    const uploadAbort = new AbortController();
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = uploadAbort;
    setError("");
    postingRef.current = true;
    setPosting(true);
    const reviewNode = reviewRef.current;
    if (reviewNode) {
      reviewNode.pause();
      reviewNode.srcObject = null;
      reviewNode.removeAttribute("src");
      reviewNode.load();
    }
    try {
      let body: File;
      try {
        body = await cloneStoryUploadFile(clip.file);
      } catch {
        if (!storyStudioIsLive(postRef.current, postId)) return;
        setError(storyUploadNotice("read"));
        restoreReviewPlayback(objectUrl);
        return;
      }
      if (!storyStudioIsLive(postRef.current, postId)) return;
      if (body.size <= 0) {
        setError(storyUploadNotice("missing", clip.kind));
        restoreReviewPlayback(objectUrl);
        return;
      }
      const uploaded = await uploadStoryMedia(body, uploadAbort.signal);
      if (!storyStudioIsLive(postRef.current, postId) || uploadAbort.signal.aborted) return;
      if (uploaded.error || !uploaded.item) {
        setError(uploaded.error ?? SOCIAL.home.uploadFailed);
        restoreReviewPlayback(objectUrl);
        return;
      }
      const form = new FormData();
      form.set("media", JSON.stringify([uploaded.item]));
      const result = await createSocialStory(form);
      if (!storyStudioIsLive(postRef.current, postId)) return;
      if (result?.error) {
        setError(result.error);
        restoreReviewPlayback(objectUrl);
        return;
      }
      releasePreview();
      setPhase("posted");
    } catch {
      if (!storyStudioIsLive(postRef.current, postId)) return;
      setError(storyUploadNotice("store"));
      restoreReviewPlayback(objectUrl);
    } finally {
      if (storyStudioIsLive(postRef.current, postId)) {
        postingRef.current = false;
        setPosting(false);
      }
    }
  }

  const accept = SOCIAL_VIDEO_CONTENT_TYPES.join(",");
  const photoAccept = storyImageAccept();
  const videoStudio =
    phase === "preview" ||
    phase === "recording" ||
    (phase === "review" && clip?.kind === "video");
  const postedStudio = phase === "posted" && clip != null;
  const immersive = videoStudio || postedStudio;

  return (
    <div data-social-story-compose="" className={immersive ? undefined : SOCIAL_STORY_CREATE_HOST_CLASS}>
      {immersive ? null : (
        <>
          <aside data-social-story-rail="" className={SOCIAL_STORY_CREATE_RAIL_CLASS}>
            <HouseLink
              href={SOCIAL_ROUTES.home}
              data-social-story-close=""
              aria-label={SOCIAL.stories.close}
              className={SOCIAL_STORY_CREATE_CLOSE_CLASS}
            >
              <SocialIcon weight="bold" name="x" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
            </HouseLink>
            <h2 className={SOCIAL_STORY_CREATE_TITLE_CLASS}>{SOCIAL.stories.yourStory}</h2>
            <div className={SOCIAL_STORY_CREATE_IDENTITY_CLASS}>
              <SocialAvatar name={displayName} photoUrl={photoUrl} size="sm" className="size-10" />
              <p className={SOCIAL_STORY_CREATE_NAME_CLASS}>{displayName}</p>
            </div>
          </aside>
          <div
            data-social-story-stage=""
            data-social-story-face={phase}
            className={SOCIAL_STORY_CREATE_STAGE_CLASS}
          >
            {phase === "stage" ? (
              <div className={SOCIAL_STORY_CREATE_CARDS_CLASS}>
                <button
                  type="button"
                  data-social-story-photo=""
                  className={SOCIAL_STORY_PHOTO_CARD_CLASS}
                  onClick={() => {
                    setError("");
                    setPhase("photo");
                  }}
                >
                  <span className={SOCIAL_STORY_CREATE_ICON_WELL_CLASS}>
                    <SocialIcon weight="bold" name="image" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                  </span>
                  <span className={SOCIAL_STORY_CREATE_LABEL_CLASS}>{SOCIAL.stories.photoCard}</span>
                </button>
                <button
                  type="button"
                  data-social-story-video=""
                  className={SOCIAL_STORY_VIDEO_CARD_CLASS}
                  onClick={() => {
                    setError("");
                    setPhase("video");
                  }}
                >
                  <span className={SOCIAL_STORY_CREATE_ICON_WELL_CLASS}>
                    <SocialIcon weight="bold" name="video-camera" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                  </span>
                  <span className={SOCIAL_STORY_CREATE_LABEL_CLASS}>{SOCIAL.stories.videoCard}</span>
                </button>
              </div>
            ) : null}

            {phase === "photo" ? (
              <div className={SOCIAL_STORY_CREATE_SECONDARY_CLASS}>
                <div className={SOCIAL_STORY_CREATE_SECONDARY_COLUMN_CLASS}>
                  <button
                    type="button"
                    data-social-story-back=""
                    className={SOCIAL_STORY_CREATE_BACK_CLASS}
                    onClick={() => {
                      setError("");
                      setPhase("stage");
                    }}
                  >
                    {SOCIAL.stories.back}
                  </button>
                  <h2 className="t-heading text-ink">{SOCIAL.stories.photoCard}</h2>
                  <button
                    type="button"
                    data-social-story-photo-capture=""
                    className={SOCIAL_STORY_PICKER_ROW_CLASS}
                    onClick={() => void openPhotoCamera()}
                  >
                    <span className={SOCIAL_STORY_PICKER_WELL_CLASS}>
                      <SocialIcon weight="bold" name="camera" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                    </span>
                    <span className="min-w-0">
                      <span className="block t-body font-semibold text-ink whitespace-normal break-words">
                        {SOCIAL.stories.photoCapture}
                      </span>
                      <span className="block t-body-sm text-ink-2 whitespace-normal break-words">
                        {SOCIAL.stories.photoCaptureHint}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    data-social-story-photo-library=""
                    className={SOCIAL_STORY_PICKER_ROW_CLASS}
                    onClick={() => photoLibraryRef.current?.click()}
                  >
                    <span className={SOCIAL_STORY_PICKER_WELL_CLASS}>
                      <SocialIcon weight="bold" name="image" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                    </span>
                    <span className="min-w-0">
                      <span className="block t-body font-semibold text-ink whitespace-normal break-words">
                        {SOCIAL.stories.photoLibrary}
                      </span>
                      <span className="block t-body-sm text-ink-2 whitespace-normal break-words">
                        {SOCIAL.stories.photoLibraryHint}
                      </span>
                    </span>
                  </button>
                  {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
                </div>
              </div>
            ) : null}

            {phase === "video" ? (
              <div className={SOCIAL_STORY_CREATE_SECONDARY_CLASS}>
                <div className={SOCIAL_STORY_CREATE_SECONDARY_COLUMN_CLASS}>
                  <button
                    type="button"
                    data-social-story-back=""
                    className={SOCIAL_STORY_CREATE_BACK_CLASS}
                    onClick={() => {
                      setError("");
                      setPhase("stage");
                    }}
                  >
                    {SOCIAL.stories.back}
                  </button>
                  <h2 className="t-heading text-ink">{SOCIAL.stories.videoCard}</h2>
                  <button
                    type="button"
                    data-social-story-record=""
                    className={SOCIAL_STORY_PICKER_ROW_CLASS}
                    onClick={() => void openStudio()}
                  >
                    <span className={SOCIAL_STORY_PICKER_WELL_CLASS}>
                      <SocialIcon weight="bold" name="video-camera" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                    </span>
                    <span className="min-w-0">
                      <span className="block t-body font-semibold text-ink whitespace-normal break-words">
                        {SOCIAL.stories.record}
                      </span>
                      <span className="block t-body-sm text-ink-2 whitespace-normal break-words">
                        {SOCIAL.stories.recordHint}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    data-social-story-upload=""
                    className={SOCIAL_STORY_PICKER_ROW_CLASS}
                    onClick={() => fileRef.current?.click()}
                  >
                    <span className={SOCIAL_STORY_PICKER_WELL_CLASS}>
                      <SocialIcon weight="bold" name="upload-simple" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                    </span>
                    <span className="min-w-0">
                      <span className="block t-body font-semibold text-ink whitespace-normal break-words">
                        {SOCIAL.stories.upload}
                      </span>
                      <span className="block t-body-sm text-ink-2 whitespace-normal break-words">
                        {SOCIAL.stories.uploadHint}
                      </span>
                    </span>
                  </button>
                  {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
                </div>
              </div>
            ) : null}

            {phase === "review" && clip?.kind === "image" ? (
              <div className={SOCIAL_STORY_CREATE_SECONDARY_CLASS}>
                <div className={SOCIAL_STORY_CREATE_SECONDARY_COLUMN_CLASS}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob before the story share */}
                  <img
                    data-social-story-photo-preview=""
                    src={clip.url}
                    alt={SOCIAL.stories.photoCard}
                    className={SOCIAL_STORY_SHARE_PREVIEW_CLASS}
                  />
                  <div className={SOCIAL_STORY_SHARE_ACTIONS_CLASS}>
                    <button
                      type="button"
                      data-social-story-retake=""
                      disabled={posting}
                      className={SOCIAL_STORY_SHARE_RETAKE_CLASS}
                      onClick={retake}
                    >
                      {SOCIAL.stories.retake}
                    </button>
                    <button
                      type="button"
                      data-social-story-post=""
                      disabled={posting}
                      className={SOCIAL_STORY_SHARE_POST_CLASS}
                      onClick={() => void postClip()}
                    >
                      {posting ? SOCIAL.stories.posting : SOCIAL.stories.post}
                    </button>
                  </div>
                  {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {videoStudio ? (
        <div
          data-social-story-studio={phase}
          data-social-story-capture={still ? "photo" : "video"}
          className={SOCIAL_STORY_STUDIO_CLASS}
        >
          <div className={SOCIAL_STORY_STUDIO_STAGE_CLASS}>
            {phase === "review" && clip ? (
              <video
                key="story-review"
                ref={reviewRef}
                data-social-story-video=""
                src={storyReviewMediaSrc(clip.url)}
                playsInline
                muted
                preload="auto"
                className={SOCIAL_STORY_STUDIO_REVIEW_CLASS}
                onLoadedData={(event) => {
                  const node = event.currentTarget;
                  if (node.currentTime < storyReviewFrameSeconds()) {
                    try {
                      node.currentTime = storyReviewFrameSeconds();
                    } catch {
                      // WebKit can reject the seek until the moov is readable.
                    }
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            ) : (
              <video
                key="story-live"
                ref={videoRef}
                data-social-story-preview=""
                data-social-story-preview-facing={facing}
                autoPlay
                muted
                playsInline
                className={socialStoryStudioPreviewClass(storyStudioMirrorsPreview(facing))}
              />
            )}

            {phase === "review" ? (
              <div className={SOCIAL_STORY_STUDIO_CHROME_CLASS}>
                <button
                  type="button"
                  aria-label={SOCIAL.stories.close}
                  className={SOCIAL_STORY_STUDIO_ICON_CLASS}
                  disabled={posting}
                  onClick={closeStudio}
                >
                  <SocialIcon weight="bold" name="x" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
                </button>
                <p className="t-body-sm font-semibold text-band-ink">{SOCIAL.stories.review}</p>
                <span className="size-10" />
              </div>
            ) : (
              <div className={SOCIAL_STORY_CAMERA_TOP_CLASS}>
                <div className={SOCIAL_STORY_CAMERA_TOP_ROW_CLASS}>
                <button
                  type="button"
                  data-social-story-camera-close=""
                  aria-label={SOCIAL.stories.close}
                  className={SOCIAL_STORY_CAMERA_HIT_CLASS}
                  onClick={closeStudio}
                >
                  <SocialIcon weight="bold" name="x" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
                </button>
                <p className="text-center t-body-sm font-semibold text-band-ink">
                  {phase === "recording" ? clock : null}
                </p>
                {torchReady ? (
                  <button
                    type="button"
                    data-social-story-flash=""
                    aria-label={SOCIAL.stories.flash}
                    aria-pressed={torchOn}
                    className={`${SOCIAL_STORY_CAMERA_HIT_CLASS} justify-self-end`}
                    onClick={() => void toggleTorch()}
                  >
                    <SocialIcon weight="bold" name="lightning" active={torchOn} size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
                  </button>
                ) : (
                  <span className={SOCIAL_STORY_CAMERA_HIT_CLASS} aria-hidden />
                )}
                </div>
              </div>
            )}

            {phase === "review" && !playing ? (
              <button
                type="button"
                data-social-story-play=""
                aria-label={SOCIAL.stories.play}
                disabled={posting}
                className="absolute left-1/2 top-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-band-ink/20 text-band-ink"
                onClick={playReview}
              >
                <SocialIcon weight="bold" name="play" size={SOCIAL_ICON_SIZE_STORY_PLAY} />
              </button>
            ) : null}

            {phase === "review" ? (
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-band/80 to-transparent px-6 pb-10 pt-6">
                <p className="t-label text-band-ink/50">{SOCIAL.stories.trimLater}</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    data-social-story-retake=""
                    disabled={posting}
                    className="inline-flex items-center justify-center rounded-full border border-band-ink/35 bg-band-ink/12 px-6 py-3.5 t-body-sm font-semibold text-band-ink"
                    onClick={retake}
                  >
                    {SOCIAL.stories.retake}
                  </button>
                  <button
                    type="button"
                    data-social-story-post=""
                    disabled={posting}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-3.5 t-body-sm font-semibold text-accent-contrast"
                    onClick={() => void postClip()}
                  >
                    {posting ? SOCIAL.stories.posting : SOCIAL.stories.post}
                  </button>
                </div>
                {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
              </div>
            ) : (
              <div className={SOCIAL_STORY_CAMERA_BOTTOM_CLASS}>
                {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
                <div className={SOCIAL_STORY_CAPTURE_ROW_CLASS}>
                  <button
                    type="button"
                    data-social-story-gallery=""
                    aria-label={still ? SOCIAL.stories.photoLibrary : SOCIAL.stories.upload}
                    className={SOCIAL_STORY_GALLERY_CLASS}
                    disabled={phase === "recording"}
                    onClick={openRoll}
                  >
                    <SocialIcon weight="bold" name="image" size={SOCIAL_ICON_SIZE_STORY_PICKER} />
                  </button>
                  {still ? (
                    <button
                      type="button"
                      data-social-story-shutter=""
                      data-social-story-still-shutter=""
                      aria-label={SOCIAL.stories.photoCapture}
                      className={SOCIAL_STORY_SHUTTER_CLASS}
                      onClick={() => void takeStill()}
                    >
                      <span className={socialStoryShutterFillClass(false)} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-social-story-shutter=""
                      aria-label={phase === "recording" ? SOCIAL.stories.recording : SOCIAL.stories.holdOrTap}
                      className={SOCIAL_STORY_SHUTTER_CLASS}
                      onPointerDown={onRecordPointerDown}
                      onPointerUp={onRecordPointerUp}
                      onPointerCancel={onRecordPointerUp}
                    >
                      <span className={socialStoryShutterFillClass(phase === "recording")} />
                    </button>
                  )}
                  {canFlip ? (
                    <button
                      type="button"
                      data-social-story-flip=""
                      aria-label={SOCIAL.stories.flipCamera}
                      className={`${SOCIAL_STORY_CAMERA_HIT_CLASS} justify-self-end`}
                      disabled={phase === "recording"}
                      onClick={() => void flipCamera()}
                    >
                      <SocialIcon weight="bold" name="camera-rotate" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
                    </button>
                  ) : (
                    <span className={SOCIAL_STORY_CAMERA_HIT_CLASS} aria-hidden />
                  )}
                </div>
                <div className={SOCIAL_STORY_MODE_RAIL_CLASS}>
                  <p data-social-story-mode="" className={SOCIAL_STORY_MODE_LABEL_CLASS}>
                    {SOCIAL.stories.cameraMode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {postedStudio && clip ? <SocialStoryPostedConfirm url={clip.url} kind={clip.kind} /> : null}

      {(phase === "video" || videoStudio) && !still ? (
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={SOCIAL.stories.upload}
          onChange={(e) => onPick("video", e.currentTarget)}
        />
      ) : null}
      {phase === "photo" || still || (phase === "review" && clip?.kind === "image") ? (
        <input
          ref={photoLibraryRef}
          type="file"
          accept={photoAccept}
          className="sr-only"
          aria-label={SOCIAL.stories.photoLibrary}
          onChange={(e) => onPick("image", e.currentTarget)}
        />
      ) : null}
    </div>
  );
}
