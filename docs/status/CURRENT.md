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
`docs/domain-spec.md` §20). Video transcripts are for tagging only: the
caption track the tagger creates is deleted once read, so viewers do not
get captions from it. Adam lock: no auto captions on Social, for authors
or viewers; the Social player keeps captions hidden. Nobody picks a
topic; a caption edit re-tags the post (no new transcript), except a
topic recorded before this change, which stays. Off until
`SOCIAL_TOPIC_TAGGING=on`, which
waits for the founder's accuracy test. Turning it off is drain, then off
(`SOCIAL_TOPIC_TAGGING=drain` deletes leftover caption tracks first;
founder decision). The provenance migration, the
Lambda, its role and its schedule are founder-applied and **not
created**. Backfill of older posts is a later founder-run step.
Runbook: [`docs/infra/social-topic-tagging.md`](../infra/social-topic-tagging.md).

---

## Not authority

- [`docs/HANDOFF.md`](../HANDOFF.md) — historical handoff; preserve as evidence; do not act on its branch, SHA, production, or task statements without fresh verification.
- Abandoned or experimental branches — not current operating truth.
- Old ledgers/plans/specs under `docs/superpowers/` — reasoning history for their slices; not a substitute for this file.
- [`docs/first-slice-implementation-spec.md`](../first-slice-implementation-spec.md) — superseded slice spec; historical reference only unless a founder-authorized task explicitly re-verifies it.
