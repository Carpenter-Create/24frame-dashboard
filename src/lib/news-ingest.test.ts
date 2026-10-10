import { describe, expect, it, vi } from "vitest";

import { NEWS_SOURCES } from "./news";
import {
  NEWS_OG_CONCURRENCY,
  NEWS_OG_MAX_BYTES,
  NEWS_OG_TIMEOUT_MS,
  NEWS_USER_AGENT,
  countNewsOgFill,
  fetchNewsArticleHtml,
  fillNewsOgImages,
  ingestNewsFeeds,
  newsItemNeedsOg,
  resolveNewsOgMaxBytes,
} from "./news-ingest";
import { newsThumbObjectKey } from "./news-thumbs";
import { loadHomeNews, loadNewsHistory, resetNewsReadCache } from "./news-load";
import type { NormalizedNewsItem } from "./news-rss";
import { memoryNewsStore } from "./news-store";

const NOW = new Date("2026-09-18T18:00:00.000Z");

const FEED = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Live film item</title>
      <link>https://variety.com/2026/film/news/live-item/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const VARIETY_FILM_FEED = "https://variety.com/v/film/feed/";
const VARIETY_TV_FEED = "https://variety.com/v/tv/feed/";
const DEADLINE_FILM_FEED = "https://deadline.com/v/film/feed/";
const THR_MOVIES_FEED = "https://www.hollywoodreporter.com/movies/feed/";

function liveItem(): NormalizedNewsItem {
  return {
    title: "Live film item",
    url: "https://variety.com/2026/film/news/live-item",
    canonical_url: "https://variety.com/2026/film/news/live-item",
    source: "variety",
    published_at: "2026-09-17T12:00:00.000Z",
    image_url: null,
    topic: "film",
  };
}

const EXPECTED_FEED_CALLS = NEWS_SOURCES.reduce((sum, row) => sum + row.feedUrls.length, 0);

