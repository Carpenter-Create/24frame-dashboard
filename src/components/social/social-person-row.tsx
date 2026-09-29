import Link from "next/link";

import {
  SOCIAL_PERSON_PRIMARY_CLASS,
  SOCIAL_PERSON_SECONDARY_CLASS,
} from "@/lib/social-chrome";
import { socialPersonIdentity } from "@/lib/social";

import { SocialAvatar } from "./social-avatar";

export function SocialPersonRow({
  handle,
  displayName,
  photoUrl,
  href,
  size = "sm",
}: {
  handle: string;
  displayName?: string | null;
  photoUrl?: string | null;
  href?: string;
  size?: "sm" | "md";
}) {
  const person = socialPersonIdentity({ handle, displayName });
  const stack = (
    <>
      <SocialAvatar name={person.avatarName} photoUrl={photoUrl} size={size} />
      <span className="min-w-0">
        <span data-social-person-handle="" className={SOCIAL_PERSON_PRIMARY_CLASS}>
          {person.handleLabel}
        </span>
        {person.name ? (
          <span data-social-person-name="" className={SOCIAL_PERSON_SECONDARY_CLASS}>
            {person.name}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = "flex min-w-0 items-center gap-[10px]";
  return href ? (
    <Link href={href} data-social-person-row="" className={className}>
      {stack}
    </Link>
  ) : (
    <span data-social-person-row="" className={className}>
      {stack}
    </span>
  );
}
