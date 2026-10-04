import type { ReactNode } from "react";

import { SocialProfileCoverImage } from "@/components/social/social-profile-cover-image";
import { cn } from "@/lib/cn";
import {
  SOCIAL_PROFILE_COVER_CLASS,
  SOCIAL_PROFILE_COVER_EMPTY_CLASS,
} from "@/lib/social-chrome";
import { socialProfileCoverPhoto } from "@/lib/social-profile-cover";

// Cover bytes load through the same-origin signer, which 302s to a presigned
// GET. next/image priority, and an eager img, make React emit
// <link rel="preload"> for that signer. Chrome follows the redirect and then
// warns that the presigned object was not used, because the img request is
// the signer rather than the object URL. Lazy still fetches an in-view cover
// from the img and does not hoist that preload.

/** Visitor cover. No photo → no band. Owner empty wash lives on SocialProfileCoverBlock. */
export function SocialProfileBanner({ coverUrl }: { coverUrl?: string | null }) {
  const photo = socialProfileCoverPhoto(coverUrl);
  if (!photo) return null;
  return (
    <div
      data-social-profile-cover=""
      className={cn(SOCIAL_PROFILE_COVER_CLASS, "bg-surface-muted")}
    >
      <SocialProfileCoverImage src={photo} />
    </div>
  );
}

export function SocialProfileCoverBlock({
  coverUrl,
  coverEdit,
}: {
  coverUrl?: string | null;
  coverEdit?: ReactNode;
}) {
  const photo = socialProfileCoverPhoto(coverUrl);
  return (
    <div data-social-profile-cover-block="" className="relative">
      <div
        data-social-profile-cover=""
        data-social-profile-cover-empty={photo ? undefined : ""}
        className={cn(
          SOCIAL_PROFILE_COVER_CLASS,
          !photo ? SOCIAL_PROFILE_COVER_EMPTY_CLASS : "bg-surface-muted",
        )}
      >
        {photo ? <SocialProfileCoverImage src={photo} /> : null}
      </div>
      {coverEdit}
    </div>
  );
}
