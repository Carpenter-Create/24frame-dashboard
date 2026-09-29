"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSocialBio } from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { FormError } from "./social-form-error";

export function SocialBioForm({ bio }: { bio: string }) {
  const [error, setError] = useState("");
  return (
    <form
      data-social-bio-form=""
      className="flex max-w-md flex-col gap-[var(--space-3)]"
      action={async (formData) => {
        setError("");
        const result = await updateSocialBio(formData);
        if (result.error) setError(result.error);
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-bio">{SOCIAL.profile.bio}</Label>
        <Textarea
          id="social-bio"
          name="bio"
          rows={3}
          defaultValue={bio}
        />
      </div>
      <FormError error={error} />
      <Button type="submit" variant="secondary">
        {SOCIAL.profile.bioSubmit}
      </Button>
    </form>
  );
}
