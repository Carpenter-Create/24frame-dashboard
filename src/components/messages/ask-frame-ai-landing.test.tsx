import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/messages",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/(app)/aggregation/messages/ask-frame-ai-actions", () => ({
  startAskFrameAiConversation: vi.fn(),
}));

import {
  ASK_FRAME_AI,
  ASK_FRAME_AI_CHIP_MARKS,
  askFrameAiChipMark,
  askFrameAiLandingGreeting,
} from "@/lib/ask-frame-ai";
import { AskFrameAiLanding } from "./ask-frame-ai-landing";

function visible(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "ask-frame-ai-landing.tsx"), "utf8");
const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";

describe("AskFrameAiLanding", () => {
  it("opens Mercury-direct: greeting + stacked chips + composer, no mega-title", () => {
    const html = visible(renderToStaticMarkup(<AskFrameAiLanding displayName="Ada Lovelace" />));

    expect(html).toContain('data-ask-frame-ai-landing=""');
    expect(html).toContain('data-ask-frame-ai-greeting=""');
    expect(html).toContain("t-title");
    expect(html).toContain(askFrameAiLandingGreeting({ displayName: "Ada Lovelace" }));
    expect(html).toContain("Hi, Ada. How can I be helpful?");
    expect(html).not.toContain("t-display");
    expect(html).not.toContain('data-ask-frame-ai-headline=""');
    expect(html).not.toContain(ASK_FRAME_AI.headline);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.tryLabel);
    expect(html).toContain(ASK_FRAME_AI.composerPlaceholderMobile);
    expect(html).not.toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(html).toContain("max-w-[640px]");
    expect(html).toContain("h-14");
    expect(html).toContain("rounded-[28px]");
    expect(html).toContain("px-[var(--space-4)]");
    expect(html).toContain('data-ask-frame-ai-chip=""');
    expect(html).toContain("aria-pressed");
    expect(html).not.toContain('data-ask-frame-ai-clock=""');
    expect(html).not.toContain(ASK_FRAME_AI.pastConversationsLabel);
    expect(html).not.toContain("data-ask-frame-ai-download");
    expect(html).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(src).not.toContain("Download");
    expect(html).not.toContain("data-ask-frame-ai-new");
    expect(html).not.toContain(ASK_FRAME_AI.newConversationLabel);
    expect(html).not.toContain('href="/messages"');
    expect(html).toContain("text-ink-3");
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain("stroke-width=\"1.33\"");
    for (const label of ASK_FRAME_AI.tryPrompts) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("data-ask-frame-ai-history-popover");
    expect(html).not.toContain("data-ask-frame-ai-history-row");
    expect(html).not.toContain(ASK_FRAME_AI.historyLabel);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(html).not.toContain("Get support");
    expect(html).not.toContain("data-ask-frame-ai-thread");
    expect(html).not.toContain("data-ask-frame-ai-thinking");
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).not.toContain(ASK_FRAME_AI.findingSignal);
    expect(html).not.toContain(ASK_FRAME_AI.escToCancel);
    expect(html).not.toContain(ASK_FRAME_AI.userPrompt);
    expect(html).not.toContain(ASK_FRAME_AI.answerLead);
    expect(html).not.toContain(ASK_FRAME_AI.attribution);
  });

  it("never renders thinking chrome on send", () => {
    const html = renderToStaticMarkup(<AskFrameAiLanding />);

    expect(html).not.toContain("data-ask-frame-ai-thinking");
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).not.toContain(ASK_FRAME_AI.findingSignal);
    expect(html).not.toContain(ASK_FRAME_AI.stop);
    expect(html).not.toContain(ASK_FRAME_AI.stopHint);
    expect(html).not.toContain(ASK_FRAME_AI.escToCancel);
    expect(src).toContain("startAskFrameAiConversation");
    expect(src).toContain(
      "router.push(askAiOverlayHref(pathname, currentAskAiSearch(), result.conversationId))",
    );
    expect(src).toContain("askFrameAiThreadHref");
    expect(src).not.toContain("AskFrameAiThinking");
    expect(src).not.toContain("data-ask-frame-ai-thinking");
    expect(src).not.toContain("fetching relevant skills");
    expect(src).not.toContain("finding the signal");
    expect(src).not.toContain("setThinking");
    expect(src).not.toContain("askFrameAiUsesModel");
    expect(src).not.toContain("completeAskFrameAiTurn");
    expect(src).not.toContain("emptyBlocking");
  });

  it("drops landing clock, plus, and HISTORY rows — history is overlay chrome", () => {
    const html = visible(renderToStaticMarkup(<AskFrameAiLanding />));
    expect(html).not.toContain("data-ask-frame-ai-clock");
    expect(html).not.toContain("data-ask-frame-ai-new");
    expect(html).not.toContain(ASK_FRAME_AI.newConversationLabel);
    expect(html).toContain(askFrameAiLandingGreeting());
    expect(html).not.toContain(ASK_FRAME_AI.headline);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.tryLabel);
    for (const label of ASK_FRAME_AI.tryPrompts) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("data-ask-frame-ai-history-popover");
    expect(html).not.toContain("data-ask-frame-ai-history-row");
    expect(html).not.toContain(ASK_FRAME_AI.historyLabel);
    expect(html).not.toContain(THREAD);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(html).not.toContain("Get support");
    expect(src).not.toContain("AskFrameAiHistoryPopover");
    expect(src).not.toContain("conversations={conversations}");
    expect(src).not.toContain("Clock");
    expect(src).not.toContain("Plus");
    expect(src).not.toContain("data-ask-frame-ai-new");
    expect(src).not.toContain("ASK_FRAME_AI.newConversationLabel");
    expect(src).not.toContain("askFrameAiLandingHref");
    expect(src).not.toContain("ASK_FRAME_AI.historyLabel");
    expect(src).not.toContain("data-ask-frame-ai-history-row");
    expect(src).not.toContain("MOBILE_CHROME_CLOCK_DOCK_CLASS");
    expect(src).not.toContain("ASK_FRAME_AI_CLOCK_BUTTON_CLASS");
  });

  it("does not restore header Search or the Access upgrade card", () => {
    const html = renderToStaticMarkup(<AskFrameAiLanding />);

    expect(html).not.toContain("SearchField");
    expect(html).not.toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain(ASK_FRAME_AI.analyze);
    expect(html).not.toContain(ASK_FRAME_AI.included);
    expect(html).not.toContain(`href="${ASK_FRAME_AI.upgradeHref}"`);
    expect(html).not.toContain("data-ask-frame-ai-gate");
    expect(html).not.toContain("data-ask-frame-ai-upgrade");
  });

  it("fills, selects, and sends from chips, and submit sends a persisted thread", () => {
    const html = renderToStaticMarkup(<AskFrameAiLanding />);

    expect(html).toContain('type="button"');
    expect(html).toContain('aria-pressed="false"');
    expect(src).toContain("askFrameAiChipActivation(label)");
    expect(src).toContain("setPrompt(activation.prompt)");
    expect(src).toContain("send(activation.send)");
    expect(src).toContain("askFrameAiComposerSubmit(prompt)");
    expect(src).toContain("startAskFrameAiConversation");
    expect(src).toContain(
      "router.push(askAiOverlayHref(pathname, currentAskAiSearch(), result.conversationId))",
    );
    expect(src).toContain("askFrameAiThreadHref");
    expect(src).toContain("aria-pressed={pressed}");
    expect(src).not.toContain("askFrameAiUsesModel");
    expect(src).not.toContain("AskFrameAiThinking");
    expect(src).not.toContain("setThinking");
    expect(src).not.toContain("data-ask-frame-ai-thinking");
    expect(src).not.toContain("router.replace");
    expect(src).not.toContain("AskFrameAiThread");
    expect(src).not.toContain(ASK_FRAME_AI.answerLead);
    expect(src).not.toContain("ANTHROPIC");
    expect(src).not.toContain("ask-frame-ai-operator");
    expect(src).not.toContain("Sparkles");
    expect(src).not.toContain("NavMark");
    expect(src).not.toContain("ask-globee-16.png");
    expect(src).not.toContain("ask-globee-64.png");
    expect(src).not.toMatch(/setTimeout|sleep\(/);
  });

  it("locks greeting, stacked chips, and composer on the house 8/16/24/48 scale", () => {
    const html = renderToStaticMarkup(<AskFrameAiLanding />);

    expect(src).toContain(
      "flex h-full min-h-0 flex-1 flex-col px-[var(--space-6)] pb-[var(--space-6)] pt-[var(--space-4)]",
    );
    expect(src).toContain("flex w-full min-h-0 flex-1 flex-col overflow-auto");
    expect(src).not.toContain("flex-col-reverse");
    expect(src).not.toContain("justify-center gap-[var(--space-12)]");
    expect(src).not.toContain("justify-end gap-[var(--space-12)]");
    expect(src).not.toContain("p-[var(--space-12)]");
    expect(html).not.toContain("t-body text-center text-ink-2");
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(src).toContain(
      "flex h-14 w-full max-w-[640px] items-center justify-between rounded-[28px] border border-hairline bg-surface px-[var(--space-4)]",
    );
    expect(src).toContain("ASK_FRAME_AI_LANDING_CHIP_CLASS");
    expect(src).toContain("flex w-full items-center justify-start");
    expect(src).toContain("shrink-0");
    expect(src).not.toContain("md:order-2");
    expect(src).not.toContain("md:order-3");
    expect(src).not.toContain("md:contents");
    expect(src.indexOf("data-ask-frame-ai-greeting=")).toBeLessThan(
      src.indexOf("data-ask-frame-ai-try="),
    );
    expect(src.indexOf("data-ask-frame-ai-try=")).toBeLessThan(
      src.indexOf("data-ask-frame-ai-composer="),
    );
    expect(src).not.toContain("rounded-[12px]");
    expect(src).not.toContain("rounded-[20px]");
    expect(src).not.toContain("rounded-[32px]");
    expect(src).not.toContain("rounded-[40px]");
    expect(html).not.toContain("data-ask-frame-ai-new");
    expect(html).not.toContain(ASK_FRAME_AI.historyLabel);
    expect(html).not.toContain('data-ask-frame-ai-clock=""');
  });

  it("locks desktop tokens so a mobile-only revert fails", () => {
    const html = visible(renderToStaticMarkup(<AskFrameAiLanding />));

    expect(src).toContain(
      "flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast",
    );
    expect(src).not.toContain("max-md:size-6");
    expect(src).not.toContain("max-md:rounded-full max-md:bg-accent");
    expect(src).toContain("border-0 bg-surface-muted");
    expect(src).not.toContain("max-md:border-0");
    expect(src).not.toContain("max-md:bg-surface-muted");
    expect(src).toContain("placeholder={ASK_FRAME_AI.composerPlaceholderMobile}");
    expect(src).not.toContain("placeholder={ASK_FRAME_AI.composerPlaceholder}");
    expect(src).not.toContain("ASK_FRAME_AI.need");
    expect(src).not.toContain("ASK_FRAME_AI.tryLabel");
    expect(src).not.toContain("max-md:hidden");
    expect(html).toContain(ASK_FRAME_AI.composerPlaceholderMobile);
    expect(html).not.toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.tryLabel);
    expect(html).not.toContain("Beta");
    expect(src).toContain("text-left");
    expect(src).toContain("<Input");
    expect(src).toContain('variant="bare"');
    expect(src).toContain("px-[var(--space-4)]");
    expect(src).toContain("items-center");
  });

  it("locks stacked chip marks, greeting copy, and unchanged prompts", () => {
    const html = visible(renderToStaticMarkup(<AskFrameAiLanding displayName="Ada" />));

    expect(ASK_FRAME_AI_CHIP_MARKS).toEqual(["alert", "slash", "send"]);
    expect(askFrameAiChipMark(0)).toBe("alert");
    expect(askFrameAiChipMark(1)).toBe("slash");
    expect(askFrameAiChipMark(2)).toBe("send");
    expect(askFrameAiChipMark(3)).toBeNull();
    expect(html).toContain("Hi, Ada. How can I be helpful?");
    expect(html).not.toContain(ASK_FRAME_AI.headline);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.tryLabel);
    expect(html).not.toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(html).toContain(ASK_FRAME_AI.composerPlaceholderMobile);
    expect(html).toContain("h-14");
    expect(html).toContain("rounded-[28px]");
    expect(html).not.toContain('data-ask-frame-ai-clock=""');
    expect(src).not.toContain("MOBILE_CHROME_ICON_CLASS");
    expect(src).not.toContain("MOBILE_CHROME_CLOCK_DOCK_CLASS");
    expect(src).toContain("ASK_AI_OVERLAY_PHONE_SCROLL_CLASS");
    expect(src).not.toContain("ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS");
    expect(src).not.toContain("absolute left-0 top-0");
    expect(src).not.toContain("Plus");
    expect(html).not.toContain("data-ask-frame-ai-new");
    expect(html).not.toContain("Beta");
    expect(html).not.toContain("Mercury");
    expect(html).not.toContain("purple");
    expect(html).not.toContain("#7C");
    expect(html).toContain('data-ask-frame-ai-chip-mark="alert"');
    expect(html).toContain('data-ask-frame-ai-chip-mark="slash"');
    expect(html).toContain('data-ask-frame-ai-chip-mark="send"');
    expect(src).toContain("WarningCircle");
    expect(src).toContain("Prohibit");
    expect(src).toContain("PaperPlaneTilt");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).not.toContain("strokeWidth={1.33}");
    expect(src).toContain("size-4 shrink-0 text-ink-3");
    expect(src).not.toContain("size-4 text-accent");
    expect(src).not.toContain("fill-");
    expect(src).toContain("max-md:px-[var(--space-4)]");
    expect(src).toContain("flex w-full flex-col items-stretch gap-[var(--space-2)]");
    expect(src).not.toContain("flex-col-reverse overflow-auto");
    expect(src).toContain("mt-[var(--space-6)] flex w-full shrink-0 justify-center");
    expect(src).toContain(
      "flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast",
    );
    expect(src).toContain("border-0 bg-surface-muted");
    expect(src).not.toContain("max-md:hidden");
    expect(src).not.toContain("max-md:border-0 max-md:bg-surface-muted");
    expect(src).not.toContain(
      "max-md:size-6 max-md:rounded-full max-md:bg-accent max-md:text-accent-contrast",
    );
    expect(src).toContain("<Input");
    expect(src).toContain('variant="bare"');
    expect(src).toContain("<ArrowRight");
    expect(src).not.toContain("ChevronRight");
    expect(src).not.toContain("ChevronUp");
    for (const label of ASK_FRAME_AI.tryPrompts) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(html).not.toContain("Get support");
    expect(src).not.toContain("AskFrameAiThread");
    expect(src).not.toContain("data-ask-frame-ai-thinking");
  });
});
