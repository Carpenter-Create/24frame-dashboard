// Create-story stage.
// docs/design-locks/create-story-photo-video-fb-layout-lock-v1.5.md
import { SocialStoryCompose } from "@/components/social/social-story-studio";
import { socialAvatarHref } from "@/lib/social-edge";
import { SOCIAL, socialPersonLabel } from "@/lib/social";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialStoryCreatePage() {
  const { ctx, supabase } = await requireSocialSession();
  const profile = await ensureOwnSocialProfile(supabase, ctx.user);
  const displayName = profile
    ? socialPersonLabel({ handle: profile.handle, displayName: profile.display_name })
    : SOCIAL.stories.you;

  return (
    <div data-social-story-new="" className="flex min-h-full flex-1 flex-col">
      <h1 className="sr-only">{SOCIAL.stories.title}</h1>
      <SocialStoryCompose displayName={displayName} photoUrl={socialAvatarHref(ctx.user.id)} />
    </div>
  );
}
