import { SocialProfileBioEditor } from "@/components/social/social-profile-bio";
import { SocialProfileEditDesktopHop } from "@/components/social/social-profile-edit-entry";
import { SOCIAL_ROUTES } from "@/lib/social";
import { ensureOwnSocialProfileResult } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";
import { redirect } from "next/navigation";

export default async function SocialProfileBioPage() {
  const { ctx, supabase } = await requireSocialSession();
  const { profile } = await ensureOwnSocialProfileResult(supabase, ctx.user);
  if (!profile) redirect(SOCIAL_ROUTES.profile);

  return (
    <>
      <SocialProfileEditDesktopHop face="bio" />
      <SocialProfileBioEditor profileId={profile.id} bio={profile.bio ?? ""} />
    </>
  );
}
