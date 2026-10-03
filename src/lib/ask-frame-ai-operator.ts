import "server-only";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { ASSISTANT_NAME, PRODUCT_NAME } from "@/lib/product";
import type { AskFrameAiAnswer } from "@/lib/ask-frame-ai-answer";
import {
  ASK_FRAME_AI_TOOLS,
  executeAskFrameAiTool,
  type AskFrameAiCorpus,
} from "@/lib/ask-frame-ai-tools";

// Catalog-grounded operator. Reads ANTHROPIC_API_KEY so the provider seam can
// be swapped later. v1 talks to the Anthropic Messages API only.

export const ASK_FRAME_AI_MODEL_ID = "claude-sonnet-5";
export const ASK_FRAME_AI_MODEL_MAX_TOKENS = 1024;
export const ASK_FRAME_AI_MODEL_MAX_ROUNDS = 4;
export const ASK_FRAME_AI_HISTORY_MAX = 8;

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const ASK_FRAME_AI_SYSTEM = [
  `You are ${ASSISTANT_NAME}, a catalog operator for this signed-in client's ${PRODUCT_NAME} catalog only.`,
  "Use tools to read this catalog before stating counts, titles, blockers, or what to submit next.",
  "Answer only from tool results. If the tools do not have the fact, say you do not have it.",
  "Never invent a title, count, finding, or commercial term.",
  "Never use data from another rights holder.",
  "You cannot change the catalog, send email, take payment, or change the agreement.",
  "You operate on the catalog as a whole. You are not a title search box.",
  "Warm, professional, no preamble, no decoration.",
  "If the client asks for guidance, use the catalog tools and walk them through what the catalog shows.",
].join(" ");

export type AskFrameAiHistoryTurn = {
  role: "user" | "globee";
  text: string;
};

export type AskFrameAiOperatorResult = AskFrameAiAnswer | { error: string };

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input?: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContent[];
};

export type AskFrameAiModelRound = {
  system: string;
  model: string;
  max_tokens: number;
  tools: typeof ASK_FRAME_AI_TOOLS;
  messages: AnthropicMessage[];
};

export type AskFrameAiModelResponse = {
  stop_reason?: string | null;
  content?: AnthropicContent[];
};

export type AskFrameAiModelClient = (
  round: AskFrameAiModelRound,
  apiKey: string,
) => Promise<AskFrameAiModelResponse>;

export type AskFrameAiOperatorEnv = Record<string, string | undefined>;

export function readOperatorApiKey(env: AskFrameAiOperatorEnv = process.env): string | null {
  const key = env.ANTHROPIC_API_KEY?.trim() ?? "";
  return key.length > 0 ? key : null;
}

export function splitAskFrameAiModelText(text: string): Pick<AskFrameAiAnswer, "lead" | "follow"> {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  if (newline === -1) return { lead: trimmed, follow: null };
  const lead = trimmed.slice(0, newline).trim();
  const follow = trimmed.slice(newline + 1).trim();
  return { lead, follow: follow || null };
}

export async function requestAskFrameAiModel(
  round: AskFrameAiModelRound,
  apiKey: string,
): Promise<AskFrameAiModelResponse> {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: round.model,
      max_tokens: round.max_tokens,
      system: round.system,
      tools: round.tools,
      messages: round.messages,
    }),
  });
  if (!response.ok) {
    throw new Error("24Frame AI model request failed.");
  }
  return (await response.json()) as AskFrameAiModelResponse;
}

function historyMessages(history: AskFrameAiHistoryTurn[], prompt: string): AnthropicMessage[] {
  const recent = history.slice(-ASK_FRAME_AI_HISTORY_MAX);
  const messages: AnthropicMessage[] = [];
  for (const turn of recent) {
    const role = turn.role === "user" ? "user" : "assistant";
    if (messages.length > 0 && messages[messages.length - 1]?.role === role) {
      continue;
    }
    messages.push({ role, content: turn.text });
  }
  if (messages[messages.length - 1]?.role === "user") {
    messages.pop();
  }
  messages.push({ role: "user", content: prompt });
  return messages;
}

function textFromContent(content: AnthropicContent[] | undefined): string {
  return (content ?? [])
    .flatMap((block) => (block.type === "text" && block.text.trim() ? [block.text.trim()] : []))
    .join("\n")
    .trim();
}

export async function answerAskFrameAiPrompt({
  prompt,
  corpus,
  history = [],
  env = process.env,
  modelClient = requestAskFrameAiModel,
}: {
  prompt: string;
  corpus: AskFrameAiCorpus;
  history?: AskFrameAiHistoryTurn[];
  env?: AskFrameAiOperatorEnv;
  modelClient?: AskFrameAiModelClient;
}): Promise<AskFrameAiOperatorResult> {
  const apiKey = readOperatorApiKey(env);
  if (!apiKey) {
    return { error: ASK_FRAME_AI.unavailable };
  }

  const messages = historyMessages(history, prompt);
  for (let round = 0; round < ASK_FRAME_AI_MODEL_MAX_ROUNDS; round += 1) {
    let response: AskFrameAiModelResponse;
    try {
      response = await modelClient(
        {
          system: ASK_FRAME_AI_SYSTEM,
          model: ASK_FRAME_AI_MODEL_ID,
          max_tokens: ASK_FRAME_AI_MODEL_MAX_TOKENS,
          tools: ASK_FRAME_AI_TOOLS,
          messages,
        },
        apiKey,
      );
    } catch {
      return { error: ASK_FRAME_AI.unavailable };
    }

    const toolUses = (response.content ?? []).filter(
      (block): block is Extract<AnthropicContent, { type: "tool_use" }> => block.type === "tool_use",
    );
    if (toolUses.length > 0) {
      messages.push({ role: "assistant", content: response.content ?? [] });
      messages.push({
        role: "user",
        content: toolUses.map((block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(executeAskFrameAiTool(block.name, corpus)),
        })),
      });
      continue;
    }

    const text = textFromContent(response.content);
    if (!text) return { error: ASK_FRAME_AI.unavailable };
    const { lead, follow } = splitAskFrameAiModelText(text);
    return {
      intent: "unmapped",
      lead,
      follow,
      titleNames: [],
    };
  }

  return { error: ASK_FRAME_AI.unavailable };
}
