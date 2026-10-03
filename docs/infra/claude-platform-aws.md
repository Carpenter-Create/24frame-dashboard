# 24Frame AI on Claude Platform on AWS — founder-executed

Founder decision 2026-10-03: 24Frame AI calls Claude through **Claude
Platform on AWS**. Anthropic operates the API; AWS IAM signs requests
and AWS bills usage. It is not Amazon Bedrock: model IDs are the bare
Claude IDs (`claude-sonnet-5`), with no `anthropic.` prefix.

Do **not** create these resources from CI or from this repository.
Names below are proposals for Adam to confirm.

App code: [`src/lib/claude-client.ts`](../../src/lib/claude-client.ts).
It calls Claude Platform on AWS when all four `CLAUDE_AWS_*` values are
set. Until then it falls back to `ANTHROPIC_API_KEY` (the cutover key).
With neither, 24Frame AI shows its unavailable line.

Sources (read 2026-10-03):
[Claude Platform on AWS](https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws),
[IAM actions](https://platform.claude.com/docs/en/api/claude-platform-on-aws-iam-actions).

## Proposed resources (not created)

| Item | Proposed | Notes |
| --- | --- | --- |
| Account | E8 | Same account as finance / news. Confirm. |
| Region | `us-west-2` | A workspace is bound to one region. All AWS commercial regions are supported. |
| Workspace | `24frame` | Its ID looks like `wrkspc_…`. |
| Spend limit | Adam sets | Claude Console only (step 2). |
| App IAM user | `24frame-claude-app` | Inference only, on this workspace. Vercel Production + Preview. |

## Env names (server-only)

| Name | Value |
| --- | --- |
| `CLAUDE_AWS_REGION` | The workspace region, e.g. `us-west-2` |
| `CLAUDE_AWS_ACCESS_KEY_ID` | `24frame-claude-app` access key ID |
| `CLAUDE_AWS_SECRET_ACCESS_KEY` | `24frame-claude-app` secret access key |
| `CLAUDE_AWS_WORKSPACE_ID` | The workspace ID (`wrkspc_…`) |

Never fall back to `AWS_*` (titles), `MEDIA_AWS_*`, `FINANCE_AWS_*`,
`NEWS_AWS_*`, `SES_AWS_*`, or `EDUCATION_AWS_*`, and never to the SDK's
own `ANTHROPIC_AWS_*` names: the code reads `CLAUDE_AWS_*` only. Never
`NEXT_PUBLIC_`. Do not commit secret values. The endpoint is pinned in
code (`https://aws-external-anthropic.{region}.api.aws`), so an
`ANTHROPIC_AWS_BASE_URL` value cannot redirect signed requests.

## Steps

1. **Sign up.** In the AWS Console, open the Claude Platform on AWS
   service page and sign up (AWS handles the Marketplace subscription).
   Finish organization setup at `platform.claude.com/partner-signup`.
2. **Workspace and spend limit.** Create the workspace when the AWS
   Console prompts, in the region above, and copy its ID from
   **Workspaces**. Spend limits live in the Claude Console only (Admin
   role): add an email recipient under **Settings > Billing**, then set
   the organization monthly limit there, or a workspace limit under
   **Settings > Workspaces > 24frame > Spend limits**. Optional, your
   call: pin the workspace's default inference geography to `us` (docs:
   Data residency, workspace-level restrictions).
3. **One-time account setting.** Check with
   `aws iam get-outbound-web-identity-federation-info`. If it is not
   enabled, run `aws iam enable-outbound-web-identity-federation`.
   Without it, every request fails with "Outbound web identity
   federation is disabled for your account". Sign-up usually enables
   it.
4. **IAM user.** Create `24frame-claude-app` with only this inline
   policy. Replace the region, account ID and workspace ID, and check
   the action names against the IAM actions page above.

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "aws-external-anthropic:CreateInference",
           "aws-external-anthropic:CountTokens"
         ],
         "Resource": "arn:aws:aws-external-anthropic:REGION:ACCOUNT_ID:workspace/WORKSPACE_ID"
       }
     ]
   }
   ```

   The Social topic-tagging Lambda does not use this user: its own
   execution role gets `CreateInference` on the same workspace
   (`docs/infra/social-topic-tagging.md`). The topic backfill will add
   the batch actions (`CreateBatchInference`, `GetBatchInference`) in
   its own PR.
5. **Vercel.** Create an access key for the user. Add the four
   `CLAUDE_AWS_*` values to Production and Preview, then redeploy.
6. **Verify, then retire the cutover key.** On a Pro or Premium org,
   ask 24Frame AI "How many titles are in my catalog?". It answers, and
   the workspace usage in the Claude Console shows the request. Then
   remove `ANTHROPIC_API_KEY` from Vercel and redeploy, and ask an
   agent to delete the fallback branch in `src/lib/claude-client.ts`.

## Rollback

Before step 6: remove the `CLAUDE_AWS_*` values and redeploy. The app
returns to `ANTHROPIC_API_KEY`. After step 6 there is no fallback, so
restore `ANTHROPIC_API_KEY` first.

A `403` means the request reached AWS: check the workspace ID and the
IAM policy. A missing region or workspace ID never reaches AWS: the
app treats a partial `CLAUDE_AWS_*` set as not configured.
