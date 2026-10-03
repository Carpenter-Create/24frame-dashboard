import {
  createSocialMuxUpload,
  finalizeSocialMuxUpload,
  presignSocialMediaUpload,
  reportSocialMediaUploadFailure,
} from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_MEDIA_MAX_ITEMS,
  storyPickFile,
  type SocialMediaItem,
  type SocialMediaKind,
  type SocialMediaLane,
} from "@/lib/social-media";
import { SOCIAL_MUX_PROVIDER, type SocialMuxIntent } from "@/lib/social-mux";

// One client upload helper for Social posts and story video.
// Images stay on the media S3 lane. Video goes to Mux.

export type SocialUploadProgress = {
  loaded: number;
  total: number;
  /** 0–100 while bytes are moving. Null when the length is unknown. */
  percent: number | null;
};

export type SocialPostUploadOptions = {
  intent?: SocialMuxIntent;
  signal?: AbortSignal;
  onProgress?: (progress: SocialUploadProgress) => void;
};

export type SocialMediaUploadResult = {
  items?: SocialMediaItem[];
  error?: string;
  aborted?: boolean;
};

/** Byte progress for a Mux or S3 PUT. Unknown totals stay null. */
export function socialUploadPercent(loaded: number, total: number): number | null {
  if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0) return null;
  const percent = Math.round((loaded / total) * 100);
  if (!Number.isFinite(percent)) return null;
  return Math.min(100, Math.max(0, percent));
}

export function isSocialUploadAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export type SocialUploadProgressEvent = {
  loaded: number;
  total: number;
  lengthComputable: boolean;
};

/** Minimal XHR surface so a test can drive upload progress without a browser. */
export type SocialUploadXhr = {
  status: number;
  open: (method: string, url: string) => void;
  setRequestHeader: (name: string, value: string) => void;
  send: (body: Blob) => void;
  abort: () => void;
  upload: {
    onprogress: ((event: SocialUploadProgressEvent) => void) | null;
  };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
};

function createBrowserUploadXhr(): SocialUploadXhr {
  return new XMLHttpRequest() as unknown as SocialUploadXhr;
}

/** A browser PUT that got no 2xx. Status 0 means no response reached the browser. */
export class SocialUploadPutError extends Error {
  constructor(readonly status: number) {
    super(`upload failed (${status})`);
    this.name = "SocialUploadPutError";
  }
}

// The PUT runs in the browser, so the server never sees it fail. Send the
// step, lane and status (never the URL) to the server log. Best effort.
function reportUploadPutFailure(step: "s3-put" | "mux-put", lane: SocialMediaLane, status: number): void {
  const body = new FormData();
  body.set("step", step);
  body.set("lane", lane);
  body.set("status", String(status));
  void Promise.resolve()
    .then(() => reportSocialMediaUploadFailure(body))
    .catch(() => undefined);
}

/** PUT with upload progress. Fetch cannot report upload bytes on Safari. */
export function putSocialMediaWithProgress(
  url: string,
  file: Blob,
  contentType: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: SocialUploadProgress) => void;
    createXhr?: () => SocialUploadXhr;
  } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const xhr = (options.createXhr ?? createBrowserUploadXhr)();
    // Status 0 is a network or CORS failure: the browser never saw a response.
    const fail = () => reject(new SocialUploadPutError(xhr.status));
    const onAbort = () => xhr.abort();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
      options.onProgress?.({
        loaded: event.loaded,
        total,
        percent: socialUploadPercent(event.loaded, total),
      });
    };
    xhr.onload = () => {
      options.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else fail();
    };
    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", onAbort);
      fail();
    };
    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    xhr.send(file);
  });
}

/**
 * Kind for a library file before bytes move.
 * iPhone camera-roll clips often have an empty type or a codec parameter.
 * A bare MIME check misses those and the still upload would run.
 * Extension and bare-type mapping stay on the story pick helper.
 */
export function socialPostUploadPlan(file: File): { file: File; kind: SocialMediaKind } | null {
  const picked = storyPickFile(file);
  if (!picked) return null;
  return { file: picked.file, kind: picked.kind };
}

