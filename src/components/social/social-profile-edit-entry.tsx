"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useHouseClient } from "@/components/chrome/house-client-shell";
import { HouseLink } from "@/components/chrome/house-link";
import { isHouseDesktop } from "@/components/chrome/house-overlay";
import { useSocialOwnProfileIdentity } from "@/components/social/social-own-profile";
import { SocialProfileEditWindow } from "@/components/social/social-profile-edit-window";
import { cn } from "@/lib/cn";
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
// Desktop: a button that opens the window over this profile and adds a
// ?edit entry on the same screen (no route change, no skeleton), so browser
// Back closes it. ?edit[=face] from a link opens it the same way.
//
// The ?edit entry is written with the browser's own history calls and no
// shell marker for Next to skip, so Next keeps it as its address: a server
// action under the window (a new photo) never writes a stale address back.
// A window always has this profile without ?edit underneath it, so browser
// Back reaches the ask and never leaves the page with the draft.

const EDIT_ENTRY_STATE = { houseClient: true, socialProfileEdit: true } as const;

function isEditEntry(): boolean {
  const state = window.history.state as { socialProfileEdit?: boolean; houseClient?: boolean } | null;
  return state?.socialProfileEdit === true || state?.houseClient === true;
}

export function pushEditEntry(face: SocialProfileEditFace) {
  window.history.pushState(
    EDIT_ENTRY_STATE,
    "",
    socialProfileEditWindowOpenHref(window.location.pathname, window.location.search, face),
  );
}

function stripEditEntry() {
  window.history.replaceState(
    EDIT_ENTRY_STATE,
    "",
    socialProfileEditWindowClosedHref(window.location.pathname, window.location.search),
  );
}

/** ?edit arrived with the page (the Home prompt's Bio, a link): rewrite this
 *  entry as the profile without ?edit, then push the window's own on top.
 *  The rewrite keeps Next's own state (its marker passes the call straight
 *  through), so Next's address stays on ?edit and the window never blinks. */
function installEditEntry(face: SocialProfileEditFace) {
  window.history.replaceState(
    { ...(window.history.state as object | null), ...EDIT_ENTRY_STATE },
    "",
    socialProfileEditWindowClosedHref(window.location.pathname, window.location.search),
  );
  pushEditEntry(face);
}

function addressHasEdit(): boolean {
  return parseSocialProfileEditWindow(window.location.search) !== null;
}

export function SocialProfileEditEntry() {
  const identity = useSocialOwnProfileIdentity();
  const house = useHouseClient();
  const [win, setWin] = useState<{ face: SocialProfileEditFace; key: number } | null>(null);
  // A closed window's save still with the server.
  const [saving, setSaving] = useState(false);
  const winRef = useRef(win);
  const mountedRef = useRef(false);
  const keyRef = useRef(0);
  // Did this window push its ?edit entry (Back pops it), or was ?edit
  // already in the address when the pill opened it (closing strips it)?
  const pushedRef = useRef(false);
  const closingRef = useRef(false);
  const requestRef = useRef<(() => boolean) | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const prevEdit = useRef<SocialProfileEditFace | null>(null);
  // The address the shell shows. Read whatever the width: a resize is never
  // ?edit leaving (below md the window stays mounted, hidden, keeping its draft).
  const editFace = parseSocialProfileEditWindow(house?.search ?? "");

  function open(face: SocialProfileEditFace, pushed: boolean) {
    keyRef.current += 1;
    const next = { face, key: keyRef.current };
    winRef.current = next;
    pushedRef.current = pushed;
    closingRef.current = false;
    setWin(next);
  }

  function onPill() {
    if (winRef.current) return;
    const pushed = !addressHasEdit();
    if (pushed) pushEditEntry("edit");
    open("edit", pushed);
  }

  /** Only the window that is open now may close it. */
  function closeWindow(key: number) {
    if (winRef.current?.key !== key) return;
    winRef.current = null;
    setWin(null);
    if (addressHasEdit()) {
      if (pushedRef.current) {
        closingRef.current = true;
        window.history.back();
      } else {
        stripEditEntry();
      }
    }
    pushedRef.current = false;
    window.requestAnimationFrame(() => pillRef.current?.focus());
  }

  /** A save that failed after its window closed: reopen at the face, seeded
   *  with the failed draft and its error. A window opened meanwhile waited
   *  for this answer (nothing typed in it), so it reopens at the face too. */
  function reopenAfterFailure(face: SocialProfileEditFace) {
    if (!mountedRef.current) return;
    if (winRef.current) {
      open(face, pushedRef.current);
      return;
    }
    pushEditEntry(face);
    open(face, true);
  }

  function onPersisting(settled: Promise<void>) {
    setSaving(true);
    void settled.finally(() => {
      if (mountedRef.current) setSaving(false);
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The address drives the window: ?edit arriving opens it (on a computer);
  // ?edit leaving (browser Back) asks the window to close. With changes it
  // asks first, and its entry goes back so the next Back asks again.
  useEffect(() => {
    const prev = prevEdit.current;
    prevEdit.current = editFace;
    if (editFace !== null && prev === null) {
      if (!winRef.current && !closingRef.current && isHouseDesktop()) {
        if (!isEditEntry()) installEditEntry(editFace);
        open(editFace, true);
      }
      return;
    }
    if (editFace === null && prev !== null) {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      if (!winRef.current) return;
      // Still on ?edit: the entry going in underneath, not Back.
      if (addressHasEdit()) return;
      const closed = requestRef.current ? requestRef.current() : true;
      if (closed) return;
      pushEditEntry("edit");
      pushedRef.current = true;
    }
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
          waiting={saving}
          onClose={() => closeWindow(win.key)}
          onPersistFailed={reopenAfterFailure}
          onPersisting={onPersisting}
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

/** Empty Interests (owner) on a computer: open the window at Topics over this
 *  profile, the Interests tab kept behind it. The href stays for a new tab. */
export function SocialProfileEditTopicsLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a
      href={socialProfileEditWindowHref("topics", "interests")}
      data-social-profile-interests-edit=""
      data-social-profile-interests-edit-window=""
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (addressHasEdit()) return;
        pushEditEntry("topics");
      }}
    >
      {children}
    </a>
  );
}
