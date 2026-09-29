"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";

import { SocialStoryReply } from "@/components/social/social-story-reply";
import { SocialStoryActivitySheet } from "@/components/social/social-story-activity-sheet";
import { SocialStorySaySomething } from "@/components/social/social-story-say";
import { SocialStorySendSheet } from "@/components/social/social-story-send-sheet";
import { SocialStorySentToast } from "@/components/social/social-story-sent-toast";
import { SocialAvatar } from "@/components/social/social-avatar";
import { SocialMediaImage } from "@/components/social/social-media-image";
import { SocialMuxPlayer } from "@/components/social/social-mux-player";
import { SocialIcon } from "@/components/social/social-icon";
import { BRAND_LOGO_DARK_SRC, BRAND_LOGO_HEIGHT_PX } from "@/lib/brand";
import { HOUSE_CLIENT_SHELL } from "@/lib/house-client-shell";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/product";
import {
  SOCIAL_STORY_ACTION_HIT_CLASS,
  SOCIAL_STORY_ACTION_IDLE_CLASS,
  SOCIAL_STORY_ACTIONS_CLUSTER_CLASS,
  SOCIAL_STORY_ACTIONS_ROW_CLASS,
  SOCIAL_STORY_ACTIVATE_NEXT_CLASS,
  SOCIAL_STORY_ACTIVATE_PREV_CLASS,
  SOCIAL_STORY_ACTIVE_CARD_CLASS,
  SOCIAL_STORY_HEART_LIKED_CLASS,
  SOCIAL_STORY_HOLD_SURFACE_CLASS,
  SOCIAL_STORY_CARET_CLASS,
  SOCIAL_STORY_NEIGHBOR_CARD_CLASS,
  SOCIAL_STORY_PROGRESS_BAR_CLASS,
  SOCIAL_STORY_PROGRESS_FILL_CLASS,
  SOCIAL_STORY_PROGRESS_ROW_CLASS,
  SOCIAL_STORY_STAGE_CLASS,
  SOCIAL_STORY_STILL_PROGRESS_MS,
} from "@/lib/social-chrome";
import { SOCIAL_POST_IMAGE_SIZES } from "@/lib/social-media-display";
import { isSocialMuxId } from "@/lib/social-mux";
import { noteStoryMediaPainted } from "@/lib/social-story-open-hold";
import { markSocialStoryViewed } from "@/app/(app)/social/actions";
import { toggleSocialStoryLike } from "@/app/(app)/social/light-actions";
import {
  nextStoryHeart,
  storyAdvanceWhileSending,
  storyHeartCountVisible,
  STORY_SEND_TOAST_MS,
  type SocialStoryLikeState,
} from "@/lib/social-story-actions";
import { SOCIAL, SOCIAL_ROUTES, socialRelativeTime, socialStoryHref } from "@/lib/social";
import {
  storyHoldRelease,
  storyTrayCursor,
  storyTrayStep,
  type SocialStoryTrayAuthor,
  type SocialStoryTrayCursor,
} from "@/lib/social-story-tray";
import type { SocialPostMediaItem } from "@/components/social/social-ui";

export type SocialStoryNeighbor = {
  storyId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  createdAt: string;
  unseen: boolean;
  coverUrl: string | null;
  coverKind: "image" | "video" | null;
};

const STORY_ENTER_KEY = "social-story-enter";
// touchstart preventDefault can cancel the pointer in the same turn. That is not a finger-up.
const STORY_POINTER_CANCEL_IGNORE_MS = 32;

function storyTouchTargetsTextField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("input, textarea, [contenteditable='true']") !== null
  );
}

function consumeStoryEnter(): "next" | "prev" | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(STORY_ENTER_KEY);
    sessionStorage.removeItem(STORY_ENTER_KEY);
    if (value === "next" || value === "prev") return value;
  } catch {
    // Cold open.
  }
  return null;
}

