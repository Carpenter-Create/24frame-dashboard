import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  NEWS_FEED_PK,
  NEWS_HEALTH_SK,
  NEWS_ITEM_SK,
  assertNewsTableName,
  isNewsAwsConfigured,
  isNewsIngestConfigured,
  newsAwsStaticCredentials,
  newsFeedSk,
  newsItemPk,
  newsSourcePk,
  requireNewsEnv,
  type NewsEnv,
} from "@/lib/news-aws";
import {
  NEWS_SOURCE_IDS,
  isNewsSourceId,
  newsInWindow,
  newsItemTtlEpoch,
  newsSourceLabel,
  newsWindowStart,
  type NewsItem,
  type NewsSourceHealth,
  type NewsSourceId,
} from "@/lib/news";
import type { NormalizedNewsItem } from "@/lib/news-rss";
import type { NewsTopic } from "@/lib/news-topic";

export type NewsPersist = {
  upsertItems: (items: readonly NormalizedNewsItem[], now: Date) => Promise<number>;
  getHealth: (source: NewsSourceId) => Promise<NewsSourceHealth | null>;
  putHealth: (row: NewsSourceHealth) => Promise<void>;
  purgeBefore: (cutoffIso: string) => Promise<number>;
};

type NewsItemRecord = {
  pk: string;
  sk: string;
  gsi1pk: string;
  gsi1sk: string;
  id: string;
  title: string;
  url: string;
  canonical_url: string;
  source: string;
  source_name: string;
  published_at: string;
  image_url: string | null;
  fetched_at: string;
  ttl: number;
  /**
   * Ingest topic (`film` / `tv`). Persisted for the same-day music
   * purge script + future filtering. Older rows without the field are
   * unaffected — reads never require it.
   */
  topic?: NewsTopic;
};

type NewsHealthRecord = {
  pk: string;
  sk: string;
  source: string;
  enabled: boolean;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

export type NewsFeedPage = {
  items: NewsItem[];
  /** True only when the read stopped at the page cap with a cursor still left. */
  capped: boolean;
};

export type NewsStore = NewsPersist & {
  queryFeed: (input: { limit: number; now: Date }) => Promise<NewsFeedPage>;
};

/** Static. No titles, URLs, or source ids — a capped read must not log row data. */
export const NEWS_FEED_CAP_WARNING = "[news:read] feed page cap reached";

function normalizeNewsImageUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

/** Keep a stored thumb when a later ingest has no image. Never write null over a good URL. */
export function mergeNewsImageUrl(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const next = normalizeNewsImageUrl(incoming);
  if (next) return next;
  return normalizeNewsImageUrl(existing);
}

function recordToItem(row: NewsFeedRow): NewsItem | null {
  if (!isNewsSourceId(row.source)) return null;
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    published_at: row.published_at,
    image_url: row.image_url,
  };
}

/**
 * Raw rows evaluated per feed page. Dynamo applies Query `Limit` before
 * `FilterExpression`, so a page of hidden sources can come back empty
 * and still carry `LastEvaluatedKey`.
 */
export const NEWS_FEED_PAGE_ROWS = 50;

/**
 * Hard stop for one feed read. 20 pages × 50 raw rows = 1,000 rows.
 * Home (15) and history (500) share this cap.
 */
export const NEWS_FEED_MAX_PAGES = 20;

type NewsFeedRow = {
  id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  image_url: string | null;
};

/**
 * Keep allowlisted rows, then apply `limit`. Follow `cursor` until the
 * page is full, the table is exhausted, or `NEWS_FEED_MAX_PAGES` is hit.
 * `capped` is true only for that last stop, and only when a cursor remains.
 */
export async function readAllowlistedFeed<Cursor>(input: {
  limit: number;
  maxPages?: number;
  queryPage: (cursor?: Cursor) => Promise<{
    items: readonly NewsFeedRow[];
    cursor: Cursor | null;
  }>;
}): Promise<NewsFeedPage> {
  if (input.limit <= 0) return { items: [], capped: false };
  const maxPages = input.maxPages ?? NEWS_FEED_MAX_PAGES;
  const out: NewsItem[] = [];
  let cursor: Cursor | undefined;
  for (let page = 0; page < maxPages && out.length < input.limit; page += 1) {
    const result = await input.queryPage(cursor);
    for (const row of result.items) {
      const item = recordToItem(row);
      if (!item) continue;
      out.push(item);
      if (out.length >= input.limit) return { items: out, capped: false };
    }
    if (result.cursor == null) return { items: out, capped: false };
    cursor = result.cursor;
  }
  const capped = cursor != null;
  if (capped) console.warn(NEWS_FEED_CAP_WARNING);
  return { items: out, capped };
}

