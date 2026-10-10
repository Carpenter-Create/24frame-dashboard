import { DASHBOARD_HOME } from "@/lib/dashboard-home";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { NEWS_INGEST_FUNCTION, NEWS_INGEST_SCHEDULE } from "@/lib/news-aws";

// Industry news — house SoT (Adam lock 2026-09-18).
// Name: Industry news. Route stays /home/news. Home: latest 15 +
// View all. /home/news: 90-day history.
// Home-owned only — not a workspace pill. Phone dock lists it as a
// Home dest (IA A). Not Aggregation / Social / Education.
// Link-out cards only. No leftover /news hop.
// Allowlist verified 2026-09-18. Storage is AWS DynamoDB. Ingest is
// Lambda + EventBridge. Not Supabase. Not Vercel cron. Copy lives here.
// History filter URL: exclusive single-select. Absent / empty / all /
// only-invalid = All outlets. One allowlist id when filtered. Writes
// never join comma-multi. Legacy ?source=a,b or repeated params
// collapse to the first A-Z allowlist id (filter SoT). All-ids = All.

export const NEWS_HOME_HREF = "/home";
export const NEWS_HREF = "/home/news";
export const NEWS_INGEST_PATH = NEWS_INGEST_FUNCTION;
export { NEWS_INGEST_SCHEDULE };
export const NEWS_HOME_CAP = 15;
export const NEWS_WINDOW_DAYS = 90;
export const NEWS_WINDOW_MS = NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const NEWS_READ_REVALIDATE_SECONDS = 60;
export const NEWS_SOURCE_PARAM = "source";
export const NEWS_SOURCE_ALL = "all";

export const NEWS_PAGE = {
  title: "Industry news",
  viewAll: DASHBOARD_HOME.viewAll,
  empty: "No headlines from the last 90 days.",
  subtitle: "Headlines from the last 90 days.",
  back: "Home",
  backHref: NEWS_HOME_HREF,
  sources: "Sources",
  sourcesAll: "All",
  filterEmpty: "No headlines from the selected sources.",
  truncated: `Showing the first ${UNPAGINATED_MAX} headlines. More exist — this list is not complete.`,
} as const;

/** Home land crumb — Industry news is a Home child, not a fifth workspace. */
export function newsHistoryBackLink(): { href: typeof NEWS_HOME_HREF; label: typeof NEWS_PAGE.back } {
  return { href: NEWS_PAGE.backHref, label: NEWS_PAGE.back };
}

export const NEWS_SOURCE_IDS = [
  "indiewire",
  "variety",
  "deadline",
  "hollywood-reporter",
  "tvline",
  "no-film-school",
  "filmmaker-magazine",
  "moviemaker",
  "film-threat",
  "screen-daily",
] as const;

export type NewsSourceId = (typeof NEWS_SOURCE_IDS)[number];

export type NewsSource = {
  id: NewsSourceId;
  label: string;
  /**
   * One or more verified feed URLs for this outlet. Cross-beat trades
   * (THR, Variety, Deadline) point at section feeds so music and other
   * beats never reach the ingest topic gate. Film-first trades keep
   * one on-beat feed. Order is stable — first URL is the identity /
   * canonicalize base and Dynamo does not care about later duplicates.
   */
  feedUrls: readonly string[];
  enabled: boolean;
};

// Verified 2026-09-19. Kill switch: enabled: false skips ingest (deploy).
// Dynamo SOURCE#<id> HEALTH enabled=false is a second kill without a deploy.
// Cross-beat trades are film + tv section RSS — never the site-wide feed —
// so music and other beats stop upstream of the topic gate.
export const NEWS_SOURCES = [
  {
    id: "indiewire",
    label: "IndieWire",
    feedUrls: ["https://www.indiewire.com/feed/"],
    enabled: true,
  },
  {
    id: "variety",
    label: "Variety",
    feedUrls: [
      "https://variety.com/v/film/feed/",
      "https://variety.com/v/tv/feed/",
    ],
    enabled: true,
  },
  {
    id: "deadline",
    label: "Deadline",
    feedUrls: ["https://deadline.com/v/film/feed/"],
    enabled: true,
  },
  {
    id: "hollywood-reporter",
    label: "Hollywood Reporter",
    feedUrls: [
      "https://www.hollywoodreporter.com/movies/feed/",
      "https://www.hollywoodreporter.com/tv/feed/",
    ],
    enabled: true,
  },
  {
    id: "tvline",
    label: "TVLine",
    feedUrls: ["https://www.tvline.com/feed/"],
    enabled: true,
  },
  {
    id: "no-film-school",
    label: "No Film School",
    feedUrls: ["https://nofilmschool.com/rss.xml"],
    enabled: true,
  },
  {
    id: "filmmaker-magazine",
    label: "Filmmaker Magazine",
    feedUrls: ["https://filmmakermagazine.com/feed/"],
    enabled: true,
  },
  {
    id: "moviemaker",
    label: "MovieMaker",
    feedUrls: ["https://www.moviemaker.com/feed/"],
    enabled: true,
  },
  {
    id: "film-threat",
    label: "Film Threat",
    feedUrls: ["https://filmthreat.com/feed/"],
    enabled: true,
  },
  {
    id: "screen-daily",
    label: "Screen Daily",
    feedUrls: ["https://www.screendaily.com/45202.rss"],
    enabled: true,
  },
] satisfies readonly NewsSource[];

const SOURCE_BY_ID = new Map<NewsSourceId, NewsSource>(
  NEWS_SOURCES.map((source) => [source.id, source]),
);

function compareNewsSourceLabel(a: NewsSource, b: NewsSource): number {
  return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
}

