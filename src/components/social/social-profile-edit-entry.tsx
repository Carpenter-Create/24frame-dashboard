"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { HouseLink } from "@/components/chrome/house-link";
import { isHouseDesktop } from "@/components/chrome/house-overlay";
import { useHouseWindowEntry } from "@/components/chrome/house-window";
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
// The ?edit entry is the house window shell's (useHouseWindowEntry): the
// browser's own history calls with no shell marker, so Next keeps ?edit as
// its address, and always this profile without ?edit underneath it, so
// browser Back reaches the ask and never leaves the page with the draft.

/** Edit's own history flag (a shell entry is never one). */
const EDIT_ENTRY_FLAG = "socialProfileEdit";

/** Push Edit's window entry at `face` (a link's own click). */
export function pushEditEntry(face: SocialProfileEditFace) {
  window.history.pushState(
    { houseClient: true, [EDIT_ENTRY_FLAG]: true },
    "",
    socialProfileEditWindowOpenHref(window.location.pathname, window.location.search, face),
  );
}

function addressHasEdit(): boolean {
  return parseSocialProfileEditWindow(window.location.search) !== null;
}

export function SocialProfileEditEntry() {
  const identity = useSocialOwnProfileIdentity();
  const pillRef = useRef<HTMLButtonElement>(null);
  // The window's entry on this screen (components/chrome/house-window): it
  // opens on a computer only; a phone uses the sheet route.
  const entry = useHouseWindowEntry<SocialProfileEditFace>({
    flag: EDIT_ENTRY_FLAG,
    indexFace: "edit",
    parse: parseSocialProfileEditWindow,
    openHref: socialProfileEditWindowOpenHref,
    closedHref: socialProfileEditWindowClosedHref,
    opensOnArrival: isHouseDesktop,
    returnFocus: () => pillRef.current,
  });
  const win = entry.win;

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
        onClick={() => entry.openFromPage("edit")}
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
          requestRef={entry.requestRef}
          waiting={entry.saving}
          onClose={() => entry.close(win.key)}
          onPersistFailed={entry.reopenAfterFailure}
          onPersisting={entry.onPersisting}
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
      // The shell's own click owner would take this same-screen hop first
      // (an entry Next cannot see, and this handler never running): the
      // house-link mark leaves it to the handler below.
      data-house-link=""
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
