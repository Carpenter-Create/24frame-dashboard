import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_PILL_ITEM_CLASS, HOUSE_PILL_MEASURE_CLASS } from "@/lib/house-shell";
import {
  SOCIAL_CHIP_HIT_CLASS,
  SOCIAL_PILL_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_TOPIC_CHIP_CLASS,
  SOCIAL_TOPIC_CHIP_MEASURE_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS,
  SOCIAL_TOPIC_RAIL_CHIP_CLASS,
  SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS,
  SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS,
} from "@/lib/social-chrome";

const chromeSrc = readFileSync("src/lib/social-chrome.ts", "utf8");

const CHIP_HIT_LITERAL =
  "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-[var(--space-4)] t-body-sm";

function exportRhs(name: string): string {
  const match = chromeSrc.match(new RegExp(`export const ${name} =\\s*([\\s\\S]*?);`));
  if (!match?.[1]) throw new Error(`missing export ${name}`);
  return match[1];
}

describe("social chip hit", () => {
  it("locks Home topic chips and Profile roles to one h-8 measure", () => {
    expect(SOCIAL_CHIP_HIT_CLASS).toBe(CHIP_HIT_LITERAL);
    expect(SOCIAL_CHIP_HIT_CLASS).toContain("h-8");
    expect(SOCIAL_CHIP_HIT_CLASS).toContain("whitespace-nowrap");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("py-[var(--space-2)]");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("truncate");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("text-[11px]");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toMatch(/\bmd:/);

    expect(SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_RAIL_CHIP_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_PROFILE_ROLE_PILL_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_MEASURE_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_PILL_CLASS).toBe(SOCIAL_CHIP_HIT_CLASS);

    for (const chip of [
      SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS,
      SOCIAL_PROFILE_ROLE_PILL_CLASS,
      SOCIAL_TOPIC_CHIP_MEASURE_CLASS,
      SOCIAL_PILL_CLASS,
    ]) {
      expect(chip).toContain("h-8");
      expect(chip).not.toContain("py-[var(--space-2)]");
      expect(chip).not.toContain(HOUSE_PILL_ITEM_CLASS);
      expect(chip).not.toContain(HOUSE_PILL_MEASURE_CLASS);
      expect(chip).not.toContain("truncate");
      expect(chip).not.toMatch(/\bmd:/);
    }

    expect(SOCIAL_PROFILE_ROLE_PILL_CLASS).toBe(
      `w-fit ${SOCIAL_CHIP_HIT_CLASS} bg-surface-muted text-ink`,
    );
  });

  it("fails if either side forks the hit string", () => {
    expect(chromeSrc.match(new RegExp(CHIP_HIT_LITERAL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")))
      .toHaveLength(1);

    for (const name of [
      "SOCIAL_TOPIC_RAIL_CHIP_MEASURE_CLASS",
      "SOCIAL_PROFILE_ROLE_PILL_CLASS",
      "SOCIAL_TOPIC_CHIP_MEASURE_CLASS",
      "SOCIAL_PILL_CLASS",
    ]) {
      const rhs = exportRhs(name);
      expect(rhs).toContain("SOCIAL_CHIP_HIT_CLASS");
      expect(rhs).not.toContain("h-8");
      expect(rhs).not.toContain("HOUSE_PILL_ITEM_CLASS");
      expect(rhs).not.toContain("HOUSE_PILL_MEASURE_CLASS");
      expect(rhs).not.toContain("py-[var(--space-2)]");
    }

    expect(exportRhs("SOCIAL_CHIP_HIT_CLASS")).toContain("h-8");
    expect(exportRhs("SOCIAL_CHIP_HIT_CLASS")).not.toContain("py-[var(--space-2)]");
  });
});
