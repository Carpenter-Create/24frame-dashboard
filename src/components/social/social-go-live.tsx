"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { HouseLink } from "@/components/chrome/house-link";
import { isHouseDesktop, useHouseDesktop } from "@/components/chrome/house-overlay";
import { HouseVoiceMic } from "@/components/chrome/house-voice-mic";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { uploadSocialPostMedia } from "@/lib/social-media-upload";
import {
  SOCIAL_GO_LIVE_CAPTION_CLASS,
  SOCIAL_GO_LIVE_CAPTION_FIELD_CLASS,
  SOCIAL_GO_LIVE_FRAME_OPTION_CLASS,
  SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS,
  SOCIAL_GO_LIVE_FULL_VIDEO_CLASS,
  SOCIAL_GO_LIVE_POST_CLASS,
  SOCIAL_GO_LIVE_PROGRESS_FILL_CLASS,
  SOCIAL_GO_LIVE_PROGRESS_TRACK_CLASS,
  SOCIAL_GO_LIVE_RETAKE_CLASS,
  SOCIAL_GO_LIVE_REVIEW_ACTIONS_CLASS,
  SOCIAL_GO_LIVE_REVIEW_CLASS,
  SOCIAL_GO_LIVE_STAGE_FULL_CLASS,
  SOCIAL_GO_LIVE_STAGE_REEL_CLASS,
  SOCIAL_STORY_REC_PILL_CLASS,
  SOCIAL_STORY_RECORD_CLASS,
  SOCIAL_STORY_STOP_CLASS,
  SOCIAL_STORY_STUDIO_CHROME_CLASS,
  SOCIAL_STORY_STUDIO_CLASS,
  SOCIAL_STORY_STUDIO_ICON_CLASS,
  SOCIAL_STORY_STUDIO_REVIEW_CLASS,
  socialGoLivePreviewClass,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_STORY_STUDIO } from "@/lib/social-icons";
import {
  SOCIAL_VIDEO_MAX_BYTES,
  type SocialMediaItem,
  type SocialVideoContentType,
} from "@/lib/social-media";
import {
  formatGoLiveClock,
  goLiveFileName,
  goLiveFitsByteCap,
  goLiveReachedCap,
  goLiveRecorderOptions,
  goLiveFrameCut,
  goLiveVideoConstraints,
  goLiveRemainingMs,
  SOCIAL_GO_LIVE_DEFAULT_FRAME,
  SOCIAL_GO_LIVE_FRAME_ASPECT,
  SOCIAL_GO_LIVE_FRAMES,
  SOCIAL_GO_LIVE_MAX_MS,
  type GoLiveFrame,
} from "@/lib/social-go-live";
import { clearSocialGoLiveOpener, takeSocialGoLiveExitHref } from "@/lib/social-go-live-nav";
import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import { SOCIAL, SOCIAL_ROUTES, socialCreateHref } from "@/lib/social";
import {
  applyOptimisticSocialPost,
  beginSocialPostPublish,
  failOptimisticSocialPost,
  persistSocialPost,
  runSocialOptimisticMutation,
} from "@/lib/social-optimistic";
import {
  ingestSpeechLearning,
} from "@/lib/speech-learning";
import {
  nextStoryStudioLive,
  probeStoryRecorderMimeType,
  resolveStoryRecorderBlobType,
  storyStudioIsLive,
  storyStudioMirrorsPreview,
  type StoryStudioFacing,
} from "@/lib/social-story-recorder";
import { SocialIcon } from "./social-icon";
import { useSocialCompose } from "./social-compose-context";

type LivePhase = "preview" | "recording" | "review";

