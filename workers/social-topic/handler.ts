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
import { runSocialTopicBatch, type SocialTopicRunSummary } from "../../src/lib/social-topic-run";
import { isSocialTopicTaggingEnabled } from "../../src/lib/social-topic-tagging";
import { createAdminClient } from "../../src/lib/supabase/admin";

// Function timeout is 5 minutes. A post gets at most 90 seconds
// (SOCIAL_TOPIC_POST_DEADLINE_MS), so stop starting new posts after 3.
const BATCH_SIZE = 40;
const BUDGET_MS = 3 * 60 * 1000;
// S3 calls give up rather than hang the run.
const S3_CONNECTION_TIMEOUT_MS = 5_000;
const S3_REQUEST_TIMEOUT_MS = 15_000;

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

export async function handler(): Promise<SocialTopicRunSummary | { skipped: "disabled" }> {
  if (!isSocialTopicTaggingEnabled()) {
    console.log(JSON.stringify({ msg: "social topic tagging off" }));
    return { skipped: "disabled" };
  }
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
  const claude = readClaudeRoleConfig();
  if (!claude) throw new Error("CLAUDE_AWS_REGION and CLAUDE_AWS_WORKSPACE_ID are required");

  const media = {
    bucket: process.env.S3_MEDIA_SOURCE_BUCKET!.trim(),
    // No credentials: the execution role signs.
    s3: new S3Client({
      region: process.env.MEDIA_AWS_REGION!.trim(),
      requestHandler: { connectionTimeout: S3_CONNECTION_TIMEOUT_MS, requestTimeout: S3_REQUEST_TIMEOUT_MS },
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
  // Every post failing points at configuration, not one post: fail the
  // invocation so the function's Errors alarm and on-failure queue see it.
  // The next scheduled run is the retry.
  if (summary.selected > 0 && summary.error === summary.selected) {
    throw new Error(`every selected post failed (${summary.error})`);
  }
  return summary;
}
