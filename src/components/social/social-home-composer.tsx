"use client";

import { useCallback, useId, useState } from "react";

import { SocialAvatar } from "@/components/social/social-avatar";
import { useSocialCreateMediaPick } from "@/components/social/social-create-media";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialWriteComposeSheet } from "@/components/social/social-write-compose-sheet";
import {
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS,
  SOCIAL_COMPOSER_AVATAR_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_CREATE_CAMERA_ACCEPT } from "@/lib/social-create-media";
import { SOCIAL, socialComposerPrompt } from "@/lib/social";

// Feed composer bar (G · D, Adam pick 2026-10-04): one muted bar, radius
// 16, 52 tall, on phone and desktop. Supersedes the FB-row v1.6 band.
// Photo and Camera stay icon-only: 44 hits on phone, 36 on desktop.
// Prompt and avatar open write compose in the house sheet. No Create sheet hop.
// docs/design-locks/share-something-write-compose-sheet-lock-v1.md
// Photo reuses the Create media library pick. Camera reuses that pick
// with capture=environment. Icon only — no Photo/Camera labels.
// No second row, no Live / Feeling strip.

function ComposerAffordance({
  affordance,
  icon,
  label,
  capture,
}: {
  affordance: "photo" | "camera";
  icon: "image" | "camera";
  label: string;
  capture?: "environment";
}) {
  const { openPicker, input } = useSocialCreateMediaPick(
    capture
      ? { capture, accept: SOCIAL_CREATE_CAMERA_ACCEPT, multiple: false, label }
      : { label },
  );
  return (
    <>
      <button
        type="button"
        data-social-composer-affordance={affordance}
        aria-label={label}
        className={SOCIAL_COMPOSER_AFFORDANCE_CLASS}
        onClick={openPicker}
      >
        <SocialIcon
          name={icon}
          size={SOCIAL_COMPOSER_AFFORDANCE_GLYPH}
          className={SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS}
        />
      </button>
      {input}
    </>
  );
}

export function SocialHomeComposer({
  authorName,
  authorHandle = null,
  authorPhotoUrl,
}: {
  authorName: string;
  authorHandle?: string | null;
  authorPhotoUrl?: string | null;
}) {
  const titleId = useId();
  const [writeOpen, setWriteOpen] = useState(false);
  const closeWrite = useCallback(() => setWriteOpen(false), []);
  return (
    <div data-social-home-composer="" className={SOCIAL_COMPOSER_CLASS}>
      <button
        type="button"
        data-social-composer-prompt-row=""
        data-social-composer-write=""
        aria-label={SOCIAL.create.title}
        aria-haspopup="dialog"
        aria-expanded={writeOpen}
        aria-controls={writeOpen ? titleId : undefined}
        className={SOCIAL_COMPOSER_ROW_CLASS}
        onClick={() => setWriteOpen(true)}
      >
        <SocialAvatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          size="sm"
          className={SOCIAL_COMPOSER_AVATAR_CLASS}
        />
        <span data-social-composer-prompt="" className={`${SOCIAL_COMPOSER_FIELD_CLASS} shadow-none`}>
          {socialComposerPrompt(authorName)}
        </span>
      </button>
      <div data-social-composer-affordances="" className={SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS}>
        <ComposerAffordance affordance="photo" icon="image" label={SOCIAL.home.composerPhoto} />
        <ComposerAffordance
          affordance="camera"
          icon="camera"
          label={SOCIAL.home.composerCamera}
          capture="environment"
        />
      </div>
      <SocialWriteComposeSheet
        open={writeOpen}
        onClose={closeWrite}
        titleId={titleId}
        authorName={authorName}
        authorHandle={authorHandle}
        authorPhotoUrl={authorPhotoUrl}
      />
    </div>
  );
}