describe("ingestNewsFeeds", () => {
  it("fails soft per source, skips a killed source, and upserts the rest", async () => {
    const persist = memoryNewsStore();
    await persist.putHealth({
      source: "indiewire",
      enabled: false,
      last_success_at: null,
      last_error: null,
      last_error_at: null,
    });
    const fetchXml = vi.fn(async (url: string) => {
      if (url === DEADLINE_FILM_FEED) throw new Error("timeout");
      return FEED;
    });

    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml,
      fetchOgHtml: async () => null,
    });

    const indiewireFeeds = NEWS_SOURCES.find((row) => row.id === "indiewire")?.feedUrls.length ?? 0;
    expect(fetchXml).toHaveBeenCalledTimes(EXPECTED_FEED_CALLS - indiewireFeeds);
    expect(fetchXml.mock.calls.flat()).not.toContain("https://www.indiewire.com/feed/");
    expect(summary.sources).toBe(NEWS_SOURCES.length);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.results.find((row) => row.source === "deadline")?.error).toBe("timeout");
    expect(summary.results.find((row) => row.source === "indiewire")?.skipped).toBe(true);
    expect(summary.inserted).toBeGreaterThan(0);
    expect((await persist.getHealth("deadline"))?.last_error).toBe("timeout");
    expect((await persist.getHealth("variety"))?.last_success_at).toBe(NOW.toISOString());
  });

  it("upserts the same canonical URL once and purges rows older than 90 days", async () => {
    const persist = memoryNewsStore();
    await persist.upsertItems(
      [
        liveItem(),
        {
          ...liveItem(),
          title: "Old headline",
          url: "https://variety.com/2026/film/news/old",
          canonical_url: "https://variety.com/2026/film/news/old",
          published_at: "2026-06-01T12:00:00.000Z",
        },
      ],
      NOW,
    );
    const first = liveItem();
    await persist.upsertItems([first], NOW);
    await persist.upsertItems([{ ...first, title: "Live item again" }], NOW);
    const fetchXml = vi.fn(async () => FEED);
    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml,
      fetchOgHtml: async () => null,
    });
    expect(summary.purged).toBe(1);
    expect(await persist.purgeBefore("2026-06-20T18:00:00.000Z")).toBe(0);
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(rows.filter((row) => row.url === liveItem().url)).toHaveLength(1);
  });

  it("drops music/other candidates at the topic gate before Dynamo write", async () => {
    const persist = memoryNewsStore();
    const mixed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Chris Brown sued over 2024 after-party incident</title>
      <link>https://www.hollywoodreporter.com/music/music-news/chris-brown-2024-lawsuit/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Zach Cregger's 'The Flood' lands a summer 2027 slot</title>
      <link>https://www.hollywoodreporter.com/movies/movie-news/zach-cregger-the-flood-2027/</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? mixed : EMPTY_FEED),
      fetchOgHtml: async () => null,
    });
    const hr = summary.results.find((row) => row.source === "hollywood-reporter");
    expect(hr?.droppedByTopic).toBeGreaterThanOrEqual(1);
    expect(hr?.fetched).toBe(1);
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    const urls = rows.map((row) => row.url);
    expect(urls).toContain("https://hollywoodreporter.com/movies/movie-news/zach-cregger-the-flood-2027");
    expect(urls.some((url) => url.includes("/music/"))).toBe(false);
  });

  it("iterates every configured feed URL per source and merges parsed items", async () => {
    const persist = memoryNewsStore();
    const filmXml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Studio picks up remake rights</title>
      <link>https://variety.com/2026/film/news/studio-remake/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const tvXml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Streamer renews limited series for season two</title>
      <link>https://variety.com/2026/tv/news/streamer-renews-series/</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const fetchXml = vi.fn(async (url: string) => {
      if (url === VARIETY_FILM_FEED) return filmXml;
      if (url === VARIETY_TV_FEED) return tvXml;
      return EMPTY_FEED;
    });
    await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml,
      fetchOgHtml: async () => null,
    });
    expect(fetchXml.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([VARIETY_FILM_FEED, VARIETY_TV_FEED]),
    );
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    const varietyUrls = rows.filter((row) => row.source === "variety").map((row) => row.url);
    expect(varietyUrls).toEqual(
      expect.arrayContaining([
        "https://variety.com/2026/film/news/studio-remake",
        "https://variety.com/2026/tv/news/streamer-renews-series",
      ]),
    );
  });

  it("keeps the source healthy when one section feed fails and another succeeds", async () => {
    const persist = memoryNewsStore();
    const filmXml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Studio picks up remake rights</title>
      <link>https://variety.com/2026/film/news/studio-remake/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) => {
        if (url === VARIETY_FILM_FEED) return filmXml;
        if (url === VARIETY_TV_FEED) throw new Error("timeout");
        return EMPTY_FEED;
      },
      fetchOgHtml: async () => null,
    });
    const variety = summary.results.find((row) => row.source === "variety");
    expect(variety?.error).toBeUndefined();
    expect(variety?.fetched).toBeGreaterThan(0);
    expect((await persist.getHealth("variety"))?.last_success_at).toBe(NOW.toISOString());
  });

  it("does not ingest JoBlo", async () => {
    expect(NEWS_SOURCES.map((source) => source.id)).not.toContain("joblo");
    expect(
      NEWS_SOURCES.flatMap((source) => source.feedUrls).some((url) => /joblo/i.test(url)),
    ).toBe(false);
    const fetchXml = vi.fn(async () => EMPTY_FEED);
    await ingestNewsFeeds({
      persist: memoryNewsStore(),
      now: NOW,
      fetchXml,
      fetchOgHtml: async () => null,
    });
    expect(
      fetchXml.mock.calls.flat().some((url) => String(url).toLowerCase().includes("joblo")),
    ).toBe(false);
  });
});

const EMPTY_FEED = `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`;

const FEED_WITH_THUMB = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <item>
      <title>Has RSS image</title>
      <link>https://variety.com/2026/film/news/has-thumb/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
      <media:thumbnail url="https://variety.com/thumbs/rss.jpg" />
    </item>
  </channel>
