import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LICENSING_VENDOR_NEW_CLASS } from "@/lib/gc-deliveries";
import type { DeliverActions } from "@/lib/deliver-stepper";
import { LicensingStatusList, VendorSubRow } from "./licensing-status-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const actions: DeliverActions = {
  load: vi.fn(async () => ({ ok: false as const, reason: "load_failed" as const })),
  deliver: vi.fn(async () => ({ created: [], existing: [], failed: [], stop: null })),
};

const listSrc = readFileSync("src/components/licensing/licensing-status-list.tsx", "utf8");

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

const TITLE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

const groups = [
  {
    id: TITLE_A,
    title: "North Star",
    href: `/gc/titles/${TITLE_A}`,
    stillUrl: null,
    year: "2024",
    publicId: "24F-0001234",
    lastActivity: "2026-09-12T00:00:00.000Z",
    vendors: [
      {
        deliveryId: "d1",
        vendorId: "v1",
        vendorName: "Acme Distribution",
        status: "pending" as const,
        submittedAt: "2026-09-12T00:00:00.000Z",
      },
      {
        deliveryId: "d2",
        vendorId: "v2",
        vendorName: "Northwind",
        status: "live" as const,
        submittedAt: "2026-09-10T00:00:00.000Z",
      },
    ],
  },
];

function render(canDeliver: boolean, rows: typeof groups = groups, empty: string | null = null) {
  return renderToStaticMarkup(
    createElement(LicensingStatusList, {
      groups: rows,
      vendors: [{ id: "v1", name: "Acme Distribution" }],
      canDeliver,
      deliverActions: canDeliver ? actions : null,
      empty: empty ? createElement("p", { "data-gc-licensing-empty": "" }, empty) : null,
    }),
  );
}

describe("LicensingStatusList v2", () => {
  it("renders Titles parents with indented vendor tracks and no Deliver until selected", () => {
    const html = render(true);
    expect(html).toContain('data-gc-licensing-title');
    expect(html).toContain("North Star");
    expect(html).toContain("Acme Distribution");
    expect(html).toContain("Northwind");
    expect(html).toContain("data-gc-licensing-indent");
    expect(html).toContain("data-status-progress");
    expect(html).toContain('data-gc-licensing-select');
    expect(html).not.toContain("data-gc-licensing-deliver=");
    expect(html).not.toContain("data-deliver-window");
    expect(html).not.toContain("Create delivery");
    expect(html).not.toContain("Export metadata");
  });

  it("shows no ticks, no Deliver and no window to staff without operate", () => {
    const html = render(false);
    expect(html).toContain("North Star");
    expect(html).not.toContain("data-gc-licensing-select");
    expect(html).not.toContain("data-gc-licensing-deliver");
    expect(html).not.toContain("data-deliver-window");
  });

  it("stays mounted with no titles and draws the empty state", () => {
    const html = render(true, [], "No licensing status yet.");
    expect(html).toContain("data-gc-licensing-list");
    expect(html).toContain('<p data-gc-licensing-empty="">No licensing status yet.</p>');
    expect(html).not.toContain("data-gc-licensing-title");
  });

  it("paints a channel row Deliver just created", () => {
    const fresh = renderToStaticMarkup(
      createElement(VendorSubRow, {
        deliveryId: "d9",
        vendorName: "Acme Distribution",
        status: "pending",
        submittedAt: null,
        isNew: true,
      }),
    );
    expect(fresh).toContain('data-gc-licensing-new=""');
    expect(fresh).toContain(LICENSING_VENDOR_NEW_CLASS);
    const old = renderToStaticMarkup(
      createElement(VendorSubRow, { deliveryId: "d1", vendorName: "Acme Distribution", status: "live", submittedAt: null }),
    );
    expect(old).not.toContain("data-gc-licensing-new");
    expect(old).not.toContain(LICENSING_VENDOR_NEW_CLASS);
  });

  it("uses the house 24 indent token and Titles landscape art", () => {
    expect(listSrc).toContain("TitlesLandscapeArt");
    expect(listSrc).toContain("StatusProgressTrack");
    expect(listSrc).toContain("licensingDeliverVisible");
    expect(listSrc).toContain("LICENSING_VENDOR_INDENT_CLASS");
    expect(listSrc).toContain("flex-col");
    expect(listSrc).not.toContain("NewDeliveryForm");
    expect(listSrc).not.toContain("ExportPanel");
  });
});

describe("LicensingStatusList hosts the Deliver window", () => {
  const arrival = listSrc.slice(listSrc.indexOf("function opensOnArrival()"), listSrc.indexOf("const entry = useHouseWindowEntry"));

  it("opens the window over the list on the same screen (no route hop)", () => {
    expect(listSrc).toContain("useHouseWindowEntry<\"channel\">({");
    expect(listSrc).not.toContain("deliverStepperHref");
    expect(listSrc).not.toContain("router.push");
    expect(listSrc).toContain('entry.openFromPage("channel")');
    expect(listSrc).toContain('aria-haspopup="dialog"');
    expect(listSrc).toContain("aria-expanded={win !== null}");
    // The window mounts at the list's root, outside the Deliver bar.
    const bar = listSrc.slice(listSrc.indexOf("{showDeliver ? ("), listSrc.indexOf("{win && canDeliver && deliverActions ? ("));
    expect(bar).not.toContain("<DeliverWindow");
    expect(listSrc.indexOf("{win && canDeliver && deliverActions ? (")).toBeGreaterThan(listSrc.indexOf("{showDeliver ? ("));
    expect(listSrc).toContain("titleIds={windowIds}");
  });

  it("strips ?deliver and opens nothing without operate or titles, or on a reload", () => {
    expect(arrival).toContain("if (!canDeliver || groups.length === 0) {\n      stripDeliver();\n      return false;\n    }");
    expect(arrival.indexOf("!canDeliver")).toBeLessThan(arrival.indexOf("parseDeliverWindowIds"));
    expect(arrival).toContain("setSelected(handed.filter((id) => shown.has(id)));");
    expect(arrival.trimEnd().endsWith("stripDeliver();\n    return false;\n  }")).toBe(true);
  });

  it("un-ticks at close, then refreshes and paints once Back has landed", () => {
    const close = listSrc.slice(listSrc.indexOf("onClose={(outcome) => {"), listSrc.indexOf("/>\n      ) : null}\n    </div>"));
    expect(close).toContain("setSelected(licensingPruneSelection(selected, groupIds, outcome.delivered));");
    expect(close).toContain("entry.close(\n              win.key,");
    const after = close.slice(close.indexOf("outcome.saved"));
    expect(after).toContain("setPainted(outcome.created);");
    expect(after).toContain("router.refresh();");
    expect(close.indexOf("setPainted(outcome.created)")).toBeGreaterThan(close.indexOf("entry.close("));
    expect(close.indexOf("setSelected(licensingPruneSelection")).toBeLessThan(close.indexOf("entry.close("));
  });

  it("returns focus to Deliver, or to the delivered title's tick, and reads refs only outside render", () => {
    expect(listSrc).toContain("deliverButtonRef.current ??");
    expect(listSrc).toContain('[data-gc-licensing-select="${lastDeliveredRef.current}"]');
    expect(listSrc).toContain("listRef.current,\n  });");
    // The JSX reads no ref: the window's ids are state.
    const jsx = listSrc.slice(listSrc.indexOf("  return (\n    <div data-gc-licensing-list"));
    expect(jsx.split("onClose={(outcome) => {")[0]).not.toContain(".current");
    expect(listSrc).toContain("const [windowIds, setWindowIds] = useState<string[]>([]);");
  });
});
