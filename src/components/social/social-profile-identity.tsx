import type { ReactNode } from "react";

import { HouseChipRail } from "@/components/chrome/house-chip-rail";
import { cn } from "@/lib/cn";
import {
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_SLOT_CLASS,
  SOCIAL_PROFILE_BIO_CLASS,
  SOCIAL_PROFILE_COVER_STACK_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_FACE_LEAD_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_NO_COVER_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_INSET_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_PROFILE_ROLES_RAIL_ROWS,
  SOCIAL_PROFILE_STATS_LEAD_CLASS,
} from "@/lib/social-chrome";
import { socialPersonIdentity } from "@/lib/social";
import { socialProfileRendersCoverBand } from "@/lib/social-profile-cover";
import { socialProfilePublicLinks } from "@/lib/social-profile-links";
import {
  SOCIAL_MUTUALS_FACE_CAP,
  socialFollowedByLine,
  type SocialProfileMutuals,
} from "@/lib/social-profile-mutuals";
import { socialProfileRolesRailItems } from "@/lib/social-profile-roles";

import { SocialAvatar } from "./social-avatar";
import { SocialProfileBanner, SocialProfileCoverBlock } from "./social-profile-banner";
import { SocialProfileLinkRow } from "./social-profile-links";
import { SocialProfileStats } from "./social-profile-stats";

export function SocialProfileIdentity({
  name,
  handle,
  photoUrl,
  coverUrl,
  coverEdit,
  owner = false,
  bio,
  roles,
  websiteUrl,
  imdbUrl,
  ring = null,
  photoAction,
  profileId,
  stats,
  mutuals = null,
  actions,
  children,
}: {
  name: string;
  handle: string;
  photoUrl?: string | null;
  coverUrl?: string | null;
  coverEdit?: ReactNode;
  /** Own profile. Keeps the wash band without a cover, also in the save-hop and loading overlay. */
  owner?: boolean;
  bio?: string | null;
  roles?: readonly string[] | null;
  websiteUrl?: string | null;
  imdbUrl?: string | null;
  ring?: "unseen" | "live" | null;
  photoAction?: ReactNode;
  profileId?: string;
  stats?: { posts: number; followers: number; following: number };
  mutuals?: SocialProfileMutuals | null;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const person = socialPersonIdentity({ handle, displayName: name });
  const roleRailItems = socialProfileRolesRailItems(roles ?? []);
  const links = socialProfilePublicLinks({ websiteUrl, imdbUrl });
  const followedBy = mutuals
    ? socialFollowedByLine(
        mutuals.people.slice(0, SOCIAL_MUTUALS_FACE_CAP).map((peer) => peer.label),
        mutuals.extra,
      )
    : null;
  const actionRow = actions ? (
    <div data-social-profile-actions="" className={SOCIAL_PROFILE_ACTIONS_CLASS}>
      {actions}
    </div>
  ) : null;
  // Owner band: the own profile, and its save-hop and loading overlay
  // (owner without coverEdit), keep the wash band so nothing jumps.
  const ownerBand = owner || Boolean(coverEdit);
  const showCoverBand = socialProfileRendersCoverBand({ coverUrl, owner: ownerBand });

  return (
    <div data-social-profile-identity="" className={SOCIAL_PROFILE_IDENTITY_CLASS}>
      <div data-social-profile-cover-stack="" className={SOCIAL_PROFILE_COVER_STACK_CLASS}>
        {ownerBand ? (
          <SocialProfileCoverBlock coverUrl={coverUrl} coverEdit={coverEdit} />
        ) : (
          <SocialProfileBanner coverUrl={coverUrl} />
        )}
        <div
          data-social-profile-head=""
          className={cn(
            SOCIAL_PROFILE_INSET_CLASS,
            showCoverBand ? SOCIAL_PROFILE_HEAD_OVERLAP_CLASS : SOCIAL_PROFILE_HEAD_NO_COVER_CLASS,
          )}
        >
          <div className={SOCIAL_PROFILE_HEAD_CLASS}>
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
              {coverEdit ? (
                // Cover editor hint, note, Cancel/Save and errors portal here.
                <div data-social-profile-head-trail="" className={SOCIAL_PROFILE_HEAD_TRAIL_CLASS} />
              ) : null}
            </div>
            {person.name || person.handleLabel ? (
              <div className={SOCIAL_PROFILE_NAME_STACK_CLASS}>
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
            ) : null}
          </div>
        </div>
      </div>
      <div
        data-social-profile-face=""
        className={cn(
          SOCIAL_PROFILE_FACE_CLASS,
          stats ? SOCIAL_PROFILE_STATS_LEAD_CLASS : SOCIAL_PROFILE_FACE_LEAD_CLASS,
        )}
      >
        {stats ? (
          <SocialProfileStats profileId={profileId} handle={handle} stats={stats} />
        ) : null}
        {bio?.trim() ? (
          <p data-social-profile-bio="" className={SOCIAL_PROFILE_BIO_CLASS}>
            {bio}
          </p>
        ) : null}
        {roleRailItems.length > 0 ? (
          <HouseChipRail
            data-social-profile-roles=""
            rows={SOCIAL_PROFILE_ROLES_RAIL_ROWS}
            items={roleRailItems}
            renderItem={(item) => (
              <span
                key={item.slug}
                data-social-profile-role={item.slug}
                className={SOCIAL_PROFILE_ROLE_PILL_CLASS}
              >
                {item.label}
              </span>
            )}
          />
        ) : null}
        <SocialProfileLinkRow links={links} />
        {actionRow}
        {followedBy ? (
          <div data-social-profile-mutuals="" className="flex min-w-0 items-center gap-2">
            <div data-social-profile-mutuals-faces="" className="flex shrink-0">
              {mutuals?.people.slice(0, SOCIAL_MUTUALS_FACE_CAP).map((peer, index) => (
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
        {children}
      </div>
    </div>
  );
}
