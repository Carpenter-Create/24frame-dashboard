import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/app/(app)/account/actions", () => ({
  uploadAccountPhoto: vi.fn(),
  removeAccountPhoto: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  createSocialProfile: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  saveSocialWelcomeVideo: vi.fn(),
  clearSocialWelcomeVideo: vi.fn(),
  updateSocialBio: vi.fn(),
}));

import { HOUSE_DIALOG_WINDOW_CLASS } from "@/lib/house-overlay";
import { SOCIAL } from "@/lib/social";
import { SocialProfileEditEntry } from "./social-profile-edit-entry";
import { SocialProfileEditWindow } from "./social-profile-edit-window";

const windowSrc = readFileSync("src/components/social/social-profile-edit-window.tsx", "utf8");
const entrySrc = readFileSync("src/components/social/social-profile-edit-entry.tsx", "utf8");
const editSrc = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");

function render(initialFace?: "edit" | "name" | "topics", waiting?: boolean) {
  return renderToStaticMarkup(
    <SocialProfileEditWindow
      waiting={waiting}
      handle="ada"
      displayName="Ada Lovelace"
      bio="Writes engines."
      photoUrl={null}
      crafts={["actor"]}
      topics={["Acting"]}
      initialFace={initialFace}
      onClose={() => undefined}
      onPersistFailed={() => undefined}
    />,
  );
}

