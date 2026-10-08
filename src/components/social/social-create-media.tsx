"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { SOCIAL_CREATE_MEDIA_ACCEPT, socialCreateMediaHref } from "@/lib/social-create-media";
import { stashSocialHomeComposerMedia } from "@/lib/social-home-composer";
import { SOCIAL } from "@/lib/social";

export function useSocialCreateMediaPick(options?: {
  accept?: string;
  capture?: "environment" | "user";
  multiple?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = options?.accept ?? SOCIAL_CREATE_MEDIA_ACCEPT;
  const multiple = options?.multiple ?? true;
  const label = options?.label ?? SOCIAL.create.media;

  function openPicker() {
    inputRef.current?.click();
  }

  function onChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    stashSocialHomeComposerMedia(files);
    router.push(socialCreateMediaHref());
  }

  // The visible button or tile opens this through openPicker(), so the
  // input is no tab stop and is hidden from assistive tech: no 1px focus
  // ring, no second "Photo" / "Camera" announcement.
  const input = (
    <input
      ref={inputRef}
      type="file"
      tabIndex={-1}
      aria-hidden="true"
      accept={accept}
      multiple={multiple}
      capture={options?.capture}
      className="pointer-events-none sr-only"
      data-social-create-media-input=""
      data-social-create-media-capture={options?.capture}
      aria-label={label}
      onChange={(event) => onChange(event.target.files)}
    />
  );

  return { openPicker, input };
}
