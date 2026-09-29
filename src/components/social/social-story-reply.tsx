"use client";

import { useState } from "react";

import { openSocialDm } from "@/app/(app)/social/actions";
import { SOCIAL_STORY_REPLY_PILL_CLASS } from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";
import { FormError } from "./social-form-error";

export function SocialStoryReply({
  peerId,
  placeholder = SOCIAL.stories.reply,
}: {
  peerId: string;
  placeholder?: string;
}) {
  const [error, setError] = useState("");
  return (
    <form
      data-social-story-reply=""
      className="flex min-w-0 flex-1 flex-col gap-1"
      action={async (formData) => {
        setError("");
        const result = await openSocialDm(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <input type="hidden" name="peer_id" value={peerId} />
      <button type="submit" className={SOCIAL_STORY_REPLY_PILL_CLASS}>
        {placeholder}
      </button>
      <FormError error={error} />
    </form>
  );
}
