import { NEWS_SOURCES, newsSourceIsLive, newsWindowStart, type NewsSourceId } from "@/lib/news";
import {
  canonicalizeNewsImageUrl,
  parseNewsFeed,
  parseOgImageUrl,
  type NormalizedNewsItem,
} from "@/lib/news-rss";
import { createNewsIngestStore, type NewsPersist } from "@/lib/news-store";
import {
  mirrorNewsItemImages,
  type PutNewsThumbObject,
} from "@/lib/news-thumbs";
import { isFilmOrTvTopic } from "@/lib/news-topic";
import { newsEgressFetch, type NewsDnsLookup } from "@/lib/news-egress";

// Scheduled News ingest (Lambda + EventBridge). Fail-soft per source.
// Persist to DynamoDB only — never fan-out RSS on a page read.
// RSS media/enclosure first; OG-scrape when image_url is null. After a
// remote image_url is resolved, mirror bytes to S3_BUCKET/news-thumbs/
// and persist the CloudFront URL. Mirror miss keeps the remote URL.
// One bad article URL must not fail the source or the run.

export const NEWS_FEED_TIMEOUT_MS = 8_000;
export const NEWS_FEED_MAX_BYTES = 1_500_000;
export const NEWS_OG_TIMEOUT_MS = 12_000;
/** Default OG HTML cap. THR pages are ~611KB; 512KB truncated before og:image. */
export const NEWS_OG_MAX_BYTES = 1_500_000;
export const NEWS_INGEST_CONCURRENCY = 3;
export const NEWS_OG_CONCURRENCY = 4;
/** Mainstream desktop Chrome — publishers gate on bot tokens like 24FrameNews/1.0. */
export const NEWS_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type NewsEnvLike = Record<string, string | undefined>;

/** `NEWS_OG_MAX_BYTES` env override (positive integer). Invalid/empty → default. */
export function resolveNewsOgMaxBytes(env: NewsEnvLike = process.env): number {
  const raw = env.NEWS_OG_MAX_BYTES?.trim();
  if (!raw) return NEWS_OG_MAX_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return NEWS_OG_MAX_BYTES;
  return parsed;
}

export type { NewsPersist };

export type NewsOgCounters = {
  ogAttempted: number;
  ogFilled: number;
  ogMiss: number;
};

export type NewsMirrorCounters = {
  mirrored: number;
  mirrorFailed: number;
};

/** Scrape OG when RSS has no thumb. */
export function newsItemNeedsOg(item: Pick<NormalizedNewsItem, "image_url">): boolean {
  return !item.image_url;
}

export type NewsIngestSourceResult = {
  source: NewsSourceId;
  fetched: number;
  inserted: number;
  skipped?: boolean;
  error?: string;
  ogAttempted?: number;
  ogFilled?: number;
  ogMiss?: number;
  /** Music / other candidates dropped by the topic gate before Dynamo write. */
  droppedByTopic?: number;
  mirrored?: number;
  mirrorFailed?: number;
};

export type NewsIngestSummary = {
  sources: number;
  fetched: number;
  inserted: number;
  failed: number;
  skipped: number;
  purged: number;
  results: NewsIngestSourceResult[];
};

