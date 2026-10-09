import { SocialGoLive } from "@/components/social/social-go-live";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_GO_LIVE_PURPOSE_PARAM, parseSocialGoLivePurpose } from "@/lib/social-go-live";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

// Direct camera route. Not a child of /social/create — that segment's
// prefetched write page flashed before the camera and stayed on the stack.

export const runtime = "nodejs";

export default async function SocialGoLivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const [{ ctx, supabase }, sp] = await Promise.all([
    requireSocialSession(),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  await ensureOwnSocialProfile(supabase, ctx.user);
  // ?for=welcome: Edit profile's Live round records the welcome video.
  const purpose = parseSocialGoLivePurpose(sp[SOCIAL_GO_LIVE_PURPOSE_PARAM]);

  return (
    <div data-social-go-live-page="">
      <h1 className="sr-only">{purpose === "welcome" ? SOCIAL.profile.welcomeVideo : SOCIAL.create.liveTitle}</h1>
      <SocialGoLive purpose={purpose} />
    </div>
  );
}
