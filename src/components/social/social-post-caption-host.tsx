"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";

import { useHouseClient } from "@/components/chrome/house-client-shell";
import { useHouseWindowEntry } from "@/components/chrome/house-window";
import { useAppQueryClient } from "@/components/query-provider";
import {
  SocialPostCaptionContext,
  type SocialPostCaptionRequest,
  type SocialPostCaptionWindowApi,
} from "@/components/social/social-post-caption-context";
import { houseAddressSettled } from "@/lib/house-client-shell";
import { saveSocialPostCaption } from "@/lib/social-optimistic";
import {
  SOCIAL_POST_CAPTION_ENTRY_FLAG,
  parseSocialPostCaptionWindow,
  readSocialPostCaptionSaving,
  readSocialPostHidden,
  socialPostCaptionWindowClosedHref,
  socialPostCaptionWindowOpenHref,
  socialPostLiveBody,
  subscribeSocialPostOwn,
  type SocialPostCaptionFace,
} from "@/lib/social-post-own";

// The one Edit caption host (docs/design-locks/social-post-caption-window-lock-v1.md),
// on the Social layout, which stays mounted across every Social page. Every owner
// menu asks it (social-post-caption-context), so there is one `?caption`
// entry and one caption window at a time, and a background save that fails
// can reopen its window even after the page under it changed. The window's
// code loads on first use (the ⋯ menu warms it).

const SocialPostCaptionWindow = dynamic(() =>
  import("./social-post-caption-window").then((mod) => mod.SocialPostCaptionWindow),
);

function warmSocialPostCaptionWindow() {
  void import("./social-post-caption-window");
}

type CaptionTarget = SocialPostCaptionRequest & {
  /** The caption as it showed when the window opened, held for its life. */
  baseline: string | null;
  draft: string;
  error: string;
};

export function SocialPostCaptionHost({ children }: { children: ReactNode }) {
  const house = useHouseClient();
  const queryClient = useAppQueryClient();
  const [target, setTarget] = useState<CaptionTarget | null>(null);
  // The window open now (null while none is): read by handlers between renders.
  const targetRef = useRef<CaptionTarget | null>(null);
  // An Edit chosen while the address was still moving (a Home lane loading,
  // or the last window's Back still landing): it opens once that lands.
  const queuedRef = useRef<SocialPostCaptionRequest | null>(null);
  // Failed saves waiting for the open window (or a landing close) to finish.
  const failedRef = useRef<CaptionTarget[]>([]);
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  // The ⋯ of the window that just closed: focus goes back to it.
  const returnRef = useRef<HTMLElement | null>(null);
  const settled = house ? houseAddressSettled(house.href, `${house.nextPathname}${house.nextSearch}`) : true;

  const entry = useHouseWindowEntry<SocialPostCaptionFace>({
    flag: SOCIAL_POST_CAPTION_ENTRY_FLAG,
    indexFace: "caption",
    parse: parseSocialPostCaptionWindow,
    openHref: socialPostCaptionWindowOpenHref,
    closedHref: socialPostCaptionWindowClosedHref,
    // The address names no post and a reload has no draft: nothing opens.
    opensOnArrival: () => false,
    returnFocus: () => {
      const node = returnRef.current;
      returnRef.current = null;
      if (targetRef.current || !node?.isConnected) return null;
      return node;
    },
  });
  const win = entry.win;

  // A save of the open window's post is still out: it waits, inert, Done held.
  const waitingFor = target?.postId ?? null;
  const waiting = useSyncExternalStore(
    subscribeSocialPostOwn,
    () => (waitingFor ? readSocialPostCaptionSaving(waitingFor) : false),
    () => false,
  );

  function show(next: CaptionTarget, failed: boolean) {
    targetRef.current = next;
    setTarget(next);
    if (failed) entry.reopenAfterFailure("caption");
    else entry.openFromPage("caption");
  }

  function open(request: SocialPostCaptionRequest) {
    // One caption window at a time.
    if (targetRef.current) return;
    if (!latest.current.settled || closingRef.current) {
      queuedRef.current = request;
      return;
    }
    const baseline = socialPostLiveBody(request.postId, request.serverBody);
    show({ ...request, baseline, draft: baseline ?? "", error: "" }, false);
  }

  function close(key: number) {
    if (win?.key !== key) return;
    closingRef.current = true;
    returnRef.current = targetRef.current?.trigger ?? null;
    targetRef.current = null;
    setTarget(null);
    entry.close(key, landed);
  }

  // The address is the page's again (Back has landed).
  function landed() {
    closingRef.current = false;
    latest.current.drain();
  }

  function drain() {
    if (targetRef.current || closingRef.current || !latest.current.settled) return;
    while (failedRef.current.length > 0) {
      const failed = failedRef.current.shift()!;
      if (readSocialPostHidden(failed.postId)) continue;
      show({ ...failed, baseline: socialPostLiveBody(failed.postId, failed.serverBody) }, true);
      return;
    }
    const queued = queuedRef.current;
    queuedRef.current = null;
    // Its card left the page meanwhile: nothing opens.
    if (queued?.trigger?.isConnected) open(queued);
  }

  function fail(request: CaptionTarget, draft: string, error: string) {
    if (!mountedRef.current) return;
    // Removed meanwhile: there is nothing to reopen.
    if (readSocialPostHidden(request.postId)) return;
    const next: CaptionTarget = {
      ...request,
      baseline: socialPostLiveBody(request.postId, request.serverBody),
      draft,
      error,
    };
    const current = targetRef.current;
    if (current?.postId === request.postId) {
      // That window waited for this answer (nothing typed in it): it reopens
      // in place with the draft and the line.
      targetRef.current = next;
      setTarget(next);
      entry.reopenAfterFailure("caption");
      return;
    }
    // Another post's window is open, a close is landing, or the address is
    // still moving: it reopens once that is done.
    if (current || closingRef.current || !latest.current.settled) {
      failedRef.current.push(next);
      return;
    }
    show(next, true);
  }

  function save(saving: CaptionTarget, key: number, body: string | null, draft: string) {
    // The words show before the window leaves; the save runs behind it.
    void saveSocialPostCaption({
      postId: saving.postId,
      body,
      groupSlug: saving.groupSlug,
      onSaved: () => {
        void queryClient?.invalidateQueries({ queryKey: ["social", "following-wall"] });
      },
      onFailed: (error) => fail(saving, draft, error),
    });
    close(key);
  }

  // Latest handlers for callbacks that outlive a render (the context, Back
  // landing, a save answering).
  const latest = useRef({ open, drain, settled });
  useLayoutEffect(() => {
    latest.current = { open, drain, settled };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The address landed (a Home lane change): run what waited for it. A
  // landing close drains from its own callback.
  useEffect(() => {
    if (settled) latest.current.drain();
  }, [settled]);

  const api = useMemo<SocialPostCaptionWindowApi>(
    () => ({
      open: (request) => latest.current.open(request),
      warm: warmSocialPostCaptionWindow,
    }),
    [],
  );

  return (
    <SocialPostCaptionContext.Provider value={api}>
      {children}
      {win && target ? (
        <SocialPostCaptionWindow
          key={win.key}
          authorName={target.authorName}
          authorPhotoUrl={target.authorPhotoUrl}
          media={target.media}
          hasMedia={target.hasMedia}
          baseline={target.baseline}
          initialDraft={target.draft}
          initialError={target.error}
          waiting={waiting}
          requestRef={entry.requestRef}
          onSave={(body, draft) => save(target, win.key, body, draft)}
          onClose={() => close(win.key)}
        />
      ) : null}
    </SocialPostCaptionContext.Provider>
  );
}
