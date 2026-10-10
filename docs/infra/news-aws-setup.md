# 24Frame Industry News AWS setup — founder-executed

Dedicated **News** namespace: DynamoDB items + per-source health,
Lambda ingest, EventBridge schedule, SQS DLQ. Not Supabase. Not
Vercel cron. Not Aurora (Vercel Secure Compute / app cutover is not
done). Not title / finance / education / media credentials.

Do **not** create these resources from CI or from this repository.
Names below are the proposed live set for Adam confirm, aligned with
finance isolation in [`finance-aws-setup.md`](finance-aws-setup.md).

Auth stays Supabase Auth. The app **reads** DynamoDB on Home (15) and
`/home/news` (90-day window). Retired `/news` 404s — no leftover
redirect. Ingest
**writes** DynamoDB. Page requests never fan out RSS. RSS media /
enclosure first; when `image_url` is null, ingest OG-scrapes the
article (`og:image` / `twitter:image`, 12s timeout, desktop Chrome UA,
1.5MB HTML cap, fail-soft). After a remote
`image_url` is resolved, ingest **mirrors bytes** to the title-asset
bucket prefix `news-thumbs/` (`S3_BUCKET` + house `putObjectBytes`)
and persists the unsigned `CLOUDFRONT_DOMAIN` URL. A mirror miss
keeps the canonicalized remote URL — never blank a good thumb.
Override the OG cap with server-only `NEWS_OG_MAX_BYTES` (bytes,
positive integer). Per-source CloudWatch counters: `ogAttempted`,
`ogFilled`, `ogMiss`, `droppedByTopic`, `mirrored`, `mirrorFailed`.

Feed is **film + tv only**. Cross-beat trades (Hollywood Reporter,
Variety, Deadline) ingest **section RSS** — never the site-wide feed
— so music and other beats do not enter the pipeline. Film-first
trades (IndieWire, No Film School, Filmmaker Magazine,
MovieMaker, Film Threat, Screen Daily) and tv-first (TVLine) keep one
on-beat feed each. A second **ingest topic gate** in
`src/lib/news-topic.ts` re-classifies every candidate (URL path →
host → RSS categories → title tokens → on-beat source default) and
drops music / other before Dynamo write. Adam glance: hard-refresh
Home; music headlines stop appearing.

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account | `405912452061` (E8) | Same account as finance / Aurora. Confirm. |
| Region | `us-west-2` | Same as finance / Aurora. Titles stay `us-east-1`. |
| Prod table | `24frame-news-prod` | Pay-per-request. TTL on `ttl`. |
| Dev table | `24frame-news-dev` | Preview / local. |
| Keys | `pk` + `sk` | Item: `ITEM#<canonical_url>` / `ITEM`. Health: `SOURCE#<id>` / `HEALTH`. |
| GSI1 | `gsi1` on `gsi1pk` + `gsi1sk` | Feed: `FEED` / `<published_at>#<canonical_url>`. Home + `/home/news` Query. |
| TTL | `ttl` epoch seconds | `published_at + 90 days`. Dynamo expires the row. |
| App IAM user | `24frame-news-app` | `NEWS_AWS_*` Query/Get on the table. Vercel Production + Preview. |
| Ingest role | `24frame-news-ingest` | Lambda trust. Put/Get/Query on the table. |
| Lambda | `24frame-news-ingest` | Node 20+. Handler `workers/news/handler.handler`. 60s timeout. |
| EventBridge | `24frame-news-ingest` | `rate(30 minutes)` → Lambda. |
| DLQ | `24frame-news-ingest-dlq` | SQS. Failed invocations only (all live sources failed). |

## Env names (server-only)

Never fall back to `AWS_*` (titles), `FINANCE_AWS_*`, `MEDIA_AWS_*`,
`SES_AWS_*`, or `EDUCATION_AWS_*`. Never `NEXT_PUBLIC_`. Do not commit
secret values.

```
NEWS_AWS_REGION=us-west-2
NEWS_AWS_ACCESS_KEY_ID=
NEWS_AWS_SECRET_ACCESS_KEY=
NEWS_DDB_TABLE=          # 24frame-news-dev / 24frame-news-prod
NEWS_OG_MAX_BYTES=       # optional; default 1500000. Lambda only. Never NEXT_PUBLIC_.

# Thumb mirror — existing title-asset names. No NEWS_S3_* / new secret shape.
# Lambda execution role does PutObject (not static title keys).
S3_BUCKET=               # same Vercel title bucket (e.g. gc-content-assets-prod)
AWS_REGION=              # Vercel / local title app: us-east-1. Lambda: reserved to
                         # the function region (us-west-2) — do not try to override
                         # it to the title bucket region on 24frame-news-ingest.
                         # Dynamo stays NEWS_AWS_REGION=us-west-2. putObjectBytes
                         # follows S3 region redirects to the us-east-1 title bucket.
CLOUDFRONT_DOMAIN=       # same Vercel title CF (e.g. https://delivery.globalcontent.co)
```

