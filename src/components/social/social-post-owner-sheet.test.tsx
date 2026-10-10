import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";
import { HOUSE_DIALOG_CONFIRM_CLASS, HOUSE_DIALOG_FORM_CLASS } from "@/lib/house-overlay";
import {
  APP_SHEET_RISE_CLASS,
  CLOSE_44_CLASS,
  HOUSE_DANGER_INK_CLASS,
  SHEET_GROUP_INSET_ITEM_CLASS,
} from "@/lib/house-sheet";
import {
  HOUSE_WINDOW_ASK_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_BUTTON_CLASS,
  HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS,
} from "@/lib/house-window";
import { SOCIAL } from "@/lib/social";

import { SocialPostOwnerSheet, SocialPostRemoveDialog } from "./social-post-owner-sheet";

// A post's ⋯ sheet on a phone and the Remove confirm on both widths, as the
// server draws them (docs/design-locks/social-post-owner-menu-lock-v1.md §2, §3).

const noop = () => undefined;

function sheet({
  face = "menu",
  canEdit = true,
  pending = false,
  error = "",
}: { face?: "menu" | "confirm"; canEdit?: boolean; pending?: boolean; error?: string } = {}) {
  return renderToStaticMarkup(
    <SocialPostOwnerSheet
      face={face}
      canEdit={canEdit}
      surfaceRef={createRef<HTMLDivElement>()}
      panelRef={createRef<HTMLDivElement>()}
      pending={pending}
      error={error}
      onEdit={noop}
      onRemoveRow={noop}
      onClose={noop}
      onScrimKeep={noop}
      onKeep={noop}
      onRemove={noop}
    />,
  );
}

function dialog({ pending = false, error = "" }: { pending?: boolean; error?: string } = {}) {
  return renderToStaticMarkup(
    <SocialPostRemoveDialog
      panelRef={createRef<HTMLDivElement>()}
      pending={pending}
      error={error}
      onScrimKeep={noop}
      onKeep={noop}
      onRemove={noop}
    />,
  );
}

/** The opening tag that carries `needle`. */
function tagOf(html: string, needle: string): string {
  const at = html.indexOf(needle);
  expect(at, needle).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

function classOf(tag: string): string {
  return tag.match(/class="([^"]*)"/)?.[1] ?? "";
}

describe("the phone sheet: the menu face", () => {
  it("is the house AppSheet card named Post options, rising, with no visible title", () => {
    const html = sheet();
    const frame = tagOf(html, 'data-house-overlay-host="app-sheet"');
    expect(frame).toContain('data-app-sheet-span="card"');
    expect(frame).toContain(`aria-label="${SOCIAL.post.overflow}"`);
    expect(html).not.toContain("<h2");
    expect(html).toContain(APP_SHEET_RISE_CLASS);
    expect(tagOf(html, "data-social-post-owner-sheet")).toContain('data-menu-family="A"');
  });

  it("holds one inset group: Edit caption, then Remove in the house danger ink, both 48 rows", () => {
    const html = sheet();
    expect(html.match(/data-sheet-group=""/g)).toHaveLength(1);
    expect(html).toContain("data-sheet-group-inset");
    const edit = tagOf(html, 'data-sheet-group-item="edit-caption"');
    const remove = tagOf(html, 'data-sheet-group-item="remove"');
    expect(html.indexOf('data-sheet-group-item="edit-caption"')).toBeLessThan(html.indexOf('data-sheet-group-item="remove"'));
    expect(classOf(edit)).toBe(SHEET_GROUP_INSET_ITEM_CLASS);
    expect(classOf(remove)).toBe(cn(SHEET_GROUP_INSET_ITEM_CLASS, HOUSE_DANGER_INK_CLASS));
    expect(classOf(edit)).not.toContain(HOUSE_DANGER_INK_CLASS);
    expect(html).toContain(`>${SOCIAL.post.editTitle}</button>`);
    expect(html).toContain(`>${SOCIAL.post.deleteConfirm}</button>`);
  });

  it("closes from its scrim (Close) and draws no ✕; with no caption host, Remove is the only row", () => {
    const html = sheet();
    expect(html).toContain(`aria-label="${SOCIAL.create.close}"`);
    expect(html).not.toContain(CLOSE_44_CLASS);
    const noHost = sheet({ canEdit: false });
    expect(noHost).not.toContain('data-sheet-group-item="edit-caption"');
    expect(noHost).not.toContain(SOCIAL.post.editTitle);
    expect(noHost).toContain('data-sheet-group-item="remove"');
  });
});

