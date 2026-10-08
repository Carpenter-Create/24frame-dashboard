"use client";

import { HouseLink } from "@/components/chrome/house-link";
import { SocialAvatar } from "@/components/social/social-avatar";
import { useSocialCreateMediaPick } from "@/components/social/social-create-media";
import { SocialIcon } from "@/components/social/social-icon";
import { useSocialCompose } from "@/components/social/social-compose-context";
import {
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS,
  SOCIAL_COMPOSER_AVATAR_CLASS,
  SOCIAL_COMPOSER_AVATAR_NARROW_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
} from "@/lib/social-chrome";
import { socialCreateTile } from "@/lib/social-create-sheet";
import { rememberSocialGoLiveOpener } from "@/lib/social-go-live-nav";
import { SOCIAL, socialComposerPrompt } from "@/lib/social";

// Feed composer (H register §5.3; founder 2026-10-05, "I like the
// designs. Let's use them."): one 44 row on phone and desktop — the 44
// avatar, the "Share something" pill, then round 44 Media and Record —
// in its own card, the pill and rounds on the in-card fill (cards lock,
// docs/design-locks/social-feed-cards-lock-v1.md). Supersedes the G
// composer bar (52, radius 16).
// Prompt and avatar open the one write composer window, which the shell
// owns (useSocialCompose; the side menu's Create opens the same one). No
// Create sheet hop, no second window here.
// docs/design-locks/social-feed-register-lock-v1.md
// docs/design-locks/share-something-write-compose-sheet-lock-v1.md
// The two rounds are the + fan's own Media and Record tiles (Adam
// 2026-10-08, "Match the fan": the row read as behind the fan). Same tile
// list, glyphs, names, and acts: Media opens the same media pick; Record
// opens the 24Frame camera (never the phone's own camera app), remembering
// where it was opened. Icon only. No second row, no Feeling strip.
// docs/design-locks/social-create-fan-lock-v1.md
const MEDIA_TILE = socialCreateTile("media")!;
const RECORD_TILE = socialCreateTile("live")!;

function MediaAffordance() {
  const { openPicker, input } = useSocialCreateMediaPick({ label: MEDIA_TILE.label });
  return (
    <>
      <button
        type="button"
        data-social-composer-affordance={MEDIA_TILE.id}
        aria-label={MEDIA_TILE.label}
        className={SOCIAL_COMPOSER_AFFORDANCE_CLASS}
        onClick={openPicker}
      >
        <SocialIcon
          name={MEDIA_TILE.icon}
          size={SOCIAL_COMPOSER_AFFORDANCE_GLYPH}
          className={SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS}
        />
      </button>
      {input}
    </>
  );
}

function RecordAffordance() {
  return (
    <HouseLink
      href={RECORD_TILE.href}
      data-social-composer-affordance={RECORD_TILE.id}
      aria-label={RECORD_TILE.label}
      className={SOCIAL_COMPOSER_AFFORDANCE_CLASS}
      onClick={() => rememberSocialGoLiveOpener(`${window.location.pathname}${window.location.search}`)}
    >
      <SocialIcon
        name={RECORD_TILE.icon}
        size={SOCIAL_COMPOSER_AFFORDANCE_GLYPH}
        className={SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS}
      />
    </HouseLink>
  );
}

export function SocialHomeComposer({
  authorName,
  authorPhotoUrl,
}: {
  authorName: string;
  authorPhotoUrl?: string | null;
}) {
  const compose = useSocialCompose();
  return (
    <div data-social-home-composer="" className={SOCIAL_COMPOSER_CLASS}>
      <button
        type="button"
        data-social-composer-prompt-row=""
        data-social-composer-write=""
        aria-label={SOCIAL.create.title}
        aria-haspopup="dialog"
        aria-expanded={compose?.open ?? false}
        aria-controls={compose?.open ? compose.controls : undefined}
        className={SOCIAL_COMPOSER_ROW_CLASS}
        onClick={compose?.onOpen}
      >
        <SocialAvatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          size="sm"
          className={`${SOCIAL_COMPOSER_AVATAR_CLASS} ${SOCIAL_COMPOSER_AVATAR_NARROW_CLASS}`}
        />
        <span data-social-composer-prompt="" className={`${SOCIAL_COMPOSER_FIELD_CLASS} shadow-none`}>
          {socialComposerPrompt(authorName)}
        </span>
      </button>
      <div data-social-composer-affordances="" className={SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS}>
        <MediaAffordance />
        <RecordAffordance />
      </div>
    </div>
  );
}