type ReviewClip = {
  file: File;
  url: string;
  contentType: SocialVideoContentType;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

type FrameRecording = { stream: MediaStream; stop: () => void };

/** On a computer the clip is the shape the switch names (16:9 or 9:16):
 *  draw that centre cut of each camera frame into a canvas and record it.
 *  The camera's audio rides along. Null when the camera already has the
 *  shape, or where a canvas cannot be captured: the camera records as is. */
function frameRecording(
  source: MediaStream,
  video: HTMLVideoElement | null,
  aspect: number,
): FrameRecording | null {
  if (!video || typeof document === "undefined") return null;
  const crop = goLiveFrameCut(video.videoWidth, video.videoHeight, aspect);
  if (!crop) return null;
  const canvas = document.createElement("canvas");
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.captureStream !== "function") return null;
  let stopped = false;
  let frame = 0;
  const frameCallback = typeof video.requestVideoFrameCallback === "function";
  const draw = () => {
    if (stopped) return;
    context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
    frame = frameCallback ? video.requestVideoFrameCallback(draw) : requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(30);
  for (const track of source.getAudioTracks()) stream.addTrack(track);
  return {
    stream,
    stop: () => {
      stopped = true;
      if (frameCallback) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      // The audio tracks are the camera's: only the canvas track stops here.
      for (const track of stream.getVideoTracks()) track.stop();
    },
  };
}

async function uploadLiveVideo(
  file: File,
  onPercent: (percent: number) => void,
): Promise<{ item?: SocialMediaItem; error?: string }> {
  const result = await uploadSocialPostMedia([file], [], 1, "posts", {
    intent: "live",
    onProgress: (progress) => {
      if (progress.percent != null) onPercent(progress.percent);
    },
  });
  if (result.error || !result.items?.[0]) {
    return { error: result.error ?? SOCIAL.home.uploadFailed };
  }
  return { item: result.items[0] };
}

export function SocialGoLive() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const clockStartedRef = useRef(0);
  const clockTimerRef = useRef<number | null>(null);
  const mimeRef = useRef<SocialVideoContentType>("video/webm");
  const recordingRef = useRef(false);
  const clipUrlRef = useRef<string | null>(null);
  const liveRef = useRef(0);
  const aliveRef = useRef(true);
  const attachPromiseRef = useRef<Promise<boolean> | null>(null);
  const cutRef = useRef<FrameRecording | null>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  // The poster: the one author every Social post path uses (the shell's).
  const author = useSocialCompose()?.author;
  const desktop = useHouseDesktop();
  const [frameChoice, setFrameChoice] = useState<GoLiveFrame>(SOCIAL_GO_LIVE_DEFAULT_FRAME);
  // The frame switch is desktop only; the phone records its own portrait frame.
  const frame: GoLiveFrame = desktop ? frameChoice : "full";

  const [phase, setPhase] = useState<LivePhase>("preview");
  const [facing, setFacing] = useState<StoryStudioFacing>("user");
  const [error, setError] = useState("");
  const [clock, setClock] = useState(formatGoLiveClock(SOCIAL_GO_LIVE_MAX_MS));
  const [clip, setClip] = useState<ReviewClip | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  // The blue bar: the upload's bytes; a sliver until the first report.
  const [uploadPercent, setUploadPercent] = useState(0);
  const postPercent = Math.max(4, Math.min(100, Math.round(uploadPercent)));

  function clearClock() {
    if (clockTimerRef.current != null) {
      window.clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
    setClock(formatGoLiveClock(SOCIAL_GO_LIVE_MAX_MS));
  }

  function stopCut() {
    cutRef.current?.stop();
    cutRef.current = null;
  }

  function releasePreview() {
    liveRef.current = nextStoryStudioLive(liveRef.current);
    recordingRef.current = false;
    clearClock();
    stopCut();
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
  }

  function releaseCamera() {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      releasePreview();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    };
    // Unmount-only teardown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play the review with its sound; where the browser holds sound back
  // until a gesture, play it muted rather than not at all.
  useEffect(() => {
    if (phase !== "review") return;
    const node = reviewRef.current;
    if (!node) return;
    void node.play().catch(() => {
      node.muted = true;
      void node.play().catch(() => undefined);
    });
  }, [phase, clip]);

  useEffect(() => {
    const node = videoRef.current;
    const stream = streamRef.current;
    if (!node || !stream) return;
    if (phase !== "preview" && phase !== "recording") return;
    node.srcObject = stream;
    node.muted = true;
    node.playsInline = true;
    void node.play().catch(() => undefined);
  }, [phase]);

  async function acquireStream(nextFacing: StoryStudioFacing): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(SOCIAL.stories.unavailable);
    }
    // Read at call time: the first client render does not know the host yet.
    const video = goLiveVideoConstraints(nextFacing, isHouseDesktop());
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
    const stream = await acquireStream(nextFacing);
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
    return true;
  }

  function ensurePreview(nextFacing: StoryStudioFacing = facing): Promise<boolean> {
    if (streamRef.current) return Promise.resolve(true);
    if (attachPromiseRef.current) return attachPromiseRef.current;
    const live = liveRef.current;
    const pending = attachPreview(nextFacing, live)
      .then((ready) => ready && Boolean(streamRef.current))
      .catch(() => {
        if (storyStudioIsLive(liveRef.current, live)) {
          releasePreview();
          setError(SOCIAL.stories.permission);
        }
        return false;
      })
      .finally(() => {
        if (attachPromiseRef.current === pending) attachPromiseRef.current = null;
      });
    attachPromiseRef.current = pending;
    return pending;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const probed = probeStoryRecorderMimeType(
        typeof MediaRecorder !== "undefined" ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : undefined,
      );
      if (!probed || typeof MediaRecorder === "undefined") {
        setError(SOCIAL.stories.unavailable);
        return;
      }
      mimeRef.current = probed.mimeType;
      await ensurePreview(facing);
    })();
    return () => {
      cancelled = true;
    };
    // Open camera once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setClock(formatGoLiveClock(SOCIAL_GO_LIVE_MAX_MS));
    clockTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - clockStartedRef.current;
      setClock(formatGoLiveClock(goLiveRemainingMs(elapsed)));
      if (goLiveReachedCap(elapsed) && recordingRef.current) {
        stopRecording();
      }
    }, 250);
  }

  function beginRecording(source: MediaStream) {
    const probed = probeStoryRecorderMimeType(
      typeof MediaRecorder !== "undefined" ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : undefined,
    );
    if (!probed) {
      setError(SOCIAL.stories.unavailable);
      return;
    }
    mimeRef.current = probed.mimeType;
    chunksRef.current = [];
    const live = liveRef.current;
    stopCut();
    // The phone records its own frame; a computer records the switch's shape.
    cutRef.current = desktop
      ? frameRecording(source, videoRef.current, SOCIAL_GO_LIVE_FRAME_ASPECT[frame])
      : null;
    const stream = cutRef.current?.stream ?? source;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, goLiveRecorderOptions(probed.raw));
    } catch {
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
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size <= 0) return;
      const used = chunksRef.current.reduce(
        (sum, part) => sum + (part instanceof Blob ? part.size : 0),
        0,
      );
      if (!goLiveFitsByteCap(used + event.data.size, SOCIAL_VIDEO_MAX_BYTES)) {
        if (recordingRef.current) stopRecording();
        return;
      }
      chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stopCut();
      if (!storyStudioIsLive(liveRef.current, live)) return;
      const contentType = resolveStoryRecorderBlobType(
        chunksRef.current[0] instanceof Blob ? chunksRef.current[0].type : recorder.mimeType,
        mimeRef.current,
      );
      const blob = new Blob(chunksRef.current, { type: contentType });
      if (blob.size <= 0) {
        setError(SOCIAL.stories.mediaMissing);
        setPhase("preview");
        return;
      }
      const file = new File([blob], goLiveFileName(contentType), { type: contentType });
      if (!goLiveFitsByteCap(file.size, SOCIAL_VIDEO_MAX_BYTES)) {
        setError(SOCIAL.home.mediaTooLarge);
        setPhase("preview");
        return;
      }
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
      const url = URL.createObjectURL(file);
      clipUrlRef.current = url;
      setClip({ file, url, contentType });
      releaseCamera();
      setPhase("review");
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    recordingRef.current = true;
    startClock();
    setPhase("recording");
  }

  function startRecording() {
    setError("");
    if (streamRef.current) {
      beginRecording(streamRef.current);
      return;
    }
    void ensurePreview().then((ready) => {
      if (!ready || !streamRef.current) {
        setError((current) => current || SOCIAL.stories.unavailable);
        return;
      }
      beginRecording(streamRef.current);
    });
  }

  function stopRecording() {
    clearClock();
    recordingRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function retake() {
    if (posting) return;
    releaseClip();
    setError("");
    setPhase("preview");
    if (streamRef.current) return;
    void ensurePreview();
  }

  async function postClip() {
    if (!clip || posting) return;
    // The caption as it stood at Post; nothing typed or spoken during the
    // upload reaches the published post.
    const caption = body;
    setError("");
    setUploadPercent(0);
    setPosting(true);
    const uploaded = await uploadLiveVideo(clip.file, (percent) => {
      if (aliveRef.current) setUploadPercent(percent);
    });
    if (!aliveRef.current) return;
    if (uploaded.error || !uploaded.item) {
      setPosting(false);
      setError(uploaded.error ?? SOCIAL.home.uploadFailed);
      return;
    }
    ingestSpeechLearning({
      text: caption,
      source: "typed",
      workspace: "social",
    });
    const started = beginSocialPostPublish({
      body: caption,
      mediaItems: [uploaded.item],
      mediaPreview: [
        {
          kind: "video",
          url: clip.url,
          ...(uploaded.item.playbackId ? { playbackId: uploaded.item.playbackId } : {}),
          ...(uploaded.item.playbackPolicy ? { playbackPolicy: uploaded.item.playbackPolicy } : {}),
        },
      ],
      authorName: author?.name ?? SOCIAL.home.you,
      authorPhotoUrl: author?.photoUrl ?? null,
    });
    if (!started.ok) {
      setPosting(false);
      setError(started.error);
      return;
    }
    runSocialOptimisticMutation({
      apply: () => {
        applyOptimisticSocialPost(started.post);
        clipUrlRef.current = null;
        setError("");
        clearSocialGoLiveOpener();
        router.push(SOCIAL_ROUTES.home);
        return started.post.id;
      },
      persist: () => persistSocialPost(started.form),
      rollback: () => failOptimisticSocialPost(started.post.id, ACCOUNT_PROFILE.saveFailed),
      onError: (notice) => {
        failOptimisticSocialPost(started.post.id, notice);
        if (aliveRef.current) {
          setPosting(false);
          setError(notice);
        }
      },
    });
  }

  const mirrored = storyStudioMirrorsPreview(facing);

  return (
    <div data-social-go-live="" className={SOCIAL_STORY_STUDIO_CLASS}>
      <div
        data-social-go-live-stage=""
        data-social-go-live-frame-stage={frame}
        className={frame === "reel" ? SOCIAL_GO_LIVE_STAGE_REEL_CLASS : SOCIAL_GO_LIVE_STAGE_FULL_CLASS}
      >
        {phase === "review" && clip ? (
          // The review loops on its own, like a story (no native control
          // bar under the caption and the icons); a tap pauses or plays.
          <video
            ref={reviewRef}
            src={clip.url}
            data-social-go-live-review-clip=""
            className={frame === "reel" ? SOCIAL_STORY_STUDIO_REVIEW_CLASS : SOCIAL_GO_LIVE_FULL_VIDEO_CLASS}
            playsInline
            autoPlay
            loop
            onClick={(event) => {
              const node = event.currentTarget;
              if (node.paused) void node.play().catch(() => undefined);
              else node.pause();
            }}
          />
        ) : (
          <video
            ref={videoRef}
            className={socialGoLivePreviewClass(frame, mirrored)}
            muted
            playsInline
            autoPlay
          />
        )}
        <div className={SOCIAL_STORY_STUDIO_CHROME_CLASS}>
          <HouseLink
            href={SOCIAL_ROUTES.home}
            aria-label={SOCIAL.stories.close}
            aria-disabled={posting || undefined}
            data-social-go-live-close=""
            className={SOCIAL_STORY_STUDIO_ICON_CLASS}
            onClick={(event) => {
              if (posting) {
                event.preventDefault();
                return;
              }
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.altKey ||
                event.ctrlKey ||
                event.shiftKey
              ) {
                return;
              }
              event.preventDefault();
              router.replace(takeSocialGoLiveExitHref());
            }}
          >
            <SocialIcon weight="bold" name="x" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
          </HouseLink>
          <span className="t-label font-semibold text-band-ink">{SOCIAL.create.goLive}</span>
          <button
            type="button"
            aria-label={SOCIAL.stories.flipCamera}
            className={SOCIAL_STORY_STUDIO_ICON_CLASS}
            disabled={phase !== "preview"}
            onClick={() => void flipCamera()}
          >
            <SocialIcon weight="bold" name="camera-rotate" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
          </button>
        </div>
        {phase === "recording" ? (
          <p data-social-go-live-timer="" className={SOCIAL_STORY_REC_PILL_CLASS}>
            {SOCIAL.stories.rec} {clock}
          </p>
        ) : null}
        {phase === "preview" || phase === "recording" ? (
          <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-3">
            {phase === "preview" ? (
              <div
                role="radiogroup"
                aria-label={SOCIAL.create.liveFrame}
                data-social-go-live-frame=""
                className={SOCIAL_GO_LIVE_FRAME_SWITCH_CLASS}
              >
                {SOCIAL_GO_LIVE_FRAMES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={frame === option}
                    data-social-go-live-frame-option={option}
                    className={SOCIAL_GO_LIVE_FRAME_OPTION_CLASS}
                    onClick={() => setFrameChoice(option)}
                  >
                    {option === "full" ? SOCIAL.create.liveFrameFull : SOCIAL.create.liveFrameReel}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              data-social-go-live-record=""
              aria-label={phase === "recording" ? SOCIAL.create.liveStop : SOCIAL.create.liveStart}
              className={SOCIAL_STORY_RECORD_CLASS}
              onClick={() => {
                if (recordingRef.current) stopRecording();
                else startRecording();
              }}
            >
              {phase === "recording" ? <span className={SOCIAL_STORY_STOP_CLASS} /> : null}
            </button>
          </div>
        ) : null}
        {phase === "review" ? (
          <div data-social-go-live-review="" className={SOCIAL_GO_LIVE_REVIEW_CLASS}>
            <div data-social-go-live-caption="" className={SOCIAL_GO_LIVE_CAPTION_CLASS}>
              <label className="sr-only" htmlFor="social-go-live-body">
                {SOCIAL.create.caption}
              </label>
              <Textarea
                variant="bare"
                id="social-go-live-body"
                rows={1}
                value={body}
                disabled={posting}
                onChange={(event) => setBody(event.target.value)}
                placeholder={SOCIAL.home.captionPlaceholder}
                className={SOCIAL_GO_LIVE_CAPTION_FIELD_CLASS}
              />
              {/* Unmounting stops dictation, so the caption stays inert while posting. */}
              {posting ? null : (
                <HouseVoiceMic
                  surface="dictate"
                  workspace="social"
                  getValue={() => body}
                  onValue={setBody}
                />
              )}
            </div>
            {posting ? (
              <div
                data-social-go-live-progress=""
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={postPercent}
                aria-label={SOCIAL.stories.posting}
                className={SOCIAL_GO_LIVE_PROGRESS_TRACK_CLASS}
              >
                <div className={SOCIAL_GO_LIVE_PROGRESS_FILL_CLASS} style={{ width: `${postPercent}%` }} />
              </div>
            ) : null}
            <div className={SOCIAL_GO_LIVE_REVIEW_ACTIONS_CLASS}>
              <button
                type="button"
                data-social-go-live-retake=""
                aria-label={SOCIAL.create.liveRetake}
                className={SOCIAL_GO_LIVE_RETAKE_CLASS}
                disabled={posting}
                onClick={retake}
              >
                <SocialIcon weight="bold" name="arrow-counter-clockwise" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
              </button>
              <button
                type="button"
                data-social-go-live-post=""
                aria-label={posting ? SOCIAL.stories.posting : SOCIAL.create.livePost}
                className={SOCIAL_GO_LIVE_POST_CLASS}
                disabled={posting}
                onClick={() => void postClip()}
              >
                <SocialIcon weight="bold" name="arrow-up" size={SOCIAL_ICON_SIZE_STORY_STUDIO} />
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-x-4 top-16 z-20">
            <InlineNotice tone="error">
              {error}{" "}
              <Link href={socialCreateHref("media")} className="underline">
                {SOCIAL.create.liveUseVideo}
              </Link>
            </InlineNotice>
          </div>
        ) : null}
      </div>
    </div>
  );
}