export function newsFeedQueryInput(input: {
  table: string;
  now: Date;
  cursor?: Record<string, unknown>;
}): {
  TableName: string;
  IndexName: "gsi1";
  KeyConditionExpression: string;
  FilterExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
  ScanIndexForward: false;
  Limit: number;
  ExclusiveStartKey?: Record<string, unknown>;
} {
  const since = newsWindowStart(input.now).toISOString();
  const until = input.now.toISOString();
  const values: Record<string, unknown> = {
    ":pk": NEWS_FEED_PK,
    ":since": `${since}#`,
    ":until": `${until}~\uFFFF`,
  };
  const placeholders = NEWS_SOURCE_IDS.map((id, index) => {
    const key = `:src${index}`;
    values[key] = id;
    return key;
  });
  return {
    TableName: input.table,
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk AND gsi1sk BETWEEN :since AND :until",
    FilterExpression: `#src IN (${placeholders.join(", ")})`,
    ExpressionAttributeNames: { "#src": "source" },
    ExpressionAttributeValues: values,
    ScanIndexForward: false,
    Limit: NEWS_FEED_PAGE_ROWS,
    ...(input.cursor ? { ExclusiveStartKey: input.cursor } : {}),
  };
}

export function memoryNewsStore(seed: readonly NewsItem[] = []): NewsStore {
  const items = new Map<string, NewsItemRecord>();
  const health = new Map<NewsSourceId, NewsSourceHealth>();
  for (const item of seed) {
    items.set(item.url, {
      pk: newsItemPk(item.url),
      sk: NEWS_ITEM_SK,
      gsi1pk: NEWS_FEED_PK,
      gsi1sk: newsFeedSk(item.published_at, item.url),
      id: item.id,
      title: item.title,
      url: item.url,
      canonical_url: item.url,
      source: item.source,
      source_name: newsSourceLabel(item.source),
      published_at: item.published_at,
      image_url: item.image_url,
      fetched_at: item.published_at,
      ttl: newsItemTtlEpoch(item.published_at),
    });
  }

  return {
    async upsertItems(rows, now = new Date()) {
      const fetchedAt = now.toISOString();
      for (const row of rows) {
        const prior = items.get(row.canonical_url);
        items.set(row.canonical_url, {
          pk: newsItemPk(row.canonical_url),
          sk: NEWS_ITEM_SK,
          gsi1pk: NEWS_FEED_PK,
          gsi1sk: newsFeedSk(row.published_at, row.canonical_url),
          id: row.canonical_url,
          title: row.title,
          url: row.url,
          canonical_url: row.canonical_url,
          source: row.source,
          source_name: newsSourceLabel(row.source),
          published_at: row.published_at,
          image_url: mergeNewsImageUrl(prior?.image_url, row.image_url),
          fetched_at: fetchedAt,
          ttl: newsItemTtlEpoch(row.published_at),
          topic: row.topic,
        });
      }
      return rows.length;
    },
    async queryFeed({ limit, now }) {
      const sorted = [...items.values()]
        .filter((row) => newsInWindow(row.published_at, now))
        .sort((a, b) => b.gsi1sk.localeCompare(a.gsi1sk));
      let start = 0;
      return readAllowlistedFeed({
        limit,
        queryPage: async () => {
          const page = sorted.slice(start, start + NEWS_FEED_PAGE_ROWS);
          start += page.length;
          return {
            items: page,
            cursor: start < sorted.length ? { start } : null,
          };
        },
      });
    },
    async getHealth(source) {
      return health.get(source) ?? null;
    },
    async putHealth(row) {
      health.set(row.source, row);
    },
    async purgeBefore(cutoffIso) {
      let removed = 0;
      for (const [key, row] of items) {
        if (row.published_at < cutoffIso) {
          items.delete(key);
          removed += 1;
        }
      }
      return removed;
    },
  };
}

function newsClient(env: NewsEnv): { table: string; doc: DynamoDBDocumentClient } {
  const table = assertNewsTableName(requireNewsEnv("NEWS_DDB_TABLE", env));
  const credentials = newsAwsStaticCredentials(env);
  const client = new DynamoDBClient({
    region: requireNewsEnv("NEWS_AWS_REGION", env),
    ...(credentials ? { credentials } : {}),
  });
  return { table, doc: DynamoDBDocumentClient.from(client) };
}

