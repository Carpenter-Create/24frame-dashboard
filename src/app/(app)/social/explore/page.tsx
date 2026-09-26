import { Suspense } from "react";
import Link from "next/link";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialExploreForYouStream } from "@/components/social/social-explore-for-you";
import { SocialExploreForYouSkeleton } from "@/components/social/social-skeletons";
import { Input } from "@/components/ui/input";
import { SOCIAL, SOCIAL_ROUTES, displayHandle } from "@/lib/social";
import {
  SOCIAL_EXPLORE_FOR_YOU_DISCOVER_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SEARCH_CLASS,
  SOCIAL_STORY_GLASS_FIELD_CLASS,
} from "@/lib/social-chrome";
import { socialAvatarHref, socialMediaProxiesByPostId } from "@/lib/social-edge";
import {
  loadExploreByAuthor,
  loadExploreHashtag,
  loadExploreMedia,
  loadExploreProfileByHandle,
  loadExploreSearch,
  loadLikedPostIds,
  loadPeopleSearch,
  loadProfilesByIds,
  type SocialExplorePage,
  type SocialSuggestedPerson,
} from "@/lib/social-feed";
import {
  exploreForYouFilterLabel,
  exploreForYouHref,
  exploreForYouMuxVideo,
  exploreForYouStreamMode,
  exploreForYouVideoItems,
  exploreHashtagToken,
  parseExploreForYouSearch,
  type ExploreForYouMode,
  type ExploreForYouQuery,
} from "@/lib/social-explore-for-you";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([requireSocialSession(), searchParams]);
  const query = parseExploreForYouSearch(sp);

  return (
    <div
      data-social-explore=""
      data-social-explore-for-you=""
      aria-label={SOCIAL.explore.title}
      className={SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS}
    >
      <form
        data-social-explore-search=""
        action={SOCIAL_ROUTES.explore}
        method="get"
        className={SOCIAL_EXPLORE_FOR_YOU_SEARCH_CLASS}
      >
        <label className="sr-only" htmlFor="social-explore-q">
          {SOCIAL.explore.search}
        </label>
        <div className={SOCIAL_STORY_GLASS_FIELD_CLASS}>
          <Input
            id="social-explore-q"
            name="q"
            variant="bare"
            defaultValue={query.q}
            placeholder={SOCIAL.explore.searchPlaceholder}
            className="w-full text-band-ink placeholder:text-band-ink/70"
          />
        </div>
        {/* Quiet For You opens the chooser. A resolved person, tag, or q stays on that stream. */}
        {query.person || query.tag || query.q ? null : (
          <input type="hidden" name="discover" value="1" />
        )}
      </form>
      <Suspense fallback={<SocialExploreForYouSkeleton />}>
        <SocialExploreForYouBody session={session} query={query} />
      </Suspense>
    </div>
  );
}

