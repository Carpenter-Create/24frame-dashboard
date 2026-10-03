# Social topic tagging — founder runbook

Founder decisions (2026-10-03): 24Frame AI assigns each new Social post
one of the 15 locked topics automatically, in the background, like a
feed's interest chips. Nobody picks a topic. Model: Claude Sonnet 5.5
(`claude-sonnet-5-5`) on Claude Platform on AWS. **No video transcripts
for now** (founder decision): videos are tagged from their caption and
frames, and nothing is ever added to an author's video. Transcripts come
back in a later PR that transcribes the audio separately, with a length
cap. It runs on **AWS Lambda**, not Vercel cron. The tagger writes with
the Supabase service role, an approved exception to 24Frame AI's
user-JWT rule (`docs/domain-spec.md` §20).

**Off until you turn it on.** The EventBridge schedule is the only on/off
switch. You create it disabled and enable it after the accuracy test
(below). The function itself has no on/off setting: whenever it is
invoked, it runs.

Do **not** create these resources from CI or from this repository. Names
are proposals for Adam to confirm.

## What it does

- **Every 5 minutes**, EventBridge invokes the Lambda. It takes up to 40
  posts that:
  - have no look yet (`category_tagged_at` empty), and either no topic or
    an AI topic waiting for a re-check after a caption edit;
  - are not group posts, and are active;
  - are at least 2 minutes old, and were posted or had their caption
    edited in the last 7 days.

  Posts are handled newest first, **at most 3 per author per run**, so
  one account posting heavily cannot take every run or the spend. One
  post gets at most 90 seconds. It stops starting new posts after
  3 minutes, so a run ends inside the 5-minute timeout; the rest wait for
  the next run.
- **For each post it reads:**
  - caption and hashtags;
  - the author's crafts;
  - up to 4 images (downscaled to 1024 px) or 3 frames per video
    (768 px).
- **Only the author's own media.** Images must sit under the author's
  folder. A video must be the author's own Mux upload and play by the
  post's playback id; otherwise the tagger reads nothing from it.
- **Videos.** The tagger waits until every video in the post is ready,
  then reads 3 frames from each. A video still preparing after an hour
  is classified without its frames. A video Mux reports as failed
  (`errored`) is classified without its frames. It reads frames only; it
  never changes the video or adds captions to it.
- **The answer.** Claude is asked for one of the 15 topics or "none",
  plus a confidence. A topic is matched to its exact label ignoring case.
- **What it writes**, in one guarded write:
  - At or above the confidence threshold: `category`, with
    `category_source = 'ai'`, the confidence, the classifier version and
    `category_tagged_at`.
  - "none" or below the threshold: no topic, and `category_tagged_at`, so
    the post is not classified again until its caption changes.
  - **Unusable answers** (Claude refused, or the answer could not be
    read): stamped like "none", so the post is not billed again every
    run, but logged and counted separately as `unusable` (see "Watching
    it"). An answer **cut off** by its length limit counts as a failed
    call and is retried on the next runs for an hour after the post (or
    its last edit); only then is it stamped as unusable. The limit leaves
    plenty of room, so this should be rare.
  - **Images over 50 megapixels** are skipped without being decoded, so
    one huge upload cannot exhaust the worker's memory (a 48 MP phone
    photo fits).
  - **A caption edit re-tags the post** (founder decision): the database
    clears only the look. An AI topic stays on the post until the next
    run replaces it, or removes it if the new caption has no clear
    topic, so a topic never blinks out. If the caption changes while a
    post is being classified, that result is not written; the next run
    reads the new caption. A topic recorded as the author's, or recorded
    before this change (no source), is never reopened.
- **Errors leave the post untouched** for the next run: any Claude, Mux,
  S3 or database error, including a Mux asset or image that cannot be
  found, and a timeout. Nothing in the app deletes Social media, so a
  "not found" means a setting is wrong (keys from another Mux
  environment, the wrong bucket), and it shows up as an error instead
  of quietly tagging posts from their caption alone. When a post passes
  its 90 seconds, its work is cancelled: it reads and writes nothing
  more.
