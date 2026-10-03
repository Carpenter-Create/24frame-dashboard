"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  ThumbsDown,
  ThumbsUp,
} from "@phosphor-icons/react";

import {
  ASK_FRAME_AI,
  ASK_FRAME_AI_FETCHING_HOLD_MS,
  askFrameAiComposerSubmit,
  askFrameAiThinkingPhase,
  askFrameAiUsesModel,
} from "@/lib/ask-frame-ai";
import {
  askFrameAiAnswerText,
  askFrameAiOpenUserTurn,
  type AskFrameAiHistoryRow,
  type AskFrameAiStoredMessage,
  type AskFrameAiThumb,
} from "@/lib/ask-frame-ai-conversations";
import { parseAskFrameAiInk, stackAskFrameAiInkFacts } from "@/lib/ask-frame-ai-ink";
import {
  appendAskFrameAiTurn,
  completeAskFrameAiTurn,
  setAskFrameAiThumb,
} from "@/app/(app)/aggregation/messages/ask-frame-ai-actions";
import { Input } from "@/components/ui/input";
import { ASK_AI_OVERLAY_PHONE_SCROLL_CLASS } from "@/lib/ask-ai-overlay";
import { cn } from "@/lib/cn";
import { PHOSPHOR_CHROME_ACTIVE_WEIGHT, PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { useAskFrameAiChrome } from "./ask-frame-ai-chrome";
import { AskFrameAiThinking } from "./ask-frame-ai-thinking";

const COPIED_MS = 1500;
const COMPOSER_FOCUS =
  "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none! ring-0! focus-visible:outline-none! focus-visible:ring-0!";

function ThreadIconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex size-4 items-center justify-center text-ink-3"
    >
      {children}
    </button>
  );
}

// 375:343 answer copy — conversation ink, not a markdown document.
// Lead/support flush. Catalog fields Medium. Facts stacked at house 8.
function AskFrameAiAnswerInk({ lead, follow }: { lead: string; follow: string | null }) {
  return (
    <div data-ask-frame-ai-ink="" className="flex flex-col gap-[var(--space-2)]">
      {stackAskFrameAiInkFacts(lead, follow).map((fact, index) => (
        <p key={index} data-ask-frame-ai-fact="" className="t-body text-ink">
          {parseAskFrameAiInk(fact).map((span, spanIndex) =>
            span.medium ? (
              <span key={spanIndex} className="font-medium">
                {span.text}
              </span>
            ) : (
              span.text
            ),
          )}
        </p>
      ))}
    </div>
  );
}

const EMPTY_HISTORY: AskFrameAiHistoryRow[] = [];

