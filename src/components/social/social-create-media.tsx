"use client";

import { useRouter } from "next/navigation";
import { useRef, type MouseEvent } from "react";
import Link from "next/link";

import { SocialIcon } from "@/components/social/social-icon";
import {
  SOCIAL_CREATE_TILE_CLASS,
  SOCIAL_CREATE_TILE_ICON_CLASS,
  SOCIAL_CREATE_TILE_LABEL_CLASS,
  SOCIAL_CREATE_TILE_WELL_CLASS,
  SOCIAL_CREATE_TILES,
} from "@/lib/social-create-sheet";
import { SOCIAL_CREATE_MEDIA_ACCEPT, socialCreateMediaHref } from "@/lib/social-create-media";
import { stashSocialHomeComposerMedia } from "@/lib/social-home-composer";
import { SOCIAL_ICON_SIZE_CREATE_TILE } from "@/lib/social-icons";
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

  const input = (
    <input
      ref={inputRef}
      type="file"
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

export function SocialCreateMediaTile({
  tile,
}: {
  tile: (typeof SOCIAL_CREATE_TILES)[number];
}) {
  const { openPicker, input } = useSocialCreateMediaPick();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openPicker();
  }

  return (
    <>
      <Link
        href={tile.href}
        data-social-create-tile={tile.id}
        data-social-create-media-tile=""
        className={SOCIAL_CREATE_TILE_CLASS}
        onClick={onClick}
      >
        <span data-social-create-tile-well="" className={SOCIAL_CREATE_TILE_WELL_CLASS}>
          <SocialIcon
            name={tile.icon}
            size={SOCIAL_ICON_SIZE_CREATE_TILE}
            className={SOCIAL_CREATE_TILE_ICON_CLASS}
          />
        </span>
        <span className={SOCIAL_CREATE_TILE_LABEL_CLASS}>{tile.label}</span>
      </Link>
      {input}
    </>
  );
}
