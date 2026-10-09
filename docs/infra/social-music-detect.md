# Social music detect-and-block: founder runbook

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
  `social_music_scans` row for that post or story in the same transaction
  (insert, and a story or post media update). A later parent that reuses
  the same asset gets its own row. A prior verdict is copied only when
  `asset_id` and `playback_id` both match. A prior blocked decision is
  copied before a prior allowed decision. A prior pending scan is not
  copied. A different playback id on the same asset stays pending and is
  scanned on its own. No scan row is not a release.
- Every video stays hidden from other people until that parent has an
  allowed scan. Mux matches the asset id and the playback id. A non-Mux
  video matches `md5` of its storage key. The trigger rejects a new
  non-Mux video (`social video must be a Mux video`). Stills and text
  stay visible. The author still sees their own post or story.
- The server writes `social_mux_bindings` only after Mux confirms the
  upload, the asset, the playback id, and a passthrough that names the
  member. The row is keyed by author, asset, and playback. The trigger
  raises unless that triple exists (`social mux video is not bound to
  this member`). There is no authenticated insert policy. Posts and
  stories still insert on the member session; the binding is what stops
  a crossed pair. A direct insert of a mixed pair fails even when each
  id was finalized on its own. A missing or short Mux id raises
  (`social music scan requires a Mux asset id and playback id`).
- Applying this SQL backfills existing Mux videos as pending, so they
  leave other people's feeds until a scan allows them. Existing S3
  videos on posts and non-expired stories are backfilled pending,
  `next_attempt_at` null, `last_error` `s3_video_needs_mux`, and hidden.
  They are not retried into a Mux 404. Legacy Mux items whose ids cannot
  be scanned are backfilled the same way with `last_error`
  `mux_id_malformed`, so Music review lists them as Unfinished. They stay
  hidden because release looks up the raw ids and finds no allowed row.
  Expired stories are not backfilled.
- Playback for someone else is minted per playback id, not per parent. The
  parent being played needs its own allowed scan. A pending scan on a
  different post or story does not make an allowed post unplayable. Any
  blocked row for that playback id denies the mint. A missing scan table,
  a missing relation, or any scan read error denies the mint for someone
  else. The author can still preview a video that only they can see.
  `/api/social/media` does not sign an `mp4`, `mov`, `webm`, or `m4v` key.
  Social video plays through Mux. An image key is signed only when the
  stored bytes are a real image of the declared type.
- A new profile welcome video uses the same Mux upload, binding, scan,
  and eight-minute cap as a post or story. S3 does not accept a new
  video in any lane. The public band stays presence only. Other people
  see a welcome video only after that profile has an allowed scan, and
  not when any row for that asset and playback is blocked. The
  owner still sees their own marker. A legacy S3 key stays hidden from
  other people. Clearing the welcome video clears the key and the Mux
  ids. The stored object is not deleted.
- When a scan blocks, other allowed and pending rows for the same
  asset id and playback id are set to blocked in the same decision, so
  they enter Music review. The current row is saved blocked after that.
  A playback id with any blocked row cannot be minted as allowed.
