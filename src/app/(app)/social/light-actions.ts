"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import {
  followInsertRow,
  likeInsertRow,
  SOCIAL,
  SOCIAL_ROUTES,
  socialDmHref,
  socialGroupHref,
  socialGroupPostHref,
  socialPersonLabel,
  socialPostHref,
  socialStoryHref,
  normalizeMessageBody,
  storyLikeInsertRow,
} from "@/lib/social";
import { storyDmInsertRow } from "@/lib/social-dm-story";
import {
  postDmInsertRow,
  postShareAttemptContains,
  postShareAttemptId,
  postShareFailureCopy,
  postSharePeerAllowed,
  postSharePeerIds,
  recipientMayViewPost,
} from "@/lib/social-post-share";
import { socialAvatarHref } from "@/lib/social-edge";
import { loadDmInbox } from "@/lib/social-dms";
import { isSocialFrameAiTarget } from "@/lib/social-frame-ai";
import { loadFolloweeIds, loadProfilesByIds, loadStoryById } from "@/lib/social-feed";
import { ownedMediaItems } from "@/lib/social-media";
import { isStoryLive } from "@/lib/social-stories";
import {
  storyActivityViewers,
  storySendPeopleOrder,
  type StoryActivityViewer,
  type StorySendPerson,
} from "@/lib/social-story-actions";
import { commentBodyError, commentInsertRow, normalizeCommentBody } from "@/lib/social-comments";
import { bustSocialFeedHotCache, bustSocialFollowHotCache } from "@/lib/social-hot-cache";
import {
  postAuthorRefusal,
  postCaptionUpdateRow,
  postCaptionWrite,
  postHasMedia,
  postSoftDeleteUpdateRow,
} from "@/lib/social-post-own";
import { readSocialPostCaptionInput, readSocialPostOwnTarget } from "@/lib/social-post-own-input";
import {
  isFollowUniqueViolation,
  newFollowerNoticeCopy,
  newFollowerSourceRefs,
} from "@/lib/social-follow";

// Follow / like / story heart / story send. No AWS, no MediaRecorder, no profile Save.
// Public Edge reads import these — not actions.ts (presign lives there).

type ActionResult = { error?: string };

type PostShareActionResult = ActionResult & { failedPeerIds?: string[] };

async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
}

async function ownProfile() {
  const user = await requireUser();
  const supabase = await createClient();
  const profile = await ensureOwnSocialProfile(supabase, user);
  return { user, supabase, profile, profileId: profile?.id ?? null };
}

export async function toggleSocialFollow(formData: FormData): Promise<ActionResult> {
  const { user, supabase, profile } = await ownProfile();
  if (!profile) return { error: SOCIAL.cta.needProfile };

  const followeeId = String(formData.get("followee_id") ?? "").trim();
  const following = String(formData.get("following") ?? "") === "1";
  if (!followeeId || followeeId === user.id) return { error: SOCIAL.member.missing };

  if (following) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followee_id", followeeId);
    if (error) return { error: error.message || SOCIAL.follow.failed };
  } else {
    const { error } = await supabase.from("follows").insert(followInsertRow(user.id, followeeId));
    if (error && !isFollowUniqueViolation(error)) {
      return { error: error.message || SOCIAL.follow.failed };
    }
    if (!error) {
      const copy = newFollowerNoticeCopy(profile.handle);
      await supabase.rpc("notify_new_follower", {
        p_followee: followeeId,
        p_title: copy.title,
        p_body: copy.body,
        p_source_refs: newFollowerSourceRefs({ actorId: user.id, handle: profile.handle }),
      });
    }
  }

  await bustSocialFollowHotCache(user.id, followeeId);
  return {};
}

export async function toggleSocialLike(formData: FormData): Promise<ActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const postId = String(formData.get("post_id") ?? "").trim();
  const liked = String(formData.get("liked") ?? "") === "1";
  if (!postId) return { error: "Missing post." };

  if (liked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", "post")
      .eq("target_id", postId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("likes").insert(likeInsertRow(user.id, postId));
    if (error) return { error: error.message };
  }

  revalidatePath(SOCIAL_ROUTES.home);
  revalidatePath(socialPostHref(postId));
  const slug = String(formData.get("group_slug") ?? "").trim();
  if (slug) {
    revalidatePath(socialGroupHref(slug));
    revalidatePath(socialGroupPostHref(slug, postId));
  }
  return {};
}

