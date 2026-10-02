"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsIn, ArrowsOut } from "@phosphor-icons/react";

import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { cn } from "@/lib/cn";
import {
  ASK_AI_OVERLAY,
  ASK_AI_OVERLAY_BODY_CLASS,
  ASK_AI_OVERLAY_DESKTOP_SCRIM_CLASS,
  ASK_AI_OVERLAY_EXPAND_CLASS,
  ASK_AI_OVERLAY_MARK_CLASS,
  ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS,
  askAiOverlayDesktopClass,
  askAiOverlayDesktopHostClass,
  askAiOverlayPhoneClass,
  askAiCloseHref,
  askAiOverlayHref,
  askAiChromeOpen,
  askAiStateFromHref,
  currentAskAiSearch,
  fireAskAiOpenThen,
  isAskAiDesktopViewport,
  readAskAiOverlay,
  rememberAskAiReturnPath,
  toggleAskAiOverlay,
  type AskAiOverlayState,
} from "@/lib/ask-ai-overlay";
import { ASK_GLOBEE, canRenderAskGlobeeLanding, type MessagesSurface } from "@/lib/ask-globee";
import type { AskGlobeeHistoryRow, AskGlobeeStoredMessage } from "@/lib/ask-globee-conversations";
import { loadAskAiOverlay } from "@/app/(app)/aggregation/messages/ask-globee-actions";
import { DIALOG_HEADER_CLASS } from "@/components/ui/dialog";
import { APP_SHEET_SCRIM_CLASS } from "@/lib/house-sheet";
import { AskAssistantChromeProvider, useAskGlobeeChrome } from "@/components/messages/ask-globee-chrome";
import { Close44 } from "./house";
import { HouseAiMark } from "./house-ai-mark";
import { useHousePathname } from "./house-client-shell";

const AskGlobeeLanding = dynamic(() =>
  import("@/components/messages/ask-globee-landing").then((m) => m.AskGlobeeLanding),
);
const AskGlobeeThread = dynamic(() =>
  import("@/components/messages/ask-globee-thread").then((m) => m.AskGlobeeThread),
);
const AskGlobeeHistoryClock = dynamic(() =>
  import("@/components/messages/ask-globee-history").then((m) => m.AskGlobeeHistoryClock),
);
const AskGlobeeHistoryPanel = dynamic(() =>
  import("@/components/messages/ask-globee-history").then((m) => m.AskGlobeeHistoryPanel),
);
const AccessUpgradeGate = dynamic(() =>
  import("@/components/messages/access-upgrade-gate").then((m) => m.AccessUpgradeGate),
);
const MessagesAppHeader = dynamic(() =>
  import("./messages-app-header").then((m) => m.MessagesAppHeader),
);

type AskAiOverlayContextValue = {
  open: boolean;
  expanded: boolean;
  threadId: string | null;
  openAskAi: (threadId?: string | null) => void;
  closeAskAi: () => void;
  toggleAskAi: (threadId?: string | null) => void;
  toggleAskAiExpanded: () => void;
};

const AskAiOverlayContext = createContext<AskAiOverlayContextValue>({
  open: false,
  expanded: false,
  threadId: null,
  openAskAi: () => {},
  closeAskAi: () => {},
  toggleAskAi: () => {},
  toggleAskAiExpanded: () => {},
});

export function useAskAiOverlay() {
  return useContext(AskAiOverlayContext);
}

export function AskAiOverlayProvider({ children }: { children: ReactNode }) {
  // Shell path, not Next's. A warm hop never tells Next it moved, so
  // usePathname would open and close the overlay on the previous screen.
  const pathname = useHousePathname();
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<AskAiOverlayState | null>(() => {
    const url = readAskAiOverlay(currentAskAiSearch());
    return url.open ? url : null;
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    rememberAskAiReturnPath(pathname);
  }, [pathname]);

  const openAskAi = useCallback(
    (threadId?: string | null) => {
      setExpanded(false);
      const href = askAiOverlayHref(pathname, currentAskAiSearch(), threadId);
      setOptimistic(askAiStateFromHref(href));
      router.push(href);
    },
    [pathname, router],
  );

  const closeAskAi = useCallback(() => {
    setExpanded(false);
    setOptimistic({ open: false, threadId: null });
    router.replace(askAiCloseHref(pathname, currentAskAiSearch()));
  }, [pathname, router]);

  const toggleAskAiExpanded = useCallback(() => {
    // Overlay-scoped. Do not push a route or change the workspace path.
    setExpanded((current) => !current);
  }, []);

  const open = askAiChromeOpen(optimistic);

  const toggleAskAi = useCallback(
    (threadId?: string | null) => {
      // Live chrome open only. A sticky ref stays true after Back /
      // in-shell navigation drops ?ai=1 and blocks reopen.
      toggleAskAiOverlay(askAiChromeOpen(optimistic), openAskAi, closeAskAi, threadId);
    },
    [closeAskAi, openAskAi, optimistic],
  );

  const value = useMemo(
    () => ({
      open,
      expanded,
      threadId: optimistic?.threadId ?? null,
      openAskAi,
      closeAskAi,
      toggleAskAi,
      toggleAskAiExpanded,
    }),
    [closeAskAi, expanded, open, openAskAi, optimistic, toggleAskAi, toggleAskAiExpanded],
  );

  return (
    <AskAiOverlayContext.Provider value={value}>
      {children}
      <Suspense fallback={<AskAiOverlayPanel />}>
        <AskAiOverlayUrlBound optimistic={optimistic} onOptimistic={setOptimistic} />
      </Suspense>
    </AskAiOverlayContext.Provider>
  );
}

