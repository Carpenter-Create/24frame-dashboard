# Current operating posture

This is the **only canonical active-status document**. Historical handoffs, ledgers, and abandoned branches are not authority. Consult them only as evidence when a task requires that history — then re-verify against the live repository.

---

## Agentic Engineering

| Item | Posture |
| --- | --- |
| Architecture spec v1 | **Accepted** on `main` |
| Phase A | **Merged** — dry-run/local foundations (control-plane schema and library primitives) |
| Phase B | **Merged** — dry-run/local foundations (supervised local control ledger) |
| Phase C | **Abandoned and unmerged** — do not resume without a new founder-authorized design |
| Live `ae/control` branch | **Not activated** |
| Live GitHub control writes | **Not activated** |
| Autonomous routing, remediation, merge, or production agent access | **Not active** |

Architecture and phase detail: [`docs/agentic-engineering/AGENTIC_ENGINEERING_V1.md`](../agentic-engineering/AGENTIC_ENGINEERING_V1.md), `PHASE_A.md`, `PHASE_B.md`.

---

## Agent roles and merge authority

- **Founder** authorizes scope. Founder alone authorizes merge to `main`, production actions, and destructive operations.
- **Global Content Dev** may implement bounded repository work after explicit founder authorization. Planning is not implementation permission. Implementation is not merge permission.
- **Cursor** is an available implementer, not mandatory.
- **Codex** independently reviews the exact diff/SHA regardless of implementer.
- Only one agent edits a given working tree at a time.

---

## Binding safety gates

Full doctrine: [`AGENTS.md`](../../AGENTS.md). Domain truth: [`docs/domain-spec.md`](../domain-spec.md).

- Production mutation, production validation, cloud spending, credential changes, and deployment activation are **founder-executed only**.
- Never read, print, or commit `.env`, `.env.*`, or `secrets/`.
- Migrations, RLS/auth changes, and destructive SQL require explicit founder approval of the exact SQL.
- Do not invent open founder decisions from the domain spec.
- Agentic Engineering automation — when later activated under a new design — cannot soften these gates.

---

## Production posture

| Item | Status |
| --- | --- |
| Production database release | **Complete** |
| Migration state | **Fully applied; no pending migrations** |
| Terminal catalog and RLS state | **Verified** |
| Release verification suites | **Passed** |
| Duplicate invariant | **Clean** |
| Safe unauthenticated smoke checks | **Passed** |
| Authenticated operator/client smoke checks | **Passed** |
| Fresh pre-deployment logical backup | **Retained outside the repository** |
| Managed/PITR posture | **Not independently confirmed** |
| Earlier failed apply attempt | **No production mutation** |
| Wrapper compatibility repair | **Merged before the successful apply** |
| Successful apply | **No post-apply repair, retry, or restore** |

---

## Finance AWS spine (authorized Slice 2)

In the Slice 2 pull request — not production-applied.

- AWS owns finance files + worker compute. Live relational SoT clusters are frame-aurora-dev and frame-aurora-prod in us-west-2. Auth stays Supabase Auth. The app still reads survivor Postgres until Secure Compute and cutover.
- Founder applies the Slice 2 finance migrations after merge. Filenames live under `supabase/migrations`.
- Live finance buckets, IAM, ECS cluster, ECR, EventBridge rule `24frame-finance-poll`, and worker task-def `24frame-finance-worker:3` exist. Dedicated finance CloudFront is live on Vercel Production (`FINANCE_CLOUDFRONT_*`); Preview stays S3 presign. Worker code polls `finance_jobs` against the current SoT (`FINANCE_DATABASE_URL` interim; `AURORA_DATABASE_URL` when valid). New image revisions and Aurora cutover stay founder-gated. SES us-west-2 is production-approved; `24frame.co` + DKIM are verified. Auth transactional mail (magic link / OTP / verification) sends via SES on that identity. Resend remains only for GC-support/asset notification mail. Auth stays Supabase Auth — no Cognito.
- Production mutation table above is unchanged until founder applies.

---

## Shared shell chrome

