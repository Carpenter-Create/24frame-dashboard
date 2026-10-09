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
  HOUSE_FORM_SELECT_TYPE_AHEAD_MS,
  houseFormSelectListKey,
  houseFormSelectListKeyDown,
  houseFormSelectMatch,
  houseFormSelectOptionClass,
  houseFormSelectStep,
} from "./house-form-select";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import { stripSourceComments } from "@/test/strip-source-comments";
import {
  HOUSE_PAGE_SELECT_CHEVRON_CLASS,
  HOUSE_PAGE_SELECT_INLINE_LIST_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS,
  HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS,
  HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS,
  HOUSE_PAGE_SELECT_PANEL_CLASS,
  housePageSelectInlineOptionClass,
  housePageSelectOptionClass,
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

describe("house inline list (HousePageSelectOptions inline)", () => {
  it("keeps the form hover's value where it moved", () => {
    // The literal from before the move (lib/house-form-select.ts:34-35).
    expect(HOUSE_FORM_SELECT_OPTION_HOVER_CLASS).toBe(
      "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
    );
    expect(HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS).toBe(HOUSE_FORM_SELECT_OPTION_HOVER_CLASS);
    expect(houseFormSelectOptionClass(true)).toBe(
      `${housePageSelectOptionClass(true)} ${HOUSE_FORM_SELECT_OPTION_HOVER_CLASS}`,
    );
  });

  it("draws 44 rows with the form hover, never cut", () => {
    for (const selected of [true, false]) {
      const row = housePageSelectInlineOptionClass(selected);
      expect(row.split(" ")).toContain("min-h-11");
      expect(row).toContain(HOUSE_PAGE_SELECT_OPTION_HOVER_CLASS);
      expect(row).toContain(housePageSelectOptionClass(selected));
      expect(housePhoneForbidsTruncate(row)).toBe(true);
    }
    expect(housePageSelectInlineOptionClass(true)).toContain("bg-surface-muted");
    expect(HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS).toContain("t-body-sm");
    expect(HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS).toContain("text-ink-3");
    expect(HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS).toContain("break-words");
    expect(housePhoneForbidsTruncate(HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS)).toBe(true);
  });

  it("lays the panel surface flat: no float, no own scroll", () => {
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).toContain("bg-surface");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).toContain("border-hairline");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).toContain("shadow-none");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).not.toContain("absolute");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).not.toContain("max-h");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).not.toContain("overflow");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).not.toContain("z-50");
    expect(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it("types ahead over page-select options too", () => {
    const keyed = [
      { key: "CA", label: "Canada" },
      { key: "CI", label: "Côte d'Ivoire" },
      { key: "GB", label: "United Kingdom" },
    ];
    expect(houseFormSelectMatch(keyed, "u", 0)).toBe(2);
    expect(houseFormSelectMatch(keyed, "c", 0)).toBe(1);
  });

  it("moves, types ahead and leaves Enter and a picking Space to the button", () => {
    const options = [
      { label: "Canada" },
      { label: "China" },
      { label: "Colombia" },
      { label: "United States" },
    ];
    const idle = { text: "", at: 0 };
    const t0 = 10_000;

    // Arrows wrap; Home and End jump; the buffer is kept.
    expect(houseFormSelectListKey(options, 3, "ArrowDown", false, idle, t0)).toEqual({
      focus: 0,
      handled: true,
      typed: idle,
    });
    expect(houseFormSelectListKey(options, 0, "ArrowUp", false, idle, t0).focus).toBe(3);
    expect(houseFormSelectListKey(options, 2, "Home", false, idle, t0).focus).toBe(0);
    expect(houseFormSelectListKey(options, 0, "End", false, idle, t0).focus).toBe(3);

    // Enter, Tab and modified keys pass through.
    for (const key of ["Enter", "Tab", "Escape"]) {
      expect(houseFormSelectListKey(options, 0, key, false, idle, t0)).toEqual({
        focus: null,
        handled: false,
        typed: idle,
      });
    }
    expect(houseFormSelectListKey(options, 0, "u", true, idle, t0).handled).toBe(false);

    // Space with nothing typed is the button's own click.
    expect(houseFormSelectListKey(options, 0, " ", false, idle, t0).handled).toBe(false);

    // Typing jumps; keys within the buffer build a word.
    const u = houseFormSelectListKey(options, 0, "u", false, idle, t0);
    expect(u).toEqual({ focus: 3, handled: true, typed: { text: "u", at: t0 } });
    const co = houseFormSelectListKey(
      options,
      0,
      "o",
      false,
      { text: "c", at: t0 },
      t0 + HOUSE_FORM_SELECT_TYPE_AHEAD_MS,
    );
    expect(co.focus).toBe(2);
    expect(co.typed.text).toBe("co");

    // Space inside a word is typed, not a pick.
    const space = houseFormSelectListKey(options, 3, " ", false, { text: "united", at: t0 }, t0 + 100);
    expect(space.handled).toBe(true);
    expect(space.typed.text).toBe("united ");

    // After the buffer lapses, the word starts again and Space picks.
    const late = t0 + HOUSE_FORM_SELECT_TYPE_AHEAD_MS + 1;
    expect(houseFormSelectListKey(options, 0, "o", false, { text: "c", at: t0 }, late).typed.text).toBe("o");
    expect(houseFormSelectListKey(options, 0, " ", false, { text: "c", at: t0 }, late)).toEqual({
      focus: null,
      handled: false,
      typed: { text: "", at: t0 },
    });
    expect(HOUSE_FORM_SELECT_TYPE_AHEAD_MS).toBe(500);
  });
});

