import { describe, expect, it, vi } from "vitest";

import { NEWS_SOURCES } from "./news";
import {
  NEWS_EGRESS_MAX_REDIRECTS,
  assertNewsEgressUrl,
  isNewsEgressAllowlistedHost,
  isPublicIpAddress,
  newsEgressFetch,
} from "./news-egress";
import { fetchNewsArticleHtml, fetchNewsFeedXml } from "./news-ingest";
import { fetchNewsThumbBytes } from "./news-thumbs";

const PUBLIC_LOOKUP = async () => ({ address: "1.1.1.1", family: 4 });
const META_LOOKUP = async () => ({ address: "169.254.169.254", family: 4 });

describe("news egress (P0-3)", () => {
  it("allows public IPv4 and rejects RFC1918 / link-local / metadata", () => {
    expect(isPublicIpAddress("1.1.1.1")).toBe(true);
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("10.0.0.1")).toBe(false);
    expect(isPublicIpAddress("127.0.0.1")).toBe(false);
    expect(isPublicIpAddress("192.168.1.1")).toBe(false);
    expect(isPublicIpAddress("172.16.0.1")).toBe(false);
    expect(isPublicIpAddress("169.254.169.254")).toBe(false);
    expect(isPublicIpAddress("100.64.0.1")).toBe(false);
    expect(isPublicIpAddress("0.0.0.0")).toBe(false);
    expect(isPublicIpAddress("::1")).toBe(false);
    expect(isPublicIpAddress("::ffff:10.1.1.1")).toBe(false);
    expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
  });

  it("rejects http, credentials, localhost, and private DNS answers", async () => {
    await expect(assertNewsEgressUrl("http://variety.com/feed")).rejects.toThrow(/https/);
    await expect(assertNewsEgressUrl("https://user:pass@variety.com/feed")).rejects.toThrow(
      /credentials/,
    );
    await expect(assertNewsEgressUrl("https://localhost/feed")).rejects.toThrow(/not public/);
    await expect(assertNewsEgressUrl("https://169.254.169.254/latest")).rejects.toThrow(
      /not public/,
    );
    await expect(
      assertNewsEgressUrl("https://evil.example/og", { lookup: META_LOOKUP }),
    ).rejects.toThrow(/private address/);
    await expect(
      assertNewsEgressUrl("https://variety.com/v/film/feed/", { lookup: PUBLIC_LOOKUP }),
    ).resolves.toMatchObject({ hostname: "variety.com" });
  });

  it("caps redirects and re-checks each hop", async () => {
    expect(NEWS_EGRESS_MAX_REDIRECTS).toBe(3);
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const href = String(input);
      if (href.endsWith("/one")) {
        return new Response(null, { status: 302, headers: { location: "/two" } });
      }
      if (href.endsWith("/two")) {
        return new Response(null, { status: 302, headers: { location: "/three" } });
      }
      if (href.endsWith("/three")) {
        return new Response(null, { status: 302, headers: { location: "/four" } });
      }
      if (href.endsWith("/four")) {
        return new Response(null, { status: 302, headers: { location: "/five" } });
      }
      return new Response("ok", { status: 200 });
    });
    await expect(
      newsEgressFetch("https://variety.com/one", {
        fetchImpl,
        lookup: PUBLIC_LOOKUP,
        request: {},
      }),
    ).rejects.toThrow(/redirect cap/);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    const fetchMeta = vi.fn<typeof fetch>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://169.254.169.254/latest/meta-data" },
        }),
    );
    await expect(
      newsEgressFetch("https://variety.com/og", {
        fetchImpl: fetchMeta,
        lookup: PUBLIC_LOOKUP,
        request: {},
      }),
    ).rejects.toThrow(/not public/);
  });

  it("feed / OG / thumbs use the egress helper — no follow-without-check", async () => {
    const xml = await fetchNewsFeedXml("https://variety.com/v/film/feed/", {
      fetchImpl: async () => new Response("<rss/>", { status: 200 }),
      lookup: PUBLIC_LOOKUP,
    });
    expect(xml).toBe("<rss/>");
    await expect(
      fetchNewsFeedXml("https://variety.com/v/film/feed/", {
        fetchImpl: async () => new Response("<rss/>", { status: 200 }),
        lookup: META_LOOKUP,
      }),
    ).rejects.toThrow(/private address/);

    expect(
      await fetchNewsArticleHtml("https://variety.com/story", {
        fetchImpl: async () => new Response("<html/>", { status: 200 }),
        lookup: META_LOOKUP,
      }),
    ).toBeNull();

    await expect(
      fetchNewsThumbBytes("https://cdn.example/a.jpg", {
        fetchImpl: async () =>
          new Response(new Uint8Array(64).fill(1), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        lookup: META_LOOKUP,
      }),
    ).rejects.toThrow(/private address/);
  });

  it("rejects public hosts outside the NEWS_SOURCES allowlist (GC-P2-5)", async () => {
    await expect(
      assertNewsEgressUrl("https://evil.example/og", { lookup: PUBLIC_LOOKUP }),
    ).rejects.toThrow(/not allowlisted/);
    await expect(
      assertNewsEgressUrl("https://cdn.variety.com/thumb.jpg", { lookup: PUBLIC_LOOKUP }),
    ).rejects.toThrow(/not allowlisted/);
    await expect(
      assertNewsEgressUrl("https://variety.com.evil.example/feed", { lookup: PUBLIC_LOOKUP }),
    ).rejects.toThrow(/not allowlisted/);
    await expect(assertNewsEgressUrl("https://8.8.8.8/latest")).rejects.toThrow(/not allowlisted/);

    await expect(
      assertNewsEgressUrl("https://variety.com/v/film/feed/", { lookup: PUBLIC_LOOKUP }),
    ).resolves.toMatchObject({ hostname: "variety.com" });
    await expect(
      assertNewsEgressUrl("https://www.indiewire.com/feed/", { lookup: PUBLIC_LOOKUP }),
    ).resolves.toMatchObject({ hostname: "www.indiewire.com" });
    await expect(
      assertNewsEgressUrl("https://indiewire.com/2026/feature", { lookup: PUBLIC_LOOKUP }),
    ).resolves.toMatchObject({ hostname: "indiewire.com" });
    await expect(
      assertNewsEgressUrl("https://joblo.com/feed/", { lookup: PUBLIC_LOOKUP }),
    ).rejects.toThrow(/not allowlisted/);
    await expect(
      assertNewsEgressUrl("https://www.joblo.com/feed/", { lookup: PUBLIC_LOOKUP }),
    ).rejects.toThrow(/not allowlisted/);

    const fetchEvil = vi.fn<typeof fetch>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/og" },
        }),
    );
    await expect(
      newsEgressFetch("https://variety.com/og", {
        fetchImpl: fetchEvil,
        lookup: PUBLIC_LOOKUP,
        request: {},
      }),
    ).rejects.toThrow(/not allowlisted/);
    expect(fetchEvil).toHaveBeenCalledTimes(1);

    const fetchFeed = vi.fn<typeof fetch>(async () => new Response("<rss/>", { status: 200 }));
    await expect(
      fetchNewsFeedXml("https://evil.example/feed", {
        fetchImpl: fetchFeed,
        lookup: PUBLIC_LOOKUP,
      }),
    ).rejects.toThrow(/not allowlisted/);
    expect(fetchFeed).not.toHaveBeenCalled();

    const fetchArticle = vi.fn<typeof fetch>(async () => new Response("<html/>", { status: 200 }));
    expect(
      await fetchNewsArticleHtml("https://evil.example/story", {
        fetchImpl: fetchArticle,
        lookup: PUBLIC_LOOKUP,
      }),
    ).toBeNull();
    expect(fetchArticle).not.toHaveBeenCalled();

    const fetchThumb = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array(64).fill(1), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
    );
    await expect(
      fetchNewsThumbBytes("https://evil.example/a.jpg", {
        fetchImpl: fetchThumb,
        lookup: PUBLIC_LOOKUP,
      }),
    ).rejects.toThrow(/not allowlisted/);
    expect(fetchThumb).not.toHaveBeenCalled();
  });

  it("allowlists every NEWS_SOURCES feed host and its apex/www twin", () => {
    for (const source of NEWS_SOURCES) {
      for (const feedUrl of source.feedUrls) {
        const feedHost = new URL(feedUrl).hostname.toLowerCase();
        const apex = feedHost.startsWith("www.") ? feedHost.slice(4) : feedHost;
        expect(apex.length).toBeGreaterThan(0);
        expect(isNewsEgressAllowlistedHost(apex)).toBe(true);
        expect(isNewsEgressAllowlistedHost(`www.${apex}`)).toBe(true);
        expect(isNewsEgressAllowlistedHost(feedHost)).toBe(true);
      }
    }
    expect(isNewsEgressAllowlistedHost("evil.example")).toBe(false);
    expect(isNewsEgressAllowlistedHost("cdn.variety.com")).toBe(false);
    expect(isNewsEgressAllowlistedHost("thr.com")).toBe(false);
  });
});
