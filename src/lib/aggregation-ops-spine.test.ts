import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FINDING_SEVERITY_LABEL } from "@/lib/findings";

const ROOT = process.cwd();

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("aggregation ops spine rematch", () => {
  it("keeps product-true title statuses and Required / Recommended findings", () => {
    expect(FINDING_SEVERITY_LABEL).toEqual({ high: "Required", low: "Recommended" });
  });

  it("does not invent analytics, period, or create-delivery chrome on the three ops routes", () => {
    const titles = src("src/app/(app)/aggregation/titles/page.tsx");
    const health = src("src/app/(app)/aggregation/attention/page.tsx");

    for (const page of [titles, health]) {
      expect(page).not.toMatch(/\bDownload\b/);
      expect(page).not.toMatch(/\bEarn\b/);
      expect(page).not.toMatch(/period/i);
      expect(page).not.toMatch(/chart/i);
      expect(page).not.toMatch(/revenue/i);
      expect(page).not.toContain("createDelivery");
      expect(page).not.toContain("Create delivery");
    }
    expect(titles).toContain("AddTitleButton");
    expect(health).toContain("catalogHealthTitleHref");
    expect(health).toContain("FindingRows");
    expect(health).toContain("ATTENTION_TITLE");
  });
});