function AskAiOverlayUrlBound({
  optimistic,
  onOptimistic,
}: {
  optimistic: AskAiOverlayState | null;
  onOptimistic: (next: AskAiOverlayState | null) => void;
}) {
  const searchParams = useSearchParams();
  const parent = useAskAiOverlay();
  const url = readAskAiOverlay(searchParams);
  const open = optimistic ? optimistic.open : url.open;
  const threadId = optimistic ? optimistic.threadId : url.threadId;

  useEffect(() => {
    if (!optimistic) return;
    if (optimistic.open === url.open && optimistic.threadId === url.threadId) {
      onOptimistic(null);
    }
  }, [onOptimistic, optimistic, url.open, url.threadId]);

  const value = useMemo(
    () => ({
      ...parent,
      open,
      threadId,
    }),
    [open, parent, threadId],
  );

  return (
    <AskAiOverlayContext.Provider value={value}>
      <AskAiOverlayPanel />
    </AskAiOverlayContext.Provider>
  );
}

function AskAiOverlayPanel() {
  const { open, expanded, threadId, closeAskAi, toggleAskAiExpanded } = useAskAiOverlay();
  const [surface, setSurface] = useState<MessagesSurface>("ask-globee-landing");
  const [initials, setInitials] = useState("?");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AskGlobeeHistoryRow[]>([]);
  const [conversation, setConversation] = useState<AskGlobeeHistoryRow | null>(null);
  const [messages, setMessages] = useState<AskGlobeeStoredMessage[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadAskAiOverlay(threadId).then((next) => {
      if (cancelled) return;
      setSurface(next.surface);
      setInitials(next.initials);
      setDisplayName(next.displayName);
      setConversations(next.conversations);
      setConversation(next.conversation);
      setMessages(next.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [open, threadId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAskAi();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAskAi, open]);

  useEffect(() => {
    if (!open) return;
    const desktop = isAskAiDesktopViewport();
    if (desktop && !expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded, open]);

  const threadSurface: MessagesSurface =
    threadId && conversation ? "ask-globee-thread" : surface;
  const showThread = threadSurface === "ask-globee-thread" && conversation;
  const showLanding = canRenderAskGlobeeLanding(surface) && !showThread;
  const showGate = !canRenderAskGlobeeLanding(surface) && surface !== "staff-inbox";

  const shell = open ? (
    <AskAssistantChromeProvider
      initialChrome={
        conversation
          ? { id: conversation.id, title: conversation.title, pinned_at: conversation.pinned_at, initials, messages }
          : null
      }
      initialConversations={conversations}
    >
      <AskAiOverlayChrome
        showLanding={showLanding}
        expanded={expanded}
        closeAskAi={closeAskAi}
        toggleAskAiExpanded={toggleAskAiExpanded}
      />
      <AskAiOverlayBody
        showThread={Boolean(showThread)}
        showLanding={showLanding}
        showGate={showGate}
        conversations={conversations}
        currentId={conversation?.id ?? null}
        initials={initials}
        conversation={conversation}
        messages={messages}
        displayName={displayName}
      />
    </AskAssistantChromeProvider>
  ) : null;

  const phone = open ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ASK_AI_OVERLAY.dialog}
      data-ask-ai-overlay=""
      data-ask-ai-overlay-phone=""
      data-ask-ai-expanded={expanded ? "true" : undefined}
      className="fixed inset-0 z-50 flex h-dvh w-full flex-col justify-end overscroll-none md:hidden"
    >
      <button
        type="button"
        aria-label={ASK_AI_OVERLAY.close}
        className={APP_SHEET_SCRIM_CLASS}
        onClick={closeAskAi}
      />
      <div className={cn("relative z-10 pointer-events-auto bg-surface", askAiOverlayPhoneClass(expanded))}>
        {shell}
      </div>
    </div>
  ) : null;

  const desktop = open ? (
    <div
      role="dialog"
      aria-modal={expanded}
      aria-label={ASK_AI_OVERLAY.dialog}
      data-ask-ai-overlay=""
      data-ask-ai-overlay-desktop=""
      data-ask-ai-expanded={expanded ? "true" : undefined}
      className={askAiOverlayDesktopHostClass(expanded)}
    >
      {expanded ? (
        <button
          type="button"
          aria-label={ASK_AI_OVERLAY.collapse}
          data-ask-ai-desktop-scrim=""
          className={ASK_AI_OVERLAY_DESKTOP_SCRIM_CLASS}
          onClick={toggleAskAiExpanded}
        />
      ) : null}
      <div className={cn("relative z-10", askAiOverlayDesktopClass(expanded))}>
        {shell}
      </div>
    </div>
  ) : null;

  const overlay =
    desktop || phone ? (
      <>
        {desktop}
        {phone}
      </>
    ) : null;

  return overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay;
}

function AskAiOverlayChrome({
  showLanding,
  expanded,
  closeAskAi,
  toggleAskAiExpanded,
}: {
  showLanding: boolean;
  expanded: boolean;
  closeAskAi: () => void;
  toggleAskAiExpanded: () => void;
}) {
  const { conversations, historyOpen, setHistoryOpen } = useAskGlobeeChrome();

  return (
    <div data-ask-ai-overlay-chrome="" className={cn(DIALOG_HEADER_CLASS, "shrink-0")}>
      <div className="flex min-w-0 items-center gap-[var(--space-3)]">
        <HouseAiMark className={ASK_AI_OVERLAY_MARK_CLASS} />
        <h2 className="truncate t-heading text-ink">
          {showLanding ? ASK_GLOBEE.newConversationLabel : ASK_AI_OVERLAY.dialog}
        </h2>
      </div>
      <div className="flex items-center gap-[var(--space-2)]">
        {showLanding ? (
          <AskGlobeeHistoryClock
            conversations={conversations}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
          />
        ) : null}
        <button
          type="button"
          data-ask-ai-expand=""
          aria-pressed={expanded}
          aria-label={expanded ? ASK_AI_OVERLAY.collapse : ASK_AI_OVERLAY.expand}
          onClick={toggleAskAiExpanded}
          className={ASK_AI_OVERLAY_EXPAND_CLASS}
        >
          {expanded ? (
            <ArrowsIn className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          ) : (
            <ArrowsOut className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          )}
        </button>
        <Close44
          label={ASK_AI_OVERLAY.close}
          data-ask-ai-close=""
          onClick={() => {
            setHistoryOpen(false);
            closeAskAi();
          }}
        />
      </div>
    </div>
  );
}

function AskAiOverlayBody({
  showThread,
  showLanding,
  showGate,
  conversations,
  currentId,
  initials,
  conversation,
  messages,
  displayName,
}: {
  showThread: boolean;
  showLanding: boolean;
  showGate: boolean;
  conversations: AskGlobeeHistoryRow[];
  currentId: string | null;
  initials: string;
  conversation: AskGlobeeHistoryRow | null;
  messages: AskGlobeeStoredMessage[];
  displayName: string | null;
}) {
  const { historyOpen, setHistoryOpen } = useAskGlobeeChrome();

  useEffect(() => {
    setHistoryOpen(false);
  }, [currentId, setHistoryOpen]);

  return (
    <div data-ask-ai-overlay-body="" className={ASK_AI_OVERLAY_BODY_CLASS}>
      {showThread ? (
        <div data-ask-ai-overlay-thread-chrome="" className="shrink-0 px-[var(--space-4)] pt-[var(--space-2)]">
          <MessagesAppHeader surface="ask-globee-thread" />
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          historyOpen && showThread ? "max-md:hidden" : null,
        )}
      >
        {showLanding ? <AskGlobeeLanding displayName={displayName} /> : null}
        {showThread && conversation ? (
          <AskGlobeeThread
            initials={initials}
            conversation={conversation}
            messages={messages}
            conversations={conversations}
          />
        ) : null}
        {showGate ? <AccessUpgradeGate /> : null}
      </div>
      {historyOpen ? (
        <div
          data-ask-ai-overlay-phone-history=""
          className={ASK_AI_OVERLAY_PHONE_HISTORY_HOST_CLASS}
        >
          <AskGlobeeHistoryPanel conversations={conversations} currentId={currentId} />
        </div>
      ) : null}
    </div>
  );
}

type AskAiOpenButtonProps = ComponentProps<"button"> & {
  threadId?: string | null;
  toggle?: boolean;
} & {
  [key: `data-${string}`]: string | undefined;
};

export function AskAiOpenButton({
  threadId,
  toggle = false,
  children,
  className,
  onClick,
  ...props
}: AskAiOpenButtonProps) {
  const { open, openAskAi, toggleAskAi } = useAskAiOverlay();
  return (
    <button
      {...props}
      type="button"
      data-ask-ai-open=""
      data-ask-ai-toggle={toggle ? "" : undefined}
      aria-pressed={toggle ? open : undefined}
      className={className}
      onClick={(event) => {
        fireAskAiOpenThen(
          () => (toggle ? toggleAskAi(threadId) : openAskAi(threadId)),
          () => onClick?.(event),
        );
      }}
    >
      {children}
    </button>
  );
}
