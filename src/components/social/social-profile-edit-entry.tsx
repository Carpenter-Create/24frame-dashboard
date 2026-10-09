"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useHouseClient } from "@/components/chrome/house-client-shell";
import { HouseLink } from "@/components/chrome/house-link";
import { isHouseDesktop, useHouseDesktop } from "@/components/chrome/house-overlay";
import { useSocialOwnProfileIdentity } from "@/components/social/social-own-profile";
import { SocialProfileEditWindow } from "@/components/social/social-profile-edit-window";
import { cn } from "@/lib/cn";
import { houseClientHistoryState } from "@/lib/house-client-shell";
import { SOCIAL_PROFILE_ACTION_PILL_CLASS } from "@/lib/social-chrome";
import { SOCIAL, SOCIAL_ROUTES, socialProfileEditWindowHref } from "@/lib/social";
import {
  parseSocialProfileEditWindow,
  socialProfileEditWindowClosedHref,
  socialProfileEditWindowOpenHref,
  type SocialProfileEditFace,
} from "@/lib/social-profile-edit";

// The owner's Edit profile pill (docs/design-locks/social-profile-edit-window-lock-v1.md).
// Phone: a link to the full-screen sheet on /social/profile/edit.
// Desktop: a button that opens the window over this profile, as a panel
// hop to ?edit on the mounted screen (no route change, no skeleton), so
// browser Back closes it. ?edit[=face] from a link opens it the same way.

function isShellPushedEntry(): boolean {
  const state = window.history.state as { houseClient?: boolean } | null;
  return state?.houseClient === true;
}

export function SocialProfileEditEntry() {
  const identity = useSocialOwnProfileIdentity();
  const house = useHouseClient();
  const desktop = useHouseDesktop();
  const [win, setWin] = useState<{ face: SocialProfileEditFace; key: number } | null>(null);
  const winRef = useRef(win);
  const keyRef = useRef(0);
  // Did this window's ?edit entry come from a push on this screen (Back
  // pops it) or arrive with the page (closing strips it in place)?
  const pushedRef = useRef(false);
  const closingRef = useRef(false);
  const requestRef = useRef<(() => boolean) | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const prevEdit = useRef<SocialProfileEditFace | null>(null);
  const search = house?.search ?? "";
  const editFace = desktop ? parseSocialProfileEditWindow(search) : null;

  function open(face: SocialProfileEditFace, pushed: boolean) {
    keyRef.current += 1;
    const next = { face, key: keyRef.current };
    winRef.current = next;
    pushedRef.current = pushed;
    closingRef.current = false;
    setWin(next);
  }

  // The address the shell shows (its owned panel query included).
  function where() {
    return {
      pathname: house?.pathname ?? window.location.pathname,
      search: house?.search ?? window.location.search,
    };
  }

  function onPill() {
    if (winRef.current) return;
    const at = where();
    const before = `${window.location.pathname}${window.location.search}`;
    const already = parseSocialProfileEditWindow(at.search) !== null;
    const pushed =
      !already &&
      Boolean(house?.navigateOwned(socialProfileEditWindowOpenHref(at.pathname, at.search))) &&
      `${window.location.pathname}${window.location.search}` !== before;
    open("edit", pushed);
  }

  function closeWindow() {
    winRef.current = null;
    setWin(null);
    if (parseSocialProfileEditWindow(window.location.search) !== null) {
      closingRef.current = true;
      if (pushedRef.current) {
        window.history.back();
      } else {
        window.history.replaceState(
          houseClientHistoryState(window.history.state),
          "",
          socialProfileEditWindowClosedHref(window.location.pathname, window.location.search),
        );
      }
    }
    pushedRef.current = false;
    window.requestAnimationFrame(() => pillRef.current?.focus());
  }

  // The address drives the window: ?edit arriving opens it; ?edit leaving
  // (browser Back) asks the window to close. With changes it asks first,
  // and its entry goes back so the next Back asks again.
  useEffect(() => {
    const prev = prevEdit.current;
    prevEdit.current = editFace;
    if (editFace !== null && prev === null) {
      if (!winRef.current && !closingRef.current) open(editFace, isShellPushedEntry());
      return;
    }
    if (editFace === null && prev !== null) {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      if (!winRef.current) return;
      const closed = requestRef.current ? requestRef.current() : true;
      if (closed) return;
      const at = where();
      const pushed = Boolean(house?.navigateOwned(socialProfileEditWindowOpenHref(at.pathname, at.search)));
      pushedRef.current = pushed;
    }
    // house is read at the moment of a transition only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFace]);

  return (
    <>
      <HouseLink
        href={SOCIAL_ROUTES.profileEdit}
        data-social-profile-edit-entry=""
        className={cn(SOCIAL_PROFILE_ACTION_PILL_CLASS, "md:hidden")}
      >
        {SOCIAL.profile.edit}
      </HouseLink>
      <button
        ref={pillRef}
        type="button"
        data-social-profile-edit-entry=""
        data-social-profile-edit-entry-window=""
        aria-haspopup="dialog"
        aria-expanded={win !== null}
        className={cn(SOCIAL_PROFILE_ACTION_PILL_CLASS, "max-md:hidden")}
        onClick={onPill}
      >
        {SOCIAL.profile.edit}
      </button>
      {win && identity ? (
        <SocialProfileEditWindow
          key={win.key}
          profileId={identity.profileId}
          handle={identity.handle}
          displayName={identity.displayName}
          bio={identity.bio}
          photoUrl={identity.photoUrl}
          welcomeVideoUrl={identity.welcomeVideoUrl}
          crafts={identity.crafts}
          topics={identity.topics}
          imdbUrl={identity.imdbUrl}
          websiteUrl={identity.websiteUrl}
          initialFace={win.face}
          requestRef={requestRef}
          onClose={closeWindow}
          onPersistFailed={(face) => open(face, false)}
        />
      ) : null}
    </>
  );
}

/** /social/profile/edit[?face=] and /edit/bio on a computer: Edit is the
 *  window over the profile, so the route hands over to it in place. */
export function SocialProfileEditDesktopHop({ face = "edit" }: { face?: SocialProfileEditFace }) {
  const router = useRouter();
  useEffect(() => {
    if (!isHouseDesktop()) return;
    router.replace(socialProfileEditWindowHref(face));
  }, [face, router]);
  return null;
}
