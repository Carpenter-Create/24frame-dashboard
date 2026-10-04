"use client";

import { useState } from "react";

import { SocialShareSheet } from "@/components/social/social-share-sheet";
import { SOCIAL, socialProfilePublicUrl } from "@/lib/social";
import { SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS } from "@/lib/social-chrome";

// Profile action row: "Share profile" as the hairline secondary pill
// (docs/design-locks/social-profile-stage-lock-v1.md). Opens the share sheet.
export function SocialShareButton({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const url = socialProfilePublicUrl(handle);

  return (
    <>
      <button
        type="button"
        data-social-share=""
        data-social-share-url={url}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS}
        onClick={() => setOpen(true)}
      >
        {SOCIAL.profile.shareProfile}
      </button>
      <SocialShareSheet handle={handle} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
