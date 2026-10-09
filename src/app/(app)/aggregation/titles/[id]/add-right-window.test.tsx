import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({ desktop: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/aggregation/titles/24F-000123",
}));
vi.mock("./actions", () => ({ addRights: vi.fn() }));
vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => host.desktop,
}));

import { EMPTY_ADD_RIGHT, type AddRightDraft, type AddRightFace } from "@/lib/add-right";
import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";
import {
  AddRightEntry,
  AddRightExclusivityFace,
  AddRightTerritoryFace,
  AddRightWindow,
} from "./add-right-window";

const DIR = "src/app/(app)/aggregation/titles/[id]";
const pageSrc = readFileSync(`${DIR}/page.tsx`, "utf8");
const windowSrc = readFileSync(`${DIR}/add-right-window.tsx`, "utf8");

const TITLE = "22222222-2222-4222-8222-222222222222";

function render(face: AddRightFace, desktop = false) {
  host.desktop = desktop;
  return renderToStaticMarkup(
    <AddRightWindow titleId={TITLE} initialFace={face} requestRef={{ current: null }} onClose={() => undefined} />,
  );
}

const PICKED: AddRightDraft = { ...EMPTY_ADD_RIGHT, mode: "include", picks: { include: ["GB", "IE"], exclude: ["FR"] } };

function territory(query = "", draft: AddRightDraft = PICKED) {
  return renderToStaticMarkup(
    <AddRightTerritoryFace
      ids="t"
      draft={draft}
      query={query}
      onMode={() => undefined}
      onToggle={() => undefined}
      onQuery={() => undefined}
    />,
  );
}

function optionTag(html: string, key: string): string {
  return html.match(new RegExp(`<button[^>]*data-house-page-select-option="${key}"[^>]*>`))?.[0] ?? "";
}

function uniqueIds(html: string) {
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
}

