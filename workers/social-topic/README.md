# 24Frame Social topic tagging worker

AWS Lambda (container image) that gives each new Social post one of the 15
locked topics, or none. Founder decisions: background tagging, Claude
Sonnet 5.5 on Claude Platform on AWS, no video transcripts for now (videos
are tagged from caption and frames; the tagger never changes a video), and
AWS Lambda rather than Vercel cron.

- EventBridge rule `24frame-social-topic-tag`, `rate(5 minutes)` → this
  handler. The rule is the only on/off switch (created disabled).
  Reserved concurrency 1. Asynchronous retries 0: the next run is the
  retry. CloudWatch alarms on crashes, failing posts, a stopped schedule
  and unusable answers.
- Execution role only for AWS: `aws-external-anthropic:CreateInference` on
  the tagging workspace, `s3:GetObject` on the Social media bucket's
  `posts/*`. No static AWS keys on the function. Its own read-only Mux
  token and signing key.
- `{"dryRun": true}` checks the database, Mux, S3 and Claude without
  tagging or writing anything.
- Images are tagged with the git commit (`--build-arg GIT_SHA`); each
  run logs it as `build`.

Entry: `workers/social-topic/handler.ts` → `runSocialTopicBatch` in
`src/lib/social-topic-run.ts`. Build: `workers/social-topic/Dockerfile`.

**After merge, the founder must rebuild and redeploy the image.** Merge ≠
live for this worker. Founder-executed setup and deploy:
[`docs/infra/social-topic-tagging.md`](../../docs/infra/social-topic-tagging.md).
Do not create AWS from CI.
