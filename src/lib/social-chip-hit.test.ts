import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_PILL_ITEM_CLASS, HOUSE_PILL_MEASURE_CLASS } from "@/lib/house-shell";
import {
  SOCIAL_CHIP_HIT_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_PILL_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_TOPIC_CHIP_CLASS,
  SOCIAL_TOPIC_CHIP_MEASURE_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS,
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
  it("locks Social topic chips to one h-8 measure", () => {
    expect(SOCIAL_CHIP_HIT_CLASS).toBe(CHIP_HIT_LITERAL);
    expect(SOCIAL_CHIP_HIT_CLASS).toContain("h-8");
    expect(SOCIAL_CHIP_HIT_CLASS).toContain("whitespace-nowrap");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("py-[var(--space-2)]");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("truncate");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toContain("text-[11px]");
    expect(SOCIAL_CHIP_HIT_CLASS).not.toMatch(/\bmd:/);

    // G · Feed (Adam 2026-10-04): the Feed topic row is D plain words, not
    // chips. docs/design-locks/social-home-lane-tabs-lock-v1.md
    expect(SOCIAL_HOME_TOPIC_CLASS).not.toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).not.toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_HOME_TOPIC_CLASS).not.toContain("rounded-full");
    expect(SOCIAL_TOPIC_CHIP_MEASURE_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS).toContain(SOCIAL_CHIP_HIT_CLASS);
    expect(SOCIAL_PILL_CLASS).toBe(SOCIAL_CHIP_HIT_CLASS);

    for (const chip of [SOCIAL_TOPIC_CHIP_MEASURE_CLASS, SOCIAL_PILL_CLASS]) {
      expect(chip).toContain("h-8");
      expect(chip).not.toContain("py-[var(--space-2)]");
      expect(chip).not.toContain(HOUSE_PILL_ITEM_CLASS);
      expect(chip).not.toContain(HOUSE_PILL_MEASURE_CLASS);
      expect(chip).not.toContain("truncate");
      expect(chip).not.toMatch(/\bmd:/);
    }

  });

  it("gives Profile roles the Stage chip: 32 phone / 36 desktop, label 13, wrapping", () => {
    // docs/design-locks/social-profile-stage-lock-v1.md supersedes the shared
    // h-8 Home measure for the profile face only.
    expect(SOCIAL_PROFILE_ROLE_PILL_CLASS).not.toContain(SOCIAL_CHIP_HIT_CLASS);
    const chip = SOCIAL_PROFILE_ROLE_PILL_CLASS.split(" ");
    expect(chip).toEqual(
      expect.arrayContaining([
        "min-h-8",
        "md:min-h-9",
        "rounded-full",
        "bg-surface-muted",
        "text-ink",
        "text-[length:var(--text-xs)]",
        "font-medium",
        "break-words",
      ]),
    );
    expect(SOCIAL_PROFILE_ROLE_PILL_CLASS).not.toMatch(/whitespace-nowrap|truncate|text-\[11px\]|py-\[var\(--space-2\)\]/);
  });

  it("fails if either side forks the hit string", () => {
    expect(chromeSrc.match(new RegExp(CHIP_HIT_LITERAL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")))
      .toHaveLength(1);

    for (const name of ["SOCIAL_TOPIC_CHIP_MEASURE_CLASS", "SOCIAL_PILL_CLASS"]) {
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