describe("house inline list keydown (houseFormSelectListKeyDown)", () => {
  const options = [
    { label: "Canada" },
    { label: "China" },
    { label: "Colombia" },
    { label: "Norway" },
    { label: "United Kingdom" },
    { label: "United States" },
  ];
  const idle = { text: "", at: 0 };
  const t0 = 10_000;

  // The drawn option buttons, logging what the list does to them.
  function drawn() {
    const log: string[] = [];
    const nodes = options.map((_, i) => ({
      focus: () => log.push(`focus ${i}`),
      scrollIntoView: (opts?: ScrollIntoViewOptions) => log.push(`scroll ${i} ${opts?.block}`),
    }));
    return { nodes, log };
  }

  function press(key: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey", boolean>> = {}) {
    const event = {
      key,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      ...mods,
      prevented: false,
      preventDefault() {
        event.prevented = true;
      },
    };
    return event;
  }

  it("steps from the focused option, cancels the key's default and moves focus", () => {
    const { nodes, log } = drawn();
    const down = press("ArrowDown");
    expect(houseFormSelectListKeyDown(options, nodes, nodes[1], down, idle, t0)).toEqual(idle);
    expect(down.prevented).toBe(true);
    expect(log).toEqual(["focus 2", "scroll 2 nearest"]);

    log.length = 0;
    const up = press("ArrowUp");
    houseFormSelectListKeyDown(options, nodes, nodes[4], up, idle, t0);
    expect(up.prevented).toBe(true);
    expect(log).toEqual(["focus 3", "scroll 3 nearest"]);

    log.length = 0;
    houseFormSelectListKeyDown(options, nodes, nodes[2], press("End"), idle, t0);
    houseFormSelectListKeyDown(options, nodes, nodes[5], press("Home"), idle, t0);
    expect(log).toEqual(["focus 5", "scroll 5 nearest", "focus 0", "scroll 0 nearest"]);
  });

  it("starts before the first option when focus is not on one", () => {
    const { nodes, log } = drawn();
    houseFormSelectListKeyDown(options, nodes, { not: "an option" }, press("ArrowDown"), idle, t0);
    houseFormSelectListKeyDown(options, nodes, null, press("ArrowUp"), idle, t0);
    expect(log).toEqual(["focus 0", "scroll 0 nearest", "focus 5", "scroll 5 nearest"]);
  });

  it("keeps the typed word from key to key", () => {
    const { nodes, log } = drawn();
    const u = press("u");
    const afterU = houseFormSelectListKeyDown(options, nodes, nodes[0], u, idle, t0);
    expect(afterU).toEqual({ text: "u", at: t0 });
    expect(u.prevented).toBe(true);
    expect(log).toEqual(["focus 4", "scroll 4 nearest"]);

    // "un" stays on United Kingdom; a dropped buffer would jump to Norway.
    log.length = 0;
    const afterN = houseFormSelectListKeyDown(options, nodes, nodes[4], press("n"), afterU, t0 + 100);
    expect(afterN).toEqual({ text: "un", at: t0 + 100 });
    expect(log).toEqual(["focus 4", "scroll 4 nearest"]);
  });

  it("types a Space inside a word, and leaves a picking Space to the button", () => {
    const { nodes, log } = drawn();
    const mid = press(" ");
    const typed = houseFormSelectListKeyDown(
      options,
      nodes,
      nodes[4],
      mid,
      { text: "united", at: t0 },
      t0 + 100,
    );
    expect(mid.prevented).toBe(true);
    expect(typed.text).toBe("united ");

    log.length = 0;
    const pick = press(" ");
    expect(houseFormSelectListKeyDown(options, nodes, nodes[4], pick, idle, t0)).toEqual(idle);
    expect(pick.prevented).toBe(false);
    expect(log).toEqual([]);
  });

  it("passes Enter, Tab, Esc and modified keys through untouched", () => {
    const { nodes, log } = drawn();
    const keys = [
      press("Enter"),
      press("Tab"),
      press("Escape"),
      press("u", { metaKey: true }),
      press("u", { ctrlKey: true }),
      press("u", { altKey: true }),
    ];
    for (const event of keys) {
      const typed = { text: "c", at: t0 };
      expect(houseFormSelectListKeyDown(options, nodes, nodes[0], event, typed, t0 + 10)).toBe(typed);
      expect(event.prevented).toBe(false);
    }
    expect(log).toEqual([]);
  });

  it("leaves focus alone when nothing matches, but keeps the word", () => {
    const { nodes, log } = drawn();
    const z = press("z");
    expect(houseFormSelectListKeyDown(options, nodes, nodes[0], z, idle, t0)).toEqual({ text: "z", at: t0 });
    expect(z.prevented).toBe(true);
    expect(log).toEqual([]);
  });
});