- Every minute the Lambda takes due pending rows (at most 8):
  - Mux asset not ready, rendition missing, or rendition still preparing:
    wait 20 seconds and do not burn an attempt. A rendition request that
    reports the audio file already exists does not burn an attempt.
  - If that wait has already lasted 6 hours from `created_at`, hold
    immediately (`mux_prep_expired`). `attempt_count` is at the cap and
    `next_attempt_at` is null. Music review lists it as Unfinished. Do
    not request another rendition after that hold.
  - After the rendition is ready, the signed playback id on the asset
    must equal the scan's playback id. A mismatch holds
    (`mux_playback_mismatch`) and does not call identify.
  - Coverage is contiguous 12-second windows, up to 40 windows (eight
    minutes). The last window is `[end - 12, end]`, and `end` is the
    length of the downloaded `audio.m4a`, not Mux `asset.duration`.
    One ACRCloud identify per window. Unknown, non-finite, or
    non-positive duration retries (`unknown_duration`) and then holds.
    It is never allowed and never sent to identify. A stored duration
    over eight minutes is a backstop only (`duration_over_cap`): one
    attempt, then retry, then hold. It is not an immediate staff hold
    and it is not sampled. Upload creation, Mux asset ready, and
    publish verify already refuse a clip over 480.5 seconds. Go live stops
    the recorder at 479 seconds so a full take stays inside that line.
    If the m4a
    length and Mux duration differ by more than one second, the scan
    holds (`mux_audio_duration_mismatch`).
  - The worker downloads `audio.m4a` once (signed, no Mux time range, cap
    20 MB) and cuts the windows inside the Lambda. Mux
    `asset_start_time` and `asset_end_time` are not used. An empty cut,
    a window over 512 KB, a window whose bytes match an earlier window,
    or a file the cutter cannot parse fails closed and counts an attempt.
  - A music score at or above 25 on any window blocks, even when another
    window errored. Under that line, a window error retries the scan.
    `metadata.custom_files` is ignored. A bucket hit cannot allow a clip.
    No music match, or a highest score under 25: `allowed`.
  - The worker leases the row (increments `attempt_count` and pushes
    `next_attempt_at`) before the download. A timeout or crash mid-scan
    counts that attempt and does not count it twice if the failure path
    also runs. A throw before the lease still counts once, from the
    batch. Preparing and rendition polls do not lease.
  - Vendor error, timeout, or a bad sample: stay `pending`. That error
    window is not stored. The next attempt calls identify again. A stored
    match or no-match window is kept. Backoff is 30s, 1m, 2m, 5m, 10m,
    30m, 1h. After 8 attempts, `next_attempt_at` is null, the owner sees
    the malformed line, and other people still do not see the video. A
    Mux asset error holds immediately. Nothing is published on error.
  - A skipped audio rendition is allowed only when Mux returns a track
    list and none of the tracks are audio. A missing track list or an
    errored rendition stays pending, then holds. ACRCloud 2004 is clean
    only when the decoded window's RMS is under 0.001 (about -60 dBFS).
    A null RMS is not silence. The Lambda image includes ffmpeg so an
    AAC window can be decoded.
  - A vendor HTTP 429 or ACRCloud 3003 uses that same backoff, does not
    burn an attempt, and stops the batch. The next row waits for the
    next invocation.
- Each decision logs `social music scan` with `mux_ready_at`,
  `scan_started_at`, `decided_at`, and `mux_ready_to_decision_ms`. The log
  line does not include the song title or artist.
- Staff open **Music review** (`/staff/music`) for blocked rows and for
  pending rows that will not be retried (`next_attempt_at` null). That
  page uses the service role after a `gc_staff` check. The queue is a
  spot-check and appeal list. Opening it does not change `blocked` and
  does not publish the video. End-user copy stays generic. The blocked
  line is one constant, `SOCIAL.music.blocked`: "This video can't be shared because it includes music."
  Lock: `docs/design-locks/social-music-block-copy-lock-v1.md`.

## S3 video already stored

On apply, those items fail closed: pending, hidden, Unfinished. The
re-ingest script creates a Mux asset from a short-lived presigned S3
URL, records a binding, and leaves the scan pending until an allowed
verdict. It covers post, story, and welcome videos, including an item
whose content type is `video/*` without `kind: video`. A second run
reuses the Mux asset already recorded and does not create another one.
After the parent is bound, the old S3 scan row is marked `superseded`
so Music review does not list it as Unfinished. Expired stories and
missing objects are Unfinished and are not retried. Default is a dry
run that prints counts. `--execute` writes. Do not run it from CI.

```sh
pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts
pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts --execute
```

## Rollback

Restore `posts_select` and `stories_select` (the policies from
`20260912120000_groups_posts.sql` and `20260914120000_social_home_stories.sql`)
before `drop function private.social_video_released`. Then drop
`social_music_scans`, `social_mux_bindings`, the two enum types, and
`drop schema if exists private`. The header of the migration is the
exact order. `private` is not added to the Data API schemas.

Dropping the tables deletes verdicts and bindings. The restored
policies make blocked videos visible again. Revert the app in the same
window. Leaving the new app on the old database denies Mux playback
and video signing except for the author. Welcome Mux columns go away.
Deleting an account cascades scan and binding rows.

## Apply window

Adam applies both files, in filename order, on prod. Do not apply from CI.
Do not reorder statements inside a file. `lock_timeout` is 3 seconds in
both files. That caps how long a statement waits to acquire a lock. It
does not cap how long the lock is held after it is acquired. If the wait
exceeds 3 seconds, the statement aborts. Retry in a quieter window.

`20261008180000_social_music_scans.sql` locks:

- `public.posts`: ACCESS EXCLUSIVE when `posts_select` is replaced, held
  until the transaction commits, which includes the post video backfill.
  Expected hold: the time to insert one scan row per existing post video.
  Count those rows before apply. Pending backfill rows do not take an
  advisory lock.
- `public.stories`: ACCESS EXCLUSIVE when `stories_select` is replaced,
  held through the story video backfill. Expected hold: one scan row per
  non-expired story video.
