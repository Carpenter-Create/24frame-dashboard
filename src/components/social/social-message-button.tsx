"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { openSocialDm } from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { FormError } from "./social-form-error";

export function SocialMessageButton({ peerId }: { peerId: string }) {
  const [error, setError] = useState("");
  return (
    <form
      data-social-open-dm=""
      action={async (formData) => {
        setError("");
        const result = await openSocialDm(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <input type="hidden" name="peer_id" value={peerId} />
      <Button type="submit">{SOCIAL.member.message}</Button>
      <FormError error={error} />
    </form>
  );
}
