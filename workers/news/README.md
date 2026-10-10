# 24Frame News ingest worker

Isolated AWS compute for Industry News RSS ingest.

- Account `405912452061` / `us-west-2`. Do not reuse title, media, finance, or education credentials.
- Proposed table: `24frame-news-dev` / `24frame-news-prod` (not created — founder apply).
- Credentials: `NEWS_AWS_REGION` + `NEWS_DDB_TABLE`. Static `NEWS_AWS_*` keys optional when the Lambda role is attached.
- Thumb mirror reuses title `S3_BUCKET` + `AWS_REGION` + `CLOUDFRONT_DOMAIN` (house `putObjectBytes`, prefix `news-thumbs/`). No `NEWS_S3_*`.
- EventBridge rule `24frame-news-ingest` `rate(30 minutes)` → this handler. DLQ `24frame-news-ingest-dlq`.
- Not Supabase. Not Vercel cron. Not Aurora.

Entry: `workers/news/handler.ts` calls `ingestNewsFeeds` in `src/lib/news-ingest.ts`. Fail-soft per source. Cross-beat trades (THR, Variety, Deadline) ingest **film + tv section RSS** — never the site-wide feed. An ingest **topic gate** (`src/lib/news-topic.ts`) drops music / other before Dynamo write on every path. RSS image first; OG-scrape the article when `image_url` is null. After a remote thumb is resolved, ingest mirrors bytes to `S3_BUCKET/news-thumbs/` and persists the CloudFront URL (fail-soft to the remote URL). Override the OG cap with server-only `NEWS_OG_MAX_BYTES`. Per-source CloudWatch counters: `ogAttempted`, `ogFilled`, `ogMiss`, `droppedByTopic`, `mirrored`, `mirrorFailed`. Throws only when every live source failed so EventBridge can retry / DLQ.

**After merge, MUST redeploy Lambda `24frame-news-ingest`.** Merge ≠ live for ingest. Founder / CoS must `esbuild` a fresh bundle and `aws lambda update-function-code`. See [`docs/infra/news-aws-setup.md`](../../docs/infra/news-aws-setup.md).

Founder-executed apply: [`docs/infra/news-aws-setup.md`](../../docs/infra/news-aws-setup.md). Do not create AWS from CI.

## Env (server-only)

Never `NEXT_PUBLIC_`. Dynamo never falls back to `AWS_*`, `FINANCE_AWS_*`, `MEDIA_AWS_*`, `SES_AWS_*`, or `EDUCATION_AWS_*`. Thumb mirror reuses existing title-asset names only. Values stay out of the repo.

```
NEWS_AWS_REGION=us-west-2
NEWS_DDB_TABLE=24frame-news-dev
NEWS_AWS_ACCESS_KEY_ID=          # optional when the Lambda role is attached
NEWS_AWS_SECRET_ACCESS_KEY=      # optional when the Lambda role is attached
NEWS_OG_MAX_BYTES=               # optional; default 1500000. Server-only. Never NEXT_PUBLIC_.
S3_BUCKET=                       # title assets. Prefix news-thumbs/.
AWS_REGION=                      # Lambda reserved us-west-2; Vercel/local us-east-1
CLOUDFRONT_DOMAIN=               # title CF, unsigned news-thumbs/* behavior
```

## Local invoke (after founder apply)

```
pnpm exec tsx workers/news/handler.ts
```
