import { Suspense, type ReactNode } from "react";

import { InlineNotice } from "@/components/ui/inline-notice";
import { signSocialForYouCourseCovers } from "@/components/social/social-for-you-covers";
import { SocialDesktopForYouSlot } from "@/components/social/social-for-you-slot";
import { SocialDmsInboxSkeleton, SocialForYouSkeleton } from "@/components/social/social-skeletons";
import { SocialDmInboxList } from "@/components/social/social-dm-inbox-list";
import { SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_LAYOUT_CLASS } from "@/lib/social-chrome";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import {
  conversationRoomLabel,
  dmInboxDisplayPeerIds,
  SOCIAL,
  SOCIAL_ROUTES,
  socialDmHref,
  socialPersonLabel,
  socialRelativeTime,
} from "@/lib/social";
import { loadDmInbox, loadDmStoryInboxLines } from "@/lib/social-dms";
import { loadProfilesByIds } from "@/lib/social-feed";
import { socialDmInboxTitle, type SocialDmInboxListRow } from "@/lib/social-dm-inbox-list";
import { pinSocialFrameAiInbox } from "@/lib/social-frame-ai";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export default async function SocialDmsPage() {
  const session = await requireSocialSession();
  return (
    <div data-social-dms="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_HOME_CENTER_CLASS}>
        <Suspense fallback={<SocialDmsInboxSkeleton />}>
          <SocialDmsInbox session={session} />
        </Suspense>
      </div>
      <Suspense fallback={<SocialForYouSkeleton />}>
        <SocialDesktopForYouSlot session={session} signCourseCovers={signSocialForYouCourseCovers} />
      </Suspense>
    </div>
  );
}

async function SocialDmsInbox({ session }: { session: SocialSession }) {
  const { ctx, supabase } = session;
  const [profile, inbox] = await Promise.all([
    ensureOwnSocialProfile(supabase, ctx.user),
    loadDmInbox(supabase),
  ]);
  const rows = profile ? inbox.rows : [];
  const viewerId = ctx.user.id;
  const peopleIds = [...new Set(rows.flatMap((row) => dmInboxDisplayPeerIds(row, viewerId)))];
  const [loadedPeers, faces, excerpts] = await Promise.all([
    loadProfilesByIds(supabase, peopleIds),
    signedAvatarUrls(peopleIds),
    loadDmStoryInboxLines(
      supabase,
      rows.map((row) => row.conversation_id),
      ctx.user.id,
    ),
  ]);
  const peers = loadedPeers;
  if (profile) peers.set(profile.id, profile);

  const listRows: SocialDmInboxListRow[] = pinSocialFrameAiInbox(rows.map((row) => {
    const others = dmInboxDisplayPeerIds(row, viewerId).map((id) => {
      const peer = peers.get(id);
      return {
        name: socialPersonLabel({
          handle: peer?.handle ?? "",
          displayName: peer?.display_name,
        }),
        photoUrl: faces.get(id) ?? null,
      };
    });
    return {
      id: row.conversation_id,
      href: socialDmHref(row.conversation_id),
      kind: row.kind,
      label: conversationRoomLabel(
        row.title,
        others.map((person) => person.name),
      ),
      excerpt: excerpts.get(row.conversation_id) ?? null,
      time: row.last_message_at ? socialRelativeTime(row.last_message_at) : "",
      unreadCount: row.unread_count,
      people: others,
    };
  }));

  const notice: ReactNode =
    inbox.truncated && profile ? (
      <InlineNotice tone="info" className="mb-[var(--space-3)]" data-social-dms-truncated="">
        {SOCIAL.dms.truncatedInbox}
      </InlineNotice>
    ) : null;

  return (
    <SocialDmInboxList
      title={socialDmInboxTitle(profile?.handle)}
      composeHref={profile ? `${SOCIAL_ROUTES.dms}/new` : null}
      composeLabel={SOCIAL.dms.newMessage}
      rows={listRows}
      emptyLabel={profile ? SOCIAL.dms.empty : null}
      notice={notice}
    />
  );
}
