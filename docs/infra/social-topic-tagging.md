# Social topic tagging — founder runbook

Founder decisions (2026-10-03): 24Frame AI assigns each new Social post
one of the 15 locked topics automatically, in the background, like a
feed's interest chips. Nobody picks a topic. Model: Claude Sonnet 5.5
(`claude-sonnet-5-5`) on Claude Platform on AWS. Video transcripts are
approved, for tagging only: the caption track the tagger creates is
deleted after it is read, so videos look as they do now. It runs on
**AWS Lambda**, not Vercel cron. The tagger writes with the Supabase
service role, an approved exception to 24Frame AI's user-JWT rule
(`docs/domain-spec.md` §20).

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

  Posts are handled newest first. One post gets at most 90 seconds. It
  stops starting new posts after 3 minutes, so a run ends inside the
  5-minute timeout; the rest wait for the next run.
- **For each post it reads:**
  - caption and hashtags;
  - the author's crafts;
  - up to 4 images (downscaled to 1024 px) or 3 video frames (768 px);
  - the video's transcript.
- **Only the author's own media.** Images must sit under the author's
  folder. A video must be the author's own Mux upload and play by the
  post's playback id; otherwise the tagger reads nothing from it and never
  asks Mux to transcribe it.
- **Transcripts.** The first time it meets a ready video, it asks Mux to
  transcribe it (language detected), and waits until the transcript is
  ready. It reads the transcript, then **deletes that caption track**
  before stamping the post. Mux adds the track to the video when the
  transcript is ready, so captions can show for up to about 5 minutes
  until the next run removes them. A video still preparing after an hour
  is classified from its caption. Captions someone adds another way are
  read but never deleted.
- **The answer.** Claude is asked for one of the 15 topics or "none",
  plus a confidence. A topic is matched to its exact label ignoring case;
  any other answer is discarded and the post is stamped with no topic.
- **What it writes:**
  - At or above the confidence threshold: `category`, with
    `category_source = 'ai'`, the confidence, the classifier version and
    `category_tagged_at`.
  - Below the threshold, "none", a refusal or an unreadable answer:
    `category_tagged_at` only, so the post is never classified twice.
  - **Errors leave the post untouched** for the next run: a Claude, Mux,
    S3 or database error, a timeout, or a caption track that could not be
    deleted. Only a permanent miss (a deleted image or Mux asset, a video
    Mux will not transcribe) is read as no media.
