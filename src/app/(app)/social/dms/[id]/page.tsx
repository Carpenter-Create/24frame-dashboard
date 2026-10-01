import { redirect } from "next/navigation";

import { HouseEmpty, TextAction } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SocialDmCompose, SocialGroupTitleForm } from "@/components/social/social-dm-compose";
import { SocialDmThread, type DmThreadViewMessage } from "@/components/social/social-dm-thread";
import { SocialDmThreadHeader } from "@/components/social/social-dm-thread-header";
import { SocialDmThreadStick } from "@/components/social/social-dm-thread-stick";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import {
  SOCIAL_DM_THREAD_CURSOR_PARAM,
  parseDmThreadCursorParam,
  socialDmThreadHref,
} from "@/lib/social-dm-bounds";
import { bareHandle, SOCIAL, SOCIAL_ROUTES, socialPersonLabel, socialPostHref } from "@/lib/social";
import {
  dmStoryComment,
  parseDmStoryShare,
  presentDmStoryShare,
  type DmStoryLive,
} from "@/lib/social-dm-story";
import { dmPostComment, parseDmPostShare, presentDmPostShare } from "@/lib/social-post-share";
import {
  DM_THREAD_ROOT_CLASS,
  dmThreadHeaderModel,
  dmThreadHeaderPeers,
  dmThreadPostSystemLine,
  dmThreadStorySystemLine,
} from "@/lib/social-dm-thread-format";
import { loadDmParticipants, loadDmThreadMessages } from "@/lib/social-dms";
import { loadProfilesByIds } from "@/lib/social-feed";
import {
  isSocialFrameAiTarget,
  readSocialFrameAiShareSearch,
  socialFrameAiThreadHref,
} from "@/lib/social-frame-ai";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";
import { markSocialDmRead } from "../../actions";

