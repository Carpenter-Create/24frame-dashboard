"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateSocialBio } from "@/app/(app)/social/actions";
import { useAppQueryClient } from "@/components/query-provider";
import { applyOptimisticSocialProfilePatch, invalidateSocialQueries } from "@/lib/social-query";
import { SocialProfileEditFace } from "@/components/social/social-profile-edit-face";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_PROFILE_BIO_CARD_CLASS } from "@/lib/social-chrome";
import {
  BIO_MAX,
  SOCIAL,
  SOCIAL_ROUTES,
  normalizeBio,
  socialBioCounterLabel,
  socialBioFieldValue,
} from "@/lib/social";

/** The counter, the field and the privacy line: one Bio face, two saves. */
export function SocialProfileBioField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <>
      <div data-social-bio-form="" className={SOCIAL_PROFILE_BIO_CARD_CLASS}>
        <div className="flex items-center justify-between">
          <p className="t-label font-semibold tracking-[0.05em] text-ink-2">{SOCIAL.profile.bioLabel}</p>
          <p data-social-bio-count="" className="t-label text-ink-2">
            {socialBioCounterLabel(value)}
          </p>
        </div>
        <Textarea
          variant="bare"
          id="social-bio"
          name="bio"
          data-social-bio-textarea=""
          rows={6}
          maxLength={BIO_MAX}
          value={value}
          onChange={(e) => onChange(socialBioFieldValue(e.target.value))}
          className="min-h-[120px] resize-none leading-[22px]"
        />
      </div>
      <p data-social-bio-privacy="" className="t-body-sm text-ink-2">
        {SOCIAL.profile.bioPrivacy}
      </p>
    </>
  );
}

/** Bio inside Edit profile: part of the one draft, saved by Edit's one Done. */
export function SocialProfileBioDraftEditor({
  value,
  onChange,
  onBack,
}: {
  value: string;
  onChange: (next: string) => void;
  onBack: () => void;
}) {
  return (
    <SocialProfileEditFace face="bio" title={SOCIAL.profile.bio} onBack={onBack}>
      <SocialProfileBioField value={socialBioFieldValue(value)} onChange={onChange} />
    </SocialProfileEditFace>
  );
}

/** The Home prompt's standalone Bio route: its own check saves Bio alone. */
export function SocialProfileBioEditor({
  profileId,
  bio,
}: {
  profileId?: string;
  bio: string;
}) {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const [value, setValue] = useState(socialBioFieldValue(bio));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function onDone() {
    if (pending) return;
    setError("");
    const next = normalizeBio(value) ?? "";
    const form = new FormData();
    form.set("bio", value);
    setPending(true);
    if (queryClient && profileId) {
      applyOptimisticSocialProfilePatch(queryClient, profileId, { bio: next || null });
    }
    router.push(SOCIAL_ROUTES.profileEdit);
    void updateSocialBio(form).then((result) => {
      if (!result.error) return;
      if (queryClient && profileId) invalidateSocialQueries(queryClient, { profileId });
      setError(result.error);
    }).finally(() => {
      setPending(false);
    });
  }

  return (
    <SocialProfileEditFace
      face="bio"
      title={SOCIAL.profile.bio}
      backHref={SOCIAL_ROUTES.profileEdit}
      done={{
        attr: "data-social-bio-done",
        onClick: () => void onDone(),
        pending,
        icon: true,
      }}
    >
      <SocialProfileBioField value={value} onChange={setValue} />
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
    </SocialProfileEditFace>
  );
}