function storyScreen(node: HTMLElement): HTMLElement | null {
  const screen = node.closest(`[${HOUSE_CLIENT_SHELL.screenAttr}]`);
  return screen instanceof HTMLElement ? screen : null;
}

function storyPlaybackHeld(screen: HTMLElement | null, paused: boolean): boolean {
  return paused || screen?.hasAttribute("hidden") === true;
}

function paintStoryEnter(
  stage: HTMLElement | null,
  direction: "next" | "prev",
  apply: (value: "next" | "prev" | null) => void,
) {
  // A keep-alive unhide is already in the DOM. Commit the slide class, and
  // restart it when the last hop used the same direction, before paint.
  flushSync(() => apply(null));
  if (stage) void stage.offsetWidth;
  flushSync(() => apply(direction));
}

function StoryCover({
  url,
  kind,
}: {
  url: string | null;
  kind: "image" | "video" | null;
}) {
  if (!url || kind !== "image") return null;
  return (
    <SocialMediaImage src={url} sizes={SOCIAL_POST_IMAGE_SIZES} alt="" />
  );
}

function NeighborCard({
  neighbor,
  onSelect,
}: {
  neighbor: SocialStoryNeighbor;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-social-story-neighbor={neighbor.storyId}
      aria-label={neighbor.authorName}
      className={cn(SOCIAL_STORY_NEIGHBOR_CARD_CLASS, "border-0 p-0 text-left")}
    >
      <span className="absolute inset-0">
        <StoryCover url={neighbor.coverUrl} kind={neighbor.coverKind} />
      </span>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
        <span
          className={cn(
            "flex size-20 items-center justify-center rounded-full border-[3px] p-0.5",
            neighbor.unseen ? "border-accent" : "border-band-ink/35",
          )}
        >
          <SocialAvatar
            name={neighbor.authorName}
            photoUrl={neighbor.authorPhotoUrl}
            className="size-full"
          />
        </span>
        <span className="max-w-full truncate t-body-sm font-medium text-band-ink">
          {neighbor.authorName}
        </span>
        <span className="t-label text-band-ink/65">{socialRelativeTime(neighbor.createdAt)}</span>
      </span>
    </button>
  );
}

function authorFromNeighbor(neighbor: SocialStoryNeighbor): SocialStoryTrayAuthor {
  return {
    authorId: neighbor.storyId,
    authorName: neighbor.authorName,
    authorPhotoUrl: neighbor.authorPhotoUrl,
    unseen: neighbor.unseen,
    coverUrl: neighbor.coverUrl,
    coverKind: neighbor.coverKind,
    items: [
      {
        id: neighbor.storyId,
        createdAt: neighbor.createdAt,
        body: null,
        media: neighbor.coverUrl
          ? [{ kind: neighbor.coverKind ?? "image", url: neighbor.coverUrl }]
          : [],
      },
    ],
  };
}

function neighborView(
  row: SocialStoryTrayAuthor | undefined,
  edge: "first" | "last",
): SocialStoryNeighbor | null {
  if (!row || row.items.length === 0) return null;
  const target = edge === "first" ? row.items[0] : row.items[row.items.length - 1];
  if (!target) return null;
  return {
    storyId: target.id,
    authorName: row.authorName,
    authorPhotoUrl: row.authorPhotoUrl,
    createdAt: target.createdAt,
    unseen: row.unseen,
    coverUrl: row.coverUrl,
    coverKind: row.coverKind,
  };
}