describe("Edit profile window (docs/design-locks/social-profile-edit-window-lock-v1.md)", () => {
  it("is the house 600 window: X · Edit profile · Done over the index, nothing typed on it", () => {
    const html = render();
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    expect(html).toContain("data-social-profile-edit-window");
    for (const token of HOUSE_DIALOG_WINDOW_CLASS.split(" ")) expect(html).toContain(token);
    expect(html).not.toContain("w-[min(92vw,480px)]");
    expect(html).not.toContain("HouseDrawer");
    expect(html).not.toContain('data-house-overlay-host="house-drawer"');
    // Header: close (index) · title · Done.
    expect(html).toContain("data-social-profile-edit-close");
    expect(html).toContain(`aria-label="${SOCIAL.create.close}"`);
    expect(html).not.toContain("data-social-profile-edit-back");
    expect(html).toMatch(/<h2[^>]*>Edit profile<\/h2>/);
    expect(html).toContain("data-social-profile-edit-done");
    expect(html).toContain(SOCIAL.profile.done);
    // The index: photo, welcome video, drill rows; no fields.
    expect(html).toContain("data-social-profile-edit-avatar-drop");
    expect(html).toContain("data-social-profile-edit-welcome");
    expect(html).toContain("data-social-profile-edit-name-open");
    expect(html).toContain("data-social-profile-edit-bio-open");
    expect(html).not.toContain('id="social-edit-first-name"');
    // The photo menu is closed until Edit picture.
    expect(html).not.toContain("data-social-profile-avatar-sheet");
    expect(html).not.toContain("data-social-profile-edit-discard-ask");
  });

  it("pushes a face into the same frame: ‹ · Name · Done, the face body only", () => {
    const html = render("name");
    expect(html).toContain("data-social-profile-edit-back");
    expect(html).toContain(`aria-label="${SOCIAL.profile.back}"`);
    expect(html).not.toContain("data-social-profile-edit-close");
    expect(html).toMatch(/<h2[^>]*>Name<\/h2>/);
    expect(html).toContain('id="social-edit-first-name"');
    expect(html).toContain('value="Ada"');
    // The window owns the header: no face header, no face Done, no sheet host.
    expect(html).not.toContain("data-social-profile-name-header");
    expect(html).not.toContain("data-social-profile-edit-face-done");
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain("data-social-profile-edit-done");
    expect(render("topics")).toMatch(/<h2[^>]*>Topics<\/h2>/);
  });

  it("closes the nearest layer on Esc: menu, crop, ask, face, then the window", () => {
    const escape = windowSrc.slice(windowSrc.indexOf("function onEscape()"), windowSrc.indexOf("// Latest handlers"));
    const order = [
      "if (busy) return;",
      "if (edit.avatarSheet)",
      "if (edit.cropOpen)",
      "if (asking)",
      'if (edit.face !== "edit")',
      "requestClose();",
    ].map((step) => escape.indexOf(step));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // A second Esc keeps editing; it never discards.
    expect(escape.slice(escape.indexOf("if (asking)"), escape.indexOf('if (edit.face !== "edit")'))).toContain(
      "keepEditing()",
    );
    expect(escape).not.toContain("discard(");
    expect(windowSrc).toContain('if (event.key === "Escape") {\n        event.preventDefault();');
    // Closing the ask or the menu puts focus back where it was.
    expect(windowSrc).toContain('restoreFocus("[data-social-profile-edit-close]")');
    expect(windowSrc).toContain('restoreFocus("[data-social-profile-edit-picture]")');
  });

  it("asks before leaving with changes, inside the window, and closes at once when clean", () => {
    const close = windowSrc.slice(windowSrc.indexOf("function requestClose()"), windowSrc.indexOf("function done()"));
    expect(close).toContain("if (!edit.dirty) {\n      onClose();\n      return true;\n    }");
    expect(close).toContain("setAsking(true);");
    // A changed username is with the server: nothing leaves until it answers.
    expect(close).toContain("if (busy) return false;\n    if (!edit.dirty) {");
    expect(windowSrc).toContain("inert={asking || busy}");
    // X, the scrim and browser Back all take requestClose.
    expect(windowSrc).toContain("onClose={() => {\n        requestClose();\n      }}");
    expect(windowSrc).toContain('data-social-profile-edit-close=""');
    expect(windowSrc).toContain('variant="strip"');
    expect(entrySrc).toContain("const closed = requestRef.current ? requestRef.current() : true;");
    // Leaving the tab with changes: the browser's own prompt.
    expect(windowSrc).toContain("useSocialProfileEditLeaveGuard(edit.dirty)");
    expect(editSrc).toContain('window.addEventListener("beforeunload", onBeforeUnload)');
  });

  it("saves once without the save-hop cover, so the profile under the window never remounts", () => {
    const done = windowSrc.slice(windowSrc.indexOf("function done()"), windowSrc.indexOf("function discard()"));
    expect(done).toContain("leave: onClose");
    expect(done).toContain("stayOnPage: true");
    expect(done).toContain("onPersistFailed");
    expect(editSrc).toContain("applySocialProfileOptimistic(snapshot, { hop: !host.stayOnPage });");
    expect(windowSrc).toContain('event.key === "Enter" && (event.metaKey || event.ctrlKey)');
    expect(windowSrc).toContain("disabled={busy || edit.cropOpen}");
    expect(windowSrc).toContain("aria-busy={busy}");
  });

  it("merges the save into the cached row, puts it back on failure, and sends Bio only when changed", () => {
    const save = editSrc.slice(editSrc.indexOf("function save(host"), editSrc.indexOf("function discard()"));
    // The cover and welcome video keys stay: a merge, never a replace.
    expect(save).toContain("applyOptimisticSocialProfilePatch(queryClient, profileId, {");
    expect(save).not.toContain("applyOptimisticSocialProfile(queryClient");
    expect(save).toContain("const cached = queryClient && key ? queryClient.getQueryData(key) : undefined;");
    expect(save).toContain("queryClient.setQueryData(key, cached);");
    expect(save.match(/restoreCached\(\);/g)?.length).toBe(2);
    expect(save).toContain('if (!bioChanged) checked.form.delete("bio");');
  });

  it("holds while an earlier window's save is still with the server", () => {
    // Opened during a background save: Done waits and the body is inert, so a
    // failure reopens this window at the face with nothing typed lost.
    const waiting = render("edit", true);
    expect(waiting).toMatch(/<button[^>]*data-social-profile-edit-done=""[^>]*disabled=""[^>]*aria-busy="true"/);
    expect(waiting).toMatch(/<div[^>]*inert=""[^>]*aria-busy="true"/);
    const idle = render("edit");
    expect(idle).not.toMatch(/<button[^>]*data-social-profile-edit-done=""[^>]*disabled=""/);
    expect(idle).not.toContain('aria-busy="true"');
    expect(windowSrc).toContain("const busy = edit.pending || waiting;");
    const done = windowSrc.slice(windowSrc.indexOf("function done()"), windowSrc.indexOf("function discard()"));
    expect(done).toContain("if (busy) return;");
    expect(done).toContain("onPersisting,");
    // The hook hands the island the persist once it is out.
    const save = editSrc.slice(editSrc.indexOf("function save(host"), editSrc.indexOf("function discard()"));
    expect(save).toContain("const settled = persistSocialProfileEdit(checked.form)");
    expect(save).toContain("host.onPersisting?.(settled);");
  });

  it("focuses the first field when it opens straight on a face", () => {
    const focus = windowSrc.slice(windowSrc.indexOf("const firstFace = useRef(true);"), windowSrc.indexOf("const atIndex ="));
    expect(focus).toContain('if (opening && edit.face === "edit") return;');
    expect(focus).not.toContain("if (firstFace.current) {");
  });

  it("holds one height while open and keeps focus inside", () => {
    expect(windowSrc).toContain("setHeld(Math.ceil(frame.getBoundingClientRect().height))");
    expect(windowSrc).toContain("style={held === null ? undefined : { height: held }}");
    expect(windowSrc).toContain('if (event.key !== "Tab") return;');
    expect(windowSrc).toContain('document.body.style.overflow = "hidden"');
    expect(windowSrc).toContain('placement="inline"');
  });
});