- `public.social_music_scans`: ACCESS EXCLUSIVE for CREATE TABLE
  (milliseconds; the table is new), then ROW EXCLUSIVE for the backfill
  inserts in the same transaction.
- `public.social_mux_bindings`: ACCESS EXCLUSIVE for CREATE TABLE
  (milliseconds; the table is new).

This file does not lock `public.profiles`.

Read-only count before apply. One row per video item the backfill inserts:

```sql
select
  (select count(*) from public.posts p
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p.media) = 'array' then p.media else '[]'::jsonb end
    ) as item
    where (
        lower(btrim(coalesce(item->>'kind', ''))) = 'video'
        or lower(btrim(split_part(coalesce(item->>'contentType', ''), ';', 1))) like 'video/%'
      )
      and (
        coalesce(item->>'provider', '') = 'mux'
        or coalesce(item->>'key', '') <> ''
      )
  ) as post_video_items,
  (select count(*) from public.stories st
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(st.media) = 'array' then st.media else '[]'::jsonb end
    ) as item
    where st.expires_at > now()
      and (
        lower(btrim(coalesce(item->>'kind', ''))) = 'video'
        or lower(btrim(split_part(coalesce(item->>'contentType', ''), ';', 1))) like 'video/%'
      )
      and (
        coalesce(item->>'provider', '') = 'mux'
        or coalesce(item->>'key', '') <> ''
      )
  ) as live_story_video_items;
```

`20261008180100_profiles_welcome_mux.sql` locks only `public.profiles`:

- ACCESS EXCLUSIVE for `ADD COLUMN` (three nullable columns, no table
  rewrite) and `ADD CONSTRAINT ... NOT VALID`. VALIDATE CONSTRAINT runs
  in this same transaction, so it runs while that ACCESS EXCLUSIVE lock
  is still held. It is not a separate SHARE UPDATE EXCLUSIVE window.
  Expected hold: the ADD plus one pass over `profiles`. This is not the
  video backfill.
- SHARE ROW EXCLUSIVE for `CREATE TRIGGER` is also held with the ACCESS
  EXCLUSIVE lock until commit. Expected hold: milliseconds once acquired.

Rollback restores `posts_select` and `stories_select` without the music
predicate, so blocked videos are visible again. Revert the app in the same
window. Leaving the new app on the old database denies Mux playback and
video signing except for the author. The SQL and the app move together.

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

## Welcome row states

One welcome row, and what each action does to it. Notice is the author
line (`welcomePending`, `blocked`, or none). Others is whether someone
else sees the current welcome. Queue is `next_attempt_at`: due, later,
or off. Asset is a new Mux asset. N/A means that action does not apply.

A pending row saved again after a clear goes back on the worker
(`next_attempt_at = now()`) and its `attempt_count` returns to 0, including
a row that has already used all 8 tries. The same row and the same asset
resume. Windows already saved are kept. Blocked and allowed rows are not
requeued and keep their attempt count. No other row is made active. Clearing an S3 welcome whose Mux
ids are already null still marks that digest `superseded`, so the author
notice goes away. A `reingest_failed` welcome rerun reuses the upload
already stored on that row and does not create a second Mux asset.

A stored clip whose audio is over 480.5 seconds is not the recorder
stop. The worker records `duration_over_cap`, retries, then holds. The
notice is `malformed`. Test: `retries a clip longer than the cap without identifying`.