export async function toggleSocialStoryLike(formData: FormData): Promise<ActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const storyId = String(formData.get("story_id") ?? "").trim();
  const liked = String(formData.get("liked") ?? "") === "1";
  if (!storyId) return { error: SOCIAL.stories.missing };

  if (liked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", "story_item")
      .eq("target_id", storyId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("likes").insert(storyLikeInsertRow(user.id, storyId));
    if (error && error.code !== "23505") return { error: error.message };
  }

  revalidatePath(socialStoryHref(storyId));
  return {};
}

export async function sendSocialStoryItem(formData: FormData): Promise<ActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const storyId = String(formData.get("story_id") ?? "").trim();
  const peerId = String(formData.get("peer_id") ?? "").trim();
  if (!storyId || !peerId || isSocialFrameAiTarget(peerId)) return { error: SOCIAL.stories.sendFailed };

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, author_id, media, status, expires_at")
    .eq("id", storyId)
    .eq("status", "active")
    .maybeSingle();
  if (storyError || !story || !isStoryLive(story.expires_at)) return { error: SOCIAL.stories.missing };

  const note = String(formData.get("note") ?? "").trim();
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", story.author_id)
    .maybeSingle();

  const { data, error: openError } = await supabase.rpc("open_or_get_direct_conversation", {
    p_peer: peerId,
  });
  const conversationId = typeof data === "string" ? data : "";
  if (openError || !conversationId) return { error: openError?.message || SOCIAL.stories.sendFailed };

  const { error } = await supabase.from("messages").insert(
    storyDmInsertRow({
      senderId: user.id,
      conversationId,
      storyId: story.id,
      authorId: story.author_id,
      expiresAt: story.expires_at,
      authorHandle: authorProfile?.handle ?? "",
      note,
      media: ownedMediaItems(story.media, story.author_id, "stories"),
    }),
  );
  if (error) return { error: error.message || SOCIAL.stories.sendFailed };

  revalidatePath(socialDmHref(conversationId));
  revalidatePath(SOCIAL_ROUTES.dms);
  revalidatePath(socialStoryHref(story.id));
  return {};
}

async function loadStorySendDirectory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<StorySendPerson[]> {
  const [followees, inbox] = await Promise.all([
    loadFolloweeIds(supabase, userId),
    loadDmInbox(supabase),
  ]);
  const recentPeerIds = inbox.rows.flatMap((row) =>
    row.kind === "direct" && row.peer_id ? [row.peer_id] : [],
  );
  const ids = storySendPeopleOrder({
    recentPeerIds,
    followeeIds: followees.ids,
    selfId: userId,
  });
  const profiles = await loadProfilesByIds(supabase, ids);
  return ids.flatMap((id) => {
    const person = profiles.get(id);
    if (!person || person.status !== "active") return [];
    return [
      {
        id,
        name: socialPersonLabel({
          handle: person.handle,
          displayName: person.display_name,
        }),
        handle: person.handle,
        photoUrl: socialAvatarHref(id),
      },
    ];
  });
}

