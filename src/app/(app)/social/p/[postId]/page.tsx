import { HouseEmpty } from "@/components/chrome/house";
import { SocialCommentThread } from "@/components/social/social-comment-thread";
import { SocialPostBack } from "@/components/social/social-post-back";
import { SocialPostCard } from "@/components/social/social-post-card";
import { PAGE_LEAD_STACK_CLASS } from "@/components/ui/page-header";
import { socialAvatarHref, socialMediaProxies } from "@/lib/social-edge";
import { SOCIAL, socialPersonLabel } from "@/lib/social";
import { normalizeSocialCategory } from "@/lib/social-categories";
import { SOCIAL_POST_PAGE_CLASS } from "@/lib/social-chrome";
import {
  loadGroupsByIds,
  loadLikedPostIds,
  loadProfilesByIds,
  loadVisiblePost,
} from "@/lib/social-feed";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

export default async function SocialPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const [session, { postId: rawPostId }] = await Promise.all([requireSocialSession(), params]);
  const { ctx, supabase } = session;
  const postId = decodeURIComponent(rawPostId);
  const post = await loadVisiblePost(supabase, postId);

  if (!post) {
    return (
      <div data-social-post-missing="" className={SOCIAL_POST_PAGE_CLASS}>
        <div className={PAGE_LEAD_STACK_CLASS}>
          <SocialPostBack />
          <h1 className="t-title text-ink">{SOCIAL.post.title}</h1>
        </div>
        <HouseEmpty>{SOCIAL.post.missing}</HouseEmpty>
      </div>
    );
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
    <div data-social-post-detail="" className={SOCIAL_POST_PAGE_CLASS}>
      <div className={PAGE_LEAD_STACK_CLASS}>
        <SocialPostBack />
        <h1 className="t-title text-ink">{SOCIAL.post.title}</h1>
      </div>
      {/* Cards lock: the post is one card in the Feed's 600 column, its
          comment thread inside the card under the actions.
          docs/design-locks/social-feed-cards-lock-v1.md */}
      <SocialPostCard
        permalink={false}
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
          topic: normalizeSocialCategory(post.category),
          media,
        }}
        comments={
          <SocialCommentThread
            postId={post.id}
            groupSlug={group?.slug}
            canComment={!!profile}
            commentCount={post.comment_count}
            variant="page"
          />
        }
      />
    </div>
  );
}
