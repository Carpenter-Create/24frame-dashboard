import { Suspense } from "react";

import { HouseEmpty } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { SocialSuggestedPeople } from "@/components/social/social-for-you";
import { SocialExploreResultsSkeleton } from "@/components/social/social-skeletons";
import {
  SOCIAL,
  SOCIAL_SEARCH_INTENT_PARAM,
  SOCIAL_SEARCH_PEOPLE_INTENT,
  parseSocialSearchIntent,
  SOCIAL_ROUTES,
} from "@/lib/social";
import { socialAvatarFaces } from "@/lib/social-edge";
import { loadFolloweeIds, loadPeopleSearch, loadSuggestedPeople } from "@/lib/social-feed";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([requireSocialSession(), searchParams]);
  const raw = sp.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const intent = parseSocialSearchIntent(sp[SOCIAL_SEARCH_INTENT_PARAM]);

  return (
    <div data-social-search="" data-social-search-intent={intent}>
      <PageHeader title={SOCIAL.search.title} subtitle={SOCIAL.search.subtitle} />
      <form data-social-search-people="" action={SOCIAL_ROUTES.search} method="get" className="pb-[var(--space-6)]">
        <input type="hidden" name={SOCIAL_SEARCH_INTENT_PARAM} value={SOCIAL_SEARCH_PEOPLE_INTENT} />
        <label className="sr-only" htmlFor="social-search-q">
          {SOCIAL.search.people}
        </label>
        <Input
          id="social-search-q"
          name="q"
          defaultValue={q}
          placeholder={SOCIAL.search.searchPlaceholder}
        />
      </form>
      {q ? (
        <Suspense fallback={<SocialExploreResultsSkeleton />}>
          <SocialSearchHits session={session} q={q} />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <SocialSearchSuggested session={session} />
        </Suspense>
      )}
    </div>
  );
}

async function SocialSearchSuggested({ session }: { session: SocialSession }) {
  const { ctx, supabase } = session;
  const [profile, followees] = await Promise.all([
    ensureOwnSocialProfile(supabase, ctx.user),
    loadFolloweeIds(supabase, ctx.user.id),
  ]);
  const suggested = await loadSuggestedPeople(
    supabase,
    [ctx.user.id, ...followees.ids],
    { topics: profile?.topics ?? [], crafts: profile?.crafts ?? [] },
  );
  const faces = suggested.length > 0 ? socialAvatarFaces(suggested.map((person) => person.id)) : new Map();

  if (suggested.length === 0) {
    return (
      <div data-social-search-suggested="">
        <HouseEmpty>{SOCIAL.search.empty}</HouseEmpty>
      </div>
    );
  }

  return (
    <div data-social-search-suggested="" className="flex flex-col gap-3">
      <SocialSuggestedPeople people={suggested} faces={faces} />
    </div>
  );
}

async function SocialSearchHits({ session, q }: { session: SocialSession; q: string }) {
  const profile = await ensureOwnSocialProfile(session.supabase, session.ctx.user);
  const results = await loadPeopleSearch(session.supabase, q, {
    topics: profile?.topics ?? [],
    crafts: profile?.crafts ?? [],
  });
  const faces = results.people.length > 0
    ? socialAvatarFaces(results.people.map((person) => person.id))
    : new Map();

  if (results.people.length === 0) {
    return <HouseEmpty>{SOCIAL.search.noResults}</HouseEmpty>;
  }

  return (
    <div data-social-search-results="">
      {results.truncated ? (
        <InlineNotice tone="info" className="mb-[var(--space-4)]" data-social-search-truncated="">
          {SOCIAL.search.truncated}
        </InlineNotice>
      ) : null}
      <SocialSuggestedPeople people={results.people} faces={faces} title={SOCIAL.search.people} />
    </div>
  );
}