Names live in `.env.example`. Agents do not set values.

App path (`createNewsAppStore`) requires every `NEWS_AWS_*` name plus
`NEWS_DDB_TABLE` so it cannot silently use the title/media/finance
default chain. Lambda (`createNewsIngestStore`) needs
`NEWS_AWS_REGION` + `NEWS_DDB_TABLE`; static keys are optional when
the execution role is attached.

## What Adam must create (console / CLI)

Resources are **not** provisioned by this PR. After names are
confirmed, founder applies in `405912452061` / `us-west-2`:

1. **DynamoDB** `24frame-news-dev` and `24frame-news-prod`.
   Pay-per-request. Attribute definitions: `pk` (S), `sk` (S),
   `gsi1pk` (S), `gsi1sk` (S). GSI `gsi1` (`gsi1pk` + `gsi1sk`).
   TTL attribute `ttl` enabled. Point-in-time recovery on. Tag as
   News. Do not reuse a finance/education/media table.
2. **IAM user** `24frame-news-app` with Query/Get (and GetItem) on
   the chosen table. Put Vercel `NEWS_AWS_*` + `NEWS_DDB_TABLE`
   (Production = prod, Preview = dev). Server-only. Never
   `NEXT_PUBLIC_`.
3. **IAM role** `24frame-news-ingest` (trust `lambda.amazonaws.com`)
   with `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query` on
   the table + GSI, CloudWatch logs, and **prefix-scoped**
   `s3:PutObject` / `s3:GetObject` on `$S3_BUCKET/news-thumbs/*`.
   No finance/education/media buckets. No title `orgs/` prefix. No
   `sts:AssumeRole` into other product roles.
4. **Lambda** `24frame-news-ingest`. Package
   `workers/news/handler.ts` (repo `tsx` + `@/` via a Lambda bundle,
   or a container image from repo root). Timeout 60s. Memory 256 MB
   is enough. Env: `NEWS_AWS_REGION=us-west-2`,
   `NEWS_DDB_TABLE=24frame-news-prod` (or `-dev`). Optional
   `NEWS_OG_MAX_BYTES` (default 1500000). Thumb mirror:
   `S3_BUCKET` and `CLOUDFRONT_DOMAIN` (same title names). Do
   **not** set `AWS_REGION` on the function — Lambda reserves it
   to `us-west-2`. `putObjectBytes` follows S3 region redirects
   so PutObject to the us-east-1 title bucket succeeds. Prefer
   the execution role over static keys on the function.
5. **SQS** `24frame-news-ingest-dlq`. Attach as the Lambda
   asynchronous invocation DLQ (or EventBridge target DLQ).
6. **EventBridge** rule `24frame-news-ingest` `rate(30 minutes)`
   targeting the function. Enable. Retry policy + DLQ on the target.

Least-privilege sketches (founder fills ARNs; do not apply from CI):

```
# 24frame-news-app — Vercel read
dynamodb:GetItem, dynamodb:Query
  arn:aws:dynamodb:us-west-2:405912452061:table/24frame-news-prod
  arn:aws:dynamodb:us-west-2:405912452061:table/24frame-news-prod/index/gsi1

# 24frame-news-ingest — Lambda write + health
dynamodb:GetItem, dynamodb:PutItem, dynamodb:Query
  arn:aws:dynamodb:us-west-2:405912452061:table/24frame-news-prod
  arn:aws:dynamodb:us-west-2:405912452061:table/24frame-news-prod/index/gsi1

# Thumb mirror — title bucket, prefix only. Founder fills $S3_BUCKET.
# Example prod: arn:aws:s3:::gc-content-assets-prod/news-thumbs/*
s3:PutObject, s3:GetObject
  arn:aws:s3:::$S3_BUCKET/news-thumbs/*

# If the title bucket account is not 405912452061, add a bucket policy
# allowing Principal arn:aws:iam::405912452061:role/24frame-news-ingest
# on that same Resource. Do not invent a new AWS account.

# CloudFront (title distribution / $CLOUDFRONT_DOMAIN): cache behavior
# path pattern news-thumbs/* with Restrict viewer access = No (unsigned).
# Origin stays the title bucket + OAC. Cards persist and load that URL.
# Do not store signed URLs in Dynamo.
```

