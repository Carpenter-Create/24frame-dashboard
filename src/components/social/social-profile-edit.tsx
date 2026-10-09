"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";

import { removeAccountPhoto, uploadAccountPhoto } from "@/app/(app)/account/actions";
import { AppSheetCard, AppSheetFrame, HouseScrim } from "@/components/chrome/house-overlay";
import { HouseLink } from "@/components/chrome/house-link";
import {
  clearSocialWelcomeVideo,
  presignSocialMediaUpload,
  saveSocialWelcomeVideo,
} from "@/app/(app)/social/actions";
import { AccountAvatarCrop } from "@/components/account/account-avatar-crop";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SettingsDrillRow } from "@/components/settings/settings-drill";
import { SocialProfileAvatarSheet } from "@/components/social/social-profile-avatar-sheet";
import { SocialProfileBioDraftEditor } from "@/components/social/social-profile-bio";
import { SocialProfileEditFaceHostProvider } from "@/components/social/social-profile-edit-face";
import { SocialProfileHandleEditor } from "@/components/social/social-profile-handle-edit";
import { SocialProfileImdbEditor } from "@/components/social/social-profile-imdb";
import { SocialProfileLinksEditor } from "@/components/social/social-profile-links-edit";
import { SocialProfileNameEditor } from "@/components/social/social-profile-name";
import { SocialProfileRolesEditor } from "@/components/social/social-profile-roles";
import { SocialProfileTopicsEditor } from "@/components/social/social-profile-topics";
import { SocialIcon } from "@/components/social/social-icon";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import {
  accountAvatarPickError,
  cropAvatarFile,
  readAccountAvatarCropPreview,
  type AvatarCropFrame,
} from "@/lib/account-avatar-crop";
import { cn } from "@/lib/cn";
import { SOCIAL_VIDEO_CONTENT_TYPES } from "@/lib/social-media";
import { socialCreateTile } from "@/lib/social-create-sheet";
import { socialGoLiveWelcomeHref } from "@/lib/social-go-live";
import { rememberSocialGoLiveOpener } from "@/lib/social-go-live-nav";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "@/lib/house-lead-chrome";
import {
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS,
  SOCIAL_PROFILE_EDIT_WELCOME_ACTIONS_CLASS,
  SOCIAL_PROFILE_EDIT_AVATAR_CLASS,
  SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS,
  SOCIAL_PROFILE_EDIT_BACK_CLASS,
  SOCIAL_PROFILE_EDIT_BODY_CLASS,
  SOCIAL_PROFILE_EDIT_CARD_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_ACTIONS_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_BUTTON_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_LINE_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_SHEET_ACTIONS_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_STRIP_CLASS,
  SOCIAL_PROFILE_EDIT_DISCARD_TITLE_CLASS,
  SOCIAL_PROFILE_EDIT_DONE_CLASS,
  SOCIAL_PROFILE_EDIT_HEADER_CLASS,
  SOCIAL_PROFILE_EDIT_HOST_CLASS,
  SOCIAL_PROFILE_EDIT_LABEL_CLASS,
  SOCIAL_PROFILE_EDIT_PHOTO_CLASS,
  SOCIAL_PROFILE_EDIT_PICTURE_CLASS,
  SOCIAL_PROFILE_EDIT_ROW_CLASS,
  SOCIAL_PROFILE_EDIT_SHEET_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import {
  SOCIAL,
  SOCIAL_ROUTES,
  composeSocialDisplayName,
  handleFieldValue,
  normalizeBio,
  splitSocialDisplayName,
} from "@/lib/social";
import { isLocalMediaPreviewSrc } from "@/lib/social-media-display";
import { socialProfileImdbRowSummary } from "@/lib/social-imdb";
import {
  composeSocialWebsiteUrlField,
  parseSocialWebsiteUrlField,
  socialProfileLinksRowSummary,
} from "@/lib/social-profile-links";
import { parseSocialProfileRoles, socialProfileRolesRowSummary } from "@/lib/social-profile-roles";
import { parseSocialProfileTopics, socialProfileTopicsRowSummary } from "@/lib/social-profile-topics";
import { useAppQueryClient } from "@/components/query-provider";
import {
  applySocialProfileOptimistic,
  checkSocialProfileEditSave,
  dropSocialProfileOptimisticDraft,
  patchSocialProfileOptimistic,
  persistSocialProfileEdit,
  socialProfileBioRowSummary,
  socialProfileEditChangedFields,
  socialProfileEditDiscardLine,
  socialProfileEditFaceForError,
  socialProfileEditHandleChanged,
  socialProfileEditSeed,
  socialProfileHandleRowSummary,
  socialProfileNameRowSummary,
  socialProfileOptimisticFail,
  socialProfilePersistNotice,
  socialProfileSaveFieldError,
  type SocialProfileEditFace,
  type SocialProfileEditSaveDraft,
  type SocialProfileIdentityView,
  type SocialProfileOptimisticSnapshot,
} from "@/lib/social-profile-edit";
import { applyOptimisticSocialProfilePatch, invalidateSocialQueries } from "@/lib/social-query";
import { socialProfileQueryKey } from "@/lib/social-cache-keys";

// Edit profile: one draft, one save, two hosts
// (docs/design-locks/social-profile-edit-window-lock-v1.md, Adam 2026-10-09).
// useSocialProfileEditDraft owns the draft, the media and the save.
// SocialProfileEditForm is the phone sheet on /social/profile/edit;
// SocialProfileEditWindow (social-profile-edit-window.tsx) is the desktop
// window over the live profile. Both draw the same index and faces.

export type SocialProfileEditProps = {
  profileId?: string;
  handle: string;
  displayName: string;
  bio: string;
  photoUrl: string | null;
  welcomeVideoUrl?: string | null;
  crafts?: readonly string[];
  topics?: readonly string[];
  imdbUrl?: string | null;
  websiteUrl?: string | null;
  initialFace?: SocialProfileEditFace;
};

type EditView = Pick<
  SocialProfileIdentityView,
  "handle" | "displayName" | "bio" | "photoUrl" | "welcomeVideoUrl" | "crafts" | "topics"
> & { imdbUrl: string | null; websiteUrl: string | null };

function editDraftFrom(view: EditView): SocialProfileEditSaveDraft {
  const split = splitSocialDisplayName(view.displayName);
  const urls = parseSocialWebsiteUrlField(view.websiteUrl);
  return {
    username: handleFieldValue(view.handle),
    firstName: split.firstName,
    middleName: split.middleName,
    lastName: split.lastName,
    bio: view.bio,
    crafts: parseSocialProfileRoles(view.crafts),
    topics: parseSocialProfileTopics(view.topics),
    imdbUrl: view.imdbUrl ?? "",
    links: urls.length > 0 ? urls : [""],
    photoUrl: view.photoUrl,
    welcomeVideoUrl: view.welcomeVideoUrl,
  };
}

export type SocialProfileEditSaveHost = {
  /** Leave Edit: the phone routes to the profile; the window closes. */
  leave: () => void;
  /** The window stays on the mounted profile: paint without the save-hop
   *  cover (raising it would remount the Social tree under the window). */
  stayOnPage?: boolean;
  /** A background persist failed after Edit left: come back at that face. */
  onPersistFailed: (face: SocialProfileEditFace) => void;
  /** The background persist is out; it settles after any onPersistFailed. */
  onPersisting?: (settled: Promise<void>) => void;
};

export function useSocialProfileEditDraft({
  profileId,
  handle,
  displayName,
  bio,
  photoUrl,
  welcomeVideoUrl = null,
  crafts = [],
  topics = [],
  imdbUrl = "",
  websiteUrl = "",
  initialFace = "edit",
}: SocialProfileEditProps) {
  const queryClient = useAppQueryClient();
  const server: EditView = {
    handle,
    displayName,
    bio,
    photoUrl,
    welcomeVideoUrl,
    crafts,
    topics,
    imdbUrl: imdbUrl ?? "",
    websiteUrl: websiteUrl ?? "",
  };
  // Where Edit opened: the saved profile. A failed save reopens on its
  // draft (the seed), which still differs from this, so leaving asks.
  const [baseline] = useState(() => editDraftFrom(server));
  const [seed] = useState(() =>
    socialProfileEditSeed({ ...server, coverUrl: null }),
  );
  const [start] = useState(() => editDraftFrom(seed));
  const [firstName, setFirstName] = useState(start.firstName);
  const [middleName, setMiddleName] = useState(start.middleName);
  const [lastName, setLastName] = useState(start.lastName);
  const [username, setUsername] = useState(start.username);
  const [error, setError] = useState(seed.error);
  const [handleError, setHandleError] = useState(seed.handleError);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [face, setFace] = useState<SocialProfileEditFace>(initialFace);
  // push: a face slides in from the right; pop: the index returns from the left.
  const [motion, setMotion] = useState<"push" | "pop" | null>(null);
  const [cameFrom, setCameFrom] = useState<SocialProfileEditFace | null>(null);
  const [bioText, setBioText] = useState(start.bio);
  const [roles, setRoles] = useState(start.crafts);
  const [interestTopics, setInterestTopics] = useState(start.topics);
  const [imdb, setImdb] = useState(start.imdbUrl);
  const [previewPhoto, setPreviewPhoto] = useState(seed.photoUrl);
  const [welcomePreview, setWelcomePreview] = useState(seed.welcomeVideoUrl);
  const [linkDrafts, setLinkDrafts] = useState(start.links);
  // Media saves on confirm; the discard ask says so.
  const [photoSaved, setPhotoSaved] = useState(false);
  const [videoSaved, setVideoSaved] = useState(false);

  const draft: SocialProfileEditSaveDraft = {
    username,
    firstName,
    middleName,
    lastName,
    bio: bioText,
    crafts: roles,
    topics: interestTopics,
    imdbUrl: imdb,
    links: linkDrafts,
    photoUrl: previewPhoto,
    welcomeVideoUrl: welcomePreview,
  };
  const changed = socialProfileEditChangedFields(baseline, draft);
  const cropOpen = Boolean(cropFile && cropPreview && cropSize);

  function openFace(next: SocialProfileEditFace) {
    // The photo menu and the crop belong to the index; leaving it closes them.
    setAvatarSheet(false);
    clearCrop();
    setMotion("push");
    setCameFrom(null);
    setFace(next);
  }

  function backToIndex() {
    setMotion("pop");
    setCameFrom(face);
    setFace("edit");
  }

  function clearCrop() {
    if (cropPreview) URL.revokeObjectURL(cropPreview);
    setCropFile(null);
    setCropPreview(null);
    setCropSize(null);
  }

  function beginCrop(file: File | undefined) {
    const pickError = accountAvatarPickError(file);
    if (!file) return;
    setError("");
    if (pickError) {
      setError(pickError);
      return;
    }
    void readAccountAvatarCropPreview(file)
      .then((next) => {
        if (cropPreview) URL.revokeObjectURL(cropPreview);
        setCropFile(file);
        setCropPreview(next.url);
        setCropSize({ width: next.width, height: next.height });
      })
      .catch((cause) => {
        setError(cause instanceof Error && cause.message ? cause.message : ACCOUNT_PROFILE.photoType);
      });
  }

  async function onCropConfirm(frame: AvatarCropFrame) {
    if (!cropFile || uploading) return;
    setError("");
    try {
      const cropped = await cropAvatarFile(cropFile, frame);
      const blobUrl = URL.createObjectURL(cropped);
      const previous = previewPhoto;
      setPreviewPhoto(blobUrl);
      patchSocialProfileOptimistic({ photoUrl: blobUrl });
      clearCrop();
      setUploading(true);
      const body = new FormData();
      body.set("photo", cropped);
      const res = await uploadAccountPhoto(body);
      if (res.error) {
        setPreviewPhoto(previous);
        patchSocialProfileOptimistic({ photoUrl: previous });
        URL.revokeObjectURL(blobUrl);
        setError(res.error);
        return;
      }
      setPhotoSaved(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : ACCOUNT_PROFILE.photoFailed);
    } finally {
      setUploading(false);
    }
  }

  async function onPhotoRemove() {
    if (uploading) return;
    setError("");
    const previous = previewPhoto;
    setPreviewPhoto(null);
    patchSocialProfileOptimistic({ photoUrl: null });
    setUploading(true);
    const result = await removeAccountPhoto();
    setUploading(false);
    if (result.error) {
      setPreviewPhoto(previous);
      patchSocialProfileOptimistic({ photoUrl: previous });
      setError(result.error);
      return;
    }
    setPhotoSaved(false);
  }

  /** `reset` clears the file input so the same file can be picked again. */
  async function onWelcomePick(file: File | undefined, reset?: () => void) {
    if (!file || uploading) return;
    setError("");
    const previewUrl = URL.createObjectURL(file);
    const previous = welcomePreview;
    setWelcomePreview(previewUrl);
    patchSocialProfileOptimistic({ welcomeVideoUrl: previewUrl });
    setUploading(true);
    const body = new FormData();
    body.set("content_type", file.type);
    body.set("byte_length", String(file.size));
    body.set("lane", "posts");
    const signed = await presignSocialMediaUpload(body);
    if (signed.error || !signed.url || !signed.key || !signed.kind || !signed.contentType) {
      setUploading(false);
      setWelcomePreview(previous);
      patchSocialProfileOptimistic({ welcomeVideoUrl: previous });
      URL.revokeObjectURL(previewUrl);
      reset?.();
      setError(signed.error ?? SOCIAL.home.uploadFailed);
      return;
    }
    const put = await fetch(signed.url, {
      method: "PUT",
      headers: { "Content-Type": signed.contentType },
      body: file,
    });
    if (!put.ok) {
      setUploading(false);
      setWelcomePreview(previous);
      patchSocialProfileOptimistic({ welcomeVideoUrl: previous });
      URL.revokeObjectURL(previewUrl);
      reset?.();
      setError(SOCIAL.home.uploadFailed);
      return;
    }
    const save = new FormData();
    save.set(
      "media",
      JSON.stringify([{ kind: signed.kind, key: signed.key, contentType: signed.contentType }]),
    );
    const result = await saveSocialWelcomeVideo(save);
    setUploading(false);
    reset?.();
    if (result.error) {
      setWelcomePreview(previous);
      patchSocialProfileOptimistic({ welcomeVideoUrl: previous });
      URL.revokeObjectURL(previewUrl);
      setError(result.error);
      return;
    }
    setVideoSaved(true);
  }

  async function onWelcomeRemove() {
    if (uploading) return;
    setError("");
    const previous = welcomePreview;
    setWelcomePreview(null);
    patchSocialProfileOptimistic({ welcomeVideoUrl: null });
    setUploading(true);
    const result = await clearSocialWelcomeVideo();
    setUploading(false);
    if (result.error) {
      setWelcomePreview(previous);
      patchSocialProfileOptimistic({ welcomeVideoUrl: previous });
      setError(result.error);
      return;
    }
    setVideoSaved(false);
  }

  // A save the server (or the check) refused: show it on its face.
  function showSaveError(notice: string) {
    if (socialProfileSaveFieldError(notice) === "handle") {
      setHandleError(notice);
      openFace("handle");
      return;
    }
    setError(notice);
    const at = socialProfileEditFaceForError(notice);
    if (at && at !== face) openFace(at);
  }

  // The one save. Valid drafts paint the profile at once and leave; the
  // write runs in the background and rolls back on error. A changed
  // username waits for the server first.
  function save(host: SocialProfileEditSaveHost) {
    if (pending || cropOpen) return;
    setError("");
    setHandleError("");
    const checked = checkSocialProfileEditSave(draft);
    if (!checked.ok) {
      showSaveError(checked.handleError ?? checked.error ?? "");
      return;
    }
    // Bio rides the one save only when this draft changed it: a Bio saved
    // elsewhere meanwhile (the Home prompt's Bio route) is never overwritten
    // by the copy Edit opened with.
    const bioChanged = (normalizeBio(baseline.bio) ?? baseline.bio) !== (normalizeBio(bioText) ?? bioText);
    if (!bioChanged) checked.form.delete("bio");
    const snapshot: SocialProfileOptimisticSnapshot = bioChanged
      ? checked.snapshot
      : { ...checked.snapshot, bio: undefined };
    const key = profileId ? socialProfileQueryKey(profileId) : null;
    // The cached row as it stood, to put back if the write fails.
    const cached = queryClient && key ? queryClient.getQueryData(key) : undefined;
    const restoreCached = () => {
      if (!queryClient || !key || !profileId) return;
      queryClient.setQueryData(key, cached);
      invalidateSocialQueries(queryClient, { profileId });
    };
    const paint = () => {
      flushSync(() => {
        applySocialProfileOptimistic(snapshot, { hop: !host.stayOnPage });
      });
      if (queryClient && profileId) {
        // Merge into the cached row: the cover and welcome video keys stay.
        applyOptimisticSocialProfilePatch(queryClient, profileId, {
          handle: snapshot.handle ?? username,
          display_name: snapshot.displayName ?? composeSocialDisplayName(firstName, lastName, middleName),
          ...(bioChanged ? { bio: snapshot.bio ?? bioText } : {}),
          crafts: [...(snapshot.crafts ?? roles)],
          topics: [...(snapshot.topics ?? interestTopics)],
          imdb_url: snapshot.imdbUrl?.trim() || null,
          website_url: snapshot.websiteUrl ?? composeSocialWebsiteUrlField(linkDrafts.filter(Boolean)),
        });
      }
    };

    if (socialProfileEditHandleChanged(baseline.username, username)) {
      setPending(true);
      void persistSocialProfileEdit(checked.form)
        .then((result) => {
          if (result.error) {
            showSaveError(result.error);
            return;
          }
          paint();
          host.leave();
        })
        .catch((cause) => {
          setError(socialProfilePersistNotice(cause, ACCOUNT_PROFILE.saveFailed));
        })
        .finally(() => {
          setPending(false);
        });
      return;
    }

    setPending(true);
    paint();
    host.leave();
    const settled = persistSocialProfileEdit(checked.form)
      .then((result) => {
        if (!result.error) return;
        restoreCached();
        applySocialProfileOptimistic(socialProfileOptimisticFail(snapshot, result.error));
        showSaveError(result.error);
        host.onPersistFailed(socialProfileEditFaceForError(result.error) ?? "edit");
      })
      .catch((cause) => {
        const notice = socialProfilePersistNotice(cause, ACCOUNT_PROFILE.saveFailed);
        restoreCached();
        applySocialProfileOptimistic(socialProfileOptimisticFail(snapshot, notice));
        setError(notice);
        host.onPersistFailed("edit");
      })
      .finally(() => {
        setPending(false);
      });
    host.onPersisting?.(settled);
  }

  /** Leaving with changes, confirmed: the draft goes, saved media stays. */
  function discard() {
    clearCrop();
    dropSocialProfileOptimisticDraft();
  }

  return {
    face,
    motion,
    cameFrom,
    openFace,
    backToIndex,
    firstName,
    middleName,
    lastName,
    setName(next: { firstName: string; middleName: string; lastName: string }) {
      setFirstName(next.firstName);
      setMiddleName(next.middleName);
      setLastName(next.lastName);
      setError("");
    },
    username,
    setUsername(next: string) {
      setUsername(next);
      setHandleError("");
    },
    bioText,
    setBioText,
    roles,
    setRoles,
    interestTopics,
    setInterestTopics,
    imdb,
    setImdb,
    linkDrafts,
    setLinkDrafts,
    error,
    handleError,
    pending,
    uploading,
    dropping,
    setDropping,
    cropFile,
    cropPreview,
    cropSize,
    cropOpen,
    clearCrop,
    beginCrop,
    onCropConfirm,
    avatarSheet,
    setAvatarSheet,
    previewPhoto,
    onPhotoRemove,
    welcomePreview,
    onWelcomePick,
    onWelcomeRemove,
    photoSaved,
    videoSaved,
    changed,
    dirty: changed.length > 0,
    save,
    discard,
  };
}

export type SocialProfileEditDraft = ReturnType<typeof useSocialProfileEditDraft>;

/** The browser's own prompt while the draft has changes (reload, close tab). */
export function useSocialProfileEditLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

/** Photo, welcome video and the drill rows: nothing typed on the index. */
const WELCOME_MEDIA_TILE = socialCreateTile("media")!;
const WELCOME_LIVE_TILE = socialCreateTile("live")!;

export function SocialProfileEditIndexBody({
  edit,
  avatarMenu = null,
  onLeave,
}: {
  edit: SocialProfileEditDraft;
  /** The window's anchored photo menu, dropped under Edit picture. */
  avatarMenu?: ReactNode;
  /** Leaving Edit for another screen (the camera) with changes: the host asks first. */
  onLeave?: (href: string) => void;
}) {
  const welcomeRef = useRef<HTMLInputElement>(null);
  const name = composeSocialDisplayName(edit.firstName, edit.lastName, edit.middleName);
  return (
    <>
      <div data-social-profile-edit-photo="" className={cn(SOCIAL_PROFILE_EDIT_PHOTO_CLASS, "relative")}>
        {edit.cropFile && edit.cropPreview && edit.cropSize ? (
          <AccountAvatarCrop
            key={edit.cropPreview}
            previewUrl={edit.cropPreview}
            imageWidth={edit.cropSize.width}
            imageHeight={edit.cropSize.height}
            pending={edit.uploading}
            onCancel={edit.clearCrop}
            onConfirm={(frame) => void edit.onCropConfirm(frame)}
          />
        ) : (
          <>
            <button
              type="button"
              disabled={edit.uploading}
              data-social-profile-edit-avatar-drop=""
              data-dropping={edit.dropping ? "" : undefined}
              aria-label={edit.dropping ? ACCOUNT_PROFILE.dropPhoto : SOCIAL.profile.editPicture}
              className={cn(
                SOCIAL_PROFILE_EDIT_AVATAR_CLASS,
                edit.dropping ? SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS : null,
              )}
              onClick={() => edit.setAvatarSheet(!edit.avatarSheet)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                edit.setDropping(true);
              }}
              onDragLeave={() => edit.setDropping(false)}
              onDrop={(event) => {
                event.preventDefault();
                edit.setDropping(false);
                edit.beginCrop(event.dataTransfer.files[0]);
              }}
            >
              <SocialAvatar name={name} photoUrl={edit.previewPhoto} size="profile" className="size-full" />
            </button>
            <button
              type="button"
              disabled={edit.uploading}
              data-social-profile-edit-picture=""
              aria-haspopup="dialog"
              aria-expanded={edit.avatarSheet}
              onClick={() => edit.setAvatarSheet(!edit.avatarSheet)}
              className={SOCIAL_PROFILE_EDIT_PICTURE_CLASS}
            >
              {edit.dropping
                ? ACCOUNT_PROFILE.dropPhoto
                : edit.uploading
                  ? SOCIAL.profile.uploadingPhoto
                  : SOCIAL.profile.editPicture}
            </button>
            {avatarMenu}
          </>
        )}
      </div>
      <div data-social-profile-edit-welcome="" className={SOCIAL_PROFILE_EDIT_CARD_CLASS}>
        <div className={`${SOCIAL_PROFILE_EDIT_ROW_CLASS} flex-col gap-2`}>
          <p className={SOCIAL_PROFILE_EDIT_LABEL_CLASS}>{SOCIAL.profile.welcomeVideo}</p>
          {edit.welcomePreview && isLocalMediaPreviewSrc(edit.welcomePreview) ? (
            <video
              src={edit.welcomePreview}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-surface-muted object-contain"
            />
          ) : edit.welcomePreview ? (
            <div data-social-video-closed="" className="aspect-video w-full bg-surface-muted" />
          ) : null}
          {/* The + fan's Media and Live (Adam 2026-10-09): upload a video or
              record one with the 24Frame camera. Round grey 44s, as in the
              composer's tool row. */}
          <div data-social-profile-edit-welcome-actions="" className={SOCIAL_PROFILE_EDIT_WELCOME_ACTIONS_CLASS}>
            <button
              type="button"
              disabled={edit.uploading}
              data-social-profile-edit-welcome-media=""
              aria-label={WELCOME_MEDIA_TILE.label}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={() => welcomeRef.current?.click()}
            >
              <SocialIcon
                name={WELCOME_MEDIA_TILE.icon}
                size={SOCIAL_COMPOSER_AFFORDANCE_GLYPH}
                className={SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS}
              />
            </button>
            <HouseLink
              href={socialGoLiveWelcomeHref()}
              data-social-profile-edit-welcome-live=""
              aria-label={WELCOME_LIVE_TILE.label}
              aria-disabled={edit.uploading || undefined}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={(event) => {
                if (edit.uploading) {
                  event.preventDefault();
                  return;
                }
                // Leaving Edit with changes asks first (Keep editing · Discard).
                if (edit.dirty && onLeave) {
                  event.preventDefault();
                  onLeave(socialGoLiveWelcomeHref());
                  return;
                }
                rememberSocialGoLiveOpener(`${window.location.pathname}${window.location.search}`);
              }}
            >
              <SocialIcon
                name={WELCOME_LIVE_TILE.icon}
                size={SOCIAL_COMPOSER_AFFORDANCE_GLYPH}
                className={SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS}
              />
            </HouseLink>
            {edit.welcomePreview ? (
              <button
                type="button"
                disabled={edit.uploading}
                onClick={() => void edit.onWelcomeRemove()}
                className="ml-auto t-body-sm font-medium text-ink-2"
              >
                {SOCIAL.profile.welcomeRemove}
              </button>
            ) : null}
          </div>
          <input
            ref={welcomeRef}
            type="file"
            accept={SOCIAL_VIDEO_CONTENT_TYPES.join(",")}
            className="sr-only"
            aria-label={edit.welcomePreview ? SOCIAL.profile.welcomeReplace : SOCIAL.profile.welcomeAdd}
            onChange={(e) =>
              void edit.onWelcomePick(e.target.files?.[0], () => {
                if (welcomeRef.current) welcomeRef.current.value = "";
              })
            }
          />
        </div>
      </div>
      <div data-social-profile-edit-fields="" className={SOCIAL_PROFILE_EDIT_CARD_CLASS}>
        <SettingsDrillRow
          kind="name"
          label={SOCIAL.profile.name}
          value={socialProfileNameRowSummary(name)}
          itemAttr="data-social-profile-edit-name-open"
          onClick={() => edit.openFace("name")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="handle"
          label={SOCIAL.profile.username}
          value={socialProfileHandleRowSummary(edit.username)}
          itemAttr="data-social-profile-edit-handle-open"
          onClick={() => edit.openFace("handle")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="roles"
          label={SOCIAL.profile.roles}
          value={socialProfileRolesRowSummary(edit.roles)}
          itemAttr="data-social-profile-edit-roles-open"
          onClick={() => edit.openFace("roles")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="topics"
          label={SOCIAL.profile.topics}
          value={socialProfileTopicsRowSummary(edit.interestTopics)}
          itemAttr="data-social-profile-edit-topics-open"
          onClick={() => edit.openFace("topics")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="imdb"
          label={SOCIAL.profile.imdb}
          value={socialProfileImdbRowSummary(edit.imdb)}
          itemAttr="data-social-profile-edit-imdb-open"
          onClick={() => edit.openFace("imdb")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="links"
          label={SOCIAL.profile.links}
          value={socialProfileLinksRowSummary(edit.linkDrafts)}
          itemAttr="data-social-profile-edit-links-open"
          onClick={() => edit.openFace("links")}
        />
        <div className="h-px bg-hairline" />
        <SettingsDrillRow
          kind="bio"
          label={SOCIAL.profile.bio}
          value={socialProfileBioRowSummary(edit.bioText)}
          itemAttr="data-social-profile-edit-bio-open"
          onClick={() => edit.openFace("bio")}
        />
      </div>
      {edit.error ? <InlineNotice tone="error">{edit.error}</InlineNotice> : null}
    </>
  );
}

/** The face the draft is on. Every face writes into the one draft. */
export function SocialProfileEditFaceSwitch({ edit }: { edit: SocialProfileEditDraft }) {
  const back = edit.backToIndex;
  switch (edit.face) {
    case "name":
      return (
        <SocialProfileNameEditor
          firstName={edit.firstName}
          middleName={edit.middleName}
          lastName={edit.lastName}
          onChange={edit.setName}
          onBack={back}
        />
      );
    case "handle":
      return (
        <SocialProfileHandleEditor
          value={edit.username}
          error={edit.handleError}
          onChange={edit.setUsername}
          onBack={back}
        />
      );
    case "roles":
      return <SocialProfileRolesEditor value={edit.roles} onChange={edit.setRoles} onBack={back} />;
    case "topics":
      return (
        <SocialProfileTopicsEditor value={edit.interestTopics} onChange={edit.setInterestTopics} onBack={back} />
      );
    case "imdb":
      return <SocialProfileImdbEditor value={edit.imdb} onChange={edit.setImdb} onBack={back} />;
    case "links":
      return <SocialProfileLinksEditor value={edit.linkDrafts} onChange={edit.setLinkDrafts} onBack={back} />;
    case "bio":
      return <SocialProfileBioDraftEditor value={edit.bioText} onChange={edit.setBioText} onBack={back} />;
    default:
      return null;
  }
}

/** Leaving with changes: Keep editing · Discard, naming what would go. */
export function SocialProfileEditDiscardAsk({
  edit,
  variant,
  titleId,
  onKeep,
  onDiscard,
}: {
  edit: SocialProfileEditDraft;
  variant: "strip" | "sheet";
  titleId: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);
  const notes = [
    socialProfileEditDiscardLine(edit.changed),
    edit.photoSaved ? SOCIAL.profile.discardPhotoSaved : "",
    edit.videoSaved ? SOCIAL.profile.discardVideoSaved : "",
  ].filter(Boolean);
  const body = (
    <>
      <h2 id={titleId} className={SOCIAL_PROFILE_EDIT_DISCARD_TITLE_CLASS}>
        {SOCIAL.profile.discardTitle}
      </h2>
      {notes.map((note) => (
        <p key={note} className={SOCIAL_PROFILE_EDIT_DISCARD_LINE_CLASS}>
          {note}
        </p>
      ))}
      <div
        className={
          variant === "strip" ? SOCIAL_PROFILE_EDIT_DISCARD_ACTIONS_CLASS : SOCIAL_PROFILE_EDIT_DISCARD_SHEET_ACTIONS_CLASS
        }
      >
        {variant === "strip" ? (
          <>
            <Button
              variant="secondary"
              data-social-profile-edit-discard=""
              className={SOCIAL_PROFILE_EDIT_DISCARD_BUTTON_CLASS}
              onClick={onDiscard}
            >
              {SOCIAL.profile.discardConfirm}
            </Button>
            <Button
              ref={keepRef}
              data-social-profile-edit-keep=""
              className={SOCIAL_PROFILE_EDIT_DISCARD_BUTTON_CLASS}
              onClick={onKeep}
            >
              {SOCIAL.profile.discardKeep}
            </Button>
          </>
        ) : (
          <>
            <Button
              ref={keepRef}
              data-social-profile-edit-keep=""
              className={SOCIAL_PROFILE_EDIT_DISCARD_BUTTON_CLASS}
              onClick={onKeep}
            >
              {SOCIAL.profile.discardKeep}
            </Button>
            <Button
              variant="secondary"
              data-social-profile-edit-discard=""
              className={SOCIAL_PROFILE_EDIT_DISCARD_BUTTON_CLASS}
              onClick={onDiscard}
            >
              {SOCIAL.profile.discardConfirm}
            </Button>
          </>
        )}
      </div>
    </>
  );
  if (variant === "strip") {
    return (
      <div
        data-social-profile-edit-discard-ask=""
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={SOCIAL_PROFILE_EDIT_DISCARD_STRIP_CLASS}
      >
        {body}
      </div>
    );
  }
  return (
    <AppSheetFrame span="card" titleId={titleId}>
      <HouseScrim label={SOCIAL.profile.discardKeep} onClose={onKeep} />
      <AppSheetCard className="gap-[var(--space-3)]">
        <div data-social-profile-edit-discard-ask="" className="flex flex-col gap-[var(--space-3)]">
          {body}
        </div>
      </AppSheetCard>
    </AppSheetFrame>
  );
}

// Phone: the full-screen sheet on /social/profile/edit. Desktop opens the
// window over the profile instead (the route hops there).
export function SocialProfileEditForm(props: SocialProfileEditProps) {
  const router = useRouter();
  const edit = useSocialProfileEditDraft(props);
  const [asking, setAsking] = useState(false);
  // Set when the ask is for leaving Edit to another screen (the camera).
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const askTitleId = "social-profile-edit-discard-title";
  useSocialProfileEditLeaveGuard(edit.dirty);

  function onDone() {
    edit.save({
      leave: () => router.push(SOCIAL_ROUTES.profile),
      onPersistFailed: () => router.replace(SOCIAL_ROUTES.profileEdit),
    });
  }

  function onDiscard() {
    edit.discard();
    setAsking(false);
    if (leaveHref) {
      rememberSocialGoLiveOpener(`${window.location.pathname}${window.location.search}`);
      router.push(leaveHref);
      return;
    }
    router.push(SOCIAL_ROUTES.profile);
  }

  function keepEditing() {
    setAsking(false);
    setLeaveHref(null);
  }

  useEffect(() => {
    if (!asking) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") keepEditing();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking]);

  if (edit.face !== "edit") {
    return (
      <SocialProfileEditFaceHostProvider
        value={{ kind: "sheet", error: edit.error, pending: edit.pending || edit.cropOpen, onDone }}
      >
        <SocialProfileEditFaceSwitch edit={edit} />
      </SocialProfileEditFaceHostProvider>
    );
  }

  return (
    <>
      <div data-social-profile-edit="" data-house-overlay-host="app-sheet" className={SOCIAL_PROFILE_EDIT_HOST_CLASS}>
        <div className={SOCIAL_PROFILE_EDIT_SHEET_CLASS}>
          <header data-social-profile-edit-header="" className={SOCIAL_PROFILE_EDIT_HEADER_CLASS}>
            <HouseLink
              href={SOCIAL_ROUTES.profile}
              className={SOCIAL_PROFILE_EDIT_BACK_CLASS}
              aria-label={SOCIAL.profile.back}
              onClick={(event) => {
                // A changed username is with the server: stay until it answers.
                if (edit.pending) {
                  event.preventDefault();
                  return;
                }
                // With changes, leaving asks first (Keep editing · Discard).
                if (!edit.dirty) return;
                event.preventDefault();
                setLeaveHref(null);
                setAsking(true);
              }}
            >
              <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
            </HouseLink>
            <h1 className="min-w-0 flex-1 text-center text-[17px] font-semibold text-ink">{SOCIAL.profile.edit}</h1>
            <button
              type="button"
              data-social-profile-edit-done=""
              disabled={edit.pending || edit.cropOpen}
              aria-busy={edit.pending}
              onClick={onDone}
              className={SOCIAL_PROFILE_EDIT_DONE_CLASS}
            >
              {SOCIAL.profile.done}
            </button>
          </header>
          <div className={SOCIAL_PROFILE_EDIT_BODY_CLASS} inert={edit.pending} aria-busy={edit.pending || undefined}>
            <SocialProfileEditIndexBody
              edit={edit}
              onLeave={(href) => {
                setLeaveHref(href);
                setAsking(true);
              }}
            />
          </div>
        </div>
      </div>
      <SocialProfileAvatarSheet
        open={edit.avatarSheet}
        hasPhoto={Boolean(edit.previewPhoto)}
        pending={edit.uploading}
        onClose={() => edit.setAvatarSheet(false)}
        onPick={edit.beginCrop}
        onRemove={() => void edit.onPhotoRemove()}
      />
      {asking ? (
        <SocialProfileEditDiscardAsk
          edit={edit}
          variant="sheet"
          titleId={askTitleId}
          onKeep={keepEditing}
          onDiscard={onDiscard}
        />
      ) : null}
    </>
  );
}
