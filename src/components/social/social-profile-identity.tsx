import type { ReactNode } from "react";

import {
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_SLOT_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_HEADLINE_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_INTRO_CLASS,
  SOCIAL_PROFILE_MUTUALS_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_PROFILE_ROLES_CLASS,
  SOCIAL_PROFILE_STAGE_CLASS,
  SOCIAL_PROFILE_TAGLINE_CLASS,
} from "@/lib/social-chrome";
import { socialPersonIdentity } from "@/lib/social";
import { socialProfileCoverPhoto } from "@/lib/social-profile-cover";
import { socialProfileIntro } from "@/lib/social-profile-intro";
import { socialProfilePublicLinks } from "@/lib/social-profile-links";
import {
  SOCIAL_MUTUALS_FACE_CAP,
  socialFollowedByLine,
  type SocialProfileMutuals,
} from "@/lib/social-profile-mutuals";
import { socialProfileRolesRailItems } from "@/lib/social-profile-roles";

import { SocialAvatar } from "./social-avatar";
import { SocialProfileCover } from "./social-profile-banner";
import { SocialProfileLinkRow } from "./social-profile-links";
import { SocialProfileStats } from "./social-profile-stats";

// Profile Stage — docs/design-locks/social-profile-stage-lock-v1.md. One
// identity for the owner and visitor views, the save-hop and the loading
// overlay: the hero card (cover, scrim, avatar, name, handle; owner Edit
// cover), the owner trail, then the face — intro, actions, stats, mutuals,
// roles, quiet links. Geometry lives in social-chrome.
export function SocialProfileIdentity({
  name,
  handle,
  photoUrl,
  coverUrl,
  coverEdit,
  bio,
  bioHint,
  roles,
  websiteUrl,
  imdbUrl,
  ring = null,
  photoAction,
  profileId,
  stats,
  mutuals = null,
  actions,
}: {
  name: string;
  handle: string;
  photoUrl?: string | null;
  coverUrl?: string | null;
  /** Owner only: the Edit cover control and editor. Also mounts the trail. */
  coverEdit?: ReactNode;
  bio?: string | null;
  /** Owner only: muted line shown when the bio is empty. */
  bioHint?: string | null;
  roles?: readonly string[] | null;
  websiteUrl?: string | null;
  imdbUrl?: string | null;
  ring?: "unseen" | "live" | null;
  photoAction?: ReactNode;
  profileId?: string;
  stats?: { posts: number; followers: number; following: number };
  mutuals?: SocialProfileMutuals | null;
  actions?: ReactNode;
}) {
  const person = socialPersonIdentity({ handle, displayName: name });
  const intro = socialProfileIntro(bio, bioHint);
  const roleItems = socialProfileRolesRailItems(roles ?? []);
  const links = socialProfilePublicLinks({ websiteUrl, imdbUrl });
  const hasCover = socialProfileCoverPhoto(coverUrl) !== null;
  const mutualFaces = mutuals?.people.slice(0, SOCIAL_MUTUALS_FACE_CAP) ?? [];
  const followedBy = mutuals
    ? socialFollowedByLine(
        mutualFaces.map((peer) => peer.label),
        mutuals.extra,
      )
    : null;

  return (
    <div data-social-profile-identity="" className={SOCIAL_PROFILE_IDENTITY_CLASS}>
      <div data-social-profile-stage="" className={SOCIAL_PROFILE_STAGE_CLASS}>
        <div
          data-social-profile-hero=""
          data-social-profile-cover-empty={hasCover ? undefined : ""}
          className={SOCIAL_PROFILE_HERO_CLASS}
        >
          <SocialProfileCover coverUrl={coverUrl} />
          <div data-social-profile-head="" className={SOCIAL_PROFILE_HEAD_CLASS}>
            <div data-social-profile-avatar-row="" className={SOCIAL_PROFILE_AVATAR_ROW_CLASS}>
              <div data-social-profile-avatar-slot="" className={SOCIAL_PROFILE_AVATAR_SLOT_CLASS}>
                <SocialAvatar
                  name={person.avatarName}
                  photoUrl={photoUrl}
                  ring={ring}
                  size="profile"
                  className={SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS}
                />
                {photoAction}
              </div>
            </div>
            <div data-social-profile-name-stack="" className={SOCIAL_PROFILE_NAME_STACK_CLASS}>
              {person.name ? (
                <p data-social-profile-name="" className={SOCIAL_PROFILE_NAME_CLASS}>
                  {person.name}
                </p>
              ) : null}
              {person.handleLabel ? (
                <p data-social-profile-handle="" className={SOCIAL_PROFILE_HANDLE_CLASS}>
                  {person.handleLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {coverEdit}
      </div>
      {coverEdit ? (
        // Cover editor hint, note, Cancel/Save, errors and the avatar crop portal here.
        <div data-social-profile-head-trail="" className={SOCIAL_PROFILE_HEAD_TRAIL_CLASS} />
      ) : null}
      <div data-social-profile-face="" className={SOCIAL_PROFILE_FACE_CLASS}>
        {intro.headline || intro.tagline ? (
          <div data-social-profile-intro="" className={SOCIAL_PROFILE_INTRO_CLASS}>
            {intro.headline ? (
              <p data-social-profile-headline="" className={SOCIAL_PROFILE_HEADLINE_CLASS}>
                {intro.headline}
              </p>
            ) : null}
            {intro.tagline ? (
              <p data-social-profile-tagline="" className={SOCIAL_PROFILE_TAGLINE_CLASS}>
                {intro.tagline}
              </p>
            ) : null}
          </div>
        ) : null}
        {actions ? (
          <div data-social-profile-actions="" className={SOCIAL_PROFILE_ACTIONS_CLASS}>
            {actions}
          </div>
        ) : null}
        {stats ? (
          <SocialProfileStats profileId={profileId} handle={handle} stats={stats} />
        ) : null}
        {followedBy ? (
          <div data-social-profile-mutuals="" className={SOCIAL_PROFILE_MUTUALS_CLASS}>
            <div data-social-profile-mutuals-faces="" className="flex shrink-0">
              {mutualFaces.map((peer, index) => (
                <SocialAvatar
                  key={peer.id}
                  name={peer.label}
                  photoUrl={peer.photoUrl}
                  size="sm"
                  className={index === 0 ? undefined : "-ml-2"}
                />
              ))}
            </div>
            <p className="min-w-0 break-words t-body-sm text-ink-2">{followedBy}</p>
          </div>
        ) : null}
        {roleItems.length > 0 ? (
          <div data-social-profile-roles="" className={SOCIAL_PROFILE_ROLES_CLASS}>
            {roleItems.map((item) => (
              <span
                key={item.slug}
                data-social-profile-role={item.slug}
                className={SOCIAL_PROFILE_ROLE_PILL_CLASS}
              >
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
        <SocialProfileLinkRow links={links} />
      </div>
    </div>
  );
}