- **What it never touches:** an author's own topic, group posts, or
  stories.

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account / region | E8, `us-west-2` | Same as News and the Claude workspace. Confirm. |
| ECR repository | `24frame-social-topic` | Holds the container image. |
| IAM role | `24frame-social-topic-tagger` | Trust `lambda.amazonaws.com`. Policy below. |
| Lambda | `24frame-social-topic-tag` | Container image, x86_64, 1024 MB, timeout 5 min, reserved concurrency 1. Asynchronous invocation: retry attempts 0, on-failure destination the SQS queue below. |
| EventBridge rule | `24frame-social-topic-tag` | `rate(5 minutes)` → the function. |
| SQS queue | `24frame-social-topic-failures` | Failed runs only (the function's on-failure destination). |
| CloudWatch alarm | `24frame-social-topic-errors` | Function `Errors` ≥ 1 in 3 consecutive 5-minute periods → your email (SNS). |

EventBridge invokes the function asynchronously, so a failed run goes to
the function's own on-failure destination, not to an EventBridge target
DLQ. Retries are 0 because the next scheduled run is the retry.

**Role policy** (fill the ARNs; never apply from CI):

```
# Logs: attach AWSLambdaBasicExecutionRole.

# Claude Platform on AWS: inference only, on the 24frame workspace.
aws-external-anthropic:CreateInference
  arn:aws:aws-external-anthropic:us-west-2:ACCOUNT_ID:workspace/WORKSPACE_ID

# Social media originals: read only, posts prefix only.
s3:GetObject
  arn:aws:s3:::$S3_MEDIA_SOURCE_BUCKET/posts/*
# Listing, limited to that prefix, so a deleted image reads as "not found"
# (skipped) instead of "access denied" (retried every run).
s3:ListBucket
  arn:aws:s3:::$S3_MEDIA_SOURCE_BUCKET
  Condition: StringLike s3:prefix = posts/*

# Failed runs go to the failure queue.
sqs:SendMessage
  arn:aws:sqs:us-west-2:ACCOUNT_ID:24frame-social-topic-failures

# If the media bucket lives in another AWS account, add a bucket policy
# that allows this role the same GetObject and ListBucket.
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

## Build and deploy

Merge ≠ live for this worker. Build from a clean checkout of `main`.
`--provenance=false` keeps the image in a format Lambda accepts.

```sh
REGISTRY=ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
IMAGE=$REGISTRY/24frame-social-topic:latest

docker build --platform linux/amd64 --provenance=false \
  -f workers/social-topic/Dockerfile -t 24frame-social-topic .
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin $REGISTRY
docker tag 24frame-social-topic:latest $IMAGE
docker push $IMAGE
```

The image build fails if the image-resizing library (`sharp`) cannot
load, so a bad image never reaches Lambda.

**First deploy**, in this order: the ECR repository, the build and push
above, the IAM role and the SQS queue, then the function (the function
needs the image to exist):

```sh
aws lambda create-function --region us-west-2 \
  --function-name 24frame-social-topic-tag \
  --package-type Image --code ImageUri=$IMAGE \
  --role arn:aws:iam::ACCOUNT_ID:role/24frame-social-topic-tagger \
  --architectures x86_64 --memory-size 1024 --timeout 300
aws lambda put-function-concurrency --region us-west-2 \
  --function-name 24frame-social-topic-tag --reserved-concurrent-executions 1
aws lambda put-function-event-invoke-config --region us-west-2 \
  --function-name 24frame-social-topic-tag --maximum-retry-attempts 0 \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:us-west-2:ACCOUNT_ID:24frame-social-topic-failures"}}'
```

Then set the function env (above, without `SOCIAL_TOPIC_TAGGING`), the
EventBridge rule with the function as its target, and the alarm.

**Every later deploy** (after a merge that touches the tagger): build and
push, then

```sh
aws lambda update-function-code --region us-west-2 \
  --function-name 24frame-social-topic-tag --image-uri $IMAGE
```

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
   - the Supabase, media and Mux names above, **plus**
     `MEDIA_AWS_ACCESS_KEY_ID` and `MEDIA_AWS_SECRET_ACCESS_KEY` (same
     values as Vercel; your machine has no execution role);
   - for Claude, either the `CLAUDE_AWS_*` keys from
     `docs/infra/claude-platform-aws.md` or the cutover key.

   It never writes, never starts a transcription and never deletes a
   track. It costs roughly a cent per post. A post it cannot read is
   listed as skipped with its error; fix the env and run again if many
   are skipped.

   **Videos are judged without transcripts here**: the test cannot start
   one, and the tagger deletes the ones it makes. Live tagging also reads
   the transcript, so video results in the test are a floor.

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
- **Failures.** One post's error is logged
  (`{"msg":"social topic post failed","postId":...}`), counted in
  `error`, and retried next run; the run still succeeds. A run fails only
  on configuration (missing env) or when every selected post failed.
  A failed run lands in `24frame-social-topic-failures` and counts in the
  function's `Errors` metric; the alarm emails you after 15 minutes of
  failed runs. The queue should stay empty.
- **In the app.** A new post shows its topic chip on Social Home within
  about 10 minutes. Videos take longer while Mux transcribes them.
- **Turn off:** remove `SOCIAL_TOPIC_TAGGING` from the function env, or
  disable the EventBridge rule. Stored topics stay.

## Not in this PR

- **Older posts (backfill):** a separate founder-run step after the
  accuracy test, using the Batches API at half price. The role then
  needs the batch IAM actions.
- **Topic chips on Explore:** the Explore PR.
