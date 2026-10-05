import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HOUSE_FORM_SELECT_CHEVRON_CLASS,
  HOUSE_FORM_SELECT_OPTION_CHECK_CLASS,
  HOUSE_FORM_SELECT_PANEL_CLASS,
  HOUSE_FORM_SELECT_TRIGGER_CLASS,
} from "@/lib/house-form-select";
import { Select } from "./select";

describe("Select", () => {
  it("renders a house input trigger and a light open menu", () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        id: "team-invite-role",
        name: "role",
        value: "viewer",
        defaultOpen: true,
        "aria-label": "Role",
        onChange: () => undefined,
        options: [
          { value: "account_owner", label: "Account owner" },
          { value: "viewer", label: "Viewer" },
        ],
      }),
    );
    expect(html).toContain("data-house-form-select");
    expect(html).toContain("data-house-form-select-trigger");
    expect(html).toContain("data-house-form-select-menu");
    expect(html).toContain("data-house-form-select-current");
    expect(html).toContain("data-house-form-select-chevron");
    expect(html).toContain('data-house-form-select-option="viewer"');
    expect(html).toContain(HOUSE_FORM_SELECT_TRIGGER_CLASS);
    expect(html).toContain(HOUSE_FORM_SELECT_PANEL_CLASS);
    expect(html).toContain(HOUSE_FORM_SELECT_CHEVRON_CLASS);
    expect(html).toContain(HOUSE_FORM_SELECT_OPTION_CHECK_CLASS);
    expect(html).toContain("data-appearance-check");
    expect(html).toContain("Viewer");
    expect(html).toContain("Account owner");
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="role"');
    expect(html).toContain("bg-surface");
    expect(html).toContain("text-ink");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("bg-ink");
  });

  it("uses house idle Phosphor on the chevron — not a native picker", () => {
    const src = readFileSync("src/components/ui/select.tsx", "utf8");
    expect(src).toContain("CaretDown");
    expect(src).toContain("weight={PHOSPHOR_CHROME_IDLE_WEIGHT}");
    expect(src).toContain("AppearanceCheck");
    expect(src).not.toContain("<select");
    expect(src).not.toContain("createPortal");
  });
});
