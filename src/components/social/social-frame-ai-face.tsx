"use client";

import Link from "next/link";

import { HouseAiMark } from "@/components/chrome/house-ai-mark";
import { cn } from "@/lib/cn";
import { socialFrameAiOpenHref } from "@/lib/social-frame-ai";
import { SOCIAL_FRAME_AI_FACE_CLASS } from "@/lib/social-chrome";

// Pinned 24Frame AI face. House sparkle on the person-avatar circle.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

export function SocialFrameAiFace({ className }: { className?: string }) {
  return (
    <span data-social-frame-ai-face="" className={cn(SOCIAL_FRAME_AI_FACE_CLASS, className)}>
      <HouseAiMark className="size-1/2 shrink-0" />
    </span>
  );
}

export function SocialFrameAiOpen({
  className,
  faceClassName,
  label,
  labelClassName,
  marker,
  onOpen,
}: {
  className: string;
  faceClassName: string;
  label: string;
  labelClassName: string;
  marker: Record<string, string>;
  onOpen: () => void;
}) {
  return (
    <Link
      href={socialFrameAiOpenHref()}
      className={className}
      data-social-frame-ai=""
      onClick={onOpen}
      {...marker}
    >
      <SocialFrameAiFace className={faceClassName} />
      <span className={labelClassName}>{label}</span>
    </Link>
  );
}
