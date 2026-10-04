import { SocialProfileCoverImage } from "@/components/social/social-profile-cover-image";
import { SOCIAL_PROFILE_COVER_CLASS } from "@/lib/social-chrome";
import { socialProfileCoverPhoto } from "@/lib/social-profile-cover";

// Cover bytes load through the same-origin signer, which 302s to a presigned
// GET. next/image priority, and an eager img, make React emit
// <link rel="preload"> for that signer. Chrome follows the redirect and then
// warns that the presigned object was not used, because the img request is
// the signer rather than the object URL. Lazy still fetches an in-view cover
// from the img and does not hoist that preload.

/**
 * The cover layer of the profile hero, for owners and visitors alike
 * (docs/design-locks/social-profile-stage-lock-v1.md). No photo: no layer,
 * and the hero's --band fill shows so the name stays legible.
 */
export function SocialProfileCover({ coverUrl }: { coverUrl?: string | null }) {
  const photo = socialProfileCoverPhoto(coverUrl);
  if (!photo) return null;
  return (
    <div data-social-profile-cover="" className={SOCIAL_PROFILE_COVER_CLASS}>
      <SocialProfileCoverImage src={photo} />
    </div>
  );
}