async function SocialExploreForYouBody({
  session,
  query,
}: {
  session: SocialSession;
  query: ExploreForYouQuery;
}) {
  const profile = await ensureOwnSocialProfile(session.supabase, session.ctx.user);
  const viewer = { topics: profile?.topics ?? [], crafts: profile?.crafts ?? [] };
  const mode = exploreForYouStreamMode(query);
  const discovering = mode === "discover";
  const loaded = discovering
    ? { page: { hits: [], truncated: false }, author: null }
    : await loadExploreForYouPage(session, query, mode, viewer);
  const mediaByPost = socialMediaProxiesByPostId(
    loaded.page.hits.map((hit) => ({ id: hit.id, author_id: hit.authorId, media: hit.media })),
  );
  const videoHits = loaded.page.hits.filter((hit) => exploreForYouMuxVideo(mediaByPost.get(hit.id) ?? []));
  const authorIds = [...new Set(videoHits.map((hit) => hit.authorId))];
  const [authors, liked, peoplePage] = await Promise.all([
    loadProfilesByIds(session.supabase, authorIds),
    loadLikedPostIds(
      session.supabase,
      session.ctx.user.id,
      videoHits.map((hit) => hit.id),
    ),
    discovering && query.q
      ? loadPeopleSearch(session.supabase, query.q, viewer)
      : Promise.resolve({ people: [] as SocialSuggestedPerson[], truncated: false }),
  ]);
  const items = exploreForYouVideoItems({
    hits: videoHits,
    mediaByPost,
    authors,
    liked,
    canLike: !!profile,
  });
  const label = exploreForYouFilterLabel({
    mode,
    q: query.q,
    tag: query.tag,
    personHandle: loaded.author?.handle ?? query.person,
    personName: loaded.author?.display_name ?? null,
  });
  const emptyLabel = items.length === 0 ? (mode === "for-you" ? SOCIAL.explore.empty : SOCIAL.explore.noResults) : null;
  const hashtag = exploreHashtagToken(query.q);

  return (
    <>
      {discovering ? null : <SocialExploreForYouStream items={items} emptyLabel={emptyLabel} />}
      <div className={SOCIAL_EXPLORE_FOR_YOU_DISCOVER_CLASS}>
        {loaded.page.truncated ? (
          <p data-social-explore-truncated="" className="t-body-sm text-band-ink break-words">
            {SOCIAL.explore.truncated}
          </p>
        ) : null}
        {label ? (
          <div data-social-explore-filter="" className="flex flex-col gap-[var(--space-2)]">
            <span className="t-body text-band-ink break-words">{label}</span>
            <Link href={SOCIAL_ROUTES.explore} data-social-explore-clear="" className="self-start t-body text-band-ink">
              {SOCIAL.explore.clear}
            </Link>
          </div>
        ) : null}
        {discovering ? (
          <div data-social-explore-discover="" className="flex flex-col gap-[var(--space-2)]">
            {peoplePage.people.length > 0 ? (
              <div data-social-explore-people="" className="flex flex-col">
                <p className="t-body-sm text-band-ink">{SOCIAL.explore.people}</p>
                {peoplePage.people.map((person) => (
                  <Link
                    key={person.id}
                    href={exploreForYouHref({ person: person.handle })}
                    data-social-explore-person={person.handle}
                    className="flex items-start gap-[var(--space-2)] py-[var(--space-2)] text-band-ink"
                  >
                    <SocialAvatar
                      name={person.display_name || person.handle}
                      photoUrl={socialAvatarHref(person.id)}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-col break-words">
                      <span className="t-body font-medium">{displayHandle(person.handle)}</span>
                      {person.display_name ? (
                        <span className="t-body-sm">{person.display_name}</span>
                      ) : null}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              href={exploreForYouHref({ q: query.q })}
              data-social-explore-keyword=""
              className="flex flex-col break-words text-band-ink"
            >
              <span className="t-body-sm">{SOCIAL.explore.keywords}</span>
              <span className="t-body">{query.q}</span>
            </Link>
            {hashtag ? (
              <Link
                href={exploreForYouHref({ tag: hashtag })}
                data-social-explore-hashtag=""
                className="flex flex-col break-words text-band-ink"
              >
                <span className="t-body-sm">{SOCIAL.explore.hashtags}</span>
                <span className="t-body">{`#${hashtag}`}</span>
              </Link>
            ) : null}
            <Link href={SOCIAL_ROUTES.explore} data-social-explore-clear="" className="self-start t-body text-band-ink">
              {SOCIAL.explore.clear}
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

async function loadExploreForYouPage(
  session: SocialSession,
  query: ExploreForYouQuery,
  mode: ExploreForYouMode,
  viewer: { topics: unknown; crafts: unknown },
): Promise<{
  page: SocialExplorePage;
  author: { id: string; handle: string; display_name: string } | null;
}> {
  if (mode === "discover") return { page: { hits: [], truncated: false }, author: null };
  if (mode === "person") {
    const author = await loadExploreProfileByHandle(session.supabase, query.person);
    if (!author) return { page: { hits: [], truncated: false }, author: null };
    return { page: await loadExploreByAuthor(session.supabase, author.id, viewer), author };
  }
  if (mode === "hashtag") {
    return { page: await loadExploreHashtag(session.supabase, query.tag, viewer), author: null };
  }
  if (mode === "keyword") {
    return { page: await loadExploreSearch(session.supabase, query.q, viewer), author: null };
  }
  return { page: await loadExploreMedia(session.supabase, viewer), author: null };
}
