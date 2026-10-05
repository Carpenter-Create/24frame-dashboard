import { describe, expect, it } from "vitest";

import { USER_MENU } from "@/lib/user-menu";
import {
  ASK_FRAME_AI,
  ASK_FRAME_AI_TRY_PROMPTS,
  askFrameAiChipActivation,
  askFrameAiComposerSubmit,
  askFrameAiConversationTitle,
  askFrameAiLandingGreeting,
  askFrameAiLandingHref,
  askFrameAiSelectedChip,
  ASK_FRAME_AI_FETCHING_HOLD_MS,
  askFrameAiInFlightLead,
  askFrameAiThinkingPhase,
  askFrameAiThinkingVerb,
  askFrameAiThreadHref,
  askFrameAiUsesModel,
  canRenderAskFrameAiLanding,
  canRenderAskFrameAiThread,
  isAskFrameAiTier,
  isAskFrameAiThreadId,
  isAskFrameAiUnlocked,
  messagesShowsThreadHeader,
  readAskFrameAiPrompt,
  readAskFrameAiThreadId,
  resolveMessagesSurface,
  showMessagesHeaderSearch,
} from "@/lib/ask-frame-ai";

const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";

describe("24Frame AI copy lock", () => {
  it("keeps the Access gate lines and Upgrade path", () => {
    expect(ASK_FRAME_AI.headline).toBe("Ask 24Frame AI");
    expect(ASK_FRAME_AI.pageTitle).toBe("Ask 24Frame AI");
    expect(ASK_FRAME_AI.frameAiMark).toBe("AI");
    expect(ASK_FRAME_AI.frameAiMark).not.toBe("G");
    expect(ASK_FRAME_AI.analyze).toBe("Analyze anything about your catalog.");
    expect(ASK_FRAME_AI.included).toBe("Included with Pro and Premium.");
    expect(ASK_FRAME_AI.upgrade).toBe("Upgrade");
    expect(ASK_FRAME_AI.upgradeHref).toBe("/settings/agreements");
    expect(ASK_FRAME_AI.upgradeHref).toBe(USER_MENU.agreementsHref);
  });

  it("keeps leftover 7:73 lines as do-not-render locks and the Mercury-direct greeting", () => {
    expect(ASK_FRAME_AI.need).toBe("What do you need?");
    expect(ASK_FRAME_AI.tryLabel).toBe("Try one of these");
    expect(ASK_FRAME_AI.greetingAsk).toBe("How can I be helpful?");
    expect(askFrameAiLandingGreeting({ firstName: "Ada", displayName: "Ada Lovelace" })).toBe(
      "Hi, Ada. How can I be helpful?",
    );
    expect(askFrameAiLandingGreeting({ displayName: "Ada Lovelace" })).toBe(
      "Hi, Ada. How can I be helpful?",
    );
    expect(askFrameAiLandingGreeting({})).toBe("How can I be helpful?");
    expect(askFrameAiLandingGreeting({ displayName: "ada@example.com" })).toBe(
      "How can I be helpful?",
    );
    expect(askFrameAiLandingGreeting({ firstName: "Ada" })).not.toContain("Hey");
    expect(askFrameAiLandingGreeting({ firstName: "Ada" })).not.toContain(ASK_FRAME_AI.headline);
    expect(ASK_FRAME_AI.historyLabel).toBe("History");
    expect(ASK_FRAME_AI.historySearchPlaceholder).toBe("Search past conversations");
    expect(ASK_FRAME_AI.thisWeekLabel).toBe("This week");
    expect(ASK_FRAME_AI.allThreadsLabel).toBe("All threads");
    expect(ASK_FRAME_AI.pastConversationsLabel).toBe("Past conversations");
    expect(ASK_FRAME_AI.newConversationLabel).toBe("New conversation");
    expect(ASK_FRAME_AI.tryPrompts).toEqual([
      "What needs attention",
      "What is blocking a title",
      "What should I submit next",
    ]);
    expect(ASK_FRAME_AI.tryPrompts).toBe(ASK_FRAME_AI_TRY_PROMPTS);
    expect(ASK_FRAME_AI.composerPlaceholder).toBe("Ask a question or give a command.");
    expect(ASK_FRAME_AI.composerPlaceholderMobile).toBe("Ask a question or give a command");
    expect(ASK_FRAME_AI.composerPlaceholderMobile.endsWith(".")).toBe(false);
    expect(ASK_FRAME_AI.composerPlaceholder.endsWith(".")).toBe(true);
    for (const label of ASK_FRAME_AI.tryPrompts) {
      expect(label).not.toMatch(/Winter Line|Harbor Lights|Get support/i);
    }
  });

  it("keeps the honest capability, empty-catalog, and drawn menu lines", () => {
    expect(ASK_FRAME_AI.capability).toBe(
      "I can answer catalog attention, blockers, and what to submit next.",
    );
    expect(ASK_FRAME_AI.emptyBlocking).toBe("Nothing required is blocking a title.");
    expect(ASK_FRAME_AI.emptySubmitNext).toBe("Nothing is ready to submit next.");
    expect(ASK_FRAME_AI.thinking).toBe("Thinking");
    expect(ASK_FRAME_AI.fetchingSkills).toBe("fetching relevant skills…");
    expect(ASK_FRAME_AI.findingSignal).toBe("finding the signal…");
    expect(ASK_FRAME_AI.fetchingSkills.endsWith("…")).toBe(true);
    expect(ASK_FRAME_AI.findingSignal.endsWith("…")).toBe(true);
    expect(ASK_FRAME_AI.stop).toBe("Stop");
    expect(ASK_FRAME_AI.stopHint).toBe("Esc");
    expect(ASK_FRAME_AI.escToCancel).toBe("Esc to cancel");
    expect(ASK_FRAME_AI.unavailable).toBe(
      "24Frame AI is unavailable right now. Try again, or ask what needs attention.",
    );
    expect(ASK_FRAME_AI.attributionName).toBe("24Frame AI");
    expect(ASK_FRAME_AI.downloadLabel).toBe("Download");
    expect(ASK_FRAME_AI.downloadPdfLabel).toBe("Download PDF");
    expect(ASK_FRAME_AI.renameLabel).toBe("Rename");
    expect(ASK_FRAME_AI.pinLabel).toBe("Pin");
    expect(ASK_FRAME_AI.deleteLabel).toBe("Delete");
    expect(ASK_FRAME_AI.deleteTitle).toBe("Delete conversation");
    expect(ASK_FRAME_AI.deleteBody).toBe(
      "This permanently deletes the conversation and cannot be undone.",
    );
    expect(ASK_FRAME_AI.deleteBody).not.toContain(". It cannot");
    expect(ASK_FRAME_AI.deleteConfirm).toBe("Delete");
    expect(ASK_FRAME_AI.cancelLabel).toBe("Cancel");
    expect(JSON.stringify(ASK_FRAME_AI)).not.toMatch(/Archive/i);
  });

  it("keeps the 247:295 fixture lines as a do-not-render lock", () => {
    expect(ASK_FRAME_AI.threadTitle).toBe("What's blocking The Winter Line");
    expect(ASK_FRAME_AI.userPrompt).toBe("What's blocking The Winter Line?");
    expect(ASK_FRAME_AI.answerLead).toBe(
      "The Winter Line is missing Genre. Genre is required before it can go live.",
    );
    expect(ASK_FRAME_AI.answerFollow).toBe(
      "Synopsis and Runtime are also required. Director is recommended.",
    );
    expect(ASK_FRAME_AI.attribution).toBe("24Frame AI · 7:10 AM");
  });
});

