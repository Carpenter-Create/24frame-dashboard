import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FieldList } from "@/components/layout/field-list";
import {
  HOUSE_PHONE_STACK_CLASS,
  HOUSE_PHONE_WRAP_CLASS,
  housePhoneForbidsTruncate,
} from "@/lib/house-phone-stack";
import {
  FIELD_LIST_CLASS,
  FIELD_LIST_LABEL_CLASS,
  FIELD_LIST_ROW_CLASS,
  FIELD_LIST_VALUE_CLASS,
} from "@/lib/field-list";

const src = readFileSync("src/lib/field-list.ts", "utf8");
const componentSrc = readFileSync("src/components/layout/field-list.tsx", "utf8");

describe("FieldList phone stack", () => {
  it("stacks label above value on phone and keeps the desktop ledger", () => {
    expect(FIELD_LIST_ROW_CLASS).toContain(HOUSE_PHONE_STACK_CLASS);
    expect(FIELD_LIST_ROW_CLASS).toContain("flex-col");
    expect(FIELD_LIST_ROW_CLASS).toContain("md:flex-row");
    expect(FIELD_LIST_ROW_CLASS).toContain("md:justify-between");
    expect(FIELD_LIST_VALUE_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(FIELD_LIST_VALUE_CLASS).toContain("md:text-right");
    expect(FIELD_LIST_LABEL_CLASS).toContain("md:shrink-0");
    expect(FIELD_LIST_LABEL_CLASS).not.toMatch(/(?<!md:)shrink-0/);
    expect(src).toContain("HOUSE_PHONE_STACK_CLASS");
    expect(src).toContain("HOUSE_PHONE_WRAP_CLASS");
    expect(componentSrc).toContain("FIELD_LIST_ROW_CLASS");
  });

  it("forbids truncate / sideways scroll as the phone fix", () => {
    const layout = [
      FIELD_LIST_CLASS,
      FIELD_LIST_ROW_CLASS,
      FIELD_LIST_LABEL_CLASS,
      FIELD_LIST_VALUE_CLASS,
    ].join(" ");
    expect(housePhoneForbidsTruncate(layout)).toBe(true);
    expect(src).not.toContain("overflow-x-auto");
    expect(componentSrc).not.toContain("overflow-x-auto");
    expect(componentSrc).not.toContain("truncate");
    expect(src).not.toMatch(/\btruncate\b/);
  });

  it("renders wrap + stack tokens, not a squeezed row", () => {
    const html = renderToStaticMarkup(
      createElement(FieldList, {
        items: [
          { label: "Catalog ID", value: "24F-0001234" },
          {
            label: "Filename",
            value: "very-long-unbroken-master-filename-that-must-wrap.mov",
          },
        ],
      }),
    );
    // The <dl> hook itself; a bare "data-field-list" also matches every row.
    expect(html).toContain('data-field-list=""');
    expect(html).toContain("data-field-list-row");
    expect(html).toContain(HOUSE_PHONE_STACK_CLASS);
    expect(html).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(html).toContain("24F-0001234");
    expect(html).toContain("very-long-unbroken-master-filename-that-must-wrap.mov");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("overflow-x-auto");
  });
});
