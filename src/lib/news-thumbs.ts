import { createHash } from "node:crypto";

import type { NewsSourceId } from "@/lib/news";
import {
  canonicalizeNewsImageUrl,
  type NormalizedNewsItem,
} from "@/lib/news-rss";
import { newsEgressFetch, type NewsDnsLookup } from "@/lib/news-egress";
import { putObjectBytes } from "@/lib/s3-put";

// Mirror publisher thumbs onto the title-asset bucket (`S3_BUCKET`) under
// `news-thumbs/`, then persist the unsigned CloudFront URL (`CLOUDFRONT_DOMAIN`).
// Same PutObject helper as `src/lib/s3.ts`. Fail-soft: a mirror miss keeps
// the canonicalized remote URL. Never NEWS_S3_* / education / media buckets.

export const NEWS_THUMBS_PREFIX = "news-thumbs/";
export const NEWS_THUMB_TIMEOUT_MS = 8_000;
export const NEWS_THUMB_MAX_BYTES = 5_000_000;
export const NEWS_THUMB_CONCURRENCY = 3;

export type NewsEnvLike = Record<string, string | undefined>;

export type PutNewsThumbObject = (
  key: string,
  body: Uint8Array,
  contentType: string,
) => Promise<void>;

export type NewsThumbMirrorCounters = {
  mirrored: number;
  mirrorFailed: number;
};

const EMPTY_MIRROR: NewsThumbMirrorCounters = { mirrored: 0, mirrorFailed: 0 };

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp)(\?|$)/i;

export function isNewsThumbMirrorConfigured(env: NewsEnvLike = process.env): boolean {
  return Boolean(
    env.S3_BUCKET?.trim() && env.AWS_REGION?.trim() && env.CLOUDFRONT_DOMAIN?.trim(),
  );
}

/** CloudFront host from existing title `CLOUDFRONT_DOMAIN` — no new env name. */
export function newsThumbCdnOrigin(env: NewsEnvLike = process.env): string | null {
  const raw = env.CLOUDFRONT_DOMAIN?.trim();
  if (!raw) return null;
  const domain = raw.replace(/\/+$/, "");
  return domain.startsWith("http") ? domain : `https://${domain}`;
}

export function newsThumbPublicUrl(key: string, env: NewsEnvLike = process.env): string | null {
  const origin = newsThumbCdnOrigin(env);
  if (!origin) return null;
  return `${origin}/${key.replace(/^\/+/, "")}`;
}

export function isMirroredNewsThumbUrl(url: string | null, env: NewsEnvLike = process.env): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!parsed.pathname.startsWith(`/${NEWS_THUMBS_PREFIX}`)) return false;
  const origin = newsThumbCdnOrigin(env);
  if (origin) {
    try {
      return parsed.hostname === new URL(origin).hostname;
    } catch {
      return false;
    }
  }
  return parsed.hostname === "delivery.globalcontent.co";
}

export function newsThumbObjectKey(
  source: NewsSourceId,
  canonicalUrl: string,
  ext: string,
): string {
  const hash = createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 32);
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  const key = `${NEWS_THUMBS_PREFIX}${source}/${hash}.${safeExt}`;
  assertNewsThumbKey(key);
  return key;
}

function assertNewsThumbKey(key: string): void {
  if (!key.startsWith(NEWS_THUMBS_PREFIX)) {
    throw new Error("News thumb key must stay under news-thumbs/");
  }
  if (key.includes("..") || key.startsWith("orgs/") || key.includes("\\")) {
    throw new Error("News thumb key is not allowed");
  }
}

function extFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return IMAGE_TYPES[mime] ?? null;
}

function extFromUrl(url: string): string {
  const match = url.match(IMAGE_EXT);
  const raw = match?.[1]?.toLowerCase();
  if (!raw) return "jpg";
  return raw === "jpeg" ? "jpg" : raw;
}

