import type { ReactNode } from "react";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialDmPostShare } from "@/components/social/social-dm-post-share";
import { SocialDmStoryShare } from "@/components/social/social-dm-story-share";
import { SocialFrameAiFace } from "@/components/social/social-frame-ai-face";
import { SOCIAL_FRAME_AI_ID } from "@/lib/social-frame-ai";
import { cn } from "@/lib/cn";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import { POST_SHARE_CARD_WIDTH_CLASS } from "@/lib/social-post-share";
import {
  clusterDmThreadMessages,
  DM_THREAD_AVATAR_CLASS,
  DM_THREAD_COLUMN_CLASS,
  DM_THREAD_DAY_CLASS,
  DM_THREAD_LIST_CLASS,
  DM_THREAD_SYSTEM_LINE_CLASS,
  DM_THREAD_TIME_CLASS,
  dmThreadAlign,
  dmThreadBlockGapClass,
  dmThreadBubbleClass,
  dmThreadSideClass,
  dmThreadStackClass,
  dmThreadSystemLineAlignClass,
  type DmThreadClusterMessage,
} from "@/lib/social-dm-thread-format";

export type DmThreadStoryShareView = {
  comment: string | null;
  line: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  unavailable: boolean;
  kind: "image" | "video" | null;
  url: string | null;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  href: string | null;
};

export type DmThreadPostShareView = {
  comment: string | null;
  line: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  caption: string | null;
  kind: "image" | "video" | null;
  url: string | null;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  href: string;
};

export type DmThreadViewMessage = DmThreadClusterMessage & {
  senderName: string;
  senderPhotoUrl: string | null;
  text: string | null;
  story: DmThreadStoryShareView | null;
  post: DmThreadPostShareView | null;
  marker?: "opener" | "thinking";
};

function Bubble({
  mine,
  text,
  marker,
  flag,
}: {
  mine: boolean;
  text: string;
  marker: "bubble" | "comment";
  flag?: "opener" | "thinking";
}) {
  return (
    <p
      data-social-dm-bubble={marker === "bubble" ? "" : undefined}
      data-social-dm-story-comment={marker === "comment" ? "" : undefined}
      data-social-frame-ai-opener={flag === "opener" ? "" : undefined}
      data-social-frame-ai-thinking={flag === "thinking" ? "" : undefined}
      className={dmThreadBubbleClass(mine)}
    >
      {text}
    </p>
  );
}

function ThreadMessage({ message }: { message: DmThreadViewMessage }) {
  if (message.story) {
    const { story } = message;
    return (
      <div
        data-social-dm-story-group=""
        className={cn("flex flex-col gap-2", message.mine ? "items-end" : "items-start")}
      >
        {story.comment ? (
          <Bubble mine={message.mine} text={story.comment} marker="comment" flag={message.marker} />
        ) : null}
        {story.line ? (
          <p
            data-social-dm-story-line=""
            className={cn(DM_THREAD_SYSTEM_LINE_CLASS, dmThreadSystemLineAlignClass(message.mine))}
          >
            {story.line}
          </p>
        ) : null}
        <SocialDmStoryShare
          authorName={story.authorName}
          authorPhotoUrl={story.authorPhotoUrl}
          unavailable={story.unavailable}
          kind={story.kind}
          url={story.url}
          playbackId={story.playbackId}
          playbackPolicy={story.playbackPolicy}
          href={story.href}
        />
      </div>
    );
  }
  if (message.post) {
    const { post } = message;
    return (
      <div
        data-social-dm-post-group=""
        className={cn("flex flex-col gap-2", message.mine ? "items-end" : "items-start")}
      >
        {post.comment ? (
          <Bubble mine={message.mine} text={post.comment} marker="bubble" flag={message.marker} />
        ) : null}
        {post.line ? (
          <p
            data-social-dm-post-line=""
            className={cn(
              "t-body-sm text-ink-2 break-words",
              POST_SHARE_CARD_WIDTH_CLASS,
              message.mine ? "text-right" : "text-left",
            )}
          >
            {post.line}
          </p>
        ) : null}
        <SocialDmPostShare
          authorName={post.authorName}
          authorPhotoUrl={post.authorPhotoUrl}
          caption={post.caption}
          kind={post.kind}
          url={post.url}
          playbackId={post.playbackId}
          playbackPolicy={post.playbackPolicy}
          href={post.href}
        />
      </div>
    );
  }
  if (!message.text) return null;
  return <Bubble mine={message.mine} text={message.text} marker="bubble" flag={message.marker} />;
}

export function SocialDmThread({
  messages,
  now = new Date(),
  empty = null,
}: {
  messages: DmThreadViewMessage[];
  now?: Date;
  empty?: ReactNode;
}) {
  const blocks = clusterDmThreadMessages(messages, now);
  return (
    <div data-social-dm-column="" className={DM_THREAD_COLUMN_CLASS}>
      <ol data-social-dm-messages="" className={DM_THREAD_LIST_CLASS}>
        {blocks.map((block, index) => {
          const previousBlock = index > 0 ? blocks[index - 1] : null;
          const previous = previousBlock
            ? {
                kind: previousBlock.kind === "group" ? ("group" as const) : ("separator" as const),
                senderId: previousBlock.kind === "group" ? previousBlock.messages[0].senderId : null,
              }
            : null;
          if (block.kind === "day") {
            return (
              <li
                key={block.key}
                data-social-dm-day=""
                className={cn(
                  DM_THREAD_DAY_CLASS,
                  dmThreadBlockGapClass({ kind: "day", senderId: null, previous }),
                )}
              >
                {block.label}
              </li>
            );
          }
          if (block.kind === "time") {
            return (
              <li
                key={block.key}
                data-social-dm-time=""
                className={cn(
                  DM_THREAD_TIME_CLASS,
                  dmThreadBlockGapClass({ kind: "time", senderId: null, previous }),
                )}
              >
                {block.label}
              </li>
            );
          }
          const first = block.messages[0];
          return (
            <li
              key={block.key}
              data-social-dm-group=""
              data-social-dm-align={dmThreadAlign(block.mine)}
              className={cn(
                dmThreadSideClass(block.mine),
                dmThreadBlockGapClass({ kind: "group", senderId: first.senderId, previous }),
              )}
            >
              {block.showAvatar ? (
                first.senderId === SOCIAL_FRAME_AI_ID ? (
                  <SocialFrameAiFace className={DM_THREAD_AVATAR_CLASS} />
                ) : (
                  <SocialAvatar
                    name={first.senderName}
                    photoUrl={first.senderPhotoUrl}
                    size="sm"
                    className={DM_THREAD_AVATAR_CLASS}
                  />
                )
              ) : null}
              <div className={dmThreadStackClass(block.mine)}>
                {block.messages.map((message) => (
                  <ThreadMessage key={message.id} message={message} />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      {messages.length === 0 ? empty : null}
    </div>
  );
}