Do **not** create these from this PR.

## What green looks like

1. EventBridge invoked Lambda in the last 30–60 minutes.
2. CloudWatch log `{ "msg": "news ingest done", "failed": 0, ... }`.
3. Home News rail shows up to 15 rows from Dynamo (not a live RSS pull).
4. `/home/news` lists dense history rows inside 90 days. Retired `/news` 404s.
5. DLQ depth is 0.

## Ops

**Add a source.** Append one row to `NEWS_SOURCES` in `src/lib/news.ts`
(id, label, verified `feedUrls` array, `enabled: true`). Prefer one
source id with multiple **section** feed URLs (film + tv) over the
site-wide feed. Do not invent a feed.

**Kill a source.** Set `enabled: false` on that const row (deploy), or
Put `SOURCE#<id>` / `HEALTH` with `enabled=false` (no deploy). Ingest
skips it; existing rows age out via TTL / the 90-day query window.

**Topic gate.** `src/lib/news-topic.ts` classifies every candidate as
`film` / `tv` / `music` / `other`. Only `film` + `tv` reach the store.
Per-source CloudWatch counter `droppedByTopic` reports how many
candidates the gate rejected on the last run. A Hollywood Reporter
music URL (e.g. Chris Brown) stays out even if the section feed
routing regresses; a THR movies URL passes. Adjust heuristics by
editing the token / segment lists — do not disable the gate.

**After merge, MUST redeploy Lambda `24frame-news-ingest`.**
Merge ≠ live for ingest. Code on `main` does not run until founder /
CoS `esbuild` + `aws lambda update-function-code`. Do not create or
mutate AWS from CI. Agents do not run this.

```
mkdir -p /tmp/news-ingest
pnpm exec esbuild workers/news/handler.ts \
  --bundle --platform=node --format=cjs --target=node20 \
  --outfile=/tmp/news-ingest/index.js \
  --alias:@=./src
(cd /tmp/news-ingest && zip function.zip index.js)
aws lambda update-function-code --region us-west-2 \
  --function-name 24frame-news-ingest \
  --zip-file fileb:///tmp/news-ingest/function.zip
```

OG per-article timeout is 12s (concurrency 4). HTML cap is 1.5MB
(`NEWS_OG_MAX_BYTES` env override on the function). Function timeout
stays 60s until founder bumps it after a CloudWatch timeout.

**Trigger ingest.** After founder apply:

```
aws lambda invoke --region us-west-2 \
  --function-name 24frame-news-ingest /tmp/news-ingest.json
```

Or from repo root (needs `NEWS_AWS_REGION` + `NEWS_DDB_TABLE`; keys
optional when using a role):

```
pnpm exec tsx workers/news/handler.ts
```

**Image backfill (one-shot).** Existing rows that ingested before OG
scrape (Hollywood Reporter grey plates) pick up `image_url` on the
next EventBridge run. Dynamo `PutItem` overwrites the item; ingest
re-parses the live feed and OG-scrapes only when RSS still has no
image. No console row edit. To run once without waiting for cron,
use the invoke above. A scrape timeout or miss leaves the grey plate
— it does not fail the source.

**News thumbs (mirror).** Cards load our CloudFront URL, not
the publisher CDN. Ingest PutObject to
`$S3_BUCKET/news-thumbs/{source}/{hash}.{ext}` and writes
`https://$CLOUDFRONT_DOMAIN/news-thumbs/...`. After Lambda redeploy,
the next ingest upserts rows still in the RSS window. Items that left
the window are not re-upserted. Lambda redeploy stays CoS/founder —
not this merge.

**Music / other row purge (one-shot).** Rows that ingested before the
topic gate landed can be evicted without waiting for TTL. Dry-run
default. CoS only:

```
# preview rows the current classifier drops
pnpm exec tsx scripts/news/purge-music-rows.ts
# DeleteItem the drop set (identity: pk = ITEM#<canonical_url>)
pnpm exec tsx scripts/news/purge-music-rows.ts --apply
```

The next scheduled Lambda invoke does the rest — section feeds and
the gate keep music from re-entering. If a live feed still lists a
music item (Hollywood Reporter section RSS occasionally cross-posts),
the gate drops it on write.

## Still founder-gated

1. Creating the table, Lambda, EventBridge rule, DLQ, and IAM.
2. Setting Vercel `NEWS_AWS_*` / `NEWS_DDB_TABLE`.
3. First live ingest smoke and DLQ check.

Do **not** create these from CI.
