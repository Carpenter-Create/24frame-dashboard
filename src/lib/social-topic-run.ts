import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SocialTopicMediaDeps } from "@/lib/social-topic-media";
import {
  SOCIAL_TOPIC_OPEN_FILTER,
  tagSocialPostTopic,
  type SocialTopicOutcome,
  type SocialTopicPost,
} from "@/lib/social-topic-tagger";
import { SOCIAL_TOPIC_MAX_AGE_MS } from "@/lib/social-topic-tagging";
import type { Database } from "@/lib/supabase/database.types";

// One scheduled run of the topic tagger (workers/social-topic, every 5
// minutes). Selects recent posts with no look yet and no topic or an AI
// topic (new, or whose caption was edited inside the window), newest
// first, at most SOCIAL_TOPIC_MAX_PER_AUTHOR per author, and tags them one
// at a time until the batch or the time budget runs out; the rest wait for
// the next run.

// A post gets a moment for its media to land before the first look.
export const SOCIAL_TOPIC_MIN_AGE_MS = 2 * 60 * 1000;
// One post gets at most 90 seconds (two 40-second model attempts plus
// media). Past that it counts as an error and is retried next run. The
// post's signal is aborted too, which cancels its model call and stops it
// from reading more media or writing.
export const SOCIAL_TOPIC_POST_DEADLINE_MS = 90_000;
// One author's posts per run, so a flood from one profile cannot take every
// run, or the Claude spend, from everyone else.
export const SOCIAL_TOPIC_MAX_PER_AUTHOR = 3;
// Candidates are read in pages; an author at the cap is left out of the
// next page so other authors' older posts are reached.
export const SOCIAL_TOPIC_CANDIDATE_PAGE = 100;
export const SOCIAL_TOPIC_CANDIDATE_PAGES = 3;

const SOCIAL_TOPIC_POST_COLUMNS = "id, author_id, body, media, created_at, edited_at";

export type SocialTopicRunSummary = Record<SocialTopicOutcome | "error" | "deferred", number> & {
  selected: number;
};

/**
 * No topic or an AI topic, and created or caption-edited since `since`.
 * One `or` param holding both conditions: PostgREST does not document how
 * repeated `or` params combine.
 */
function candidateFilter(since: string): string {
  return `and(or(${SOCIAL_TOPIC_OPEN_FILTER}),or(created_at.gte."${since}",edited_at.gte."${since}"))`;
}

async function selectSocialTopicBatch(
  admin: SupabaseClient<Database>,
  nowMs: number,
  batchSize: number,
): Promise<SocialTopicPost[]> {
  const since = new Date(nowMs - SOCIAL_TOPIC_MAX_AGE_MS).toISOString();
  let before = new Date(nowMs - SOCIAL_TOPIC_MIN_AGE_MS).toISOString();
  let firstPage = true;
  const chosen: SocialTopicPost[] = [];
  const perAuthor = new Map<string, number>();

  for (let page = 0; page < SOCIAL_TOPIC_CANDIDATE_PAGES && chosen.length < batchSize; page += 1) {
    const capped = [...perAuthor].filter(([, count]) => count >= SOCIAL_TOPIC_MAX_PER_AUTHOR).map(([id]) => id);
    let query = admin
      .from("posts")
      .select(SOCIAL_TOPIC_POST_COLUMNS)
      .is("category_tagged_at", null)
      .is("group_id", null)
      .eq("status", "active")
      .or(candidateFilter(since));
    query = firstPage ? query.lte("created_at", before) : query.lt("created_at", before);
    if (capped.length > 0) query = query.not("author_id", "in", `(${capped.join(",")})`);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(SOCIAL_TOPIC_CANDIDATE_PAGE);
    if (error) throw new Error(`Topic select failed: ${error.message}`);

    const rows = data ?? [];
    for (const post of rows) {
      const count = perAuthor.get(post.author_id) ?? 0;
      if (count >= SOCIAL_TOPIC_MAX_PER_AUTHOR) continue;
      perAuthor.set(post.author_id, count + 1);
      chosen.push(post);
      if (chosen.length >= batchSize) break;
    }
    if (rows.length < SOCIAL_TOPIC_CANDIDATE_PAGE) break;
    before = rows[rows.length - 1]!.created_at;
    firstPage = false;
  }
  return chosen;
}

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
  const deadlineMs = args.postDeadlineMs ?? SOCIAL_TOPIC_POST_DEADLINE_MS;
  const posts = await selectSocialTopicBatch(args.admin, nowMs, args.batchSize);

  const summary: SocialTopicRunSummary = {
    selected: posts.length,
    tagged: 0,
    declined: 0,
    unusable: 0,
    wait: 0,
    raced: 0,
    error: 0,
    deferred: 0,
  };
  for (const post of posts) {
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
          deadlineMs,
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