export async function sendSocialPostShare(formData: FormData): Promise<PostShareActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const postId = String(formData.get("post_id") ?? "").trim();
  const peers = postSharePeerIds(formData.getAll("peer_id"));
  const attemptId = postShareAttemptId(String(formData.get("attempt_id") ?? ""));
  if (!postId || !peers.ok || !attemptId) return { error: SOCIAL.post.shareFailed };

  const noteRaw = String(formData.get("note") ?? "");
  const note = noteRaw.trim();
  if (note && !normalizeMessageBody(note)) return { error: SOCIAL.post.shareFailed };

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, body, media, status, group_id")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  if (postError || !post) return { error: SOCIAL.post.missing };

  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", post.author_id)
    .maybeSingle();

  // Same allowlist the sheet lists. A stranger never reaches open_or_get.
  // docs/design-locks/social-post-share-sheet-ig-lock-v1.md
  const directory = await loadStorySendDirectory(supabase, user.id);
  const allowlist = new Set(
    directory.filter((person) => !isSocialFrameAiTarget(person.id)).map((person) => person.id),
  );
  const failedPeerIds: string[] = [];

  for (const peerId of peers.ids) {
    if (isSocialFrameAiTarget(peerId) || !postSharePeerAllowed(peerId, allowlist)) {
      failedPeerIds.push(peerId);
      continue;
    }

    let access: boolean | null = true;
    if (post.group_id) {
      const { data, error } = await supabase.rpc("can_access_group_content", {
        p_group: post.group_id,
        p_user: peerId,
      });
      access = error || data !== true ? null : true;
    }
    // Group post, Adam 2026-09-25: refuse a peer who cannot view it.
    // No conversation, no media keys, no playback id.
    // docs/design-locks/social-post-share-sheet-ig-lock-v1.md
    if (!recipientMayViewPost({ groupId: post.group_id, access })) {
      failedPeerIds.push(peerId);
      continue;
    }

    const { data, error: openError } = await supabase.rpc("open_or_get_direct_conversation", {
      p_peer: peerId,
    });
    const conversationId = typeof data === "string" ? data : "";
    if (openError || !conversationId) {
      failedPeerIds.push(peerId);
      continue;
    }

    const { data: prior, error: priorError } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("sender_id", user.id)
      .contains("media", postShareAttemptContains(post.id, attemptId))
      .limit(1);
    if (priorError) {
      failedPeerIds.push(peerId);
      continue;
    }
    if ((prior ?? []).length > 0) continue;

    const { error } = await supabase.from("messages").insert(
      postDmInsertRow({
        senderId: user.id,
        conversationId,
        postId: post.id,
        authorId: post.author_id,
        authorHandle: authorProfile?.handle ?? "",
        caption: post.body,
        note,
        attemptId,
        media: ownedMediaItems(post.media, post.author_id, "posts"),
      }),
    );
    if (error) {
      failedPeerIds.push(peerId);
      continue;
    }
    revalidatePath(socialDmHref(conversationId));
  }

  if (failedPeerIds.length > 0) {
    const names = failedPeerIds.flatMap((id) => {
      const person = directory.find((item) => item.id === id);
      return person ? [person.name] : [];
    });
    return { error: postShareFailureCopy(names), failedPeerIds };
  }

  revalidatePath(SOCIAL_ROUTES.dms);
  revalidatePath(socialPostHref(postId));
  return {};
}

export async function listStorySendPeople(): Promise<{ people: StorySendPerson[]; error?: string }> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { people: [], error: SOCIAL.cta.needProfile };
  return { people: await loadStorySendDirectory(supabase, user.id) };
}

export async function listStoryViewers(storyId: string): Promise<{
  people: StoryActivityViewer[];
  error?: string;
}> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { people: [], error: SOCIAL.cta.needProfile };

  const id = storyId.trim();
  if (!id) return { people: [], error: SOCIAL.stories.missing };
  const story = await loadStoryById(supabase, id);
  if (!story || story.author_id !== user.id) {
    return { people: [], error: SOCIAL.stories.missing };
  }

  const { data, error } = await supabase
    .from("story_views")
    .select("viewer_id, viewed_at")
    .eq("story_id", id);
  if (error || !data) return { people: [], error: SOCIAL.stories.activityFailed };

  const profiles = await loadProfilesByIds(
    supabase,
    data.map((row) => row.viewer_id),
  );
  const byId = new Map(
    [...profiles.entries()].map(([profileId, profile]) => [
      profileId,
      {
        handle: profile.handle,
        displayName: profile.display_name,
        status: profile.status,
      },
    ]),
  );
  return {
    people: storyActivityViewers({
      authorId: user.id,
      views: data.map((row) => ({ viewerId: row.viewer_id, viewedAt: row.viewed_at })),
      profiles: byId,
      photoUrl: socialAvatarHref,
    }),
  };
}

type CommentActionResult = ActionResult & { id?: string; created_at?: string };

