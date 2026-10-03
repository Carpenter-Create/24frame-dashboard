import { ASK_ASSISTANT, ASSISTANT_NAME } from "@/lib/product";
import { HOME_GREETING_BARE, homeGreetingFirst } from "@/lib/home-greeting";
import { USER_MENU } from "@/lib/user-menu";

// 24Frame AI copy and gating. Lives in lib/, not JSX.
// Access sees the upgrade gate only. Pro/Premium see the 7:73 landing, then
// 247:295 chrome on a persisted thread. Landing chips are suggested prompts —
// same catalog-grounded operator as unmapped free text. Landing persists the
// user turn and opens the thread; thinking chrome lives on the thread while
// the operator runs. In-flight sequence: empty lead + fetching relevant
// skills…, then finding the signal… (optional live catalog lead as the ink
// line). Time advances the verb — do not wait for a lead that never arrives.
// Never a hardcoded Winter Line fact, never an ai_conversation_messages row.
// Tools may still use the findings lookup internally. Winter Line fixture
// strings stay here as a do-not-render lock. No checkout.

export type AskFrameAiTier = "access" | "pro" | "premium";

export type AskFrameAiThinkingPhase = "fetching" | "finding";

// Readable hold on fetching before finding chrome. House 8/16/24/48 scale.
export const ASK_FRAME_AI_FETCHING_HOLD_MS = 1000;

export type MessagesSurface =
  | "staff-inbox"
  | "access-gate"
  | "ask-frame-ai-landing"
  | "ask-frame-ai-thread";

export const ASK_FRAME_AI_TRY_PROMPTS = [
  "What needs attention",
  "What is blocking a title",
  "What should I submit next",
] as const;

// Quiet leading marks for the first three try chips (Figma 462:502).
// Copy stays on tryPrompts; marks attach by index only.
export const ASK_FRAME_AI_CHIP_MARKS = ["alert", "slash", "send"] as const;

export type AskFrameAiChipMark = (typeof ASK_FRAME_AI_CHIP_MARKS)[number];

export function askFrameAiChipMark(index: number): AskFrameAiChipMark | null {
  return ASK_FRAME_AI_CHIP_MARKS[index] ?? null;
}

export const ASK_FRAME_AI = {
  pageTitle: ASK_ASSISTANT,
  headline: ASK_ASSISTANT,
  // Leftover 7:73 greeting — do not render on landing. Do not invent a replacement.
  need: "What do you need?",
  // Leftover 7:73 marketing label — do not render. Chips stack under the greeting.
  tryLabel: "Try one of these",
  // Mercury-direct landing. House "Hi" + first name, never Hey / invented names.
  greetingAsk: "How can I be helpful?",
  tryPrompts: ASK_FRAME_AI_TRY_PROMPTS,
  historyLabel: "History",
  historySearchPlaceholder: "Search past conversations",
  thisWeekLabel: "This week",
  allThreadsLabel: "All threads",
  pastConversationsLabel: "Past conversations",
  newConversationLabel: "New conversation",
  analyze: "Analyze anything about your catalog.",
  included: "Included with Pro and Premium.",
  upgrade: "Upgrade",
  upgradeHref: USER_MENU.agreementsHref,
  headerSearchPlaceholder: "Search",
  headerSearchHint: "⌘K",
  threadTitle: "What's blocking The Winter Line",
  userPrompt: "What's blocking The Winter Line?",
  answerLead: "The Winter Line is missing Genre. Genre is required before it can go live.",
  answerFollow: "Synopsis and Runtime are also required. Director is recommended.",
  attribution: `${ASSISTANT_NAME} · 7:10 AM`,
  composerPlaceholder: "Ask a question or give a command.",
  // Landing 7:73 + 462:502 — same line, no period. Thread 247:295 keeps the period.
  composerPlaceholderMobile: "Ask a question or give a command",
  frameAiMark: "AI",
  copyLabel: "Copy",
  downloadLabel: "Download",
  downloadPdfLabel: "Download PDF",
  thumbsUpLabel: "Helpful",
  thumbsDownLabel: "Not helpful",
  moreLabel: "More",
  backLabel: "Back",
  sendLabel: "Send",
  attributionName: ASSISTANT_NAME,
  renameLabel: "Rename",
  pinLabel: "Pin",
  unpinLabel: "Unpin",
  deleteLabel: "Delete",
  renameTitle: "Rename conversation",
  renameSave: "Save",
  deleteTitle: "Delete conversation",
  // One line. Confirm stays; chrome is thin danger text, not a filled accent.
  deleteBody: "This permanently deletes the conversation and cannot be undone.",
  deleteConfirm: "Delete",
  cancelLabel: "Cancel",
  capability: "I can answer catalog attention, blockers, and what to submit next.",
  emptyBlocking: "Nothing required is blocking a title.",
  emptySubmitNext: "Nothing is ready to submit next.",
  thinking: "Thinking",
  fetchingSkills: "fetching relevant skills…",
  findingSignal: "finding the signal…",
  stop: "Stop",
  stopHint: "Esc",
  escToCancel: "Esc to cancel",
  unavailable: `${ASSISTANT_NAME} is unavailable right now. Try again, or ask what needs attention.`,
} as const;

