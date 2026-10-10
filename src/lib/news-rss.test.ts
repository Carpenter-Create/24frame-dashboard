import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { NEWS_SOURCES } from "./news";
import {
  canonicalizeNewsImageUrl,
  newsCardImageUrl,
  canonicalizeNewsUrl,
  parseNewsDate,
  parseNewsFeed,
  parseOgImageUrl,
} from "./news-rss";

const NOW = new Date("2026-09-18T18:00:00.000Z");

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Variety</title>
    <item>
      <title><![CDATA[Harbor Cut lands a festival slot]]></title>
      <link>https://www.variety.com/harbor-cut/?utm_source=rss&amp;utm_medium=feed</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>A long rewrite.</p><img src="https://evil.example/scrape.jpg" />]]></description>
      <media:thumbnail url="https://variety.com/thumbs/harbor.jpg" />
    </item>
    <item>
      <title>Old headline</title>
      <link>https://variety.com/old</link>
      <pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Same story again</title>
      <link>https://variety.com/harbor-cut</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Harbor Cut lands a festival slot</title>
      <link>https://variety.com/harbor-cut-alt</link>
      <pubDate>Thu, 17 Sep 2026 14:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Deadline exclusive</title>
    <link href="http://deadline.com/exclusive/" rel="alternate" />
    <published>2026-09-16T09:00:00Z</published>
    <summary>Do not republish this summary.</summary>
    <enclosure url="https://deadline.com/img/exclusive.png" type="image/png" />
  </entry>
</feed>`;

describe("canonicalizeNewsUrl", () => {
  it("https + host lower + strip www and tracking", () => {
    expect(
      canonicalizeNewsUrl("http://WWW.Variety.com/Harbor-Cut/?utm_source=rss&utm_campaign=x&id=1"),
    ).toBe("https://variety.com/Harbor-Cut?id=1");
    expect(canonicalizeNewsUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeNewsUrl("/relative")).toBeNull();
  });
});

describe("canonicalizeNewsImageUrl", () => {
  it("passes a publisher URL through and keeps a mirrored news-thumbs URL", () => {
    expect(canonicalizeNewsImageUrl("https://variety.com/thumbs/harbor.jpg")).toBe(
      "https://variety.com/thumbs/harbor.jpg",
    );
    expect(canonicalizeNewsImageUrl(null)).toBeNull();
    expect(newsCardImageUrl("https://variety.com/thumbs/harbor.jpg")).toBe(
      "https://variety.com/thumbs/harbor.jpg",
    );
    expect(
      newsCardImageUrl("https://delivery.globalcontent.co/news-thumbs/variety/abc.jpg"),
    ).toBe("https://delivery.globalcontent.co/news-thumbs/variety/abc.jpg");
    expect(newsCardImageUrl(null)).toBeNull();
  });
});

describe("parseNewsFeed", () => {
  it("keeps media thumbs, drops HTML-body images, and dedupes URL + title", () => {
    const items = parseNewsFeed(RSS, "variety", NOW);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      title: "Harbor Cut lands a festival slot",
      url: "https://variety.com/harbor-cut",
      canonical_url: "https://variety.com/harbor-cut",
      source: "variety",
      published_at: "2026-09-17T12:00:00.000Z",
      image_url: "https://variety.com/thumbs/harbor.jpg",
      topic: "film",
    });
    expect(JSON.stringify(items)).not.toContain("scrape.jpg");
    expect(JSON.stringify(items)).not.toContain("A long rewrite");
    expect(items.find((item) => item.title === "Old headline")).toBeUndefined();
  });

  it("reads Atom links and enclosure images, and upgrades http", () => {
    const items = parseNewsFeed(ATOM, "deadline", NOW);
    expect(items).toEqual([
      {
        title: "Deadline exclusive",
        url: "https://deadline.com/exclusive",
        canonical_url: "https://deadline.com/exclusive",
        source: "deadline",
        published_at: "2026-09-16T09:00:00.000Z",
        image_url: "https://deadline.com/img/exclusive.png",
        topic: "other",
      },
    ]);
    expect(JSON.stringify(items)).not.toContain("Do not republish");
  });

  it("does not invent a source outside the allowlist", () => {
    expect(parseNewsFeed(RSS, "variety", NOW)[0]?.source).toBe("variety");
    expect(NEWS_SOURCES).toHaveLength(10);
  });

  it("stamps a topic on every parsed item — RSS category signals count", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Chris Brown sued over 2024 after-party incident</title>
      <link>https://www.hollywoodreporter.com/music/music-news/chris-brown-2024-lawsuit/</link>
      <pubDate>Thu, 17 Sep 2026 12:00:00 GMT</pubDate>
      <category>Music</category>
    </item>
    <item>
      <title>Zach Cregger's 'The Flood' lands a summer 2027 slot</title>
      <link>https://www.hollywoodreporter.com/movies/movie-news/zach-cregger-the-flood/</link>
      <pubDate>Thu, 17 Sep 2026 13:00:00 GMT</pubDate>
      <category>Movies</category>
    </item>
  </channel>
</rss>`;
    const items = parseNewsFeed(xml, "hollywood-reporter", NOW);
    expect(items.map((item) => item.topic)).toEqual(["music", "film"]);
  });
});

