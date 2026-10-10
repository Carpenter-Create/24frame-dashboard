"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { AppSheetCard, AppSheetFrame, HouseScrim } from "@/components/chrome/house-overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HOUSE_DANGER_INK_CLASS } from "@/lib/house-sheet";
import {
  HOUSE_WINDOW_ASK_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_BUTTON_CLASS,
  HOUSE_WINDOW_ASK_LINE_CLASS,
  HOUSE_WINDOW_ASK_PANEL_CLASS,
  HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_STRIP_CLASS,
  HOUSE_WINDOW_ASK_TITLE_CLASS,
} from "@/lib/house-window";

// The house ask, in its own module (re-exported by house-window.tsx) so a
// confirm host can draw it without the window shell. The strip and the sheet
// draw exactly what they drew inside the shell (pinned byte for byte in
// house-window-ask.pin.json). Opt-ins, absent for every ask before them
// (docs/design-locks/house-dual-host-primitive-audit-v1.md, "HouseWindowAsk
// panel"; first caller social-post-owner-menu-lock-v1): a frameless panel
// that is its own alertdialog described by its line, its layout, a danger
// action, busy, and a notice above the buttons.

/** The ask before changes are lost: a strip at the window's foot (Discard,
 *  then Keep editing, focused) or the house AppSheet card on a phone (Keep
 *  editing first, focused, then Discard, stacked full width). The panel is
 *  the ask alone for a host that draws its own frame: Keep first, in a row
 *  at the right or stacked full width. */
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
  layout = "stack",
  discardTone,
  busy = false,
  notice,
  panelRef: panelRefProp,
}: {
  attr: string;
  variant: "strip" | "sheet" | "panel";
  titleId: string;
  title: string;
  lines: readonly string[];
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
  /** Panel only: Keep then the action in a row at the right, or stacked full width. */
  layout?: "row" | "stack";
  /** The action in the house danger ink. */
  discardTone?: "danger";
  /** Both buttons wait and the action is busy; focus holds on the panel. */
  busy?: boolean;
  /** Drawn after the lines and before the buttons (a failure in place). */
  notice?: ReactNode;
  /** Panel only: the host's handle on the panel (its Tab hold target). */
  panelRef?: RefObject<HTMLDivElement | null>;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const ownPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = panelRefProp ?? ownPanelRef;
  const lineId = useId();
  const busyAtMount = useRef(busy);
  const lastBusy = useRef(busy);
  useEffect(() => {
    // Keep, or the panel when the ask mounts waiting (a disabled Keep
    // cannot take focus).
    (busyAtMount.current ? panelRef.current : keepRef.current)?.focus();
  }, [panelRef]);
  useLayoutEffect(() => {
    if (lastBusy.current === busy) return;
    lastBusy.current = busy;
    const panel = panelRef.current;
    if (!panel) return;
    const active = document.activeElement;
    if (busy) {
      // Before the buttons can drop focus to the page.
      if (!active || active === document.body || panel.contains(active)) panel.focus();
    } else if (active === panel) {
      // The answer is back: focus returns to the action that was pressed.
      discardRef.current?.focus();
    }
  }, [busy, panelRef]);
  const discardButton = (
    <Button
      ref={discardRef}
      variant="secondary"
      {...{ [`data-${attr}-discard`]: "" }}
      className={discardTone === "danger" ? cn(HOUSE_WINDOW_ASK_BUTTON_CLASS, HOUSE_DANGER_INK_CLASS) : HOUSE_WINDOW_ASK_BUTTON_CLASS}
      disabled={busy}
      aria-busy={busy ? true : undefined}
      onClick={onDiscard}
    >
      {discardLabel}
    </Button>
  );
  const keepButton = (
    <Button
      ref={keepRef}
      {...{ [`data-${attr}-keep`]: "" }}
      className={HOUSE_WINDOW_ASK_BUTTON_CLASS}
      disabled={busy}
      onClick={onKeep}
    >
      {keepLabel}
    </Button>
  );
  const panel = variant === "panel";
  const discardFirst = variant === "strip";
  const actionsClass =
    variant === "strip" || (panel && layout === "row") ? HOUSE_WINDOW_ASK_ACTIONS_CLASS : HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS;
  const body = (
    <>
      <h2 id={titleId} className={HOUSE_WINDOW_ASK_TITLE_CLASS}>
        {title}
      </h2>
      {lines.map((line, index) => (
        <p key={line} id={panel && index === 0 ? lineId : undefined} className={HOUSE_WINDOW_ASK_LINE_CLASS}>
          {line}
        </p>
      ))}
      {notice}
      <div className={actionsClass}>
        {discardFirst ? (
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
  if (panel) {
    // Its own alertdialog, inserted when the ask appears: focus landing on
    // Keep reads the title and the line.
    return (
      <div
        ref={panelRef}
        {...{ [`data-${attr}-discard-ask`]: "" }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={lines.length > 0 ? lineId : undefined}
        tabIndex={-1}
        className={HOUSE_WINDOW_ASK_PANEL_CLASS}
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
