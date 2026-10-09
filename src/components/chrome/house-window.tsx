"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { useHouseClient } from "@/components/chrome/house-client-shell";
import { AppSheetCard, AppSheetFrame, HouseDialogFrame, HouseScrim, useHouseDesktop } from "@/components/chrome/house-overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "@/lib/house-lead-chrome";
import {
  HOUSE_WINDOW_ASK_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_BUTTON_CLASS,
  HOUSE_WINDOW_ASK_LINE_CLASS,
  HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_STRIP_CLASS,
  HOUSE_WINDOW_ASK_TITLE_CLASS,
  HOUSE_WINDOW_BODY_CLASS,
  HOUSE_WINDOW_DONE_CLASS,
  HOUSE_WINDOW_FACE_CLASS,
  HOUSE_WINDOW_FRAME_CLASS,
  HOUSE_WINDOW_HEADER_CLASS,
  HOUSE_WINDOW_PANEL_CLASS,
  HOUSE_WINDOW_TITLE_CLASS,
  houseWindowFocusables,
  houseWindowMotionClass,
  type HouseWindowMotion,
} from "@/lib/house-window";

// The house window shell (lib/house-window; house-overlay-dual-host-v1, the
// object-edit job). One object edited over the page that shows it: the
// 600 window holding one height, a header of close or back · title · Done,
// faces that slide in one frame, and an ask inside the window before
// changes are lost. Esc closes the nearest layer: the host's own layers
// (a menu, a crop), the ask (Keep editing), a face (Back), then the window;
// a second Esc keeps editing, so a double Esc never discards. ⌘/Ctrl+Enter
// is Done; Tab stays inside. Below md the window is hidden and holds no
// keys and no scroll lock (a phone host draws its own sheet).

/** While the draft has changes, reloading or closing the tab raises the
 *  browser's own prompt. */
export function useHouseLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

export type HouseWindowRequest = MutableRefObject<(() => boolean) | null>;

export type HouseWindowOptions = {
  /** Data-attribute prefix: data-{attr}, -window, -header, -close, -back,
   *  -done; a face's rows are data-{attr}-{face}-open. */
  attr: string;
  face: string;
  indexFace: string;
  /** The row a face was opened from (focus returns to it on Back). */
  cameFrom?: string | null;
  dirty: boolean;
  /** With the server (a save that must answer first): nothing leaves or
   *  changes; the header and body are inert. */
  busy: boolean;
  /** Closing and Done wait (busy, or something that saves on its own, such
   *  as an upload, still running). */
  holdOpen: boolean;
  onDone: () => void;
  onBack: () => void;
  /** Leave with nothing to lose (clean close, or after Done or Discard). */
  onClose: () => void;
  /** Drop the draft (the ask's Discard), before leaving. */
  onDiscard: () => void;
  /** The host's own layers, nearest first: return true when one closed. */
  escapeLayer?: () => boolean;
  /** The island asks the window to close (browser Back). True when it closed. */
  requestRef?: HouseWindowRequest;
};

export type HouseWindowState = {
  attr: string;
  atIndex: boolean;
  asking: boolean;
  busy: boolean;
  holdOpen: boolean;
  face: string;
  titleId: string;
  askTitleId: string;
  held: number | null;
  requestClose: () => boolean;
  done: () => void;
  discard: () => void;
  keepEditing: () => void;
  /** Ask before leaving for another screen; `go` runs on Discard. */
  ask: (go: () => void) => void;
  /** Return focus after a layer closes (chosen once React commits). */
  restoreFocus: (fallback?: string) => void;
  rememberFocus: () => void;
  onBack: () => void;
};

/** The frame and body elements, kept apart from the state the frame reads
 *  while it renders. */
export type HouseWindowRefs = {
  frameRef: RefObject<HTMLDivElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
};