async function existingNewsImageUrl(
  doc: DynamoDBDocumentClient,
  table: string,
  canonicalUrl: string,
): Promise<string | null> {
  const { Item } = await doc.send(
    new GetCommand({
      TableName: table,
      Key: { pk: newsItemPk(canonicalUrl), sk: NEWS_ITEM_SK },
      ConsistentRead: true,
    }),
  );
  if (!Item) return null;
  return normalizeNewsImageUrl((Item as NewsItemRecord).image_url);
}

type FeedQueryDoc = {
  send: (command: QueryCommand) => Promise<{
    Items?: unknown;
    LastEvaluatedKey?: Record<string, unknown>;
  }>;
};

function queryAllowlistedFeed(
  doc: FeedQueryDoc,
  table: string,
  limit: number,
  now: Date,
): Promise<NewsFeedPage> {
  return readAllowlistedFeed({
    limit,
    queryPage: async (cursor?: Record<string, unknown>) => {
      const { Items, LastEvaluatedKey } = await doc.send(
        new QueryCommand(newsFeedQueryInput({ table, now, cursor })),
      );
      return {
        items: (Array.isArray(Items) ? Items : []) as NewsItemRecord[],
        cursor: LastEvaluatedKey ?? null,
      };
    },
  });
}

export function dynamoNewsStore(env: NewsEnv = process.env): NewsStore {
  if (!isNewsIngestConfigured(env) && !isNewsAwsConfigured(env)) {
    throw new Error("NEWS_AWS_REGION / NEWS_DDB_TABLE environment variables are not set");
  }

  return {
    async upsertItems(rows, now = new Date()) {
      if (rows.length === 0) return 0;
      const { table, doc } = newsClient(env);
      const fetchedAt = now.toISOString();
      await Promise.all(
        rows.map(async (row) => {
          const existing = normalizeNewsImageUrl(row.image_url)
            ? null
            : await existingNewsImageUrl(doc, table, row.canonical_url);
          await doc.send(
            new PutCommand({
              TableName: table,
              Item: {
                pk: newsItemPk(row.canonical_url),
                sk: NEWS_ITEM_SK,
                gsi1pk: NEWS_FEED_PK,
                gsi1sk: newsFeedSk(row.published_at, row.canonical_url),
                id: row.canonical_url,
                title: row.title,
                url: row.url,
                canonical_url: row.canonical_url,
                source: row.source,
                source_name: newsSourceLabel(row.source),
                published_at: row.published_at,
                image_url: mergeNewsImageUrl(existing, row.image_url),
                fetched_at: fetchedAt,
                ttl: newsItemTtlEpoch(row.published_at),
                topic: row.topic,
              } satisfies NewsItemRecord,
            }),
          );
        }),
      );
      return rows.length;
    },
    async queryFeed({ limit, now }) {
      const { table, doc } = newsClient(env);
      return queryAllowlistedFeed(doc as unknown as FeedQueryDoc, table, limit, now);
    },
    async getHealth(source) {
      const { table, doc } = newsClient(env);
      const { Item } = await doc.send(
        new GetCommand({
          TableName: table,
          Key: { pk: newsSourcePk(source), sk: NEWS_HEALTH_SK },
        }),
      );
      if (!Item) return null;
      const row = Item as NewsHealthRecord;
      if (!isNewsSourceId(row.source)) return null;
      return {
        source: row.source,
        enabled: row.enabled !== false,
        last_success_at: row.last_success_at ?? null,
        last_error: row.last_error ?? null,
        last_error_at: row.last_error_at ?? null,
      };
    },
    async putHealth(row) {
      const { table, doc } = newsClient(env);
      await doc.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: newsSourcePk(row.source),
            sk: NEWS_HEALTH_SK,
            source: row.source,
            enabled: row.enabled,
            last_success_at: row.last_success_at,
            last_error: row.last_error,
            last_error_at: row.last_error_at,
          } satisfies NewsHealthRecord,
        }),
      );
    },
    async purgeBefore() {
      // Retention is Dynamo TTL (published_at + 90d). Query window also hides older rows.
      return 0;
    },
  };
}

export function createNewsAppStore(env: NewsEnv = process.env): NewsStore {
  if (!isNewsAwsConfigured(env)) {
    throw new Error("NEWS_AWS_* / NEWS_DDB_TABLE environment variables are not set");
  }
  return dynamoNewsStore(env);
}

export function createNewsIngestStore(env: NewsEnv = process.env): NewsStore {
  if (!isNewsIngestConfigured(env)) {
    throw new Error("NEWS_AWS_REGION / NEWS_DDB_TABLE environment variables are not set");
  }
  return dynamoNewsStore(env);
}
