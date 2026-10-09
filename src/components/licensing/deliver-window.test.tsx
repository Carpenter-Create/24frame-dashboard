import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({ desktop: false }));

vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => host.desktop,
}));

import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import {
  deliverEmptyOutcome,
  planDeliver,
  type DeliverActions,
  type DeliverOutcome,
  type DeliverTitleRow,
  type GrantChoice,
} from "@/lib/deliver-stepper";
import {
  DeliverChannelFace,
  DeliverResultFace,
  DeliverRightsFace,
  DeliverTerritoryFace,
  DeliverWindow,
} from "./deliver-window";

const windowSrc = readFileSync("src/components/licensing/deliver-window.tsx", "utf8");
const NOW = new Date("2026-10-09T12:00:00.000Z");

function tid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function title(n: number, name: string, status: DeliverTitleRow["status"] = "in_delivery"): DeliverTitleRow {
  return { id: tid(n), title: name, status };
}

function grant(n: number, titleN: number, extra: Partial<GrantChoice> = {}): GrantChoice {
  return { id: `g-${n}`, title_id: tid(titleN), rights_type: "avod", territory_mode: "world", territories: [], ...extra };
}

// Fakes: the window only ever receives the actions as props.
const actions: DeliverActions = {
  load: vi.fn(async () => ({ ok: false as const, reason: "load_failed" as const })),
  deliver: vi.fn(async () => ({ created: [], existing: [], failed: [], stop: null })),
};

const VENDORS = [
  { id: "v1", name: "Channel One" },
  { id: "v2", name: "Channel Two" },
];

function renderWindow(desktop: boolean) {
  host.desktop = desktop;
  return renderToStaticMarkup(
    <DeliverWindow
      titleIds={[tid(1), tid(2)]}
      vendors={VENDORS}
      actions={actions}
      requestRef={{ current: null }}
      onClose={() => undefined}
    />,
  );
}

const NAMES = new Map<string, string>();

describe("Deliver window (staff-licensing-deliver-window-lock-v1)", () => {
  it("is the house 600 window on a computer: ✕ · Channel · Continue (disabled before a pick)", () => {
    const html = renderWindow(true);
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    for (const token of HOUSE_DIALOG_WINDOW_CLASS.split(" ")) expect(html).toContain(token);
    expect(html).toContain("data-deliver-window");
    expect(html).toContain('data-deliver-close=""');
    expect(html).not.toContain("data-deliver-back");
    expect(html).toMatch(/<h2[^>]*>Channel<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-deliver-done=""[^>]*disabled=""[^>]*>Continue<\/button>/);
    // The 4-segment track, one filled; no caption, no wordmark.
    expect(html.match(/data-deliver-progress-seg="filled"/g)).toHaveLength(1);
    expect(html.match(/data-deliver-progress-seg="empty"/g)).toHaveLength(3);
    expect(html).not.toContain("1 Channel · 2 Rights");
    expect(html).not.toContain(">24Frame<");
    expect(html).toContain("Which channel for these titles?");
    expect(html).toContain("2 titles selected · one channel per delivery");
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
  });

  it("is the same window as the full AppSheet on a phone", () => {
    const html = renderWindow(false);
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain('data-app-sheet-span="full"');
    expect(html).not.toContain('data-house-overlay-host="house-dialog"');
    expect(html).toMatch(/<h2[^>]*>Channel<\/h2>/);
    expect(html).toContain("pt-[env(safe-area-inset-top)]");
  });
});

