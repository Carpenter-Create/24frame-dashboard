import { beforeEach, describe, expect, it, vi } from "vitest";

import { NEWS_HOME_CAP } from "./news";
import {
  loadHomeNews,
  loadNewsItems,
  newsReadCacheKey,
  newsReadCacheSize,
  peekNewsReadCache,
  resetNewsReadCache,
} from "./news-load";
import { memoryNewsStore, type NewsFeedPage, type NewsStore } from "./news-store";

const NOW = new Date("2026-09-18T18:00:00.000Z");

function item(n: number, published_at: string, title = `Headline ${n}`) {
  return {
    id: `n${n}`,
    title,
    url: `https://variety.com/h${n}`,
    source: "variety" as const,
    published_at,
    image_url: null,
  };
}

beforeEach(() => {
  resetNewsReadCache();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadNewsItems", () => {
  it("caps Home at 15, hides rows outside 90 days, and does not fan out RSS", async () => {
    const store = memoryNewsStore([
      ...Array.from({ length: 16 }, (_, i) => item(i + 1, "2026-09-17T12:00:00.000Z")),
      item(99, "2026-06-01T12:00:00.000Z"),
    ]);
    const home = await loadHomeNews(NOW, store);
    expect(home).toHaveLength(NEWS_HOME_CAP);
    expect(home.every((row) => row.published_at >= "2026-06-20T18:00:00.000Z")).toBe(true);
    expect(home.some((row) => row.url.endsWith("/h99"))).toBe(false);
    expect(JSON.stringify(home)).not.toMatch(/summary/i);
  });

  it("dedupes the same source title so Home is not spammed", async () => {
    const store = memoryNewsStore([
      item(1, "2026-09-17T12:00:00.000Z", "Harbor Cut lands a festival slot"),
      {
        ...item(2, "2026-09-17T13:00:00.000Z", "Harbor Cut lands a festival slot"),
        url: "https://variety.com/harbor-cut-alt",
      },
    ]);
    const loaded = await loadNewsItems({ limit: 12, now: NOW, store });
    expect(loaded.rows).toHaveLength(1);
  });

  it("does not cache a failed read as empty news", async () => {
    const queryFeed = vi.fn<(input: { limit: number; now: Date }) => Promise<NewsFeedPage>>();
    queryFeed.mockRejectedValueOnce(new Error("boom"));
    const store: NewsStore = {
      queryFeed,
      upsertItems: vi.fn(),
      getHealth: vi.fn(),
      putHealth: vi.fn(),
      purgeBefore: vi.fn(),
    };
    const first = await loadNewsItems({ limit: 12, now: NOW, store });
    expect(first.failed).toBe(true);
    expect(first.rows).toEqual([]);
    expect(peekNewsReadCache(newsReadCacheKey(12), NOW)).toBeNull();

    queryFeed.mockResolvedValueOnce({
      items: [item(1, "2026-09-17T12:00:00.000Z")],
      capped: false,
    });
    const second = await loadNewsItems({ limit: 12, now: NOW, store });
    expect(second.failed).toBe(false);
    expect(second.rows).toHaveLength(1);
  });

  it("fail-softs when NEWS_AWS is unset and no store is passed", async () => {
    const loaded = await loadNewsItems({ limit: 12, now: NOW });
    expect(loaded.failed).toBe(true);
    expect(loaded.rows).toEqual([]);
    expect(peekNewsReadCache(newsReadCacheKey(12), NOW)).toBeNull();
  });

  it("keeps one live slot per limit and drops expired entries", async () => {
    const store = memoryNewsStore([item(1, "2026-09-17T12:00:00.000Z")]);
    await loadNewsItems({ limit: 12, now: NOW, store });
    await loadNewsItems({ limit: 30, now: NOW, store });
    expect(newsReadCacheSize()).toBe(2);
    const later = new Date(NOW.getTime() + 61_000);
    expect(peekNewsReadCache(newsReadCacheKey(12), later)).toBeNull();
    expect(newsReadCacheSize()).toBe(0);
    await loadNewsItems({ limit: 12, now: later, store });
    expect(newsReadCacheSize()).toBe(1);
  });
});