export async function createSocialComment(formData: FormData): Promise<CommentActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const postId = String(formData.get("post_id") ?? "").trim();
  const raw = String(formData.get("body") ?? "");
  const body = normalizeCommentBody(raw);
  if (!postId) return { error: SOCIAL.post.missing };
  if (!body) return { error: commentBodyError(raw) };

  const { data, error } = await supabase
    .from("comments")
    .insert(commentInsertRow({ postId, authorId: user.id, body }))
    .select("id, created_at")
    .single();
  if (error || !data) return { error: error?.message || SOCIAL.post.commentFailed };

  revalidatePath(SOCIAL_ROUTES.home);
  revalidatePath(SOCIAL_ROUTES.profile);
  revalidatePath(socialPostHref(postId));
  const slug = String(formData.get("group_slug") ?? "").trim();
  if (slug) {
    revalidatePath(socialGroupHref(slug));
    revalidatePath(socialGroupPostHref(slug, postId));
  }
  return { id: data.id, created_at: data.created_at };
}

export async function deleteSocialComment(formData: FormData): Promise<ActionResult> {
  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const commentId = String(formData.get("comment_id") ?? "").trim();
  if (!commentId) return { error: SOCIAL.post.missing };

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return { error: error.message || SOCIAL.post.commentDeleteFailed };

  revalidatePath(SOCIAL_ROUTES.home);
  revalidatePath(SOCIAL_ROUTES.profile);
  return {};
}

function revalidateOwnPost(postId: string, groupSlug: string | null) {
  revalidatePath(SOCIAL_ROUTES.home);
  revalidatePath(SOCIAL_ROUTES.profile);
  revalidatePath(socialPostHref(postId));
  if (groupSlug) revalidatePath(socialGroupHref(groupSlug));
}

export async function updateSocialPostCaption(formData: FormData): Promise<ActionResult> {
  // The request is checked first: junk reads nothing and never creates a
  // profile (ownProfile can insert one). social-post-caption-window-lock-v1 §6
  const input = readSocialPostCaptionInput(formData);
  if ("error" in input) return { error: input.error };

  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const { postId } = input;

  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, author_id, body, media, status")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  if (readError || !post) return { error: SOCIAL.post.missing };

  const refused = postAuthorRefusal(user.id, post.author_id);
  if (refused) return { error: refused };

  const written = postCaptionWrite(input.rawBody, postHasMedia(post.media));
  if ("error" in written) return written;
  if ((post.body ?? null) === written.body) return {};

  const { data: saved, error } = await supabase
    .from("posts")
    .update(postCaptionUpdateRow(written.body))
    .eq("id", postId)
    .eq("author_id", user.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) {
    // Database text (a policy or trigger line) stays on the server.
    console.error("[social-post-own] caption update failed", error.code, error.message);
    return { error: SOCIAL.post.editFailed };
  }
  if (!saved) return { error: SOCIAL.post.notAuthor };

  await bustSocialFeedHotCache(user.id);
  revalidateOwnPost(postId, input.groupSlug);
  return {};
}

export async function deleteSocialPost(formData: FormData): Promise<ActionResult> {
  const target = readSocialPostOwnTarget(formData);
  if ("error" in target) return { error: target.error };

  const { user, supabase, profileId } = await ownProfile();
  if (!profileId) return { error: SOCIAL.cta.needProfile };

  const { postId } = target;

  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, author_id, status")
    .eq("id", postId)
    .eq("status", "active")
    .maybeSingle();
  if (readError || !post) return { error: SOCIAL.post.missing };

  const refused = postAuthorRefusal(user.id, post.author_id);
  if (refused) return { error: refused };

  const { data: saved, error } = await supabase
    .from("posts")
    .update(postSoftDeleteUpdateRow())
    .eq("id", postId)
    .eq("author_id", user.id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) {
    // Database text (a policy or trigger line) stays on the server.
    console.error("[social-post-own] post remove failed", error.code, error.message);
    return { error: SOCIAL.post.deleteFailed };
  }
  if (!saved) return { error: SOCIAL.post.notAuthor };

  // Actor feed key only. Another viewer's hot entry can linger until
  // SOCIAL_HOT_TTL_SECONDS, and their following-wall query until
  // SOCIAL_QUERY_STALE_MS. posts.status = removed is the tombstone.
  await bustSocialFeedHotCache(user.id);
  revalidateOwnPost(postId, target.groupSlug);
  return {};
}
