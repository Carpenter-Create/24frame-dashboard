import { probeRange, splitProbe, UNPAGINATED_MAX } from "@/lib/list-bounds";
import {
  NEWS_HOME_CAP,
  NEWS_READ_REVALIDATE_SECONDS,
  dedupeNewsHeadlines,
  newsInWindow,
  overviewNewsHeadlines,
  type NewsItem,
  type NewsListResult,
} from "@/lib/news";
import { isNewsAwsConfigured } from "@/lib/news-aws";
import { createNewsAppStore, type NewsStore } from "@/lib/news-store";

// Home + /home/news read Dynamo through dedicated NEWS_AWS_*. Never fan out RSS.
// Success-only process cache is the SWR equivalent — failures are not stored.

type NewsCacheEntry = { expiresAt: number; value: NewsListResult };

const newsReadCache = new Map<string, NewsCacheEntry>();

export function newsReadCacheKey(limit: number): string {
  return `news:${limit}`;
}

export function newsReadCacheSize(): number {
  return newsReadCache.size;
}

export function resetNewsReadCache(): void {
  newsReadCache.clear();
}

function pruneNewsReadCache(now: Date): void {
  for (const [key, hit] of newsReadCache) {
    if (hit.expiresAt <= now.getTime()) newsReadCache.delete(key);
  }
}

export function peekNewsReadCache(key: string, now: Date): NewsListResult | null {
  pruneNewsReadCache(now);
  const hit = newsReadCache.get(key);
  if (!hit) return null;
  return hit.value;
}

function rememberNewsRead(key: string, value: NewsListResult, now: Date): void {
  if (value.failed) return;
  pruneNewsReadCache(now);
  newsReadCache.set(key, {
    expiresAt: now.getTime() + NEWS_READ_REVALIDATE_SECONDS * 1000,
    value,
  });
}

export async function loadNewsItems(input: {
  limit: number;
  now: Date;
  store?: NewsStore;
}): Promise<NewsListResult> {
  const key = newsReadCacheKey(input.limit);
  const cached = peekNewsReadCache(key, input.now);
  if (cached) return cached;

  if (!input.store && !isNewsAwsConfigured()) {
    return { rows: [], truncated: false, failed: true };
  }

  try {
    const store = input.store ?? createNewsAppStore();
    const [from, to] = probeRange(input.limit);
    const fetched = await store.queryFeed({ limit: to - from + 1, now: input.now });
    const unique = dedupeNewsHeadlines(
      fetched.items.filter((row) => newsInWindow(row.published_at, input.now)),
    );
    const probed = splitProbe(unique, input.limit);
    const loaded = {
      rows: probed.rows,
      truncated: probed.truncated || fetched.capped,
      failed: false,
    };
    rememberNewsRead(key, loaded, input.now);
    return loaded;
  } catch (err) {
    console.error(`[news:read] ${err instanceof Error ? err.message : err}`);
    return { rows: [], truncated: false, failed: true };
  }
}

export async function loadHomeNews(now: Date, store?: NewsStore): Promise<NewsItem[]> {
  const loaded = await loadNewsItems({ limit: NEWS_HOME_CAP, now, store });
  return overviewNewsHeadlines(loaded.failed ? [] : loaded.rows);
}

export async function loadNewsHistory(now: Date, store?: NewsStore): Promise<NewsListResult> {
  return loadNewsItems({ limit: UNPAGINATED_MAX, now, store });
}
