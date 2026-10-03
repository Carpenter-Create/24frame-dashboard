import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ownedMediaItems } from "@/lib/social-media";
import { parseSocialProfileRoles, socialProfileRoleLabel } from "@/lib/social-profile-roles";
import { gatherSocialTopicMedia, type SocialTopicMediaDeps } from "@/lib/social-topic-media";
import {
  buildSocialTopicContent,
  parseSocialTopicAnswer,
  SOCIAL_TOPIC_MAX_TOKENS,
  SOCIAL_TOPIC_MODEL_ID,
  SOCIAL_TOPIC_SYSTEM,
  socialTopicResultSchema,
  socialTopicWrite,
  type SocialTopicInput,
  type SocialTopicResult,
  type SocialTopicWrite,
} from "@/lib/social-topic-tagging";
import type { Database, Json } from "@/lib/supabase/database.types";

// One post in, one look stamped. Runs with the service-role client: the
// author cannot write topic provenance after insert, and the tagger is the
// founder-approved exception to 24Frame AI's user-JWT rule (domain-spec
// section 20). It reads one post and writes only that post's topic columns,
// and only while the post has not been looked at, has no topic or an AI
// topic, and still has the caption it read (a caption edit clears only the
// look; an AI topic stays until this write replaces or removes it).

export type SocialTopicPost = {
  id: string;
  author_id: string;
  body: string | null;
  media: Json | null;
  created_at: string;
  edited_at: string | null;
};

export type SocialTopicOutcome = "tagged" | "declined" | "unusable" | "wait" | "raced";

/**
 * Why a look has no usable answer. Stamped like "none"; a cut-off is
 * retried first (SOCIAL_TOPIC_CUT_OFF_RETRY_MS).
 */
export type SocialTopicUnusable = "refusal" | "cut_off" | "unreadable";

export type SocialTopicAnswer =
  | { result: SocialTopicResult; unusable: null }
  | { result: null; unusable: SocialTopicUnusable };

// PostgREST: no topic, or an AI topic. Never an author topic, or one
// recorded before provenance existed (a topic with no source).
export const SOCIAL_TOPIC_OPEN_FILTER = "category.is.null,category_source.eq.ai";

// A cut-off answer is a failed call, so the post is retried, but only for an
// hour after it was posted or edited (about 12 runs): a post that keeps
// cutting off is then stamped as unusable instead of billing every run.
export const SOCIAL_TOPIC_CUT_OFF_RETRY_MS = 60 * 60 * 1000;

const SOCIAL_TOPIC_FORMAT = zodOutputFormat(socialTopicResultSchema);
// One request gives up after 40 seconds and is retried once, so a post's
// model time stays inside the run's per-post deadline (social-topic-run).
export const SOCIAL_TOPIC_REQUEST_TIMEOUT_MS = 40_000;
export const SOCIAL_TOPIC_REQUEST_MAX_RETRIES = 1;

/**
 * The model's answer, or why there is none: a refusal, a cut-off, or an
 * answer that cannot be read (outside the 15 topics and "none"; the
 * structured format shapes the JSON but does not enforce the list). API and
 * network errors throw, so the post stays untouched and the next run
 * retries it. (messages.parse would throw on a refusal's text too, and that
 * post would then be retried every run.)
 */
export async function classifySocialTopic(
  client: Anthropic,
  input: SocialTopicInput,
  signal?: AbortSignal,
): Promise<SocialTopicAnswer> {
  const response = await client.messages.create(
    {
      model: SOCIAL_TOPIC_MODEL_ID,
      max_tokens: SOCIAL_TOPIC_MAX_TOKENS,
      system: SOCIAL_TOPIC_SYSTEM,
      messages: [{ role: "user", content: buildSocialTopicContent(input) }],
      // Classification: low effort keeps thinking short (Sonnet 5.5 guidance).
      output_config: { effort: "low", format: SOCIAL_TOPIC_FORMAT },
    },
    { timeout: SOCIAL_TOPIC_REQUEST_TIMEOUT_MS, maxRetries: SOCIAL_TOPIC_REQUEST_MAX_RETRIES, signal },
  );
  if (response.stop_reason === "refusal") return { result: null, unusable: "refusal" };
  if (response.stop_reason === "max_tokens" || response.stop_reason === "model_context_window_exceeded") {
    return { result: null, unusable: "cut_off" };
  }
  const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  const result = response.stop_reason === "end_turn" ? parseSocialTopicAnswer(text) : null;
  return result ? { result, unusable: null } : { result: null, unusable: "unreadable" };
}

