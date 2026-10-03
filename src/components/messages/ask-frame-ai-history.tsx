"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "@phosphor-icons/react";

import { useHousePathname } from "@/components/chrome/house-client-shell";
import { HouseLink } from "@/components/chrome/house-link";
import { Input } from "@/components/ui/input";
import { ASK_FRAME_AI, askFrameAiThreadHref } from "@/lib/ask-frame-ai";
import {
  ASK_AI_OVERLAY_PHONE_HISTORY_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS,
  askAiOverlayHref,
  currentAskAiSearch,
} from "@/lib/ask-ai-overlay";
import {
  filterAskFrameAiHistory,
  formatAskFrameAiHistoryTime,
  groupAskFrameAiHistory,
  type AskFrameAiHistoryRow,
} from "@/lib/ask-frame-ai-conversations";
import {
  MOBILE_CHROME_ICON_BUTTON_CLASS,
  MOBILE_CHROME_ICON_CLASS,
} from "@/lib/mobile-chrome";
import { houseNavIgnorePendingClick } from "@/lib/house-nav-pending";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { cn } from "@/lib/cn";
import { useAskFrameAiChrome } from "./ask-frame-ai-chrome";

// Hairline history popover. Real org conversations only. Empty is empty.

export function AskFrameAiHistoryPanel({
  conversations,
  currentId = null,
  now,
}: {
  conversations: AskFrameAiHistoryRow[];
  currentId?: string | null;
  now?: Date;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const { setHistoryOpen } = useAskFrameAiChrome();
  const filtered = filterAskFrameAiHistory(conversations, query);
  const { thisWeek, allThreads } = groupAskFrameAiHistory(filtered, now);

  return (
    <div
      data-ask-frame-ai-history-popover=""
      className={cn(
        "flex w-[384px] flex-col gap-[var(--space-6)] rounded-[12px] border border-hairline bg-surface p-[var(--space-6)] shadow-none",
        ASK_AI_OVERLAY_PHONE_HISTORY_CLASS,
      )}
    >
      <label className="block max-md:shrink-0">
        <span className="sr-only">{ASK_FRAME_AI.historySearchPlaceholder}</span>
        <Input
          variant="bare"
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ASK_FRAME_AI.historySearchPlaceholder}
          autoComplete="off"
          data-ask-frame-ai-history-search=""
          className="h-10 w-full rounded-[var(--radius-sm)] border border-hairline bg-transparent px-[var(--space-3)] focus:outline-none"
        />
      </label>

      <div data-ask-frame-ai-history-list="" className={ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS}>
        {thisWeek.length > 0 ? (
          <HistoryGroup
            label={ASK_FRAME_AI.thisWeekLabel}
            rows={thisWeek}
            currentId={currentId}
            now={now}
            onSelect={() => setHistoryOpen(false)}
          />
        ) : null}
        {allThreads.length > 0 ? (
          <HistoryGroup
            label={ASK_FRAME_AI.allThreadsLabel}
            rows={allThreads}
            currentId={currentId}
            now={now}
            onSelect={() => setHistoryOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

function HistoryGroup({
  label,
  rows,
  currentId,
  now,
  onSelect,
}: {
  label: string;
  rows: AskFrameAiHistoryRow[];
  currentId: string | null;
  now?: Date;
  onSelect?: () => void;
}) {
  const router = useRouter();
  const pathname = useHousePathname();
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <p className="t-label text-ink-3">{label}</p>
      <ul className="flex flex-col gap-[var(--space-2)]">
        {rows.map((row) => {
          const href = askFrameAiThreadHref(row.id);
          if (!href) return null;
          const current = row.id === currentId;
          return (
            <li key={row.id}>
              <HouseLink
                href={href}
                data-ask-frame-ai-history-row=""
                data-ask-frame-ai-history-current={current ? "" : undefined}
                onClick={(event) => {
                  // Next must see ?ai= (the overlay reads it), so never a shell
                  // hop. Keep the screen's own query, as opening the overlay
                  // does; the bare ?ai= href dropped it.
                  if (houseNavIgnorePendingClick(event)) return;
                  event.preventDefault();
                  onSelect?.();
                  router.push(askAiOverlayHref(pathname, currentAskAiSearch(), row.id));
                }}
                className={cn(
                  "flex items-center justify-between gap-[var(--space-4)] px-[var(--space-3)] py-[var(--space-2)]",
                  current ? "border border-hairline bg-transparent" : null,
                )}
              >
                <span className="min-w-0 truncate t-body text-ink">{row.title}</span>
                <span className="shrink-0 t-body-sm text-ink-3">
                  {formatAskFrameAiHistoryTime(row.updated_at, now)}
                </span>
              </HouseLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AskFrameAiHistoryPopover({
  conversations,
  currentId = null,
  open,
  onOpenChange,
  align = "start",
  children,
}: {
  conversations: AskFrameAiHistoryRow[];
  currentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!(event.target instanceof Node)) return;
      if (root?.contains(event.target)) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-ask-ai-overlay-phone-history], [data-ask-frame-ai-history-popover]")
      ) {
        return;
      }
      onOpenChange(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      {children}
      {open ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-[var(--space-2)] max-md:hidden",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <AskFrameAiHistoryPanel conversations={conversations} currentId={currentId} />
        </div>
      ) : null}
    </div>
  );
}

/** Header-chrome history control. 44 hit, fully on-screen — never a left-edge dock. */
export function AskFrameAiHistoryClock({
  conversations,
  currentId = null,
  open,
  onOpenChange,
  align = "end",
}: {
  conversations: AskFrameAiHistoryRow[];
  currentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "end";
}) {
  return (
    <AskFrameAiHistoryPopover
      conversations={conversations}
      currentId={currentId}
      open={open}
      onOpenChange={onOpenChange}
      align={align}
    >
      <button
        type="button"
        data-ask-frame-ai-clock=""
        aria-label={ASK_FRAME_AI.pastConversationsLabel}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={MOBILE_CHROME_ICON_BUTTON_CLASS}
      >
        <Clock className={MOBILE_CHROME_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
      </button>
    </AskFrameAiHistoryPopover>
  );
}
