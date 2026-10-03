# Social topic tagging — founder runbook

Founder decisions (2026-10-03): 24Frame AI assigns each new Social post
one of the 15 locked topics automatically, in the background, like a
feed's interest chips. Nobody picks a topic. Model: Claude Sonnet 5.5
(`claude-sonnet-5-5`) on Claude Platform on AWS. Video transcripts are
approved. The tagger runs with the server key, an approved exception to
24Frame AI's user-JWT rule (`docs/domain-spec.md` §20).

**Off until you turn it on.** Nothing runs until `SOCIAL_TOPIC_TAGGING=on`
is set in Vercel Production. Turn it on only after the accuracy test
below.

## What it does

- **Every 5 minutes** (`/api/cron/social-topic-tag`, production only),
  it takes up to 12 posts that:
  - have no topic and no earlier look;
  - are not group posts, and are active;
  - are between 2 minutes and 7 days old.
- **For each post it reads:**
  - caption and hashtags;
  - the author's crafts;
  - up to 4 images (downscaled to 1024 px) or 3 video frames (768 px);
  - the video's transcript.
- **Transcripts.** The first time it meets a ready video, it asks Mux to
  transcribe it (language detected), then waits for the transcript.
  After an hour it stops waiting and uses frames and caption only.
- **The answer.** Claude answers with one of the 15 topics or "none",
  plus a confidence. It cannot answer anything else.
- **What it writes:**
  - At or above the confidence threshold: `category`, with
    `category_source = 'ai'`, the confidence, the classifier version and
    `category_tagged_at`.
  - Below the threshold, "none", or a refusal: `category_tagged_at`
    only, so the post is never classified twice.
- **What it never touches.** An author's own topic, group posts, and
  stories. A failed call leaves the post untouched for the next run.

## Before turning it on

1. **Apply the migration** `supabase/migrations/20261003120000_post_category_provenance.sql`
   (founder-approved SQL).
2. **Claude provider.** Claude Platform on AWS is set up
   (`docs/infra/claude-platform-aws.md`), or `ANTHROPIC_API_KEY` is
   still in place. The inference-only IAM policy already covers this job.
3. **Env already present:** Mux (`MUX_*`), Social media S3 (`MEDIA_AWS_*`,
   `S3_MEDIA_SOURCE_BUCKET`), `CRON_SECRET`.

## Accuracy test (sets the threshold)

1. **Pick posts.** Export about 150 recent posts to label (read-only):

   ```sql
   select id, left(body, 200) as caption, created_at
   from public.posts
   where status = 'active' and group_id is null
   order by created_at desc
   limit 150;
   ```

2. **Label them.** Write `labels.csv`: one `post_id,topic` per line,
   where topic is one of the 15 labels exactly as written, or `none`.
   Keep the file out of the repository.
3. **Run the tagger on them, locally**, with production env loaded. It
   never writes; it costs roughly a cent per post.

   ```sh
   pnpm exec tsx --conditions=react-server scripts/social-topic-eval.ts labels.csv
   ```

4. **Read the table.** For each confidence threshold it shows how many
   posts got a topic, how many were right, and how many were wrong.
   Pick the lowest threshold where wrong topics are rare enough for you.
5. **Tell an agent the threshold.** It updates
   `SOCIAL_TOPIC_MIN_CONFIDENCE` (provisional 0.8) in a PR.
6. **Turn it on.** Set `SOCIAL_TOPIC_TAGGING=on` in Vercel Production
   and redeploy.

## Watching it

- **Logs.** Vercel → Logs, filter `[social-topic-tag]`. Each run logs
  counts: selected, tagged, declined (no confident topic), wait, raced,
  error, deferred.
- **In the app.** A new post shows its topic chip on Social Home within
  about 10 minutes. Videos take longer while Mux transcribes them.
- **Turn off:** remove `SOCIAL_TOPIC_TAGGING` (or set anything but `on`)
  and redeploy. Stored topics stay.

## Not in this PR

- **Older posts (backfill):** a separate founder-run step after the
  accuracy test, using the Batches API at half price. It needs the
  batch IAM actions.
- **Topic chips on Explore:** the Explore PR.
