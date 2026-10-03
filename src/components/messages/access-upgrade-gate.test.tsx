import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), push: vi.fn() }),
  usePathname: () => "/messages",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/(app)/aggregation/messages/ask-frame-ai-actions", () => ({
  appendAskFrameAiTurn: vi.fn(),
  setAskFrameAiThumb: vi.fn(),
}));

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { AccessUpgradeGate } from "./access-upgrade-gate";
import { AskFrameAiThread } from "./ask-frame-ai-thread";

const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";

describe("AccessUpgradeGate", () => {
  it("renders 24Frame AI at display size with the two locked lines and Upgrade", () => {
    const html = renderToStaticMarkup(<AccessUpgradeGate />);

    expect(html).toContain('data-ask-frame-ai-gate=""');
    expect(html).toContain('data-ask-frame-ai-headline=""');
    expect(html).toContain("t-display");
    expect(html).toContain(ASK_FRAME_AI.headline);
    expect(html).toContain(ASK_FRAME_AI.analyze);
    expect(html).toContain(ASK_FRAME_AI.included);
    expect(html).toContain(ASK_FRAME_AI.upgrade);
    expect(html).toContain(`href="${ASK_FRAME_AI.upgradeHref}"`);
    expect(html).not.toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain("SearchField");
  });

  it("does not render a ghost conversation, blur, chips, composer, or the Pro thread", () => {
    const html = renderToStaticMarkup(<AccessUpgradeGate />);
    const thread = renderToStaticMarkup(
      <AskFrameAiThread
        initials="A"
        conversation={{
          id: THREAD,
          title: "What needs attention",
          pinned_at: null,
          created_at: "2026-08-19T11:00:00.000Z",
          updated_at: "2026-08-19T11:10:00.000Z",
        }}
        messages={[
          {
            id: "3a2d9c7b-5e4f-4b22-8d33-8c9f2e1b6a55",
            role: "user",
            body: "What needs attention",
            lead: null,
            follow: null,
            thumbs: null,
            created_at: "2026-08-19T11:00:00.000Z",
          },
          {
            id: "4b3e0d8c-6f50-4c33-9e44-9d0a3f2c7b66",
            role: "globee",
            body: "Harbor Cut — Synopsis is required.",
            lead: "Harbor Cut — Synopsis is required.",
            follow: null,
            thumbs: null,
            created_at: "2026-08-19T11:10:00.000Z",
          },
        ]}
      />,
    );

    expect(html).not.toContain("data-ask-frame-ai-thread");
    expect(html).not.toContain("data-ask-frame-ai-composer");
    expect(html).not.toContain("data-ask-frame-ai-history");
    expect(html).not.toContain(ASK_FRAME_AI.threadTitle);
    expect(html).not.toContain(ASK_FRAME_AI.answerLead);
    expect(html).not.toContain(ASK_FRAME_AI.attribution);
    expect(html).not.toContain(ASK_FRAME_AI.composerPlaceholder);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.tryLabel);
    expect(html).not.toContain("data-ask-frame-ai-landing");
    expect(html).not.toContain("data-ask-frame-ai-chip");
    for (const label of ASK_FRAME_AI.tryPrompts) {
      expect(html).not.toContain(label);
    }
    expect(html).not.toMatch(/blur|backdrop-blur|ghost/i);
    expect(html).not.toContain("chip");

    expect(thread).toContain("data-ask-frame-ai-thread");
    expect(html).not.toContain("data-ask-frame-ai-user-row");
  });
});