export async function fetchNewsFeedXml(
  url: string,
  init: { fetchImpl?: typeof fetch; lookup?: NewsDnsLookup } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_FEED_TIMEOUT_MS);
  try {
    const res = await newsEgressFetch(url, {
      fetchImpl: init.fetchImpl,
      lookup: init.lookup,
      request: {
        signal: controller.signal,
        headers: {
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          "user-agent": NEWS_USER_AGENT,
        },
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > NEWS_FEED_MAX_BYTES) {
      throw new Error("feed exceeded size cap");
    }
    return new TextDecoder("utf-8").decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNewsArticleHtml(
  url: string,
  init: {
    fetchImpl?: typeof fetch;
    lookup?: NewsDnsLookup;
    timeoutMs?: number;
    maxBytes?: number;
    env?: NewsEnvLike;
  } = {},
): Promise<string | null> {
  if (!/^https:\/\//i.test(url)) return null;
  const timeoutMs = init.timeoutMs ?? NEWS_OG_TIMEOUT_MS;
  const maxBytes = init.maxBytes ?? resolveNewsOgMaxBytes(init.env);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work = (async (): Promise<string | null> => {
    const res = await newsEgressFetch(url, {
      fetchImpl: init.fetchImpl,
      lookup: init.lookup,
      request: {
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": NEWS_USER_AGENT,
        },
      },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const slice = buf.byteLength > maxBytes ? buf.subarray(0, maxBytes) : buf;
    return new TextDecoder("utf-8").decode(slice);
  })().catch(() => null);

  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fillNewsOgImages(
  items: readonly NormalizedNewsItem[],
  init: {
    fetchHtml?: (url: string) => Promise<string | null>;
    fetchImpl?: typeof fetch;
    lookup?: NewsDnsLookup;
    timeoutMs?: number;
    maxBytes?: number;
    env?: NewsEnvLike;
  } = {},
): Promise<NormalizedNewsItem[]> {
  const fetchHtml =
    init.fetchHtml ??
    ((url: string) =>
      fetchNewsArticleHtml(url, {
        fetchImpl: init.fetchImpl,
        lookup: init.lookup,
        timeoutMs: init.timeoutMs,
        maxBytes: init.maxBytes,
        env: init.env,
      }));
  const candidates = items.filter((item) => newsItemNeedsOg(item));
  if (candidates.length === 0) return canonicalizeNewsItemImages(items);

  const scraped = new Map<string, string | null>();
  await runPooled(
    candidates,
    async (item) => {
      try {
        const html = await fetchHtml(item.url);
        scraped.set(item.canonical_url, html ? parseOgImageUrl(html, item.url) : null);
      } catch {
        scraped.set(item.canonical_url, null);
      }
    },
    NEWS_OG_CONCURRENCY,
  );

  return canonicalizeNewsItemImages(
    items.map((item) => {
      const og = scraped.get(item.canonical_url);
      if (og) return { ...item, image_url: og };
      return item;
    }),
  );
}

function canonicalizeNewsItemImages(items: readonly NormalizedNewsItem[]): NormalizedNewsItem[] {
  return items.map((item) => ({
    ...item,
    image_url: canonicalizeNewsImageUrl(item.image_url),
  }));
}

const EMPTY_OG: NewsOgCounters = { ogAttempted: 0, ogFilled: 0, ogMiss: 0 };
const EMPTY_MIRROR: NewsMirrorCounters = { mirrored: 0, mirrorFailed: 0 };

/** RSS-null items. CloudWatch: ogAttempted / ogFilled / ogMiss. */
export function countNewsOgFill(
  before: readonly NormalizedNewsItem[],
  after: readonly NormalizedNewsItem[],
): NewsOgCounters {
  const afterByUrl = new Map(after.map((item) => [item.canonical_url, item]));
  let ogAttempted = 0;
  let ogFilled = 0;
  for (const item of before) {
    if (!newsItemNeedsOg(item)) continue;
    ogAttempted += 1;
    const next = afterByUrl.get(item.canonical_url)?.image_url;
    if (!next) continue;
    const prior = canonicalizeNewsImageUrl(item.image_url);
    if (!prior || next !== prior) ogFilled += 1;
  }
  return { ogAttempted, ogFilled, ogMiss: ogAttempted - ogFilled };
}

/** Sliding pool — a slow URL holds one slot, not the rest of the batch. */
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

async function runBatched<T, R>(
  items: readonly T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(worker))));
  }
  return results;
}

async function markHealth(
  persist: NewsPersist,
  source: NewsSourceId,
  patch: { now: Date; error?: string },
): Promise<void> {
  const prior = (await persist.getHealth(source)) ?? {
    source,
    enabled: true,
    last_success_at: null,
    last_error: null,
    last_error_at: null,
  };
  const at = patch.now.toISOString();
  await persist.putHealth({
    ...prior,
    last_success_at: patch.error ? prior.last_success_at : at,
    last_error: patch.error ?? null,
    last_error_at: patch.error ? at : null,
  });
}

/**
 * Fetch every feed URL configured for one source and merge the parsed
 * items. If every URL fails, the outer catch marks the source unhealthy.
 * Partial success (one section feed up, another down) still ingests.
 */
async function fetchSourceItems(
  source: (typeof NEWS_SOURCES)[number],
  now: Date,
  fetchXml: (url: string) => Promise<string>,
): Promise<{ items: NormalizedNewsItem[]; errors: string[]; ok: number }> {
  const urls = source.feedUrls;
  const errors: string[] = [];
  let ok = 0;
  const merged = new Map<string, NormalizedNewsItem>();

  for (const url of urls) {
    try {
      const xml = await fetchXml(url);
      const parsed = parseNewsFeed(xml, source.id, now, url);
      ok += 1;
      for (const item of parsed) {
        if (!merged.has(item.canonical_url)) merged.set(item.canonical_url, item);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "feed failed");
    }
  }

  return { items: [...merged.values()], errors, ok };
}

export async function ingestNewsFeeds(input: {
  persist?: NewsPersist;
  now?: Date;
  fetchXml?: (url: string) => Promise<string>;
  fetchOgHtml?: (url: string) => Promise<string | null>;
  fetchThumb?: typeof fetch;
  putThumb?: PutNewsThumbObject;
}): Promise<NewsIngestSummary> {
  const now = input.now ?? new Date();
  const persist = input.persist ?? createNewsIngestStore();
  const fetchXml = input.fetchXml ?? ((url: string) => fetchNewsFeedXml(url));
  const fetchOgHtml = input.fetchOgHtml;

  const results = await runBatched(
    NEWS_SOURCES,
    async (source): Promise<NewsIngestSourceResult> => {
      const health = await persist.getHealth(source.id);
      if (!newsSourceIsLive(source.id, health)) {
        console.log(
          JSON.stringify({
            msg: "news ingest skip",
            source: source.id,
            ...EMPTY_OG,
            ...EMPTY_MIRROR,
          }),
        );
        return {
          source: source.id,
          fetched: 0,
          inserted: 0,
          skipped: true,
          ...EMPTY_OG,
          ...EMPTY_MIRROR,
        };
      }
      try {
        const fetched = await fetchSourceItems(source, now, fetchXml);
        if (fetched.ok === 0) {
          const message = fetched.errors[0] ?? "feed failed";
          throw new Error(message);
        }
        const kept = fetched.items.filter((item) => isFilmOrTvTopic(item.topic));
        const droppedByTopic = fetched.items.length - kept.length;
        let items = kept;
        try {
          items = await fillNewsOgImages(kept, { fetchHtml: fetchOgHtml });
        } catch {
          items = kept;
        }
        const og = countNewsOgFill(kept, items);
        let mirrored = 0;
        let mirrorFailed = 0;
        try {
          const mirroredBatch = await mirrorNewsItemImages(items, {
            fetchImpl: input.fetchThumb,
            putObject: input.putThumb,
          });
          items = mirroredBatch.items;
          mirrored = mirroredBatch.counters.mirrored;
          mirrorFailed = mirroredBatch.counters.mirrorFailed;
        } catch (err) {
          mirrorFailed = items.filter((item) => item.image_url).length;
          console.error(
            JSON.stringify({
              msg: "news thumb mirror fail",
              source: source.id,
              error: err instanceof Error ? err.message : "mirror failed",
            }),
          );
        }
        const inserted = await persist.upsertItems(canonicalizeNewsItemImages(items), now);
        await markHealth(persist, source.id, { now });
        console.log(
          JSON.stringify({
            msg: "news ingest source",
            source: source.id,
            fetched: items.length,
            inserted,
            droppedByTopic,
            mirrored,
            mirrorFailed,
            ...og,
          }),
        );
        return {
          source: source.id,
          fetched: items.length,
          inserted,
          droppedByTopic,
          mirrored,
          mirrorFailed,
          ...og,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "feed failed";
        console.error(
          JSON.stringify({
            msg: "news ingest fail",
            source: source.id,
            error: message,
            droppedByTopic: 0,
            ...EMPTY_OG,
            ...EMPTY_MIRROR,
          }),
        );
        await markHealth(persist, source.id, { now, error: message });
        return {
          source: source.id,
          fetched: 0,
          inserted: 0,
          error: message,
          droppedByTopic: 0,
          ...EMPTY_OG,
          ...EMPTY_MIRROR,
        };
      }
    },
    NEWS_INGEST_CONCURRENCY,
  );

  const purged = await persist.purgeBefore(newsWindowStart(now).toISOString());

  return {
    sources: NEWS_SOURCES.length,
    fetched: results.reduce((sum, row) => sum + row.fetched, 0),
    inserted: results.reduce((sum, row) => sum + row.inserted, 0),
    failed: results.filter((row) => row.error).length,
    skipped: results.filter((row) => row.skipped).length,
    purged,
    results,
  };
}
