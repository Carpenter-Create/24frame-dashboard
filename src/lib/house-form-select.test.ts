import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FORM_CONTROL_BOX_CLASS, FORM_CONTROL_TEXT_CLASS } from "./form-control";
import {
  HOUSE_FORM_SELECT_CHEVRON_CLASS,
  HOUSE_FORM_SELECT_OPTION_CHECK_CLASS,
  HOUSE_FORM_SELECT_OPTION_HOVER_CLASS,
  HOUSE_FORM_SELECT_PANEL_CLASS,
  HOUSE_FORM_SELECT_TRIGGER_CLASS,
  HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS,
  houseFormSelectMatch,
  houseFormSelectOptionClass,
  houseFormSelectStep,
} from "./house-form-select";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import { stripSourceComments } from "@/test/strip-source-comments";
import {
  HOUSE_PAGE_SELECT_CHEVRON_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS,
  HOUSE_PAGE_SELECT_PANEL_CLASS,
} from "./house-page-select";

const invite = readFileSync("src/components/settings/team-invite-form.tsx", "utf8");
const entities = readFileSync("src/components/settings/legal-entity-editor.tsx", "utf8");
const selectSrc = readFileSync("src/components/ui/select.tsx", "utf8");

describe("house form Select SoT", () => {
  it("keeps the closed field on the house input box", () => {
    expect(HOUSE_FORM_SELECT_TRIGGER_CLASS).toContain(FORM_CONTROL_TEXT_CLASS);
    expect(HOUSE_FORM_SELECT_TRIGGER_CLASS).toContain(FORM_CONTROL_BOX_CLASS);
    expect(HOUSE_FORM_SELECT_TRIGGER_CLASS).toContain("focus:border-ink-3");
    expect(HOUSE_FORM_SELECT_TRIGGER_CLASS).not.toContain("focus:border-accent");
    expect(HOUSE_FORM_SELECT_TRIGGER_CLASS).not.toContain("bg-ink");
    expect(HOUSE_FORM_SELECT_CHEVRON_CLASS).toBe(HOUSE_PAGE_SELECT_CHEVRON_CLASS);
  });

  it("opens a light Listbox — same surface as HousePageSelect, not a dark picker", () => {
    expect(HOUSE_FORM_SELECT_PANEL_CLASS).toContain("bg-surface");
    expect(HOUSE_FORM_SELECT_PANEL_CLASS).toContain("border-hairline");
    expect(HOUSE_FORM_SELECT_PANEL_CLASS).toContain("shadow-none");
    expect(HOUSE_FORM_SELECT_PANEL_CLASS).not.toContain("bg-ink");
    expect(HOUSE_FORM_SELECT_PANEL_CLASS).not.toContain("text-surface");
    expect(HOUSE_PAGE_SELECT_PANEL_CLASS).toContain("bg-surface");
    expect(HOUSE_PAGE_SELECT_PANEL_CLASS).not.toContain("bg-ink");
    expect(houseFormSelectOptionClass(false)).toContain("text-ink");
    expect(houseFormSelectOptionClass(false)).toContain(HOUSE_FORM_SELECT_OPTION_HOVER_CLASS);
    expect(houseFormSelectOptionClass(true)).toContain("bg-surface-muted");
    expect(HOUSE_FORM_SELECT_OPTION_CHECK_CLASS).toBe(HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS);
    expect(HOUSE_FORM_SELECT_OPTION_CHECK_CLASS).toBe("text-accent");
  });

  it("is the one Settings Dialog select — Invite and Legal Entities share it", () => {
    expect(selectSrc).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(selectSrc).toContain("AppearanceCheck");
    expect(selectSrc).not.toContain("createPortal");
    expect(selectSrc).not.toContain("<select");
    expect(invite).toContain('import { Select } from "@/components/ui/select"');
    expect(invite).toContain('id="team-invite-role"');
    expect(invite).not.toContain("<select");
    expect(invite).not.toContain("formControlClass");
    expect(entities).toContain('import { Select } from "@/components/ui/select"');
    expect(entities).toContain('id="entity-type"');
    expect(entities).not.toContain("<select");
    expect(entities).not.toContain("formControlClass");
  });
});

describe("house form Select: phone never-truncate (house gospel 2026-09-19)", () => {
  it("pins the closed field's chosen value to the house wrap, never an ellipsis", () => {
    expect(HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS).toBe(
      "flex-1 min-w-0 max-w-full whitespace-normal break-words",
    );
    expect(housePhoneForbidsTruncate(HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS)).toBe(true);
    // Built from the house wrap itself, not a hand-typed copy of its value.
    expect(stripSourceComments(readFileSync("src/lib/house-form-select.ts", "utf8"))).toMatch(
      /^export const HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS = `flex-1 \$\{HOUSE_PHONE_WRAP_CLASS\}`;$/m,
    );
  });
});

describe("house form Select keys", () => {
  const options = [
    { value: "", label: "—" },
    { value: "ca", label: "Canada" },
    { value: "cn", label: "China" },
    { value: "co", label: "Colombia" },
    { value: "us", label: "United States" },
  ];

  it("steps with the arrows (wrapping), and jumps with Home and End", () => {
    expect(houseFormSelectStep(-1, "ArrowDown", 5)).toBe(0);
    expect(houseFormSelectStep(4, "ArrowDown", 5)).toBe(0);
    expect(houseFormSelectStep(0, "ArrowUp", 5)).toBe(4);
    expect(houseFormSelectStep(-1, "ArrowUp", 5)).toBe(4);
    expect(houseFormSelectStep(2, "Home", 5)).toBe(0);
    expect(houseFormSelectStep(2, "End", 5)).toBe(4);
    expect(houseFormSelectStep(2, "a", 5)).toBeNull();
    expect(houseFormSelectStep(0, "ArrowDown", 0)).toBeNull();
  });

  it("types ahead to a label, a repeated letter cycling through its options", () => {
    expect(houseFormSelectMatch(options, "u", 0)).toBe(4);
    expect(houseFormSelectMatch(options, "co", 0)).toBe(3);
    expect(houseFormSelectMatch(options, "c", 0)).toBe(1);
    expect(houseFormSelectMatch(options, "c", 1)).toBe(2);
    expect(houseFormSelectMatch(options, "cc", 2)).toBe(3);
    expect(houseFormSelectMatch(options, "c", 3)).toBe(1);
    expect(houseFormSelectMatch(options, "CHI", -1)).toBe(2);
    expect(houseFormSelectMatch(options, "z", 0)).toBeNull();
    expect(houseFormSelectMatch(options, "", 0)).toBeNull();
  });

  it("wires the keys into the house Select", () => {
    const select = readFileSync("src/components/ui/select.tsx", "utf8");
    expect(select).toContain("onKeyDown={onMenuKey}");
    expect(select).toContain("onKeyDown={onTriggerKey}");
    // Esc closes back to the field; picking returns focus to it.
    expect(select).toContain("if (inside) triggerRef.current?.focus();");
    expect(select).toContain("onChange(next);\n    triggerRef.current?.focus();");
  });
});