export async function uploadSocialPostMedia(
  files: ArrayLike<File> | null,
  current: SocialMediaItem[],
  max: number = SOCIAL_MEDIA_MAX_ITEMS,
  lane: SocialMediaLane = "posts",
  options: SocialPostUploadOptions = {},
): Promise<SocialMediaUploadResult> {
  if (!files || files.length === 0) return {};
  const remaining = max - current.length;
  if (remaining <= 0) return { error: SOCIAL.home.mediaLimit };
  const chosen = Array.from(files).slice(0, remaining);
  const next: SocialMediaItem[] = [];
  for (const file of chosen) {
    const planned = socialPostUploadPlan(file);
    if (!planned) return { error: SOCIAL.home.mediaType };
    if (planned.kind === "video" && (lane === "posts" || lane === "stories")) {
      const uploaded = await uploadSocialMuxVideoFile(planned.file, { ...options, lane });
      if (uploaded.aborted) return { aborted: true };
      if (uploaded.error || !uploaded.item) return { error: uploaded.error ?? SOCIAL.home.uploadFailed };
      next.push(uploaded.item);
      continue;
    }
    const uploaded = await uploadSocialS3Media(planned.file, lane, options.signal);
    if (uploaded.aborted) return { aborted: true };
    if (uploaded.error || !uploaded.item) return { error: uploaded.error ?? SOCIAL.home.uploadFailed };
    next.push(uploaded.item);
  }
  return { items: next };
}

async function uploadSocialS3Media(
  file: File,
  lane: SocialMediaLane,
  signal?: AbortSignal,
): Promise<{ item?: SocialMediaItem; error?: string; aborted?: boolean }> {
  const body = new FormData();
  body.set("content_type", file.type);
  body.set("byte_length", String(file.size));
  body.set("lane", lane);
  let signed: Awaited<ReturnType<typeof presignSocialMediaUpload>>;
  try {
    signed = await presignSocialMediaUpload(body);
  } catch {
    return { error: SOCIAL.home.uploadFailed };
  }
  if (signed.error || !signed.url || !signed.key || !signed.kind || !signed.contentType) {
    return { error: signed.error ?? SOCIAL.home.uploadFailed };
  }
  let put: Response;
  try {
    put = await fetch(signed.url, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType },
      body: file,
      signal,
    });
  } catch (error) {
    if (isSocialUploadAbort(error)) return { aborted: true };
    reportUploadPutFailure("s3-put", lane, 0);
    return { error: SOCIAL.home.uploadFailed };
  }
  if (!put.ok) {
    reportUploadPutFailure("s3-put", lane, put.status);
    return { error: SOCIAL.home.uploadFailed };
  }
  return {
    item: {
      kind: signed.kind as SocialMediaItem["kind"],
      key: signed.key,
      contentType: signed.contentType as SocialMediaItem["contentType"],
    },
  };
}

export async function uploadSocialMuxVideoFile(
  file: File,
  options: SocialPostUploadOptions & { lane?: SocialMediaLane } = {},
): Promise<{ item?: SocialMediaItem; error?: string; aborted?: boolean }> {
  const lane = options.lane ?? "posts";
  const body = new FormData();
  body.set("content_type", file.type);
  body.set("byte_length", String(file.size));
  body.set("lane", lane);
  body.set("intent", options.intent ?? "video");
  let created: Awaited<ReturnType<typeof createSocialMuxUpload>>;
  try {
    created = await createSocialMuxUpload(body);
  } catch {
    return { error: SOCIAL.home.uploadFailed };
  }
  if (options.signal?.aborted) return { aborted: true };
  if (created.error || !created.url || !created.key || !created.uploadId || !created.contentType) {
    return { error: created.error ?? SOCIAL.home.uploadFailed };
  }
  try {
    if (options.onProgress) {
      await putSocialMediaWithProgress(created.url, file, created.contentType, {
        signal: options.signal,
        onProgress: options.onProgress,
      });
    } else {
      const put = await fetch(created.url, {
        method: "PUT",
        headers: { "Content-Type": created.contentType },
        body: file,
        signal: options.signal,
      });
      if (!put.ok) {
        reportUploadPutFailure("mux-put", lane, put.status);
        return { error: SOCIAL.home.uploadFailed };
      }
    }
  } catch (error) {
    if (isSocialUploadAbort(error)) return { aborted: true };
    reportUploadPutFailure("mux-put", lane, error instanceof SocialUploadPutError ? error.status : 0);
    return { error: SOCIAL.home.uploadFailed };
  }
  if (options.signal?.aborted) return { aborted: true };

  const finish = new FormData();
  finish.set("upload_id", created.uploadId);
  finish.set("key", created.key);
  finish.set("content_type", created.contentType);
  let ready: Awaited<ReturnType<typeof finalizeSocialMuxUpload>>;
  try {
    ready = await finalizeSocialMuxUpload(finish);
  } catch {
    return { error: SOCIAL.home.videoPreparing };
  }
  if (ready.error || !ready.item?.playbackId) {
    return { error: ready.error ?? SOCIAL.home.videoPreparing };
  }
  return {
    item: {
      ...ready.item,
      provider: SOCIAL_MUX_PROVIDER,
    },
  };
}
