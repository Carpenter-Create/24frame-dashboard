import { SocialEmpty } from "@/components/social/social-empty";
import { SocialActivityPills } from "@/components/social/social-activity-pills";
import { SocialPostCard } from "@/components/social/social-post-card";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  SOCIAL_ACTIVITY_COMMENT_SNIPPET_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
} from "@/lib/social-chrome";
import { socialActivityEmptyCopy, type SocialActivityPill } from "@/lib/social-activity";
import { socialCommentSnippet } from "@/lib/social-comments";
import { SOCIAL } from "@/lib/social";

export type SocialActivityCommentCardModel = {
  commentId: string;
  body: string;
  commentedAt: string;
  post: SocialPostCardModel;
};

export function SocialActivityHistory({
  baseHref,
  pill,
  posts,
  comments,
  truncated,
}: {
  baseHref: string;
  pill: SocialActivityPill;
  posts: readonly SocialPostCardModel[];
  comments: readonly SocialActivityCommentCardModel[];
  truncated: boolean;
}) {
  const empty = socialActivityEmptyCopy(pill);
  const isComments = pill === "comments";
  const hasRows = isComments ? comments.length > 0 : posts.length > 0;

  return (
    <div data-social-activity="" className="flex flex-col gap-[var(--space-3)]">
      <SocialActivityPills baseHref={baseHref} active={pill} />
      {hasRows ? (
        <div data-social-activity-feed="" className={SOCIAL_FEED_GUTTER_CLASS}>
          {isComments
            ? comments.map((item) => (
                <article
                  key={item.commentId}
                  data-social-activity-comment={item.commentId}
                  className="flex flex-col"
                >
                  <SocialPostCard post={item.post} />
                  <div className="bg-surface px-3 pb-3">
                    <p className="t-label text-ink-3">{SOCIAL.profile.activityCommented}</p>
                    <p className={SOCIAL_ACTIVITY_COMMENT_SNIPPET_CLASS}>
                      {socialCommentSnippet(item.body)}
                    </p>
                  </div>
                </article>
              ))
            : posts.map((post) => <SocialPostCard key={post.id} post={post} />)}
        </div>
      ) : (
        <SocialEmpty
          icon={isComments ? "chat-circle" : pill === "videos" ? "play" : "image"}
          title={empty.title}
          hint={empty.hint}
        />
      )}
      {truncated ? (
        <InlineNotice data-social-activity-truncated="">{SOCIAL.profile.postsTruncated}</InlineNotice>
      ) : null}
    </div>
  );
}
