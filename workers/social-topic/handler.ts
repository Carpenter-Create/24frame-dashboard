// 24Frame Social topic tagging Lambda. EventBridge rule
// 24frame-social-topic-tag, rate(5 minutes). Founder decision 2026-10-03:
// runs on AWS Lambda, not Vercel cron. Founder-applied, see
// docs/infra/social-topic-tagging.md. Do not create AWS from CI.
//
// The rule is the only on/off switch: created disabled, enabled at launch.
// Every invocation runs. {"dryRun": true} checks each dependency instead and
// tags, writes, and changes nothing.
//
// A post that fails is logged and retried next run; it never fails the
// invocation. Alarms are CloudWatch metric filters on the per-post failure
// line (social-topic-run) and a heartbeat on the done line below. Missing
// configuration still throws.
//
// AWS access comes from the execution role only: Claude Platform on AWS
// (CreateInference on the workspace) and GetObject on the Social media
// bucket's posts/ prefix. No static AWS keys on the function. Supabase
// service role and Mux keys are function env, server-only.

import { S3Client } from "@aws-sdk/client-s3";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClaudeClient, readClaudeRoleConfig } from "../../src/lib/claude-client";
import { readSocialMediaObjectFrom } from "../../src/lib/s3-social-media";
import { isSocialMuxMediaItem, ownedMediaItems, type SocialMediaItem } from "../../src/lib/social-media";
import { SOCIAL_MUX_PROVIDER } from "../../src/lib/social-mux";
import {
  SOCIAL_TOPIC_FRAME_WIDTH,
  SOCIAL_TOPIC_LIVE_MEDIA_DEPS,
  type SocialTopicMediaDeps,
} from "../../src/lib/social-topic-media";
import { runSocialTopicBatch, type SocialTopicRunSummary } from "../../src/lib/social-topic-run";
import { SOCIAL_TOPIC_MODEL_ID } from "../../src/lib/social-topic-tagging";
import { createAdminClient } from "../../src/lib/supabase/admin";
import type { Database } from "../../src/lib/supabase/database.types";

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

export type SocialTopicCheck = "ok" | `skipped: ${string}` | `failed: ${string}`;

export type SocialTopicDryRun = {
  msg: "social topic dry run";
  database: SocialTopicCheck;
  mux: SocialTopicCheck;
  s3: SocialTopicCheck;
  claude: SocialTopicCheck;
};

type Deps = { admin: SupabaseClient<Database>; client: Anthropic; mediaDeps: SocialTopicMediaDeps };

export async function handler(event?: Record<string, unknown> | null): Promise<SocialTopicRunSummary | SocialTopicDryRun> {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
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
  const deps: Deps = {
    admin: createAdminClient(),
    client: createClaudeClient(claude),
    mediaDeps: { ...SOCIAL_TOPIC_LIVE_MEDIA_DEPS, readImage: (key) => readSocialMediaObjectFrom(media, key) },
  };
  // Any truthy dryRun, so a mistyped "true" never tags.
  if (event?.dryRun) {
    const report = await socialTopicDryRun(deps);
    console.log(JSON.stringify(report));
    return report;
  }

  const summary = await runSocialTopicBatch({ ...deps, now: new Date(), batchSize: BATCH_SIZE, budgetMs: BUDGET_MS });
  console.log(
    JSON.stringify({ msg: "social topic tagging done", build: process.env.SOCIAL_TOPIC_BUILD ?? "unknown", ...summary }),
  );
  return summary;
}

// Dry run: each check reads through the same clients and media deps as a
// real run, and reports instead of throwing. Reads only.

const DRY_RUN_MEDIA_POSTS = 10;
// jsonb @> needles, as social-feed's Explore filter.
const MUX_VIDEO_CONTAINS = JSON.stringify([{ kind: "video", provider: SOCIAL_MUX_PROVIDER }]);
const IMAGE_CONTAINS = JSON.stringify([{ kind: "image" }]);

async function socialTopicDryRun({ admin, client, mediaDeps }: Deps): Promise<SocialTopicDryRun> {
  const [database, mux, s3, claude] = await Promise.all([
    check(async () => {
      await newestActivePosts(admin, 1);
      return "ok";
    }),
    check(async () => {
      const video = await newestMediaItem(admin, MUX_VIDEO_CONTAINS, (item) => isSocialMuxMediaItem(item) && !!item.assetId);
      if (!video?.assetId || !video.playbackId) return "skipped: no active post with a Mux video";
      const asset = await mediaDeps.retrieveAsset(video.assetId);
      if (asset.status !== "ready") return `skipped: newest Mux video is ${asset.status ?? "not ready"}`;
      const frame = await mediaDeps.fetchFrame(video.playbackId, { time: 0, width: SOCIAL_TOPIC_FRAME_WIDTH });
      return frame ? "ok" : "failed: Mux returned no frame";
    }),
    check(async () => {
      const image = await newestMediaItem(admin, IMAGE_CONTAINS, (item) => item.kind === "image");
      if (!image) return "skipped: no active post with an image";
      return (await mediaDeps.readImage(image.key)) ? "ok" : "failed: newest image is missing or unreadable";
    }),
    check(async () => {
      // Proves the workspace and the role. Any answer counts; a few tokens.
      await client.messages.create({
        model: SOCIAL_TOPIC_MODEL_ID,
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with ok." }],
      });
      return "ok";
    }),
  ]);
  return { msg: "social topic dry run", database, mux, s3, claude };
}

async function check(run: () => Promise<SocialTopicCheck>): Promise<SocialTopicCheck> {
  try {
    return await run();
  } catch (cause) {
    return `failed: ${cause instanceof Error ? cause.message : String(cause)}`;
  }
}

async function newestActivePosts(admin: SupabaseClient<Database>, limit: number, mediaContains?: string) {
  let query = admin.from("posts").select("author_id, media").eq("status", "active");
  if (mediaContains) query = query.contains("media", mediaContains);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Post read failed: ${error.message}`);
  return data ?? [];
}

/** The first matching item of the newest active posts whose media contains the needle. */
async function newestMediaItem(
  admin: SupabaseClient<Database>,
  mediaContains: string,
  matches: (item: SocialMediaItem) => boolean,
): Promise<SocialMediaItem | null> {
  for (const post of await newestActivePosts(admin, DRY_RUN_MEDIA_POSTS, mediaContains)) {
    const item = ownedMediaItems(post.media, post.author_id).find(matches);
    if (item) return item;
  }
  return null;
}
