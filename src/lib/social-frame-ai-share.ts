import type { createClient } from "@/lib/supabase/server";

import type { SocialFrameAiShare } from "@/lib/social-frame-ai";
import { socialAvatarHref } from "@/lib/social-edge";
import { bareHandle, socialPostHref, socialStoryHref } from "@/lib/social";
import { presentDmStoryShare, STORY_DM_SHARE_KIND } from "@/lib/social-dm-story";
import { dmThreadPostSystemLine, dmThreadStorySystemLine } from "@/lib/social-dm-thread-format";
import { loadStoryById } from "@/lib/social-feed";
import { ownedMediaItems } from "@/lib/social-media";
import {
  POST_DM_SHARE_KIND,
  postShareAttemptId,
  postShareCaptionSnip,
  presentDmPostShare,
} from "@/lib/social-post-share";

// Visit context for a share into the 24Frame AI thread. The card is the
// same DM share card. It is not an Ask turn and it is not stored.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function loadSocialFrameAiShare(
  supabase: ServerClient,
  input: { postId?: string | null; storyId?: string | null },
): Promise<SocialFrameAiShare | null> {
  const postId = postShareAttemptId(input.postId ?? "");
  if (postId) return loadPostShare(supabase, postId);
  const storyId = postShareAttemptId(input.storyId ?? "");
  if (storyId) return loadStoryShare(supabase, storyId);
  return null;
}

async function loadPostShare(supabase: ServerClient, postId: string): Promise<SocialFrameAiShare | null> {
  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, body, media, status")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  if (!post) return null;

  const handle = await authorHandle(supabase, post.author_id);
  const caption = postShareCaptionSnip(post.body);
  const card = presentDmPostShare({
    body: null,
    media: [
      ...ownedMediaItems(post.media, post.author_id, "posts"),
      {
        kind: POST_DM_SHARE_KIND,
        postId: post.id,
        authorId: post.author_id,
        ...(handle ? { authorHandle: handle } : {}),
        ...(caption ? { caption } : {}),
      },
    ],
  });
  return {
    kind: "post",
    line: dmThreadPostSystemLine({ mine: true, authorHandle: handle, senderName: null }),
    authorName: bareHandle(handle),
    authorPhotoUrl: socialAvatarHref(post.author_id),
    caption: card?.caption ?? caption,
    unavailable: false,
    mediaKind: card?.kind ?? null,
    url: card?.url ?? null,
    playbackId: card?.playbackId,
    playbackPolicy: card?.playbackPolicy,
    href: socialPostHref(post.id),
  };
}

async function loadStoryShare(supabase: ServerClient, storyId: string): Promise<SocialFrameAiShare | null> {
  const story = await loadStoryById(supabase, storyId);
  if (!story) return null;
  const handle = await authorHandle(supabase, story.author_id);
  const card = presentDmStoryShare({
    body: null,
    media: [
      ...ownedMediaItems(story.media, story.author_id, "stories"),
      {
        kind: STORY_DM_SHARE_KIND,
        storyId: story.id,
        authorId: story.author_id,
        expiresAt: story.expires_at,
        ...(handle ? { authorHandle: handle } : {}),
      },
    ],
    live: { status: "active", expiresAt: story.expires_at, authorId: story.author_id },
  });
  return {
    kind: "story",
    line: dmThreadStorySystemLine({ mine: true, authorHandle: handle, senderName: null }) ?? "",
    authorName: bareHandle(handle),
    authorPhotoUrl: socialAvatarHref(story.author_id),
    caption: null,
    unavailable: card?.unavailable ?? true,
    mediaKind: card?.kind ?? null,
    url: card?.url ?? null,
    playbackId: card?.playbackId,
    playbackPolicy: card?.playbackPolicy,
    href: card?.href ?? socialStoryHref(story.id),
  };
}

async function authorHandle(supabase: ServerClient, authorId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("handle").eq("id", authorId).maybeSingle();
  return data?.handle ?? "";
}
