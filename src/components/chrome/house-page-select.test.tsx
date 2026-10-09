import { createElement } from "react";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import {
  HOUSE_PAGE_SELECT_INLINE_LIST_CLASS,
  HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS,
  HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS,
  HOUSE_PAGE_SELECT_PANEL_CLASS,
  HOUSE_PAGE_SELECT_SHEET_HOST_CLASS,
  HOUSE_PAGE_SELECT_TRIGGER_CLASS,
  housePageSelectGroupLabelId,
  housePageSelectInlineOptionClass,
  housePageSelectOptionsInOrder,
  housePageSelectTabStop,
  type HousePageSelectGroup,
} from "@/lib/house-page-select";
import { houseWindowFocusables } from "@/lib/house-window";
import { stripSourceComments } from "@/test/strip-source-comments";
import {
  HOUSE_PAGE_SELECT_PIN_PATH,
  HOUSE_PAGE_SELECT_PIN_UPDATE_ENV,
  housePageSelectPinJson,
  housePageSelectPinRenders,
} from "@/test/house-page-select-pins";
import { HousePageSelect, HousePageSelectOptions } from "./house-page-select";

describe("HousePageSelect", () => {
  it("is the house standard in-page select with desktop menu + phone sheet", () => {
    const html = renderToStaticMarkup(
      createElement(HousePageSelect, {
        value: "all",
        label: "All",
        ariaLabel: "Filter",
        defaultOpen: true,
        onPick: () => undefined,
        options: [
          { key: "all", label: "All" },
          { key: "live", label: "Live" },
        ],
      }),
    );
    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-house-page-select-trigger");
    expect(html).toContain("data-house-page-select-menu");
    expect(html).toContain("data-house-page-select-sheet");
    expect(html).toContain("data-house-page-select-current");
    expect(html).toContain(HOUSE_PAGE_SELECT_TRIGGER_CLASS);
    expect(html).toContain(HOUSE_PAGE_SELECT_PANEL_CLASS);
    expect(html).toContain(HOUSE_PAGE_SELECT_SHEET_HOST_CLASS);
    expect(html).toContain(HOUSE_PAGE_SELECT_OPTION_CHECK_CLASS);
    expect(html).toContain("data-appearance-check");
    expect(html).toContain("shadow-none");
    expect(html).toContain("max-md:hidden");
    expect(html).toContain("md:hidden");
    expect(html).not.toContain("<select");
  });

  it("documents Dashboard All time as the SoT in source", () => {
    const src = readFileSync("src/components/chrome/house-page-select.tsx", "utf8");
    const craft = readFileSync("src/lib/house-page-select.ts", "utf8");
    expect(src).toMatch(/house standard/i);
    expect(src).toMatch(/Dashboard All time/i);
    expect(craft).toMatch(/house standard/i);
    expect(craft).toMatch(/Dashboard All time/i);
    expect(src).toContain("createPortal");
    expect(src).toContain("AppearanceCheck");
  });

  it("has no StatusFilter chip fork or unused SortControl twin", () => {
    expect(existsSync("src/components/layout/status-filter.tsx")).toBe(false);
    expect(existsSync("src/components/layout/sort-control.tsx")).toBe(false);

    const lenses = [
      "src/components/dashboard/dashboard-admin-controls.tsx",
      "src/components/chrome/house-period-presets.tsx",
      "src/components/titles/titles-status-filter.tsx",
      "src/app/(app)/(operator)/staff/channels/channels-status-filter.tsx",
      "src/app/(app)/(operator)/staff/gc/deliveries/licensing-status-filter.tsx",
      "src/app/(app)/(operator)/staff/gc/clients/clients-status-filter.tsx",
    ] as const;

    for (const path of lenses) {
      const src = readFileSync(path, "utf8");
      expect(src, path).toContain("HousePageSelect");
      expect(src, path).not.toContain("@/components/layout/status-filter");
      expect(src, path).not.toContain("import { StatusFilter }");
    }
  });
});

// Today's callers draw exactly what they drew before the opt-in props
// (first rendered from origin/main 553a53a): the primitive in every branch,
// and every consumer that can render open. The deliver stepper's closed
// select is the "no-match-open" case's props. A meant change to a caller's
// markup rewrites the pin (src/test/house-page-select-pins.ts says how).
describe("HousePageSelect default markup is pinned", () => {
  const now = housePageSelectPinRenders();
  if (process.env[HOUSE_PAGE_SELECT_PIN_UPDATE_ENV] === "1") {
    writeFileSync(HOUSE_PAGE_SELECT_PIN_PATH, housePageSelectPinJson(now));
  }
  const raw = readFileSync(HOUSE_PAGE_SELECT_PIN_PATH, "utf8");
  const pinned = JSON.parse(raw) as Record<string, string>;

  it("pins the same cases", () => {
    expect(Object.keys(now)).toEqual(Object.keys(pinned));
    expect(Object.keys(pinned).filter((key) => key.startsWith("consumer:"))).toHaveLength(7);
  });

  it("is the file the rewrite writes, byte for byte", () => {
    expect(housePageSelectPinJson(pinned)).toBe(raw);
  });

  for (const name of Object.keys(pinned)) {
    it(`renders ${name} byte for byte`, () => {
      expect(now[name]).toBe(pinned[name]);
    });
  }

  it("draws no inline markers by default", () => {
    for (const html of Object.values(now)) {
      expect(html).not.toContain('role="group"');
      expect(html).not.toContain("tabindex");
      expect(html).not.toContain("aria-multiselectable");
      expect(html).not.toContain("aria-labelledby");
      expect(html).not.toContain("data-house-page-select-option-detail");
      expect(html).not.toContain(HOUSE_PAGE_SELECT_INLINE_LIST_CLASS);
    }
  });
});

