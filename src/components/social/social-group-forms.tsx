"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSocialGroup, joinSocialGroup } from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { FormError } from "./social-form-error";

export function SocialJoinGroupButton({
  groupId,
  groupSlug,
}: {
  groupId: string;
  groupSlug: string;
}) {
  const [error, setError] = useState("");
  return (
    <form
      action={async (formData) => {
        setError("");
        const result = await joinSocialGroup(formData);
        if (result.error) setError(result.error);
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="group_slug" value={groupSlug} />
      <Button type="submit" variant="secondary">
        {SOCIAL.groups.join}
      </Button>
      <FormError error={error} />
    </form>
  );
}

export function SocialGroupCreateForm() {
  const [error, setError] = useState("");
  return (
    <form
      data-social-group-form=""
      className="flex max-w-md flex-col gap-[var(--space-4)]"
      action={async (formData) => {
        setError("");
        const result = await createSocialGroup(formData);
        if (result?.error) setError(result.error);
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-group-name">{SOCIAL.groupNew.name}</Label>
        <Input id="social-group-name" name="name" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-group-slug">{SOCIAL.groupNew.slug}</Label>
        <Input id="social-group-slug" name="slug" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="social-group-description">{SOCIAL.groupNew.description}</Label>
        <Textarea
          id="social-group-description"
          name="description"
          rows={3}
        />
      </div>
      <FormError error={error} />
      <Button type="submit">{SOCIAL.groupNew.submit}</Button>
    </form>
  );
}