- **What it never touches:** a topic recorded as the author's, group
  posts, or stories. Nobody picks a topic: the database refuses a topic
  on any post a user saves.

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account / region | E8, `us-west-2` | Same as News and the Claude workspace. Confirm. |
| Claude workspace | `24frame-social-topics` | Its **own** workspace with its own monthly spend limit, separate from 24Frame AI's, so tagging (or the later backfill) can never use up the client-facing budget. |
| Mux access token | `24frame-social-topic-tagger` | Its **own** token with **Mux Video: Read** only, plus its own signing key, in the same Mux environment as Social uploads. Rotating the website's keys then cannot break tagging, and a leaked tagger key can only read. |
| ECR repository | `24frame-social-topic` | Holds the container images, tagged by git commit. |
| IAM role | `24frame-social-topic-tagger` | Trust `lambda.amazonaws.com`. Policy below. |
| Lambda | `24frame-social-topic-tag` | Container image, x86_64, 1024 MB, timeout 5 min, reserved concurrency 1. Asynchronous invocation: retry attempts 0 (the next scheduled run is the retry). |
| EventBridge rule | `24frame-social-topic-tag` | `rate(5 minutes)` → the function. **Created disabled**; enabling it turns tagging on. |
| SNS topic | `24frame-social-topic-alerts` | Your email, subscription confirmed. |
| CloudWatch alarms | see "Alarms" | Crashes or bad settings, posts failing, the schedule stopping, unusable answers spiking. |

**Role policy** (fill the ARNs; never apply from CI):

```
# Logs: attach AWSLambdaBasicExecutionRole.

# Claude Platform on AWS: inference only, on the tagging workspace.
aws-external-anthropic:CreateInference
  arn:aws:aws-external-anthropic:us-west-2:ACCOUNT_ID:workspace/TAGGING_WORKSPACE_ID

# Social media originals: read only, posts prefix only.
s3:GetObject
  arn:aws:s3:::$S3_MEDIA_SOURCE_BUCKET/posts/*

# Optional: deny the browser upload prefix. The tagger reads only
# published keys from rows, and rows never hold an upload key.
Deny s3:GetObject
  arn:aws:s3:::$S3_MEDIA_SOURCE_BUCKET/posts/upload/*

# If the media bucket lives in another AWS account, add a bucket policy
# that allows this role the same GetObject.
```

No `s3:ListBucket` and no queue: a missing image and a denied read are
both retried as errors, and failed runs are caught by the alarms.

**Function env** (server-only; never `NEXT_PUBLIC_` except the
existing Supabase URL name; values never in the repository):

```
CLAUDE_AWS_REGION=us-west-2
CLAUDE_AWS_WORKSPACE_ID=wrkspc_…   # the tagging workspace, not 24Frame AI's
NEXT_PUBLIC_SUPABASE_URL=          # same value as Vercel
SUPABASE_SERVICE_ROLE_KEY=         # same value as Vercel
MEDIA_AWS_REGION=                  # same value as Vercel
S3_MEDIA_SOURCE_BUCKET=            # same value as Vercel
MUX_TOKEN_ID=                      # the tagger's own read-only token
MUX_TOKEN_SECRET=                  # the tagger's own read-only token
MUX_SIGNING_KEY=                   # the tagger's own signing key id
MUX_PRIVATE_KEY=                   # the tagger's own signing key
```

**No AWS keys on the function.** The role signs Claude and S3 requests.
Do not set `AWS_REGION`; Lambda sets it. Do not add `CLAUDE_AWS_ACCESS_KEY_ID`
or `MEDIA_AWS_ACCESS_KEY_ID`.

**Setting env safely.** Use the Lambda console (Configuration →
Environment variables) to add or change one value. On the command line,
`aws lambda update-function-configuration --environment` replaces **every**
value at once; never use it to change a single setting.

## Before turning it on

1. **Apply the migration**
   `supabase/migrations/20261003120000_post_category_provenance.sql`
   (founder-approved SQL).
