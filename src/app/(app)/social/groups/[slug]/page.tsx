import { HouseEmpty } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { SocialPostCompose } from "@/components/social/social-create-compose";
import { SocialJoinGroupButton } from "@/components/social/social-group-forms";
import { SocialOptimisticFeed } from "@/components/social/social-optimistic-feed";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import { signedSocialMediaByPostId } from "@/lib/s3-social-media";
import { SOCIAL, SOCIAL_ROUTES, socialPersonLabel } from "@/lib/social";
import {
  loadLikedPostIds,
  loadProfilesByIds,
  loadVisiblePosts,
} from "@/lib/social-feed";
import { loadOwnMusicNotices } from "@/lib/social-music-scan";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

export default async function SocialGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [session, { slug }] = await Promise.all([requireSocialSession(), params]);
  const { ctx, supabase } = session;
  const { data: group } = await supabase
    .from("groups")
    .select("id, slug, name, description, visibility, member_count")
    .eq("slug", decodeURIComponent(slug))
    .maybeSingle();

  if (!group) {
    return (
      <div data-social-group-missing="">
        <PageHeader title={SOCIAL.group.wall} backLink={{ href: SOCIAL_ROUTES.groups }} />
        <HouseEmpty>{SOCIAL.group.notFound}</HouseEmpty>
      </div>
    );
  }

  const profile = await ensureOwnSocialProfile(supabase, ctx.user);
  const { data: membership } = profile
    ? await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", group.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle()
    : { data: null };

  const { data: canJoin } = profile
    ? await supabase.rpc("can_self_join_group", { p_group: group.id, p_user: ctx.user.id })
    : { data: false };

  const posts = await loadVisiblePosts(supabase, group.id);
  const authorIds = [...new Set(posts.map((post) => post.author_id))];
  const [authors, faces, media] = await Promise.all([
    loadProfilesByIds(supabase, authorIds),
    signedAvatarUrls(authorIds),
    signedSocialMediaByPostId(posts),
  ]);
  const liked = profile
    ? await loadLikedPostIds(supabase, ctx.user.id, posts.map((post) => post.id))
    : new Set<string>();
  const music = await loadOwnMusicNotices(supabase, ctx.user.id, {
    postIds: posts.map((post) => post.id),
  });

  return (
    <div data-social-group="">
      <PageHeader
        title={group.name}
        subtitle={group.description ?? `${group.member_count} ${SOCIAL.groups.members}`}
        backLink={{ href: SOCIAL_ROUTES.groups, label: SOCIAL.groups.title }}
      />
      {profile && !membership && canJoin === true ? (
        <SocialJoinGroupButton groupId={group.id} groupSlug={group.slug} />
      ) : null}
      {membership ? (
        <SocialPostCompose groupId={group.id} groupSlug={group.slug} />
      ) : profile ? (
        <HouseEmpty>{SOCIAL.group.membersOnly}</HouseEmpty>
      ) : null}
      <SocialOptimisticFeed
        groupSlug={group.slug}
        posts={posts.map((post) => {
          const author = authors.get(post.author_id);
          return {
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
            authorPhotoUrl: faces.get(post.author_id) ?? null,
            groupSlug: group.slug,
            groupName: group.name,
            canLike: !!profile,
            owned: post.author_id === ctx.user.id,
            media: media.get(post.id) ?? [],
            ...(post.author_id === ctx.user.id && music.posts.get(post.id)
              ? { musicNotice: music.posts.get(post.id) }
              : {}),
          };
        })}
        empty={<HouseEmpty>{SOCIAL.group.empty}</HouseEmpty>}
      />
    </div>
  );
}
