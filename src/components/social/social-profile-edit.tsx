"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";

import { removeAccountPhoto, uploadAccountPhoto } from "@/app/(app)/account/actions";
import { HouseDrawerFrame, useHouseDesktop } from "@/components/chrome/house-overlay";
import { HouseLink } from "@/components/chrome/house-link";
import { clearSocialWelcomeVideo, saveSocialWelcomeVideo } from "@/app/(app)/social/actions";
import { AccountAvatarCrop } from "@/components/account/account-avatar-crop";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SettingsDrillRow } from "@/components/settings/settings-drill";
import { SocialProfileAvatarSheet } from "@/components/social/social-profile-avatar-sheet";
import { SocialProfileBioEditor } from "@/components/social/social-profile-bio";
import { SocialProfileHandleEditor } from "@/components/social/social-profile-handle-edit";
import { SocialProfileImdbEditor } from "@/components/social/social-profile-imdb";
import { SocialProfileLinksEditor } from "@/components/social/social-profile-links-edit";
import { SocialProfileNameEditor } from "@/components/social/social-profile-name";
import { SocialProfileRolesEditor } from "@/components/social/social-profile-roles";
import { SocialProfileTopicsEditor } from "@/components/social/social-profile-topics";
import { SocialIcon } from "@/components/social/social-icon";
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
import { uploadSocialMuxVideoFile } from "@/lib/social-media-upload";
import { SOCIAL_WELCOME_VIDEO_PRESENT } from "@/lib/social-query";
import {
  SOCIAL_PROFILE_EDIT_AVATAR_CLASS,
  SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS,
  SOCIAL_PROFILE_EDIT_BACK_CLASS,
  SOCIAL_PROFILE_EDIT_BODY_CLASS,
  SOCIAL_PROFILE_EDIT_CARD_CLASS,
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
  patchSocialProfileOptimistic,
  persistSocialProfileEdit,
  socialProfileBioRowSummary,
  socialProfileEditFace,
  socialProfileEditSeed,
  socialProfileHandleRowSummary,
  socialProfileNameRowSummary,
  socialProfileOptimisticFail,
  socialProfilePersistNotice,
  type SocialProfileEditFace,
} from "@/lib/social-profile-edit";
import {
  applyOptimisticSocialProfile,
  applyOptimisticSocialProfilePatch,
  invalidateSocialQueries,
} from "@/lib/social-query";

function EditHeader({
  title,
  backHref,
  done,
  pending,
}: {
  title: string;
  backHref: string;
  done: () => void;
  pending: boolean;
}) {
  return (
    <header data-social-profile-edit-header="" className={SOCIAL_PROFILE_EDIT_HEADER_CLASS}>
      <HouseLink href={backHref} className={SOCIAL_PROFILE_EDIT_BACK_CLASS} aria-label={SOCIAL.profile.back}>
        <SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />
      </HouseLink>
      <h1 className="min-w-0 flex-1 text-center text-[17px] font-semibold text-ink">{title}</h1>
      <button
        type="button"
        data-social-profile-edit-done=""
        disabled={pending}
        aria-busy={pending}
        onClick={done}
        className={SOCIAL_PROFILE_EDIT_DONE_CLASS}
      >
        {SOCIAL.profile.done}
      </button>
    </header>
  );
}

