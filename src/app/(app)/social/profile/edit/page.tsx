import { SocialProfileEditForm } from "@/components/social/social-profile-edit";
import { SocialProfileEditDesktopHop } from "@/components/social/social-profile-edit-entry";
import { avatarKeyFromProfileRead } from "@/lib/account-avatar";
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
  const [{ profile }, avatarRow] = await Promise.all([
    ensureOwnSocialProfileResult(supabase, ctx.user),
    supabase.from("profiles").select("avatar_key").eq("id", ctx.user.id).maybeSingle(),
  ]);
  if (!profile) redirect(SOCIAL_ROUTES.profile);
  const avatarPointer = avatarKeyFromProfileRead(avatarRow.error, avatarRow.data);
  const photoUrl = avatarPointer.sign ? await signedAvatarUrl(ctx.user.id, avatarPointer.key) : null;
  const welcomeVideoUrl =
    profile.welcome_video_key || profile.welcome_mux_playback_id ? SOCIAL_WELCOME_VIDEO_PRESENT : null;

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
