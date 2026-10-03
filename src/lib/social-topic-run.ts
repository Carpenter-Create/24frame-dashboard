import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SocialTopicMediaDeps } from "@/lib/social-topic-media";
import { tagSocialPostTopic, type SocialTopicOutcome } from "@/lib/social-topic-tagger";
import type { Database } from "@/lib/supabase/database.types";

// One scheduled run of the topic tagger (workers/social-topic, every 5
// minutes). Selects recent posts with no topic and no look yet, newest
// first, and tags them one at a time until the batch or the time budget
// runs out; the rest wait for the next run.

// A post gets a moment for its media to land before the first look.
export const SOCIAL_TOPIC_MIN_AGE_MS = 2 * 60 * 1000;
// New posts only. Older posts are a founder-run backfill, not this job.
export const SOCIAL_TOPIC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// One post gets at most 90 seconds (two 40-second model attempts plus
// media). Past that it counts as an error and is retried next run. The
// post's signal is aborted too, which cancels its model call and stops it
// from requesting a transcript, deleting a track, or writing.
export const SOCIAL_TOPIC_POST_DEADLINE_MS = 90_000;

export type SocialTopicRunSummary = Record<SocialTopicOutcome | "error" | "deferred", number> & {
  selected: number;
};

export async function runSocialTopicBatch(args: {
  admin: SupabaseClient<Database>;
  client: Anthropic;
  now: Date;
  batchSize: number;
  budgetMs: number;
  mediaDeps?: SocialTopicMediaDeps;
  /** Injectable for tests. */
  clock?: () => number;
  postDeadlineMs?: number;
}): Promise<SocialTopicRunSummary> {
  const clock = args.clock ?? Date.now;
  const started = clock();
  const nowMs = args.now.getTime();
  const { data: posts, error } = await args.admin
    .from("posts")
    .select("id, author_id, body, media, created_at")
    .is("category", null)
    .is("category_tagged_at", null)
    .is("group_id", null)
    .eq("status", "active")
    .gte("created_at", new Date(nowMs - SOCIAL_TOPIC_MAX_AGE_MS).toISOString())
    .lte("created_at", new Date(nowMs - SOCIAL_TOPIC_MIN_AGE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(args.batchSize);
  if (error) throw new Error(`Topic select failed: ${error.message}`);

  const summary: SocialTopicRunSummary = {
    selected: posts?.length ?? 0,
    tagged: 0,
    declined: 0,
    wait: 0,
    raced: 0,
    error: 0,
    deferred: 0,
  };
  for (const post of posts ?? []) {
    if (clock() - started > args.budgetMs) {
      summary.deferred += 1;
      continue;
    }
    try {
      summary[
        await withDeadline(
          (signal) =>
            tagSocialPostTopic({
              admin: args.admin,
              client: args.client,
              post,
              now: args.now,
              mediaDeps: args.mediaDeps,
              signal,
            }),
          args.postDeadlineMs ?? SOCIAL_TOPIC_POST_DEADLINE_MS,
        )
      ] += 1;
    } catch (cause) {
      // Untouched, so the next run retries it.
      summary.error += 1;
      console.error(
        JSON.stringify({
          msg: "social topic post failed",
          postId: post.id,
          error: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    }
  }
  return summary;
}

async function withDeadline<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const stop = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`post timed out after ${ms} ms`);
      stop.abort(error);
      reject(error);
    }, ms);
  });
  try {
    return await Promise.race([work(stop.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
