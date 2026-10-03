"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PaperPlaneTilt, Prohibit, WarningCircle } from "@phosphor-icons/react";

import { cn } from "@/lib/cn";
import {
  ASK_FRAME_AI,
  askFrameAiChipActivation,
  askFrameAiChipMark,
  askFrameAiComposerSubmit,
  askFrameAiLandingGreeting,
  askFrameAiSelectedChip,
  askFrameAiThreadHref,
  type AskFrameAiChipMark,
} from "@/lib/ask-frame-ai";
import { startAskFrameAiConversation } from "@/app/(app)/aggregation/messages/ask-frame-ai-actions";
import { useHousePathname } from "@/components/chrome/house-client-shell";
import { Input } from "@/components/ui/input";
import {
  ASK_AI_OVERLAY_PHONE_SCROLL_CLASS,
  askAiOverlayHref,
  currentAskAiSearch,
} from "@/lib/ask-ai-overlay";
import { PHOSPHOR_CHROME_IDLE_WEIGHT, type PhosphorIcon } from "@/lib/phosphor-icon";

const CHIP_MARK_ICON: Record<AskFrameAiChipMark, PhosphorIcon> = {
  alert: WarningCircle,
  slash: Prohibit,
  send: PaperPlaneTilt,
};

export const ASK_FRAME_AI_LANDING_CHIP_CLASS =
  "flex w-full items-center justify-start gap-[var(--space-2)] rounded-full border-0 bg-surface-muted px-[var(--space-4)] py-[var(--space-3)] text-left t-body-sm text-ink";

// Overlay landing, Mercury-direct: greeting + stacked full-width chips +
// pinned composer. No second brand headline. No "Try one of these" label.
// History lives in overlay header chrome — never an absolute left-edge clock.
// Phone scroller keeps #457 overflow-y-scroll / pan-y / overscroll-contain.
// Chip click fills, selects, and sends the same prompt as free text. Submit
// persists the user turn, then opens the thread on the current path.
// Composer is 640x56 r28 pad 16. Thinking chrome stays on the thread.
// No plus. No HISTORY list. No invented titles. No Beta. No Mercury brand
// colors. No Circle brand fill.
export function AskFrameAiLanding({
  firstName = null,
  displayName = null,
}: {
  firstName?: string | null;
  displayName?: string | null;
}) {
  const router = useRouter();
  const pathname = useHousePathname();
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = askFrameAiSelectedChip(prompt);
  const greeting = askFrameAiLandingGreeting({ firstName, displayName });

  const send = async (value: string) => {
    if (pending) return;
    setError(null);
    setPending(true);
    const result = await startAskFrameAiConversation(value);
    if (result.conversationId && askFrameAiThreadHref(result.conversationId)) {
      // Open the thread on this screen with its own query (a bare ?ai=<id>
      // dropped it), through Next: the overlay reads Next's search params.
      router.push(askAiOverlayHref(pathname, currentAskAiSearch(), result.conversationId));
      return;
    }
    setPending(false);
    if (result.error) setError(result.error);
  };

  return (
    <div
      data-ask-frame-ai-landing=""
      className="flex h-full min-h-0 flex-1 flex-col px-[var(--space-6)] pb-[var(--space-6)] pt-[var(--space-4)] max-md:px-[var(--space-4)]"
    >
      <div
        className={cn(
          "flex w-full min-h-0 flex-1 flex-col overflow-auto",
          ASK_AI_OVERLAY_PHONE_SCROLL_CLASS,
        )}
      >
        <h1 data-ask-frame-ai-greeting="" className="t-title text-ink">
          {greeting}
        </h1>

        <div
          data-ask-frame-ai-try=""
          className="mt-[var(--space-6)] flex w-full flex-col items-stretch gap-[var(--space-2)]"
        >
          {ASK_FRAME_AI.tryPrompts.map((label, index) => {
            const pressed = selected === label;
            const mark = askFrameAiChipMark(index);
            const MarkIcon = mark ? CHIP_MARK_ICON[mark] : null;
            return (
              <button
                key={label}
                type="button"
                data-ask-frame-ai-chip=""
                data-ask-frame-ai-chip-mark={mark ?? undefined}
                aria-pressed={pressed}
                onClick={() => {
                  const activation = askFrameAiChipActivation(label);
                  setPrompt(activation.prompt);
                  void send(activation.send);
                }}
                className={ASK_FRAME_AI_LANDING_CHIP_CLASS}
              >
                {MarkIcon ? (
                  <MarkIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3"
                    weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
                  />
                ) : null}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        data-ask-frame-ai-composer=""
        className="mt-[var(--space-6)] flex w-full shrink-0 justify-center"
        onSubmit={(event) => {
          event.preventDefault();
          const next = askFrameAiComposerSubmit(prompt);
          if (next) void send(next);
        }}
      >
        <label className="flex h-14 w-full max-w-[640px] items-center justify-between rounded-[28px] border border-hairline bg-surface px-[var(--space-4)]">
          <span className="sr-only">{ASK_FRAME_AI.composerPlaceholderMobile}</span>
          <Input
            variant="bare"
            type="text"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={ASK_FRAME_AI.composerPlaceholderMobile}
            autoComplete="off"
            className="flex-1 text-left focus:outline-none"
          />
          <button
            type="submit"
            aria-label={ASK_FRAME_AI.sendLabel}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast"
          >
            <ArrowRight className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          </button>
        </label>
      </form>

      {error ? (
        <p data-ask-frame-ai-error="" className="mt-[var(--space-2)] t-body-sm text-center text-ink-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