// Filter lens SoT: All first in the UI, then outlets A-Z by label.
// URL canonical order follows this list. Ingest keep NEWS_SOURCES order.
export const NEWS_SOURCE_FILTER_SOURCES = [...NEWS_SOURCES].sort(compareNewsSourceLabel);

export const NEWS_SOURCE_FILTER_IDS = NEWS_SOURCE_FILTER_SOURCES.map((source) => source.id);

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: NewsSourceId;
  published_at: string;
  image_url: string | null;
};

export type NewsListResult = {
  rows: NewsItem[];
  truncated: boolean;
  failed: boolean;
};

export type NewsSourceHealth = {
  source: NewsSourceId;
  enabled: boolean;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

export function isNewsSourceId(value: string): value is NewsSourceId {
  return SOURCE_BY_ID.has(value as NewsSourceId);
}

export function newsSourceLabel(source: string): string {
  return SOURCE_BY_ID.get(source as NewsSourceId)?.label ?? source;
}

export function newsSourceConstEnabled(source: NewsSourceId): boolean {
  return NEWS_SOURCES.find((row) => row.id === source)?.enabled === true;
}

export function newsSourceIsLive(
  source: NewsSourceId,
  health: NewsSourceHealth | null,
): boolean {
  if (!newsSourceConstEnabled(source)) return false;
  return health?.enabled !== false;
}

export function newsWindowStart(now: Date): Date {
  return new Date(now.getTime() - NEWS_WINDOW_MS);
}

export function newsInWindow(iso: string, now: Date): boolean {
  const at = Date.parse(iso);
  return Number.isFinite(at) && at >= newsWindowStart(now).getTime() && at <= now.getTime();
}

export function newsItemTtlEpoch(publishedAt: string): number {
  return Math.floor((Date.parse(publishedAt) + NEWS_WINDOW_MS) / 1000);
}

export function newsTitleDedupeKey(source: string, title: string): string {
  return `${source}:${title.trim().toLowerCase()}`;
}

export function dedupeNewsHeadlines<T extends Pick<NewsItem, "url" | "source" | "title">>(
  rows: readonly T[],
): T[] {
  const urls = new Set<string>();
  const titles = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (urls.has(row.url)) continue;
    const titleKey = newsTitleDedupeKey(row.source, row.title);
    if (titles.has(titleKey)) continue;
    urls.add(row.url);
    titles.add(titleKey);
    out.push(row);
  }
  return out;
}

export function overviewNewsHeadlines<T>(rows: readonly T[], cap = NEWS_HOME_CAP): T[] {
  return rows.slice(0, cap);
}

function splitNewsSourceParam(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function rawNewsSourceParts(raw: string | string[] | null | undefined): string[] {
  if (raw == null) return [];
  return (Array.isArray(raw) ? raw : [raw]).flatMap(splitNewsSourceParam);
}

/** Canonical selected sources. Empty means All. At most one id. */
export function canonicalizeNewsSourceFilter(
  selected: readonly string[],
): NewsSourceId[] {
  const unique = NEWS_SOURCE_FILTER_IDS.filter((id) => selected.includes(id));
  if (unique.length === 0 || unique.length === NEWS_SOURCE_IDS.length) return [];
  const first = unique[0];
  return first ? [first] : [];
}

export function parseNewsSourceFilter(
  raw: string | string[] | null | undefined,
): NewsSourceId[] {
  const parts = rawNewsSourceParts(raw);
  if (parts.length === 0) return [];
  const ids = canonicalizeNewsSourceFilter(parts);
  if (parts.includes(NEWS_SOURCE_ALL) && ids.length === 0) return [];
  return ids;
}

export function newsSourceFilterIsAll(selected: readonly string[]): boolean {
  return canonicalizeNewsSourceFilter(selected).length === 0;
}

export function newsHistoryHref(selected: readonly string[] = []): string {
  const canonical = canonicalizeNewsSourceFilter(selected);
  const id = canonical[0];
  if (!id) return NEWS_HREF;
  return `${NEWS_HREF}?${NEWS_SOURCE_PARAM}=${id}`;
}

export function selectNewsSourceFilter(
  id: NewsSourceId | typeof NEWS_SOURCE_ALL,
): NewsSourceId[] {
  return canonicalizeNewsSourceFilter(id === NEWS_SOURCE_ALL ? [] : [id]);
}

export function newsSourceFilterIndex(selected: readonly string[]): number {
  const id = canonicalizeNewsSourceFilter(selected)[0];
  if (!id) return 0;
  const idx = NEWS_SOURCE_FILTER_IDS.indexOf(id);
  return idx < 0 ? 0 : idx + 1;
}

export function filterNewsBySources<T extends Pick<NewsItem, "source">>(
  rows: readonly T[],
  selected: readonly NewsSourceId[],
): T[] {
  if (newsSourceFilterIsAll(selected)) return [...rows];
  const allowed = new Set(canonicalizeNewsSourceFilter(selected));
  return rows.filter((row) => allowed.has(row.source));
}

export function newsSourceFilterLabel(selected: readonly NewsSourceId[]): string {
  const id = canonicalizeNewsSourceFilter(selected)[0];
  return id ? newsSourceLabel(id) : NEWS_PAGE.sourcesAll;
}

export function newsHistoryEmptyCopy(
  rows: readonly NewsItem[],
  visible: readonly NewsItem[],
): string {
  if (rows.length === 0) return NEWS_PAGE.empty;
  if (visible.length === 0) return NEWS_PAGE.filterEmpty;
  return NEWS_PAGE.empty;
}
