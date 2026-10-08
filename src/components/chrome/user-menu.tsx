"use client";

import type { ComponentProps } from "react";

import { signOut } from "@/app/actions";
import { accountPhotoSrc } from "@/lib/account-avatar";
import { userMenuAvatarInitial, userMenuName } from "@/lib/user-menu";
import { DesktopAccountMenu, MobileAccountMenu } from "./account-sheet";
import { IdentityPhoto } from "./house";
import { MenuDualHost } from "./menu-dual-host";

/** Family A phone host. Same sheet as MobileAccountMenu — one primitive. */
export function PhoneAccountMenu(props: ComponentProps<typeof MobileAccountMenu>) {
  return <MobileAccountMenu {...props} />;
}

export function onUserMenuLogOut(): void {
  void signOut();
}

export function UserMenuIdentity({
  email,
  name,
  photoUrl,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}) {
  const displayName = userMenuName(name);
  const initial = userMenuAvatarInitial(email);
  const face = accountPhotoSrc(photoUrl);

  return (
    <div
      data-user-menu-identity=""
      className="flex items-center gap-[var(--space-4)]"
    >
      <div
        data-user-menu-avatar=""
        data-identity-photo={face ? "" : undefined}
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted t-body text-ink-2"
      >
        <IdentityPhoto avatarInitial={initial} photoUrl={photoUrl} />
      </div>
      <div className="min-w-0">
        {displayName ? (
          <div data-user-menu-name="" className="break-words t-heading text-ink">
            {displayName}
          </div>
        ) : null}
        <div data-user-menu-email="" className="truncate t-body-sm text-ink-3">
          {email}
        </div>
      </div>
    </div>
  );
}

// isGcStaff is the server's gc_staff answer (getOrgContext), never a
// cookie. Off by default: a member's menu has no Staff row.
export function UserMenu({
  email,
  name,
  photoUrl,
  isGcStaff = false,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  isGcStaff?: boolean;
}) {
  return (
    <MenuDualHost
      shape="slot"
      phone={
        <PhoneAccountMenu email={email} name={name} photoUrl={photoUrl} isGcStaff={isGcStaff} />
      }
      desktop={
        <DesktopAccountMenu email={email} name={name} photoUrl={photoUrl} isGcStaff={isGcStaff} />
      }
    />
  );
}
