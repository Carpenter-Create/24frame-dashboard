# Operational gotchas

Conditionally loaded reference for repository-specific lessons that are not already in
[`docs/domain-spec.md`](../domain-spec.md). Read when the trigger matches your task.

---

## Trigger: Supabase RPC and generated types

**When:** Writing or calling RPCs; regenerating `database.types.ts`; TypeScript rejects a `.rpc()` call.

Supabase `gen types` marks every RPC arg without a `DEFAULT` as required non-null. An optional param
(one you want to pass `undefined`/omit from a `.rpc()` call) MUST be declared `… text default null`
in the SQL, or TS rejects the call. Bake `DEFAULT null` into the param the first time — do not ship
required-arg RPCs and patch with a follow-up migration.

The generator can only emit required-non-null or optional-non-null, never required-nullable —
hand-editing `database.types.ts` to fake the nullable case does not survive the next regeneration,
which reverts it silently and points the resulting build error at the call site, not the function it
actually came from.

Where the argument's meaning is "detach" (clear an existing value), spell that as an **omitted
(`undefined`) argument**, never an explicit `null`.

Prior incidents: `accept_terms`, `add_rights_grant`, `create_asset`, `attach_link_vendor` — all
required `DEFAULT null` fixes in follow-up migrations.

---

## Trigger: Authentication and server components

**When:** Adding auth checks in middleware, layouts, or pages; measuring navigation performance.

Never call `supabase.auth.getUser()` in app code — use `getAuthUser()` / `getOrgContext()` from
`lib/supabase`. `getUser()` is a network round-trip to the Auth server on every call (measured
35–49ms against a local Supabase; worse against hosted). Three calls per navigation — middleware,
layout, page — plus a duplicated memberships query, produced nine sequential round-trips.
`getClaims()` verifies the JWT locally via WebCrypto against a cached JWKS on asymmetric signing
keys (ES256 here) and still refreshes an expired token. Wrapped in React `cache()`, a layout and
its page share one verification. Layout render improved 79ms → 26ms in one remediation pass.

`getOrgContext()` extends this to identity + memberships + gc_staff + unread in one cached,
parallel resolution — a page under `(app)` must never re-query membership the layout already has.

**Independent Supabase queries in a server component must be `Promise.all`'d.** Awaiting them in
sequence costs a full round-trip each. This is the single easiest performance regression to
reintroduce.

---

## Trigger: Local email behavior

**When:** Login magic links or app-sent mail do not arrive during local development.

Local dev has **two email paths** and only one is fake:

- **Supabase Auth** (hosted `magic_link.html` — parked for product sign-in; still
  reachable if something calls `signInWithOtp`) → the local stack's own SMTP →
  **Mailpit at <http://127.0.0.1:54324>**. Never reaches a real inbox. The hosted
  template still includes both `{{ .ConfirmationURL }}` and `{{ .Token }}`.
- **App Auth email** (dashboard + mobile sign-in, portal OTP — `src/lib/email.ts`
  via `src/lib/auth-ses.ts`) → **Amazon SES us-west-2**, from `PORTAL_EMAIL_FROM`
  / `auth@24frame.co` (never noreply) → **a real inbox, even from localhost.**
- **GC Support / asset notification** (same `email.ts` module) → **Resend residual**,
  from `ASSETS_EMAIL_FROM` / `assets@globalcontent.co`.

Dashboard `/login` and mobile `/api/mobile/request-sign-in` do not call `signInWithOtp`.
They mint with service-role `generateLink` (no GoTrue mail) and send house email via
SES — web is link-only; mobile includes the enterable OTP in the same house shell.
GoTrue's `auth.rate_limit.email_sent` no longer applies to normal product sign-in;
app-layer `dashboard_sign_in_requests` caps both surfaces.

---

## Trigger: S3 and build behavior

**When:** `pnpm build` fails at module load; preview deploy fails before serving; S3 head/check
returns unexpected 404.