describe("isAskFrameAiTier / isAskFrameAiUnlocked", () => {
  it("accepts only the existing tier vocabulary", () => {
    expect(isAskFrameAiTier("access")).toBe(true);
    expect(isAskFrameAiTier("pro")).toBe(true);
    expect(isAskFrameAiTier("premium")).toBe(true);
    expect(isAskFrameAiTier(null)).toBe(false);
    expect(isAskFrameAiTier("enterprise")).toBe(false);
  });

  it("unlocks only pro and premium", () => {
    expect(isAskFrameAiUnlocked("access")).toBe(false);
    expect(isAskFrameAiUnlocked(null)).toBe(false);
    expect(isAskFrameAiUnlocked("pro")).toBe(true);
    expect(isAskFrameAiUnlocked("premium")).toBe(true);
  });
});

describe("resolveMessagesSurface", () => {
  it("keeps staff without a client org on the notification inbox", () => {
    expect(
      resolveMessagesSurface({ isGcStaff: true, hasActiveOrg: false, tier: null }),
    ).toBe("staff-inbox");
  });

  it("defaults a missing or Access tier to the upgrade gate", () => {
    expect(
      resolveMessagesSurface({ isGcStaff: false, hasActiveOrg: true, tier: null }),
    ).toBe("access-gate");
    expect(
      resolveMessagesSurface({ isGcStaff: false, hasActiveOrg: true, tier: "access" }),
    ).toBe("access-gate");
    expect(
      resolveMessagesSurface({ isGcStaff: true, hasActiveOrg: true, tier: "access" }),
    ).toBe("access-gate");
  });

  it("unlocks the 7:73 landing only for pro or premium", () => {
    expect(
      resolveMessagesSurface({ isGcStaff: false, hasActiveOrg: true, tier: "pro" }),
    ).toBe("ask-frame-ai-landing");
    expect(
      resolveMessagesSurface({ isGcStaff: true, hasActiveOrg: true, tier: "premium" }),
    ).toBe("ask-frame-ai-landing");
  });

  it("never treats staff-without-org as a client gate, landing, or thread", () => {
    const surface = resolveMessagesSurface({
      isGcStaff: true,
      hasActiveOrg: false,
      tier: "premium",
    });
    expect(surface).toBe("staff-inbox");
    expect(canRenderAskFrameAiLanding(surface)).toBe(false);
    expect(canRenderAskFrameAiThread(surface)).toBe(false);
    expect(showMessagesHeaderSearch(surface)).toBe(false);
  });
});