export default async function SocialDmThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, { id }, sp] = await Promise.all([
    requireSocialSession(),
    params,
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const { ctx, supabase } = session;
  if (isSocialFrameAiTarget(id)) {
    redirect(socialFrameAiThreadHref(readSocialFrameAiShareSearch(sp)));
  }
  const cursor = parseDmThreadCursorParam(sp[SOCIAL_DM_THREAD_CURSOR_PARAM]);
  const profile = await ensureOwnSocialProfile(supabase, ctx.user);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, kind, title")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) {
    return (
      <div data-social-dm-missing="">
        <PageHeader title={SOCIAL.dms.thread} backLink={{ href: SOCIAL_ROUTES.dms }} />
        <HouseEmpty>{SOCIAL.dms.missing}</HouseEmpty>
      </div>
    );
  }

  if (profile) await markSocialDmRead(conversation.id);

  const [thread, members] = await Promise.all([
    loadDmThreadMessages(supabase, conversation.id, { cursor }),
    loadDmParticipants(supabase, conversation.id),
  ]);
  const messages = thread.messages;
  const legacyIds = [
    ...new Set(
      messages.flatMap((message) => {
        const parsed = parseDmStoryShare(message);
        if (!parsed?.legacy || !parsed.storyId) return [];
        return [parsed.storyId];
      }),
    ),
  ];
  const liveById = new Map<string, DmStoryLive>();
  if (legacyIds.length > 0) {
    const { data: storyRows } = await supabase
      .from("stories")
      .select("id, author_id, status, expires_at")
      .in("id", legacyIds);
    for (const row of storyRows ?? []) {
      liveById.set(row.id, {
        status: row.status,
        expiresAt: row.expires_at,
        authorId: row.author_id,
      });
    }
  }
  const activeIds = members.rows.map((row) => row.user_id);
  const peopleIds = [
    ...new Set([
      ...(profile ? [profile.id] : []),
      ...activeIds,
      ...messages.map((row) => row.sender_id).filter((id): id is string => !!id),
      ...messages.flatMap((message) => {
        const parsed = parseDmStoryShare(message);
        const live = parsed?.storyId ? liveById.get(parsed.storyId) : undefined;
        const authorId = parsed?.authorId ?? live?.authorId;
        const postAuthorId = parseDmPostShare(message)?.authorId;
        return [authorId, postAuthorId].filter((id): id is string => !!id);
      }),
    ]),
  ];
  const [people, faces] = await Promise.all([
    loadProfilesByIds(supabase, peopleIds),
    signedAvatarUrls(peopleIds),
  ]);
  const others = activeIds
    .filter((userId) => userId !== ctx.user.id)
    .map((userId) => people.get(userId))
    .filter((person): person is NonNullable<typeof person> => !!person);
  const selfPerson = people.get(ctx.user.id) ?? profile;
  const header = dmThreadHeaderModel({
    title: conversation.title,
    peers: dmThreadHeaderPeers({
      kind: conversation.kind,
      peers: others.map((person) => ({
        handle: person.handle,
        displayName: person.display_name,
        photoUrl: faces.get(person.id) ?? null,
      })),
      self: selfPerson
        ? {
            handle: selfPerson.handle,
            displayName: selfPerson.display_name,
            photoUrl: faces.get(selfPerson.id) ?? null,
          }
        : null,
    }),
  });
  const historical = cursor !== null;
  const threadMessages: DmThreadViewMessage[] = messages.map((message) => {
    const sender = message.sender_id ? people.get(message.sender_id) : null;
    const senderName = socialPersonLabel({
      handle: sender?.handle ?? "",
      displayName: sender?.display_name,
    });
    const mine = message.sender_id === ctx.user.id;
    const parsed = parseDmStoryShare(message);
    const card = parsed
      ? presentDmStoryShare({
          body: message.body,
          media: message.media,
          live: parsed.legacy && parsed.storyId ? liveById.get(parsed.storyId) ?? null : null,
        })
      : null;
    const postParsed = card ? null : parseDmPostShare(message);
    const postCard = postParsed ? presentDmPostShare({ body: message.body, media: message.media }) : null;
    const base = {
      id: message.id,
      senderId: message.sender_id,
      createdAt: message.created_at,
      mine,
      senderName,
      senderPhotoUrl: message.sender_id ? faces.get(message.sender_id) ?? null : null,
    };
    if (card) {
      const author = card.authorId ? people.get(card.authorId) : null;
      const authorHandle = author?.handle || parsed?.authorHandle || "";
      return {
        ...base,
        text: null,
        post: null,
        story: {
          comment: dmStoryComment(message),
          line: dmThreadStorySystemLine({
            mine,
            authorHandle: authorHandle || null,
            senderName,
          }),
          authorName: authorHandle ? bareHandle(authorHandle) : "",
          authorPhotoUrl: card.authorId ? faces.get(card.authorId) ?? null : null,
          unavailable: card.unavailable,
          kind: card.kind,
          url: card.url,
          playbackId: card.playbackId,
          playbackPolicy: card.playbackPolicy,
          href: card.href,
        },
      };
    }
    if (postCard && postParsed) {
      const author = people.get(postCard.authorId);
      const authorHandle = author?.handle || postParsed.authorHandle || "";
      return {
        ...base,
        text: null,
        story: null,
        post: {
          comment: dmPostComment(message),
          line: dmThreadPostSystemLine({
            mine,
            authorHandle: authorHandle || null,
            senderName,
          }),
          authorName: authorHandle ? bareHandle(authorHandle) : "",
          authorPhotoUrl: faces.get(postCard.authorId) ?? null,
          caption: postCard.caption,
          kind: postCard.kind,
          url: postCard.url,
          playbackId: postCard.playbackId,
          playbackPolicy: postCard.playbackPolicy,
          href: socialPostHref(postCard.postId),
        },
      };
    }
    return { ...base, text: message.body, story: null, post: null };
  });

  return (
    <div data-social-dm-thread="" data-social-dm-kind={conversation.kind} className={DM_THREAD_ROOT_CLASS}>
      <SocialDmThreadHeader
        label={header.label}
        href={header.href}
        photoUrl={header.photoUrl}
        avatarName={header.avatarName}
      />
      {profile && conversation.kind === "group" ? (
        <SocialGroupTitleForm conversationId={conversation.id} title={conversation.title} />
      ) : null}
      {thread.truncated || members.truncated || historical ? (
        <div
          data-social-dm-thread-truncated={thread.truncated || members.truncated ? "" : undefined}
          data-social-dm-older-page={historical ? "" : undefined}
          className="mb-[var(--space-4)] flex flex-col gap-[var(--space-3)]"
        >
          {historical ? (
            <InlineNotice tone="info">{SOCIAL.dms.olderPage}</InlineNotice>
          ) : thread.truncated ? (
            <InlineNotice tone="info">{SOCIAL.dms.truncatedThread}</InlineNotice>
          ) : null}
          {members.truncated ? (
            <InlineNotice tone="info">{SOCIAL.dms.roomFull}</InlineNotice>
          ) : null}
          {historical ? (
            <TextAction href={socialDmThreadHref(conversation.id)} data-social-dm-latest="">
              {SOCIAL.dms.latestMessages}
            </TextAction>
          ) : null}
          {thread.nextCursor ? (
            <TextAction
              href={socialDmThreadHref(conversation.id, { before: thread.nextCursor })}
              data-social-dm-older=""
            >
              {SOCIAL.dms.olderMessages}
            </TextAction>
          ) : null}
        </div>
      ) : null}
      <SocialDmThread
        messages={threadMessages}
        empty={<HouseEmpty>{SOCIAL.dms.empty}</HouseEmpty>}
      />
      {profile && !historical ? <SocialDmCompose conversationId={conversation.id} /> : null}
      {!historical ? (
        <SocialDmThreadStick nonce={messages[messages.length - 1]?.id ?? "empty"} />
      ) : null}
    </div>
  );
}
