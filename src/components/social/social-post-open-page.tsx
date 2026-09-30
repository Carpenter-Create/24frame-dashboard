import { SocialPostOpen, SocialPostOpenMissing } from "@/components/social/social-post-open";
import { socialAvatarHref, socialMediaProxies } from "@/lib/social-edge";
import { socialPersonLabel } from "@/lib/social";
import {
  loadGroupsByIds,
  loadLikedPostIds,
  loadProfilesByIds,
  loadVisiblePost,
} from "@/lib/social-feed";
import type { SocialPostOpenDismiss } from "@/lib/social-post-open";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

export async function SocialPostOpenPage({
  postId,
  dismiss,
}: {
  postId: string;
  dismiss: SocialPostOpenDismiss;
}) {
  const session = await requireSocialSession();
  const { ctx, supabase } = session;
  const post = await loadVisiblePost(supabase, postId);

  if (!post) {
    return <SocialPostOpenMissing dismiss={dismiss} />;
  }

  const profile = await ensureOwnSocialProfile(supabase, ctx.user);
  const [authors, groups, liked, photoUrl, media] = await Promise.all([
    loadProfilesByIds(supabase, [post.author_id]),
    post.group_id ? loadGroupsByIds(supabase, [post.group_id]) : Promise.resolve(new Map()),
    profile ? loadLikedPostIds(supabase, ctx.user.id, [post.id]) : Promise.resolve(new Set<string>()),
    Promise.resolve(socialAvatarHref(post.author_id)),
    Promise.resolve(socialMediaProxies(post.media, post.author_id)),
  ]);
  const author = authors.get(post.author_id);
  const group = post.group_id ? groups.get(post.group_id) : null;

  return (
    <SocialPostOpen
      dismiss={dismiss}
      post={{
        id: post.id,
        body: post.body,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        liked: liked.has(post.id),
        createdAt: post.created_at,
        authorId: post.author_id,
        authorHandle: author?.handle ?? null,
        authorName: socialPersonLabel({
          handle: author?.handle ?? "",
          displayName: author?.display_name,
        }),
        authorPhotoUrl: photoUrl,
        groupSlug: group?.slug ?? null,
        groupName: group?.name ?? null,
        canLike: !!profile,
        owned: post.author_id === ctx.user.id,
        media,
      }}
    />
  );
}
