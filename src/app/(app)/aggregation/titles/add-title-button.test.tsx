import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { TITLES_CATALOG } from "@/lib/titles-catalog";
import { AddTitleButton } from "./add-title-button";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "add-title-button.tsx"), "utf8");

function openingTagWith(html: string, marker: string): string {
  const at = html.indexOf(marker);
  const start = html.lastIndexOf("<", at);
  const end = html.indexOf(">", at);
  return html.slice(start, end + 1);
}

describe("AddTitleButton header", () => {
  it("locks the desktop Sporty Blue labeled pill so a text-only revert fails", () => {
    const html = renderToStaticMarkup(createElement(AddTitleButton, { orgId: "org-1" }));
    const open = openingTagWith(html, "data-add-title-labeled");

    expect(html).toContain(TITLES_CATALOG.addTitle);
    expect(html).toContain("data-add-title-labeled");
    expect(html).not.toContain("data-add-title-icon");
    expect(open).toContain("t-body-sm");
    expect(open).toContain("bg-accent");
    expect(open).toContain("text-accent-contrast");
    expect(open).toContain("rounded-full");
    expect(src).toContain("from \"@/components/ui/button\"");
    expect(src).toContain("<Button");
    expect(src).not.toContain("t-body-sm text-accent");
    expect(src).not.toContain("fixed");
  });

  it("locks the phone Sporty Blue + to house 44 with an Add Title name", () => {
    const html = renderToStaticMarkup(
      createElement(AddTitleButton, { orgId: "org-1", appearance: "icon" }),
    );
    const open = openingTagWith(html, "data-add-title-icon");

    expect(html).toContain(`aria-label="${TITLES_CATALOG.addTitle}"`);
    expect(html).toContain("data-add-title-icon");
    expect(html).not.toContain("data-add-title-labeled");
    expect(open).toContain("bg-accent");
    expect(open).toContain("text-accent-contrast");
    expect(open).toContain("rounded-full");
    expect(open).toContain("size-[44px]");
    expect(open).toContain("min-h-[44px]");
    expect(open).toContain("min-w-[44px]");
    expect(src).toContain("Plus");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).not.toContain("fixed");
    expect(html).not.toContain("fixed");
  });
});
