"use client";

import { useState } from "react";

import { SocialMediaImage } from "@/components/social/social-media-image";
import { cn } from "@/lib/cn";
import { IDENTITY_AVATAR_CLASS } from "@/lib/house-sheet";
import { socialAvatarImageSizes } from "@/lib/social-media-display";
import {
  SOCIAL_AVATAR_LG_CLASS,
  SOCIAL_AVATAR_POST_CLASS,
  SOCIAL_AVATAR_PROFILE_CLASS,
  SOCIAL_AVATAR_SM_CLASS,
} from "@/lib/social-chrome";
import { socialInitials } from "@/lib/social";

export function SocialAvatar({
  name,
  photoUrl,
  ring = null,
  size = "md",
  className,
  emptyClassName,
  loading,
}: {
  name: string;
  photoUrl?: string | null;
  ring?: "unseen" | "live" | null;
  /** "post": the 40 credit circle (H · Posts), no grey behind a photo. */
  size?: "sm" | "md" | "lg" | "profile" | "post";
  className?: string;
  /** Classes for the no-photo face only (the initials' fill). */
  emptyClassName?: string;
  /** Eager inside a horizontal scroller (iOS Safari drops lazy loads there). */
  loading?: "eager" | "lazy";
}) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const face = photoUrl && brokenSrc !== photoUrl ? photoUrl : null;
  const box =
    size === "lg"
      ? SOCIAL_AVATAR_LG_CLASS
      : size === "profile"
        ? SOCIAL_AVATAR_PROFILE_CLASS
        : size === "sm"
          ? SOCIAL_AVATAR_SM_CLASS
          : size === "post"
            ? SOCIAL_AVATAR_POST_CLASS
            : IDENTITY_AVATAR_CLASS;
  return (
    <div
      data-social-avatar=""
      data-social-avatar-ring={ring ?? undefined}
      className={cn(
        box,
        face ? "relative overflow-hidden" : null,
        ring ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--bg)]" : null,
        face ? null : emptyClassName,
        className,
      )}
    >
      {face ? (
        <SocialMediaImage
          src={face}
          sizes={socialAvatarImageSizes(size)}
          priority={size === "profile"}
          loading={loading}
          onError={() => setBrokenSrc(face)}
        />
      ) : (
        socialInitials(name)
      )}
    </div>
  );
}