export async function fetchNewsThumbBytes(
  url: string,
  init: {
    fetchImpl?: typeof fetch;
    lookup?: NewsDnsLookup;
    timeoutMs?: number;
    maxBytes?: number;
    userAgent?: string;
  } = {},
): Promise<{ body: Uint8Array; contentType: string; ext: string }> {
  if (!/^https:\/\//i.test(url)) {
    throw new Error("thumb URL must be https");
  }
  const timeoutMs = init.timeoutMs ?? NEWS_THUMB_TIMEOUT_MS;
  const maxBytes = init.maxBytes ?? NEWS_THUMB_MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await newsEgressFetch(url, {
      fetchImpl: init.fetchImpl,
      lookup: init.lookup,
      request: {
        signal: controller.signal,
        headers: {
          accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "user-agent":
            init.userAgent ??
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type");
    const ext = extFromContentType(contentType) ?? extFromUrl(url);
    if (!extFromContentType(contentType) && !IMAGE_EXT.test(url)) {
      throw new Error("thumb is not an image");
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 32) throw new Error("thumb too small");
    if (buf.byteLength > maxBytes) throw new Error("thumb exceeded size cap");
    return {
      body: buf,
      contentType: contentType?.split(";")[0]?.trim() || `image/${ext === "jpg" ? "jpeg" : ext}`,
      ext,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function mirrorNewsImageUrl(
  input: {
    source: NewsSourceId;
    canonicalUrl: string;
    remoteUrl: string;
    fetchImpl?: typeof fetch;
    lookup?: NewsDnsLookup;
    putObject?: PutNewsThumbObject;
    env?: NewsEnvLike;
  },
): Promise<{ url: string; mirrored: boolean; error?: string }> {
  const env = input.env ?? process.env;
  const remote = canonicalizeNewsImageUrl(input.remoteUrl) ?? input.remoteUrl;
  if (isMirroredNewsThumbUrl(remote, env)) {
    return { url: remote, mirrored: false };
  }
  if (!isNewsThumbMirrorConfigured(env)) {
    return { url: remote, mirrored: false, error: "mirror env unset" };
  }
  try {
    const fetched = await fetchNewsThumbBytes(remote, {
      fetchImpl: input.fetchImpl,
      lookup: input.lookup,
    });
    const key = newsThumbObjectKey(input.source, input.canonicalUrl, fetched.ext);
    const put = input.putObject ?? putObjectBytes;
    await put(key, fetched.body, fetched.contentType);
    const publicUrl = newsThumbPublicUrl(key, env);
    if (!publicUrl) return { url: remote, mirrored: false, error: "CLOUDFRONT_DOMAIN unset" };
    return { url: publicUrl, mirrored: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "mirror failed";
    return { url: remote, mirrored: false, error };
  }
}

async function runPooled<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  async function pump() {
    while (next < items.length) {
      const i = next;
      next += 1;
      await worker(items[i]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(Math.max(concurrency, 1), items.length) }, () => pump()),
  );
}

export async function mirrorNewsItemImages(
  items: readonly NormalizedNewsItem[],
  init: {
    fetchImpl?: typeof fetch;
    putObject?: PutNewsThumbObject;
    env?: NewsEnvLike;
  } = {},
): Promise<{ items: NormalizedNewsItem[]; counters: NewsThumbMirrorCounters }> {
  if (items.length === 0) return { items: [...items], counters: { ...EMPTY_MIRROR } };
  const env = init.env ?? process.env;
  const next = items.map((item) => ({ ...item }));
  const counters = { ...EMPTY_MIRROR };

  await runPooled(
    next,
    async (item) => {
      const remote = canonicalizeNewsImageUrl(item.image_url);
      if (!remote) return;
      const result = await mirrorNewsImageUrl({
        source: item.source,
        canonicalUrl: item.canonical_url,
        remoteUrl: remote,
        fetchImpl: init.fetchImpl,
        putObject: init.putObject,
        env,
      });
      item.image_url = result.url;
      if (result.mirrored) counters.mirrored += 1;
      else if (result.error && result.error !== "mirror env unset") {
        counters.mirrorFailed += 1;
        console.error(
          JSON.stringify({
            msg: "news thumb mirror fail",
            source: item.source,
            url: item.canonical_url,
            error: result.error,
          }),
        );
      }
    },
    NEWS_THUMB_CONCURRENCY,
  );

  return { items: next, counters };
}

export function previewNewsThumbPublicUrl(
  source: NewsSourceId,
  canonicalUrl: string,
  remoteUrl: string,
  env: NewsEnvLike = process.env,
): string | null {
  const ext = extFromUrl(remoteUrl);
  return newsThumbPublicUrl(newsThumbObjectKey(source, canonicalUrl, ext), env);
}