describe("Edit profile pill (social-profile-edit-entry)", () => {
  it("links the phone to the sheet and gives the computer a window button", () => {
    const html = renderToStaticMarkup(<SocialProfileEditEntry />);
    expect(html).toContain('href="/social/profile/edit"');
    expect(html).toMatch(/<a[^>]*md:hidden/);
    expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"/);
    expect(html).toContain("max-md:hidden");
    expect(html.split(SOCIAL.profile.edit).length - 1).toBe(2);
    expect(html).not.toContain("data-social-profile-edit-window");
  });

  it("opens with a ?edit entry Next can see, and closes by popping or stripping it", () => {
    // The browser's own history calls, no __NA: Next keeps ?edit as its address.
    expect(entrySrc).toContain("const EDIT_ENTRY_STATE = { houseClient: true, socialProfileEdit: true } as const;");
    expect(entrySrc).toContain("window.history.pushState(\n    EDIT_ENTRY_STATE,");
    expect(entrySrc).toContain("window.history.replaceState(\n    EDIT_ENTRY_STATE,");
    expect(entrySrc).not.toContain("__NA");
    expect(entrySrc).not.toContain("navigateOwned");
    expect(entrySrc).toContain("window.history.back();");
    // ?edit is read whatever the width; only opening needs a computer.
    expect(entrySrc).toContain('const editFace = parseSocialProfileEditWindow(house?.search ?? "");');
    // Late callbacks only touch the window they belong to.
    expect(entrySrc).toContain("if (winRef.current?.key !== key) return;");
    expect(entrySrc).toContain("onClose={() => closeWindow(win.key)}");
    expect(entrySrc).toContain("router.replace(socialProfileEditWindowHref(face))");
  });

  it("always has the profile underneath a window, so Back reaches the ask", () => {
    // Arrived with the page (the Home prompt's Bio, a link, the old route):
    // the entry is rewritten as the profile, and the window's pushed on top.
    expect(entrySrc).toContain(
      "isHouseDesktop()) {\n        if (!isEditEntry()) installEditEntry(editFace);\n        open(editFace, true);",
    );
    const install = entrySrc.slice(entrySrc.indexOf("function installEditEntry("), entrySrc.indexOf("function addressHasEdit()"));
    // Next's own state rides the rewrite, so Next's address stays on ?edit.
    expect(install).toContain("{ ...(window.history.state as object | null), ...EDIT_ENTRY_STATE }");
    expect(install).toContain("socialProfileEditWindowClosedHref(");
    expect(install).toContain("pushEditEntry(face);");
    // Next leaving ?edit while the browser is still on it is not Back.
    const leaving = entrySrc.slice(entrySrc.indexOf("if (editFace === null && prev !== null)"));
    expect(leaving.indexOf("if (addressHasEdit()) return;")).toBeGreaterThan(-1);
    expect(leaving.indexOf("if (addressHasEdit()) return;")).toBeLessThan(leaving.indexOf("requestRef.current()"));
  });

  it("brings a failed save back into view, even over a window opened meanwhile", () => {
    const reopen = entrySrc.slice(
      entrySrc.indexOf("function reopenAfterFailure("),
      entrySrc.indexOf("function onPersisting("),
    );
    // A window opened meanwhile waited (nothing typed): it reopens at the face.
    expect(reopen).toContain("if (winRef.current) {\n      open(face, pushedRef.current);\n      return;\n    }");
    // No window: reopen with its own entry, so Back asks.
    expect(reopen).toContain("pushEditEntry(face);\n    open(face, true);");
    expect(reopen).toContain("if (!mountedRef.current) return;");
    expect(entrySrc).toContain("waiting={saving}");
    expect(entrySrc).toContain("onPersisting={onPersisting}");
    expect(entrySrc).toContain("setSaving(true);");
  });
});
