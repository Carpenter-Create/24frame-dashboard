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
  appendAskFrameAiTurn: vi.fn(),
  completeAskFrameAiTurn: vi.fn(),
  setAskFrameAiThumb: vi.fn(),
}));

import {
  ASK_FRAME_AI,
  ASK_FRAME_AI_FETCHING_HOLD_MS,
  askFrameAiThinkingPhase,
} from "@/lib/ask-frame-ai";
import { CATALOG_HEALTH_EMPTY } from "@/lib/findings";
import { AskFrameAiThinking } from "./ask-frame-ai-thinking";
import { AskFrameAiThread } from "./ask-frame-ai-thread";

function visible(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

function visibleText(html: string): string {
  return visible(html).replace(/<[^>]+>/g, "");
}

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ask-frame-ai-thread.tsx"), "utf8");
const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";
const USER_MSG = "3a2d9c7b-5e4f-4b22-8d33-8c9f2e1b6a55";
const FRAME_AI_MSG = "4b3e0d8c-6f50-4c33-9e44-9d0a3f2c7b66";

const CONVERSATION = {
  id: THREAD,
  title: "What needs attention",
  pinned_at: null,
  created_at: "2026-08-19T11:00:00.000Z",
  updated_at: "2026-08-19T11:10:00.000Z",
};

function renderThread(
  messages: {
    id: string;
    role: "user" | "globee";
    body: string;
    lead: string | null;
    follow: string | null;
    thumbs: "up" | "down" | null;
    created_at: string;
  }[] = [
    {
      id: USER_MSG,
      role: "user",
      body: "What needs attention",
      lead: null,
      follow: null,
      thumbs: null,
      created_at: "2026-08-19T11:00:00.000Z",
    },
    {
      id: FRAME_AI_MSG,
      role: "globee",
      body: "Harbor Cut — Synopsis is required.",
      lead: "Harbor Cut — Synopsis is required.",
      follow: null,
      thumbs: null,
      created_at: "2026-08-19T11:10:00.000Z",
    },
  ],
) {
  return visible(
    renderToStaticMarkup(
      <AskFrameAiThread initials="A" conversation={CONVERSATION} messages={messages} />,
    ),
  );
}

describe("AskFrameAiThread", () => {
  it("locks 247:295 chrome around persisted turns, not the Winter Line fixture", () => {
    const html = renderThread();

    expect(html).toContain('data-ask-frame-ai-thread=""');
    expect(html).toContain("What needs attention");
    expect(visibleText(html)).toContain("Harbor Cut — Synopsis is required.");
    expect(html).toContain(ASK_FRAME_AI.frameAiMark);
    expect(html).not.toContain(ASK_FRAME_AI.attributionName);
    expect(html).toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(html).toContain(ASK_FRAME_AI.copyLabel);
    expect(html).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(html).toContain(ASK_FRAME_AI.thumbsUpLabel);
    expect(html).toContain(ASK_FRAME_AI.thumbsDownLabel);
    expect(html).toContain(">A<");
    expect(html).toContain("max-w-[640px]");
    expect(html).toContain("px-[var(--content-inset)]");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain("bg-accent");
    expect(html).not.toContain(ASK_FRAME_AI.userPrompt);
    expect(html).not.toContain(ASK_FRAME_AI.answerLead);
    expect(html).not.toContain(ASK_FRAME_AI.answerFollow);
    expect(html).not.toContain(ASK_FRAME_AI.attribution);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(src).toContain("navigator.clipboard.writeText");
    expect(src).not.toContain("askFrameAiDownloadFilename");
    expect(src).not.toContain("askFrameAiDownloadBlob");
    expect(src).not.toContain("<Download");
    expect(src).not.toContain("text/plain");
    expect(src).toContain("setAskFrameAiThumb");
    expect(src).toContain("appendAskFrameAiTurn");
    expect(src).toContain("completeAskFrameAiTurn");
    expect(src).toContain("askFrameAiOpenUserTurn");
    expect(src).toContain("router.refresh()");
    expect(src).toContain("askFrameAiUsesModel(next)");
    expect(src).toContain("AskFrameAiThinking");
    expect(src).toContain("stopThinking");
    expect(src).toContain("ASK_FRAME_AI.escToCancel");
    expect(html).not.toContain("data-ask-frame-ai-thinking");
    expect(html).not.toContain("data-ask-frame-ai-composer-busy");
    expect(html).toContain(`aria-label="${ASK_FRAME_AI.sendLabel}"`);
    expect(html).not.toContain("Looking at The Winter Line");
    expect(src).not.toContain("router.replace");
    expect(src).not.toContain("askFrameAiThreadHref");
    expect(src).not.toContain("ANTHROPIC");
    expect(src).not.toContain("ask-frame-ai-operator");
    expect(src).not.toContain("Sparkles");
    expect(src).not.toContain("ask-globee-16.png");
    expect(src).not.toContain("ask-globee-64.png");
  });

  it("swaps the copy control to a brief check and does not toast", () => {
    const html = renderThread();

    expect(html).toContain(`aria-label="${ASK_FRAME_AI.copyLabel}"`);
    expect(html).not.toContain("data-ask-frame-ai-copied");
    expect(src).toContain("navigator.clipboard.writeText");
    expect(src).toContain("setCopiedId");
    expect(src).toContain("copiedId === message.id");
    expect(src).toContain("<Check");
    expect(src).toContain("data-ask-frame-ai-copied");
    expect(src).not.toContain("toast");
    expect(src).not.toMatch(/bounce|animate-bounce/i);
    expect(src).not.toContain("askFrameAiDownloadFilename");
    expect(src).not.toContain("askFrameAiDownloadBlob");
    expect(src).toContain("setAskFrameAiThumb");
  });

  it("stacks turns on house 24 with a hairline between them", () => {
    const html = renderThread([
      {
        id: USER_MSG,
        role: "user",
        body: "What needs attention",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:00:00.000Z",
      },
      {
        id: FRAME_AI_MSG,
        role: "globee",
        body: "Harbor Cut — Synopsis is required.",
        lead: "Harbor Cut — Synopsis is required.",
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:10:00.000Z",
      },
      {
        id: "5c4f1e9d-7061-4d44-af55-ae1b4a3d8c77",
        role: "user",
        body: "What is blocking a title",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:20:00.000Z",
      },
      {
        id: "6d5a2f0e-8172-4e55-b066-bf2c5b4e9d88",
        role: "globee",
        body: CATALOG_HEALTH_EMPTY,
        lead: CATALOG_HEALTH_EMPTY,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:21:00.000Z",
      },
    ]);
    expect(html).toContain("What needs attention");
    expect(html).toContain("What is blocking a title");
    expect(html).toContain(CATALOG_HEALTH_EMPTY);
    expect(visibleText(html)).toContain("Harbor Cut — Synopsis is required.");
    expect(html).toContain('data-ask-frame-ai-turn=""');
    expect(html).toContain("gap-[var(--space-6)]");
    expect(html).toContain("border-b border-hairline");
    expect(html).toContain("pb-[var(--space-6)]");
    expect(html).not.toContain("gap-[var(--space-16)]");
    expect(html).not.toContain("pt-[var(--space-3)]");
    expect(html.match(/data-ask-frame-ai-turn=""/g)?.length).toBe(2);
    expect(html.match(/border-b border-hairline/g)?.length).toBe(1);
    expect(html.match(/pb-\[var\(--space-6\)\]/g)?.length).toBe(1);
    expect(src).toContain(
      "flex flex-col gap-[var(--space-6)] border-b border-hairline pb-[var(--space-6)]",
    );
    expect(src).toContain(
      "flex min-h-0 flex-1 flex-col-reverse gap-[var(--space-6)] overflow-auto px-[var(--content-inset)]",
    );
    expect(src).toContain("ASK_AI_OVERLAY_PHONE_SCROLL_CLASS");
    expect(src).toContain("max-md:px-[var(--space-4)]");
    expect(src).not.toContain("flex-1 flex-col gap-[var(--space-6)] px-[var(--content-inset)]");
    expect(src).not.toMatch(/border-t border-hairline"/);
    const conversation = html.slice(
      html.indexOf("data-ask-frame-ai-conversation"),
      html.indexOf("data-ask-frame-ai-composer"),
    );
    expect(conversation.indexOf("What is blocking a title")).toBeLessThan(
      conversation.indexOf("What needs attention"),
    );
  });

  it("keeps a follow-up on the same thread instead of opening a new one", () => {
    const html = renderThread([
      {
        id: USER_MSG,
        role: "user",
        body: "What needs attention",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:00:00.000Z",
      },
      {
        id: FRAME_AI_MSG,
        role: "globee",
        body: "Harbor Cut — Synopsis is required.",
        lead: "Harbor Cut — Synopsis is required.",
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:10:00.000Z",
      },
      {
        id: "5c4f1e9d-7061-4d44-af55-ae1b4a3d8c77",
        role: "user",
        body: "What is blocking a title",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:20:00.000Z",
      },
      {
        id: "6d5a2f0e-8172-4e55-b066-bf2c5b4e9d88",
        role: "globee",
        body: CATALOG_HEALTH_EMPTY,
        lead: CATALOG_HEALTH_EMPTY,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:21:00.000Z",
      },
    ]);
    expect(html).toContain("What needs attention");
    expect(html).toContain("What is blocking a title");
    expect(html).toContain(CATALOG_HEALTH_EMPTY);
    expect(visibleText(html)).toContain("Harbor Cut — Synopsis is required.");
  });

  it("scrolls the latest turn into view when the thread grows", () => {
    const html = renderThread();

    expect(html).toContain('data-ask-frame-ai-thread-end=""');
    expect(src).toContain("latestTurnRef");
    expect(src).toContain("conversationRef");
    expect(src).toContain("pane.scrollTop = 0");
    expect(src).not.toContain("scrollIntoView");
    expect(src).toContain("useRef");
    expect(src).toContain("flex-col-reverse");
    expect(src).toContain("[...turns].reverse()");
  });

  it("stacks history upward so the newest turn sits nearest the composer", () => {
    const html = renderThread([]);

    expect(html).toContain("data-ask-frame-ai-conversation");
    expect(html).toContain("data-ask-frame-ai-composer");
    expect(html).toContain("flex-col-reverse");
    expect(html.indexOf("data-ask-frame-ai-conversation")).toBeLessThan(
      html.indexOf("data-ask-frame-ai-composer"),
    );
    expect(src).toContain("h-full min-h-0 flex-1 flex-col");
    expect(src).toContain("flex shrink-0 justify-center");
  });

  it("kills the composer inner focus ring without restyling the pill hairline", () => {
    const html = renderThread();
    const composer = html.slice(html.indexOf("data-ask-frame-ai-composer"));

    expect(composer).toContain("border-hairline");
    expect(composer).toContain("outline-none");
    expect(composer).toContain("ring-0");
    expect(composer).toContain("focus-visible:outline-none");
    expect(composer).toContain("focus-visible:ring-0");
    expect(src).toContain("focus:outline-none");
    expect(src).toContain("focus:ring-0");
    expect(src).not.toContain("focus:border-accent");
    expect(src).not.toContain("focus:ring-accent");
  });

  it("can render the honest empty-catalog line", () => {
    const html = renderThread([
      {
        id: USER_MSG,
        role: "user",
        body: "What needs attention",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:00:00.000Z",
      },
      {
        id: FRAME_AI_MSG,
        role: "globee",
        body: CATALOG_HEALTH_EMPTY,
        lead: CATALOG_HEALTH_EMPTY,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:10:00.000Z",
      },
    ]);
    expect(html).toContain(CATALOG_HEALTH_EMPTY);
    expect(html).not.toContain("Artwork missing");
  });

  it("does not restore header Search or the Access upgrade card", () => {
    const html = renderThread();

    expect(html).not.toContain("SearchField");
    expect(html).not.toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain(ASK_FRAME_AI.analyze);
    expect(html).not.toContain(ASK_FRAME_AI.included);
    expect(html).not.toContain(`href="${ASK_FRAME_AI.upgradeHref}"`);
    expect(html).not.toContain("data-ask-frame-ai-gate");
    expect(html).not.toContain("data-ask-frame-ai-upgrade");
  });

  it("plays fetching then finding-the-signal chrome while a turn is in flight", () => {
    const html = renderThread([
      {
        id: USER_MSG,
        role: "user",
        body: "What is blocking a title",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:00:00.000Z",
      },
    ]);
    const composer = html.slice(html.indexOf("data-ask-frame-ai-composer"));
    const finding = renderToStaticMarkup(
      <AskFrameAiThinking phase={askFrameAiThinkingPhase(ASK_FRAME_AI_FETCHING_HOLD_MS)} />,
    );

    expect(html).toContain("What is blocking a title");
    expect(html).toContain('data-ask-frame-ai-thinking=""');
    expect(html).toContain('data-ask-frame-ai-lead-slot=""');
    expect(html).toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).toContain("…");
    expect(html).not.toContain(ASK_FRAME_AI.findingSignal);
    expect(finding).toContain(ASK_FRAME_AI.findingSignal);
    expect(finding).toContain("…");
    expect(finding).toContain('data-ask-frame-ai-handoff=""');
    expect(finding).toContain("t-body-sm text-ink-3/55");
    expect(finding).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(finding).not.toContain("Winter Line");
    expect(finding).not.toContain(ASK_FRAME_AI.answerLead);
    expect(html).toContain('data-ask-frame-ai-user-row=""');
    expect(composer).toContain('data-ask-frame-ai-composer-busy=""');
    expect(composer).toContain(ASK_FRAME_AI.escToCancel);
    expect(composer).toContain('data-ask-frame-ai-stop=""');
    expect(composer).toContain(`aria-label="${ASK_FRAME_AI.stop}"`);
    expect(composer).toContain("block size-3 bg-ink");
    expect(composer).not.toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(composer).not.toContain(`aria-label="${ASK_FRAME_AI.sendLabel}"`);
    expect(html).not.toContain(ASK_FRAME_AI.thinking);
    expect(html).not.toContain("Looking at");
    expect(html).not.toContain("Looking at The Winter Line");
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain(ASK_FRAME_AI.emptyBlocking);
    expect(html).not.toContain(ASK_FRAME_AI.capability);
    expect(src).toContain("completeAskFrameAiTurn");
    expect(src).toContain("askFrameAiOpenUserTurn");
    expect(src).toContain("ASK_FRAME_AI_FETCHING_HOLD_MS");
    expect(src).toContain("askFrameAiThinkingPhase");
    expect(src).toContain("setTimeout");
    expect(src).toContain("phase={thinkingPhase}");
    expect(src).not.toContain(ASK_FRAME_AI.answerLead);
  });

  it("renders a persisted answer as conversation ink, not raw markdown", () => {
    const html = renderThread([
      {
        id: USER_MSG,
        role: "user",
        body: "What needs attention",
        lead: null,
        follow: null,
        thumbs: null,
        created_at: "2026-08-19T11:00:00.000Z",
      },
      {
        id: FRAME_AI_MSG,
        role: "globee",
        body: "Harbor Cut is missing **Genre**.",
        lead: "Harbor Cut is missing **Genre**.",
        follow: "- Genre is required before it can go live.\n# Synopsis and `Runtime` are also required.",
        thumbs: null,
        created_at: "2026-08-19T11:10:00.000Z",
      },
    ]);
    const answer = html.slice(
      html.indexOf("data-ask-frame-ai-answer"),
      html.indexOf("data-ask-frame-ai-composer"),
    );
    const visibleAnswer = answer.replace(/<[^>]+>/g, "");

    expect(answer).toContain('data-ask-frame-ai-ink=""');
    expect(answer.match(/data-ask-frame-ai-fact=""/g)?.length).toBe(3);
    expect(answer).toContain("gap-[var(--space-2)]");
    expect(answer).toContain("t-body text-ink");
    expect(answer).toContain("font-medium");
    expect(answer).toMatch(/font-medium[^>]*>Genre</);
    expect(answer).toMatch(/font-medium[^>]*>Synopsis</);
    expect(answer).toMatch(/font-medium[^>]*>Runtime</);
    expect(visibleAnswer).toContain("Harbor Cut is missing Genre.");
    expect(visibleAnswer).toContain("Genre is required before it can go live.");
    expect(visibleAnswer).toContain("Synopsis and Runtime are also required.");
    expect(visibleAnswer).not.toContain("**");
    expect(visibleAnswer).not.toContain("#");
    expect(visibleAnswer).not.toContain("`");
    expect(visibleAnswer).not.toContain("- Genre");
    expect(answer).not.toContain("t-body-sm text-ink-2");
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(src).toContain("parseAskFrameAiInk");
    expect(src).toContain("stackAskFrameAiInkFacts");
    expect(src).not.toContain("Winter Line");
    expect(src).not.toContain("Harbor Lights");
  });

  it("keeps the answered turn flush with no answer bubble", () => {
    const html = renderThread();
    const answer = html.slice(
      html.indexOf("data-ask-frame-ai-answer"),
      html.indexOf("data-ask-frame-ai-composer"),
    );

    expect(visibleText(html)).toContain("Harbor Cut — Synopsis is required.");
    expect(html).not.toContain(ASK_FRAME_AI.attributionName);
    expect(html).toContain(ASK_FRAME_AI.copyLabel);
    expect(html).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(html).toContain(ASK_FRAME_AI.thumbsUpLabel);
    expect(html).toContain(ASK_FRAME_AI.thumbsDownLabel);
    expect(answer).toContain("t-body text-ink");
    expect(answer).not.toContain("rounded-[var(--radius-lg)] bg-surface-muted");
    expect(html).not.toContain("data-ask-frame-ai-thinking");
    expect(html).not.toContain(ASK_FRAME_AI.fetchingSkills);
    expect(html).not.toContain(ASK_FRAME_AI.findingSignal);
    expect(html).not.toContain("Looking at The Winter Line");
    expect(html).not.toContain("Winter Line");
  });

  it("leaves download off the answer footer; copy and thumbs stay", () => {
    const html = renderThread();
    const answer = html.slice(
      html.indexOf("data-ask-frame-ai-answer"),
      html.indexOf("data-ask-frame-ai-composer"),
    );
    const actions = answer.slice(answer.indexOf("data-ask-frame-ai-answer-actions"));

    expect(answer).toContain(`aria-label="${ASK_FRAME_AI.copyLabel}"`);
    expect(answer).toContain(`aria-label="${ASK_FRAME_AI.thumbsUpLabel}"`);
    expect(answer).toContain(`aria-label="${ASK_FRAME_AI.thumbsDownLabel}"`);
    expect(answer).not.toContain(`aria-label="${ASK_FRAME_AI.downloadLabel}"`);
    expect(answer).not.toContain("data-ask-frame-ai-download");
    expect(html).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(src).not.toContain("Download");
    expect(src).not.toContain("askFrameAiDownload");
    expect(src).not.toContain("saveAskFrameAiDownload");
    expect(actions).toContain("gap-[var(--space-2)]");
    expect(actions).toContain("size-4");
    expect(actions).toContain("text-ink-3");
    expect(actions).toContain('fill="currentColor"');
    expect(actions).not.toContain("stroke-width=\"1.33\"");
    expect(actions).not.toContain("gap-[var(--space-4)]");
    expect(src).toContain('className="flex size-4 items-center justify-center text-ink-3"');
  });

  it("hides the 247:378 assistant · time stamp on the answered message", () => {
    const html = renderThread();
    const answer = html.slice(
      html.indexOf("data-ask-frame-ai-answer"),
      html.indexOf("data-ask-frame-ai-composer"),
    );
    const visibleAnswer = visibleText(answer);

    expect(answer).not.toContain(ASK_FRAME_AI.attributionName);
    expect(answer).not.toContain(ASK_FRAME_AI.attribution);
    expect(visibleAnswer).not.toMatch(/Globee AI/);
    expect(visibleAnswer).not.toMatch(/\d{1,2}:\d{2} [AP]M/);
    expect(src).not.toContain("formatAskFrameAiAttribution");
    expect(src).toContain("data-ask-frame-ai-answer-actions");
  });

  it("keeps Access isolation: the upgrade gate never renders this thread", () => {
    const html = renderThread();

    expect(html).toContain('data-ask-frame-ai-thread=""');
    expect(html).not.toContain("data-ask-frame-ai-gate");
    expect(html).not.toContain("data-ask-frame-ai-upgrade");
    expect(html).not.toContain(ASK_FRAME_AI.analyze);
    expect(html).not.toContain(ASK_FRAME_AI.included);
    expect(html).not.toContain(`href="${ASK_FRAME_AI.upgradeHref}"`);
    expect(src).not.toContain("AccessUpgradeGate");
    expect(src).not.toContain("canRenderAskFrameAiThread");
  });
});