export function useHouseWindow(options: HouseWindowOptions): [HouseWindowState, HouseWindowRefs] {
  const { attr, face, indexFace, cameFrom = null, dirty, busy, holdOpen, onDone, onBack, onClose, onDiscard, escapeLayer, requestRef } =
    options;
  const [asking, setAsking] = useState(false);
  // Set when the ask is for leaving to another screen: it runs on Discard.
  const [leave, setLeave] = useState<{ go: () => void } | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const askTitleId = useId();
  useHouseLeaveGuard(dirty);

  // Where focus goes back to when the ask or a layer closes. Only an element
  // inside the window counts (a scrim click leaves focus outside).
  const returnFocusRef = useRef<HTMLElement | null>(null);
  function rememberFocus() {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement && frameRef.current?.contains(active) ? active : null;
  }

  function restoreFocus(fallback?: string) {
    const saved = returnFocusRef.current;
    returnFocusRef.current = null;
    // Chosen after React commits: the ask closing lifts the body's inert
    // only on that render.
    window.requestAnimationFrame(() => {
      const target =
        saved?.isConnected && !saved.closest("[inert]")
          ? saved
          : fallback
            ? frameRef.current?.querySelector<HTMLElement>(fallback)
            : null;
      (target ?? frameRef.current)?.focus();
    });
  }

  function requestClose(): boolean {
    if (holdOpen) return false;
    if (!dirty) {
      onClose();
      return true;
    }
    rememberFocus();
    setLeave(null);
    setAsking(true);
    return false;
  }

  function done() {
    if (holdOpen) return;
    onDone();
  }

  function discard() {
    onDiscard();
    setAsking(false);
    const go = leave?.go;
    setLeave(null);
    if (go) {
      go();
      return;
    }
    onClose();
  }

  function keepEditing() {
    setAsking(false);
    setLeave(null);
    restoreFocus(`[data-${attr}-close]`);
  }

  function ask(go: () => void) {
    if (holdOpen) return;
    rememberFocus();
    setLeave({ go });
    setAsking(true);
  }

  function onEscape() {
    if (busy) return;
    if (escapeLayer?.()) return;
    // A second Esc keeps editing: a double Esc never discards.
    if (asking) {
      keepEditing();
      return;
    }
    if (face !== indexFace) {
      onBack();
      return;
    }
    requestClose();
  }

  // Latest handlers for the one document listener.
  const keys = useRef({ onEscape, done, requestClose });
  useLayoutEffect(() => {
    keys.current = { onEscape, done, requestClose };
  });
  useEffect(() => {
    if (requestRef) requestRef.current = () => keys.current.requestClose();
    return () => {
      if (requestRef) requestRef.current = null;
    };
  }, [requestRef]);

  // Below md the window is hidden: it holds no keys and no scroll lock
  // there, so a resize never leaves the page dead.
  const desktop = useHouseDesktop();
  useEffect(() => {
    if (!desktop) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // An open house menu inside the window closes itself first.
        if (frameRef.current?.querySelector("[data-house-form-select-menu]")) return;
        event.preventDefault();
        keys.current.onEscape();
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        keys.current.done();
        return;
      }
      if (event.key !== "Tab") return;
      const frame = frameRef.current;
      if (!frame) return;
      const items = houseWindowFocusables(frame);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !frame.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !frame.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!frameRef.current?.contains(document.activeElement)) frameRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [desktop]);

  // One still frame: it takes the height it opens at (up to 80vh) and
  // holds it, so a face never makes the window jump. Measured only while
  // shown: a window opened below md is hidden and measures 0, so it takes
  // its height when it first shows.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || held !== null || !desktop) return;
    const height = Math.ceil(frame.getBoundingClientRect().height);
    if (height > 0) setHeld(height);
  }, [held, desktop]);

  // A pushed face focuses its first field; Back returns to the row it left.
  // A window that opens on a face focuses that face's first field too; one
  // that opens on the index keeps the frame.
  const firstFace = useRef(true);
  useEffect(() => {
    const opening = firstFace.current;
    firstFace.current = false;
    if (opening && face === indexFace) return;
    const body = bodyRef.current;
    if (!body) return;
    body.scrollTop = 0;
    if (face === indexFace) {
      const row = cameFrom ? body.querySelector<HTMLElement>(`[data-${attr}-${cameFrom}-open]`) : null;
      row?.focus();
      return;
    }
    const field = body.querySelector<HTMLElement>("input:not([type=file]):not(.sr-only), textarea");
    (field ?? houseWindowFocusables(body)[0])?.focus();
    // attr and indexFace are fixed for a window's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, cameFrom]);

  const state: HouseWindowState = {
    attr,
    atIndex: face === indexFace,
    asking,
    busy,
    holdOpen,
    face,
    titleId,
    askTitleId,
    held,
    requestClose,
    done,
    discard,
    keepEditing,
    ask,
    restoreFocus,
    rememberFocus,
    onBack,
  };
  return [state, { frameRef, bodyRef }];
}

export function HouseWindowFrame({
  win,
  refs: { frameRef, bodyRef },
  title,
  motion,
  closeLabel,
  backLabel,
  doneLabel,
  closeIcon,
  backIcon,
  doneDisabled = false,
  ask,
  children,
}: {
  win: HouseWindowState;
  refs: HouseWindowRefs;
  title: string;
  motion: HouseWindowMotion;
  closeLabel: string;
  backLabel: string;
  doneLabel: string;
  closeIcon: ReactNode;
  backIcon: ReactNode;
  /** Done waits for something else too (a crop still open). */
  doneDisabled?: boolean;
  /** The ask, drawn while the window asks. */
  ask: ReactNode;
  children: ReactNode;
}) {
  const a = win.attr;
  const dialog = (
    <HouseDialogFrame
      size="form"
      titleId={win.titleId}
      onClose={() => {
        win.requestClose();
      }}
      closeLabel={closeLabel}
      panelClassName={HOUSE_WINDOW_PANEL_CLASS}
    >
      <div
        ref={frameRef}
        tabIndex={-1}
        {...{ [`data-${a}`]: "", [`data-${a}-window`]: "" }}
        className={HOUSE_WINDOW_FRAME_CLASS}
        style={win.held === null ? undefined : { height: win.held }}
      >
        <header {...{ [`data-${a}-header`]: "" }} className={HOUSE_WINDOW_HEADER_CLASS} inert={win.asking || win.busy}>
          {win.atIndex ? (
            <button
              type="button"
              {...{ [`data-${a}-close`]: "" }}
              aria-label={closeLabel}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={() => {
                win.requestClose();
              }}
            >
              {closeIcon}
            </button>
          ) : (
            <button
              type="button"
              {...{ [`data-${a}-back`]: "" }}
              aria-label={backLabel}
              className={HOUSE_HEADER_ROUND_BUTTON_CLASS}
              onClick={win.onBack}
            >
              {backIcon}
            </button>
          )}
          <h2 id={win.titleId} className={HOUSE_WINDOW_TITLE_CLASS}>
            {title}
          </h2>
          <Button
            {...{ [`data-${a}-done`]: "" }}
            disabled={win.holdOpen || doneDisabled}
            aria-busy={win.busy}
            className={HOUSE_WINDOW_DONE_CLASS}
            onClick={win.done}
          >
            {doneLabel}
          </Button>
        </header>
        <div
          ref={bodyRef}
          className={HOUSE_WINDOW_BODY_CLASS}
          inert={win.asking || win.busy}
          aria-busy={win.busy || undefined}
        >
          <div key={win.face} className={cn(HOUSE_WINDOW_FACE_CLASS, houseWindowMotionClass(motion))}>
            {children}
          </div>
        </div>
        {win.asking ? ask : null}
      </div>
    </HouseDialogFrame>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

/** The ask before changes are lost: a strip at the window's foot (Discard,
 *  then Keep editing, focused) or the house AppSheet card on a phone (Keep
 *  editing first, focused, then Discard, stacked full width). */
export function HouseWindowAsk({
  attr,
  variant,
  titleId,
  title,
  lines,
  keepLabel,
  discardLabel,
  onKeep,
  onDiscard,
}: {
  attr: string;
  variant: "strip" | "sheet";
  titleId: string;
  title: string;
  lines: readonly string[];
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);
  const discardButton = (
    <Button
      variant="secondary"
      {...{ [`data-${attr}-discard`]: "" }}
      className={HOUSE_WINDOW_ASK_BUTTON_CLASS}
      onClick={onDiscard}
    >
      {discardLabel}
    </Button>
  );
  const keepButton = (
    <Button ref={keepRef} {...{ [`data-${attr}-keep`]: "" }} className={HOUSE_WINDOW_ASK_BUTTON_CLASS} onClick={onKeep}>
      {keepLabel}
    </Button>
  );
  const body = (
    <>
      <h2 id={titleId} className={HOUSE_WINDOW_ASK_TITLE_CLASS}>
        {title}
      </h2>
      {lines.map((line) => (
        <p key={line} className={HOUSE_WINDOW_ASK_LINE_CLASS}>
          {line}
        </p>
      ))}
      <div className={variant === "strip" ? HOUSE_WINDOW_ASK_ACTIONS_CLASS : HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS}>
        {variant === "strip" ? (
          <>
            {discardButton}
            {keepButton}
          </>
        ) : (
          <>
            {keepButton}
            {discardButton}
          </>
        )}
      </div>
    </>
  );
  if (variant === "strip") {
    return (
      <div
        {...{ [`data-${attr}-discard-ask`]: "" }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={HOUSE_WINDOW_ASK_STRIP_CLASS}
      >
        {body}
      </div>
    );
  }
  return (
    <AppSheetFrame span="card" titleId={titleId}>
      <HouseScrim label={keepLabel} onClose={onKeep} />
      <AppSheetCard className="gap-[var(--space-3)]">
        <div {...{ [`data-${attr}-discard-ask`]: "" }} className="flex flex-col gap-[var(--space-3)]">
          {body}
        </div>
      </AppSheetCard>
    </AppSheetFrame>
  );
}

// ---- The window's history entry ---------------------------------------------
//
// The window adds an entry on the same screen (no route change, no
// skeleton), so browser Back closes it. The entry is written with the
// browser's own history calls and no shell marker for Next to skip, so Next
// keeps it as its address: a server action under the window never writes a
// stale address back. A window always has the page without its query under
// it, so Back reaches the ask and never leaves the page with the draft.

export type HouseWindowEntryOptions<F extends string> = {
  /** The window's own history flag (a shell entry is never one). */
  flag: string;
  indexFace: F;
  /** The face the address names, or null when the window's query is absent. */
  parse: (search: string) => F | null;
  openHref: (pathname: string, search: string, face: F) => string;
  closedHref: (pathname: string, search: string) => string;
  /** Whether an address that arrives with the window's query opens it now
   *  (Edit profile: a computer only; a phone uses its own sheet). */
  opensOnArrival: () => boolean;
  /** Where focus returns when the window closes. */
  returnFocus?: () => HTMLElement | null;
};

export type HouseWindowEntry<F extends string> = {
  win: { face: F; key: number } | null;
  /** A save from a closed window is still with the server. */
  saving: boolean;
  requestRef: HouseWindowRequest;
  /** Open from a control on the page (pushes the entry). */
  openFromPage: (face: F) => void;
  /** Only the window that is open now may close it. */
  close: (key: number) => void;
  /** A save that failed after its window closed: reopen at the face. */
  reopenAfterFailure: (face: F) => void;
  onPersisting: (settled: Promise<void>) => void;
  /** Push the window's entry (a link's own click). */
  push: (face: F) => void;
  addressHasWindow: () => boolean;
};

export function useHouseWindowEntry<F extends string>(options: HouseWindowEntryOptions<F>): HouseWindowEntry<F> {
  const { flag, indexFace, parse, openHref, closedHref, opensOnArrival, returnFocus } = options;
  const house = useHouseClient();
  const [win, setWin] = useState<{ face: F; key: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const winRef = useRef(win);
  const mountedRef = useRef(false);
  const keyRef = useRef(0);
  // Did this window push its entry (Back pops it), or was the query already
  // in the address when it opened (closing strips it)?
  const pushedRef = useRef(false);
  const closingRef = useRef(false);
  const requestRef = useRef<(() => boolean) | null>(null);
  const prevFace = useRef<F | null>(null);
  // The address the shell shows, read whatever the width: a resize is never
  // the query leaving (below md a window stays mounted, hidden, keeping its draft).
  const addressFace = parse(house?.search ?? "");

  const isOwnEntry = () => (window.history.state as Record<string, unknown> | null)?.[flag] === true;
  const push = (face: F) => {
    window.history.pushState(
      { houseClient: true, [flag]: true },
      "",
      openHref(window.location.pathname, window.location.search, face),
    );
  };
  // The page without the query is not a window entry: it carries no flags.
  const strip = () => {
    window.history.replaceState({}, "", closedHref(window.location.pathname, window.location.search));
  };
  // Arrived with the page: rewrite this entry as the page without the query
  // (Next's own state kept as it is, so Next's address stays put), then push
  // the window's own on top.
  const install = (face: F) => {
    window.history.replaceState(window.history.state, "", closedHref(window.location.pathname, window.location.search));
    push(face);
  };
  const addressHasWindow = () => parse(window.location.search) !== null;

  function open(face: F, pushed: boolean) {
    keyRef.current += 1;
    const next = { face, key: keyRef.current };
    winRef.current = next;
    pushedRef.current = pushed;
    closingRef.current = false;
    setWin(next);
  }

  function openFromPage(face: F) {
    if (winRef.current) return;
    const pushed = !addressHasWindow();
    if (pushed) push(face);
    open(face, pushed);
  }

  function close(key: number) {
    if (winRef.current?.key !== key) return;
    winRef.current = null;
    setWin(null);
    if (addressHasWindow()) {
      if (pushedRef.current) {
        closingRef.current = true;
        window.history.back();
      } else {
        strip();
      }
    }
    pushedRef.current = false;
    window.requestAnimationFrame(() => returnFocus?.()?.focus());
  }

  function reopenAfterFailure(face: F) {
    if (!mountedRef.current) return;
    // A window opened meanwhile waited for this answer (nothing typed in
    // it), so it reopens at the face too.
    if (winRef.current) {
      open(face, pushedRef.current);
      return;
    }
    push(face);
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

  // The address drives the window: the query arriving opens it; the query
  // leaving (browser Back) asks the window to close. With changes it asks
  // first, and its entry goes back so the next Back asks again.
  useEffect(() => {
    const prev = prevFace.current;
    prevFace.current = addressFace;
    if (addressFace !== null && prev === null) {
      if (!winRef.current && !closingRef.current && opensOnArrival()) {
        if (!isOwnEntry()) install(addressFace);
        open(addressFace, true);
      }
      return;
    }
    if (addressFace === null && prev !== null) {
      if (closingRef.current) {
        closingRef.current = false;
        return;
      }
      if (!winRef.current) return;
      // Still on the query: the entry going in underneath, not Back.
      if (addressHasWindow()) return;
      const closed = requestRef.current ? requestRef.current() : true;
      if (closed) return;
      push(indexFace);
      pushedRef.current = true;
    }
    // The address is the only input; the rest is fixed for the island's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressFace]);

  return { win, saving, requestRef, openFromPage, close, reopenAfterFailure, onPersisting, push, addressHasWindow };
}
