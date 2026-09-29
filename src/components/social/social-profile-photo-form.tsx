"use client";

import { useRef, useState } from "react";

import { uploadAccountPhoto } from "@/app/(app)/account/actions";
import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES, isAvatarContentType } from "@/lib/account-avatar";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import { SOCIAL } from "@/lib/social";
import { FormError } from "./social-form-error";

export function SocialProfilePhotoForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!isAvatarContentType(file.type)) {
      setError(ACCOUNT_PROFILE.photoType);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(ACCOUNT_PROFILE.photoTooLarge);
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.set("photo", file);
    const res = await uploadAccountPhoto(body);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.error) {
      setError(res.error);
      return;
    }
  }

  return (
    <div data-social-profile-photo="" className="flex flex-col gap-[var(--space-2)]">
      <button
        type="button"
        className={TEXT_ACTION_CLASS}
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? SOCIAL.profile.uploadingPhoto : SOCIAL.profile.uploadPhoto}
      </button>
      <input
        ref={fileRef}
        id="social-profile-photo"
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        aria-label={SOCIAL.profile.uploadPhoto}
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <FormError error={error} />
    </div>
  );
}
