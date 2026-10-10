import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  NEWS_HOME_CAP,
  NEWS_SOURCE_IDS,
  NEWS_WINDOW_MS,
  filterNewsBySources,
  newsItemTtlEpoch,
  type NewsSourceId,
} from "./news";
import { loadHomeNews, loadNewsHistory, loadNewsItems, resetNewsReadCache } from "./news-load";
import type { NormalizedNewsItem } from "./news-rss";
import {
  NEWS_FEED_MAX_PAGES,
  NEWS_FEED_PAGE_ROWS,
  memoryNewsStore,
  mergeNewsImageUrl,
  newsFeedQueryInput,
  readAllowlistedFeed,
} from "./news-store";

const NOW = new Date("2026-09-18T18:00:00.000Z");

function item(n: number, published_at: string): NormalizedNewsItem {
  return {
    title: `Headline ${n}`,
    url: `https://variety.com/h${n}`,
    canonical_url: `https://variety.com/h${n}`,
    source: "variety",
    published_at,
    image_url: null,
    topic: "film",
  };
}

describe("memoryNewsStore", () => {
  it("upserts the same canonical URL once and keeps Home at 15 inside 90 days", async () => {
    const store = memoryNewsStore();
    const first = item(1, "2026-09-17T12:00:00.000Z");
    await store.upsertItems([first], NOW);
    await store.upsertItems([{ ...first, title: "Headline 1 again" }], NOW);
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Headline 1 again");
    expect(newsItemTtlEpoch(first.published_at)).toBe(
      Math.floor((Date.parse(first.published_at) + NEWS_WINDOW_MS) / 1000),
    );

    const batch = Array.from({ length: 18 }, (_, i) =>
      item(i + 1, "2026-09-17T12:00:00.000Z"),
    );
    await store.upsertItems(batch, NOW);
    await store.upsertItems([item(99, "2026-06-01T12:00:00.000Z")], NOW);
    const home = await store.queryFeed({ limit: NEWS_HOME_CAP, now: NOW });
    expect(home).toHaveLength(NEWS_HOME_CAP);
    expect(home.every((row) => row.published_at >= "2026-06-20T18:00:00.000Z")).toBe(true);

    const windowed = await store.queryFeed({ limit: 50, now: NOW });
    expect(windowed.some((row) => row.url.endsWith("/h99"))).toBe(false);
    expect(await store.purgeBefore("2026-06-20T18:00:00.000Z")).toBe(1);
  });
});

const STORED_THUMB = "https://variety.com/thumbs/harbor.jpg";

function thumbItem(image_url: string | null): NormalizedNewsItem {
  return {
    title: "Harbor Cut",
    url: "https://variety.com/harbor-cut",
    canonical_url: "https://variety.com/harbor-cut",
    source: "variety",
    published_at: "2026-09-17T12:00:00.000Z",
    image_url,
    topic: "film",
  };
}

describe("mergeNewsImageUrl", () => {
  it("preserves an existing thumb when incoming is null or empty", () => {
    expect(mergeNewsImageUrl(STORED_THUMB, null)).toBe(STORED_THUMB);
    expect(mergeNewsImageUrl(STORED_THUMB, "")).toBe(STORED_THUMB);
    expect(mergeNewsImageUrl(STORED_THUMB, "   ")).toBe(STORED_THUMB);
    expect(mergeNewsImageUrl(null, null)).toBeNull();
    expect(mergeNewsImageUrl(undefined, "")).toBeNull();
  });

  it("replaces an existing thumb when incoming is a new non-null URL", () => {
    const next = "https://variety.com/thumbs/replacement.jpg";
    expect(mergeNewsImageUrl(STORED_THUMB, next)).toBe(next);
    expect(mergeNewsImageUrl(null, STORED_THUMB)).toBe(STORED_THUMB);
  });
});