export function SocialProfileEditForm({
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
}: {
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
}) {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const welcomeRef = useRef<HTMLInputElement>(null);
  const seed = socialProfileEditSeed({
    handle,
    displayName,
    bio,
    photoUrl,
    coverUrl: null,
    welcomeVideoUrl,
    crafts,
    topics,
    imdbUrl: imdbUrl ?? "",
    websiteUrl: websiteUrl ?? "",
  });
  const split = splitSocialDisplayName(seed.displayName);
  const [firstName, setFirstName] = useState(split.firstName);
  const [middleName, setMiddleName] = useState(split.middleName);
  const [lastName, setLastName] = useState(split.lastName);
  const [username, setUsername] = useState(handleFieldValue(seed.handle));
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
  const desktop = useHouseDesktop();
  const [bioText, setBioText] = useState(seed.bio);
  const [roles, setRoles] = useState(() => parseSocialProfileRoles(seed.crafts));
  const [interestTopics, setInterestTopics] = useState(() => parseSocialProfileTopics(seed.topics));
  const [imdb, setImdb] = useState(seed.imdbUrl ?? "");
  const [previewPhoto, setPreviewPhoto] = useState(seed.photoUrl);
  const [welcomePreview, setWelcomePreview] = useState(seed.welcomeVideoUrl);
  const [linkDrafts, setLinkDrafts] = useState(() => {
    const urls = parseSocialWebsiteUrlField(seed.websiteUrl);
    return urls.length > 0 ? urls : [""];
  });
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
    }
  }

  async function onWelcomePick(file: File | undefined) {
    if (!file || uploading) return;
    setError("");
    const previous = welcomePreview;
    setUploading(true);
    const uploaded = await uploadSocialMuxVideoFile(file, { lane: "posts" });
    if (uploaded.error || uploaded.aborted || !uploaded.item) {
      setUploading(false);
      if (welcomeRef.current) welcomeRef.current.value = "";
      if (!uploaded.aborted) setError(uploaded.error ?? SOCIAL.home.uploadFailed);
      return;
    }
    const save = new FormData();
    save.set("media", JSON.stringify([uploaded.item]));
    const result = await saveSocialWelcomeVideo(save);
    setUploading(false);
    if (welcomeRef.current) welcomeRef.current.value = "";
    if (result.error) {
      setWelcomePreview(previous);
      patchSocialProfileOptimistic({ welcomeVideoUrl: previous });
      setError(result.error);
      return;
    }
    setWelcomePreview(SOCIAL_WELCOME_VIDEO_PRESENT);
    patchSocialProfileOptimistic({ welcomeVideoUrl: SOCIAL_WELCOME_VIDEO_PRESENT });
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
    }
  }

  function onDone() {
    if (pending) return;
    setError("");
    setHandleError("");
    const checked = checkSocialProfileEditSave({
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
    });
    if (!checked.ok) {
      if (checked.handleError) {
        setHandleError(checked.handleError);
        setFace(socialProfileEditFace("handle"));
      }
      if (checked.error) setError(checked.error);
      if (
        checked.error === SOCIAL.profile.firstNameRequired ||
        checked.error === SOCIAL.profile.lastNameRequired
      ) {
        setFace(socialProfileEditFace("name"));
      }
      return;
    }
    flushSync(() => {
      applySocialProfileOptimistic(checked.snapshot);
      setPending(true);
    });
    if (queryClient && profileId) {
      applyOptimisticSocialProfile(queryClient, {
        id: profileId,
        handle: checked.snapshot.handle ?? username,
        display_name: checked.snapshot.displayName ?? composeSocialDisplayName(firstName, lastName, middleName),
        status: "active",
        bio: checked.snapshot.bio ?? bioText,
        crafts: [...(checked.snapshot.crafts ?? roles)],
        topics: [...(checked.snapshot.topics ?? interestTopics)],
        imdb_url: checked.snapshot.imdbUrl?.trim() || null,
        website_url: checked.snapshot.websiteUrl ?? composeSocialWebsiteUrlField(linkDrafts.filter(Boolean)),
      });
    }
    router.push(SOCIAL_ROUTES.profile);
    void persistSocialProfileEdit(checked.form).then((result) => {
      if (!result.error) return;
      if (queryClient && profileId) invalidateSocialQueries(queryClient, { profileId });
      applySocialProfileOptimistic(socialProfileOptimisticFail(checked.snapshot, result.error));
      if (
        result.error === SOCIAL.profile.handleRequired ||
        result.error === SOCIAL.profile.handleInvalid ||
        result.error === SOCIAL.profile.handleTaken
      ) {
        setHandleError(result.error);
        setFace(socialProfileEditFace("handle"));
      } else {
        setError(result.error);
      }
      router.replace(SOCIAL_ROUTES.profileEdit);
    }).catch((cause) => {
      const notice = socialProfilePersistNotice(cause, ACCOUNT_PROFILE.saveFailed);
      applySocialProfileOptimistic(socialProfileOptimisticFail(checked.snapshot, notice));
      setError(notice);
      router.replace(SOCIAL_ROUTES.profileEdit);
    }).finally(() => {
      setPending(false);
    });
  }

  if (face === "name") {
    return (
      <SocialProfileNameEditor
        firstName={firstName}
        middleName={middleName}
        lastName={lastName}
        onSave={(next) => {
          setFirstName(next.firstName);
          setMiddleName(next.middleName);
          setLastName(next.lastName);
          setError("");
        }}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "handle") {
    return (
      <SocialProfileHandleEditor
        value={username}
        error={handleError}
        onSave={(next) => {
          setUsername(next);
          setHandleError("");
        }}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "roles") {
    return (
      <SocialProfileRolesEditor
        value={roles}
        onChange={setRoles}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "topics") {
    return (
      <SocialProfileTopicsEditor
        value={interestTopics}
        onChange={setInterestTopics}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "imdb") {
    return (
      <SocialProfileImdbEditor
        value={imdb}
        onChange={setImdb}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "links") {
    return (
      <SocialProfileLinksEditor
        value={linkDrafts}
        onChange={setLinkDrafts}
        onBack={() => setFace(socialProfileEditFace(false))}
      />
    );
  }

  if (face === "bio") {
    return (
      <SocialProfileBioEditor
        profileId={profileId}
        bio={bioText}
        onBack={() => setFace(socialProfileEditFace(false))}
        onSaved={(next) => {
          setBioText(next);
          patchSocialProfileOptimistic({ bio: next, error: "", handleError: "" });
          if (queryClient && profileId) {
            applyOptimisticSocialProfilePatch(queryClient, profileId, { bio: next || null });
          }
          setFace(socialProfileEditFace(false));
        }}
        onPersistError={(notice) => {
          setError(notice);
        }}
      />
    );
  }

  const edit = (
    <div
      data-social-profile-edit=""
      data-house-overlay-host={desktop ? undefined : "app-sheet"}
      className={desktop ? undefined : SOCIAL_PROFILE_EDIT_HOST_CLASS}
    >
      <div className={SOCIAL_PROFILE_EDIT_SHEET_CLASS}>
        <EditHeader
          title={SOCIAL.profile.edit}
          backHref={SOCIAL_ROUTES.profile}
          done={() => void onDone()}
          pending={pending}
        />
        <div className={SOCIAL_PROFILE_EDIT_BODY_CLASS}>
          <div data-social-profile-edit-photo="" className={SOCIAL_PROFILE_EDIT_PHOTO_CLASS}>
            {cropFile && cropPreview && cropSize ? (
              <AccountAvatarCrop
                key={cropPreview}
                previewUrl={cropPreview}
                imageWidth={cropSize.width}
                imageHeight={cropSize.height}
                pending={uploading}
                onCancel={clearCrop}
                onConfirm={(frame) => void onCropConfirm(frame)}
              />
            ) : (
              <>
                <button
                  type="button"
                  disabled={uploading}
                  data-social-profile-edit-avatar-drop=""
                  data-dropping={dropping ? "" : undefined}
                  aria-label={dropping ? ACCOUNT_PROFILE.dropPhoto : SOCIAL.profile.editPicture}
                  className={cn(
                    SOCIAL_PROFILE_EDIT_AVATAR_CLASS,
                    dropping ? SOCIAL_PROFILE_EDIT_AVATAR_DROPPING_CLASS : null,
                  )}
                  onClick={() => setAvatarSheet(true)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                    setDropping(true);
                  }}
                  onDragLeave={() => setDropping(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDropping(false);
                    beginCrop(event.dataTransfer.files[0]);
                  }}
                >
                  <SocialAvatar
                    name={composeSocialDisplayName(firstName, lastName, middleName)}
                    photoUrl={previewPhoto}
                    size="profile"
                    className="size-full"
                  />
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setAvatarSheet(true)}
                  className={SOCIAL_PROFILE_EDIT_PICTURE_CLASS}
                >
                  {dropping
                    ? ACCOUNT_PROFILE.dropPhoto
                    : uploading
                      ? SOCIAL.profile.uploadingPhoto
                      : SOCIAL.profile.editPicture}
                </button>
              </>
            )}
          </div>
          <div data-social-profile-edit-welcome="" className={SOCIAL_PROFILE_EDIT_CARD_CLASS}>
            <div className={`${SOCIAL_PROFILE_EDIT_ROW_CLASS} flex-col gap-2`}>
              <p className={SOCIAL_PROFILE_EDIT_LABEL_CLASS}>{SOCIAL.profile.welcomeVideo}</p>
              {welcomePreview && isLocalMediaPreviewSrc(welcomePreview) ? (
                <video
                  src={welcomePreview}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-surface-muted object-contain"
                />
              ) : welcomePreview ? (
                <div data-social-video-closed="" className="aspect-video w-full bg-surface-muted" />
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => welcomeRef.current?.click()}
                  className={SOCIAL_PROFILE_EDIT_PICTURE_CLASS}
                >
                  {welcomePreview ? SOCIAL.profile.welcomeReplace : SOCIAL.profile.welcomeAdd}
                </button>
                {welcomePreview ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void onWelcomeRemove()}
                    className="t-body-sm font-medium text-ink-2"
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
                aria-label={SOCIAL.profile.welcomeAdd}
                onChange={(e) => void onWelcomePick(e.target.files?.[0])}
              />
            </div>
          </div>
          <div data-social-profile-edit-fields="" className={SOCIAL_PROFILE_EDIT_CARD_CLASS}>
            <SettingsDrillRow
              kind="name"
              label={SOCIAL.profile.name}
              value={socialProfileNameRowSummary(
                composeSocialDisplayName(firstName, lastName, middleName),
              )}
              itemAttr="data-social-profile-edit-name-open"
              onClick={() => setFace(socialProfileEditFace("name"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="handle"
              label={SOCIAL.profile.username}
              value={socialProfileHandleRowSummary(username)}
              itemAttr="data-social-profile-edit-handle-open"
              onClick={() => setFace(socialProfileEditFace("handle"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="roles"
              label={SOCIAL.profile.roles}
              value={socialProfileRolesRowSummary(roles)}
              itemAttr="data-social-profile-edit-roles-open"
              onClick={() => setFace(socialProfileEditFace("roles"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="topics"
              label={SOCIAL.profile.topics}
              value={socialProfileTopicsRowSummary(interestTopics)}
              itemAttr="data-social-profile-edit-topics-open"
              onClick={() => setFace(socialProfileEditFace("topics"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="imdb"
              label={SOCIAL.profile.imdb}
              value={socialProfileImdbRowSummary(imdb)}
              itemAttr="data-social-profile-edit-imdb-open"
              onClick={() => setFace(socialProfileEditFace("imdb"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="links"
              label={SOCIAL.profile.links}
              value={socialProfileLinksRowSummary(linkDrafts)}
              itemAttr="data-social-profile-edit-links-open"
              onClick={() => setFace(socialProfileEditFace("links"))}
            />
            <div className="h-px bg-hairline" />
            <SettingsDrillRow
              kind="bio"
              label={SOCIAL.profile.bio}
              value={socialProfileBioRowSummary(bioText)}
              itemAttr="data-social-profile-edit-bio-open"
              onClick={() => setFace(socialProfileEditFace(true))}
            />
          </div>
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {desktop ? (
        <HouseDrawerFrame
          label={SOCIAL.profile.edit}
          onClose={() => router.push(SOCIAL_ROUTES.profile)}
          closeLabel={SOCIAL.profile.back}
        >
          {edit}
        </HouseDrawerFrame>
      ) : (
        edit
      )}
      <SocialProfileAvatarSheet
        open={avatarSheet}
        hasPhoto={Boolean(previewPhoto)}
        pending={uploading}
        onClose={() => setAvatarSheet(false)}
        onPick={beginCrop}
        onRemove={() => void onPhotoRemove()}
      />
    </>
  );
}
