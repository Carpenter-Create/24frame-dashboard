import { SOCIAL_VIDEO_MAX_BYTES, type SocialVideoContentType } from "@/lib/social-media";
import {
  formatStoryRecorderClock,
  storyRecorderVideoConstraints,
  type StoryStudioFacing,
} from "@/lib/social-story-recorder";

// In-app camera record, then a normal Social video post. The recorder
// stops at 479s so a full take, including the clock that starts after
// MediaRecorder.start, stays inside the 480.5s Social cap. No livestream.

export const SOCIAL_GO_LIVE_MAX_MS = 479 * 1000;
export const SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND = 2_500_000;

export function goLiveRemainingMs(
  elapsedMs: number,
  capMs: number = SOCIAL_GO_LIVE_MAX_MS,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return capMs;
  return Math.max(0, capMs - elapsedMs);
}

export function goLiveReachedCap(
  elapsedMs: number,
  capMs: number = SOCIAL_GO_LIVE_MAX_MS,
): boolean {
  return goLiveRemainingMs(elapsedMs, capMs) === 0 && elapsedMs >= capMs;
}

export function formatGoLiveClock(ms: number): string {
  return formatStoryRecorderClock(ms);
}

export function goLiveRecorderOptions(rawMime: string): {
  mimeType: string;
  videoBitsPerSecond: number;
} {
  return {
    mimeType: rawMime,
    videoBitsPerSecond: SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND,
  };
}

export function goLiveFileName(contentType: SocialVideoContentType): string {
  if (contentType === "video/mp4") return "live.mp4";
  if (contentType === "video/quicktime") return "live.mov";
  return "live.webm";
}

export function goLiveFitsByteCap(
  byteLength: number,
  cap: number = SOCIAL_VIDEO_MAX_BYTES,
): boolean {
  return Number.isFinite(byteLength) && byteLength > 0 && byteLength <= cap;
}

// Desktop frame (docs/design-locks/social-go-live-camera-chrome-lock-v1.md
// §Desktop frame, Adam 2026-10-08): "full" fills the window and records
// 16:9; "reel" is the 9:16 stage and records 9:16. Phone is always the
// camera's own (portrait) frame.
export type GoLiveFrame = "full" | "reel";

export const SOCIAL_GO_LIVE_FRAMES = ["full", "reel"] as const satisfies readonly GoLiveFrame[];

export const SOCIAL_GO_LIVE_DEFAULT_FRAME: GoLiveFrame = "full";

/** Each frame's recorded shape on a computer, named on the switch (Adam
 *  2026-10-08: "instead of the language "Full" and "Reel" – use the aspect
 *  ratio"). */
export const SOCIAL_GO_LIVE_FRAME_ASPECT = {
  full: 16 / 9,
  reel: 9 / 16,
} as const satisfies Record<GoLiveFrame, number>;

/** The camera a computer asks for: 16:9 HD. With no size, browsers open a
 *  webcam at 640 × 480 (4:3). Ideal, not exact: the nearest mode wins and
 *  the recording is cut to the frame's shape. A camera chosen in the picker
 *  is asked for by id (exact) instead of by facing. The phone asks for
 *  nothing but its facing. */
export function goLiveVideoConstraints(
  facing: StoryStudioFacing,
  desktop: boolean,
  deviceId?: string | null,
): MediaTrackConstraints {
  const base = storyRecorderVideoConstraints(facing);
  if (!desktop) return base;
  const hd = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  return deviceId ? { deviceId: { exact: deviceId }, ...hd } : { ...base, ...hd };
}

// Camera picker (social-go-live-camera-chrome-lock-v1 §Camera picker, Adam
// 2026-10-08: "yes, build the camera picker"). A computer can have several
// cameras (built in, an iPhone, a USB webcam); the browser opens its default.

export type GoLiveCamera = { id: string; label: string };

/** The device's own name, without the USB vendor:product id Chrome appends
 *  ("Desk Cam (046d:085e)" → "Desk Cam"); "Camera 2" before the browser
 *  shares names. */
export function goLiveCameraLabel(label: string, index: number, fallback: string): string {
  const name = label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "").trim();
  return name || `${fallback} ${index + 1}`;
}

/** The video inputs, once each, in the browser's order. Ids are empty until
 *  camera permission is granted: none are listed then. */
export function goLiveCameras(
  devices: readonly Pick<MediaDeviceInfo, "kind" | "deviceId" | "label">[],
  fallback: string,
): GoLiveCamera[] {
  const seen = new Set<string>();
  const cameras: GoLiveCamera[] = [];
  for (const device of devices) {
    if (device.kind !== "videoinput" || !device.deviceId || seen.has(device.deviceId)) continue;
    seen.add(device.deviceId);
    cameras.push({ id: device.deviceId, label: goLiveCameraLabel(device.label, cameras.length, fallback) });
  }
  return cameras;
}

/** The chosen camera, remembered on this browser only (a convenience: a
 *  blocked or cleared store opens the default camera). Its name is kept
 *  with its id: a browser can issue new ids (cleared site data, a private
 *  window), and the name finds the same camera again. */
export const SOCIAL_GO_LIVE_CAMERA_KEY = "gc-go-live-camera";

type CameraStore = Pick<Storage, "getItem" | "setItem">;

function cameraStore(): CameraStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readGoLiveCamera(store: CameraStore | null = cameraStore()): GoLiveCamera | null {
  try {
    const raw = store?.getItem(SOCIAL_GO_LIVE_CAMERA_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { id, label } = value as Partial<GoLiveCamera>;
    return typeof id === "string" && id && typeof label === "string" ? { id, label } : null;
  } catch {
    return null;
  }
}

export function rememberGoLiveCamera(camera: GoLiveCamera, store: CameraStore | null = cameraStore()): void {
  try {
    store?.setItem(SOCIAL_GO_LIVE_CAMERA_KEY, JSON.stringify({ id: camera.id, label: camera.label }));
  } catch {
    // Blocked storage: the choice lasts this visit only.
  }
}

/** The remembered camera among those listed now: by id, else by name. Null
 *  when it is not here (the default camera opens). */
export function findGoLiveCamera(
  remembered: GoLiveCamera | null,
  cameras: readonly GoLiveCamera[],
): GoLiveCamera | null {
  if (!remembered) return null;
  return (
    cameras.find((camera) => camera.id === remembered.id) ??
    cameras.find((camera) => camera.label === remembered.label) ??
    null
  );
}

const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

/** The centre cut of a camera frame at an aspect (source pixels, even sizes,
 *  no upscale), or null when the camera already has that shape (within 1%)
 *  or has not reported its size: record the camera as it is. A 720p webcam
 *  keeps its height for 9:16; a 4:3 webcam keeps its width for 16:9. */
export function goLiveFrameCut(
  width: number,
  height: number,
  aspect: number,
): { sx: number; sy: number; sw: number; sh: number } | null {
  if (!(width > 0 && height > 0)) return null;
  if (Math.abs(width / height - aspect) / aspect < 0.01) return null;
  if (width / height > aspect) {
    const sw = even(height * aspect);
    const sh = even(height);
    return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
  }
  const sw = even(width);
  const sh = even(width / aspect);
  return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
}