describe("memoryNewsStore image_url merge", () => {
  it("upsert with null does not clear an existing image_url", async () => {
    const store = memoryNewsStore();
    await store.upsertItems([thumbItem(STORED_THUMB)], NOW);
    await store.upsertItems([{ ...thumbItem(null), title: "Harbor Cut again" }], NOW);
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Harbor Cut again");
    expect(rows[0]?.image_url).toBe(STORED_THUMB);
  });

  it("upsert with a new non-null image_url replaces the old", async () => {
    const store = memoryNewsStore();
    await store.upsertItems([thumbItem(STORED_THUMB)], NOW);
    const next = "https://variety.com/thumbs/replacement.jpg";
    await store.upsertItems([thumbItem(next)], NOW);
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows[0]?.image_url).toBe(next);
  });

  it("filters a stored JoBlo row out of the feed", async () => {
    // Retired outlet. Stored rows still carry the string; the read path
    // drops any source that is not on the allowlist.
    const retired = "https://joblo.com/zach-cregger-the-flood-2001-influence";
    const store = memoryNewsStore();
    await store.upsertItems(
      [
        thumbItem(STORED_THUMB),
        {
          title: "Flood influence",
          url: retired,
          canonical_url: retired,
          source: "joblo" as NewsSourceId,
          published_at: "2026-09-17T13:00:00.000Z",
          image_url: "https://www.joblo.com/wp-content/uploads/thumb.jpg",
          topic: "film",
        },
      ],
      NOW,
    );
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows.map((row) => row.url)).toEqual(["https://variety.com/harbor-cut"]);
    resetNewsReadCache();
    const home = await loadHomeNews(NOW, store);
    const history = await loadNewsHistory(NOW, store);
    expect(home.map((row) => row.url)).toEqual(["https://variety.com/harbor-cut"]);
    expect(history.rows.map((row) => row.url)).toEqual(["https://variety.com/harbor-cut"]);
    expect(JSON.stringify({ home, history })).not.toMatch(/joblo/i);
  });
});

