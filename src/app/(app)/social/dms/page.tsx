import { Suspense } from "react";
import Link from "next/link";

import { HouseEmpty, TextAction } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { signSocialForYouCourseCovers } from "@/components/social/social-for-you-covers";
import { SocialDesktopForYouSlot } from "@/components/social/social-for-you-slot";
import { SocialDmsRowsSkeleton, SocialForYouSkeleton } from "@/components/social/social-skeletons";
import { SocialConversationFaces } from "@/components/social/social-conversation-faces";
import { SOCIAL_DM_INBOX_ROW_CLASS, SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_LAYOUT_CLASS } from "@/lib/social-chrome";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import { conversationRoomLabel, dmInboxDisplayPeerIds, SOCIAL, SOCIAL_ROUTES, socialDmHref, socialPersonLabel } from "@/lib/social";
import { loadDmInbox, loadDmStoryInboxLines } from "@/lib/social-dms";
import { loadProfilesByIds } from "@/lib/social-feed";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export default async function SocialDmsPage() {
  const session = await requireSocialSession();
  return (
    <div data-social-dms="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_HOME_CENTER_CLASS}>
        <PageHeader title={SOCIAL.dms.title} subtitle={SOCIAL.dms.subtitle} />
        <Suspense fallback={<SocialDmsRowsSkeleton />}>
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

  return (
    <>
      {inbox.truncated && profile ? (
        <InlineNotice tone="info" className="mb-[var(--space-4)]" data-social-dms-truncated="">
          {SOCIAL.dms.truncatedInbox}
        </InlineNotice>
      ) : null}
      {profile ? (
        <TextAction href={`${SOCIAL_ROUTES.dms}/new`} data-social-dms-start="">
          {SOCIAL.dms.startCta}
        </TextAction>
      ) : null}
      {profile && rows.length === 0 ? (
        <div data-social-dms-empty="" className="flex flex-col gap-3">
          <HouseEmpty>{SOCIAL.dms.empty}</HouseEmpty>
        </div>
      ) : null}
      <ul className="flex flex-col">
        {rows.map((row) => {
          const others = dmInboxDisplayPeerIds(row, viewerId)
            .map((id) => {
              const peer = peers.get(id);
              return {
                id,
                name: socialPersonLabel({
                  handle: peer?.handle ?? "",
                  displayName: peer?.display_name,
                }),
                photoUrl: faces.get(id) ?? null,
              };
            });
          const label = conversationRoomLabel(
            row.title,
            others.map((person) => person.name),
          );
          return (
            <li key={row.conversation_id} className={SOCIAL_DM_INBOX_ROW_CLASS}>
              <Link
                href={socialDmHref(row.conversation_id)}
                className="flex items-center gap-[var(--space-3)]"
                data-social-dm-kind={row.kind}
              >
                <SocialConversationFaces people={others} />
                <div className="min-w-0">
                  <p className="t-body font-medium text-ink">{label}</p>
                  {excerpts.get(row.conversation_id) ? (
                    <p data-social-dm-excerpt="" className="break-words t-body-sm text-ink-3">
                      {excerpts.get(row.conversation_id)}
                    </p>
                  ) : null}
                  {row.unread_count > 0 ? (
                    <p className="t-body-sm text-ink-3">{row.unread_count} unread</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
