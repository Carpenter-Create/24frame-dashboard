import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ownedMediaItems } from "@/lib/social-media";
import { parseSocialProfileRoles, socialProfileRoleLabel } from "@/lib/social-profile-roles";
import { gatherSocialTopicMedia, type SocialTopicMediaDeps } from "@/lib/social-topic-media";
import {
  buildSocialTopicContent,
  SOCIAL_TOPIC_MAX_TOKENS,
  SOCIAL_TOPIC_MIN_CONFIDENCE,
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
// and only while the post has no topic and has not been looked at.

export type SocialTopicPost = {
  id: string;
  author_id: string;
  body: string | null;
  media: Json | null;
  created_at: string;
};

export type SocialTopicOutcome = "tagged" | "declined" | "wait" | "raced";

export async function classifySocialTopic(
  client: Anthropic,
  input: SocialTopicInput,
): Promise<SocialTopicResult | null> {
  const response = await client.messages.parse({
    model: SOCIAL_TOPIC_MODEL_ID,
    max_tokens: SOCIAL_TOPIC_MAX_TOKENS,
    system: SOCIAL_TOPIC_SYSTEM,
    messages: [{ role: "user", content: buildSocialTopicContent(input) }],
    // Classification: low effort keeps thinking short (Sonnet 5.5 guidance).
    output_config: { effort: "low", format: zodOutputFormat(socialTopicResultSchema) },
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}

async function authorCrafts(admin: SupabaseClient<Database>, authorId: string): Promise<string[]> {
  const { data } = await admin.from("profiles").select("crafts").eq("id", authorId).maybeSingle();
  return parseSocialProfileRoles(data?.crafts).map(socialProfileRoleLabel);
}

/**
 * What the tagger would write for this post, without writing it. Null while
 * the post's video or transcript is still preparing. The eval script uses
 * this directly; the cron goes through tagSocialPostTopic.
 */
export async function decideSocialPostTopic(args: {
  admin: SupabaseClient<Database>;
  client: Anthropic;
  post: SocialTopicPost;
  now: Date;
  requestSubtitles?: boolean;
  minConfidence?: number;
  mediaDeps?: SocialTopicMediaDeps;
}): Promise<{ write: SocialTopicWrite; result: SocialTopicResult | null } | null> {
  const { admin, client, post, now } = args;
  const items = ownedMediaItems(post.media, post.author_id, "posts");
  const media = await gatherSocialTopicMedia(
    items,
    post.created_at,
    now,
    { requestSubtitles: args.requestSubtitles ?? true },
    args.mediaDeps,
  );
  if (media.status === "wait") return null;

  const caption = post.body?.trim() || null;
  // Nothing to read: no call, and the look is stamped as no topic.
  if (!caption && media.images.length === 0 && !media.transcript) {
    return { write: socialTopicWrite(null, now), result: null };
  }
  const result = await classifySocialTopic(client, {
    caption,
    crafts: await authorCrafts(admin, post.author_id),
    transcript: media.transcript,
    images: media.images,
  });
  return {
    write: socialTopicWrite(result, now, args.minConfidence ?? SOCIAL_TOPIC_MIN_CONFIDENCE),
    result,
  };
}

/** Classify one post and stamp it. A thrown error leaves the post untouched for the next run. */
export async function tagSocialPostTopic(args: {
  admin: SupabaseClient<Database>;
  client: Anthropic;
  post: SocialTopicPost;
  now: Date;
  mediaDeps?: SocialTopicMediaDeps;
}): Promise<SocialTopicOutcome> {
  const decided = await decideSocialPostTopic(args);
  if (!decided) return "wait";
  const { data, error } = await args.admin
    .from("posts")
    .update(decided.write)
    .eq("id", args.post.id)
    // Never over an author's topic, and never twice.
    .is("category", null)
    .is("category_tagged_at", null)
    .select("id");
  if (error) throw new Error(`Topic write failed: ${error.message}`);
  if (!data || data.length === 0) return "raced";
  return decided.write.category ? "tagged" : "declined";
}