export function SocialStoryViewer({
  storyId,
  authorId,
  authorName,
  authorPhotoUrl,
  createdAt,
  body,
  media,
  prevAuthor,
  nextAuthor,
  canReply,
  tray,
  selfId,
  likes = {},
}: {
  storyId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  createdAt: string;
  body: string | null;
  media: readonly SocialPostMediaItem[];
  prevId: string | null;
  nextId: string | null;
  prevAuthor: SocialStoryNeighbor | null;
  nextAuthor: SocialStoryNeighbor | null;
  index: number;
  total: number;
  canReply: boolean;
  tray?: readonly SocialStoryTrayAuthor[];
  selfId?: string;
  likes?: Readonly<Record<string, SocialStoryLikeState>>;
}) {
  const router = useRouter();
  const authors = useMemo(() => {
    if (tray && tray.length > 0) return tray;
    const current: SocialStoryTrayAuthor = {
      authorId,
      authorName,
      authorPhotoUrl,
      unseen: false,
      coverUrl: null,
      coverKind: null,
      items: [{ id: storyId, createdAt, body, media }],
    };
    return [
      ...(prevAuthor ? [authorFromNeighbor(prevAuthor)] : []),
      current,
      ...(nextAuthor ? [authorFromNeighbor(nextAuthor)] : []),
    ];
  }, [
    authorId,
    authorName,
    authorPhotoUrl,
    body,
    createdAt,
    media,
    nextAuthor,
    prevAuthor,
    storyId,
    tray,
  ]);
  const [cursor, setCursor] = useState<SocialStoryTrayCursor>(() => storyTrayCursor(authors, storyId));
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audible, setAudible] = useState(true);
  const [audibleFor, setAudibleFor] = useState<string | null>(null);
  const [hop, setHop] = useState<"next" | "prev" | null>(null);
  const [hearts, setHearts] = useState<Record<string, SocialStoryLikeState>>({ ...likes });
  const [heartPending, setHeartPending] = useState(false);
  const [sendItemId, setSendItemId] = useState<string | null>(null);
  const [activityStoryId, setActivityStoryId] = useState<string | null>(null);
  const [sayExpanded, setSayExpanded] = useState(false);
  const [sentToast, setSentToast] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const suppressClick = useRef(false);
  const author = authors[cursor.author];
  const item = author?.items[cursor.item];
  const clip = item?.media[0] ?? null;
  const playable = clip?.kind === "video" ? clip : null;
  const mux = playable?.playbackId && isSocialMuxId(playable.playbackId) ? playable : null;
  const sendSheetOpen = sendItemId !== null;
  const activityOpen = activityStoryId !== null;
  const playbackPaused = paused || held || sendSheetOpen || activityOpen || sayExpanded;
  const presenceId = item?.id ?? "";
  if (presenceId !== audibleFor) {
    setAudibleFor(presenceId);
    setAudible(true);
    setSayExpanded(false);
    setActivityStoryId(null);
  }
  const allowReply = !!author && canReply && (!selfId || author.authorId !== selfId);
  const prevNeighbor = neighborView(authors[cursor.author - 1], "last");
  const nextNeighbor = neighborView(authors[cursor.author + 1], "first");
  const prevStep = author ? storyTrayStep(authors, cursor, "prev") : null;
  const nextStep = author ? storyTrayStep(authors, cursor, "next") : null;

  const go = useCallback(
    (direction: "next" | "prev", reason: "manual" | "auto") => {
      const stage = stageRef.current;
      const screen = stage ? storyScreen(stage) : null;
      if (storyPlaybackHeld(screen, false)) return;
      if (!storyAdvanceWhileSending(sendSheetOpen || activityOpen, reason, paused || held)) return;
      const result = storyTrayStep(authors, cursor, direction);
      if (result === "close") {
        router.push(SOCIAL_ROUTES.home);
        return;
      }
      if (!result) return;
      paintStoryEnter(mediaRef.current, direction, setHop);
      setHeld(false);
      setCursor(result);
    },
    [activityOpen, authors, cursor, held, paused, router, sendSheetOpen],
  );

  const jumpTo = useCallback(
    (authorIndex: number, edge: "first" | "last") => {
      const stage = stageRef.current;
      const screen = stage ? storyScreen(stage) : null;
      if (storyPlaybackHeld(screen, false)) return;
      if (sendSheetOpen) return;
      const row = authors[authorIndex];
      if (!row || row.items.length === 0) return;
      const direction = authorIndex >= cursor.author ? "next" : "prev";
      paintStoryEnter(mediaRef.current, direction, setHop);
      setHeld(false);
      setCursor({
        author: authorIndex,
        item: edge === "first" ? 0 : row.items.length - 1,
      });
    },
    [authors, cursor.author, sendSheetOpen],
  );

  useLayoutEffect(() => {
    const direction = consumeStoryEnter();
    // Commit the segment hop before paint. Open itself stays opaque — a fade from
    // zero is the jump the open-smooth lock forbids.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- commit hop before paint
    if (direction) setHop(direction);
  }, [storyId]);
  useLayoutEffect(() => {
    if (!item) return;
    const first = item.media[0];
    const video = first?.kind === "video" ? first : null;
    if (video?.playbackId && isSocialMuxId(video.playbackId)) return;
    if (first?.kind === "image" && first.url) return;
    noteStoryMediaPainted();
  }, [item]);
  useEffect(() => {
    const stage = stageRef.current;
    const screen = stage ? storyScreen(stage) : null;
    if (!screen) return;
    const observer = new MutationObserver(() => {
      if (screen.hasAttribute("hidden")) return;
      const direction = consumeStoryEnter();
      if (direction) paintStoryEnter(mediaRef.current, direction, setHop);
    });
    observer.observe(screen, { attributes: true, attributeFilter: ["hidden"] });
    return () => observer.disconnect();
  }, [storyId]);
  useEffect(() => {
    if (!sentToast) return undefined;
    const timer = window.setTimeout(() => setSentToast(false), STORY_SEND_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [sentToast]);
  useEffect(() => {
    if (!item || item.id === storyId) return;
    const href = socialStoryHref(item.id);
    if (window.location.pathname !== href) {
      window.history.replaceState(window.history.state, "", href);
    }
    void markSocialStoryViewed(item.id);
  }, [item, storyId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const stage = stageRef.current;
      const screen = stage ? storyScreen(stage) : null;
      // A paused visible story still takes arrows. A hidden keep-alive twin must not.
      if (storyPlaybackHeld(screen, false)) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go("prev", "manual");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go("next", "manual");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const releaseHold = useCallback(
    (point: { clientX: number; clientY: number }) => {
      const start = holdRef.current;
      holdRef.current = null;
      setHeld(false);
      if (!start) return;
      const bounds = mediaRef.current?.getBoundingClientRect();
      const release = storyHoldRelease({
        elapsedMs: performance.now() - start.at,
        dx: point.clientX - start.x,
        dy: point.clientY - start.y,
        width: bounds?.width ?? 0,
        x: point.clientX - (bounds?.left ?? 0),
      });
      suppressClick.current = true;
      if (release === "resume") return;
      go(release, "manual");
    },
    [go],
  );

  useEffect(() => {
    const node = mediaRef.current;
    if (!node) return;
    // React's delegated touchstart is passive, so it cannot cancel iOS selection.
    const blockCallout = (event: TouchEvent) => {
      if (storyTouchTargetsTextField(event.target)) return;
      if (event.cancelable) event.preventDefault();
    };
    const endTouch = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      releaseHold({ clientX: touch.clientX, clientY: touch.clientY });
    };
    node.addEventListener("touchstart", blockCallout, { passive: false, capture: true });
    node.addEventListener("touchend", endTouch);
    node.addEventListener("touchcancel", endTouch);
    return () => {
      node.removeEventListener("touchstart", blockCallout, { capture: true });
      node.removeEventListener("touchend", endTouch);
      node.removeEventListener("touchcancel", endTouch);
    };
  }, [releaseHold, item?.id]);

  function onZonePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdRef.current = { x: event.clientX, y: event.clientY, at: performance.now() };
    setHeld(true);
  }

  function onZonePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    releaseHold(event);
  }

  function onZonePointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = holdRef.current;
    if (!start) return;
    if (performance.now() - start.at < STORY_POINTER_CANCEL_IGNORE_MS) return;
    releaseHold(event);
  }

  function onMediaContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    if (storyTouchTargetsTextField(event.target)) return;
    event.preventDefault();
  }

  function onZoneClick(direction: "next" | "prev") {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    go(direction, "manual");
  }

  async function onHeart() {
    if (!item || heartPending) return;
    const storyItemId = item.id;
    const current = hearts[storyItemId] ?? { liked: false, count: 0 };
    const next = nextStoryHeart(current);
    setHeartPending(true);
    setHearts((prev) => ({ ...prev, [storyItemId]: next }));
    const form = new FormData();
    form.set("story_id", storyItemId);
    form.set("liked", current.liked ? "1" : "0");
    const result = await toggleSocialStoryLike(form);
    if (result?.error) setHearts((prev) => ({ ...prev, [storyItemId]: current }));
    setHeartPending(false);
  }

  if (!author || !item) return null;

  const heart = hearts[item.id] ?? { liked: false, count: 0 };
  const heartLiked = heart.liked;
  const ownStory = !!selfId && author.authorId === selfId;

  return (
    <div
      ref={stageRef}
      data-social-story-stage=""
      className={cn(SOCIAL_STORY_STAGE_CLASS, SOCIAL_STORY_HOLD_SURFACE_CLASS)}
    >
      <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden items-center justify-between p-4 md:flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- dark-stage wordmark; BrandLogo swaps with theme */}
        <img
          src={BRAND_LOGO_DARK_SRC}
          alt={PRODUCT_NAME}
          height={BRAND_LOGO_HEIGHT_PX}
          data-social-story-mark=""
          className="pointer-events-auto h-6 w-auto"
        />
        <Link
          href={SOCIAL_ROUTES.home}
          aria-label={SOCIAL.stories.close}
          className="pointer-events-auto flex size-12 items-center justify-center text-band-ink"
        >
          <SocialIcon name="x" size={22} />
        </Link>
      </div>
      <div className="flex h-full w-full items-center justify-center md:gap-6">
        {prevNeighbor ? (
          <NeighborCard neighbor={prevNeighbor} onSelect={() => jumpTo(cursor.author - 1, "last")} />
        ) : null}
        <article
          data-social-story-viewer={item.id}
          className={cn(SOCIAL_STORY_ACTIVE_CARD_CLASS, SOCIAL_STORY_HOLD_SURFACE_CLASS)}
        >
          <div
            ref={mediaRef}
            data-social-story-frame=""
            onContextMenu={onMediaContextMenu}
            className={cn(
              "absolute inset-0",
              SOCIAL_STORY_HOLD_SURFACE_CLASS,
              hop === "next" ? SOCIAL_STORY_ACTIVATE_NEXT_CLASS : null,
              hop === "prev" ? SOCIAL_STORY_ACTIVATE_PREV_CLASS : null,
            )}
          >
            {clip?.kind === "image" ? (
              <SocialMediaImage
                key={item.id}
                src={clip.url}
                sizes={SOCIAL_POST_IMAGE_SIZES}
                alt=""
                onLoad={() => noteStoryMediaPainted()}
                onError={() => noteStoryMediaPainted()}
              />
            ) : null}
            {mux?.playbackId ? (
              <SocialMuxPlayer
                key={item.id}
                playbackId={mux.playbackId}
                playbackPolicy={mux.playbackPolicy}
                muted={muted}
                autoPlay={!playbackPaused}
                chromeless
                onPaint={noteStoryMediaPainted}
                className="absolute inset-0 size-full object-cover"
              />
            ) : null}
            {playable && !mux ? (
              <div data-social-video-closed="" className="absolute inset-0 size-full object-cover" />
            ) : null}
            {!clip && item.body ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="t-body whitespace-pre-wrap text-band-ink">{item.body}</p>
              </div>
            ) : null}
            <button
              type="button"
              aria-label={SOCIAL.stories.previous}
              data-social-story-tap="prev"
              className={cn("absolute inset-y-0 left-0 z-10 w-1/3", SOCIAL_STORY_HOLD_SURFACE_CLASS)}
              onPointerDown={onZonePointerDown}
              onPointerUp={onZonePointerUp}
              onPointerCancel={onZonePointerCancel}
              onClick={() => onZoneClick("prev")}
            />
            <button
              type="button"
              aria-label={SOCIAL.stories.next}
              data-social-story-tap="next"
              className={cn("absolute inset-y-0 right-0 z-10 w-2/3", SOCIAL_STORY_HOLD_SURFACE_CLASS)}
              onPointerDown={onZonePointerDown}
              onPointerUp={onZonePointerUp}
              onPointerCancel={onZonePointerCancel}
              onClick={() => onZoneClick("next")}
            />
          </div>
          {prevStep ? (
            <button
              type="button"
              aria-label={SOCIAL.stories.previous}
              className={cn(SOCIAL_STORY_CARET_CLASS, "-left-3 -translate-x-1/2 border-0")}
              onClick={() => go("prev", "manual")}
            >
              <SocialIcon name="caret-left" size={22} />
            </button>
          ) : null}
          {nextStep ? (
            <button
              type="button"
              aria-label={SOCIAL.stories.next}
              className={cn(SOCIAL_STORY_CARET_CLASS, "-right-3 translate-x-1/2 border-0")}
              onClick={() => go("next", "manual")}
            >
              <SocialIcon name="caret-right" size={22} />
            </button>
          ) : null}
          <div className="absolute inset-x-2 top-2 z-20 flex flex-col gap-2">
            <div className={SOCIAL_STORY_PROGRESS_ROW_CLASS} data-social-story-progress="">
              {author.items.map((segment, i) => (
                <span
                  key={segment.id}
                  className={cn(SOCIAL_STORY_PROGRESS_BAR_CLASS, "overflow-hidden bg-band-ink/35")}
                >
                  <span
                    data-social-story-progress-fill=""
                    className={cn(
                      "block h-full origin-left bg-band-ink",
                      i === cursor.item ? SOCIAL_STORY_PROGRESS_FILL_CLASS : null,
                    )}
                    style={
                      i < cursor.item
                        ? { transform: "scaleX(1)" }
                        : i > cursor.item
                          ? { transform: "scaleX(0)" }
                          : {
                              animationDuration: `${SOCIAL_STORY_STILL_PROGRESS_MS}ms`,
                              animationPlayState: playbackPaused ? "paused" : "running",
                            }
                    }
                    onAnimationEnd={() => {
                      if (i !== cursor.item) return;
                      go("next", "auto");
                    }}
                  />
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <SocialAvatar
                name={author.authorName}
                photoUrl={author.authorPhotoUrl}
                size="sm"
                className="size-8"
              />
              <p className="min-w-0 truncate t-body-sm font-medium text-band-ink">{author.authorName}</p>
              <p className="shrink-0 t-label text-band-ink/65">{socialRelativeTime(item.createdAt)}</p>
              <span className="flex-1" />
              {playable ? (
                <button
                  type="button"
                  data-social-story-mute=""
                  data-social-story-audible={audible ? "true" : "false"}
                  aria-label={muted ? SOCIAL.stories.unmute : SOCIAL.stories.mute}
                  aria-pressed={muted}
                  className="flex size-10 items-center justify-center text-band-ink"
                  onClick={() => setMuted((value) => !value)}
                >
                  <SocialIcon name={muted ? "speaker-slash" : "speaker-high"} size={20} />
                </button>
              ) : null}
              {playable ? (
                <button
                  type="button"
                  data-social-story-pause=""
                  aria-label={paused ? SOCIAL.stories.play : SOCIAL.stories.pause}
                  aria-pressed={paused}
                  className="flex size-10 items-center justify-center text-band-ink"
                  onClick={() => setPaused((value) => !value)}
                >
                  <SocialIcon name={paused ? "play" : "pause"} size={20} />
                </button>
              ) : null}
              <Link
                href={SOCIAL_ROUTES.home}
                data-social-story-close=""
                aria-label={SOCIAL.stories.close}
                onPointerDown={(event) => event.stopPropagation()}
                className="relative z-30 flex size-11 shrink-0 touch-manipulation items-center justify-center text-band-ink md:hidden"
              >
                <SocialIcon name="x" size={22} />
              </Link>
            </div>
          </div>
          <div
            data-social-story-actions=""
            className={cn(SOCIAL_STORY_ACTIONS_ROW_CLASS, sayExpanded && "items-end")}
          >
            {ownStory ? (
              <SocialStorySaySomething key={item.id} onExpandedChange={setSayExpanded} />
            ) : allowReply ? (
              <SocialStoryReply
                peerId={author.authorId}
                placeholder={SOCIAL.stories.sendMessage}
              />
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className={SOCIAL_STORY_ACTIONS_CLUSTER_CLASS}>
              {ownStory ? (
                <button
                  type="button"
                  data-social-story-activity=""
                  aria-label={SOCIAL.stories.activity}
                  className={cn(SOCIAL_STORY_ACTION_HIT_CLASS, SOCIAL_STORY_ACTION_IDLE_CLASS)}
                  onClick={() => setActivityStoryId(item.id)}
                >
                  <SocialIcon name="users" size={20} />
                </button>
              ) : null}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-social-story-heart=""
                  data-social-story-heart-state={heartLiked ? "liked" : "none"}
                  aria-pressed={heartLiked}
                  aria-label={heartLiked ? SOCIAL.stories.unlike : SOCIAL.stories.like}
                  disabled={heartPending}
                  className={cn(
                    SOCIAL_STORY_ACTION_HIT_CLASS,
                    heartLiked ? SOCIAL_STORY_HEART_LIKED_CLASS : SOCIAL_STORY_ACTION_IDLE_CLASS,
                  )}
                  onClick={() => void onHeart()}
                >
                  <SocialIcon name="heart" active={heartLiked} size={20} />
                </button>
                {storyHeartCountVisible(heart.count) ? (
                  <span
                    data-social-story-heart-count=""
                    className={cn(
                      "t-label",
                      heartLiked ? SOCIAL_STORY_HEART_LIKED_CLASS : SOCIAL_STORY_ACTION_IDLE_CLASS,
                    )}
                  >
                    {heart.count}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                data-social-story-send=""
                aria-label={SOCIAL.stories.send}
                className={cn(SOCIAL_STORY_ACTION_HIT_CLASS, SOCIAL_STORY_ACTION_IDLE_CLASS)}
                onClick={() => setSendItemId(item.id)}
              >
                <SocialIcon name="paper-plane-tilt" size={20} />
              </button>
            </div>
          </div>
        </article>
        {nextNeighbor ? (
          <NeighborCard neighbor={nextNeighbor} onSelect={() => jumpTo(cursor.author + 1, "first")} />
        ) : null}
      </div>
      {sendItemId ? (
        <SocialStorySendSheet
          storyId={sendItemId}
          open
          onClose={() => setSendItemId(null)}
          onSent={() => setSentToast(true)}
        />
      ) : null}
      {activityStoryId ? (
        <SocialStoryActivitySheet
          storyId={activityStoryId}
          open
          onClose={() => setActivityStoryId(null)}
        />
      ) : null}
      {sentToast ? <SocialStorySentToast /> : null}
      </div>
    </div>
  );
}