</rss>`;

const FEED_NO_THUMB = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Needs OG</title>
      <link>https://hollywoodreporter.com/movies/movie-news/needs-og/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

function varietyOnlyXml(feed: string) {
  return async (url: string) => (url === VARIETY_FILM_FEED ? feed : EMPTY_FEED);
}

describe("ingest OG images", () => {
  it("does not scrape when RSS already has an image", async () => {
    const persist = memoryNewsStore();
    const fetchOgHtml = vi.fn(async () => {
      throw new Error("should not scrape");
    });
    await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: varietyOnlyXml(FEED_WITH_THUMB),
      fetchOgHtml,
    });
    expect(fetchOgHtml).not.toHaveBeenCalled();
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(rows[0]?.image_url).toBe("https://variety.com/thumbs/rss.jpg");
  });

  it("OG-scrapes when RSS has no image and stores the absolute https URL", async () => {
    const persist = memoryNewsStore();
    const fetchOgHtml = vi.fn(async (url: string) => {
      expect(url).toBe("https://hollywoodreporter.com/movies/movie-news/needs-og");
      return `<html><head><meta property="og:image" content="http://www.thr.com/og.jpg" /></head></html>`;
    });
    await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) =>
        url === THR_MOVIES_FEED ? FEED_NO_THUMB : EMPTY_FEED,
      fetchOgHtml,
    });
    expect(fetchOgHtml).toHaveBeenCalledTimes(1);
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(rows[0]?.image_url).toBe("https://thr.com/og.jpg");
  });

  it("keeps a grey plate when OG scrape fails and does not fail the source", async () => {
    const persist = memoryNewsStore();
    const fetchOgHtml = vi.fn(async () => {
      throw new Error("timeout");
    });
    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) =>
        url === THR_MOVIES_FEED ? FEED_NO_THUMB : EMPTY_FEED,
      fetchOgHtml,
    });
    expect(summary.failed).toBe(0);
    expect(summary.results.find((row) => row.source === "hollywood-reporter")?.error).toBeUndefined();
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(rows[0]?.image_url).toBeNull();
  });

  it("counts ogAttempted, ogFilled, and ogMiss per source in the ingest log", async () => {
    const persist = memoryNewsStore();
    const mixed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Hit</title>
      <link>https://hollywoodreporter.com/movies/movie-news/hit/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Miss</title>
      <link>https://hollywoodreporter.com/movies/movie-news/miss/</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const logs: Array<Record<string, unknown>> = [];
    const spy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
      if (typeof msg === "string") {
        try {
          logs.push(JSON.parse(msg) as Record<string, unknown>);
        } catch {
          /* ignore */
        }
      }
    });
    try {
      const summary = await ingestNewsFeeds({
        persist,
        now: NOW,
        fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? mixed : EMPTY_FEED),
        fetchOgHtml: async (url: string) =>
          url === "https://hollywoodreporter.com/movies/movie-news/miss"
            ? null
            : `<meta property="og:image" content="https://thr.com/hit.jpg" />`,
      });
      const hr = summary.results.find((row) => row.source === "hollywood-reporter");
      expect(hr).toMatchObject({ ogAttempted: 2, ogFilled: 1, ogMiss: 1 });
      const variety = summary.results.find((row) => row.source === "variety");
      expect(variety).toMatchObject({ ogAttempted: 0, ogFilled: 0, ogMiss: 0 });
      expect(
        logs.find((row) => row.msg === "news ingest source" && row.source === "hollywood-reporter"),
      ).toMatchObject({ ogAttempted: 2, ogFilled: 1, ogMiss: 1 });
    } finally {
      spy.mockRestore();
    }
  });

  it("scrapes missing images independently — one miss does not drop a sibling hit", async () => {
    const persist = memoryNewsStore();
    const mixed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Hit</title>
      <link>https://hollywoodreporter.com/movies/movie-news/hit/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Miss</title>
      <link>https://hollywoodreporter.com/movies/movie-news/miss/</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;
    const fetchOgHtml = vi.fn(async (url: string) => {
      if (url === "https://hollywoodreporter.com/movies/movie-news/miss") throw new Error("timeout");
      return `<meta property="og:image" content="https://thr.com/hit.jpg" />`;
    });
    const summary = await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? mixed : EMPTY_FEED),
      fetchOgHtml,
    });
    expect(summary.failed).toBe(0);
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(
      rows.find((row) => row.url === "https://hollywoodreporter.com/movies/movie-news/hit")?.image_url,
    ).toBe("https://thr.com/hit.jpg");
    expect(
      rows.find((row) => row.url === "https://hollywoodreporter.com/movies/movie-news/miss")?.image_url,
    ).toBeNull();
  });

  it("persists scraped image_url so Home and history reads show the thumb", async () => {
    resetNewsReadCache();
    const persist = memoryNewsStore();
    await ingestNewsFeeds({
      persist,
      now: NOW,
      fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? FEED_NO_THUMB : EMPTY_FEED),
      fetchOgHtml: async () =>
        `<meta property="og:image" content="https://thr.com/og.jpg" />`,
    });
    const home = await loadHomeNews(NOW, persist);
    const history = await loadNewsHistory(NOW, persist);
    expect(home[0]?.image_url).toBe("https://thr.com/og.jpg");
    expect(history.rows[0]?.image_url).toBe("https://thr.com/og.jpg");
  });

  it("mirrors a resolved thumb to CloudFront and persists that URL", async () => {
    const persist = memoryNewsStore();
    const putThumb = vi.fn(async () => undefined);
    const prevCf = process.env.CLOUDFRONT_DOMAIN;
    process.env.CLOUDFRONT_DOMAIN = "https://delivery.globalcontent.co";
    try {
      await ingestNewsFeeds({
        persist,
        now: NOW,
        fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? FEED_NO_THUMB : EMPTY_FEED),
        fetchOgHtml: async () =>
          `<meta property="og:image" content="https://www.hollywoodreporter.com/og.jpg" />`,
        fetchThumb: async () =>
          new Response(new Uint8Array(64).fill(1), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        putThumb,
      });
    } finally {
      if (prevCf === undefined) delete process.env.CLOUDFRONT_DOMAIN;
      else process.env.CLOUDFRONT_DOMAIN = prevCf;
    }
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    const key = newsThumbObjectKey(
      "hollywood-reporter",
      "https://hollywoodreporter.com/movies/movie-news/needs-og",
      "jpg",
    );
    expect(putThumb).toHaveBeenCalledTimes(1);
    expect(rows[0]?.image_url).toBe(`https://delivery.globalcontent.co/${key}`);
  });

  it("keeps the remote thumb when the mirror PutObject fails", async () => {
    const persist = memoryNewsStore();
    let puts = 0;
    const prevCf = process.env.CLOUDFRONT_DOMAIN;
    process.env.CLOUDFRONT_DOMAIN = "https://delivery.globalcontent.co";
    try {
      await ingestNewsFeeds({
        persist,
        now: NOW,
        fetchXml: async (url: string) => (url === THR_MOVIES_FEED ? FEED_NO_THUMB : EMPTY_FEED),
        fetchOgHtml: async () =>
          `<meta property="og:image" content="https://www.hollywoodreporter.com/og.jpg" />`,
        fetchThumb: async () =>
          new Response(new Uint8Array(64).fill(1), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        putThumb: async () => {
          puts += 1;
          throw new Error("AccessDenied");
        },
      });
    } finally {
      if (prevCf === undefined) delete process.env.CLOUDFRONT_DOMAIN;
      else process.env.CLOUDFRONT_DOMAIN = prevCf;
    }
    const rows = await persist.queryFeed({ limit: 20, now: NOW });
    expect(puts).toBe(1);
    expect(rows[0]?.image_url).toBe("https://hollywoodreporter.com/og.jpg");
  });
});

