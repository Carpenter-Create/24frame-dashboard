"use client";

import { type MutableRefObject } from "react";
import { useRouter } from "next/navigation";

import { HouseWindowFrame, useHouseWindow } from "@/components/chrome/house-window";
import { SocialIcon } from "@/components/social/social-icon";
import { SocialProfileAvatarSheet } from "@/components/social/social-profile-avatar-sheet";
import {
  SocialProfileEditDiscardAsk,
  SocialProfileEditFaceSwitch,
  SocialProfileEditIndexBody,
  useSocialProfileEditDraft,
  type SocialProfileEditProps,
} from "@/components/social/social-profile-edit";
import { SocialProfileEditFaceHostProvider } from "@/components/social/social-profile-edit-face";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import { SOCIAL } from "@/lib/social";
import { rememberSocialGoLiveOpener } from "@/lib/social-go-live-nav";
import { socialProfileEditIndexHref, type SocialProfileEditFace } from "@/lib/social-profile-edit";

// Desktop Edit profile: the house window over the live profile
// (docs/design-locks/social-profile-edit-window-lock-v1.md, Adam 2026-10-09,
// "build it"), on the house window shell (components/chrome/house-window).
// The faces push inside one still frame; one Done saves everything and the
// change is already on the profile as the window leaves. Leaving with
// changes asks inside the window. Esc closes the nearest layer: the photo
// menu, the crop, the ask (Keep editing), a face (Back), then the window.

const FACE_TITLES: Record<SocialProfileEditFace, string> = {
  edit: SOCIAL.profile.edit,
  name: SOCIAL.profile.name,
  handle: SOCIAL.profile.username,
  roles: SOCIAL.profile.roles,
  topics: SOCIAL.profile.topics,
  imdb: SOCIAL.profile.imdb,
  links: SOCIAL.profile.links,
  bio: SOCIAL.profile.bio,
};

export type SocialProfileEditWindowRequest = MutableRefObject<(() => boolean) | null>;

export function SocialProfileEditWindow({
  requestRef,
  waiting = false,
  onClose,
  onPersistFailed,
  onPersisting,
  ...props
}: SocialProfileEditProps & {
  /** The island asks the window to close (browser Back). True when it closed. */
  requestRef?: SocialProfileEditWindowRequest;
  /** An earlier window's save is still with the server: hold until it
   *  answers, so a failure reaches this window instead of hiding behind it. */
  waiting?: boolean;
  /** Leave: after Done, after Discard, or a close with nothing changed. */
  onClose: () => void;
  /** The background save failed after the window left: reopen at that face. */
  onPersistFailed: (face: SocialProfileEditFace) => void;
  /** The background save is out. */
  onPersisting?: (settled: Promise<void>) => void;
}) {
  const router = useRouter();
  const edit = useSocialProfileEditDraft(props);
  // A changed username, or an earlier save, is with the server: nothing
  // leaves or changes until it answers.
  const busy = edit.pending || waiting;
  // A picture or video still uploading saves on its own: leaving (or Done)
  // waits for it, so it never runs on after Edit has closed.
  const holdOpen = busy || edit.uploading;

  const [win, winRefs] = useHouseWindow({
    attr: "social-profile-edit",
    face: edit.face,
    indexFace: "edit",
    cameFrom: edit.cameFrom,
    dirty: edit.dirty,
    busy,
    holdOpen,
    onDone: () =>
      edit.save({
        leave: onClose,
        // The window stays on the mounted profile: no save-hop cover.
        stayOnPage: true,
        onPersistFailed,
        onPersisting,
      }),
    onBack: edit.backToIndex,
    onClose,
    onDiscard: edit.discard,
    // The photo menu, then the crop, before the ask, a face, the window.
    escapeLayer: () => {
      if (edit.avatarSheet) {
        closeMenu();
        return true;
      }
      if (edit.cropOpen) {
        edit.clearCrop();
        return true;
      }
      return false;
    },
    requestRef,
  });

  function closeMenu() {
    edit.setAvatarSheet(false);
    win.restoreFocus("[data-social-profile-edit-picture]");
  }

  /** Leaving Edit for another screen (the camera) with changes: ask first. */
  function askLeave(href: string) {
    win.ask(() => {
      rememberSocialGoLiveOpener(socialProfileEditIndexHref(window.location.pathname, window.location.search));
      router.push(href);
    });
  }

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={FACE_TITLES[edit.face]}
      motion={edit.motion}
      closeLabel={SOCIAL.create.close}
      backLabel={SOCIAL.profile.back}
      doneLabel={SOCIAL.profile.done}
      closeIcon={<SocialIcon name="x" size={SOCIAL_ICON_SIZE_HEADER} />}
      backIcon={<SocialIcon name="caret-left" size={SOCIAL_ICON_SIZE_HEADER} />}
      doneDisabled={edit.cropOpen}
      ask={
        <SocialProfileEditDiscardAsk
          edit={edit}
          variant="strip"
          titleId={win.askTitleId}
          onKeep={win.keepEditing}
          onDiscard={win.discard}
        />
      }
    >
      {win.atIndex ? (
        <SocialProfileEditIndexBody
          edit={edit}
          onLeave={askLeave}
          avatarMenu={
            <SocialProfileAvatarSheet
              open={edit.avatarSheet}
              hasPhoto={Boolean(edit.previewPhoto)}
              pending={edit.uploading}
              placement="inline"
              onClose={closeMenu}
              onPick={edit.beginCrop}
              onRemove={() => void edit.onPhotoRemove()}
            />
          }
        />
      ) : (
        <SocialProfileEditFaceHostProvider value={{ kind: "window", error: edit.error }}>
          <SocialProfileEditFaceSwitch edit={edit} />
        </SocialProfileEditFaceHostProvider>
      )}
    </HouseWindowFrame>
  );
}
