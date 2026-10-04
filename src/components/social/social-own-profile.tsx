"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { readSocialProfile } from "@/app/(app)/social/query-actions";
import { SocialProfileAvatarEdit } from "@/components/social/social-profile-avatar-edit";
import { SocialProfileCoverUpload } from "@/components/social/social-profile-cover-upload";
import { SocialProfileIdentity } from "@/components/social/social-profile-identity";
import { SocialForYouSkeleton } from "@/components/social/social-skeletons";
import { SocialWelcomeVideo } from "@/components/social/social-welcome-video";
import { useAppQueryClient } from "@/components/query-provider";
import {
  useSocialProfileOptimistic,
  useSocialProfileSaveHop,
} from "@/components/social/use-social-profile-optimistic";
import { HOUSE_PAGE_CANVAS_CLASS } from "@/lib/house-shell";
import { SOCIAL_QUERY_STALE_MS, socialProfileQueryKey } from "@/lib/social-cache-keys";
import { SOCIAL_HOME_LAYOUT_CLASS, SOCIAL_PROFILE_CENTER_CLASS } from "@/lib/social-chrome";
import type { CoverFraming } from "@/lib/social-profile-cover-frame";
import { socialProfileFaceFromRow } from "@/lib/social-query";
import {
  SOCIAL_PROFILE_IDENTITY_EMPTY,
  clearSocialProfileOptimistic,
  mergeSocialProfileIdentity,
  releaseSocialProfileSaveHop,
  socialProfileOptimisticMatches,
  socialProfileOptimisticPublic,
  type SocialProfileIdentityView,
  type SocialProfileOptimisticSnapshot,
} from "@/lib/social-profile-edit";

type OwnProfileFace = SocialProfileIdentityView & {
  /** Stored framing of the kept original and its cover. Null: no original (Reposition opens the picker). */
  coverFraming?: CoverFraming | null;
  fallbackBio?: string;
  ring?: "unseen" | "live" | null;
  profileId?: string;
  stats?: { posts: number; followers: number; following: number };
  actions?: ReactNode;
};

function SocialProfileOptimisticIdentity({
  overlay,
}: {
  overlay: SocialProfileOptimisticSnapshot;
}) {
  const view = mergeSocialProfileIdentity(SOCIAL_PROFILE_IDENTITY_EMPTY, overlay);
  if (!view.handle && !view.displayName) return null;
  // Same layout row as the real page, For You placeholder included, so the
  // centre column (and the band and avatar sized from it) does not change
  // width when the real face mounts. Below lg the placeholder is hidden.
  return (
    <div data-social-profile-optimistic="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_PROFILE_CENTER_CLASS}>
        <SocialProfileIdentity
          name={view.displayName}
          handle={view.handle}
          photoUrl={view.photoUrl}
          coverUrl={view.coverUrl}
          owner
          bio={view.bio.trim() ? view.bio : undefined}
          roles={view.crafts}
          websiteUrl={view.websiteUrl}
          imdbUrl={view.imdbUrl}
        />
        {view.welcomeVideoUrl ? <SocialWelcomeVideo present /> : null}
      </div>
      <SocialForYouSkeleton />
    </div>
  );
}

export function SocialOwnProfileFace(props: OwnProfileFace) {
  const client = useAppQueryClient();
  if (!props.profileId || !client) {
    return <SocialOwnProfileFaceView {...props} />;
  }
  return <SocialOwnProfileFaceQuery {...props} profileId={props.profileId} />;
}

function SocialOwnProfileFaceQuery(props: OwnProfileFace & { profileId: string }) {
  const query = useQuery({
    queryKey: socialProfileQueryKey(props.profileId),
    queryFn: () => readSocialProfile(props.profileId),
    staleTime: SOCIAL_QUERY_STALE_MS,
  });
  const row = query.data;
  if (!row) return <SocialOwnProfileFaceView {...props} />;
  const face = socialProfileFaceFromRow(row);
  return <SocialOwnProfileFaceView {...props} {...face} />;
}

function SocialOwnProfileFaceView({
  coverFraming = null,
  fallbackBio = "",
  ring = null,
  profileId,
  stats,
  actions,
  handle,
  displayName,
  bio,
  photoUrl,
  coverUrl,
  welcomeVideoUrl,
  crafts,
  topics,
  imdbUrl,
  websiteUrl,
}: OwnProfileFace) {
  const server = {
    handle,
    displayName,
    bio,
    photoUrl,
    coverUrl,
    welcomeVideoUrl,
    crafts,
    topics,
    imdbUrl,
    websiteUrl,
  };
  const overlay = useSocialProfileOptimistic();
  const merged = mergeSocialProfileIdentity(server, overlay);
  const shownBio = merged.bio.trim() ? merged.bio : fallbackBio;
  useEffect(() => {
    releaseSocialProfileSaveHop();
  }, []);
  useEffect(() => {
    if (
      overlay &&
      socialProfileOptimisticMatches(
        {
          handle,
          displayName,
          bio,
          photoUrl,
          coverUrl,
          welcomeVideoUrl,
          crafts,
          topics,
          imdbUrl,
          websiteUrl,
        },
        overlay,
      )
    ) {
      clearSocialProfileOptimistic();
    }
  }, [
    overlay,
    handle,
    displayName,
    bio,
    photoUrl,
    coverUrl,
    welcomeVideoUrl,
    crafts,
    topics,
    imdbUrl,
    websiteUrl,
  ]);

  return (
    <>
      <SocialProfileIdentity
        name={merged.displayName}
        handle={merged.handle}
        photoUrl={merged.photoUrl}
        coverUrl={merged.coverUrl}
        owner
        coverEdit={<SocialProfileCoverUpload coverUrl={merged.coverUrl} coverFraming={coverFraming} />}
        photoAction={<SocialProfileAvatarEdit />}
        bio={shownBio}
        roles={merged.crafts}
        websiteUrl={merged.websiteUrl}
        imdbUrl={merged.imdbUrl}
        ring={ring}
        profileId={profileId}
        stats={stats}
        actions={actions}
      />
      {merged.welcomeVideoUrl ? <SocialWelcomeVideo present /> : null}
    </>
  );
}

export function SocialProfileOptimisticShell({
  serverOverlay = null,
  fallback,
}: {
  serverOverlay?: SocialProfileOptimisticSnapshot | null;
  fallback: ReactNode;
}) {
  const client = useSocialProfileOptimistic();
  const overlay = client ?? serverOverlay;
  if (!socialProfileOptimisticPublic(overlay)) return fallback;
  return <SocialProfileOptimisticIdentity overlay={overlay} />;
}

export function SocialProfileSaveHop({ children }: { children: ReactNode }) {
  const overlay = useSocialProfileOptimistic();
  const hop = useSocialProfileSaveHop();
  const show = hop && socialProfileOptimisticPublic(overlay);
  if (!show || !overlay) return children;
  return (
    <div className="relative min-h-full">
      {children}
      <div
        data-social-profile-save-hop=""
        className={`absolute inset-0 z-10 min-h-full ${HOUSE_PAGE_CANVAS_CLASS}`}
      >
        <SocialProfileOptimisticIdentity overlay={overlay} />
      </div>
    </div>
  );
}
