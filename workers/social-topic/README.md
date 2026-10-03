# 24Frame Social topic tagging worker

AWS Lambda (container image) that gives each new Social post one of the 15
locked topics, or none. Founder decisions: background tagging, Claude
Sonnet 5.5 on Claude Platform on AWS, video transcripts for tagging only
(the tagger deletes its caption track once read; no auto captions, and the
Social player keeps captions hidden), and AWS Lambda rather than Vercel
cron.

- EventBridge rule `24frame-social-topic-tag`, `rate(5 minutes)` → this
  handler. Reserved concurrency 1. Asynchronous retries 0; failed runs go
  to the on-failure queue `24frame-social-topic-failures`.
- Execution role only for AWS: `aws-external-anthropic:CreateInference` on
  the Claude workspace, `s3:GetObject` and prefix-limited `s3:ListBucket`
  on the Social media bucket's `posts/*`, `sqs:SendMessage` on the failure
  queue. No static AWS keys on the function.
- Off unless `SOCIAL_TOPIC_TAGGING=on` on the function. `drain` is the
  first step of turning it off: it only deletes the tagger's leftover
  caption tracks (`runSocialTopicDrain`), with no Claude call and no new
  transcript.

Entry: `workers/social-topic/handler.ts` → `runSocialTopicBatch` in
`src/lib/social-topic-run.ts`. Build: `workers/social-topic/Dockerfile`.

**After merge, the founder must rebuild and redeploy the image.** Merge ≠
live for this worker. Founder-executed setup and deploy:
[`docs/infra/social-topic-tagging.md`](../../docs/infra/social-topic-tagging.md).
Do not create AWS from CI.
