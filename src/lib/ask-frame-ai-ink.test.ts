import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { parseAskFrameAiInk, stackAskFrameAiInkFacts } from "./ask-frame-ai-ink";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ask-frame-ai-ink.ts"), "utf8");

function visible(text: string): string {
  return parseAskFrameAiInk(text)
    .map((span) => span.text)
    .join("");
}

describe("askFrameAi conversation ink", () => {
  it("turns **markdown** and catalog field names into Medium and drops the stars", () => {
    expect(parseAskFrameAiInk("Harbor Cut is missing **Genre**.")).toEqual([
      { text: "Harbor Cut is missing ", medium: false },
      { text: "Genre", medium: true },
      { text: ".", medium: false },
    ]);
    expect(parseAskFrameAiInk("Synopsis is required.")).toEqual([
      { text: "Synopsis", medium: true },
      { text: " is required.", medium: false },
    ]);
    expect(visible("Harbor Cut is missing **Genre**.")).toBe("Harbor Cut is missing Genre.");
    expect(visible("Harbor Cut is missing **Genre**.")).not.toContain("**");
  });

  it("stacks live lead/follow and strips bullets, hashes, and backticks from visible ink", () => {
    expect(
      stackAskFrameAiInkFacts(
        "Harbor Cut is missing **Genre**.",
        "- Genre is required before it can go live.\n# Synopsis and `Runtime` are also required.",
      ),
    ).toEqual([
      "Harbor Cut is missing **Genre**.",
      "Genre is required before it can go live.",
      "Synopsis and Runtime are also required.",
    ]);

    const hashed = parseAskFrameAiInk("# Synopsis is required.");
    expect(hashed).toEqual([
      { text: "Synopsis", medium: true },
      { text: " is required.", medium: false },
    ]);
    expect(visible("# Synopsis is required.")).toBe("Synopsis is required.");
    expect(visible("`Genre` is required.")).toBe("Genre is required.");
    expect(visible("- Director is recommended.")).toBe("Director is recommended.");
    expect(visible("# Synopsis and `Runtime` are also required.")).not.toMatch(/[*#`]/);
    expect(src).not.toContain("Winter Line");
    expect(src).not.toContain("Harbor Lights");
  });

  it("keeps Winter Line fixture copy as an input, never a baked product title", () => {
    const facts = stackAskFrameAiInkFacts(ASK_FRAME_AI.answerLead, ASK_FRAME_AI.answerFollow);
    expect(facts.join(" ")).toContain("Genre");
    expect(facts.join(" ")).toContain("Synopsis");
    expect(src).not.toContain(ASK_FRAME_AI.answerLead);
    expect(src).not.toContain("The Winter Line");
  });
});
