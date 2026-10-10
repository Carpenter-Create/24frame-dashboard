import { Suspense } from "react";

import { SocialCreateCompose } from "@/components/social/social-create-compose";
import { SocialForYouRail } from "@/components/social/social-for-you";
import { SocialForYouSkeleton } from "@/components/social/social-skeletons";
import { SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_LAYOUT_CLASS } from "@/lib/social-chrome";
import { avatarKeyFromProfileRead } from "@/lib/account-avatar";
import { signedAvatarUrl, signedAvatarUrls } from "@/lib/s3-avatars";
import { parseSocialCreateKind, SOCIAL, socialPersonLabel } from "@/lib/social";
import { parseSocialCreateMediaStep } from "@/lib/social-create-media";
import { loadFolloweeIds, loadSuggestedPeople } from "@/lib/social-feed";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const [session, sp] = await Promise.all([
    requireSocialSession(),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const initialKind = parseSocialCreateKind(sp.kind);
  const initialStep = parseSocialCreateMediaStep(sp.step);
  const { ctx, supabase } = session;
  const [profile, avatarRow] = await Promise.all([
    ensureOwnSocialProfile(supabase, ctx.user),
    supabase.from("profiles").select("avatar_key").eq("id", ctx.user.id).maybeSingle(),
  ]);
  const avatarPointer = avatarKeyFromProfileRead(avatarRow.error, avatarRow.data);
  const photoUrl = avatarPointer.sign ? await signedAvatarUrl(ctx.user.id, avatarPointer.key) : null;

  return (
    <div data-social-create="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_HOME_CENTER_CLASS}>
        <h1 className="sr-only">{SOCIAL.create.title}</h1>
        <SocialCreateCompose
          authorName={
            profile
              ? socialPersonLabel({ handle: profile.handle, displayName: profile.display_name })
              : SOCIAL.home.you
          }
          authorHandle={profile?.handle ?? null}
          authorPhotoUrl={photoUrl}
          initialKind={initialKind}
          initialStep={initialKind === "media" ? initialStep : null}
        />
      </div>
      <Suspense fallback={<SocialForYouSkeleton />}>
        <SocialCreateForYouSlot session={session} />
      </Suspense>
    </div>
  );
}

async function SocialCreateForYouSlot({ session }: { session: SocialSession }) {
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
  const faces = suggested.length > 0 ? await signedAvatarUrls(suggested.map((person) => person.id)) : new Map();
  return <SocialForYouRail people={suggested} faces={faces} />;
}
