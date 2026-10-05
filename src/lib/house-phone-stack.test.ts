import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_PHONE_CONTAIN_CLASS,
  HOUSE_PHONE_GOSPEL,
  HOUSE_PHONE_GOSPEL_LOCKED,
  HOUSE_PHONE_STACK_CLASS,
  HOUSE_PHONE_TRUNCATE_ABSENT,
  HOUSE_PHONE_WRAP_CLASS,
  housePhoneForbidsTruncate,
} from "./house-phone-stack";

describe("house phone stack gospel 2026-09-19", () => {
  it("locks never-truncate / prefer vertical stack as house gospel", () => {
    expect(HOUSE_PHONE_GOSPEL_LOCKED).toBe("2026-09-19");
    expect(HOUSE_PHONE_GOSPEL).toBe("on mobile, never truncate — prefer vertical stack");
    expect(HOUSE_PHONE_WRAP_CLASS).toContain("break-words");
    expect(HOUSE_PHONE_WRAP_CLASS).toContain("min-w-0");
    expect(HOUSE_PHONE_WRAP_CLASS).toContain("max-w-full");
    expect(HOUSE_PHONE_STACK_CLASS).toContain("flex-col");
    expect(HOUSE_PHONE_STACK_CLASS).toContain("w-full");
    expect(HOUSE_PHONE_STACK_CLASS).toContain("items-stretch");
    expect(HOUSE_PHONE_CONTAIN_CLASS).toBe("min-w-0 max-w-full overflow-x-clip");
    expect(HOUSE_PHONE_CONTAIN_CLASS).toContain("min-w-0");
    expect(HOUSE_PHONE_CONTAIN_CLASS).toContain("max-w-full");
    expect(HOUSE_PHONE_CONTAIN_CLASS).toContain("overflow-x-clip");
    expect(HOUSE_PHONE_CONTAIN_CLASS).not.toContain("overflow-x-auto");
    expect(housePhoneForbidsTruncate(HOUSE_PHONE_WRAP_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(HOUSE_PHONE_STACK_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(HOUSE_PHONE_CONTAIN_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate("t-body truncate")).toBe(false);
    expect(HOUSE_PHONE_TRUNCATE_ABSENT).toContain("truncate");
    expect(HOUSE_PHONE_TRUNCATE_ABSENT).toContain("overflow-x-auto");
  });

  it("records the gospel on the Design authority line", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).toContain("House gospel 2026-09-19");
    expect(agents).toContain("never truncate");
    expect(agents).toContain("stack vertically");
  });
});
