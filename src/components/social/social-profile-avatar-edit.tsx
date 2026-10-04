"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { uploadAccountPhoto } from "@/app/(app)/account/actions";
import { AccountAvatarCrop } from "@/components/account/account-avatar-crop";
import { SocialIcon } from "@/components/social/social-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import {
  accountAvatarPickError,
  cropAvatarFile,
  readAccountAvatarCropPreview,
  type AvatarCropFrame,
} from "@/lib/account-avatar-crop";
import { AVATAR_ACCEPT } from "@/lib/account-avatar";
import { SOCIAL_PROFILE_AVATAR_EDIT_CLASS } from "@/lib/social-chrome";
import { coverTrailTarget } from "@/lib/social-profile-cover-menu";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { patchSocialProfileOptimistic } from "@/lib/social-profile-edit";

// Owner avatar edit on the profile hero. The inline crop opens in the trail
// under the hero (docs/design-locks/social-profile-stage-lock-v1.md), never
// over the cover photo; without a trail it stays inline.
export function SocialProfileAvatarEdit() {
  const fileRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [trail, setTrail] = useState<HTMLElement | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [cropSize, setCropSize] = useState<{ width: number; height: number } | null>(null);

  function clearCrop() {
    if (cropPreview) URL.revokeObjectURL(cropPreview);
    setCropFile(null);
    setCropPreview(null);
    setCropSize(null);
    if (fileRef.current) fileRef.current.value = "";
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
        setTrail(coverTrailTarget(buttonRef.current));
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
      patchSocialProfileOptimistic({ photoUrl: blobUrl });
      clearCrop();
      setUploading(true);
      const body = new FormData();
      body.set("photo", cropped);
      const res = await uploadAccountPhoto(body);
      if (res.error) {
        patchSocialProfileOptimistic({ photoUrl: null });
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

  const crop =
    cropFile && cropPreview && cropSize ? (
      <AccountAvatarCrop
        previewUrl={cropPreview}
        imageWidth={cropSize.width}
        imageHeight={cropSize.height}
        onCancel={clearCrop}
        onConfirm={(frame) => void onCropConfirm(frame)}
      />
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-social-profile-avatar-edit=""
        disabled={uploading}
        aria-busy={uploading}
        aria-label={SOCIAL.profile.editPicture}
        className={SOCIAL_PROFILE_AVATAR_EDIT_CLASS}
        onClick={() => fileRef.current?.click()}
      >
        <SocialIcon name="pencil-simple" size={SOCIAL_ICON_SIZE_HEADER} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => beginCrop(e.target.files?.[0])}
      />
      {crop && trail?.isConnected ? createPortal(crop, trail) : crop}
      {error ? (
        <div className="sr-only" aria-live="polite">
          <InlineNotice tone="error">{error}</InlineNotice>
        </div>
      ) : null}
    </>
  );
}
