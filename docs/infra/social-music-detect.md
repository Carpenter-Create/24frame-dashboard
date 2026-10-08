# Social music detect-and-block — founder runbook

CoS CLEAR 2026-10-08: Phase 0 commercial-music check on Social video
(Stories, posts, Create). ACRCloud identify is the primary vendor.
Decision is allow or block. No mute. No AudD. No custom catalog upload.

Policy 2026-10-08 2:24pm CT: no music is allowed until Content ID is
sorted out. The block threshold lives in `musicScanConfig.blockScore`
(default 25). A separate confident score (default 70) is a staff log
priority only and never lets a clip pass. Adam's own CFN tracks match
ACRCloud Music at score 100, so they block too. That is accepted for
Phase 0. End-user and staff copy are locked in
`docs/design-locks/social-music-block-copy-lock-v1.md`.

**Off until you turn it on.** The EventBridge schedule is the on/off
switch. Create it disabled. The function runs whenever it is invoked.

Do **not** create these resources from CI. Do **not** apply the migration
from CI. Adam applies the SQL on prod.

## What it does

- A Mux video saved on `posts.media` or `stories.media` inserts one
  `social_music_scans` row for that post or story in the same transaction.
  A later parent that reuses the asset gets its own row. A prior blocked
  decision is copied onto the new row, and a prior allowed decision is
  copied too. A prior pending scan is not copied: the new row stays
  pending. Other people cannot see a Mux video until that parent has an
  allowed scan for the asset id and playback id. No scan row is not a
  release. Stills and text stay visible. The author still sees their own
  post or story. Applying this SQL backfills existing Mux videos as
  pending, so they leave other people's feeds until a scan allows them.
- Publish checks the upload, asset, and playback id with Mux and requires
  the upload passthrough to name the member. A Mux video with a missing
  or short asset id is rejected. The database trigger raises if a Mux
  video is stored without a scannable asset id and playback id.
- Every minute the Lambda takes due pending rows (at most 8):
  - Mux asset not ready: wait 20 seconds. `mux_ready_at` stays empty.
  - Asset ready: stamp `mux_ready_at`, request an audio-only static
    rendition if it is missing, then download up to eight 12-second
    windows of `audio.m4a` (signed; each window capped at 5 MB) and call
    ACRCloud identify on each. The highest finite `metadata.music` score
    decides. One window error retries the scan. A read of the Mux asset
    that throws records an attempt and moves on, so one bad row does not
    stall the batch.
  - No music match, or a highest `metadata.music` score under 25: `allowed`.
    `metadata.custom_files` is ignored. A bucket hit cannot allow a clip.
  - Score 25 or higher: `blocked` immediately. Vendor title and artist are
    stored for staff only. The block does not wait on the review queue.
  - Vendor error, timeout, or a bad sample: stay `pending`, increment
    `attempt_count`, set `next_attempt_at` (30s, 1m, 2m, 5m, 10m, 30m, 1h).
    After 8 attempts, `next_attempt_at` is null and the video stays hidden.
    A Mux asset error holds immediately. Nothing is published on error.
  - A rendition request that reports the audio file already exists or is
    in progress does not burn an attempt. The worker polls. Other Mux
    errors retry.
  - A skipped or missing audio rendition stays pending. Phase 0 does not
    allow a silent clip. After the attempt cap, Music review lists it as
    Unfinished and the video stays hidden.
- Each decision logs `social music scan` with `mux_ready_at`,
  `scan_started_at`, `decided_at`, and `mux_ready_to_decision_ms`. The log
  line does not include the song title or artist.
- Staff open **Music review** (`/staff/music`) for blocked rows and for
  pending rows that will not be retried. That page uses the service role
  after a `gc_staff` check. The queue is a spot-check and appeal list.
  Opening it does not change `blocked` and does not publish the video.
  End-user copy stays generic. The blocked line is one constant,
  `SOCIAL.music.blocked`: "This video can't be shared because it includes music."
  Lock: `docs/design-locks/social-music-block-copy-lock-v1.md`.

## Allowlist

Phase 0 has no allowlist. A future allowlist could slot in before the
block write. This worker does not upload audio to an ACRCloud custom
bucket and does not read `metadata.custom_files`.

## Env (names only)

