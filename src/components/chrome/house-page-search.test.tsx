import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/aggregation/titles",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("q=winter"),
}));

import { HOUSE_LEAD_SEARCH_PILL_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { GC_LICENSING_STATUS } from "@/lib/gc-deliveries";
import { TITLES_CATALOG } from "@/lib/titles-catalog";

import { HousePageSearch } from "./house-page-search";

const src = readFileSync("src/components/chrome/house-page-search.tsx", "utf8");
const titles = readFileSync("src/app/(app)/aggregation/titles/page.tsx", "utf8");
const queue = readFileSync("src/app/(app)/(operator)/staff/queue/page.tsx", "utf8");
const deliveries = readFileSync("src/app/(app)/(operator)/staff/gc/deliveries/page.tsx", "utf8");
const messages = readFileSync("src/components/chrome/messages-app-header.tsx", "utf8");

const PRODUCTION_PATHS = [
  "src/components/chrome/house-page-search.tsx",
  "src/app/(app)/aggregation/titles/page.tsx",
  "src/app/(app)/(operator)/staff/queue/page.tsx",
  "src/app/(app)/(operator)/staff/gc/deliveries/page.tsx",
  "src/components/chrome/messages-app-header.tsx",
] as const;

describe("HousePageSearch", () => {
  it("is the house in-page search pill — Phosphor + lead form contract, not lucide", () => {
    const html = renderToStaticMarkup(
      createElement(HousePageSearch, {
        placeholder: TITLES_CATALOG.searchPlaceholder,
        inputId: "house-page-search-q",
      }),
    );

    expect(html).toContain("data-house-page-search");
    expect(html).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(html).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html).toContain('type="search"');
    expect(html).toContain('id="house-page-search-q"');
    expect(html).toContain('for="house-page-search-q"');
    expect(html).toContain("sr-only");
    expect(html).toContain("winter");
    expect(html).not.toContain("lucide");
    expect(html).not.toContain("stroke-width");
    expect(html).not.toContain("strokeWidth");
    expect(src).toContain('from "@phosphor-icons/react"');
    expect(src).toContain("MagnifyingGlass");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).toContain('variant="bare"');
    expect(src).toContain("<Input");
    expect(src).toContain("skipTypedIngest.current = true");
    expect(src).not.toContain("lucide-react");
    expect(src).not.toContain('from "lucide-react"');
    expect(src).not.toContain("strokeWidth");
    expect(src).not.toContain("stroke-width");
  });

  it("slots the same primitive into Titles, Queue, Deliveries, and Messages", () => {
    expect(titles).toContain("HousePageSearch");
    expect(titles).toContain("TITLES_CATALOG.searchPlaceholder");
    expect(queue).toContain("HousePageSearch");
    expect(queue).toContain("TITLES_CATALOG.searchPlaceholder");
    expect(deliveries).toContain("HousePageSearch");
    expect(deliveries).toContain("GC_LICENSING_STATUS.searchPlaceholder");
    expect(messages).toContain("HousePageSearch");
    expect(messages).toContain("ASK_FRAME_AI.headerSearchPlaceholder");
    expect(messages).toContain("ASK_FRAME_AI.headerSearchHint");
    expect(GC_LICENSING_STATUS.searchPlaceholder).toBeTruthy();
    expect(ASK_FRAME_AI.headerSearchHint).toBe("⌘K");

    expect(src).not.toContain("lucide-react");
    for (const path of PRODUCTION_PATHS) {
      const contents = readFileSync(path, "utf8");
      expect(contents, path).not.toContain("SearchField");
      expect(contents, path).not.toContain("@/components/layout/search-field");
      expect(contents, path).not.toMatch(/import\s*\{[^}]*\bSearch\b[^}]*\}\s*from\s*"lucide-react"/);
    }

    expect(existsSync("src/components/layout/search-field.tsx")).toBe(false);
  });
});