describe("news-store source", () => {
  it("both persist stores merge image_url through mergeNewsImageUrl", () => {
    const src = readFileSync(new URL("./news-store.ts", import.meta.url), "utf8");
    expect([...src.matchAll(/image_url:\s*mergeNewsImageUrl\(/g)]).toHaveLength(2);
  });
});

function feedRow(input: {
  n: number;
  source: string;
  published_at: string;
  host?: string;
}) {
  const host = input.host ?? "variety.com";
  const url = `https://${host}/h${input.n}`;
  return {
    id: url,
    title: `Headline ${input.n}`,
    url,
    canonical_url: url,
    source: input.source as NewsSourceId,
    published_at: input.published_at,
    image_url: null,
    topic: "film" as const,
  };
}

describe("allowlisted feed page", () => {
  it("returns 15 valid headlines when JoBlo rows lead the window", async () => {
    const store = memoryNewsStore();
    const joblo = Array.from({ length: NEWS_FEED_PAGE_ROWS }, (_, i) =>
      feedRow({
        n: i,
        source: "joblo",
        host: "joblo.com",
        published_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }),
    );
    const variety = Array.from({ length: NEWS_HOME_CAP + 1 }, (_, i) =>
      feedRow({
        n: 100 + i,
        source: "variety",
        published_at: new Date(NOW.getTime() - (120 + i) * 1000).toISOString(),
      }),
    );
    await store.upsertItems([...joblo, ...variety], NOW);

    const page = await store.queryFeed({ limit: NEWS_HOME_CAP, now: NOW });
    const next = await store.queryFeed({ limit: NEWS_HOME_CAP + 1, now: NOW });
    expect(page.map((row) => row.url)).toEqual(variety.slice(0, NEWS_HOME_CAP).map((row) => row.url));
    expect(next.map((row) => row.url)).toEqual(variety.map((row) => row.url));
    expect(next[NEWS_HOME_CAP]?.url).toBe(variety[NEWS_HOME_CAP]?.url);
    expect(page.every((row) => row.source === "variety")).toBe(true);

    resetNewsReadCache();
    const home = await loadHomeNews(NOW, store);
    const loaded = await loadNewsItems({ limit: NEWS_HOME_CAP, now: NOW, store });
    const history = await loadNewsHistory(NOW, store);
    expect(home.map((row) => row.url)).toEqual(page.map((row) => row.url));
    expect(loaded.truncated).toBe(true);
    expect(loaded.rows.map((row) => row.url)).toEqual(page.map((row) => row.url));
    expect(filterNewsBySources(history.rows, ["variety"]).map((row) => row.url)).toEqual(
      variety.map((row) => row.url),
    );
    expect(JSON.stringify({ home, loaded, history })).not.toMatch(/joblo/i);
  });

  it("returns the shorter feed when valid rows run out", async () => {
    const store = memoryNewsStore();
    const joblo = Array.from({ length: 8 }, (_, i) =>
      feedRow({
        n: i,
        source: "joblo",
        host: "joblo.com",
        published_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }),
    );
    const variety = Array.from({ length: 4 }, (_, i) =>
      feedRow({
        n: 100 + i,
        source: "variety",
        published_at: new Date(NOW.getTime() - (120 + i) * 1000).toISOString(),
      }),
    );
    await store.upsertItems([...joblo, ...variety], NOW);
    const rows = await store.queryFeed({ limit: NEWS_HOME_CAP, now: NOW });
    expect(rows.map((row) => row.url)).toEqual(variety.map((row) => row.url));
    resetNewsReadCache();
    const home = await loadHomeNews(NOW, store);
    expect(home).toHaveLength(4);
    expect(home.map((row) => row.url)).toEqual(variety.map((row) => row.url));
  });

  it("follows the page cursor past a full page of hidden rows", async () => {
    const hidden = Array.from({ length: NEWS_FEED_PAGE_ROWS }, (_, i) =>
      feedRow({
        n: i,
        source: "joblo",
        host: "joblo.com",
        published_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }),
    );
    const variety = Array.from({ length: NEWS_HOME_CAP + 1 }, (_, i) =>
      feedRow({
        n: 100 + i,
        source: "variety",
        published_at: new Date(NOW.getTime() - (120 + i) * 1000).toISOString(),
      }),
    );
    const pages = [hidden, variety];
    const cursors: Array<{ page: number } | null> = [];
    const rows = await readAllowlistedFeed({
      limit: NEWS_HOME_CAP,
      queryPage: async (cursor?: { page: number }) => {
        cursors.push(cursor ?? null);
        const index = cursor?.page ?? 0;
        const next = index + 1 < pages.length ? { page: index + 1 } : null;
        return { items: pages[index] ?? [], cursor: next };
      },
    });
    expect(cursors).toEqual([null, { page: 1 }]);
    expect(rows.map((row) => row.url)).toEqual(
      variety.slice(0, NEWS_HOME_CAP).map((row) => row.url),
    );
  });

  it("stops at the page cap when the cursor never ends", async () => {
    let calls = 0;
    const rows = await readAllowlistedFeed({
      limit: NEWS_HOME_CAP,
      queryPage: async () => {
        calls += 1;
        return {
          items: [
            feedRow({
              n: calls,
              source: "joblo",
              host: "joblo.com",
              published_at: NOW.toISOString(),
            }),
          ],
          cursor: { page: calls },
        };
      },
    });
    expect(rows).toEqual([]);
    expect(calls).toBe(NEWS_FEED_MAX_PAGES);
  });

  it("queries a page of raw rows and resumes from LastEvaluatedKey", () => {
    const now = NOW;
    const first = newsFeedQueryInput({ table: "24frame-news-dev", now });
    expect(first.Limit).toBe(NEWS_FEED_PAGE_ROWS);
    expect(first.Limit).not.toBe(NEWS_HOME_CAP);
    expect(first.ScanIndexForward).toBe(false);
    expect(first.ExclusiveStartKey).toBeUndefined();
    expect(first.FilterExpression).toContain("#src IN (");
    expect(Object.values(first.ExpressionAttributeValues)).toEqual(
      expect.arrayContaining([...NEWS_SOURCE_IDS]),
    );
    expect(Object.values(first.ExpressionAttributeValues)).not.toContain("joblo");
    const cursor = { gsi1pk: "FEED", gsi1sk: "2026-09-17T12:00:00.000Z#https://variety.com/h1" };
    const next = newsFeedQueryInput({ table: "24frame-news-dev", now, cursor });
    expect(next.ExclusiveStartKey).toEqual(cursor);
    expect(next.Limit).toBe(NEWS_FEED_PAGE_ROWS);
  });
});
