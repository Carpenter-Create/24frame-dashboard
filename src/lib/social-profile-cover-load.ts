import { SOCIAL } from "@/lib/social";
import { SOCIAL_COVER_BYTES_ROUTE, SOCIAL_COVER_SOURCE_PARAM } from "@/lib/social-edge";

export { SOCIAL_COVER_BYTES_ROUTE, SOCIAL_COVER_SOURCE_PARAM };

/** The owner's current cover, or with `source` the kept uncropped original. */
export function socialCoverBytesHref(variant: "cover" | "source" = "cover"): string {
  return variant === "source"
    ? `${SOCIAL_COVER_BYTES_ROUTE}?${SOCIAL_COVER_SOURCE_PARAM}=1`
    : SOCIAL_COVER_BYTES_ROUTE;
}

/** Same-origin owner bytes. Manual redirect so a 302 is a status, not a thrown TypeError. */
export const COVER_BYTES_FETCH = {
  credentials: "include",
  redirect: "manual",
} as const satisfies RequestInit;

const RAW_FETCH = /failed to fetch|fetch failed/i;

/** Any picked file opens reposition chrome before decode or persist. */
export function coverFilePickOpensReposition(file: File | undefined, uploading: boolean): boolean {
  return Boolean(file) && !uploading;
}

/** Local previews can be read in the browser. Proxy and CDN hrefs cannot. */
export function coverPreviewIsLocal(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

function safeCoverFallback(fallback: string): string {
  if (!fallback || RAW_FETCH.test(fallback)) return SOCIAL.profile.coverCropFailed;
  return fallback;
}

/** Any notice that reaches the screen. Raw fetch failures use the existing crop copy. */
export function coverNoticeText(message: string | null | undefined, fallback: string): string {
  const safe = safeCoverFallback(fallback);
  const text = message?.trim() ?? "";
  if (!text || text === "cover" || RAW_FETCH.test(text)) return safe;
  return text;
}

/** TypeError and "Failed to fetch" stay off the screen. Other crop messages pass through. */
export function coverFailureCopy(error: unknown, fallback: string): string {
  if (error instanceof Error) return coverNoticeText(error.message, fallback);
  return coverNoticeText(null, fallback);
}

export type CoverLoadInput = {
  thrown?: unknown;
  status?: number;
  redirected?: boolean;
  type?: string;
};

/** Null only for a readable 2xx that was not a redirect. Otherwise existing friendly copy. */
export function coverLoadNotice(input: CoverLoadInput, fallback: string): string | null {
  if (input.thrown != null) return coverFailureCopy(input.thrown, fallback);
  if (
    input.redirected ||
    input.type === "opaqueredirect" ||
    input.status == null ||
    input.status < 200 ||
    input.status >= 300
  ) {
    return coverNoticeText(null, fallback);
  }
  return null;
}

export type CoverBytes = { file: File; notice: null } | { file: null; notice: string };

function fileFromBlob(blob: Blob): File {
  const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  return new File([blob], "cover-source", { type });
}

/**
 * Owner cover bytes from /api/social/cover. Never follows a redirect to the
 * CDN. `source` reads the kept original (?source=1) for Reposition.
 */
export async function loadOwnCoverFile(
  fallback: string,
  fetchImpl: typeof fetch = fetch,
  variant: "cover" | "source" = "cover",
): Promise<CoverBytes> {
  let response: Response;
  try {
    response = await fetchImpl(socialCoverBytesHref(variant), COVER_BYTES_FETCH);
  } catch (thrown) {
    return { file: null, notice: coverFailureCopy(thrown, fallback) };
  }
  const redirected =
    response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400);
  const notice = coverLoadNotice(
    { status: response.status, redirected, type: response.type },
    fallback,
  );
  if (notice) return { file: null, notice };
  try {
    const blob = await response.blob();
    if (blob.size === 0) return { file: null, notice: coverNoticeText(null, fallback) };
    return { file: fileFromBlob(blob), notice: null };
  } catch (thrown) {
    return { file: null, notice: coverFailureCopy(thrown, fallback) };
  }
}

/** The kept uncropped original (?source=1), for Reposition. */
export function loadOwnCoverSourceFile(
  fallback: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CoverBytes> {
  return loadOwnCoverFile(fallback, fetchImpl, "source");
}

/** blob: and data: only. An http(s) or media-proxy URL is not fetched. */
export async function loadLocalCoverFile(url: string, fallback: string): Promise<CoverBytes> {
  if (!coverPreviewIsLocal(url)) return { file: null, notice: coverNoticeText(null, fallback) };
  try {
    const response = await fetch(url);
    if (!response.ok) return { file: null, notice: coverNoticeText(null, fallback) };
    const blob = await response.blob();
    if (blob.size === 0) return { file: null, notice: coverNoticeText(null, fallback) };
    return { file: fileFromBlob(blob), notice: null };
  } catch (thrown) {
    return { file: null, notice: coverFailureCopy(thrown, fallback) };
  }
}