Adam lock: one desktop header and one side-menu pattern on every
workspace (Home, Aggregation, Social, Education, Staff). Home has its
own rail; Social's own Home tab is Feed. Light default, dark available.
Lock: [`docs/design-locks/shell-unified-chrome-lock-v1.md`](../design-locks/shell-unified-chrome-lock-v1.md).
Screening-room face (text lanes, tile-less side menu, named phone switch, ink dock dot): [`docs/design-locks/shell-screening-chrome-lock-v1.md`](../design-locks/shell-screening-chrome-lock-v1.md).
Coinbase register (pill slider, round grey controls, brand mark in the full-height side menu, filled accent current, 56 dock): [`docs/design-locks/shell-coinbase-register-lock-v1.md`](../design-locks/shell-coinbase-register-lock-v1.md).
Header height (founder decision, match Facebook): the header is 56 in every workspace on desktop and phone, and the side menu's top band with it; recorded in the Feed cards lock §8 and marked in [`docs/design-locks/shell-coinbase-register-lock-v1.md`](../design-locks/shell-coinbase-register-lock-v1.md). Home's News rail pins 16 under the header (the cards lock §8).

---

## Industry News AWS (authorized; not created)

Adam lock: News storage + scheduled ingest are **AWS only** on the E8
account in us-west-2. Dedicated `NEWS_AWS_*` / `NEWS_DDB_TABLE` —
never reuse title, media, finance, or education credentials. Not
Supabase tables/RPCs/storage. Not Vercel cron. Not Aurora (Secure
Compute / app cutover is not done).

App code + founder runbook live in-repo:
[`docs/infra/news-aws-setup.md`](../infra/news-aws-setup.md). Dynamo
tables, Lambda, EventBridge half-hour rule, SQS DLQ, and IAM are
**not created**. Founder applies. Do not create from CI.

Home reads fifteen headlines; `/home/news` is the ninety-day window.
Retired `/news` 404s — no leftover redirect. Page requests never fan
out RSS.

---

## 24Frame AI on Claude Platform on AWS (authorized; not created)

Adam lock: Claude calls go through **Claude Platform on
AWS** (Anthropic-operated, AWS IAM and billing), not Amazon Bedrock and
not a self-built model. Dedicated `CLAUDE_AWS_*` — never reuse title,
media, finance, news, SES, or education credentials. `ANTHROPIC_API_KEY`
is the cutover fallback only, removed after the founder verifies.

Founder runbook:
[`docs/infra/claude-platform-aws.md`](../infra/claude-platform-aws.md).
Workspace and IAM user are **not created**. Founder applies.

---

## Social topic tagging (authorized; off)

Adam lock: a background job gives each new Social post one of the 15
locked topics, or none, with Claude Sonnet 5.5; nobody picks a topic.
It runs on AWS Lambda (`24frame-social-topic-tag`, EventBridge every 5
minutes), not Vercel cron, with an execution role and no AWS keys.
Service-role writes to the post's topic columns only (exception in
`docs/domain-spec.md` §20). No video transcripts for now (Adam
decision): videos are tagged from caption and frames, and the tagger
never changes a video. Transcripts return in a later PR that transcribes
the audio separately, with a length cap. Adam lock: no auto captions on
Social, for authors or viewers. Nobody picks a topic; a caption edit
re-tags the post and the AI topic stays until replaced, except a topic
recorded before this change, which is never reopened. Off until the
founder enables the EventBridge rule (the only on/off switch), which
waits for the founder's accuracy test. The tagger has its own Claude
workspace and spend limit and its own read-only Mux token. The
provenance migration, the Lambda, its role, its schedule and its alarms
are founder-applied and **not created**. Backfill of older posts is a later founder-run step.
Runbook: [`docs/infra/social-topic-tagging.md`](../infra/social-topic-tagging.md).

---

## Social music detect-and-block (authorized; not applied)

