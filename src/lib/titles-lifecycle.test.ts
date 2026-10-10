import { describe, expect, it } from "vitest";

import { TITLE_STATUS_LABELS, titleDisplayStatus } from "@/lib/titles";
import {
  TITLE_LIFECYCLE,
  excludeArchivedTitles,
  isArchivedTitleStatus,
  quoteTitleName,
  titleArchiveConfirmBody,
  titleArchiveConfirmTitle,
  titleDeleteConfirmBody,
  titleDeleteConfirmTitle,
  titleHasLifecycleActions,
  titleLifecycleFlags,
  titleListHasReportingActivity,
  titleRestoreConfirmBody,
  titleRestoreConfirmTitle,
} from "@/lib/titles-lifecycle";

describe("title lifecycle gates", () => {
  it("lets an owner delete a draft and never a submitted title", () => {
    const owner = { isStaff: false, canOperate: true, staffCanOperate: false };
    expect(titleLifecycleFlags(owner, "draft", false)).toEqual({
      canDelete: true,
      canArchive: false,
      canRestore: false,
      offerArchiveFromDelete: false,
    });
    expect(titleLifecycleFlags(owner, "in_review", false)).toEqual({
      canDelete: false,
      canArchive: true,
      canRestore: false,
      offerArchiveFromDelete: true,
    });
    expect(titleLifecycleFlags(owner, "live", true)).toEqual({
      canDelete: false,
      canArchive: true,
      canRestore: false,
      offerArchiveFromDelete: true,
    });
  });

  it("lets staff delete drafts and Live only when reporting facts are empty", () => {
    const staff = { isStaff: true, canOperate: true, staffCanOperate: true };
    expect(titleLifecycleFlags(staff, "draft", false).canDelete).toBe(true);
    expect(titleLifecycleFlags(staff, "live", false)).toEqual({
      canDelete: true,
      canArchive: true,
      canRestore: false,
      offerArchiveFromDelete: false,
    });
    expect(titleLifecycleFlags(staff, "live", true)).toEqual({
      canDelete: false,
      canArchive: true,
      canRestore: false,
      offerArchiveFromDelete: true,
    });
    expect(titleLifecycleFlags(staff, "submitted", true).canDelete).toBe(false);
  });

  it("restores archived titles and does not offer delete", () => {
    const owner = { isStaff: false, canOperate: true, staffCanOperate: false };
    expect(titleLifecycleFlags(owner, "archived", true)).toEqual({
      canDelete: false,
      canArchive: false,
      canRestore: true,
      offerArchiveFromDelete: false,
    });
    expect(isArchivedTitleStatus("archived")).toBe(true);
    expect(isArchivedTitleStatus("live")).toBe(false);
  });

  it("hides controls from a read-only member", () => {
    const viewer = { isStaff: false, canOperate: false, staffCanOperate: false };
    expect(titleLifecycleFlags(viewer, "draft", false).canDelete).toBe(false);
    expect(titleLifecycleFlags(viewer, "live", false).canArchive).toBe(false);
    expect(titleLifecycleFlags(viewer, "archived", false).canRestore).toBe(false);
    expect(titleHasLifecycleActions(titleLifecycleFlags(viewer, "draft", false))).toBe(false);
  });

  // Adam, 2026-10-10, "Yes, in #799 (Recommended)": delete_title's staff gate
  // is gc_can(auth.uid(), 'operate'), so a read-only GC role is not offered it.
  it("offers staff Delete only to a GC role that can operate, as delete_title's gate", () => {
    // GC legal or accountant: staff, but gc_can(operate) is false.
    const readOnly = { isStaff: true, canOperate: false, staffCanOperate: false };
    expect(titleLifecycleFlags(readOnly, "draft", false)).toEqual({
      canDelete: false,
      canArchive: false,
      canRestore: false,
      offerArchiveFromDelete: false,
    });
    expect(titleHasLifecycleActions(titleLifecycleFlags(readOnly, "draft", false))).toBe(false);
    expect(titleLifecycleFlags(readOnly, "live", false).canDelete).toBe(false);
    expect(titleLifecycleFlags(readOnly, "submitted", false).canDelete).toBe(false);
    // An org role never stands in for the GC role: for GC staff, member_can
    // defers to gc_can.
    const readOnlyWithOrgRole = { isStaff: true, canOperate: true, staffCanOperate: false };
    expect(titleLifecycleFlags(readOnlyWithOrgRole, "draft", false).canDelete).toBe(false);
    expect(titleLifecycleFlags(readOnlyWithOrgRole, "live", false).canDelete).toBe(false);
    // Account owner or delivery ops staff, with no org role: unchanged.
    const operator = { isStaff: true, canOperate: false, staffCanOperate: true };
    expect(titleLifecycleFlags(operator, "draft", false).canDelete).toBe(true);
    expect(titleLifecycleFlags(operator, "live", false).canDelete).toBe(true);
    expect(titleLifecycleFlags(operator, "live", true).canDelete).toBe(false);
    // A member's Delete never reads the GC flag.
    expect(titleLifecycleFlags({ isStaff: false, canOperate: true, staffCanOperate: false }, "draft", false).canDelete).toBe(true);
    expect(titleLifecycleFlags({ isStaff: false, canOperate: false, staffCanOperate: true }, "draft", false).canDelete).toBe(false);
  });

  it("exposes list-row flags without weakening the reporting predicate", () => {
    const staff = { isStaff: true, canOperate: false, staffCanOperate: true };
    expect(titleListHasReportingActivity("draft")).toBe(false);
    expect(titleListHasReportingActivity("live")).toBe(true);
    expect(titleListHasReportingActivity("archived")).toBe(false);
    expect(titleHasLifecycleActions(titleLifecycleFlags(staff, "draft", false))).toBe(true);
    expect(titleLifecycleFlags(staff, "live", titleListHasReportingActivity("live"))).toEqual({
      canDelete: false,
      canArchive: true,
      canRestore: false,
      offerArchiveFromDelete: true,
    });
  });
});

