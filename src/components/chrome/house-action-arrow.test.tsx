import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HouseActionArrow, HOUSE_ACTION_ARROW_CLASS } from "./house-action-arrow";
import { DashboardViewAll } from "@/components/dashboard/dashboard-view-alts";
import { PHOSPHOR_CHROME_ICON_CLASS } from "@/lib/phosphor-icon";

describe("HouseActionArrow", () => {
  it("is the house blue Phosphor ArrowRight — no Read / Open / Visit words", () => {
    const html = renderToStaticMarkup(createElement(HouseActionArrow));
    expect(HOUSE_ACTION_ARROW_CLASS).toBe(`${PHOSPHOR_CHROME_ICON_CLASS} text-accent`);
    expect(HOUSE_ACTION_ARROW_CLASS).toContain("text-accent");
    expect(html).toContain("data-house-action-arrow");
    expect(html).toContain("text-accent");
    expect(html).toContain("size-4");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toMatch(/\b(Read|Open|Visit)\b/);
    expect(html).not.toContain("lucide-");

    const src = readFileSync(new URL("./house-action-arrow.tsx", import.meta.url), "utf8");
    expect(src).toContain("ArrowRight");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).not.toContain("lucide-react");
  });

  it("is the same glyph Dashboard View all already uses", () => {
    const html = renderToStaticMarkup(createElement(DashboardViewAll, { href: "/titles" }));
    expect(html).toContain("data-house-action-arrow");
    expect(html).toContain("data-dashboard-view-all-arrow");
    expect(html).toContain("View all");
    expect(html).toContain("text-accent");
  });
});
