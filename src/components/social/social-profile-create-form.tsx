"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSocialProfile } from "@/app/(app)/social/actions";
import { SOCIAL, socialHandleDisplayError, socialHandleInputError } from "@/lib/social";
import { SocialHandleField } from "./social-handle-field";
import { FormError } from "./social-form-error";

export function SocialProfileCreateForm({
  handle = "",
  displayName = "",
}: {
  handle?: string;
  displayName?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      data-social-profile-form=""
      className="flex max-w-md flex-col gap-[var(--space-4)]"
      action={async (formData) => {
        setPending(true);
        setError("");
        const handle = String(formData.get("handle") ?? "");
        const formatError = socialHandleInputError(handle);
        if (formatError) {
          setPending(false);
          setError(formatError);
          return;
        }
        const result = await createSocialProfile(formData);
        setPending(false);
        if (result.error) setError(result.error);
      }}
    >
      <SocialHandleField
        id="social-handle"
        name="handle"
        defaultHandle={handle}
        onValueChange={(next) => {
          setError((prev) => socialHandleDisplayError(next, prev));
        }}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-display-name">{SOCIAL.profile.displayName}</Label>
        <Input
          id="social-display-name"
          name="display_name"
          autoComplete="nickname"
          defaultValue={displayName}
        />
      </div>
      <FormError error={error} />
      <Button type="submit" disabled={pending}>
        {SOCIAL.profile.submit}
      </Button>
    </form>
  );
}