describe("parseNewsDate", () => {
  it("accepts RSS and Atom timestamps", () => {
    expect(parseNewsDate("Thu, 17 Sep 2026 12:00:00 GMT")).toBe("2026-09-17T12:00:00.000Z");
    expect(parseNewsDate("2026-09-16T09:00:00Z")).toBe("2026-09-16T09:00:00.000Z");
    expect(parseNewsDate("nope")).toBeNull();
  });
});

describe("parseOgImageUrl", () => {
  it("prefers og:image, then twitter:image, and upgrades http", () => {
    expect(
      parseOgImageUrl(
        `<html><head>
          <meta name="twitter:image" content="http://www.thr.com/tw.jpg" />
          <meta property="og:image" content="https://www.thr.com/og.jpg?utm_source=x" />
        </head></html>`,
        "https://hollywoodreporter.com/story",
      ),
    ).toBe("https://thr.com/og.jpg");
    expect(
      parseOgImageUrl(
        `<meta name="twitter:image" content="/tw.jpg" />`,
        "https://hollywoodreporter.com/story",
      ),
    ).toBe("https://hollywoodreporter.com/tw.jpg");
    expect(
      parseOgImageUrl(
        `<meta property="og:image" content="//cdn.thr.com/hero.jpg" />`,
        "https://hollywoodreporter.com/story",
      ),
    ).toBe("https://cdn.thr.com/hero.jpg");
    expect(parseOgImageUrl("<html></html>", "https://hollywoodreporter.com/story")).toBeNull();
    expect(
      parseOgImageUrl(
        `<meta content="https://thr.com/late.jpg" property="og:image" />`,
        "https://hollywoodreporter.com/story",
      ),
    ).toBe("https://thr.com/late.jpg");
  });

  it("decodes HTML entities in og:image URLs before canonicalize", () => {
    expect(
      parseOgImageUrl(
        `<meta property="og:image" content="https://www.hollywoodreporter.com/wp-content/uploads/foo.jpg?w=1296&#038;h=730&#038;crop=1" />`,
        "https://hollywoodreporter.com/story",
      ),
    ).toBe("https://hollywoodreporter.com/wp-content/uploads/foo.jpg?crop=1&h=730&w=1296");
    expect(
      parseOgImageUrl(
        `<meta property="og:image" content="https://filmthreat.com/img.jpg?w=800&amp;h=450" />`,
        "https://filmthreat.com/story",
      ),
    ).toBe("https://filmthreat.com/img.jpg?h=450&w=800");
  });

  it("rejects data URLs, empty content, and same-as-page images", () => {
    const page = "https://hollywoodreporter.com/story";
    expect(parseOgImageUrl(`<meta property="og:image" content="data:image/png;base64,xxxx" />`, page)).toBeNull();
    expect(parseOgImageUrl(`<meta property="og:image" content="" />`, page)).toBeNull();
    expect(parseOgImageUrl(`<meta property="og:image" content="${page}" />`, page)).toBeNull();
    expect(
      parseOgImageUrl(
        `<meta name="twitter:image:src" content="https://thr.com/tw-src.jpg" />`,
        page,
      ),
    ).toBe("https://thr.com/tw-src.jpg");
  });
});

describe("news-rss source", () => {
  it("does not scrape RSS description HTML for thumbs", () => {
    const src = readFileSync(new URL("./news-rss.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/content:encoded|description.*img|cheerio|jsdom/i);
    expect(src).toContain("parseOgImageUrl");
  });
});
