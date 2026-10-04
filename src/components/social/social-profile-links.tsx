"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FacebookLogo,
  FilmSlate,
  GlobeSimple,
  InstagramLogo,
  LinkedinLogo,
  Play,
  ThreadsLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  type Icon,
} from "@phosphor-icons/react";

import { AppSheetHead, AppSheetSurface, Close44 } from "@/components/chrome/house";
import { HouseDialogFrame, HouseOverlayHead, HouseScrim, useHouseDesktop } from "@/components/chrome/house-overlay";
import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_PROFILE_LINK_CLASS,
  SOCIAL_PROFILE_LINK_TEXT_CLASS,
  SOCIAL_PROFILE_LINKS_CLASS,
  SOCIAL_PROFILE_LINKS_SHEET_CLASS,
  SOCIAL_PROFILE_LINKS_SHEET_LINK_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_PROFILE_LINK, SOCIAL_ICON_SIZE_PROFILE_WEBSITE } from "@/lib/social-icons";
import {
  socialProfileLinkAccessibleName,
  socialProfileLinkFaceText,
  socialProfileLinkGlyph,
  type SocialProfileLink,
  type SocialProfileLinkGlyphName,
} from "@/lib/social-profile-links";

const GLYPH: Record<SocialProfileLinkGlyphName, Icon> = {
  "instagram-logo": InstagramLogo,
  "youtube-logo": YoutubeLogo,
  "facebook-logo": FacebookLogo,
  "x-logo": XLogo,
  "linkedin-logo": LinkedinLogo,
  "tiktok-logo": TiktokLogo,
  play: Play,
  "film-slate": FilmSlate,
  "threads-logo": ThreadsLogo,
  globe: GlobeSimple,
};

function SocialProfileLinkGlyph({
  platform,
  size = SOCIAL_ICON_SIZE_PROFILE_LINK,
}: {
  platform: SocialProfileLink["platform"];
  size?: number;
}) {
  const name = socialProfileLinkGlyph(platform);
  const Glyph = GLYPH[name];
  return (
    <Glyph
      aria-hidden="true"
      data-social-profile-link-glyph={name}
      size={size}
      weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
      className="shrink-0"
    />
  );
}

// Stage lock: a website reads as its host beside a small globe; every
// other link is a quiet icon-only hit named by its platform.
function SocialProfileFaceLink({ link }: { link: SocialProfileLink }) {
  const text = socialProfileLinkFaceText(link);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text ? undefined : socialProfileLinkAccessibleName(link.url, link.platform)}
      data-social-profile-link={link.platform}
      data-social-profile-imdb={link.platform === "imdb" ? "" : undefined}
      className={text ? SOCIAL_PROFILE_LINK_TEXT_CLASS : SOCIAL_PROFILE_LINK_CLASS}
    >
      <SocialProfileLinkGlyph
        platform={link.platform}
        size={text ? SOCIAL_ICON_SIZE_PROFILE_WEBSITE : SOCIAL_ICON_SIZE_PROFILE_LINK}
      />
      {text ? <span className="min-w-0 break-words">{text}</span> : null}
    </a>
  );
}

function SocialProfileSheetLink({ link }: { link: SocialProfileLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      data-social-profile-link={link.platform}
      data-social-profile-imdb={link.platform === "imdb" ? "" : undefined}
      data-social-profile-links-sheet-link=""
      className={SOCIAL_PROFILE_LINKS_SHEET_LINK_CLASS}
    >
      {link.label}
    </a>
  );
}

export function SocialProfileLinksSheet({
  links,
  open,
  onClose,
  titleId,
}: {
  links: readonly SocialProfileLink[];
  open: boolean;
  onClose: () => void;
  titleId: string;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const desktop = useHouseDesktop();
  if (!open) return null;

  const list = (
        <div
          data-social-profile-links-sheet-list=""
          className={SOCIAL_PROFILE_LINKS_SHEET_CLASS}
        >
          {links.map((link) => (
            <SocialProfileSheetLink key={`${link.platform}:${link.url}`} link={link} />
          ))}
        </div>
  );

  const sheet = desktop ? (
    <HouseDialogFrame
      size="form"
      titleId={titleId}
      label={SOCIAL.profile.links}
      onClose={onClose}
      closeLabel={SOCIAL.profile.shareClose}
    >
      <div data-social-profile-links-sheet="">
        <HouseOverlayHead
          title={SOCIAL.profile.links}
          titleId={titleId}
          closeLabel={SOCIAL.profile.shareClose}
          onClose={onClose}
        />
        {list}
      </div>
    </HouseDialogFrame>
  ) : (
    <div data-social-profile-links-sheet="" data-house-overlay-host="app-sheet" className={APP_SHEET_HOST_CLASS}>
      <HouseScrim label={SOCIAL.profile.shareClose} onClose={onClose} />
      <AppSheetSurface
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <AppSheetHead>
          <h2 id={titleId} className="min-w-0 flex-1 t-heading text-ink">
            {SOCIAL.profile.links}
          </h2>
          <Close44 label={SOCIAL.profile.shareClose} onClick={onClose} />
        </AppSheetHead>
        {list}
      </AppSheetSurface>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}

export function SocialProfileLinkRow({ links }: { links: readonly SocialProfileLink[] }) {
  if (links.length === 0) return null;

  return (
    <div data-social-profile-links="" className={SOCIAL_PROFILE_LINKS_CLASS}>
      {links.map((link) => (
        <SocialProfileFaceLink key={`${link.platform}:${link.url}`} link={link} />
      ))}
    </div>
  );
}
