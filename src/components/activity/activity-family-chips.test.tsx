import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActivityFamilyChips } from "./activity-family-chips";
import {
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_TOP_PILL_CLUSTER_CLASS,
} from "@/lib/dashboard-craft";
import { SEGMENTED_ITEM_SELECTED_ATTR } from "@/lib/segmented-track";

const src = readFileSync("src/components/activity/activity-family-chips.tsx", "utf8");

describe("ActivityFamilyChips", () => {
  it("uses house top-pill tokens and track selectedIndex for ink", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityFamilyChips, { family: "all" }),
    );
    expect(html).toContain("data-activity-family");
    expect(html).toContain('data-activity-family-chip="education"');
    expect(html).toContain(DASHBOARD_TOP_PILL_CLUSTER_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS);
    expect(html).toContain('data-segmented-persist="activity-family"');
    expect(html).toContain(SEGMENTED_ITEM_SELECTED_ATTR);
    expect(html).not.toContain("data-activity-status");
    expect(html).not.toContain(">Open<");
    expect(html).not.toContain(">Done<");
    expect(src).toContain("({ selectedIndex })");
    expect(src).toContain("segmentedItemOn");
    expect(src).not.toContain("pendingFamily");
    expect(src).not.toContain("family === key");
  });

  it("marks the route family selected on first paint", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityFamilyChips, { family: "education" }),
    );
    const education = html.slice(html.indexOf('data-activity-family-chip="education"'));
    expect(education).toContain(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(education).toContain(SEGMENTED_ITEM_SELECTED_ATTR);
    expect(html).not.toContain(">Open<");
    expect(html).not.toContain(">Done<");
  });
});