describe("Deliver faces", () => {
  it("Channel: channel radios labelled by the question, and every set-aside title named", () => {
    const titles = [title(1, "North Star"), title(2, "Harbor", "live"), title(3, "Late Frost")];
    const plan = planDeliver(titles, [tid(9)], [grant(1, 1), grant(2, 2)], NOW);
    const html = renderToStaticMarkup(
      <DeliverChannelFace
        questionId="q"
        selectedCount={4}
        vendors={VENDORS}
        vendorId="v2"
        plan={plan}
        overCap={false}
        loadReason={null}
        onPick={() => undefined}
      />,
    );
    expect(html).toContain('<p id="q" class="t-body text-ink">Which channel for these titles?</p>');
    expect(html).toContain('role="radiogroup" aria-labelledby="q"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*data-deliver-option-selected=""/);
    expect(html).toContain("1 title isn&#x27;t ready to deliver and is left out.");
    expect(html).toContain(`<li class="t-body-sm text-ink-2 ${HOUSE_PHONE_WRAP_CLASS}">Harbor · Approved</li>`);
    expect(html).toContain("1 title has no active grant and is left out.");
    expect(html).toContain(`<li class="t-body-sm text-ink-2 ${HOUSE_PHONE_WRAP_CLASS}">Late Frost</li>`);
    expect(html).toContain("1 selected title could not be found and is left out.");
    expect(html).not.toContain("Select up to 500 titles at a time.");
  });

  it("Channel: the over-cap line, the load line, and nothing deliverable", () => {
    const over = renderToStaticMarkup(
      <DeliverChannelFace
        questionId="q"
        selectedCount={501}
        vendors={VENDORS}
        vendorId=""
        plan={null}
        overCap
        loadReason="load_too_many"
        onPick={() => undefined}
      />,
    );
    expect(over).toContain("Select up to 500 titles at a time.");
    expect(over).toContain("Too many grants to load at once. Select fewer titles.");
    const none = renderToStaticMarkup(
      <DeliverChannelFace
        questionId="q"
        selectedCount={1}
        vendors={[]}
        vendorId=""
        plan={planDeliver([title(1, "Harbor", "live")], [], [], NOW)}
        overCap={false}
        loadReason={null}
        onPick={() => undefined}
      />,
    );
    expect(none).toContain("No active channels.");
    expect(none).toContain("Select at least one title to deliver.");
  });

  it("Rights: one face per title reads '{title} · i of n'", () => {
    const titles = [title(1, "North Star"), title(2, "Harbor"), title(3, "Late Frost")];
    const plan = planDeliver(titles, [], [grant(1, 1), grant(2, 1, { rights_type: "svod" }), grant(3, 2), grant(4, 3)], NOW);
    const names = new Map(titles.map((row) => [row.id, row.title]));
    const html = renderToStaticMarkup(
      <DeliverRightsFace questionId="q" plan={plan} group={0} names={names} pick="g-2" onPick={() => undefined} />,
    );
    expect(html).toContain("Which rights grant?");
    expect(html).toContain("North Star · 1 of 3");
    expect(html).toContain("AVOD · Worldwide");
    expect(html).toContain("SVOD · Worldwide");
    expect(html).toMatch(/aria-checked="true"[^>]*data-deliver-option-selected=""[^>]*>[\s\S]*?SVOD · Worldwide/);
    expect(html).not.toContain("data-deliver-names");
  });

  it("Rights: a grouped face reads '{n} titles · i of g' and lists every name", () => {
    const titles = Array.from({ length: 7 }, (_, i) => title(i + 1, `Film ${i + 1}`));
    const grants = titles.map((_, i) => grant(i + 1, i + 1));
    const plan = planDeliver(titles, [], grants, NOW);
    const names = new Map(titles.map((row) => [row.id, row.title]));
    const html = renderToStaticMarkup(
      <DeliverRightsFace questionId="q" plan={plan} group={0} names={names} pick={undefined} onPick={() => undefined} />,
    );
    expect(html).toContain("7 titles · 1 of 1");
    for (const row of titles) expect(html).toContain(`<li class="t-body-sm text-ink-2 ${HOUSE_PHONE_WRAP_CLASS}">${row.title}</li>`);
    expect(html.match(/role="radio"/g)).toHaveLength(1);
  });

  it("Territory: cards up to 16 choices, the house Select above that (never HousePageSelect)", () => {
    const titles = [title(1, "North Star")];
    const short = planDeliver(
      titles,
      [],
      [grant(1, 1, { territory_mode: "include", territories: ["US", "CA"] })],
      NOW,
    );
    const cards = renderToStaticMarkup(
      <DeliverTerritoryFace
        ids="w"
        questionId="q"
        plan={short}
        group={0}
        names={NAMES}
        pick="g-1"
        territory="CA"
        onPick={() => undefined}
      />,
    );
    expect(cards).toContain('role="radiogroup" aria-labelledby="q"');
    expect(cards).toContain("United States");
    expect(cards).toMatch(/data-deliver-option-selected=""[^>]*>[\s\S]*?Canada/);
    expect(cards).not.toContain("data-house-form-select-trigger");

    const world = planDeliver(titles, [], [grant(1, 1)], NOW);
    const select = renderToStaticMarkup(
      <DeliverTerritoryFace
        ids="w"
        questionId="q"
        plan={world}
        group={0}
        names={NAMES}
        pick="g-1"
        territory=""
        onPick={() => undefined}
      />,
    );
    expect(select).toContain('data-house-form-select-trigger=""');
    expect(select).toContain('<label class="t-label text-ink-2" for="w-territory">Which territory?</label>');
    expect(select).toContain('id="w-territory"');
    expect(select).toContain("Select territory");
    expect(select).not.toContain("house-page-select");
    expect(select).not.toContain('role="radio"');
  });

  it("Result: Download, the id for one delivery, ✓ only when all were created, and each failure named", () => {
    const names = new Map([
      [tid(1), "North Star"],
      [tid(2), "Harbor"],
      [tid(3), "Late Frost"],
    ]);
    const all: DeliverOutcome = { ...deliverEmptyOutcome(1), created: [{ titleId: tid(1), deliveryId: "d-123" }] };
    const one = renderToStaticMarkup(
      <DeliverResultFace outcome={all} names={names} exporting={false} exportError="" onDownload={() => undefined} />,
    );
    expect(one).toContain("data-deliver-download");
    expect(one).toContain(">Download metadata sheet<");
    expect(one).toContain("ID · d-123");
    expect(one).toContain("data-deliver-check");
    expect(one).toContain("Returns to Licensing Status");

    const part: DeliverOutcome = {
      total: 3,
      created: [{ titleId: tid(1), deliveryId: "d-1" }],
      existing: [{ titleId: tid(2), deliveryId: null }],
      failed: [{ titleId: tid(3), reason: "no_cover" }],
      stop: null,
    };
    const partial = renderToStaticMarkup(
      <DeliverResultFace outcome={part} names={names} exporting exportError="forbidden" onDownload={() => undefined} />,
    );
    expect(partial).not.toContain("data-deliver-check");
    expect(partial).toContain("Late Frost · No active grant covers this territory.");
    expect(partial).toContain("Harbor · Delivery already exists.");
    expect(partial).toContain(">Preparing…<");
    expect(partial).toContain("forbidden");
  });
});

describe("Deliver window source", () => {
  it("is the house window shell, with the result as its closing face", () => {
    expect(windowSrc).toContain('phone: "sheet"');
    expect(windowSrc).toContain("holdOpen: pending || exporting");
    expect(windowSrc).toContain("indexFace: deliverIndexFace(face)");
    expect(windowSrc).toContain("<HouseWindowFrame");
    expect(windowSrc).toContain("<HouseWindowAsk");
  });

  it("re-checks the face before acting (⌘/Ctrl+Enter bypasses the disabled action)", () => {
    const primary = windowSrc.slice(windowSrc.indexOf("async function primary()"), windowSrc.indexOf("async function commit("));
    expect(primary).toContain("if (!deliverCanContinue(face, draft, plan)) return;");
    expect(primary.indexOf("deliverCanContinue(face, draft, plan)")).toBeLessThan(primary.indexOf("commit(plan)"));
  });

  it("sends batches one after another, never leaves the window waiting, and sends no org", () => {
    const commit = windowSrc.slice(windowSrc.indexOf("async function commit("), windowSrc.indexOf("async function download()"));
    expect(commit).toContain("for (const batch of deliverBatches(items)) {");
    expect(commit).toContain("await actions.deliver({ vendorId, items: batch })");
    expect(commit).toContain("} catch {");
    expect(commit).toContain("} finally {\n      committingRef.current = false;\n      if (mountedRef.current) setPending(false);\n    }");
    expect(commit).toContain("if (answer.stop) break;");
    expect(windowSrc).not.toMatch(/orgId|org_id/);
  });

  it("starts one run at a time: a second press before `pending` renders sends nothing", () => {
    const primary = windowSrc.slice(windowSrc.indexOf("async function primary()"), windowSrc.indexOf("async function commit("));
    expect(primary).toContain("if (pending || committingRef.current) return;");
    const commit = windowSrc.slice(windowSrc.indexOf("async function commit("), windowSrc.indexOf("async function download()"));
    expect(commit.startsWith("async function commit(current: DeliverPlan) {\n    if (committingRef.current) return;")).toBe(true);
    // Claimed before the first await, released only when the run ends.
    const claim = commit.indexOf("committingRef.current = true;");
    expect(claim).toBeGreaterThan(0);
    expect(claim).toBeLessThan(commit.indexOf("await "));
    expect(commit.match(/committingRef\.current = false;/g)).toHaveLength(1);
  });

  it("reports each batch's new rows to the list as it answers", () => {
    const commit = windowSrc.slice(windowSrc.indexOf("async function commit("), windowSrc.indexOf("async function download()"));
    expect(commit).toContain("onCreated?.(answer.created.map((row) => row.deliveryId));");
    expect(commit.indexOf("onCreated?.(")).toBeGreaterThan(commit.indexOf("await actions.deliver("));
  });

  it("plans only inside the load, and imports no server code", () => {
    const load = windowSrc.slice(windowSrc.indexOf("void (async () => {"), windowSrc.indexOf("}, [overCap, titleIds]);"));
    expect(windowSrc.match(/planDeliver\(/g)).toHaveLength(1);
    expect(load).toContain("planDeliver(result.titles, result.notFound, result.grants, new Date())");
    expect(windowSrc).not.toContain("@/app/");
    expect(windowSrc).not.toContain("deliver-actions");
  });

  it("draws no takeover, no second select, no hex and no inline copy", () => {
    expect(windowSrc).not.toContain("fixed inset-0");
    expect(windowSrc).not.toContain("bg-surface-muted");
    expect(windowSrc).not.toContain("HousePageSelect");
    expect(windowSrc).not.toContain("router.push");
    expect(windowSrc).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(windowSrc).not.toContain('"Creating…"');
    expect(windowSrc).not.toContain('"Export failed."');
    expect(windowSrc).not.toContain('"Preparing…"');
    expect(windowSrc).not.toContain('"Select territory"');
    expect(windowSrc).not.toContain('"Close"');
    expect(windowSrc).not.toContain(">✓<");
  });
});
