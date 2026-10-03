import {
  ASK_FRAME_AI,
  askFrameAiInFlightLead,
  askFrameAiThinkingVerb,
  type AskFrameAiThinkingPhase,
} from "@/lib/ask-frame-ai";

// 427:352 empty-lead fetching, then 427:440 finding-the-signal chrome.
// A live catalog lead is optional ink on step 2 — never a Winter Line fixture.
// Catalog verbs are chrome, not persisted ai_conversation_messages rows.
export function AskFrameAiThinking({
  lead = null,
  phase = "fetching",
}: {
  lead?: string | null;
  phase?: AskFrameAiThinkingPhase;
}) {
  const liveLead = askFrameAiInFlightLead(phase, lead);
  const verb = askFrameAiThinkingVerb(phase);
  const handoff = phase === "finding";

  return (
    <div
      data-ask-frame-ai-thinking=""
      data-ask-frame-ai-handoff={handoff ? "" : undefined}
      className="flex items-start gap-[var(--space-2)]"
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[length:var(--text-xs)] font-medium text-accent-contrast">
        {ASK_FRAME_AI.frameAiMark}
      </div>
      <div className="flex w-full max-w-[640px] flex-col">
        {liveLead ? (
          <p className="t-body leading-6 text-ink">{liveLead}</p>
        ) : (
          <div data-ask-frame-ai-lead-slot="" className="min-h-6" />
        )}
        <p
          data-ask-frame-ai-thinking-verb=""
          className={handoff ? "t-body-sm text-ink-3/55" : "t-body-sm text-ink-3"}
        >
          {verb}
        </p>
      </div>
    </div>
  );
}