describe("fetchNewsArticleHtml", () => {
  it("uses a 12s hard timeout and fail-softs to null", async () => {
    expect(NEWS_OG_TIMEOUT_MS).toBe(12_000);
    expect(NEWS_OG_MAX_BYTES).toBe(1_500_000);
    expect(NEWS_OG_CONCURRENCY).toBe(4);
    const html = await fetchNewsArticleHtml("https://hollywoodreporter.com/story", {
      fetchImpl: async () => {
        throw new Error("aborted");
      },
    });
    expect(html).toBeNull();
    expect(
      await fetchNewsArticleHtml("https://hollywoodreporter.com/story", {
        fetchImpl: async () => new Response("nope", { status: 503 }),
      }),
    ).toBeNull();
    expect(await fetchNewsArticleHtml("http://hollywoodreporter.com/story")).toBeNull();
  });

  it("snapshots the desktop Chrome user-agent (publishers gate on bot UA)", () => {
    expect(NEWS_USER_AGENT).toBe(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );
    expect(NEWS_USER_AGENT).not.toContain("24FrameNews");
  });

  it("defaults NEWS_OG_MAX_BYTES to 1.5MB and honors a positive env override", () => {
    expect(resolveNewsOgMaxBytes({})).toBe(1_500_000);
    expect(resolveNewsOgMaxBytes({ NEWS_OG_MAX_BYTES: "2000000" })).toBe(2_000_000);
    expect(resolveNewsOgMaxBytes({ NEWS_OG_MAX_BYTES: "nope" })).toBe(1_500_000);
    expect(resolveNewsOgMaxBytes({ NEWS_OG_MAX_BYTES: "0" })).toBe(1_500_000);
  });

  it("keeps HTML past 512KB so a late og:image is still parsed", async () => {
    const padding = `<!--${"x".repeat(520_000)}-->`;
    const html = `<html><head></head><body>${padding}<meta property="og:image" content="https://thr.com/late.jpg" /></body></html>`;
    const [kept] = await fillNewsOgImages([liveItem()], {
      fetchImpl: async () => new Response(html, { status: 200 }),
    });
    expect(kept?.image_url).toBe("https://thr.com/late.jpg");
    const [truncated] = await fillNewsOgImages([liveItem()], {
      fetchImpl: async () => new Response(html, { status: 200 }),
      maxBytes: 512_000,
    });
    expect(truncated?.image_url).toBeNull();
  });

  it("settles null when fetch hangs past the hard timeout", async () => {
    const started = Date.now();
    const html = await fetchNewsArticleHtml("https://hollywoodreporter.com/story", {
      timeoutMs: 40,
      fetchImpl: () => new Promise(() => {}),
    });
    expect(html).toBeNull();
    expect(Date.now() - started).toBeLessThan(400);
  });
});