describe("title lifecycle copy", () => {
  it("keeps confirm copy to one professional line", () => {
    expect(TITLE_LIFECYCLE.deleteDraftBody).toBe(
      "This removes the draft and its files from the catalog.",
    );
    expect(TITLE_LIFECYCLE.archiveBody).toBe(
      "This leaves the active catalog. Assets, rights, and reporting stay on record.",
    );
    expect(quoteTitleName("Harbor Cut")).toBe("“Harbor Cut”");
    expect(titleDeleteConfirmTitle("Harbor Cut")).toBe("Delete “Harbor Cut”");
    expect(titleArchiveConfirmTitle("Harbor Cut")).toBe("Archive “Harbor Cut”");
    expect(titleRestoreConfirmTitle("Harbor Cut")).toBe("Restore “Harbor Cut”");
    expect(titleDeleteConfirmBody({ isStaff: false, status: "draft", name: "Harbor Cut" })).toBe(
      "This removes the draft “Harbor Cut” and its files from the catalog.",
    );
    expect(titleDeleteConfirmBody({ isStaff: true, status: "live", name: "Harbor Cut" })).toBe(
      "This removes “Harbor Cut” and its files from the catalog.",
    );
    expect(titleArchiveConfirmBody(true, "Harbor Cut")).toBe(
      "“Harbor Cut” has reporting history and cannot be deleted. Archive it to remove it from the active catalog.",
    );
    expect(titleArchiveConfirmBody(false, "Harbor Cut")).toBe(
      "“Harbor Cut” leaves the active catalog. Assets, rights, and reporting stay on record.",
    );
    expect(titleRestoreConfirmBody("Harbor Cut")).toBe(
      "This returns “Harbor Cut” to the active catalog.",
    );
    expect(TITLE_LIFECYCLE.moreLabel).toBe("Title actions");
    expect(TITLE_LIFECYCLE.purgeFailed).toBe(
      "The title left the catalog. Stored files could not be removed; the system will retry.",
    );
    expect(TITLE_LIFECYCLE.purgeFailed).not.toMatch(/cannot be undone|permanent|warning/i);
    expect(TITLE_LIFECYCLE.deleteDraftBody).not.toMatch(/cannot be undone|permanent|warning/i);
    expect(TITLE_LIFECYCLE.archiveBody).not.toMatch(/irreversible|forever|warning/i);
    expect(titleDeleteConfirmBody({ isStaff: false, status: "draft", name: "Harbor Cut" })).not.toMatch(
      /cannot be undone|permanent|warning/i,
    );
    expect(titleArchiveConfirmBody(true, "Harbor Cut")).not.toMatch(/irreversible|forever|warning/i);
  });

  it("labels archived as a first-class title status", () => {
    // In key order: the GC status override lists the statuses in this order.
    expect(Object.entries(TITLE_STATUS_LABELS)).toEqual([
      ["draft", "Draft"],
      ["submitted", "Submitted"],
      ["in_review", "In review"],
      ["in_delivery", "Submitted"],
      ["live", "Approved"],
      ["takedown_requested", "Takedown requested"],
      ["taken_down", "Taken down"],
      ["archived", "Archived"],
    ]);
    expect(titleDisplayStatus("archived", 2, 3)).toBe("Archived");
    expect(titleDisplayStatus("live", 2, 3)).toBe("Approved · 2 of 3 platforms");
  });
});

describe("excludeArchivedTitles", () => {
  it("drops archived rows from an active catalog list", () => {
    const rows = [
      { id: "a", status: "live" },
      { id: "b", status: "archived" },
      { id: "c", status: "draft" },
    ];
    expect(excludeArchivedTitles(rows).map((row) => row.id)).toEqual(["a", "c"]);
  });
});
