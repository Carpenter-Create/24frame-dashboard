import type { ReactNode } from "react";
import Link from "next/link";

import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialIcon } from "@/components/social/social-icon";
import {
  DM_THREAD_HEADER_AVATAR_CLASS,
  DM_THREAD_HEADER_BACK_CLASS,
  DM_THREAD_HEADER_CLASS,
  DM_THREAD_HEADER_HOST_CLASS,
  DM_THREAD_HEADER_LABEL_CLASS,
  DM_THREAD_HEADER_PEER_CLASS,
} from "@/lib/social-dm-thread-format";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";

// DM thread peer chrome. Other surfaces keep the house page lead.
// docs/design-locks/dm-thread-header-density-lock-v1.md
export function SocialDmThreadHeader({
  label,
  href,
  photoUrl,
  avatarName,
  face,
}: {
  label: string;
  href: string | null;
  photoUrl: string | null;
  avatarName: string;
  face?: ReactNode;
}) {
  const portrait =
    face ??
    (avatarName ? (
      <SocialAvatar
        name={avatarName}
        photoUrl={photoUrl}
        size="sm"
        className={DM_THREAD_HEADER_AVATAR_CLASS}
      />
    ) : null);
  const name = <span className={DM_THREAD_HEADER_LABEL_CLASS}>{label}</span>;
  const peer = (
    <>
      {portrait}
      {name}
    </>
  );
  return (
    <header data-social-dm-header="" className={DM_THREAD_HEADER_HOST_CLASS}>
      <div className={DM_THREAD_HEADER_CLASS}>
        <Link
          href={SOCIAL_ROUTES.dms}
          aria-label={SOCIAL.dms.title}
          className={DM_THREAD_HEADER_BACK_CLASS}
        >
          <SocialIcon name="caret-left" size={20} />
        </Link>
        {href ? (
          <Link href={href} data-social-dm-peer="" className={DM_THREAD_HEADER_PEER_CLASS}>
            {peer}
          </Link>
        ) : (
          <div data-social-dm-peer="" className={DM_THREAD_HEADER_PEER_CLASS}>
            {peer}
          </div>
        )}
      </div>
    </header>
  );
}