describe("canRenderAskFrameAiThread / showMessagesHeaderSearch", () => {
  it("locks the thread, landing, and header Search to the authorized surfaces", () => {
    expect(canRenderAskFrameAiLanding("ask-frame-ai-landing")).toBe(true);
    expect(canRenderAskFrameAiLanding("access-gate")).toBe(false);
    expect(canRenderAskFrameAiLanding("staff-inbox")).toBe(false);
    expect(canRenderAskFrameAiLanding("ask-frame-ai-thread")).toBe(false);

    expect(canRenderAskFrameAiThread("access-gate")).toBe(false);
    expect(canRenderAskFrameAiThread("staff-inbox")).toBe(false);
    expect(canRenderAskFrameAiThread("ask-frame-ai-landing")).toBe(false);
    expect(canRenderAskFrameAiThread("ask-frame-ai-thread")).toBe(true);

    expect(showMessagesHeaderSearch("access-gate")).toBe(true);
    expect(showMessagesHeaderSearch("ask-frame-ai-landing")).toBe(false);
    expect(showMessagesHeaderSearch("ask-frame-ai-thread")).toBe(false);
    expect(showMessagesHeaderSearch("staff-inbox")).toBe(false);
  });
});

describe("24Frame AI send helpers", () => {
  it("chip activation fills, selects, and sends the same label", () => {
    const activation = askFrameAiChipActivation("What needs attention");
    expect(activation).toEqual({
      prompt: "What needs attention",
      selected: "What needs attention",
      send: "What needs attention",
    });
  });

  it("composer submit sends a trimmed prompt and ignores blanks", () => {
    expect(askFrameAiComposerSubmit("  What needs attention  ")).toBe("What needs attention");
    expect(askFrameAiComposerSubmit("   ")).toBeNull();
  });

  it("opens a persisted thread by id, never a ?q= rewrite", () => {
    expect(isAskFrameAiThreadId(THREAD)).toBe(true);
    expect(askFrameAiThreadHref(THREAD)).toBe(`?ai=${THREAD}`);
    expect(askFrameAiThreadHref("What needs attention")).toBeNull();
    expect(askFrameAiThreadHref("   ")).toBeNull();
    expect(readAskFrameAiThreadId({ thread: THREAD })).toBe(THREAD);
    expect(readAskFrameAiThreadId(new URLSearchParams(`thread=${THREAD}`))).toBe(THREAD);
    expect(readAskFrameAiThreadId({ thread: "not-a-uuid" })).toBeNull();
    expect(readAskFrameAiThreadId({ q: "What needs attention" })).toBeNull();
    expect(readAskFrameAiPrompt({ q: "What needs attention" })).toBe("What needs attention");
    expect(askFrameAiLandingHref()).toBe("?ai=1");
    expect(askFrameAiSelectedChip("  what needs attention  ")).toBe("What needs attention");
    expect(askFrameAiSelectedChip("unmapped")).toBeNull();
    expect(askFrameAiUsesModel("How many titles are in my catalog?")).toBe(true);
    expect(askFrameAiUsesModel("Would you help guide me?")).toBe(true);
    expect(askFrameAiUsesModel("   ")).toBe(false);
  });

  it("sets thinking chrome for the three landing chip strings", () => {
    for (const label of ASK_FRAME_AI_TRY_PROMPTS) {
      expect(askFrameAiUsesModel(label)).toBe(true);
      expect(askFrameAiUsesModel(`  ${label}  `)).toBe(true);
    }
  });

  it("plays fetching then finding from elapsed time, not a lead that never arrives", () => {
    expect(ASK_FRAME_AI_FETCHING_HOLD_MS).toBe(1000);
    expect(askFrameAiThinkingPhase(0)).toBe("fetching");
    expect(askFrameAiThinkingPhase(ASK_FRAME_AI_FETCHING_HOLD_MS - 1)).toBe("fetching");
    expect(askFrameAiThinkingPhase(ASK_FRAME_AI_FETCHING_HOLD_MS)).toBe("finding");
    expect(askFrameAiThinkingVerb("fetching")).toBe(ASK_FRAME_AI.fetchingSkills);
    expect(askFrameAiThinkingVerb("finding")).toBe(ASK_FRAME_AI.findingSignal);
    expect(askFrameAiInFlightLead("fetching", "Harbor Cut — Synopsis is required.")).toBeNull();
    expect(askFrameAiInFlightLead("finding", null)).toBeNull();
    expect(askFrameAiInFlightLead("finding", "   ")).toBeNull();
    expect(askFrameAiInFlightLead("finding", "Harbor Cut — Synopsis is required.")).toBe(
      "Harbor Cut — Synopsis is required.",
    );
    expect(askFrameAiThinkingVerb("finding")).not.toContain("Winter Line");
    expect(askFrameAiInFlightLead("finding", "Harbor Cut — Synopsis is required.")).not.toContain(
      "Looking at",
    );
  });

  it("truncates a long first prompt into the conversation title", () => {
    const long =
      "What needs attention on every title in this catalog right now and also later today";
    expect(askFrameAiConversationTitle("  What needs attention  ")).toBe("What needs attention");
    expect(askFrameAiConversationTitle(long).endsWith("…")).toBe(true);
    expect(askFrameAiConversationTitle(long).length).toBeLessThanOrEqual(80);
  });

  it("shows the thread header only for an unlocked surface with a thread id", () => {
    expect(messagesShowsThreadHeader("access-gate", THREAD)).toBe(false);
    expect(messagesShowsThreadHeader("staff-inbox", THREAD)).toBe(false);
    expect(messagesShowsThreadHeader("ask-frame-ai-landing", null)).toBe(false);
    expect(messagesShowsThreadHeader("ask-frame-ai-landing", THREAD)).toBe(true);
    expect(messagesShowsThreadHeader("ask-frame-ai-thread", null)).toBe(true);
  });
});
