// Industry News topic gate. Classify each candidate at ingest and keep
// film + tv only. Music / other never write to Dynamo. Signals in order:
//
//   1. URL path prefix — the strongest signal on trades whose section
//      RSS still lets sibling beats through (a THR music URL beats the
//      title). Music path always wins over host / title.
//   2. Host — Billboard-style music hosts. We do not ingest any today,
//      but the check is future-proof.
//   3. RSS feed categories, when the parser preserves them.
//   4. Title tokens — album, single, tour, Grammy-as-music. Awards /
//      box office / streaming titles still classify as film or tv.
//   5. On-beat source default — IndieWire, NFS, Filmmaker,
//      MovieMaker, Film Threat, Screen Daily are film-first. TVLine is
//      tv-first. Cross-beat trades (THR, Variety, Deadline) get no
//      default and rely on section-feed paths carrying the beat.
//
// Do not import anywhere on the read path. Ingest only.

export type NewsTopic = "film" | "tv" | "music" | "other";

const KEEP: readonly NewsTopic[] = ["film", "tv"];

export function isFilmOrTvTopic(topic: NewsTopic): boolean {
  return KEEP.includes(topic);
}

/**
 * On-beat sources default to film / tv when no music / other signal
 * fires. Cross-beat trades stay absent so a bare Variety headline with
 * no film / tv marker falls to `other` rather than admitting a music
 * or lifestyle beat through the site-wide fallback.
 */
const SOURCE_DEFAULT_TOPIC: Record<string, NewsTopic> = {
  indiewire: "film",
  "no-film-school": "film",
  "filmmaker-magazine": "film",
  moviemaker: "film",
  "film-threat": "film",
  "screen-daily": "film",
  tvline: "tv",
};

/** Music host allowlist. Empty ingest today; here so a future add is one line. */
const MUSIC_HOSTS: readonly string[] = ["billboard.com", "rollingstone.com/music"];

/** Path segments that mean music on any host. Section RSS puts these upfront. */
const MUSIC_PATH_SEGMENTS: readonly string[] = [
  "music",
  "music-news",
  "album",
  "albums",
  "song",
  "songs",
  "single",
  "singles",
  "hip-hop",
  "rap",
  "country-music",
  "concert",
  "concerts",
  "tour-dates",
];

/** Path segments that mean film. Trades put these upfront on section RSS. */
const FILM_PATH_SEGMENTS: readonly string[] = [
  "film",
  "films",
  "movie",
  "movies",
  "movie-news",
  "movie-features",
  "box-office",
  "cinema",
  "indie-film",
  "festivals",
  "cannes",
  "sundance",
  "berlinale",
  "toronto-film-festival",
];

/** Path segments that mean tv. TVLine + THR/Variety/Deadline TV sections. */
const TV_PATH_SEGMENTS: readonly string[] = [
  "tv",
  "tv-news",
  "tv-features",
  "tv-shows",
  "television",
  "streaming",
  "series",
];

/** Title tokens that classify as music. Awards / box office stay film/tv. */
const MUSIC_TITLE_TOKENS: readonly string[] = [
  "album",
  "albums",
  "single",
  "mixtape",
  "ep release",
  "boy band",
  "girl group",
  "coachella",
  "lollapalooza",
  "bonnaroo",
  "billboard hot 100",
  "billboard 200",
  "top of the charts",
  "chart-topping single",
  "on tour",
  "concert tour",
  "world tour",
  "grammy for",
  "grammy nomination for best",
  "hip-hop",
  "hip hop",
  "rap album",
  "recording artist",
];

/** Title tokens that classify as film / tv. Cheap allow-list for the tie-breaker. */
const FILM_TITLE_TOKENS: readonly string[] = [
  "movie",
  "movies",
  "film",
  "films",
  "festival",
  "festival slot",
  "director",
  "directors",
  "screenplay",
  "screenwriter",
  "box office",
  "trailer",
  "cinematographer",
  "producer",
  "co-star",
  "co-stars",
  "reboot",
  "sequel",
  "prequel",
  "theatrical release",
];

const TV_TITLE_TOKENS: readonly string[] = [
  "tv series",
  "tv show",
  "tv shows",
  "series premiere",
  "season finale",
  "showrunner",
  "streaming series",
  "limited series",
  "network drama",
  "sitcom",
  "docuseries",
  "renewed for",
  "cancelled after",
  "canceled after",
];

/**
 * Split a URL path into lowercase segments. `""`, host case, trailing
 * slashes, and encoded characters are all normalized.
 */
function urlPathSegments(url: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }
  return parsed.pathname
    .toLowerCase()
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostMatchesMusic(url: string): boolean {
  const host = hostname(url);
  if (!host) return false;
  const path = url.toLowerCase();
  return MUSIC_HOSTS.some((needle) =>
    needle.includes("/") ? path.includes(`https://${needle}`) || path.includes(`https://www.${needle}`) : host === needle,
  );
}

function hasAnySegment(segments: readonly string[], needles: readonly string[]): boolean {
  return segments.some((segment) => needles.includes(segment));
}

function hasAnyToken(title: string, needles: readonly string[]): boolean {
  const lower = ` ${title.toLowerCase()} `;
  return needles.some((needle) => lower.includes(` ${needle} `) || lower.includes(`-${needle} `));
}

function categoryTopic(categories: readonly string[]): NewsTopic | null {
  for (const raw of categories) {
    const value = raw.trim().toLowerCase();
    if (!value) continue;
    if (value === "music" || value.startsWith("music/") || value.includes(" music") || value.includes("music news")) {
      return "music";
    }
    if (
      value === "film" ||
      value === "movies" ||
      value.startsWith("movies/") ||
      value.startsWith("film/") ||
      value.includes("box office") ||
      value.includes("theatrical")
    ) {
      return "film";
    }
    if (
      value === "tv" ||
      value === "television" ||
      value.startsWith("tv/") ||
      value.startsWith("television/") ||
      value.includes("streaming") ||
      value.includes("series")
    ) {
      return "tv";
    }
  }
  return null;
}

export type NewsTopicInput = {
  title: string;
  url: string;
  categories?: readonly string[];
  /** Allowlist source id — trusted on-beat sources default their topic. */
  source?: string;
};

/**
 * Return the topic for a candidate item. Path signals win; then host;
 * then RSS categories; then title tokens; then on-beat source default.
 * Ambiguous → `other` so the gate drops the row rather than admit
 * music adjacent to the beat.
 */
export function classifyNewsTopic(input: NewsTopicInput): NewsTopic {
  const segments = urlPathSegments(input.url);

  if (hasAnySegment(segments, MUSIC_PATH_SEGMENTS)) return "music";
  if (hostMatchesMusic(input.url)) return "music";

  if (hasAnySegment(segments, FILM_PATH_SEGMENTS)) return "film";
  if (hasAnySegment(segments, TV_PATH_SEGMENTS)) return "tv";

  const category = categoryTopic(input.categories ?? []);
  if (category === "music") return "music";
  if (category === "film") return "film";
  if (category === "tv") return "tv";

  const title = input.title ?? "";
  if (hasAnyToken(title, MUSIC_TITLE_TOKENS)) return "music";
  if (hasAnyToken(title, FILM_TITLE_TOKENS)) return "film";
  if (hasAnyToken(title, TV_TITLE_TOKENS)) return "tv";

  const sourceDefault = input.source ? SOURCE_DEFAULT_TOPIC[input.source] : undefined;
  if (sourceDefault) return sourceDefault;

  return "other";
}

export const NEWS_TOPIC_ALLOWED: readonly NewsTopic[] = KEEP;
