import Link from "next/link";
import { redirect } from "next/navigation";

import { HousePageSearch } from "@/components/chrome/house-page-search";
import { SocialEmpty } from "@/components/social/social-empty";
import { SocialFollowsList } from "@/components/social/social-follows-list";
import { SocialFollowsTabs } from "@/components/social/social-follows-tabs";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { socialAvatarFaces } from "@/lib/social-edge";
import {
  displayHandle,
  parseProfileHandleParam,
  parseSocialFollowsQuery,
  parseSocialFollowsTab,
  SOCIAL,
  SOCIAL_FOLLOWS_SEARCH_PARAM,
  SOCIAL_PROFILE_TAB_PARAM,
  SOCIAL_ROUTES,
  socialMemberHref,
  socialProfileFollowsCasingRedirect,
} from "@/lib/social";
import {
  SOCIAL_PROFILE_EDIT_BACK_CLASS,
  SOCIAL_PROFILE_EDIT_HEADER_CLASS,
} from "@/lib/social-chrome";
import { loadProfileFollowList } from "@/lib/social-feed";
import { filterSocialFollowsPeople } from "@/lib/social-follow";
import { loadCachedProfileSocialCounts, loadCachedSocialProfileByHandle } from "@/lib/social-hot-reads";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { requireSocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialFollowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, { handle: raw }, sp] = await Promise.all([
    requireSocialSession(),
    params,
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const { ctx, supabase } = session;
  const handle = parseProfileHandleParam(raw);
  const tab = parseSocialFollowsTab(sp[SOCIAL_PROFILE_TAB_PARAM]);
  const query = parseSocialFollowsQuery(sp[SOCIAL_FOLLOWS_SEARCH_PARAM]);

  const member = handle ? await loadCachedSocialProfileByHandle(supabase, handle) : null;

  if (member) {
    const canonical = socialProfileFollowsCasingRedirect(handle, member.handle, tab, query);
    if (canonical) redirect(canonical);
  }

  if (!member) {
    return (
      <div data-social-follows-missing="" className="flex flex-col gap-[var(--space-4)]">
        <h1 className="sr-only">{SOCIAL.member.title}</h1>
        <SocialEmpty
          icon="warning-circle"
          eyebrow={SOCIAL.member.notFoundCode}
          title={SOCIAL.member.notFound}
          hint={SOCIAL.member.notFoundHint}
          action={{ href: SOCIAL_ROUTES.home, label: SOCIAL.member.goHome }}
          secondary={{ href: SOCIAL_ROUTES.explore, label: SOCIAL.member.goExplore }}
        >
          <p className="sr-only">{SOCIAL.member.missing}</p>
        </SocialEmpty>
      </div>
    );
  }

  const isSelf = member.id === ctx.user.id;
  const backHref = isSelf ? SOCIAL_ROUTES.profile : socialMemberHref(member.handle);
  const [page, counts] = await Promise.all([
    loadProfileFollowList(supabase, member.id, tab, ctx.user.id),
    loadCachedProfileSocialCounts(supabase, member.id),
  ]);
  const people = filterSocialFollowsPeople(page.people, query);
  const faces = people.length > 0 ? socialAvatarFaces(people.map((person) => person.id)) : new Map();
  const emptyTitle = query
    ? SOCIAL.profile.followsSearchEmpty
    : tab === "following"
      ? SOCIAL.profile.followingEmpty
      : SOCIAL.profile.followersEmpty;
  const emptyHint = query
    ? SOCIAL.profile.followsSearchEmptyHint
    : tab === "following"
      ? SOCIAL.profile.followingEmptyHint
      : SOCIAL.profile.followersEmptyHint;

  return (
    <div data-social-follows="" data-social-follows-tab={tab} className="flex min-w-0 flex-1 flex-col">
      <header data-social-follows-header="" className={SOCIAL_PROFILE_EDIT_HEADER_CLASS}>
        <Link href={backHref} className={SOCIAL_PROFILE_EDIT_BACK_CLASS} aria-label={SOCIAL.profile.back}>
          <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
        </Link>
        <h1 className="min-w-0 flex-1 break-words text-center text-[17px] font-semibold text-ink">
          {displayHandle(member.handle)}
        </h1>
        <span className="size-9 shrink-0" aria-hidden />
      </header>
      <SocialFollowsTabs
        handle={member.handle}
        active={tab}
        query={query}
        counts={{ followers: counts.followers, following: counts.following }}
      />
      <div data-social-follows-search="" className="px-4 py-3">
        <HousePageSearch placeholder={SOCIAL.profile.followsSearch} inputId="social-follows-q" />
      </div>
      {people.length === 0 ? (
        <div data-social-follows-empty="" className="px-4 pb-8">
          <SocialEmpty icon="user" title={emptyTitle} hint={emptyHint} />
        </div>
      ) : (
        <SocialFollowsList people={people} faces={faces} viewerId={ctx.user.id} />
      )}
      {page.truncated && !query ? (
        <div className="px-4 pb-8">
          <InlineNotice data-social-follows-truncated="">{SOCIAL.profile.followsTruncated}</InlineNotice>
        </div>
      ) : null}
    </div>
  );
}