Account photos use a **dedicated** private bucket (`S3_AVATARS_BUCKET`, intended
`gc-avatars-prod` / `gc-avatars-dev`) via `src/lib/s3-avatars.ts`. That module
refuses to run when the value equals `S3_BUCKET`. It does not throw at module
load — `/account` stays empty until the founder applies
[`docs/infra/avatar-storage-setup.md`](../infra/avatar-storage-setup.md) and
sets the env. Do not apply that runbook from CI. Faces are never written to
`S3_BUCKET` or served through title CloudFront.

`src/lib/s3.ts` throws at **module load** if `S3_BUCKET`/`AWS_REGION` are unset — and `next build`
evaluates route modules, so a missing var fails the **build**, not just serving. Over 20 modules
import `@/lib/s3` (directly or transitively), including several route handlers.

**CI does not catch this** — `.github/workflows/ci.yml`'s `checks` job runs `pnpm typecheck` and
`pnpm test`, never `pnpm build`; only a real Vercel deployment attempt would surface it. Both vars
must exist in **every** Vercel environment this app is ever built in, **including preview**.

The guard is intentional: an unset bucket silently became `Bucket: undefined`, which S3 answers
with the same 404 a genuinely missing object gets, misfiring `headObjectMeta`'s absence check.
The consequence — runtime gap becomes build-time failure — needs to be known going in, not
discovered via a failed deploy.

Deleted title prefixes are the one DeleteObject exception on `S3_BUCKET` (founder lock).
`purgeTitlePrefix` in `src/lib/s3.ts` lists + deletes under
`orgs/<orgId>/titles/<titleId>/` only. IAM must stay on that prefix — never `$BUCKET/*`.
The existing unscoped `s3:ListBucket` in `gc-assets-mediaconvert` (HeadBucket for
`headObjectMeta`) stays; do not replace it with the prefix-conditioned list statement
alone or HeadBucket 404-disambiguation breaks. Avatars and other buckets still have no
DeleteObject.

---

## Trigger: Production migration apply (founder-gated wrapper)

**When:** Applying or rehearsing pending dashboard migrations; comparing local files to a
database ledger; choosing a Supabase CLI.

Use [`scripts/db/prod-migrate.sh`](../../scripts/db/prod-migrate.sh) only. It requires
Supabase CLI **exactly 2.102.0** on PATH and never invokes `npx` (bare or pinned). Default
is rehearsal: CLI version and a clean working tree, no database connection, and no
invented pending list. Proven 2.102.0 rehearsal against a database is
`supabase db push --dry-run --local` or `--linked` — that flag exists on 2.102.0;
do not invent another.

`--apply` is founder-only, requires `--target`, and requires typing the confirmation
string generated for the pinned pending set of that run. Agents must not apply,
repair, or mark migrations.

`--apply` also requires `GC_PROD_APPROVED_SHA`: the founder-approved 40-character
commit SHA of the exact release that is checked out. Export it immediately before
production execution. The wrapper will not derive it from `HEAD`, will not accept
a short SHA, and fails closed if the value is missing, empty, malformed, not a
commit in this repository, or not equal to the current `HEAD`. Clean `main` is
still required; the branch name alone is not sufficient.

`--apply` then asks pinned CLI 2.102.0 `db push --dry-run` what it would apply
to the selected target. The wrapper walks that plan line by line using the same
filename grammar as CLI 2.102.0 (`^([0-9]+)_(.*)\.sql$`): any numeric version
length and any suffix the CLI would accept, including hyphens, periods, spaces,
Unicode, and an empty name. Expected banner/info lines are ignored; any other
line fails closed. The complete ordered pending set is whatever that dry-run
reports. The wrapper does not invent or hardcode a pending list. Ambiguous or
unparseable output fails closed. An empty pending set (database up to date) is
a clean stop, not an apply. After typed confirmation the wrapper dry-runs
again; if the pending set changed, it stops and does not `db push`.

The 20260806–20260808 nine were a closed morning release. This wrapper no longer
pins that list. Files present under `supabase/migrations` are not an apply set
by themselves.

Before a production apply of the closed 20260806–20260808 nine:

1. Run [`scripts/security/preflight-screener-active-dupes.sql`](../../scripts/security/preflight-screener-active-dupes.sql)
   as a privileged SELECT. Aggregates only. If `conflicting_title_count > 0`, stop. Do not
   auto-revoke. Founder remediates with separately approved SQL, then re-runs the preflight.
