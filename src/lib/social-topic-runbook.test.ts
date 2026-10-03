import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SOCIAL_TOPIC_POST_DEADLINE_MS } from "@/lib/social-topic-run";

import { SOCIAL_TOPIC_RUN_BUDGET_MS } from "../../workers/social-topic/handler";

// The runbook's CloudWatch alarms count the tagger's log lines, so its
// filters and the failure threshold must stay in step with the code.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const RUNBOOK = readFileSync(`${ROOT}docs/infra/social-topic-tagging.md`, "utf8");
const LOGGING_SOURCES = [
  "src/lib/social-topic-run.ts",
  "src/lib/social-topic-tagger.ts",
  "workers/social-topic/handler.ts",
]
  .map((path) => readFileSync(`${ROOT}${path}`, "utf8"))
  .join("\n");
// The rule runs every 5 minutes; a one-hour period can hold one run more or fewer.
const RUNS_PER_HOUR = 12;

function filterPatterns(): string[] {
  return [...RUNBOOK.matchAll(/--filter-pattern '([^']*)'/g)].map((match) => match[1]!);
}

function failureAlarm(): { threshold: number; operator: string } {
  const match = RUNBOOK.match(
    /--alarm-name 24frame-social-topic-post-failures[\s\S]*?--threshold (\d+)[\s\S]*?--comparison-operator (\w+)/,
  );
  if (!match) throw new Error("post-failures alarm not found in the runbook");
  return { threshold: Number(match[1]), operator: match[2]! };
}

describe("social topic runbook alarms", () => {
  it("filters on plain phrases the code logs, so Lambda's text log format matches", () => {
    const patterns = filterPatterns();
    expect(patterns).toHaveLength(3);
    for (const pattern of patterns) {
      // A JSON selector ({ $.msg = ... }) matches nothing in text format.
      const phrase = pattern.match(/^"([^"]+)"$/)?.[1];
      expect(phrase, pattern).toBeDefined();
      expect(LOGGING_SOURCES).toContain(`msg: "${phrase}"`);
    }
  });

  it("creates the log group before the first filter", () => {
    const created = RUNBOOK.indexOf("aws logs create-log-group");
    expect(created).toBeGreaterThan(-1);
    expect(created).toBeLessThan(RUNBOOK.indexOf("aws logs put-metric-filter"));
  });

  it("pages on an outage with two posts waiting, not on one stuck post", () => {
    expect(RUNBOOK).toContain("--schedule-expression 'rate(5 minutes)'");
    // A hung service holds each post to its deadline; the run keeps
    // starting posts until its budget is spent.
    expect(Math.ceil(SOCIAL_TOPIC_RUN_BUDGET_MS / SOCIAL_TOPIC_POST_DEADLINE_MS)).toBeGreaterThanOrEqual(2);
    const { threshold, operator } = failureAlarm();
    expect(operator).toBe("GreaterThanOrEqualToThreshold");
    expect(2 * (RUNS_PER_HOUR - 1)).toBeGreaterThanOrEqual(threshold);
    expect(RUNS_PER_HOUR + 1).toBeLessThan(threshold);
  });
});