describe("the phone sheet: the confirm face", () => {
  it("keeps the frame's name and turns the card into its own alertdialog, named and described", () => {
    const html = sheet({ face: "confirm" });
    const frame = tagOf(html, 'data-house-overlay-host="app-sheet"');
    expect(frame).toContain(`aria-label="${SOCIAL.post.overflow}"`);
    expect(frame).not.toContain("aria-describedby");
    const panel = tagOf(html, 'role="alertdialog"');
    expect(panel).toContain('aria-modal="true"');
    expect(panel).toContain('tabindex="-1"');
    const titleId = panel.match(/aria-labelledby="([^"]+)"/)?.[1];
    const lineId = panel.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(tagOf(html, `<h2 id="${titleId}"`)).toBeTruthy();
    expect(html.slice(html.indexOf(`<h2 id="${titleId}"`))).toMatch(/^<h2 [^>]*>Remove this post\?<\/h2>/);
    expect(html).toContain(`<p id="${lineId}"`);
    expect(SOCIAL.post.deleteBody).toBe("It comes off 24Frame, with its comments and likes. You can't undo this.");
    expect(html).toContain("It comes off 24Frame, with its comments and likes. You can&#x27;t undo this.");
  });

  it("stacks Keep (the accent pill) first, then Remove (the outlined pill in danger ink), both 44", () => {
    const html = sheet({ face: "confirm" });
    expect(html.indexOf('data-social-post-remove-keep=""')).toBeLessThan(html.indexOf('data-social-post-remove-discard=""'));
    expect(html).toContain(`class="${HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS}"`);
    const keep = classOf(tagOf(html, 'data-social-post-remove-keep=""'));
    const remove = classOf(tagOf(html, 'data-social-post-remove-discard=""'));
    for (const button of [keep, remove]) {
      for (const token of HOUSE_WINDOW_ASK_BUTTON_CLASS.split(" ")) expect(button).toContain(token);
    }
    expect(keep).toContain("bg-accent");
    expect(remove).toContain("border-hairline");
    expect(remove).toContain(HOUSE_DANGER_INK_CLASS);
    expect(keep).not.toContain(HOUSE_DANGER_INK_CLASS);
    // The scrim is Keep; there is no ✕ and no Close.
    expect(tagOf(html, "app-sheet-scrim-fade")).toContain(`aria-label="${SOCIAL.post.deleteKeep}"`);
    expect(html).not.toContain(CLOSE_44_CLASS);
    expect(html).not.toContain(`aria-label="${SOCIAL.create.close}"`);
  });

  it("shows a failure in place between the line and the buttons, and waits with both buttons", () => {
    const failed = sheet({ face: "confirm", error: SOCIAL.post.deleteFailed });
    const line = failed.indexOf("It comes off 24Frame");
    const notice = failed.indexOf(SOCIAL.post.deleteFailed);
    expect(line).toBeLessThan(notice);
    expect(notice).toBeLessThan(failed.indexOf('data-social-post-remove-keep=""'));
    expect(tagOf(failed, SOCIAL.post.deleteFailed)).toContain('role="status"');
    const waiting = sheet({ face: "confirm", pending: true });
    expect(tagOf(waiting, 'data-social-post-remove-keep=""')).toContain('disabled=""');
    const remove = tagOf(waiting, 'data-social-post-remove-discard=""');
    expect(remove).toContain('disabled=""');
    expect(remove).toContain('aria-busy="true"');
    const idle = sheet({ face: "confirm" });
    expect(idle).not.toContain('disabled=""');
    expect(idle).not.toContain("aria-busy");
  });
});

describe("the desktop confirm", () => {
  it("is HouseDialog's 400 confirm named Post options, its scrim Keep, holding the ask in a row", () => {
    const html = dialog();
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    const frame = tagOf(html, 'role="dialog"');
    expect(frame).toContain(HOUSE_DIALOG_CONFIRM_CLASS);
    expect(frame).not.toContain(HOUSE_DIALOG_FORM_CLASS);
    expect(frame).toContain(`aria-label="${SOCIAL.post.overflow}"`);
    expect(html).toContain(`aria-label="${SOCIAL.post.deleteKeep}"`);
    const panel = tagOf(html, 'role="alertdialog"');
    expect(panel).toMatch(/aria-labelledby="[^"]+"/);
    expect(panel).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain(`class="${HOUSE_WINDOW_ASK_ACTIONS_CLASS}"`);
    expect(html.indexOf('data-social-post-remove-keep=""')).toBeLessThan(html.indexOf('data-social-post-remove-discard=""'));
    expect(html).not.toContain(CLOSE_44_CLASS);
    expect(html).not.toContain(`aria-label="${SOCIAL.create.close}"`);
  });

  it("never says Delete on either face or width", () => {
    for (const html of [sheet(), sheet({ face: "confirm" }), dialog()]) expect(html).not.toContain("Delete");
  });
});
