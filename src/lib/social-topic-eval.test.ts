import { describe, expect, it } from "vitest";

import { parseSocialTopicLabels, scoreSocialTopicEval } from "./social-topic-eval";

const A = "0b8f3c2e-1111-4a2b-9c3d-123456789abc";
const B = "1c9a4d3f-2222-4b3c-8d4e-23456789abcd";

describe("parseSocialTopicLabels", () => {
  it("reads post_id,topic lines with an optional header and comments", () => {
    const { labels, errors } = parseSocialTopicLabels(
      `post_id,topic\n# comment\n${A},Music\n${B},"none"\n\n`,
    );
    expect(errors).toEqual([]);
    expect(labels).toEqual([
      { postId: A, topic: "Music" },
      { postId: B, topic: "none" },
    ]);
  });

  it("rejects a bad id or a topic outside the 15 labels", () => {
    const { labels, errors } = parseSocialTopicLabels(`not-a-uuid,Music\n${A},Comedy\n${B},music`);
    expect(labels).toEqual([]);
    expect(errors).toEqual([
      "line 1: post_id is not a uuid",
      'line 2: "Comedy" is not one of the 15 topics or none',
      'line 3: "music" is not one of the 15 topics or none',
    ]);
  });
});

describe("scoreSocialTopicEval", () => {
  const rows = [
    { postId: "1", expected: "Music", predicted: "Music", confidence: 0.95 },
    { postId: "2", expected: "Acting", predicted: "Directors", confidence: 0.85 },
    { postId: "3", expected: "Financing", predicted: "Financing", confidence: 0.65 },
    { postId: "4", expected: "none", predicted: "Music", confidence: 0.7 },
    { postId: "5", expected: "Animation", predicted: "none", confidence: 0.9 },
  ];

  it("counts tagged, correct, and wrong at each threshold", () => {
    expect(scoreSocialTopicEval(rows, [0.6, 0.8, 0.9])).toEqual([
      { threshold: 0.6, tagged: 4, correct: 2, wrong: 2, precision: 0.5, recall: 0.5 },
      { threshold: 0.8, tagged: 2, correct: 1, wrong: 1, precision: 0.5, recall: 0.25 },
      { threshold: 0.9, tagged: 1, correct: 1, wrong: 0, precision: 1, recall: 0.25 },
    ]);
  });

  it("reports no precision when nothing is tagged", () => {
    expect(scoreSocialTopicEval(rows, [0.99])[0]).toMatchObject({ tagged: 0, precision: null });
    expect(scoreSocialTopicEval([], [0.5])[0]).toMatchObject({ precision: null, recall: null });
  });
});
