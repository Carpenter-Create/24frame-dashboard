import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ASK_FRAME_AI,
  ASK_FRAME_AI_FETCHING_HOLD_MS,
  askFrameAiThinkingPhase,
} from "@/lib/ask-frame-ai";
import { AskFrameAiThinking } from "./ask-frame-ai-thinking";

describe("AskFrameAiThinking", () => {
  it("locks 427:352 empty-lead fetching chrome without a side-line Stop", () => {
    const html = renderToStaticMarkup(
      <AskFrameAiThinking phase={askFrameAiThinkingPhase(0)} />,
    );
    expect(html).toContain('data-ask-frame-ai-thinking=""');
    expect(html).toContain('data-ask-frame-ai-lead-slot=""');
    expect(html).toContain('data-ask-frame-ai-thinking-verb=""');
    expect(html).toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).toContain("…");
    expect(html).toContain(ASK_FRAME_AI.frameAiMark);
    expect(html).toContain("size-6");
    expect(html).toContain("bg-accent");
    expect(html).toContain("min-h-6");
    expect(html).toContain("t-body-sm text-ink-3");
    expect(html).not.toContain("text-ink-3/55");
    expect(html).not.toContain("data-ask-frame-ai-handoff");
    expect(html).not.toContain(ASK_FRAME_AI.findingSignal);
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain(ASK_FRAME_AI.stop);
    expect(html).not.toContain(ASK_FRAME_AI.stopHint);
    expect(html).not.toContain(ASK_FRAME_AI.escToCancel);
    expect(html).not.toContain(ASK_FRAME_AI.capability);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Looking at");
  });

  it("mounts finding-the-signal chrome after the fetching hold, even without a lead", () => {
    const html = renderToStaticMarkup(
      <AskFrameAiThinking phase={askFrameAiThinkingPhase(ASK_FRAME_AI_FETCHING_HOLD_MS)} />,
    );
    expect(html).toContain('data-ask-frame-ai-thinking=""');
    expect(html).toContain('data-ask-frame-ai-handoff=""');
    expect(html).toContain('data-ask-frame-ai-lead-slot=""');
    expect(html).toContain(ASK_FRAME_AI.findingSignal);
    expect(html).toContain("…");
    expect(html).toContain("t-body-sm text-ink-3/55");
    expect(html).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).not.toContain("t-body leading-6 text-ink");
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain(ASK_FRAME_AI.stop);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Looking at");
    expect(html).not.toContain(ASK_FRAME_AI.answerLead);
  });

  it("locks 427:440 handoff chrome for a live catalog lead on finding", () => {
    const html = renderToStaticMarkup(
      <AskFrameAiThinking
        phase={askFrameAiThinkingPhase(ASK_FRAME_AI_FETCHING_HOLD_MS)}
        lead="Harbor Cut — Synopsis is required."
      />,
    );
    expect(html).toContain('data-ask-frame-ai-thinking=""');
    expect(html).toContain('data-ask-frame-ai-handoff=""');
    expect(html).toContain("Harbor Cut — Synopsis is required.");
    expect(html).toContain("t-body leading-6 text-ink");
    expect(html).toContain(ASK_FRAME_AI.findingSignal);
    expect(html).toContain("…");
    expect(html).toContain("t-body-sm text-ink-3/55");
    expect(html).not.toContain('data-ask-frame-ai-lead-slot=""');
    expect(html).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain(ASK_FRAME_AI.stop);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Looking at");
  });
});