2. Take a current production dump (founder). The 2026-07-27 dump is not sufficient for the
   current ledger.
3. Check out clean `main` at the approved release commit. Export
   `GC_PROD_APPROVED_SHA=<that exact SHA>` and apply only via the wrapper.
4. After apply, run [`scripts/security/verify-nine-20260806.sql`](../../scripts/security/verify-nine-20260806.sql)
   (catalog only) and [`scripts/security/verify-prod-end-state.sql`](../../scripts/security/verify-prod-end-state.sql)
   with the same pinned CLI 2.102.0 (`supabase db query --local` or founder
   `--linked`). Never `npx`.

Do not use `--linked` from an agent session. Never pass `--include-roles`.

`screener_concurrency_test.sql` needs a **superuser** session (`supabase_admin`
on the local image). The `postgres` role is not superuser; `dblink_connect`
then fails 2F003 and `dblink_connect_u` cannot be granted from `roles.sql`.
CI `isolation` writes the ordinary inventory with
`scripts/db/ordinary-pgtap-files.sh > "$inventory"` (every
`supabase/tests/*.sql` except this file). The helper is a normal command;
a nonzero exit is not consumed. Only after that success does CI run
`supabase test db` on the list, then a separate blocking step runs this
harness against the already-started local CI database as `supabase_admin`
with the documented local default credentials (not a production secret).
B3 and L7 run only after both database steps succeed.
A default local `supabase test db` that still discovers this file as
`postgres` must fail closed — do not skip it.

If that test creates `dblink` and then aborts before its owned cleanup, a local
superuser may run `drop extension if exists dblink;` only when no other local
session needs it and no other copy of this harness is running (invocations
serialize the extension lifecycle on a session-level advisory lock). Do not
drop a pre-existing `dblink`. Stale `__pgtap_scc__*` orgs/vendors from a
crashed run are not auto-swept (a sweep would delete a parallel invocation).
Delete only the leftover nonce you own, locally.

---

## Trigger: Apex vanity profile URLs (`24frame.co/@handle`)

**When:** Changing `/@handle` routing, reserved vanity names, or `24frame.co` / GoDaddy DNS.

Public canonical and handle preview are locked (`https://24frame.co/@{handle}` with stored casing; in-app `/social/u/{handle}`). A path segment starting with `@` is a Next.js parallel-route slot — do not put `@` in the in-app segment. This app rewrites `/@handle` in middleware to that in-app route only (reserved names skipped). Leftover `/social/u/@handle` bookmarks rewrite to the same bare route. Leftover `/social/@handle` bookmarks 301 to `/@handle`. It does not map bare `/{handle}` and does not serve marketing. Do not add a Next.js `rewrites()` `/@:handle` rule — it bypasses the reserved list. Do not publish `/social/@handle`.

Do not add `24frame.co` to Vercel project `24frame` without a marketing fallback: a Vercel domain is all-or-nothing and would take `/` and `/legal`. Prefer a rewrite on the existing marketing project. Exact steps: [`docs/infra/apex-vanity-profile-urls.md`](../infra/apex-vanity-profile-urls.md).

---

## Trigger: Notifications Realtime (`new_follower` peek)

**When:** Wiring in-app Social alerts to the header peek or `/activity` list.

One helper: `src/lib/notifications-realtime.ts`. Filter is
`recipient_user_id=eq.{auth.uid()}` — catalog kinds have a null
recipient and do not match. Peek and list share that channel
(ref-counted). Do not add a second `postgres_changes` listener on a
surface. Do not send email from this path.

Hosted Realtime is already on. If inserts do not appear live, Adam
enables Realtime on `public.notifications` (one Dashboard click).
Steps and founder SQL: [`docs/infra/notifications-realtime.md`](../infra/notifications-realtime.md).

---

## Trigger: Social Home list reads (class 5)

**When:** Changing Home following wall, stories rail, followee IN() set, or Explore search.

Named paths and independent caps live in `src/lib/social-home-bounds.ts`. Each loader probes `limit+1` and `splitProbe`. The following wall is `created_at+id` keyset (`after=`), never page-N OFFSET. Mapping C: `profiles.id`, no `org_id`. Do not reuse one silent PostgREST `max_rows` across followees, posts, and stories.

