import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({ desktop: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/aggregation/titles/24F-000123",
}));
vi.mock("./actions", () => ({ saveTitleDetails: vi.fn() }));
vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => host.desktop,
}));

import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";
import { TitleDetailsEntry, TitleDetailsLink, TitleDetailsWindow } from "./title-details-window";

const DIR = "src/app/(app)/aggregation/titles/[id]";
const pageSrc = readFileSync(`${DIR}/page.tsx`, "utf8");
const windowSrc = readFileSync(`${DIR}/title-details-window.tsx`, "utf8");
const releaseSrc = readFileSync(`${DIR}/release-info-form.tsx`, "utf8");
const actionsSrc = readFileSync(`${DIR}/actions.ts`, "utf8");
const metadataPageSrc = readFileSync(`${DIR}/metadata/page.tsx`, "utf8");

const PROPS = {
  titleId: "22222222-2222-4222-8222-222222222222",
  metadata: {
    synopsis: "A film.",
    runtime_minutes: 96,
    release_year: 2024,
    genre: "drama",
    primary_language: "en",
    country_of_origin: "US",
    cast: ["Ada"],
  },
  release: { releaseType: "re_release" as const, originalReleaseDate: "2001-05-04" },
  releaseDate: null,
};

function render(face: "index" | "required" | "recommended" | "optional" | "release", desktop = false) {
  host.desktop = desktop;
  return renderToStaticMarkup(
    <TitleDetailsWindow {...PROPS} initialFace={face} requestRef={{ current: null }} onClose={() => undefined} />,
  );
}

describe("title Metadata window (aggregation-title-details-window-lock-v1)", () => {
  it("is the house 600 window on a computer: X · Metadata · Done over the four rows", () => {
    const html = render("index", true);
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    for (const token of HOUSE_DIALOG_WINDOW_CLASS.split(" ")) expect(html).toContain(token);
    expect(html).toContain("data-title-details-window");
    expect(html).toContain('data-title-details-close=""');
    expect(html).toMatch(/<h2[^>]*>Metadata<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-title-details-done=""/);
    expect(html).toContain('data-title-details-required-open="required"');
    expect(html).toContain("6 of 6 complete");
    expect(html).toContain("1 of 4 complete");
    expect(html).toContain("0 of 2 complete");
    expect(html).toContain("Re-release · May 4, 2001");
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
  });

  it("is the same window as the full AppSheet on a phone", () => {
    const html = render("index");
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain('data-app-sheet-span="full"');
    expect(html).not.toContain('data-house-overlay-host="house-dialog"');
    expect(html).toMatch(/<h2[^>]*>Metadata<\/h2>/);
    expect(html).toContain("pt-[env(safe-area-inset-top)]");
  });

  it("pushes a tier's fields into the frame: ‹ · Required · Done", () => {
    const html = render("required", true);
    expect(html).toContain('data-title-details-back=""');
    expect(html).toMatch(/<h2[^>]*>Required<\/h2>/);
    expect(html).toContain('data-title-details-face="required"');
    expect(html).toContain(">A film.</textarea>");
    expect(html).toContain('value="96"');
    // Genre, language and country are the house Select, never a native one.
    expect(html).not.toContain("<select");
    expect(html.match(/data-house-form-select-trigger=""/g)?.length).toBe(3);
    expect(html).toContain(">Drama<");
    // Every field has its own id and label.
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html.match(/<label[^>]*for="/g)?.length).toBe(6);
  });

  it("shows Release with the original date for a re-release, and the release date as GC's", () => {
    const html = render("release", true);
    expect(html).toContain('data-title-details-face="release"');
    expect(html).toMatch(/<input type="radio"[^>]*checked=""[^>]*value="re_release"/);
    expect(html).not.toMatch(/<input type="radio"[^>]*checked=""[^>]*value="new_release"/);
    expect(html).toMatch(/<input[^>]*type="date"[^>]*max="\d{4}-\d{2}-\d{2}"[^>]*value="2001-05-04"/);
    expect(html).toContain("Set by 24Frame");
  });

  it("gives the page an Edit control and links that open the window at a face", () => {
    host.desktop = true;
    const entry = renderToStaticMarkup(<TitleDetailsEntry {...PROPS} />);
    expect(entry).toMatch(/<button[^>]*data-title-details-entry=""[^>]*aria-haspopup="dialog"[^>]*>Edit<\/button>/);
    expect(entry).not.toContain("data-title-details-window");
    const link = renderToStaticMarkup(<TitleDetailsLink face="release">Edit</TitleDetailsLink>);
    expect(link).toContain('href="/aggregation/titles/24F-000123?edit=release"');
    // The shell's click owner leaves it to the link's own entry.
    expect(link).toContain('data-house-link=""');
  });

  it("saves through one checked action and leaves no other way to write", () => {
    const done = windowSrc.slice(windowSrc.indexOf("async function done()"), windowSrc.indexOf("const [win, winRefs]"));
    // The check runs first; nothing changed closes without a call.
    expect(done).toContain("const issue = checkTitleDetails(draft);\n    if (issue) {");
    expect(done.indexOf("checkTitleDetails(draft)")).toBeLessThan(done.indexOf("saveTitleDetails("));
    expect(done.indexOf("onClose(savedRef.current);")).toBeLessThan(done.indexOf("saveTitleDetails("));
    expect(done).toContain("if (pending) return;");
    // The browser sends no org: the action reads it from the title row.
    expect(done).toContain("saveTitleDetails({ titleId, metadata: changes, release: releaseNext })");
    expect(actionsSrc).not.toContain("export async function setTitleReleaseInfo");
    expect(existsSync(`${DIR}/metadata/actions.ts`)).toBe(false);
    expect(existsSync(`${DIR}/metadata/metadata-form.tsx`)).toBe(false);
    expect(releaseSrc).not.toContain("useState");
    expect(releaseSrc).toContain('<TitleDetailsLink face="release"');
  });

  it("mounts the window only for operators, on the card header Submit never replaces", () => {
    const card = pageSrc.slice(pageSrc.indexOf("<CardHeader"), pageSrc.indexOf("</CardHeader>"));
    expect(card).toContain("{canOperate ? (\n                <TitleDetailsEntry");
    // Non-operators keep View on the read-only list.
    expect(card.indexOf("TITLE_DETAIL.viewMetadata")).toBeGreaterThan(card.indexOf(") : ("));
    expect(pageSrc).not.toContain("TITLE_DETAIL.editMetadata");
    const notice = pageSrc.slice(pageSrc.indexOf("{canSubmit ? ("), pageSrc.indexOf("{synopsis ? ("));
    expect(notice).toContain('<TitleDetailsLink face="required"');
    expect(notice).not.toContain("/metadata");
    expect(notice).not.toContain("TitleDetailsEntry");
    // The old address hands operators to the window at either width.
    expect(metadataPageSrc).toContain("if (canOperate) redirect(`${titleClientPath(title.catalog_id)}?${TITLE_DETAILS_PARAM}`);");
    expect(metadataPageSrc).not.toContain("MetadataForm");
  });

  it("closes the nearest layer on Esc (a Select first) and refreshes the page after a save", () => {
    expect(windowSrc).toContain('phone: "sheet"');
    expect(windowSrc).toContain("entry.close(win.key, saved ? () => router.refresh() : undefined)");
    expect(windowSrc).toContain("opensOnArrival: () => true");
    expect(windowSrc).toContain("holdOpen: pending");
  });
});