const GROUPS: readonly HousePageSelectGroup[] = [
  {
    id: "North America",
    label: "North America",
    options: [
      { key: "CA", label: "Canada", detail: "First detail line." },
      { key: "US", label: "United States" },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    options: [
      { key: "IE", label: "Ireland", detail: "Second detail line." },
      { key: "GB", label: "United Kingdom" },
    ],
  },
];

function inlineList(props: Partial<Parameters<typeof HousePageSelectOptions>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(HousePageSelectOptions, {
      groups: GROUPS,
      ariaLabel: "Countries",
      onPick: () => undefined,
      inline: { id: "pick", "aria-describedby": "pick-error" },
      ...props,
    }),
  );
}

function optionTag(html: string, key: string): string {
  const at = html.indexOf(`data-house-page-select-option="${key}"`);
  return html.slice(html.lastIndexOf("<button", at), html.indexOf(">", at) + 1);
}

describe("HousePageSelectOptions inline", () => {
  it("is the listbox laid flat, with labelled groups and one Tab stop", () => {
    const html = inlineList({ value: "IE" });
    const listbox = html.slice(0, html.indexOf(">") + 1);
    expect(listbox).toContain('role="listbox"');
    expect(listbox).toContain('id="pick"');
    expect(listbox).toContain('aria-label="Countries"');
    expect(listbox).toContain('aria-describedby="pick-error"');
    expect(listbox).toContain(`class="${HOUSE_PAGE_SELECT_INLINE_LIST_CLASS}"`);
    expect(listbox).not.toContain("aria-multiselectable");

    // Each labelled group is a role=group named by its label.
    expect(html.match(/role="group"/g)).toHaveLength(2);
    const na = housePageSelectGroupLabelId("pick", "North America");
    expect(na).toBe("pick-North-America");
    expect(html).toContain(`role="group" aria-labelledby="${na}"`);
    expect(html).toContain(`id="${na}"`);
    expect(html).toContain('role="group" aria-labelledby="pick-europe"');
    expect(html).toContain('id="pick-europe"');

    // Roving tabindex: the chosen option is the one stop.
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    expect(optionTag(html, "IE")).toContain('tabindex="0"');
    expect(optionTag(html, "IE")).toContain('aria-selected="true"');
    for (const key of ["CA", "US", "GB"]) {
      expect(optionTag(html, key)).toContain('tabindex="-1"');
      expect(optionTag(html, key)).toContain('aria-selected="false"');
    }
    expect(optionTag(html, "IE")).toContain(`class="${housePageSelectInlineOptionClass(true)}"`);
    expect(optionTag(html, "US")).toContain(`class="${housePageSelectInlineOptionClass(false)}"`);
    expect(html.match(/data-appearance-check/g)).toHaveLength(1);

    // Detail lines stack under their labels.
    expect(html).toContain(
      `Canada<span data-house-page-select-option-detail="" class="${HOUSE_PAGE_SELECT_OPTION_DETAIL_CLASS}">First detail line.</span>`,
    );
    expect(html).toContain("Second detail line.");
    expect(html.match(/data-house-page-select-option-detail/g)).toHaveLength(2);

    // A bare list: no menu, no sheet, no native select, no form-select Esc owner.
    expect(html).not.toContain("data-house-form-select-menu");
    expect(html).not.toContain("data-house-page-select-sheet");
    expect(html).not.toContain("data-house-page-select-menu");
    expect(html).not.toContain("<select");
  });

  it("makes the first option the stop when nothing is chosen", () => {
    const html = inlineList();
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(optionTag(html, "CA")).toContain('tabindex="0"');
    expect(html).not.toContain('aria-selected="true"');
    expect(html).not.toContain("data-appearance-check");
  });

  it("chooses many in multiple mode", () => {
    const html = inlineList({ multiple: true, values: ["GB", "US"], value: "CA" });
    expect(html.slice(0, html.indexOf(">") + 1)).toContain('aria-multiselectable="true"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(2);
    expect(optionTag(html, "US")).toContain('aria-selected="true"');
    expect(optionTag(html, "GB")).toContain('aria-selected="true"');
    expect(optionTag(html, "CA")).toContain('aria-selected="false"');
    expect(html.match(/data-appearance-check/g)).toHaveLength(2);
    // The first chosen option in order holds the stop.
    expect(optionTag(html, "US")).toContain('tabindex="0"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  });

  it("leaves an unlabelled group without role=group", () => {
    const html = inlineList({
      groups: [{ id: "options", label: "", hideLabel: true, options: GROUPS[0]!.options }],
    });
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain("aria-labelledby");
    expect(html).not.toContain("data-house-page-select-group-label");
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  });

  it("moves the stop with focus while the option is drawn", () => {
    const chosen = (key: string) => key === "IE";
    expect(housePageSelectTabStop(GROUPS, chosen, null)).toBe("IE");
    expect(housePageSelectTabStop(GROUPS, chosen, "GB")).toBe("GB");
    // A focused option filtered out of the list hands the stop back.
    expect(housePageSelectTabStop(GROUPS, chosen, "FR")).toBe("IE");
    expect(housePageSelectTabStop(GROUPS, () => false, null)).toBe("CA");
    expect(housePageSelectTabStop([], () => false, null)).toBeNull();
  });

  it("draws its options in the order the keys walk them", () => {
    // houseFormSelectListKeyDown pairs the drawn option buttons with
    // housePageSelectOptionsInOrder by index.
    const drawn = [...inlineList().matchAll(/data-house-page-select-option="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(drawn).toEqual(housePageSelectOptionsInOrder(GROUPS).map((option) => option.key));
    expect(drawn).toEqual(["CA", "US", "IE", "GB"]);
  });

  it("wires the keys and owns no Esc, portal or sheet", () => {
    const src = stripSourceComments(
      readFileSync("src/components/chrome/house-page-select.tsx", "utf8"),
    );
    const list = src.slice(
      src.indexOf("export function HousePageSelectOptions"),
      src.indexOf("function HousePageSelectSheet"),
    );
    const flat = list.replace(/\s+/g, " ");
    expect(list).toContain("onKeyDown={inline ? onListKey : undefined}");
    expect(list).toContain("ref={listRef}");
    // Every key goes through the lib (lib/house-form-select tests it with
    // fake nodes): the drawn options, the focused element, the event (whose
    // default it cancels), and the type-ahead buffer it hands back.
    expect(flat).toContain(
      'const nodes = [ ...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-house-page-select-option]") ?? []), ];',
    );
    expect(flat).toContain(
      "typedRef.current = houseFormSelectListKeyDown( housePageSelectOptionsInOrder(groups), nodes, document.activeElement, event, typedRef.current, Date.now(), );",
    );
    expect(list).toContain("onFocus={inline ? () => setFocused(option.key) : undefined}");
    expect(list).toContain("tabIndex={inline ? (option.key === stop ? 0 : -1) : undefined}");
    expect(list).not.toContain("addEventListener");
    expect(list).not.toContain("createPortal");
    expect(list).not.toContain("Escape");
    expect(list).not.toContain("data-house-form-select-menu");
  });
});

// An inline list's options other than its one stop are tabindex=-1, and the
// house window's Tab trap (houseWindowFocusables) wraps at the last node it
// counts. While it counts tabindex=-1 buttons, Tab from the list's stop at
// the foot of a window body leaves the window. So the first caller of
// HousePageSelectOptions lands with the trap change (Add right plan A1).
describe("HousePageSelectOptions callers wait for the window Tab trap", () => {
  function trapNode(tabindex: string) {
    return {
      tabIndex: Number(tabindex),
      getAttribute: (name: string) => (name === "tabindex" ? tabindex : null),
      hasAttribute: (name: string) => name === "tabindex",
      matches: (selector: string) => selector.includes(`[tabindex="${tabindex}"]`),
      closest: () => null,
      classList: { contains: () => false },
    };
  }

  it("has no caller until the trap skips tabindex=-1", () => {
    const stop = trapNode("0");
    const roving = trapNode("-1");
    const root = { querySelectorAll: () => [stop, roving] } as unknown as HTMLElement;
    const counted = houseWindowFocusables(root) as unknown[];
    expect(counted).toContain(stop);
    const trapSkipsRoving = !counted.includes(roving);

    const callers = readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
      .map((file) => `src/${file}`)
      .filter((file) => file !== "src/components/chrome/house-page-select.tsx")
      .filter((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .some(
            (line) =>
              !/^\s*(\/\/|\/\*|\*)/.test(line) && /\bHousePageSelectOptions\b/.test(line),
          ),
      );
    expect(
      callers.length === 0 || trapSkipsRoving,
      `HousePageSelectOptions is used by ${callers.join(", ")} while houseWindowFocusables still counts tabindex=-1`,
    ).toBe(true);
  });
});
