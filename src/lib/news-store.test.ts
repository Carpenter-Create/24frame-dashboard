import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { NEWS_HOME_CAP, NEWS_WINDOW_MS, newsItemTtlEpoch } from "./news";
import type { NormalizedNewsItem } from "./news-rss";
import { memoryNewsStore, mergeNewsImageUrl } from "./news-store";

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

const FLOOD_WWW =
  "https://www.joblo.com/wp-content/uploads/2026/09/zach-cregger-the-flood-2001.jpg";

function floodItem(image_url: string | null): NormalizedNewsItem {
  return {
    title: "Flood influence",
    url: "https://joblo.com/zach-cregger-the-flood-2001-influence",
    canonical_url: "https://joblo.com/zach-cregger-the-flood-2001-influence",
    source: "joblo",
    published_at: "2026-09-17T12:00:00.000Z",
    image_url,
    topic: "film",
  };
}

describe("mergeNewsImageUrl", () => {
  it("preserves an existing www thumb when incoming is null or empty", () => {
    expect(mergeNewsImageUrl(FLOOD_WWW, null)).toBe(FLOOD_WWW);
    expect(mergeNewsImageUrl(FLOOD_WWW, "")).toBe(FLOOD_WWW);
    expect(mergeNewsImageUrl(FLOOD_WWW, "   ")).toBe(FLOOD_WWW);
    expect(mergeNewsImageUrl(null, null)).toBeNull();
    expect(mergeNewsImageUrl(undefined, "")).toBeNull();
  });

  it("replaces an existing thumb when incoming is a new non-null URL", () => {
    const next = "https://www.joblo.com/wp-content/uploads/2026/09/replacement.jpg";
    expect(mergeNewsImageUrl(FLOOD_WWW, next)).toBe(next);
    expect(mergeNewsImageUrl(null, FLOOD_WWW)).toBe(FLOOD_WWW);
  });
});

describe("memoryNewsStore image_url merge", () => {
  it("upsert with null does not clear an existing www image_url", async () => {
    const store = memoryNewsStore();
    await store.upsertItems([floodItem(FLOOD_WWW)], NOW);
    await store.upsertItems([{ ...floodItem(null), title: "Flood influence again" }], NOW);
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Flood influence again");
    expect(rows[0]?.image_url).toBe(FLOOD_WWW);
  });

  it("upsert with a new non-null image_url replaces the old", async () => {
    const store = memoryNewsStore();
    await store.upsertItems([floodItem(FLOOD_WWW)], NOW);
    const next = "https://www.joblo.com/wp-content/uploads/2026/09/replacement.jpg";
    await store.upsertItems([floodItem(next)], NOW);
    const rows = await store.queryFeed({ limit: 20, now: NOW });
    expect(rows[0]?.image_url).toBe(next);
  });
});

describe("news-store source", () => {
  it("both persist stores merge image_url through mergeNewsImageUrl", () => {
    const src = readFileSync(new URL("./news-store.ts", import.meta.url), "utf8");
    expect([...src.matchAll(/image_url:\s*mergeNewsImageUrl\(/g)]).toHaveLength(2);
  });
});
