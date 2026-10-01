import { SocialGoLive } from "@/components/social/social-go-live";
import { SOCIAL } from "@/lib/social";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

// Direct camera route. Not a child of /social/create — that segment's
// prefetched write page flashed before the camera and stayed on the stack.

export const runtime = "nodejs";

export default async function SocialGoLivePage() {
  const { ctx, supabase } = await requireSocialSession();
  await ensureOwnSocialProfile(supabase, ctx.user);

  return (
    <div data-social-go-live-page="">
      <h1 className="sr-only">{SOCIAL.create.liveTitle}</h1>
      <SocialGoLive />
    </div>
  );
}
