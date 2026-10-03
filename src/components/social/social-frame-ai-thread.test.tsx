import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/social/dms/24frame-ai",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/(app)/aggregation/messages/ask-frame-ai-actions", () => ({
  appendAskFrameAiTurn: vi.fn(),
  completeAskFrameAiTurn: vi.fn(),
  startAskFrameAiConversation: vi.fn(),
  loadSocialFrameAiThread: vi.fn(),
}));

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { ASSISTANT_NAME } from "@/lib/product";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_FRAME_AI_OPENER } from "@/lib/social-frame-ai";
import type { AskFrameAiStoredMessage } from "@/lib/ask-frame-ai-conversations";
import { SocialFrameAiThread } from "./social-frame-ai-thread";

const src = readFileSync("src/components/social/social-frame-ai-thread.tsx", "utf8");
const pageSrc = readFileSync("src/app/(app)/social/dms/24frame-ai/page.tsx", "utf8");

const USER: AskFrameAiStoredMessage = {
  id: "3a2d9c7b-5e4f-4b22-8d33-8c9f2e1b6a55",
  role: "user",
  body: "What needs attention",
  lead: null,
  follow: null,
  thumbs: null,
  created_at: "2026-10-01T12:00:00.000Z",
};
const ANSWER: AskFrameAiStoredMessage = {
  id: "4b3e0d8c-6f50-4c33-9e44-9d0a3f2c7b66",
  role: "globee",
  body: "Harbor Cut is missing Synopsis.",
  lead: "Harbor Cut is missing Synopsis.",
  follow: "Runtime is also required.",
  thumbs: null,
  created_at: "2026-10-01T12:01:00.000Z",
};

function visible(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

function renderThread(
  props: Partial<{
    ready: boolean;
    messages: AskFrameAiStoredMessage[];
    share: {
      kind: "post";
      line: string;
      authorName: string;
      authorPhotoUrl: string | null;
      caption: string | null;
      unavailable: boolean;
      mediaKind: null;
      url: null;
      href: string;
    } | null;
  }> = {},
) {
  return visible(
    renderToStaticMarkup(
      createElement(SocialFrameAiThread, {
        ready: props.ready ?? true,
        conversationId: props.messages?.length ? "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44" : null,
        messages: props.messages ?? [],
        share: props.share ?? null,
      }),
    ),
  );
}

describe("SocialFrameAiThread", () => {
  it("opens as a DM thread and says the soft opener once when empty", () => {
    const html = renderThread();
    expect(html).toContain('data-social-frame-ai-thread=""');
    expect(html).toContain('data-social-dm-header=""');
    expect(html).toContain('href="/social/dms"');
    expect(html).toContain(ASSISTANT_NAME);
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain('data-social-frame-ai-opener=""');
    expect(html).toContain(SOCIAL_FRAME_AI_OPENER);
    expect(html).toContain(`placeholder="${SOCIAL.dms.threadPlaceholder}"`);
    expect(html).toContain('data-social-dm-composer=""');
    expect(html).not.toContain("?ai=1");
  });

  it("keeps history and does not repeat the opener", () => {
    const html = renderThread({ messages: [USER, ANSWER] });
    expect(html).not.toContain('data-social-frame-ai-opener=""');
    expect(html).not.toContain(SOCIAL_FRAME_AI_OPENER);
    expect(html).toContain(USER.body);
    expect(html).toContain(ANSWER.lead ?? "");
    expect(html).toContain("Runtime is also required.");
  });

  it("shows a shared post on the same thread without asking the model", () => {
    const html = renderThread({
      messages: [USER, ANSWER],
      share: {
        kind: "post",
        line: "You sent @acarpcreate's post",
        authorName: "acarpcreate",
        authorPhotoUrl: null,
        caption: "Cheese please test",
        unavailable: false,
        mediaKind: null,
        url: null,
        href: "/social/p/post-1",
      },
    });
    expect(html).toContain("You sent @acarpcreate's post");
    expect(html).toContain("Cheese please test");
    expect(html).toContain('data-social-dm-post-share=""');
    expect(html).not.toContain('data-social-frame-ai-opener=""');
  });

  it("uses the Ask stack and does not send the opener", () => {
    expect(src).toContain("startAskFrameAiConversation");
    expect(src).toContain("appendAskFrameAiTurn");
    expect(src).toContain("completeAskFrameAiTurn");
    expect(src).not.toContain("startAskFrameAiConversation(SOCIAL_FRAME_AI_OPENER)");
    expect(src).not.toContain("appendAskFrameAiTurn(conversationId, SOCIAL_FRAME_AI_OPENER)");
    expect(pageSrc).toContain("loadSocialFrameAiThread");
    expect(pageSrc).toContain("loadSocialFrameAiShare");
    expect(pageSrc).not.toContain("?ai=1");
    expect(pageSrc).not.toContain("askAiOverlayHref");
  });

  it("still opens when Ask is gated, without the opener", () => {
    const html = renderThread({ ready: false });
    expect(html).toContain('data-social-frame-ai-thread=""');
    expect(html).toContain('data-social-frame-ai-gate=""');
    expect(html).toContain(ASK_FRAME_AI.included);
    expect(html).toContain(ASK_FRAME_AI.upgrade);
    expect(html).not.toContain(SOCIAL_FRAME_AI_OPENER);
    expect(html).toContain(`placeholder="${SOCIAL.dms.threadPlaceholder}"`);
  });
});