2. **Claude Platform on AWS** is set up (`docs/infra/claude-platform-aws.md`
   steps 1–3), with a separate workspace for tagging and its own spend
   limit.
3. **Apply the Social media bucket policy** (required; the statement and
   its order are in `docs/engineering/operational-gotchas.md`, "Social
   photo publishing"). Without it, an older deployment can still sign a
   write to a published photo, so a photo could change after the tagger
   has read it.
4. **Create the resources** above, then build and deploy (next section),
   then run the dry run.

## Build and deploy

Merge ≠ live for this worker. Build from a clean checkout of `main`.
Every image is tagged with its git commit, so you always know what is
running and rollback is one command. `--provenance=false` keeps the image
in a format Lambda accepts.

```sh
REGISTRY=ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
SHA=$(git rev-parse HEAD)
IMAGE=$REGISTRY/24frame-social-topic:$SHA

docker build --platform linux/amd64 --provenance=false \
  --build-arg GIT_SHA=$SHA \
  -f workers/social-topic/Dockerfile -t $IMAGE .
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin $REGISTRY
docker push $IMAGE
```

The build fails if the bundled function cannot load (including the
image-resizing library), so a broken image never reaches Lambda. The
repository's tests also build the same bundle on every PR and fail if it
needs a file the image does not include.

**First deploy**, in this order: the ECR repository, the build and push
above, the IAM role, then the function (it needs the image):

```sh
aws lambda create-function --region us-west-2 \
  --function-name 24frame-social-topic-tag \
  --package-type Image --code ImageUri=$IMAGE \
  --role arn:aws:iam::ACCOUNT_ID:role/24frame-social-topic-tagger \
  --architectures x86_64 --memory-size 1024 --timeout 300
aws lambda put-function-concurrency --region us-west-2 \
  --function-name 24frame-social-topic-tag --reserved-concurrent-executions 1
aws lambda put-function-event-invoke-config --region us-west-2 \
  --function-name 24frame-social-topic-tag --maximum-retry-attempts 0
```

Then set the function env (above) in the console. Then the schedule,
**disabled**: the rule, the permission that lets EventBridge invoke the
function (without it the rule exists but the function never runs), and
the target:

```sh
aws events put-rule --region us-west-2 --name 24frame-social-topic-tag \
  --schedule-expression 'rate(5 minutes)' --state DISABLED
aws lambda add-permission --region us-west-2 \
  --function-name 24frame-social-topic-tag \
  --statement-id 24frame-social-topic-tag-schedule \
  --action lambda:InvokeFunction --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-west-2:ACCOUNT_ID:rule/24frame-social-topic-tag
aws events put-targets --region us-west-2 --rule 24frame-social-topic-tag \
  --targets 'Id=tagger,Arn=arn:aws:lambda:us-west-2:ACCOUNT_ID:function:24frame-social-topic-tag'
```

Then the alarms (next section).

**Dry run.** Checks every connection without tagging or writing
anything; it costs a fraction of a cent (one tiny Claude call):

```sh
aws lambda invoke --region us-west-2 \
  --function-name 24frame-social-topic-tag \
  --cli-binary-format raw-in-base64-out --payload '{"dryRun":true}' dry-run.json
cat dry-run.json
```

Every line should say `ok`. `mux` or `s3` may say `skipped` if there is
no video or image post yet. Anything `failed` names what to fix.

**Every later deploy** (after a merge that touches the tagger): build and
push with the new commit, then

```sh
aws lambda update-function-code --region us-west-2 \
  --function-name 24frame-social-topic-tag --image-uri $IMAGE
```

**What is running?** Each run's log line carries `build` (the commit),
and `aws lambda get-function --function-name 24frame-social-topic-tag
--query Code.ImageUri` shows the image. **Rollback:** run
`update-function-code` with the previous commit's image.

## Alarms

All alarms email the SNS topic. Confirm the email subscription first.

The log filters below match a plain phrase, so they work with Lambda's
default text log format, which puts a timestamp, request id and level
before each line. Lambda only creates the log group on the first run, so
create it first; if the dry run already ran, `create-log-group` says the
group exists, which is fine.

```sh
LOG_GROUP=/aws/lambda/24frame-social-topic-tag
TOPIC_ARN=arn:aws:sns:us-west-2:ACCOUNT_ID:24frame-social-topic-alerts

aws logs create-log-group --region us-west-2 --log-group-name $LOG_GROUP

# 1. Crashes or bad settings (missing env): the run itself fails.
aws cloudwatch put-metric-alarm --region us-west-2 \
  --alarm-name 24frame-social-topic-errors \
  --namespace AWS/Lambda --metric-name Errors \
  --dimensions Name=FunctionName,Value=24frame-social-topic-tag \
  --statistic Sum --period 300 --evaluation-periods 3 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --alarm-actions $TOPIC_ARN

# 2. Posts failing (an outage of Claude, Mux, S3 or the database, or a
#    wrong setting). A run gives each post up to 90 seconds and starts
#    posts for 3 minutes, so even a service that hangs fails at least 2
#    posts a run when 2 or more are waiting: 22 or more an hour. One stuck
#    post fails at most 13 times an hour. This fires at 20, so an outage
#    pages you and one bad post does not. With only one post waiting, an
#    outage looks like one stuck post until a second post arrives.
aws logs put-metric-filter --region us-west-2 --log-group-name $LOG_GROUP \
  --filter-name post-failures \
  --filter-pattern '"social topic post failed"' \
  --metric-transformations metricName=PostFailures,metricNamespace=24Frame/SocialTopic,metricValue=1
aws cloudwatch put-metric-alarm --region us-west-2 \
  --alarm-name 24frame-social-topic-post-failures \
  --namespace 24Frame/SocialTopic --metric-name PostFailures \
  --statistic Sum --period 3600 --evaluation-periods 1 --threshold 20 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching --alarm-actions $TOPIC_ARN

# 3. The schedule stopped (rule disabled by mistake, permission lost):
#    no finished run in 30 minutes.
aws logs put-metric-filter --region us-west-2 --log-group-name $LOG_GROUP \
  --filter-name runs \
  --filter-pattern '"social topic tagging done"' \
  --metric-transformations metricName=Runs,metricNamespace=24Frame/SocialTopic,metricValue=1
aws cloudwatch put-metric-alarm --region us-west-2 \
  --alarm-name 24frame-social-topic-heartbeat \
  --namespace 24Frame/SocialTopic --metric-name Runs \
  --statistic Sum --period 1800 --evaluation-periods 1 --threshold 1 \
  --comparison-operator LessThanThreshold \
  --treat-missing-data breaching --alarm-actions $TOPIC_ARN
aws cloudwatch disable-alarm-actions --region us-west-2 \
  --alarm-names 24frame-social-topic-heartbeat   # until you turn tagging on

# 4. Unusable answers spiking (Claude refusing or cut off on many posts).
aws logs put-metric-filter --region us-west-2 --log-group-name $LOG_GROUP \
  --filter-name unusable \
  --filter-pattern '"social topic unusable answer"' \
  --metric-transformations metricName=Unusable,metricNamespace=24Frame/SocialTopic,metricValue=1
aws cloudwatch put-metric-alarm --region us-west-2 \
  --alarm-name 24frame-social-topic-unusable \
  --namespace 24Frame/SocialTopic --metric-name Unusable \
  --statistic Sum --period 3600 --evaluation-periods 1 --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching --alarm-actions $TOPIC_ARN
```

**Test each alarm once** so you know the email arrives:

```sh
aws cloudwatch set-alarm-state --region us-west-2 \
  --alarm-name 24frame-social-topic-post-failures \
  --state-value ALARM --state-reason "test"
```

The unusable threshold (10 an hour) is a starting point; adjust it after
the first week.

## Accuracy test (sets the threshold)

1. **Pick posts.** Export about 150 recent posts to label (read-only).
   Label from the **whole post** (open the link), because the tagger also
   sees the photos and video frames:

   ```sql
   select id,
          '/social/p/' || id as link,
          body as caption,
          jsonb_array_length(coalesce(media, '[]'::jsonb)) as media_items,
          created_at
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

   It never writes. It reads the same caption, crafts, images and video
   frames live tagging reads, and scores each threshold with the same
   rule live tagging uses. Each row shows how many images or frames were
   read. It costs roughly a cent per post. A post it cannot read is
   listed as skipped with its error; fix the env and run again if many
   are skipped.

   ```sh
   pnpm exec tsx --conditions=react-server scripts/social-topic-eval.ts labels.csv
   ```

4. **Run it twice.** The model does not answer identically every time;
   the difference between the two runs shows how much to trust each
   row of the table.
5. **Read the table.** For each confidence threshold it shows how many
   posts got a topic, how many were right, and how many were wrong.
   Pick the lowest threshold where wrong topics are rare enough for you.
6. **Tell an agent the threshold.** It updates
   `SOCIAL_TOPIC_MIN_CONFIDENCE` (provisional 0.8) in a PR. Rebuild and
   deploy the image after it merges.
7. **Turn it on:**

   ```sh
   aws events enable-rule --region us-west-2 --name 24frame-social-topic-tag
   aws cloudwatch enable-alarm-actions --region us-west-2 \
     --alarm-names 24frame-social-topic-heartbeat
   ```

## Watching it

- **Logs.** CloudWatch, log group `/aws/lambda/24frame-social-topic-tag`.
  Each run logs `{"msg":"social topic tagging done", ...}` with the build
  (commit) and counts: selected, tagged, declined (no confident topic),
  unusable, wait (a video still preparing), raced, error and deferred.
- **Failures.** One post's error is logged
  (`{"msg":"social topic post failed","postId":...}`), counted in
  `error`, and retried next run; the run still succeeds. Alarm 2 emails
  you when failures pile up; alarm 1 when the run itself fails (a
  missing setting). A post that keeps failing for 7 days leaves the job.
- **Unusable answers** are logged as
  `{"msg":"social topic unusable answer","postId":...,"reason":...}`.
  A few are normal (Claude may decline some violent or horror stills);
  alarm 4 fires on a spike.
- **In the app.** A new post shows its topic chip on Social Home within
  about 10 minutes; a video post once Mux finishes processing the video.
- **Turn off:**

  ```sh
  aws events disable-rule --region us-west-2 --name 24frame-social-topic-tag
  aws cloudwatch disable-alarm-actions --region us-west-2 \
    --alarm-names 24frame-social-topic-heartbeat
  ```

  Stored topics stay, including on posts edited while tagging is off;
  they are re-checked when you turn it back on (if edited in the last
  7 days). Nothing needs cleaning up: the tagger never changes a video.
- **Many posts failing with a Mux or S3 "not found"?** Check the
  function's Mux keys are from the same Mux environment as Social
  uploads, and that `S3_MEDIA_SOURCE_BUCKET` matches Vercel. Run the dry
  run to confirm the fix.

## Fixing a wrong topic

Some topics will be wrong at any threshold. To remove one, run this in
the Supabase SQL editor (a production change you run yourself; one post
at a time). It clears the AI topic but keeps the look, so the tagger does
not put a topic back; a later caption edit reopens the post as usual.

```sql
begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.posts
   set category = null, category_source = null,
       category_confidence = null, category_logic_version = null
 where id = 'POST_ID' and category_source = 'ai';
commit;
```

The `set_config` line is needed because the database refuses topic
changes from anyone but the tagger. A "remove topic" button for staff or
authors is a later founder decision.

## Not in this PR

- **Video transcripts:** a later PR transcribes a video's audio
  separately (never adding captions to the author's video), with a
  10-minute cap so a long upload cannot run up transcription cost.
- **Tagging right after a post is saved**, with this schedule kept as a
  backup: a later PR.
- **A topics-only database credential** instead of the service role: a
  later PR.
- **Older posts (backfill):** a separate founder-run step after the
  accuracy test, using the Batches API at half price, spending from the
  tagging workspace. The role then needs the batch IAM actions.
- **Topic chips on Explore:** the Explore PR.
