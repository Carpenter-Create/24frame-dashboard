import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import {
  ASK_FRAME_AI_DOWNLOAD,
  ASK_FRAME_AI_DOWNLOAD_CONTENT_TYPE,
  askFrameAiDownloadBlob,
  askFrameAiDownloadFilename,
  buildAskFrameAiDownloadPdf,
  parseAskFrameAiDownloadInk,
  stackAskFrameAiDownloadFacts,
} from "./ask-frame-ai-download";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ask-frame-ai-download.ts"), "utf8");

function pdfString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

function pdfVisibleText(bytes: Uint8Array): string {
  return [...pdfString(bytes).matchAll(/\((?:\\[()\\]|[^\\)])*\) Tj/g)]
    .map((match) => match[0].slice(1, -4).replace(/\\([()\\])/g, "$1"))
    .join("");
}

describe("askFrameAiDownloadFilename", () => {
  it("names the file 24Frame-{slug}.pdf from the live title, not .txt", () => {
    expect(askFrameAiDownloadFilename("What needs attention")).toBe("24Frame-what-needs-attention.pdf");
    expect(askFrameAiDownloadFilename("What needs attention")).not.toMatch(/\.txt$/);
    expect(askFrameAiDownloadFilename("   ")).toBe("24Frame-conversation.pdf");
  });

  it("slugs the Winter Line fixture title as a filename example only", () => {
    expect(askFrameAiDownloadFilename(ASK_FRAME_AI.threadTitle)).toBe(
      "24Frame-whats-blocking-the-winter-line.pdf",
    );
    expect(askFrameAiDownloadFilename("Harbor Cut needs a synopsis")).toBe(
      "24Frame-harbor-cut-needs-a-synopsis.pdf",
    );
    expect(src).not.toContain("Winter Line");
    expect(src).not.toContain("whats-blocking-the-winter-line");
  });
});

describe("askFrameAi download ink", () => {
  it("stacks live lead/follow and drops bullets and raw **", () => {
    expect(
      stackAskFrameAiDownloadFacts("Harbor Cut is missing **Genre**.", "- Genre is required before it can go live."),
    ).toEqual(["Harbor Cut is missing **Genre**.", "Genre is required before it can go live."]);

    const spans = parseAskFrameAiDownloadInk("Harbor Cut is missing **Genre**.");
    expect(spans).toEqual([
      { text: "Harbor Cut is missing ", medium: false },
      { text: "Genre", medium: true },
      { text: ".", medium: false },
    ]);
    expect(spans.map((span) => span.text).join("")).not.toContain("**");
    expect(parseAskFrameAiDownloadInk("Synopsis is required.")).toEqual([
      { text: "Synopsis", medium: true },
      { text: " is required.", medium: false },
    ]);
  });
});

