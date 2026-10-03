// 24Frame Social topic tagging Lambda. EventBridge rule
// 24frame-social-topic-tag, rate(5 minutes). Founder decision 2026-10-03:
// runs on AWS Lambda, not Vercel cron. Founder-applied, see
// docs/infra/social-topic-tagging.md. Do not create AWS from CI.
//
// AWS access comes from the execution role only: Claude Platform on AWS
// (CreateInference on the workspace) and GetObject on the Social media
// bucket's posts/ prefix. No static AWS keys on the function. Supabase
// service role and Mux keys are function env, server-only.

import { S3Client } from "@aws-sdk/client-s3";

import { createClaudeClient, readClaudeRoleConfig } from "../../src/lib/claude-client";
import { readSocialMediaObjectFrom } from "../../src/lib/s3-social-media";
import { SOCIAL_TOPIC_LIVE_MEDIA_DEPS } from "../../src/lib/social-topic-media";
import {
  runSocialTopicBatch,
  runSocialTopicDrain,
  type SocialTopicDrainSummary,
  type SocialTopicRunSummary,
} from "../../src/lib/social-topic-run";
import { socialTopicTaggingMode } from "../../src/lib/social-topic-tagging";
import { createAdminClient } from "../../src/lib/supabase/admin";

// Function timeout is 5 minutes. A post gets at most 90 seconds
// (SOCIAL_TOPIC_POST_DEADLINE_MS), so stop starting new posts after 3.
const BATCH_SIZE = 40;
const BUDGET_MS = 3 * 60 * 1000;
// S3 calls give up rather than hang the run. requestTimeout only warns
// unless throwOnRequestTimeout is set; socketTimeout covers a stalled body.
export const SOCIAL_TOPIC_S3_REQUEST_HANDLER = {
  connectionTimeout: 5_000,
  requestTimeout: 15_000,
  throwOnRequestTimeout: true,
  socketTimeout: 15_000,
} as const;

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MEDIA_AWS_REGION",
  "S3_MEDIA_SOURCE_BUCKET",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY",
  "MUX_PRIVATE_KEY",
] as const;
// A drain reads the database and Mux only: no Claude, no S3.
const DRAIN_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MUX_TOKEN_ID", "MUX_TOKEN_SECRET"] as const;

function requireEnv(names: readonly string[]): void {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
}

export async function handler(): Promise<
  SocialTopicRunSummary | ({ mode: "drain" } & SocialTopicDrainSummary) | { skipped: "disabled" }
> {
  const mode = socialTopicTaggingMode();
  if (mode === "off") {
    console.log(JSON.stringify({ msg: "social topic tagging off" }));
    return { skipped: "disabled" };
  }
  if (mode === "drain") return drain();
  requireEnv(REQUIRED_ENV);
  const claude = readClaudeRoleConfig();
  if (!claude) throw new Error("CLAUDE_AWS_REGION and CLAUDE_AWS_WORKSPACE_ID are required");

  const media = {
    bucket: process.env.S3_MEDIA_SOURCE_BUCKET!.trim(),
    // No credentials: the execution role signs.
    s3: new S3Client({
      region: process.env.MEDIA_AWS_REGION!.trim(),
      requestHandler: SOCIAL_TOPIC_S3_REQUEST_HANDLER,
    }),
  };
  const summary = await runSocialTopicBatch({
    admin: createAdminClient(),
    client: createClaudeClient(claude),
    now: new Date(),
    batchSize: BATCH_SIZE,
    budgetMs: BUDGET_MS,
    mediaDeps: { ...SOCIAL_TOPIC_LIVE_MEDIA_DEPS, readImage: (key) => readSocialMediaObjectFrom(media, key) },
  });
  console.log(JSON.stringify({ msg: "social topic tagging done", ...summary }));
  // Every post the run tried failing points at configuration or an outage,
  // not one post: fail the invocation so the function's Errors alarm and
  // on-failure queue see it. Posts deferred by the time budget were not
  // tried. The next scheduled run is the retry.
  const attempted = summary.selected - summary.deferred;
  if (attempted > 0 && summary.error === attempted) {
    throw new Error(`every attempted post failed (${summary.error})`);
  }
  // Same for leftover caption-track cleanup: a pass that fails entirely
  // (its select, or every post it checked) fails the run, so it is seen.
  if (summary.strayErrors > 0 && summary.strayErrors >= summary.strayChecked) {
    throw new Error(`stray caption-track cleanup failed (${summary.strayErrors})`);
  }
  return summary;
}

/**
 * Turning tagging off (SOCIAL_TOPIC_TAGGING=drain): delete the tagger's
 * leftover caption tracks, so none outlives the worker. The founder removes
 * the setting once a run logs complete: true, pending: 0 and errors: 0.
 */
async function drain(): Promise<{ mode: "drain" } & SocialTopicDrainSummary> {
  requireEnv(DRAIN_ENV);
  const summary = await runSocialTopicDrain({ admin: createAdminClient(), now: new Date(), budgetMs: BUDGET_MS });
  console.log(JSON.stringify({ msg: "social topic drain done", ...summary }));
  if (summary.errors > 0 && summary.errors >= summary.checked) {
    throw new Error(`caption-track drain failed (${summary.errors})`);
  }
  return { mode: "drain", ...summary };
}
