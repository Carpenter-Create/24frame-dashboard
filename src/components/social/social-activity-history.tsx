import { SocialEmpty } from "@/components/social/social-empty";
import { SocialActivityPills } from "@/components/social/social-activity-pills";
import { SocialPostCard } from "@/components/social/social-post-card";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  SOCIAL_ACTIVITY_COMMENTED_LABEL_CLASS,
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
                // Cards lock: the "You commented" line sits inside the
                // post's card under its actions, not as a strip on the
                // page. docs/design-locks/social-feed-cards-lock-v1.md
                <SocialPostCard
                  key={item.commentId}
                  post={item.post}
                  comments={
                    <div data-social-activity-comment={item.commentId}>
                      <p className={SOCIAL_ACTIVITY_COMMENTED_LABEL_CLASS}>{SOCIAL.profile.activityCommented}</p>
                      <p className={SOCIAL_ACTIVITY_COMMENT_SNIPPET_CLASS}>
                        {socialCommentSnippet(item.body)}
                      </p>
                    </div>
                  }
                />
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