---

## Trigger: Stories MediaRecorder (Safari / iOS)

**When:** Changing the Stories studio, `createSocialStory` media types, or story playback.

Record is in-app `getUserMedia` + `MediaRecorder`. Probe `MediaRecorder.isTypeSupported` and persist the house type that actually recorded (`video/mp4`, `video/webm`, `video/quicktime`). Do not label a webm blob as mp4. There is no invented duration cap.

Residual, not a pretend-mp4 path:

- Safari / iOS 14.3+ typically records **mp4 / H.264**. `video/webm` is not available there. Chrome / Firefox typically record **webm**.
- Some Safari builds accept video-only and reject audio+video. The studio tries audio+video, then video-only.
- Older iOS Safari has no MediaRecorder — Record shows unavailable; Upload stays. Camera still needs HTTPS, a user gesture, and `playsInline`.
- Empty `blob.type` on some Safari versions — persist the probed house type.
- A Chrome-recorded webm story may not play in Safari’s viewer. This slice does not remux and does not use AWS IVS / Chime / Elemental.

Story Post and photo Post share one browser PUT: `uploadStoryMedia` → `presignSocialMediaUpload` → `PUT` to an upload key in `24frame-media-source-prod` (us-west-2); Save stores a server copy (see "Social photo publishing" below). The PUT options match post stills: `Content-Type` only, no abort signal. `presignSocialMediaPut` sets `requestChecksumCalculation: "WHEN_REQUIRED"`, so the signed URL has no `x-amz-checksum-*` query params. A failed PUT logs `story-put` with the HTTP status, status text, and body, or the thrown error when the browser never gets a response. A presign failure shows “Those attachments could not be stored.” A PUT or network failure still shows “The file could not be stored.” `createSocialStory` errors pass through unchanged.

Live preflight on 2026-09-24: that bucket allows `PUT` from `http://localhost:3000` only. The eb56af preview origin gets **403** and no `Access-Control-Allow-Origin`, which makes `fetch` throw before a status exists. Do not use a production origin as the isolation check. Applying bucket CORS is CoS/Adam, not a Dev prod apply. S3 has no `*.vercel.app` origin form; preview hosts need `*` on their own rule. `put-bucket-cors` replaces the whole config, so the localhost rule stays in the same call. Do not run this from CI.