describe("title Add right window (aggregation-add-right-window-lock-v1)", () => {
  it("is the house 600 window held at 80vh: X · Add right · Done over three rows", () => {
    const html = render("index", true);
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    for (const token of HOUSE_DIALOG_WINDOW_CLASS.split(" ")) expect(html).toContain(token);
    // The frame fills 80vh (fill) and never takes a held px height.
    expect(html).toContain('data-add-right-window="" class="flex h-[80vh] min-h-0 flex-col outline-none"');
    expect(html).not.toMatch(/data-add-right-window=""[^>]*style=/);
    expect(html).toContain('data-add-right-close=""');
    expect(html).toMatch(/<h2[^>]*>Add right<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-add-right-done=""[^>]*>Done<\/button>/);
    for (const row of ["type", "territory", "exclusivity"]) {
      expect(html).toContain(`data-add-right-${row}-open="${row}"`);
    }
    const values = [...html.matchAll(/<span class="t-body-sm text-ink-3">([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(values).toEqual(["—", "Worldwide", "—"]);
    expect(html).toContain("Add one right at a time — each carries its own territory and exclusivity.");
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
    uniqueIds(html);
  });

  it("is the same window as the full AppSheet on a phone", () => {
    const html = render("index");
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain('data-app-sheet-span="full"');
    expect(html).toContain("pt-[env(safe-area-inset-top)]");
    expect(html).not.toContain('data-house-overlay-host="house-dialog"');
    expect(html).toMatch(/<h2[^>]*>Add right<\/h2>/);
  });

  it("lists the 21 rights in their 5 categories, inline, with one Tab stop", () => {
    const html = render("type", true);
    expect(html).toMatch(/<h2[^>]*>Rights type<\/h2>/);
    expect(html).toContain('data-add-right-back=""');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-label="Rights type"');
    expect(html.match(/role="option"/g)).toHaveLength(21);
    expect(html.match(/data-house-page-select-group-label=""/g)).toHaveLength(5);
    expect(html.match(/role="group"/g)).toHaveLength(5);
    expect(html).toContain("Subscription streaming.");
    expect(html).toContain("Commercial cinema exhibition.");
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(optionTag(html, "theatrical")).toContain('tabindex="0"');
    expect(html).not.toContain("aria-multiselectable");
    // HousePageSelect's own list, laid flat: no native select, no house menu
    // (Esc stays the window's Back), no second sheet.
    expect(html).not.toContain("<select");
    expect(html).not.toContain("data-house-form-select-menu");
    expect(html).not.toContain("data-house-page-select-sheet");
    uniqueIds(html);
  });

  it("keeps each territory mode's own picks, with the full line and a search that stays in view", () => {
    const html = territory();
    expect(html.match(/<input type="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*value="include"/);
    expect(html).not.toMatch(/<input type="radio"[^>]*checked=""[^>]*value="(world|exclude)"/);
    expect(html).toContain("Worldwide</label>");
    expect(html).toContain("Only these countries</label>");
    expect(html).toContain("Worldwide except</label>");
    expect(html).toMatch(/data-add-right-territory-line=""[^>]*>Ireland, United Kingdom<\/p>/);
    expect(html).toMatch(
      /<div data-add-right-search="" class="sticky top-0 z-10 bg-bg[^"]*"><input[^>]*type="search"[^>]*aria-label="Search countries"[^>]*placeholder="Search countries"/,
    );
    expect(html).toContain('aria-multiselectable="true"');
    // A keyed-to country stops below the sticky search (its scroll margin).
    expect(html).toContain(
      '<div data-add-right-countries="" class="[&amp;_[data-house-page-select-option]]:scroll-mt-18"><div role="listbox"',
    );
    expect(html).toContain('aria-label="Only these countries"');
    expect(optionTag(html, "GB")).toContain('aria-selected="true"');
    expect(optionTag(html, "IE")).toContain('aria-selected="true"');
    // Exclusions are their own list: FR is not picked under Only these.
    expect(optionTag(html, "FR")).toContain('aria-selected="false"');
    expect(html.match(/role="option"/g)).toHaveLength(249);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).not.toContain("data-house-form-select-menu");
    uniqueIds(html);

    const excluding = territory("", { ...PICKED, mode: "exclude" });
    expect(excluding).toContain('aria-label="Worldwide except"');
    expect(optionTag(excluding, "FR")).toContain('aria-selected="true"');
    expect(optionTag(excluding, "GB")).toContain('aria-selected="false"');
    expect(excluding).toMatch(/data-add-right-territory-line=""[^>]*>Worldwide except France<\/p>/);

    const none = territory("zz");
    expect(none).toContain("No countries match.");
    expect(none).not.toContain('role="listbox"');

    const world = territory("", EMPTY_ADD_RIGHT);
    expect(world).toMatch(/<input type="radio"[^>]*checked=""[^>]*value="world"/);
    expect(world).not.toContain("Search countries");
  });

  it("asks exclusivity with nothing pre-chosen, and today's explanation", () => {
    const html = renderToStaticMarkup(<AddRightExclusivityFace ids="x" value={null} onChange={() => undefined} />);
    expect(html.match(/<input type="radio"/g)).toHaveLength(2);
    expect(html).not.toContain("checked");
    expect(html).toContain("Exclusive</label>");
    expect(html).toContain("Non-exclusive</label>");
    expect(html).toContain(
      "Exclusive: only you may distribute this right in these territories. Non-exclusive: others may too.",
    );
    const face = render("exclusivity", true);
    expect(face).toMatch(/<h2[^>]*>Exclusivity<\/h2>/);
    uniqueIds(face);
  });

  it("gives the Rights card an Add right control", () => {
    host.desktop = true;
    const entry = renderToStaticMarkup(<AddRightEntry titleId={TITLE} />);
    expect(entry).toMatch(/<button[^>]*data-add-right-entry=""[^>]*aria-haspopup="dialog"[^>]*>Add right<\/button>/);
    expect(entry).not.toContain("data-add-right-window");
  });

  it("adds through one checked action, from the index only, with no org", () => {
    const done = windowSrc.slice(windowSrc.indexOf("async function done()"), windowSrc.indexOf("const [win, winRefs]"));
    expect(done).toContain("if (pending) return;");
    expect(done.indexOf("checkAddRight(")).toBeGreaterThan(-1);
    expect(done.indexOf("checkAddRight(")).toBeLessThan(done.indexOf("addRights("));
    // A complete draft on a face returns to the index (the review) first.
    expect(done).toContain('if (face !== "index") {\n      setProblem(null);\n      openFace("index");\n      return;\n    }');
    expect(done.indexOf('if (face !== "index")')).toBeLessThan(done.indexOf("addRights("));
    // The browser sends no org: the action reads it from the title row.
    expect(done).toContain("result = await addRights(request);");
    expect(done).toContain("const request = addRightRequest(titleId, draft);");
    expect(windowSrc).not.toContain("orgId");
    // A request that fails outright never leaves the window waiting.
    expect(done).toContain("} catch {\n      // The request itself failed");
    expect(done).toContain("} finally {\n      if (mountedRef.current) setPending(false);\n    }");
    expect(windowSrc).toContain("holdOpen: pending");
    expect(windowSrc).toContain('phone: "sheet"');
    expect(windowSrc).toMatch(/\n\s+fill\n/);
    expect(windowSrc).toContain("entry.close(win.key, refresh ? () => router.refresh() : undefined)");
    // ?edit wins: one window per address.
    expect(windowSrc).toContain("opensOnArrival: () => parseTitleDetailsWindow(window.location.search) === null");
  });

  it("mounts the control only for operators, on the Rights card; the old form is gone", () => {
    const rights = pageSrc.slice(pageSrc.indexOf("<TitleDetailSection title={TITLE_DETAIL.sectionRights}>"));
    const card = rights.slice(0, rights.indexOf("</Card>"));
    expect(card).toContain("{canOperate ? (\n                <CardHeader");
    expect(card).toContain("<AddRightEntry titleId={title.id} />");
    expect(card).toContain("{TITLE_DETAIL.rightsEmpty}");
    expect(card).toContain("{exclusivityLabel(g.exclusive)}");
    expect(pageSrc).not.toContain("AddRightsForm");
    expect(pageSrc).not.toContain("No rights granted yet.");
    expect(pageSrc).not.toContain('"Non-exclusive"');
    expect(existsSync(`${DIR}/add-rights-form.tsx`)).toBe(false);
    // The Metadata card's header is still the page's first.
    expect(pageSrc.indexOf("<CardHeader")).toBeLessThan(pageSrc.indexOf("<TitleDetailsEntry"));
    expect(pageSrc.indexOf("<CardHeader")).toBeLessThan(pageSrc.indexOf("<AddRightEntry"));
  });
});