// Thinking plays fetching… then finding the signal… while the turn is in
// flight. Time advances the verb; a live catalog lead is optional ink on
// step 2. This operator is pending vs done, so the thread never fakes one.
export function AskFrameAiThread({
  initials,
  conversation,
  messages,
  conversations = EMPTY_HISTORY,
}: {
  initials: string;
  conversation: AskFrameAiHistoryRow;
  messages: AskFrameAiStoredMessage[];
  conversations?: AskFrameAiHistoryRow[];
}) {
  const router = useRouter();
  const { setChrome, setConversations } = useAskFrameAiChrome();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [thinking, setThinking] = useState(() => askFrameAiOpenUserTurn(messages) !== null);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [thumbOverrides, setThumbOverrides] = useState<Record<string, AskFrameAiThumb | null>>({});
  const latestTurnRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const completingIdRef = useRef<string | null>(null);

  const stopThinking = useCallback(() => {
    cancelledRef.current = true;
    setThinking(false);
    setPending(false);
    setPendingPrompt(null);
  }, []);

  useEffect(() => {
    if (!thinking) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") stopThinking();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [thinking, stopThinking]);

  useEffect(() => {
    setChrome({
      id: conversation.id,
      title: conversation.title,
      pinned_at: conversation.pinned_at,
      initials,
      messages,
    });
    setConversations(conversations);
    return () => {
      setChrome(null);
      setConversations([]);
    };
  }, [
    conversation.id,
    conversation.pinned_at,
    conversation.title,
    conversations,
    initials,
    messages,
    setChrome,
    setConversations,
  ]);

  useEffect(() => {
    return () => window.clearTimeout(copiedTimerRef.current);
  }, []);

  useEffect(() => {
    const pane = conversationRef.current;
    if (!pane) return;
    pane.scrollTop = 0;
  }, [messages, pendingPrompt]);

  const openTurnKey = thinking
    ? (pendingPrompt ?? messages.at(-1)?.id ?? "pending")
    : null;

  useEffect(() => {
    if (!openTurnKey) return;
    const id = window.setTimeout(() => {
      setThinkingElapsedMs(ASK_FRAME_AI_FETCHING_HOLD_MS);
    }, ASK_FRAME_AI_FETCHING_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [openTurnKey]);

  const thinkingPhase = askFrameAiThinkingPhase(thinkingElapsedMs);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || !askFrameAiOpenUserTurn(messages)) {
      return;
    }
    if (completingIdRef.current === last.id) return;
    completingIdRef.current = last.id;
    cancelledRef.current = false;
    setPending(true);
    setThinking(true);
    void completeAskFrameAiTurn(conversation.id).then((result) => {
      if (cancelledRef.current) return;
      setThinking(false);
      setPending(false);
      if (!("error" in result)) {
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }, [conversation.id, messages, router]);

  function thumbsFor(message: AskFrameAiStoredMessage): AskFrameAiThumb | null {
    return Object.hasOwn(thumbOverrides, message.id) ? thumbOverrides[message.id] ?? null : message.thumbs;
  }

  function copyAnswer(message: AskFrameAiStoredMessage) {
    void navigator.clipboard.writeText(
      askFrameAiAnswerText(message.lead ?? message.body, message.follow),
    ).then(() => {
        window.clearTimeout(copiedTimerRef.current);
        setCopiedId(message.id);
        copiedTimerRef.current = window.setTimeout(() => {
          setCopiedId((current) => (current === message.id ? null : current));
        }, COPIED_MS);
      });
  }

  const turns: AskFrameAiStoredMessage[][] = [];
  for (const message of messages) {
    if (message.role === "user" || turns.length === 0) {
      turns.push([message]);
    } else {
      turns[turns.length - 1]?.push(message);
    }
  }

  const reversedTurns = [...turns].reverse();

  return (
    <div data-ask-frame-ai-thread="" className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-4)]">
        <div
          ref={conversationRef}
          data-ask-frame-ai-conversation=""
          className={cn(
            "flex min-h-0 flex-1 flex-col-reverse gap-[var(--space-6)] overflow-auto px-[var(--content-inset)]",
            ASK_AI_OVERLAY_PHONE_SCROLL_CLASS,
            "max-md:px-[var(--space-4)]",
          )}
        >
          {thinking && pendingPrompt ? (
            <div
              ref={latestTurnRef}
              data-ask-frame-ai-turn=""
              data-ask-frame-ai-thread-end=""
              className="flex flex-col gap-[var(--space-6)]"
            >
              <div data-ask-frame-ai-user-row="" className="flex items-start gap-[var(--space-2)]">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[length:var(--text-xs)] font-medium text-ink">
                  {initials}
                </div>
                <div className="rounded-[var(--radius-lg)] bg-surface-muted p-[var(--space-4)]">
                  <p className="t-body text-ink">{pendingPrompt}</p>
                </div>
              </div>
              <AskFrameAiThinking phase={thinkingPhase} />
            </div>
          ) : null}

          {reversedTurns.map((turn, index) => {
            const isNewestPersisted = index === 0;
            const showOpenThinking =
              thinking &&
              !pendingPrompt &&
              isNewestPersisted &&
              !turn.some((message) => message.role === "globee");
            return (
              <div
                key={turn[0]?.id ?? String(index)}
                ref={isNewestPersisted && !pendingPrompt ? latestTurnRef : undefined}
                data-ask-frame-ai-turn=""
                data-ask-frame-ai-thread-end={isNewestPersisted && !pendingPrompt ? "" : undefined}
                className={
                  pendingPrompt || index > 0
                    ? "flex flex-col gap-[var(--space-6)] border-b border-hairline pb-[var(--space-6)]"
                    : "flex flex-col gap-[var(--space-6)]"
                }
              >
              {turn.map((message) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    data-ask-frame-ai-user-row=""
                    className="flex items-start gap-[var(--space-2)]"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[length:var(--text-xs)] font-medium text-ink">
                      {initials}
                    </div>
                    <div className="rounded-[var(--radius-lg)] bg-surface-muted p-[var(--space-4)]">
                      <p className="t-body text-ink">{message.body}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    data-ask-frame-ai-answer=""
                    className="flex items-start gap-[var(--space-2)]"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[length:var(--text-xs)] font-medium text-accent-contrast">
                      {ASK_FRAME_AI.frameAiMark}
                    </div>
                    <div className="flex w-full max-w-[640px] flex-col gap-[var(--space-2)]">
                      <AskFrameAiAnswerInk lead={message.lead ?? message.body} follow={message.follow} />
                      {/* 247:378 stamp is a help-desk leftover — no assistant · time line. */}
                      <div
                        data-ask-frame-ai-answer-actions=""
                        className="flex items-center gap-[var(--space-2)]"
                      >
                        <ThreadIconButton
                          label={ASK_FRAME_AI.copyLabel}
                          pressed={copiedId === message.id}
                          onClick={() => copyAnswer(message)}
                        >
                          {copiedId === message.id ? (
                            <Check className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} data-ask-frame-ai-copied="" />
                          ) : (
                            <Copy className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
                          )}
                        </ThreadIconButton>
                        <ThreadIconButton
                          label={ASK_FRAME_AI.thumbsUpLabel}
                          pressed={thumbsFor(message) === "up"}
                          onClick={() => {
                            void setAskFrameAiThumb(message.id, "up").then((result) => {
                              if ("thumbs" in result) {
                                setThumbOverrides((current) => ({ ...current, [message.id]: result.thumbs }));
                              }
                            });
                          }}
                        >
                          <ThumbsUp
                            className="size-4"
                            weight={
                              thumbsFor(message) === "up"
                                ? PHOSPHOR_CHROME_ACTIVE_WEIGHT
                                : PHOSPHOR_CHROME_IDLE_WEIGHT
                            }
                          />
                        </ThreadIconButton>
                        <ThreadIconButton
                          label={ASK_FRAME_AI.thumbsDownLabel}
                          pressed={thumbsFor(message) === "down"}
                          onClick={() => {
                            void setAskFrameAiThumb(message.id, "down").then((result) => {
                              if ("thumbs" in result) {
                                setThumbOverrides((current) => ({ ...current, [message.id]: result.thumbs }));
                              }
                            });
                          }}
                        >
                          <ThumbsDown
                            className="size-4"
                            weight={
                              thumbsFor(message) === "down"
                                ? PHOSPHOR_CHROME_ACTIVE_WEIGHT
                                : PHOSPHOR_CHROME_IDLE_WEIGHT
                            }
                          />
                        </ThreadIconButton>
                      </div>
                    </div>
                  </div>
                ),
              )}
              {showOpenThinking ? <AskFrameAiThinking phase={thinkingPhase} /> : null}
            </div>
            );
          })}

        </div>

        <form
          data-ask-frame-ai-composer=""
          className="flex shrink-0 justify-center"
          onSubmit={(event) => {
            event.preventDefault();
            const next = askFrameAiComposerSubmit(draft);
            if (!next || pending) return;
            cancelledRef.current = false;
            setError(null);
            setPending(true);
            if (askFrameAiUsesModel(next)) {
              setThinkingElapsedMs(0);
              setThinking(true);
              setPendingPrompt(next);
            }
            void appendAskFrameAiTurn(conversation.id, next).then((result) => {
              if (cancelledRef.current) return;
              setThinking(false);
              setPendingPrompt(null);
              setPending(false);
              if (!("error" in result)) {
                setDraft("");
                router.refresh();
                return;
              }
              setError(result.error);
            });
          }}
        >
          {thinking ? (
            <div
              data-ask-frame-ai-composer-busy=""
              className={`flex h-14 w-full max-w-[640px] items-center justify-between rounded-full border border-hairline bg-surface px-[var(--space-4)] ${COMPOSER_FOCUS}`}
            >
              <p className="t-body-sm text-ink-3">{ASK_FRAME_AI.escToCancel}</p>
              <button
                type="button"
                data-ask-frame-ai-stop=""
                aria-label={ASK_FRAME_AI.stop}
                onClick={stopThinking}
                className="flex size-4 shrink-0 items-center justify-center text-ink"
              >
                <span aria-hidden="true" className="block size-3 bg-ink" />
              </button>
            </div>
          ) : (
            <label
              className={`flex h-14 w-full max-w-[640px] items-center justify-between rounded-full border border-hairline bg-surface px-[var(--space-4)] ${COMPOSER_FOCUS}`}
            >
              <span className="sr-only">{ASK_FRAME_AI.composerPlaceholder}</span>
              <Input
                variant="bare"
                type="text"
                name="prompt"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={ASK_FRAME_AI.composerPlaceholder}
                autoComplete="off"
                className={`flex-1 ${COMPOSER_FOCUS}`}
              />
              <button
                type="submit"
                aria-label={ASK_FRAME_AI.sendLabel}
                className="flex size-4 shrink-0 items-center justify-center text-ink-3"
              >
                <ArrowRight className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              </button>
            </label>
          )}
        </form>
        {error ? (
          <p data-ask-frame-ai-error="" className="mt-[var(--space-2)] text-center t-body-sm text-ink-2">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
