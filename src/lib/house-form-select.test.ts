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
  houseFormSelectOptionClass,
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