```bash
aws s3api put-bucket-cors --bucket 24frame-media-source-prod --region us-west-2 --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["content-type"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    },
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["content-type"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

---

## Trigger: Social photo publishing (upload keys, published copies)

**When:** Changing Social media upload, post / story / cover / welcome Save, the media bucket policy, or `MEDIA_AWS_*` permissions.

A published photo cannot change after Save. The browser PUTs only to a temporary upload key. Save copies the checked bytes on the server to a new key that no upload URL can write. Rows store only that key.

- **Upload key** (presigned PUT only): `<lane>/upload/<uid>/<uuid>.<ext>`, lane `posts` or `stories`. `presignSocialMediaPut` refuses any other shape, and an extension that does not match the signed type. The DB CHECK (`social_media_keys_owned`), `isOwnedSocialMediaKey`, the media read grant, and the topic tagger all refuse upload keys.
- **Published key** (rows, viewers, tagger): `<lane>/<uid>/<id>.<ext>`, the shape rows already held. `id` is a random UUID drawn at Save, never derived from the upload key or its ETag: the client knows both, and could otherwise point a directly written row at a key before Save fills it. A double submit or a failed insert leaves an extra copy, kept like upload objects. Never presigned.
- **Publish copy** (`publishSocialMediaItems` in `src/lib/social-media-publish.ts`) runs on post, story, cover, and welcome Save. It HEADs every upload and checks size and type; nothing is copied unless all pass. Then one `CopyObject` per item: `CopySourceIfMatch` = the checked ETag, `IfNoneMatch: *`, `MetadataDirective: REPLACE` with the checked `ContentType`, `AnnotationDirective: EXCLUDE`. Mux items pass through. Strict: only the author's own upload key for that lane is a copy source; a published-shape key is refused. A welcome video (up to 250 MB) is copied inside the Save request; if that Save times out, raise the route's `maxDuration` in a follow-up.
- **Failure:** a failed copy shows "The file could not be stored." A failed HEAD of an upload (missing object, denied, throttled) shows the missing-file message ("Choose a photo or video first." on a post). Each logs one line, `msg: "social media publish failed"`, with the lane, the step (`head` or `copy`), the S3 error name, and the HTTP status. Never keys or ETags.
- **Permissions:** `MEDIA_AWS_*` needs `s3:PutObject` (presign, copy destination) and `s3:GetObject` (HEAD, copy source) on `posts/*` and `stories/*`, which it already uses. Under SSE-KMS it also needs `kms:Decrypt` and `kms:GenerateDataKey` on the bucket key. No `s3:GetObjectVersion` and no annotation permissions.
- **Before or right after deploy (founder):** prove the exact copy with the production principal. Until it works, photo Saves show "The file could not be stored." and log `step: "copy"`: `put-object` to `posts/upload/<uid>/<uuidA>.jpg`, then `copy-object` to `posts/<uid>/<uuidB>.jpg` with `--copy-source-if-match`, `--if-none-match '*'`, `--metadata-directive REPLACE`, `--content-type image/jpeg`, `--annotation-directive EXCLUDE`. Repeat the copy and expect 412.
- **Per-user prefixes:** one member's media spans `posts/<uid>/`, `stories/<uid>/`, `posts/upload/<uid>/`, and `stories/upload/<uid>/`. A per-user export, erasure, or audit covers all four.
- **Upload objects are kept.** No lifecycle or expiry. Any expiry deletes data and is a founder decision.
- **Next PR:** location (EXIF / GPS) stripping on publish. Until then published copies, and the kept uploads, carry the original metadata.

**REQUIRED founder step after deploy: bucket policy.** New code cannot stop an older deployment from signing a PUT to a published key, or a PUT URL signed before the deploy (valid 900 s). This statement does. It denies every presigned or browser-form write outside the two upload prefixes, from any principal. The server's header-signed `CopyObject` still passes. Never apply it from code or CI.

```json
{
  "Sid": "DenyBrowserWritesOutsideSocialStaging",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:PutObject",
  "NotResource": [
    "arn:aws:s3:::24frame-media-source-prod/posts/upload/*",
    "arn:aws:s3:::24frame-media-source-prod/stories/upload/*"
  ],
  "Condition": { "StringNotEquals": { "s3:authType": "REST-HEADER" } }
}
```

Apply order:

1. Deploy. Confirm a new photo post PUTs to `posts/upload/...` and the row holds a different `posts/<uid>/...` key.
2. `aws s3api get-bucket-policy` and keep the output. `put-bucket-policy` replaces the whole document, so merge this statement into it.
3. Confirm a published-key PUT URL signed before the deploy now gets 403, and a new upload still works.

Applied before the deploy, it 403s today's uploads. Once applied, Preview and local runs of branches without this change cannot upload photos. That is intended.

Rollback order: remove the statement first (`put-bucket-policy` with the saved document), then revert the code. Reverting first makes the old code's uploads 403. Removing the statement reopens writes to published keys.

---

## Trigger: Social Mux Video

**When:** Changing Social Video / Go live upload or feed/profile playback.

`MUX_TOKEN_ID` + `MUX_TOKEN_SECRET` are already on Vercel 24frame
(Production / Preview / Development). Signed playback also needs
`MUX_SIGNING_KEY` + `MUX_PRIVATE_KEY` (official Mux JWT names). Server-only
— never `NEXT_PUBLIC_`. One SoT: `src/lib/social-mux.ts` (locks) +
`src/lib/social-mux-server.ts` (API + `mux.jwt.signPlaybackId`). The player
fetches `/api/social/mux-playback`. Social video (Stories, posts, feed,
Explore, rail) is Mux-only. Education and title film stay off Mux.
Welcome playback fails closed until a playback id is stored.
Detail: [`docs/infra/social-mux.md`](../infra/social-mux.md).
Lock: [`docs/design-locks/social-video-mux-only-lock-v1.md`](../design-locks/social-video-mux-only-lock-v1.md).