Function env, server-only. Never `NEXT_PUBLIC_` except the existing
Supabase URL name. Never commit values.

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_SIGNING_KEY=
MUX_PRIVATE_KEY=
ACRCLOUD_HOST=
ACRCLOUD_ACCESS_KEY=
ACRCLOUD_ACCESS_SECRET=
```

`ACRCLOUD_HOST` is the identify hostname (for example
`identify-eu-west-1.acrcloud.com`), not a full URL. No AWS keys on the
function. The execution role is logs only. Do not set `AWS_REGION`; Lambda
sets it.

Use the Lambda console to change one env value. `aws lambda
update-function-configuration --environment` replaces every value.

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account / region | E8, `us-west-2` | Same account as the Social topic tagger. Confirm. |
| ECR repository | `24frame-social-music` | Images tagged by git commit. |
| IAM role | `24frame-social-music-scan` | Trust `lambda.amazonaws.com`. `AWSLambdaBasicExecutionRole` only. |
| Lambda | `24frame-social-music-scan` | Container image, x86_64, 1024 MB, timeout 5 min, reserved concurrency 1. Asynchronous retries 0. |
| EventBridge rule | `24frame-social-music-scan` | `rate(1 minute)` → the function. **Created disabled.** |
| Migration | `supabase/migrations/20261008180000_social_music_scans.sql` | Adam applies. Not applied by this repo. |

Mux credentials need Video read and write in the same Mux environment as
Social uploads. The worker POSTs an audio-only static rendition, then
reads it. A signing key stays with those credentials. Separate them from
the website token if you want the same split as topic tagging. ACRCloud
is HTTPS from the function; it is not an AWS API. The worker uses the
service role to read and update scan rows. Narrowing that key to the
scan table is a follow-up. It is not part of this change.

## Order

1. Apply `supabase/migrations/20261008180000_social_music_scans.sql`.
2. Deploy the app (the author notice and the staff page).
3. Build and create the Lambda, set env, then the disabled schedule.
4. Dry run. Enable the rule when the dry run is `ok`.

Deploying the app before the migration is safe: the notice read fails
closed to an empty map, and the old policies stay until the SQL lands.
Applying the SQL first hides new videos from other people even before the
worker exists. They stay pending, which is the fail-closed state.

## Build and deploy

Merge ≠ live. Build from a clean checkout of `main`.

```sh
REGISTRY=ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com
SHA=$(git rev-parse HEAD)
IMAGE=$REGISTRY/24frame-social-music:$SHA

docker build --platform linux/amd64 --provenance=false \
  --build-arg GIT_SHA=$SHA \
  -f workers/social-music/Dockerfile -t $IMAGE .
aws ecr get-login-password --region us-west-2 \
  | docker login --username AWS --password-stdin $REGISTRY
docker push $IMAGE
```

```sh
aws lambda create-function --region us-west-2 \
  --function-name 24frame-social-music-scan \
  --package-type Image --code ImageUri=$IMAGE \
  --role arn:aws:iam::ACCOUNT_ID:role/24frame-social-music-scan \
  --architectures x86_64 --memory-size 1024 --timeout 300
aws lambda put-function-concurrency --region us-west-2 \
  --function-name 24frame-social-music-scan --reserved-concurrent-executions 1
aws lambda put-function-event-invoke-config --region us-west-2 \
  --function-name 24frame-social-music-scan --maximum-retry-attempts 0
```

Set env in the console, then the schedule **disabled**:

```sh
aws events put-rule --region us-west-2 --name 24frame-social-music-scan \
  --schedule-expression 'rate(1 minute)' --state DISABLED
aws lambda add-permission --region us-west-2 \
  --function-name 24frame-social-music-scan \
  --statement-id 24frame-social-music-scan-schedule \
  --action lambda:InvokeFunction --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-west-2:ACCOUNT_ID:rule/24frame-social-music-scan
aws events put-targets --region us-west-2 --rule 24frame-social-music-scan \
  --targets 'Id=scan,Arn=arn:aws:lambda:us-west-2:ACCOUNT_ID:function:24frame-social-music-scan'
```

Dry run:

```sh
aws lambda invoke --region us-west-2 \
  --function-name 24frame-social-music-scan \
  --cli-binary-format raw-in-base64-out --payload '{"dryRun":true}' dry-run.json
cat dry-run.json
```

`database` and `acr` should be `ok`. `mux` may be `skipped: no pending scan`.

Later deploys: `aws lambda update-function-code` with the new image.
Rollback is the previous commit's image.

## Smoke after enable

- Upload a Social video with no commercial music. It stays on the author's
  profile with "This video is not visible to others yet." A second account
  does not see it. After the worker allows it, the second account does.
- A music match at score 25 or higher stays hidden. The author sees
  "This video can't be shared because it includes music." **Music review**
  shows the vendor fields. The row stays `blocked`.
- Stop ACRCloud (bad host) and confirm the video stays hidden and is not
  published. The row's `attempt_count` climbs and `next_attempt_at` moves
  out.

Hot feeds for other people can lag up to 60 seconds after an allow
(`SOCIAL_HOT_TTL_SECONDS`). The row was never in their cache while pending.
