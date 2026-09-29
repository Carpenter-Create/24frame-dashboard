"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DM_THREAD_COMPOSER_CAMERA_CLASS,
  DM_THREAD_COMPOSER_CAMERA_GLYPH,
  DM_THREAD_COMPOSER_CLASS,
  DM_THREAD_COMPOSER_FIELD_CLASS,
  DM_THREAD_COMPOSER_ROW_CLASS,
  DM_THREAD_COMPOSER_SEND_CLASS,
} from "@/lib/social-dm-thread-format";
import { SOCIAL_MEDIA_ACCEPT } from "@/lib/social-media";
import { SOCIAL } from "@/lib/social";
import { sendSocialDm, setSocialDmTitle } from "@/app/(app)/social/actions";
import { SocialIcon } from "./social-icon";
import { FormError } from "./social-form-error";

export function SocialDmCompose({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <form
      data-social-dm-form=""
      data-social-dm-composer=""
      className={DM_THREAD_COMPOSER_CLASS}
      action={async (formData) => {
        setError("");
        const result = await sendSocialDm(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className={DM_THREAD_COMPOSER_ROW_CLASS}>
        <label className="sr-only" htmlFor="social-dm-body">
          {SOCIAL.dms.compose}
        </label>
        <div className={DM_THREAD_COMPOSER_FIELD_CLASS}>
          <Input
            id="social-dm-body"
            name="body"
            variant="bare"
            required
            autoComplete="off"
            enterKeyHint="send"
            placeholder={SOCIAL.dms.threadPlaceholder}
            className="w-full"
          />
        </div>
        <button type="submit" aria-label={SOCIAL.dms.submit} className={DM_THREAD_COMPOSER_SEND_CLASS}>
          <SocialIcon name="paper-plane-tilt" size={18} />
        </button>
        <button
          type="button"
          data-social-dm-camera=""
          aria-label={SOCIAL.home.attach}
          className={DM_THREAD_COMPOSER_CAMERA_CLASS}
          onClick={() => fileRef.current?.click()}
        >
          <SocialIcon name="camera" size={DM_THREAD_COMPOSER_CAMERA_GLYPH} className="text-ink" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={SOCIAL_MEDIA_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          data-social-dm-attach-input=""
          aria-label={SOCIAL.home.attach}
          onChange={(event) => {
            // Library open only. No DM media insert on this path.
            event.currentTarget.value = "";
          }}
        />
      </div>
      <FormError error={error} />
    </form>
  );
}

export function SocialGroupTitleForm({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string | null;
}) {
  const [error, setError] = useState("");
  return (
    <form
      data-social-group-title=""
      className="flex max-w-md flex-col gap-[var(--space-3)]"
      action={async (formData) => {
        setError("");
        const result = await setSocialDmTitle(formData);
        if (result.error) setError(result.error);
      }}
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-dm-title">{SOCIAL.dms.titleLabel}</Label>
        <Input
          id="social-dm-title"
          name="title"
          defaultValue={title ?? ""}
          autoComplete="off"
        />
        <p className="t-body-sm text-ink-3">{SOCIAL.dms.titleHint}</p>
      </div>
      <FormError error={error} />
      <Button type="submit" variant="secondary">
        {SOCIAL.dms.titleSave}
      </Button>
    </form>
  );
}
