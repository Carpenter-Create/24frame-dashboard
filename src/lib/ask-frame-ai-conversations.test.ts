import { describe, expect, it } from "vitest";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import {
  askFrameAiAnswerText,
  askFrameAiDownloadFilename,
  askFrameAiOpenUserTurn,
  filterAskFrameAiHistory,
  formatAskFrameAiAttribution,
  formatAskFrameAiHistoryTime,
  groupAskFrameAiHistory,
  nextAskFrameAiThumb,
  sortAskFrameAiHistory,
} from "./ask-frame-ai-conversations";

const NOW = new Date(2026, 7, 19, 15, 10, 0);

describe("sortAskFrameAiHistory", () => {
  it("pins first, then newest updated", () => {
    const rows = [
      { id: "c", pinned_at: null, updated_at: "2026-08-19T14:00:00.000Z" },
      { id: "a", pinned_at: "2026-08-18T10:00:00.000Z", updated_at: "2026-08-18T10:00:00.000Z" },
      { id: "b", pinned_at: "2026-08-19T09:00:00.000Z", updated_at: "2026-08-19T09:00:00.000Z" },
      { id: "d", pinned_at: null, updated_at: "2026-08-17T12:00:00.000Z" },
    ];
    expect(sortAskFrameAiHistory(rows).map((row) => row.id)).toEqual(["b", "a", "c", "d"]);
  });
});

describe("askFrameAiOpenUserTurn", () => {
  it("detects an unanswered user turn and ignores completed or blank ones", () => {
    expect(askFrameAiOpenUserTurn([])).toBeNull();
    expect(askFrameAiOpenUserTurn([{ role: "user", body: "What is blocking a title" }])).toBe(
      "What is blocking a title",
    );
    expect(
      askFrameAiOpenUserTurn([
        { role: "user", body: "What is blocking a title" },
        { role: "globee", body: "Harbor Cut is missing a synopsis." },
      ]),
    ).toBeNull();
    expect(askFrameAiOpenUserTurn([{ role: "user", body: "   " }])).toBeNull();
  });
});

describe("askFrameAi answer chrome helpers", () => {
  it("copies lead and follow as one text block", () => {
    expect(askFrameAiAnswerText("Lead.", "Follow.")).toBe("Lead.\nFollow.");
    expect(askFrameAiAnswerText("Lead.", null)).toBe("Lead.");
  });

  it("names the download 24Frame-{slug}.pdf from the conversation title", () => {
    expect(askFrameAiDownloadFilename("What needs attention")).toBe("24Frame-what-needs-attention.pdf");
    expect(askFrameAiDownloadFilename(ASK_FRAME_AI.threadTitle)).toBe(
      "24Frame-whats-blocking-the-winter-line.pdf",
    );
    expect(askFrameAiDownloadFilename("What needs attention")).not.toMatch(/\.txt$/);
  });

  it("toggles the same thumb off and replaces the other", () => {
    expect(nextAskFrameAiThumb(null, "up")).toBe("up");
    expect(nextAskFrameAiThumb("up", "up")).toBeNull();
    expect(nextAskFrameAiThumb("up", "down")).toBe("down");
  });
});

describe("groupAskFrameAiHistory", () => {
  it("partitions this week from older threads and filters by title", () => {
    const rows = [
      { id: "today", title: "What needs attention", updated_at: new Date(2026, 7, 19, 7, 10, 0).toISOString() },
      { id: "yesterday", title: "What is blocking a title", updated_at: new Date(2026, 7, 18, 7, 10, 0).toISOString() },
      { id: "older", title: "What should I submit next", updated_at: new Date(2026, 7, 1, 7, 10, 0).toISOString() },
    ];
    const grouped = groupAskFrameAiHistory(rows, NOW);
    expect(grouped.thisWeek.map((row) => row.id)).toEqual(["today", "yesterday"]);
    expect(grouped.allThreads.map((row) => row.id)).toEqual(["older"]);
    expect(filterAskFrameAiHistory(rows, "blocking").map((row) => row.id)).toEqual(["yesterday"]);
    expect(filterAskFrameAiHistory(rows, "   ").map((row) => row.id)).toEqual(["today", "yesterday", "older"]);
    expect(JSON.stringify(grouped)).not.toContain("Winter Line");
    expect(JSON.stringify(grouped)).not.toContain("Harbor Lights");
    expect(JSON.stringify(grouped)).not.toContain("Get support");
  });
});

describe("24Frame AI relative time", () => {
  it("uses clock, Yesterday, weekday, then a short date", () => {
    expect(formatAskFrameAiHistoryTime(new Date(2026, 7, 19, 7, 10, 0).toISOString(), NOW)).toMatch(
      /\d{1,2}:\d{2} [AP]M/,
    );
    expect(formatAskFrameAiHistoryTime(new Date(2026, 7, 18, 7, 10, 0).toISOString(), NOW)).toBe(
      "Yesterday",
    );
    expect(formatAskFrameAiHistoryTime(new Date(2026, 7, 16, 7, 10, 0).toISOString(), NOW)).toBe(
      "Sun",
    );
    expect(formatAskFrameAiHistoryTime(new Date(2026, 7, 1, 7, 10, 0).toISOString(), NOW)).toBe(
      "Aug 1",
    );
  });

  it("attributes 24Frame AI with clock time, never the Winter Line fixture", () => {
    const line = formatAskFrameAiAttribution("2026-08-19T11:10:00.000Z");
    expect(line.startsWith(`${ASK_FRAME_AI.attributionName} · `)).toBe(true);
    expect(line).toMatch(/ · \d{1,2}:\d{2} [AP]M$/);
    expect(line).not.toBe(ASK_FRAME_AI.attribution);
    expect(line).not.toContain("Winter Line");
  });
});
