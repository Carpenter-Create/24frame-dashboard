import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Rows navigate with the router (see HistoryGroup). Static markup has no app router.
vi.mock("next/navigation", () => ({
  usePathname: () => "/social",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import { ASK_AI_HISTORY_ROW_TITLE_CLASS } from "@/lib/ask-ai-overlay";
import { ASK_FRAME_AI, ASK_FRAME_AI_TITLE_MAX, askFrameAiConversationTitle } from "@/lib/ask-frame-ai";
import { housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { stripSourceComments } from "@/test/strip-source-comments";
import { AskFrameAiHistoryClock, AskFrameAiHistoryPanel } from "./ask-frame-ai-history";

function visible(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ask-frame-ai-history.tsx"), "utf8");
const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";
const OLDER = "5c4f1e9d-7a61-4d44-8f55-0e1b4a3d8c77";
const NOW = new Date(2026, 7, 19, 15, 10, 0);

describe("AskFrameAiHistoryPanel", () => {
  it("locks the 384 hairline popover craft with search and groups", () => {
    const html = visible(
      renderToStaticMarkup(
        <AskFrameAiHistoryPanel
          conversations={[
            {
              id: THREAD,
              title: "What needs attention",
              pinned_at: null,
              created_at: "2026-08-19T11:00:00.000Z",
              updated_at: new Date(2026, 7, 19, 7, 10, 0).toISOString(),
            },
            {
              id: OLDER,
              title: "What should I submit next",
              pinned_at: null,
              created_at: "2026-08-01T11:00:00.000Z",
              updated_at: new Date(2026, 7, 1, 7, 10, 0).toISOString(),
            },
          ]}
          currentId={THREAD}
          now={NOW}
        />,
      ),
    );

    expect(html).toContain("data-ask-frame-ai-history-popover");
    expect(html).toContain("w-[384px]");
    expect(html).toContain("max-md:w-full");
    expect(html).toContain("max-md:max-w-none");
    expect(html).toContain("max-md:rounded-none");
    expect(html).toContain("max-md:border-0");
    expect(html).toContain("data-ask-frame-ai-history-list");
    expect(html).toContain("max-md:overflow-y-scroll");
    expect(html).toContain("max-md:[touch-action:pan-y]");
    expect(html).toContain("border-hairline");
    expect(html).toContain("rounded-[12px]");
    expect(html).toContain("p-[var(--space-6)]");
    expect(html).toContain("gap-[var(--space-6)]");
    expect(html).toContain("shadow-none");
    expect(html).not.toContain("shadow-[");
    expect(html).toContain(ASK_FRAME_AI.historySearchPlaceholder);
    expect(html).toContain("bg-transparent");
    expect(html).toContain(ASK_FRAME_AI.thisWeekLabel);
    expect(html).toContain(ASK_FRAME_AI.allThreadsLabel);
    expect(html).toContain("t-label text-ink-3");
    expect(html).toContain("t-body text-ink");
    expect(html).toContain("t-body-sm text-ink-3");
    expect(html).toContain("What needs attention");
    expect(html).toContain("What should I submit next");
    expect(html).toContain("data-ask-frame-ai-history-current");
    expect(html).toContain("border border-hairline bg-transparent");
    expect(html).toContain("t-control");
    expect(html).not.toMatch(/data-ask-frame-ai-history-search=""[^>]*py-2/);
    expect(src).toContain('variant="bare"');
    expect(html).toContain(`?ai=${THREAD}`);
    expect(html).not.toContain("/messages?thread=");
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(html).not.toContain("Get support");
    expect(src).toContain("shadow-none");
    expect(src).toContain("conversations");
    expect(src).toContain("ASK_AI_OVERLAY_PHONE_HISTORY_CLASS");
    expect(src).toContain("ASK_AI_OVERLAY_PHONE_HISTORY_LIST_CLASS");
    expect(src).toContain("max-md:hidden");
    expect(src).toContain("[data-ask-ai-overlay-phone-history]");
    expect(src).not.toMatch(/title:\s*"What's blocking/);
  });

  it("renders empty history as empty, with no fixture rows", () => {
    const html = visible(
      renderToStaticMarkup(
        <AskFrameAiHistoryPanel conversations={[]} now={NOW} />,
      ),
    );

    expect(html).toContain("data-ask-frame-ai-history-popover");
    expect(html).toContain(ASK_FRAME_AI.historySearchPlaceholder);
    expect(html).not.toContain("data-ask-frame-ai-history-row");
    expect(html).not.toContain(ASK_FRAME_AI.thisWeekLabel);
    expect(html).not.toContain(ASK_FRAME_AI.allThreadsLabel);
    expect(html).not.toContain("Winter Line");
    expect(html).not.toContain("Harbor Lights");
    expect(html).not.toContain("Get support");
    expect(html).not.toContain(ASK_FRAME_AI.historyLabel);
  });

  it("renders the header history clock fully on-screen, aligned to the trailing chrome", () => {
    const html = visible(
      renderToStaticMarkup(
        <AskFrameAiHistoryClock conversations={[]} open={false} onOpenChange={() => {}} />,
      ),
    );

    expect(html).toContain('data-ask-frame-ai-clock=""');
    expect(html).toContain(ASK_FRAME_AI.pastConversationsLabel);
    expect(html).toContain("size-[44px]");
    expect(html).not.toContain("md:size-4");
    expect(html).not.toContain("absolute left-0 top-0");
    expect(src).toContain('align === "end" ? "right-0" : "left-0"');
    expect(src).toContain("AskFrameAiHistoryClock");
    expect(src).toContain("MOBILE_CHROME_ICON_BUTTON_CLASS");
  });
});

describe("AskFrameAiHistoryPanel: a long title wraps (house gospel 2026-09-19)", () => {
  const TITLE = askFrameAiConversationTitle(
    "Which of my titles are still missing artwork or captions before the October delivery window closes",
  );

  it("renders an 80-character title in the house wrap, with the time still on its right", () => {
    expect(TITLE).toHaveLength(ASK_FRAME_AI_TITLE_MAX);
    const html = visible(
      renderToStaticMarkup(
        <AskFrameAiHistoryPanel
          conversations={[
            {
              id: THREAD,
              title: TITLE,
              pinned_at: null,
              created_at: "2026-08-19T11:00:00.000Z",
              updated_at: new Date(2026, 7, 19, 7, 10, 0).toISOString(),
            },
          ]}
          now={NOW}
        />,
      ),
    );
    const row = html.slice(html.indexOf("data-ask-frame-ai-history-row"), html.indexOf("</li>"));
    expect(row).toContain(
      `<span class="${ASK_AI_HISTORY_ROW_TITLE_CLASS}">${TITLE}</span><span class="shrink-0 t-body-sm text-ink-3">`,
    );
    expect(housePhoneForbidsTruncate(row)).toBe(true);
  });

  it("keeps the row title on the shared constant in the source", () => {
    expect(stripSourceComments(src)).toMatch(
      /^\s*<span className=\{ASK_AI_HISTORY_ROW_TITLE_CLASS\}>\{row\.title\}<\/span>$/m,
    );
  });
});