describe("fillNewsOgImages", () => {
  it("fetches article HTML and parses og:image through the real ingest helpers", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe(liveItem().url);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const headers = new Headers(init?.headers);
      expect(headers.get("user-agent")).toBe(NEWS_USER_AGENT);
      return new Response(
        `<html><head><meta property="og:image" content="//cdn.variety.com/live.jpg" /></head></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const [row] = await fillNewsOgImages([liveItem()], { fetchImpl });
    expect(row?.image_url).toBe("https://cdn.variety.com/live.jpg");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("parses twitter:image when og:image is absent", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response(`<meta name="twitter:image" content="/tw.jpg" />`, { status: 200 }),
    );
    const [row] = await fillNewsOgImages([liveItem()], { fetchImpl });
    expect(row?.image_url).toBe("https://variety.com/tw.jpg");
  });

  it("keeps a concurrency cap so one slow article does not pin the rest", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 6 }, (_, i) => ({
      ...liveItem(),
      title: `Live ${i}`,
      url: `https://variety.com/live-${i}`,
      canonical_url: `https://variety.com/live-${i}`,
    }));
    await fillNewsOgImages(items, {
      fetchHtml: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight -= 1;
        return `<meta property="og:image" content="https://variety.com/x.jpg" />`;
      },
    });
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(NEWS_OG_CONCURRENCY);
  });

  it("skips items that already have image_url", async () => {
    const fetchHtml = vi.fn(async () => {
      throw new Error("should not scrape");
    });
    const [kept] = await fillNewsOgImages(
      [{ ...liveItem(), image_url: "https://variety.com/thumbs/rss.jpg" }],
      { fetchHtml },
    );
    expect(kept?.image_url).toBe("https://variety.com/thumbs/rss.jpg");
    expect(fetchHtml).not.toHaveBeenCalled();
    expect(newsItemNeedsOg({ image_url: "https://variety.com/x.jpg" })).toBe(false);
    expect(newsItemNeedsOg({ image_url: null })).toBe(true);
  });

  it("counts RSS-null items as OG attempts", () => {
    expect(
      countNewsOgFill(
        [
          { ...liveItem(), image_url: "https://variety.com/thumbs/rss.jpg" },
          liveItem(),
        ],
        [
          { ...liveItem(), image_url: "https://variety.com/thumbs/rss.jpg" },
          { ...liveItem(), image_url: "https://variety.com/og.jpg" },
        ],
      ),
    ).toEqual({ ogAttempted: 1, ogFilled: 1, ogMiss: 0 });
  });
});
