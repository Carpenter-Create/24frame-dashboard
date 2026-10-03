import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createClaudeClient, readClaudeConfig } from "@/lib/claude-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagSocialPostTopic, type SocialTopicOutcome } from "@/lib/social-topic-tagger";
import { isSocialTopicTaggingEnabled } from "@/lib/social-topic-tagging";

// Background topic tagging (founder decisions 2026-10-03; runbook
// docs/infra/social-topic-tagging.md). Every 5 minutes, up to BATCH_SIZE
// recent posts with no topic and no look yet are classified one at a time
// until the time budget runs out; the rest wait for the next tick. Off until
// the founder sets SOCIAL_TOPIC_TAGGING=on after the accuracy test.
//
// Same CRON_SECRET pattern as transcode-poll: only Vercel's cron dispatcher
// may call it, and Vercel runs crons on production deployments only.

export const maxDuration = 60;
export const runtime = "nodejs";

const BATCH_SIZE = 12;
const BUDGET_MS = 45_000;
// A post gets a moment for its media to land before the first look.
const MIN_AGE_MS = 2 * 60 * 1000;
// New posts only. Older posts are a founder-run backfill, not this job.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSocialTopicTaggingEnabled()) {
    return NextResponse.json({ skipped: "disabled" });
  }
  const config = readClaudeConfig();
  if (!config) {
    console.warn("[social-topic-tag] no Claude provider configured");
    return NextResponse.json({ skipped: "no-provider" });
  }

  const started = Date.now();
  const now = new Date(started);
  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("posts")
    .select("id, author_id, body, media, created_at")
    .is("category", null)
    .is("category_tagged_at", null)
    .is("group_id", null)
    .eq("status", "active")
    .gte("created_at", new Date(started - MAX_AGE_MS).toISOString())
    .lte("created_at", new Date(started - MIN_AGE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(BATCH_SIZE);
  if (error) {
    console.error("[social-topic-tag] select failed", error.message);
    return NextResponse.json({ error: "select failed" }, { status: 500 });
  }

  const client = createClaudeClient(config);
  const counts: Record<SocialTopicOutcome | "error" | "deferred", number> = {
    tagged: 0,
    declined: 0,
    wait: 0,
    raced: 0,
    error: 0,
    deferred: 0,
  };
  for (const post of posts ?? []) {
    if (Date.now() - started > BUDGET_MS) {
      counts.deferred += 1;
      continue;
    }
    try {
      counts[await tagSocialPostTopic({ admin, client, post, now })] += 1;
    } catch (cause) {
      // Untouched, so the next tick retries it.
      counts.error += 1;
      console.error("[social-topic-tag] post failed", post.id, cause instanceof Error ? cause.message : cause);
    }
  }

  console.info("[social-topic-tag]", JSON.stringify({ selected: posts?.length ?? 0, ...counts }));
  return NextResponse.json({ selected: posts?.length ?? 0, ...counts });
}