describe("buildAskFrameAiDownloadPdf", () => {
  it("writes a 24Frame letter PDF from the live turn, never Mercury", () => {
    const bytes = buildAskFrameAiDownloadPdf({
      title: "What needs attention",
      userPrompt: "What needs attention",
      initials: "ac",
      lead: "Harbor Cut is missing **Genre**.",
      follow: "Genre is required before it can go live.",
    });
    const raw = pdfString(bytes);
    const text = pdfVisibleText(bytes);

    expect(ASK_FRAME_AI_DOWNLOAD_CONTENT_TYPE).toBe("application/pdf");
    expect(ASK_FRAME_AI_DOWNLOAD.contentType).toBe("application/pdf");
    expect(askFrameAiDownloadBlob({
      title: "What needs attention",
      userPrompt: "What needs attention",
      initials: "ac",
      lead: "Harbor Cut is missing **Genre**.",
      follow: "Genre is required before it can go live.",
    }).type).toBe("application/pdf");
    expect(bytes[0]).toBe(0x25);
    expect(raw.startsWith("%PDF-")).toBe(true);
    expect(raw).toContain(`/MediaBox [0 0 ${ASK_FRAME_AI_DOWNLOAD.pageWidth} ${ASK_FRAME_AI_DOWNLOAD.pageHeight}]`);
    expect(text).toContain("24Frame");
    expect(text).toContain("24Frame AI");
    expect(text).toContain("What needs attention");
    expect(text).toContain("Harbor Cut is missing Genre.");
    expect(text).toContain("Genre is required before it can go live.");
    expect(text).toContain("AC");
    expect(text).not.toContain("**");
    expect(raw).not.toContain("**");
    expect(text).not.toContain("Mercury");
    expect(text).not.toContain("Mercury AI");
    expect(text).not.toContain("Beta");
    expect(raw).not.toContain("Mercury");
    expect(raw).not.toContain("Mercury AI");
    expect(raw).not.toContain("Beta");
    expect(text).not.toContain("Winter Line");
    expect(text).not.toContain("- Genre is required");
    expect(src).not.toMatch(/Mercury AI|Mercury|Beta/);
  });

  it("writes the full thread, not one answer, and never invents a title", () => {
    const bytes = buildAskFrameAiDownloadPdf({
      title: "What needs attention",
      initials: "ac",
      messages: [
        { role: "user", body: "What needs attention" },
        {
          role: "globee",
          body: "Harbor Cut is missing **Genre**.",
          lead: "Harbor Cut is missing **Genre**.",
          follow: "Genre is required before it can go live.",
        },
        { role: "user", body: "What is blocking a title" },
        {
          role: "globee",
          body: "Harbor Cut still needs a synopsis.",
          lead: "Harbor Cut still needs a synopsis.",
          follow: null,
        },
      ],
    });
    const text = pdfVisibleText(bytes);

    expect(text).toContain("24Frame");
    expect(text).toContain("24Frame AI");
    expect(text).toContain("What needs attention");
    expect(text).toContain("What is blocking a title");
    expect(text).toContain("Harbor Cut is missing Genre.");
    expect(text).toContain("Harbor Cut still needs a synopsis.");
    expect(text).not.toContain("Mercury");
    expect(text).not.toContain("Winter Line");
    expect(text).not.toContain("Harbor Lights");
    expect(src).not.toContain("Winter Line");
    expect(src).not.toContain("Harbor Lights");
  });

  it("paginates a long thread instead of dropping later turns", () => {
    const messages = Array.from({ length: 16 }, (_, index) => [
      { role: "user" as const, body: `User turn ${index} asks about Harbor Cut.` },
      {
        role: "globee" as const,
        body: `Assistant turn ${index} answers about Harbor Cut.`,
        lead: `Assistant turn ${index} answers about Harbor Cut.`,
        follow: null,
      },
    ]).flat();
    const bytes = buildAskFrameAiDownloadPdf({
      title: "What needs attention",
      initials: "AC",
      messages,
    });
    const raw = pdfString(bytes);
    const text = pdfVisibleText(bytes);

    expect(text).toContain("24Frame");
    expect(text).toContain("24Frame AI");
    expect(text).toContain("User turn 0 asks about Harbor Cut.");
    expect(text).toContain("Assistant turn 0 answers about Harbor Cut.");
    expect(text).toContain("User turn 15 asks about Harbor Cut.");
    expect(text).toContain("Assistant turn 15 answers about Harbor Cut.");
    expect((raw.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThan(1);
    expect(raw).toMatch(/\/Count [2-9]/);
    expect(raw).toContain(`/MediaBox [0 0 ${ASK_FRAME_AI_DOWNLOAD.pageWidth} ${ASK_FRAME_AI_DOWNLOAD.pageHeight}]`);
  });

  it("uses the fixture title and lead only when they are the live turn", () => {
    const bytes = buildAskFrameAiDownloadPdf({
      title: ASK_FRAME_AI.threadTitle,
      userPrompt: ASK_FRAME_AI.userPrompt,
      initials: "AC",
      lead: ASK_FRAME_AI.answerLead,
      follow: ASK_FRAME_AI.answerFollow,
    });
    const text = pdfVisibleText(bytes);
    expect(text).toContain(ASK_FRAME_AI.threadTitle);
    expect(text).toContain("Genre");
    expect(text).toContain("Synopsis");
    expect(text).toContain("Runtime");
    expect(text).toContain("Director");
    expect(text).toContain("24Frame AI");
    expect(text).not.toContain("**");
    expect(text).not.toContain("Mercury");
  });
});
