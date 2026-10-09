import { SocialProfileEditForm } from "@/components/social/social-profile-edit";
import { SocialProfileEditDesktopHop } from "@/components/social/social-profile-edit-entry";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { SOCIAL_PROFILE_EDIT_FACE_PARAM, SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_WELCOME_VIDEO_PRESENT } from "@/lib/social-query";
import { ensureOwnSocialProfileResult } from "@/lib/social-profile";
import { parseSocialProfileEditFace } from "@/lib/social-profile-edit";
import { requireSocialSession } from "@/lib/social-session";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function SocialProfileEditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const [{ ctx, supabase }, sp] = await Promise.all([
    requireSocialSession(),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const [{ profile }, photoUrl] = await Promise.all([
    ensureOwnSocialProfileResult(supabase, ctx.user),
    signedAvatarUrl(ctx.user.id),
  ]);
  if (!profile) redirect(SOCIAL_ROUTES.profile);
  const welcomeVideoUrl = profile.welcome_video_key ? SOCIAL_WELCOME_VIDEO_PRESENT : null;

  const initialFace = parseSocialProfileEditFace(sp[SOCIAL_PROFILE_EDIT_FACE_PARAM]);
  return (
    <>
      <SocialProfileEditDesktopHop face={initialFace} />
      <SocialProfileEditForm
      profileId={profile.id}
      handle={profile.handle}
      displayName={profile.display_name}
      bio={profile.bio ?? ""}
      photoUrl={photoUrl}
      welcomeVideoUrl={welcomeVideoUrl}
      crafts={profile.crafts ?? []}
      topics={profile.topics ?? []}
      imdbUrl={profile.imdb_url ?? ""}
      websiteUrl={profile.website_url ?? ""}
      initialFace={initialFace}
      />
    </>
  );
}
