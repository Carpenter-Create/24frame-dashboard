"use client";

import { useState } from "react";

import { SocialMediaImage } from "@/components/social/social-media-image";
import { SOCIAL_PROFILE_COVER_IMAGE_CLASS } from "@/lib/social-chrome";
import { SOCIAL_PROFILE_COVER_IMAGE_SIZES } from "@/lib/social-media-display";

// The cover photo inside the profile hero. A failed load shows the hero's
// --band fill, never a broken-image glyph, and the hero keeps its size. Same
// brokenSrc pattern as SocialAvatar. Lazy: see social-profile-banner.tsx.
export function SocialProfileCoverImage({ src }: { src: string }) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  if (brokenSrc === src) return null;
  return (
    <SocialMediaImage
      src={src}
      sizes={SOCIAL_PROFILE_COVER_IMAGE_SIZES}
      loading="lazy"
      className={SOCIAL_PROFILE_COVER_IMAGE_CLASS}
      onError={() => setBrokenSrc(src)}
    />
  );
}
