import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TITLE_STATUS_OVERRIDE } from "@/lib/title-status-override";
import { GcTitleStatusControl } from "./gc-title-status-control";
import { GC_TITLE_STATUS_LABELS } from "@/lib/titles";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "gc-title-status-control.tsx"),
  "utf8",
);
const reviewSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../review/review-controls.tsx"),
  "utf8",
);
const pageSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");
const queueSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../queue/page.tsx"),
  "utf8",
);

describe("GcTitleStatusControl", () => {
  it("exposes one status select + required reason + confirm", () => {
    const html = renderToStaticMarkup(
      createElement(GcTitleStatusControl, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "in_delivery",
        locked: false,
      }),
    );
    expect(html).toContain("data-gc-title-status");
    expect(html).toContain("data-gc-title-status-select");
    expect(html).toContain("data-gc-title-status-reason");
    expect(html).toContain("data-gc-title-status-confirm");
    expect(html).toContain(TITLE_STATUS_OVERRIDE.confirm);
    expect(html).toContain(TITLE_STATUS_OVERRIDE.reasonPlaceholder);
    expect(html).toContain(GC_TITLE_STATUS_LABELS.in_delivery);
    expect(html).not.toContain(TITLE_STATUS_OVERRIDE.locked);
  });

  it("disables the control and shows the lock-in explainer", () => {
    const html = renderToStaticMarkup(
      createElement(GcTitleStatusControl, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "live",
        locked: true,
      }),
    );
    expect(html).toContain("data-gc-title-status-locked");
    expect(html).toContain(TITLE_STATUS_OVERRIDE.locked);
    expect(html).not.toContain("data-gc-title-status-select");
    expect(html).not.toContain("data-gc-title-status-confirm");
  });

  it("is the single house status control — no review-UI fork, no queue row control", () => {
    expect(src).toContain("setGcTitleStatus");
    expect(src).not.toContain("reviewTitle");
    expect(src).not.toContain("review_title");
    expect(reviewSrc).not.toContain("gc_set_title_status");
    expect(reviewSrc).not.toContain("setGcTitleStatus");
    expect(pageSrc).toContain("GcTitleStatusControl");
    expect(pageSrc).toContain("titleStatusOverrideLocked");
    expect(queueSrc).not.toContain("GcTitleStatusControl");
    expect(queueSrc).not.toContain("setGcTitleStatus");
  });
});
