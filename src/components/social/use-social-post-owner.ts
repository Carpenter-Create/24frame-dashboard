"use client";

import { useEffect, useLayoutEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";

import { useHousePathname } from "@/components/chrome/house-client-shell";
import { isHouseDesktop, useHouseDesktop } from "@/components/chrome/house-overlay";
import { useAppQueryClient } from "@/components/query-provider";
import { useSocialPostCaptionWindow } from "@/components/social/social-post-caption-context";
import { focusSocialPostEntry, socialPostRemoveFocusNext } from "@/components/social/social-post-focus";
import { houseWindowFocusables } from "@/lib/house-window";
import { SOCIAL } from "@/lib/social";
import type { SocialPostMediaItem } from "@/lib/social-author-post-card";
import { persistSocialPostDelete } from "@/lib/social-optimistic";
import { hideSocialPost } from "@/lib/social-post-own";
import {
  SOCIAL_POST_OWNER_CLOSED,
  socialPostOwnerHost,
  socialPostOwnerReduce,
  socialPostOwnerTabTarget,
  socialPostOwnerTooSoon,
} from "@/lib/social-post-owner";

// A post's ⋯, run (docs/design-locks/social-post-owner-menu-lock-v1.md): the
// state is lib's socialPostOwnerReduce; this hook holds the request, focus,
// keys, the scroll lock and the address close. The server decides who may
// remove a post (the route, RLS and the author trigger); nothing here does.

export type SocialPostOwnerPost = {
  postId: string;
  /** The caption the server sent with the card. */
  serverBody: string | null;
  /** The stored media, as the server counts it. */
  hasMedia: boolean;
  /** The media the card draws: shown read-only in the caption window. */
  media: readonly SocialPostMediaItem[];
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
};

/** What a desktop popover item handed focus to, for Radix's close. */
type Handoff = "edit" | "remove" | null;

export function useSocialPostOwner(post: SocialPostOwnerPost) {
  const { postId, groupSlug } = post;
  const router = useRouter();
  const queryClient = useAppQueryClient();
  // Edit caption opens the one caption host on the Social layout; no host,
  // no Edit caption (never a dead control).
  const caption = useSocialPostCaptionWindow();
  const desktop = useHouseDesktop();
  const pathname = useHousePathname();
  const [state, dispatch] = useReducer(socialPostOwnerReduce, SOCIAL_POST_OWNER_CLOSED);
  const host = socialPostOwnerHost(state, desktop);

  const phoneTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  // Tab and focus-in root: the phone card's wrapper (both faces).
  const surfaceRef = useRef<HTMLDivElement>(null);
  // The ask's own panel: focus holds there while the removal waits.
  const panelRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const inFlight = useRef(false);
  const openedOn = useRef<string | null>(null);
  const handoff = useRef<Handoff>(null);

  /** The ⋯ drawn for this width (one of the two is display:none). */
  function trigger(): HTMLButtonElement | null {
    return isHouseDesktop() ? desktopTriggerRef.current : phoneTriggerRef.current;
  }

  function returnFocus() {
    const target = trigger();
    window.requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
    });
  }

  function openSheet() {
    openedOn.current = pathname;
    caption?.warm();
    dispatch({ type: "menu", surface: "sheet" });
  }

  function onPopoverOpenChange(open: boolean) {
    if (!open) {
      dispatch({ type: "popoverClosed" });
      return;
    }
    openedOn.current = pathname;
    handoff.current = null;
    caption?.warm();
    dispatch({ type: "menu", surface: "popover" });
  }

  function chooseRemove() {
    handoff.current = "remove";
    openedOn.current = pathname;
    shownAt.current = performance.now();
    dispatch({ type: "confirm" });
  }

  function chooseEdit() {
    if (!caption) return;
    handoff.current = "edit";
    const target = trigger();
    // Focus waits on the ⋯ (never the page) until the window takes it, with
    // no later frame that could take it back from the window.
    target?.focus();
    dispatch({ type: "dismiss" });
    caption.open({
      postId,
      serverBody: post.serverBody,
      hasMedia: post.hasMedia,
      media: post.media,
      authorName: post.authorName,
      authorPhotoUrl: post.authorPhotoUrl,
      groupSlug,
      trigger: target,
    });
  }

  /** Keep, Esc, the scrim and an address change: nothing while the removal
   *  is with the server; otherwise closed, and focus back on the ⋯. */
  function dismiss() {
    if (inFlight.current) return;
    dispatch({ type: "dismiss" });
    returnFocus();
  }

  function dismissFromScrim() {
    // The second click of a double-click lands on the confirm's new scrim.
    if (state.step === "confirm" && socialPostOwnerTooSoon(shownAt.current, performance.now())) return;
    dismiss();
  }

  async function remove(): Promise<void> {
    // One request; and never the second tap of a double tap on the menu's
    // Remove row, which lands on this button.
    if (inFlight.current) return;
    if (socialPostOwnerTooSoon(shownAt.current, performance.now())) return;
    inFlight.current = true;
    dispatch({ type: "submit" });
    const form = new FormData();
    form.set("post_id", postId);
    if (groupSlug) form.set("group_slug", groupSlug);
    let error: string;
    try {
      error = (await persistSocialPostDelete(form)).error ?? "";
    } catch {
      error = SOCIAL.post.deleteFailed;
    } finally {
      inFlight.current = false;
    }
    if (error) {
      dispatch({ type: "failed", error });
      return;
    }
    // Read before the post is hidden: its copies leave the page with it.
    const next = socialPostRemoveFocusNext(trigger(), postId);
    hideSocialPost(postId);
    dispatch({ type: "removed" });
    void queryClient?.invalidateQueries({ queryKey: ["social", "following-wall"] });
    router.refresh();
    if (next) focusSocialPostEntry(next);
  }

  /** Radix returns focus to the ⋯ after the popover closes; a chosen item
   *  hands it over instead. Remove: Keep already has it. Edit caption: the
   *  ⋯ holds it until the window opens and takes it. */
  function onDesktopCloseAutoFocus(event: Event) {
    const chosen = handoff.current;
    handoff.current = null;
    if (!chosen) return;
    event.preventDefault();
    if (chosen === "edit" && !document.activeElement?.closest('[aria-modal="true"]')) {
      desktopTriggerRef.current?.focus();
    }
  }

  // Latest handlers for the one document listener and the address close.
  const latest = useRef({ state, dismiss });
  useLayoutEffect(() => {
    latest.current = { state, dismiss };
  });

  // A width change closes a menu drawn for the other width; a confirm stays.
  useEffect(() => {
    dispatch({ type: "host", desktop });
  }, [desktop]);

  // A different house pathname closes an idle menu or confirm, as the
  // account sheet does. No popstate listener: a window's late Back must not
  // close a sheet opened in that gap.
  useEffect(() => {
    const open = openedOn.current;
    if (latest.current.state.step === "closed" || open === null || open === pathname) return;
    latest.current.dismiss();
  }, [pathname]);

  // The sheet's first row takes focus as it rises.
  const sheetMenu = state.step === "menu" && state.surface === "sheet";
  useEffect(() => {
    if (!sheetMenu) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const surface = surfaceRef.current;
      if (surface) houseWindowFocusables(surface)[0]?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sheetMenu]);

  // While the sheet or the confirm is open (never the popover, which Radix
  // runs): Esc, Tab kept inside, and the page under it held still.
  const surfaceOpen = host !== null;
  useEffect(() => {
    if (!surfaceOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        latest.current.dismiss();
        return;
      }
      if (event.key !== "Tab") return;
      const surface = surfaceRef.current ?? panelRef.current;
      if (!surface) return;
      const active = document.activeElement;
      const target = socialPostOwnerTabTarget(houseWindowFocusables(surface), active, event.shiftKey, surface.contains(active));
      if (target === null) return;
      event.preventDefault();
      (target === "panel" ? panelRef.current : target)?.focus();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [surfaceOpen]);

  return {
    state,
    host,
    canEdit: caption !== null,
    surfaceRef,
    panelRef,
    phoneTriggerRef,
    desktopTriggerRef,
    openSheet,
    onPopoverOpenChange,
    chooseEdit,
    chooseRemove,
    dismiss,
    dismissFromScrim,
    remove,
    onDesktopCloseAutoFocus,
  };
}