| State | Save a new pair | Clear | Re-save the same pair | Worker tick | Re-ingest rerun | 8 min / 479 s stop |
| --- | --- | --- | --- | --- | --- | --- |
| pending (queued) | welcomePending; hidden; old off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | welcomePending; hidden; due; no asset. `welcome state: re-save the same pair` | none; visible; off; no asset. `welcome state: worker tick`. `allows a no-match and does not store a title` | N/A. Stays welcomePending, hidden, due. No asset. `welcome state: re-ingest rerun` | N/A |
| pending (mid-scan) | welcomePending; hidden; old off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | welcomePending until the worker finishes; hidden; due; no asset; same windows. `finishes a cleared pending welcome when the same pair is saved again` | none; visible; off; no asset; stored window not identified again. `welcome state: worker tick`. `does not rescan a window that was already stored` | N/A. Stays welcomePending, hidden, due. No asset. `welcome state: re-ingest rerun` | N/A |
| pending (backing off) | welcomePending; hidden; old off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | welcomePending; hidden; due now; attempts 0; no asset. `welcome state: re-save the same pair` | welcomePending; hidden; later, not claimed; no asset. `welcome state: worker tick`. `backs off a rate limit without burning the leased attempt` | N/A. Stays welcomePending, hidden, later. No asset. `welcome state: re-ingest rerun` | N/A |
| pending (exhausted) | welcomePending; hidden; old off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | welcomePending; hidden; due; attempts 0; no asset. `welcome state: re-save the same pair` | malformed; hidden; off, not claimed; no asset. `welcome state: worker tick` | N/A. Stays malformed, hidden, off. No asset. `welcome state: re-ingest rerun` | N/A |
| allowed | welcomePending; hidden; old off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | none; visible; off; no asset. `shows an allowed welcome again when the same pair is saved again` | none; visible; off, not claimed; no asset. `welcome state: worker tick` | N/A. Stays none, visible, off. No asset. `welcome state: re-ingest rerun` | N/A |
| blocked | welcomePending; hidden; old off, new due; no asset. `supersedes a replaced welcome pair so the old scan does not decide the new one` | none; hidden; off; no asset. `welcome state: clear` | blocked; hidden; off; no asset. `restores a blocked welcome notice when the same pair is saved again` | blocked; hidden; off, not claimed; no asset. `does not scan again or flip a blocked decision on a second pass` | N/A. Stays blocked, hidden, off. No asset. `welcome state: re-ingest rerun` | N/A |
| reingest_failed | welcomePending; hidden; digest off, new due; no asset. `welcome state: save a new pair` | none; hidden; off; no asset. `welcome state: clear` | N/A. Digest is not a Mux pair. Row stays reingest_failed, off. `welcome state: re-save the same pair` | welcomePending; hidden; off, not claimed; no asset. `welcome state: worker tick` | welcomePending; hidden; digest off, new due; no second asset. `welcome state: re-ingest rerun`. `retries a reingest_failed parent once, without a second asset, and still isolates the next failure` | N/A |
| superseded | welcomePending on the new pair; hidden; this row stays off; no asset. `leaves other superseded welcome rows superseded when one pair is saved again` | none; hidden; off; no asset. `welcome state: clear` | welcomePending; hidden; due; no asset. `welcome state: re-save the same pair` | none; hidden; off, not claimed; no asset. `welcome state: worker tick` | N/A. No S3 key. Row stays superseded, off. `welcome state: re-ingest rerun` | N/A |

## Order

1. Run the read-only video count above. Hand the two numbers to Adam before apply.
2. Apply `supabase/migrations/20261008180000_social_music_scans.sql`, then
   `supabase/migrations/20261008180100_profiles_welcome_mux.sql`.
3. Dry-run the image recheck, then execute it. `--execute` writes each
   re-encoded image to a new key and points the post, story, or avatar at
   that key. It never overwrites the original under the same key. The
   original stays in the private bucket and is not signed once the pointer
   names the new key, so the run can be reversed. A post or story whose
   image will not decode is hidden. A read error or a store error is
   unfinished: reported, not hidden, and tried again on the next run
   (the run loads `status = active` only). An avatar that will not decode
   is cleared so the default face shows. Its original object is left in
   place. A second execute skips objects that already carry `gc-reencoded`.

   Reversal: read `gc-previous-key` on the new object. Point the post or
   story media item back at that key. For an avatar, set
   `profiles.avatar_key` back to that previous key (`avatars/{user-id}/avatar`
   for a face that was rechecked off the canonical object). Do not delete
   either object as part of this reversal.

```sh
pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts
pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts --execute
```

4. Deploy the app (the author notice and the staff page).
5. Build and create the Lambda, set env, then the disabled schedule.
6. Dry run the worker. Enable the rule when the dry run is `ok`.
   S3 video re-ingest stays a separate founder step:
   `scripts/social/reingest-welcome-video.ts`.

Apply the SQL before the app. A missing scan table denies playback and
video-key signing for anyone who is not previewing only their own row.
A notice read that fails twice surfaces the error. Applying the SQL
first hides videos from other people even before the worker exists. They
stay pending, which is the fail-closed state.

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

## Slicer smoke (pending deploy)

After the function is live, confirm one real Mux `audio.m4a` cuts into
the planned windows and that those windows are not identical bytes.
This step waits on deploy. The unit test reads two committed AAC
files, a 12.3 second tone and a one-frame tail, and checks the same
cutter. CI does not need ffmpeg. The Lambda does not decode AAC. An
ACRCloud `2004` on AAC stays an error. A `2004` is treated as silence
only when the window is little-endian PCM (`sowt`) under the RMS line.