export const ASK_FRAME_AI_QUERY = "q";
export const ASK_FRAME_AI_THREAD_QUERY = "thread";
export const ASK_FRAME_AI_TITLE_MAX = 80;

const THREAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAskFrameAiThreadId(value: string): boolean {
  return THREAD_ID_RE.test(value);
}

function readSearchValue(
  search: { get(name: string): string | null } | Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const raw =
    "get" in search && typeof search.get === "function"
      ? search.get(name)
      : (search as Record<string, string | string[] | undefined>)[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readAskFrameAiPrompt(
  search: { get(name: string): string | null } | Record<string, string | string[] | undefined>,
): string | null {
  return readSearchValue(search, ASK_FRAME_AI_QUERY);
}

export function readAskFrameAiThreadId(
  search: { get(name: string): string | null } | Record<string, string | string[] | undefined>,
): string | null {
  const overlay = readSearchValue(search, "ai");
  if (overlay && isAskFrameAiThreadId(overlay)) return overlay;
  const value = readSearchValue(search, ASK_FRAME_AI_THREAD_QUERY);
  return value && isAskFrameAiThreadId(value) ? value : null;
}

export function askFrameAiThreadHref(threadId: string): string | null {
  const next = threadId.trim();
  if (!isAskFrameAiThreadId(next)) return null;
  return `?ai=${encodeURIComponent(next)}`;
}

export function askFrameAiLandingHref(): string {
  return "?ai=1";
}

/** `Hi, {First}. How can I be helpful?` when a first name exists; otherwise the ask. */
export function askFrameAiLandingGreeting(input: {
  firstName?: string | null;
  displayName?: string | null;
} = {}): string {
  const first = homeGreetingFirst(input);
  return first ? `${HOME_GREETING_BARE}, ${first}. ${ASK_FRAME_AI.greetingAsk}` : ASK_FRAME_AI.greetingAsk;
}

export function askFrameAiComposerSubmit(prompt: string): string | null {
  const next = prompt.trim();
  return next.length > 0 ? next : null;
}

export function askFrameAiConversationTitle(prompt: string, max = ASK_FRAME_AI_TITLE_MAX): string {
  const next = prompt.trim().replace(/\s+/g, " ");
  if (next.length <= max) return next;
  if (max <= 1) return next.slice(0, max);
  return `${next.slice(0, max - 1).trimEnd()}…`;
}

export function askFrameAiSelectedChip(prompt: string): (typeof ASK_FRAME_AI_TRY_PROMPTS)[number] | null {
  const normalized = prompt.trim().toLowerCase();
  return ASK_FRAME_AI_TRY_PROMPTS.find((label) => label.toLowerCase() === normalized) ?? null;
}

export function askFrameAiChipActivation(label: (typeof ASK_FRAME_AI_TRY_PROMPTS)[number]): {
  prompt: string;
  selected: (typeof ASK_FRAME_AI_TRY_PROMPTS)[number];
  send: string;
} {
  return { prompt: label, selected: label, send: label };
}

export function askFrameAiUsesModel(prompt: string): boolean {
  return askFrameAiComposerSubmit(prompt) !== null;
}

export function askFrameAiThinkingPhase(elapsedMs: number): AskFrameAiThinkingPhase {
  return elapsedMs < ASK_FRAME_AI_FETCHING_HOLD_MS ? "fetching" : "finding";
}

export function askFrameAiThinkingVerb(phase: AskFrameAiThinkingPhase): string {
  return phase === "finding" ? ASK_FRAME_AI.findingSignal : ASK_FRAME_AI.fetchingSkills;
}

export function askFrameAiInFlightLead(
  phase: AskFrameAiThinkingPhase,
  lead: string | null | undefined,
): string | null {
  if (phase !== "finding") return null;
  const next = lead?.trim() ?? "";
  return next.length > 0 ? next : null;
}

export function messagesShowsThreadHeader(surface: MessagesSurface, threadId: string | null): boolean {
  if (surface === "access-gate" || surface === "staff-inbox") return false;
  if (surface === "ask-frame-ai-thread") return true;
  return surface === "ask-frame-ai-landing" && !!threadId;
}

export const ASK_FRAME_AI_UNLOCKED_TIERS = ["pro", "premium"] as const;

export function isAskFrameAiTier(value: unknown): value is AskFrameAiTier {
  return value === "access" || value === "pro" || value === "premium";
}

export function isAskFrameAiUnlocked(tier: AskFrameAiTier | null): boolean {
  return tier === "pro" || tier === "premium";
}

export function resolveMessagesSurface(input: {
  isGcStaff: boolean;
  hasActiveOrg: boolean;
  tier: AskFrameAiTier | null;
}): MessagesSurface {
  if (!input.hasActiveOrg) {
    return input.isGcStaff ? "staff-inbox" : "access-gate";
  }
  return isAskFrameAiUnlocked(input.tier) ? "ask-frame-ai-landing" : "access-gate";
}

export function canRenderAskFrameAiLanding(surface: MessagesSurface): boolean {
  return surface === "ask-frame-ai-landing";
}

export function canRenderAskFrameAiThread(surface: MessagesSurface): boolean {
  return surface === "ask-frame-ai-thread";
}

export function showMessagesHeaderSearch(surface: MessagesSurface): boolean {
  return surface === "access-gate";
}
