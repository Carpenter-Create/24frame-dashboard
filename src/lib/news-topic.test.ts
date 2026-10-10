import { describe, expect, it } from "vitest";

import {
  NEWS_TOPIC_ALLOWED,
  classifyNewsTopic,
  isFilmOrTvTopic,
  type NewsTopic,
} from "./news-topic";

describe("classifyNewsTopic — URL path signal", () => {
  it("drops a Hollywood Reporter music URL (Chris Brown) as music", () => {
    expect(
      classifyNewsTopic({
        title:
          "Chris Brown sued over 2024 after-party incident, singer denies allegations",
        url: "https://www.hollywoodreporter.com/music/music-news/chris-brown-2024-lawsuit-1236012345/",
      }),
    ).toBe("music");
  });

  it("keeps a Hollywood Reporter movies URL as film", () => {
    expect(
      classifyNewsTopic({
        title: "Zach Cregger's 'The Flood' lands a summer 2027 slot",
        url: "https://www.hollywoodreporter.com/movies/movie-news/zach-cregger-the-flood-2027-1236098765/",
      }),
    ).toBe("film");
  });

  it("keeps a Variety film-section URL and a Deadline film URL as film", () => {
    expect(
      classifyNewsTopic({
        title: "Harbor Cut lands a festival slot",
        url: "https://variety.com/2026/film/news/harbor-cut-festival-1236011111/",
      }),
    ).toBe("film");
    expect(
      classifyNewsTopic({
        title: "North Wind books a limited theatrical run",
        url: "https://deadline.com/2026/film/north-wind-limited-run/",
      }),
    ).toBe("film");
  });

  it("keeps THR / Variety TV URLs as tv", () => {
    expect(
      classifyNewsTopic({
        title: "Streamer renews limited series",
        url: "https://www.hollywoodreporter.com/tv/tv-news/streamer-renews-series-1236022222/",
      }),
    ).toBe("tv");
    expect(
      classifyNewsTopic({
        title: "Series premiere lands 3M viewers",
        url: "https://variety.com/2026/tv/news/series-premiere-3m-viewers-1236033333/",
      }),
    ).toBe("tv");
  });

  it("classifies Billboard.com as music by host", () => {
    expect(
      classifyNewsTopic({
        title: "Recording artist announces world tour",
        url: "https://www.billboard.com/pro/2026/artist-world-tour/",
      }),
    ).toBe("music");
  });
});

describe("classifyNewsTopic — title tokens when path is silent", () => {
  it("uses music title tokens on a bare host", () => {
    expect(
      classifyNewsTopic({
        title: "Recording artist announces world tour",
        url: "https://variety.com/2026/12345/",
      }),
    ).toBe("music");
  });

  it("uses film title tokens on a bare host", () => {
    expect(
      classifyNewsTopic({
        title: "Director signs on to A24 sequel",
        url: "https://variety.com/2026/98765/",
      }),
    ).toBe("film");
  });

  it("returns other when nothing matches", () => {
    expect(
      classifyNewsTopic({
        title: "Adam Update on Q4 posture",
        url: "https://variety.com/2026/lifestyle/",
      }),
    ).toBe("other");
  });
});

describe("classifyNewsTopic — RSS category signal", () => {
  it("uses category when path and title are silent", () => {
    expect(
      classifyNewsTopic({
        title: "Studio announcement",
        url: "https://variety.com/2026/general/12345/",
        categories: ["Movies"],
      }),
    ).toBe("film");
    expect(
      classifyNewsTopic({
        title: "Studio announcement",
        url: "https://variety.com/2026/general/12345/",
        categories: ["Music"],
      }),
    ).toBe("music");
    expect(
      classifyNewsTopic({
        title: "Streamer announcement",
        url: "https://variety.com/2026/general/12345/",
        categories: ["Streaming"],
      }),
    ).toBe("tv");
  });

  it("path beats category when they disagree — a THR music URL never gets in on a film category", () => {
    expect(
      classifyNewsTopic({
        title: "Chris Brown sued over 2024 after-party incident",
        url: "https://www.hollywoodreporter.com/music/music-news/chris-brown-2024-lawsuit/",
        categories: ["Movies"],
      }),
    ).toBe("music");
  });
});

describe("classifyNewsTopic — awards / box office ambiguity", () => {
  it("keeps a Grammy-mentioned actor headline on a film URL as film", () => {
    expect(
      classifyNewsTopic({
        title: "Grammy winner joins A24 sequel as producer",
        url: "https://variety.com/2026/film/news/grammy-winner-a24-sequel/",
      }),
    ).toBe("film");
  });

  it("keeps a box-office headline as film on a bare URL", () => {
    expect(
      classifyNewsTopic({
        title: "Box office weekend recap",
        url: "https://variety.com/2026/12345/",
      }),
    ).toBe("film");
  });
});

describe("classifyNewsTopic — on-beat source default", () => {
  it("defaults IndieWire / NFS / Screen Daily to film when nothing else fires", () => {
    expect(
      classifyNewsTopic({
        title: "Feature interview",
        url: "https://indiewire.com/2026/feature-interview",
        source: "indiewire",
      }),
    ).toBe("film");
    expect(
      classifyNewsTopic({
        title: "Trade dispatch",
        url: "https://www.screendaily.com/2026/dispatch",
        source: "screen-daily",
      }),
    ).toBe("film");
  });

  it("defaults TVLine to tv when nothing else fires", () => {
    expect(
      classifyNewsTopic({
        title: "Casting update",
        url: "https://tvline.com/2026/casting-update",
        source: "tvline",
      }),
    ).toBe("tv");
  });

  it("still drops music-path URLs even with a film source default", () => {
    expect(
      classifyNewsTopic({
        title: "Soundtrack drop",
        url: "https://indiewire.com/music/soundtrack-drop",
        source: "indiewire",
      }),
    ).toBe("music");
  });

  it("does not default cross-beat trades (THR, Variety, Deadline) — path carries the beat", () => {
    expect(
      classifyNewsTopic({
        title: "Feature interview",
        url: "https://variety.com/2026/lifestyle/feature",
        source: "variety",
      }),
    ).toBe("other");
    expect(
      classifyNewsTopic({
        title: "Feature interview",
        url: "https://www.hollywoodreporter.com/lifestyle/feature",
        source: "hollywood-reporter",
      }),
    ).toBe("other");
  });
});

describe("isFilmOrTvTopic", () => {
  it("keeps film + tv, drops music + other", () => {
    const table: Array<[NewsTopic, boolean]> = [
      ["film", true],
      ["tv", true],
      ["music", false],
      ["other", false],
    ];
    for (const [topic, expected] of table) {
      expect(isFilmOrTvTopic(topic)).toBe(expected);
    }
    expect(NEWS_TOPIC_ALLOWED).toEqual(["film", "tv"]);
  });
});