CoS CLEAR: Phase 0 on Social Mux video (Stories, posts, Create).
ACRCloud identify is primary. Decision is allow or block. No mute. No AudD.
No music is allowed until Content ID is sorted
out. Any `metadata.music` score at or above 25 blocks immediately. Under 25,
or no music match, passes. `metadata.custom_files` is ignored and cannot
allow a clip. No allowlist in this phase. Adam's own CFN tracks block too,
because they match ACRCloud Music at score 100. That is accepted.
Staff Music review lists blocked rows for spot-checks and appeals. The
queue does not gate going live. End users never see the matched title or
artist. Blocked copy is a placeholder pending a design lock. Vendor error
retries with backoff and does not publish.

The migration, the Lambda, its role, and its schedule are founder-applied
and **not created**. Adam applies
`supabase/migrations/20261008180000_social_music_scans.sql`. There is no
Mux webhook in this repo; the worker polls pending scans. Runbook:
[`docs/infra/social-music-detect.md`](../infra/social-music-detect.md).

---

## Social profile cover original (authorized; not applied)

Founder decision: keep the uncropped original of each new profile cover
and its framing, so Reposition reopens the original at the saved framing.
The profile cover source migration under `supabase/migrations` adds
`profiles.cover_source_key`, `profiles.cover_crop` and their CHECKs. It is
founder-applied and **not applied**. Merge gate: the founder applies it,
verifies on the PR preview, then merges. Applying it first is safe for the
app now in production; deploying the app first makes every cover save and
Remove fail. Rollback order is in the migration header: drop the pair CHECK,
revert the app, then drop the rest. Visitors are never signed the original.
Design lock:
[`docs/design-locks/social-profile-header-linkedin-lock-v1.md`](../design-locks/social-profile-header-linkedin-lock-v1.md).
Profile layout is A · Stage (founder pick): a 16:7 hero card, the cover framed once with the phone area outlined, no SQL change; lock [`docs/design-locks/social-profile-stage-lock-v1.md`](../design-locks/social-profile-stage-lock-v1.md).
Social Feed is G (founder picks): Following / For you text tabs, topic words, story tiles, a composer bar, and a Reels rail after every 3 posts that opens Explore at `?v=`, no SQL change; locks [`docs/design-locks/social-home-lane-tabs-lock-v1.md`](../design-locks/social-home-lane-tabs-lock-v1.md) and [`docs/design-locks/social-feed-reel-rail-lock-v1.md`](../design-locks/social-feed-reel-rail-lock-v1.md).
Social Feed in the Coinbase register (H, founder approval; the Following / For you slider since removed at the founder's request, the stories card leading the Feed, the For you rail unchanged): topic chips, story cards with the name on the picture, a grey composer row, the Reels row in the register face, a "For you" rail over a soft grey course card, and the post face everywhere a post renders (the media is the card at its true shape, a video on the near-black screen, round grey actions with counts beside, a soft grey card for text posts, no role line yet); lock [`docs/design-locks/social-feed-register-lock-v1.md`](../design-locks/social-feed-register-lock-v1.md).
Social Feed cards (Direction B, founder pick): a white canvas with every post and Feed module on its own soft grey card, the post header on top, no screen or band on video, stories first in both lanes, and lighter ink in the shared shell (the header thumb is the accent wash); the Feed placement (founder request: Facebook's placement and width) puts the Feed column at 680, centred on the viewport with the side menu open or collapsed, the For you rail on the shell gutter when it fits, the Feed 16 under the header, and the post page column 680 and centred the same way (it has no rail); no SQL change; lock [`docs/design-locks/social-feed-cards-lock-v1.md`](../design-locks/social-feed-cards-lock-v1.md).

---

## Not authority

- [`docs/HANDOFF.md`](../HANDOFF.md) — historical handoff; preserve as evidence; do not act on its branch, SHA, production, or task statements without fresh verification.
- Abandoned or experimental branches — not current operating truth.
- Old ledgers/plans/specs under `docs/superpowers/` — reasoning history for their slices; not a substitute for this file.
- [`docs/first-slice-implementation-spec.md`](../first-slice-implementation-spec.md) — superseded slice spec; historical reference only unless a founder-authorized task explicitly re-verifies it.
