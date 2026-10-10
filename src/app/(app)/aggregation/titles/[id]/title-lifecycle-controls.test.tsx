import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TITLE_LIFECYCLE, titleDeleteConfirmTitle } from "@/lib/titles-lifecycle";
import { TitleLifecycleControls } from "./title-lifecycle-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "title-lifecycle-controls.tsx"), "utf8");
const pageSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");
const listSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../page.tsx"), "utf8");
const gcSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../(operator)/staff/gc/titles/[id]/page.tsx"),
  "utf8",
);

const DELETE_FLAGS = {
  canDelete: true,
  canArchive: false,
  canRestore: false,
  offerArchiveFromDelete: false,
} as const;

describe("TitleLifecycleControls", () => {
  it("shows the house actions menu and Delete confirm when flags allow", () => {
    const html = renderToStaticMarkup(
      createElement(TitleLifecycleControls, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "draft",
        isStaff: false,
        flags: DELETE_FLAGS,
      }),
    );
    expect(html).toContain("data-title-lifecycle");
    expect(html).toContain("data-title-lifecycle-menu");
    expect(html).toContain(TITLE_LIFECYCLE.moreLabel);
    expect(html).toContain("data-title-lifecycle-delete-confirm");
    expect(html).toContain(TITLE_LIFECYCLE.deleteLabel);
    expect(html).toContain(titleDeleteConfirmTitle("Harbor Cut"));
    expect(html).toContain("“Harbor Cut”");
    expect(html).not.toContain("data-title-lifecycle-archive-confirm");
    expect(html).not.toContain("cannot be undone");
    expect(html).not.toContain("bg-accent");
  });

  it("offers Archive confirm when delete is refused for reporting history", () => {
    const html = renderToStaticMarkup(
      createElement(TitleLifecycleControls, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "live",
        isStaff: true,
        flags: {
          canDelete: false,
          canArchive: true,
          canRestore: false,
          offerArchiveFromDelete: true,
        },
      }),
    );
    expect(html).toContain("data-title-lifecycle-menu");
    expect(html).toContain("data-title-lifecycle-archive-confirm");
    expect(html).toContain(TITLE_LIFECYCLE.archiveLabel);
    expect(html).not.toContain("data-title-lifecycle-delete-confirm");
  });

  it("offers Restore confirm on an archived title", () => {
    const html = renderToStaticMarkup(
      createElement(TitleLifecycleControls, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "archived",
        isStaff: false,
        flags: {
          canDelete: false,
          canArchive: false,
          canRestore: true,
          offerArchiveFromDelete: false,
        },
      }),
    );
    expect(html).toContain("data-title-lifecycle-menu");
    expect(html).toContain("data-title-lifecycle-restore-confirm");
    expect(html).toContain(TITLE_LIFECYCLE.restoreLabel);
  });

  it("hides the control when no lifecycle flags are offered", () => {
    const html = renderToStaticMarkup(
      createElement(TitleLifecycleControls, {
        titleId: "t1",
        titleName: "Harbor Cut",
        status: "live",
        isStaff: false,
        flags: {
          canDelete: false,
          canArchive: false,
          canRestore: false,
          offerArchiveFromDelete: false,
        },
      }),
    );
    expect(html).toBe("");
    expect(html).not.toContain("data-title-lifecycle");
    expect(html).not.toContain("data-title-lifecycle-menu");
    expect(html).not.toContain(TITLE_LIFECYCLE.deleteLabel);
  });

  it("uses the house menu surface with danger Delete, not a muted mid-page link", () => {
    expect(src).toContain("MenuSurfaceContent");
    expect(src).toContain("MenuSurfaceItem");
    expect(src).toContain("danger");
    expect(src).toContain("data-title-lifecycle-delete");
    expect(src).toContain("TITLE_LIFECYCLE.moreLabel");
    expect(src).not.toContain('className="t-body-sm text-ink-2 hover:text-ink"');
  });

  it("uses house Button + DialogFooter on confirms — never menu-item classes as actions", () => {
    expect(src).toContain("from \"@/components/ui/button\"");
    expect(src).toContain("DialogFooter");
    expect(src).toContain('variant="secondary"');
    expect(src).toContain('variant="danger"');
    expect(src).toContain("titleDeleteConfirmTitle");
    expect(src).toContain("titleArchiveConfirmTitle");
    expect(src).toContain("titleRestoreConfirmTitle");
    expect(src).toContain("titleName");
    expect(src).not.toContain("MENU_SURFACE_ITEM_CLASS");
    expect(src).not.toContain("MENU_SURFACE_ITEM_DANGER_CLASS");
  });

  it("mounts on the title-detail hero overflow, not mid-page alone", () => {
    expect(pageSrc).toContain("overflow={");
    expect(pageSrc).toContain("<TitleLifecycleControls");
    expect(pageSrc).toContain("aggregationViewAsSurface");
    expect(pageSrc).toContain("isStaff={lifecycleStaff}");
    expect(pageSrc).toContain("titleName={title.title}");
    expect(listSrc).toContain("titleName={r.title}");
    expect(gcSrc).toContain("titleName={t.title}");
    expect(pageSrc.indexOf("overflow={")).toBeLessThan(pageSrc.indexOf("<TitleLifecycleControls"));
    expect(pageSrc).toContain("titleRole");
    expect(pageSrc).toContain("ctx.activeRole");
  });

  // Adam, 2026-10-10, "Yes, in #799 (Recommended)": delete_title's staff gate
  // is gc_can(auth.uid(), 'operate'). Every host passes it as staffCanOperate,
  // and the Aggregation hosts ask for it only for staff.
  it("gives every host delete_title's staff gate, gc_can(operate)", () => {
    for (const host of [pageSrc, listSrc]) {
      expect(host).toContain(
        'lifecycleStaff\n    ? await supabase.rpc("gc_can", { p_uid: ctx.user.id, p_capability: "operate" })\n    : { data: false };',
      );
      expect(host).toContain("staffCanOperate: staffCanOperate === true");
    }
    expect(gcSrc).toContain('supabase.rpc("gc_can", { p_uid: user.id, p_capability: "operate" })');
    expect(gcSrc).toContain("staffCanOperate: canOperate === true");
  });
});
