# Social topic tagging — founder runbook

Founder decisions (2026-10-03): 24Frame AI assigns each new Social post
one of the 15 locked topics automatically, in the background, like a
feed's interest chips. Nobody picks a topic. Model: Claude Sonnet 5.5
(`claude-sonnet-5-5`) on Claude Platform on AWS. Video transcripts are
approved. It runs on **AWS Lambda**, not Vercel cron. The tagger writes
with the Supabase service role, an approved exception to 24Frame AI's
user-JWT rule (`docs/domain-spec.md` §20).

**Off until you turn it on.** The function does nothing unless its env
has `SOCIAL_TOPIC_TAGGING=on`. Turn it on only after the accuracy test
below.

Do **not** create these resources from CI or from this repository. Names
are proposals for Adam to confirm.

## What it does

- **Every 5 minutes**, EventBridge invokes the Lambda. It takes up to 40
  posts that:
  - have no topic and no earlier look;
  - are not group posts, and are active;
  - are between 2 minutes and 7 days old.

  Posts are handled newest first. It stops starting new posts after
  4 minutes; the rest wait for the next run.
- **For each post it reads:**
  - caption and hashtags;
  - the author's crafts;
  - up to 4 images (downscaled to 1024 px) or 3 video frames (768 px);
  - the video's transcript.
- **Transcripts.** The first time it meets a ready video, it asks Mux to
  transcribe it (language detected), and waits until the transcript is
  ready. A video still preparing after an hour is classified from its
  caption.
- **The answer.** Claude answers with one of the 15 topics or "none",
  plus a confidence. It cannot answer anything else.
- **What it writes:**
  - At or above the confidence threshold: `category`, with
    `category_source = 'ai'`, the confidence, the classifier version and
    `category_tagged_at`.
  - Below the threshold, "none", a refusal or an unreadable answer:
    `category_tagged_at` only, so the post is never classified twice.
  - An API or network error leaves the post untouched for the next run.
- **What it never touches:** an author's own topic, group posts, or
  stories.

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account / region | E8, `us-west-2` | Same as News and the Claude workspace. Confirm. |
| ECR repository | `24frame-social-topic` | Holds the container image. |
| IAM role | `24frame-social-topic-tagger` | Trust `lambda.amazonaws.com`. Policy below. |
| Lambda | `24frame-social-topic-tag` | Container image, x86_64, 1024 MB, timeout 5 min, reserved concurrency 1. |
| EventBridge rule | `24frame-social-topic-tag` | `rate(5 minutes)` → the function. Retry policy + DLQ on the target. |
| SQS DLQ | `24frame-social-topic-dlq` | Failed invocations only. |

**Role policy** (fill the ARNs; never apply from CI):

```
# Logs: attach AWSLambdaBasicExecutionRole.

# Claude Platform on AWS: inference only, on the 24frame workspace.
aws-external-anthropic:CreateInference
  arn:aws:aws-external-anthropic:us-west-2:ACCOUNT_ID:workspace/WORKSPACE_ID

# Social media originals: read only, posts prefix only.
s3:GetObject
  arn:aws:s3:::$S3_MEDIA_SOURCE_BUCKET/posts/*

# If that bucket lives in another AWS account, add a bucket policy that
# allows this role the same GetObject on posts/*.
```

**Function env** (server-only; never `NEXT_PUBLIC_` except the
existing Supabase URL name; values never in the repository):

```
SOCIAL_TOPIC_TAGGING=on            # leave unset until after the accuracy test
CLAUDE_AWS_REGION=us-west-2
CLAUDE_AWS_WORKSPACE_ID=wrkspc_…
NEXT_PUBLIC_SUPABASE_URL=          # same value as Vercel
SUPABASE_SERVICE_ROLE_KEY=         # same value as Vercel
MEDIA_AWS_REGION=                  # same value as Vercel
S3_MEDIA_SOURCE_BUCKET=            # same value as Vercel
MUX_TOKEN_ID= MUX_TOKEN_SECRET= MUX_SIGNING_KEY= MUX_PRIVATE_KEY=   # same as Vercel
```

**No AWS keys on the function.** The role signs Claude and S3 requests.
Do not set `AWS_REGION`; Lambda sets it. Do not add `CLAUDE_AWS_ACCESS_KEY_ID`
or `MEDIA_AWS_ACCESS_KEY_ID`.

## Before turning it on

1. **Apply the migration**
   `supabase/migrations/20261003120000_post_category_provenance.sql`
   (founder-approved SQL).
2. **Claude Platform on AWS** is set up (`docs/infra/claude-platform-aws.md`
   steps 1–3). The workspace must exist.
3. **Create the resources** above, then build and deploy (next section).

## Build and deploy (after every merge that touches the tagger)

Merge ≠ live for this worker. From a clean checkout of `main`:

```sh
docker build --platform linux/amd64 \
  -f workers/social-topic/Dockerfile -t 24frame-social-topic .
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
docker tag 24frame-social-topic:latest ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/24frame-social-topic:latest
docker push ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/24frame-social-topic:latest
aws lambda update-function-code --region us-west-2 \
  --function-name 24frame-social-topic-tag \
  --image-uri ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/24frame-social-topic:latest
```

The image build fails if the image-resizing library (`sharp`) cannot
load, so a bad image never reaches Lambda.

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
3. **Run the tagger on them, locally**, with production env loaded:
   - the Supabase, media and Mux names above;
   - for Claude, either the `CLAUDE_AWS_*` keys from
     `docs/infra/claude-platform-aws.md` or the cutover key.

   It never writes and never starts a transcription. It costs roughly a
   cent per post.

   ```sh
   pnpm exec tsx --conditions=react-server scripts/social-topic-eval.ts labels.csv
   ```

4. **Read the table.** For each confidence threshold it shows how many
   posts got a topic, how many were right, and how many were wrong.
   Pick the lowest threshold where wrong topics are rare enough for you.
5. **Tell an agent the threshold.** It updates
   `SOCIAL_TOPIC_MIN_CONFIDENCE` (provisional 0.8) in a PR. Rebuild and
   deploy the image after it merges.
6. **Turn it on.** Set `SOCIAL_TOPIC_TAGGING=on` on the function.

## Watching it

- **Logs.** CloudWatch, log group `/aws/lambda/24frame-social-topic-tag`.
  Each run logs `{"msg":"social topic tagging done", ...}` with counts:
  selected, tagged, declined (no confident topic), wait, raced, error,
  deferred.
- **Failures.** A run fails only on configuration, or when every
  selected post failed. EventBridge retries, then the DLQ. DLQ depth
  should stay 0.
- **In the app.** A new post shows its topic chip on Social Home within
  about 10 minutes. Videos take longer while Mux transcribes them.
- **Turn off:** remove `SOCIAL_TOPIC_TAGGING` from the function env, or
  disable the EventBridge rule. Stored topics stay.

## Not in this PR

- **Older posts (backfill):** a separate founder-run step after the
  accuracy test, using the Batches API at half price. The role then
  needs the batch IAM actions.
- **Topic chips on Explore:** the Explore PR.
