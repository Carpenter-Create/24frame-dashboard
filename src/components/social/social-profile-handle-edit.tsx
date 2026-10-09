"use client";

import { SocialHandleField } from "@/components/social/social-handle-field";
import { SocialProfileEditFace } from "@/components/social/social-profile-edit-face";
import { SOCIAL, handleFieldValue, socialHandleDisplayError } from "@/lib/social";

// The Username face writes into Edit's one draft as you type: Back keeps
// it. Edit's one save checks it (and waits for the server when it changed).
export function SocialProfileHandleEditor({
  value,
  error = "",
  onChange,
  onBack,
}: {
  value: string;
  error?: string;
  onChange: (next: string) => void;
  onBack: () => void;
}) {
  const username = handleFieldValue(value);
  return (
    <SocialProfileEditFace face="handle" title={SOCIAL.profile.username} onBack={onBack}>
      <div data-social-profile-edit-handle="" className="flex flex-col">
        <SocialHandleField
          id="social-edit-handle"
          name="handle"
          value={username}
          onValueChange={(next) => onChange(handleFieldValue(next))}
          appearance="edit"
          showPreviewUrl={false}
          error={error ? socialHandleDisplayError(username, error) : ""}
        />
      </div>
    </SocialProfileEditFace>
  );
}