// No profile row means no crafts. A failed read throws, so the post is
// retried rather than classified without them.
async function authorCrafts(admin: SupabaseClient<Database>, authorId: string): Promise<string[]> {
  const { data, error } = await admin.from("profiles").select("crafts").eq("id", authorId).maybeSingle();
  if (error) throw new Error(`Crafts read failed: ${error.message}`);
  return parseSocialProfileRoles(data?.crafts).map(socialProfileRoleLabel);
}

export type SocialTopicDecision = {
  write: SocialTopicWrite;
  /** The model's answer; null when it was not asked or gave no usable one. */
  result: SocialTopicResult | null;
  unusable: SocialTopicUnusable | null;
  /** Images and video frames read and shown to the model. */
  imageCount: number;
};

/**
 * What the tagger would write for this post, without writing it. Null while
 * the post's video is still preparing. The eval script uses this directly
 * and writes nothing; the Lambda worker goes through tagSocialPostTopic.
 */
export async function decideSocialPostTopic(args: {
  admin: SupabaseClient<Database>;
  client: Anthropic;
  post: SocialTopicPost;
  now: Date;
  mediaDeps?: SocialTopicMediaDeps;
  /** Aborted when the run gives up on this post (social-topic-run). */
  signal?: AbortSignal;
}): Promise<SocialTopicDecision | null> {
  const { admin, client, post, now } = args;
  const media = await gatherSocialTopicMedia(
    {
      items: ownedMediaItems(post.media, post.author_id, "posts"),
      authorId: post.author_id,
      createdAt: post.created_at,
      now,
      signal: args.signal,
    },
    args.mediaDeps,
  );
  if (media.status === "wait") return null;

  args.signal?.throwIfAborted();
  const caption = post.body?.trim() || null;
  const imageCount = media.images.length;
  // Nothing to read: no call, and the look is stamped as no topic.
  if (!caption && imageCount === 0) {
    return { write: socialTopicWrite(null, now), result: null, unusable: null, imageCount };
  }
  const answer = await classifySocialTopic(
    client,
    {
      caption,
      crafts: await authorCrafts(admin, post.author_id),
      images: media.images,
    },
    args.signal,
  );
  return { write: socialTopicWrite(answer.result, now), ...answer, imageCount };
}

/**
 * Classify one post and stamp it. A thrown error leaves the post untouched
 * for the next run. Once `signal` is aborted (the run gave up on the post),
 * nothing more is written. A look with no topic (none, low confidence, or
 * an unusable answer) also removes an AI topic from before a caption edit.
 */
export async function tagSocialPostTopic(args: {
  admin: SupabaseClient<Database>;
  client: Anthropic;
  post: SocialTopicPost;
  now: Date;
  mediaDeps?: SocialTopicMediaDeps;
  signal?: AbortSignal;
}): Promise<SocialTopicOutcome> {
  const decided = await decideSocialPostTopic(args);
  if (!decided) return "wait";
  if (decided.unusable === "cut_off") {
    const changedAt = Date.parse(args.post.edited_at ?? args.post.created_at);
    if (args.now.getTime() - changedAt < SOCIAL_TOPIC_CUT_OFF_RETRY_MS) {
      // Untouched; the run logs it as a failed post and the next run retries.
      throw new Error("Claude answer was cut off");
    }
  }
  args.signal?.throwIfAborted();
  let write = args.admin
    .from("posts")
    .update(decided.write)
    .eq("id", args.post.id)
    // Never over an author's or a pre-provenance topic, and never twice.
    .is("category_tagged_at", null)
    .or(SOCIAL_TOPIC_OPEN_FILTER);
  // Only the caption it read: an edit while it ran makes this a race, and
  // the next run reads the new caption.
  write = args.post.edited_at ? write.eq("edited_at", args.post.edited_at) : write.is("edited_at", null);
  const { data, error } = await write.select("id");
  if (error) throw new Error(`Topic write failed: ${error.message}`);
  if (!data || data.length === 0) return "raced";
  if (decided.unusable) {
    console.warn(
      JSON.stringify({ msg: "social topic unusable answer", postId: args.post.id, reason: decided.unusable }),
    );
    return "unusable";
  }
  return decided.write.category ? "tagged" : "declined";
}
