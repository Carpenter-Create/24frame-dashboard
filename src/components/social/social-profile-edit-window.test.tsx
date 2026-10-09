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
const shellSrc = readFileSync("src/components/chrome/house-window.tsx", "utf8");

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
    // The shell: busy, the host's layers, the ask, a face, then the window.
    const escape = shellSrc.slice(shellSrc.indexOf("function onEscape()"), shellSrc.indexOf("// Latest handlers"));
    const order = [
      "if (busy) return;",
      "if (escapeLayer?.()) return;",
      "if (asking)",
      "if (face !== indexFace)",
      "requestClose();",
    ].map((step) => escape.indexOf(step));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Edit's own layers: the photo menu, then the crop.
    const layers = windowSrc.slice(windowSrc.indexOf("escapeLayer: () => {"), windowSrc.indexOf("    requestRef,\n  });"));
    expect(layers.indexOf("if (edit.avatarSheet)")).toBeGreaterThan(-1);
    expect(layers.indexOf("if (edit.avatarSheet)")).toBeLessThan(layers.indexOf("if (edit.cropOpen)"));
    // A second Esc keeps editing; it never discards.
    expect(escape.slice(escape.indexOf("if (asking)"), escape.indexOf("if (face !== indexFace)"))).toContain(
      "keepEditing()",
    );
    expect(shellSrc).toContain(
      "function keepEditing() {\n    setAsking(false);\n    setLeave(null);\n    restoreFocus(`[data-${attr}-close]`);\n  }",
    );
    expect(escape).not.toContain("discard(");
    // An open house menu inside the window closes itself first.
    expect(shellSrc).toContain(
      'if (event.key === "Escape") {\n        // An open house menu inside the window closes itself first.\n        if (frameRef.current?.querySelector("[data-house-form-select-menu]")) return;\n        event.preventDefault();',
    );
    // Closing the menu puts focus back on Edit picture.
    expect(windowSrc).toContain('win.restoreFocus("[data-social-profile-edit-picture]")');
  });

  it("asks before leaving with changes, inside the window, and closes at once when clean", () => {
    const close = shellSrc.slice(shellSrc.indexOf("function requestClose()"), shellSrc.indexOf("function done()"));
    expect(close).toContain("if (!dirty) {\n      onClose();\n      return true;\n    }");
    expect(close).toContain("setAsking(true);");
    // A changed username is with the server: nothing leaves until it answers.
    expect(close).toContain("if (holdOpen) return false;\n    if (!dirty) {");
    expect(windowSrc).toContain("dirty: edit.dirty,");
    expect(shellSrc).toContain("inert={win.asking || win.busy}");
    // X, the scrim and browser Back all take requestClose.
    expect(shellSrc).toContain("onClose={() => {\n        win.requestClose();\n      }}");
    expect(shellSrc).toContain("[`data-${a}-close`]");
    expect(windowSrc).toContain('variant="strip"');
    expect(shellSrc).toContain("const closed = requestRef.current ? requestRef.current() : true;");
    // Leaving the tab with changes: the browser's own prompt.
    expect(shellSrc).toContain("useHouseLeaveGuard(dirty);");
    expect(shellSrc).toContain('window.addEventListener("beforeunload", onBeforeUnload)');
    expect(editSrc).toContain("export const useSocialProfileEditLeaveGuard = useHouseLeaveGuard;");
  });

  it("saves once without the save-hop cover, so the profile under the window never remounts", () => {
    const done = windowSrc.slice(windowSrc.indexOf("onDone: () =>"), windowSrc.indexOf("onBack: edit.backToIndex"));
    expect(done).toContain("leave: onClose");
    expect(done).toContain("stayOnPage: true");
    expect(done).toContain("onPersistFailed");
    expect(editSrc).toContain("applySocialProfileOptimistic(snapshot, { hop: !host.stayOnPage });");
    expect(shellSrc).toContain('event.key === "Enter" && (event.metaKey || event.ctrlKey)');
    expect(shellSrc).toContain("disabled={win.holdOpen || doneDisabled}");
    expect(windowSrc).toContain("doneDisabled={edit.cropOpen}");
    expect(shellSrc).toContain("aria-busy={win.busy}");
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
    const done = shellSrc.slice(shellSrc.indexOf("function done()"), shellSrc.indexOf("function discard()"));
    expect(done).toContain("if (holdOpen) return;");
    const onDone = windowSrc.slice(windowSrc.indexOf("onDone: () =>"), windowSrc.indexOf("onBack: edit.backToIndex"));
    expect(onDone).toContain("onPersisting,");
    // The hook hands the island the persist once it is out.
    const save = editSrc.slice(editSrc.indexOf("function save(host"), editSrc.indexOf("function discard()"));
    expect(save).toContain("const settled = persistSocialProfileEdit(checked.form)");
    expect(save).toContain("host.onPersisting?.(settled);");
  });

  it("focuses the first field when it opens straight on a face", () => {
    const focus = shellSrc.slice(
      shellSrc.indexOf("const firstFace = useRef(true);"),
      shellSrc.indexOf("const state: HouseWindowState"),
    );
    expect(focus).toContain("if (opening && face === indexFace) return;");
    expect(focus).not.toContain("if (firstFace.current) {");
  });

  it("holds one height while open and keeps focus inside", () => {
    // Measured only while shown, and never as 0 (a window reopened below md
    // is hidden until it shows at md+).
    const held = shellSrc.slice(shellSrc.indexOf("// One still frame"), shellSrc.indexOf("// A pushed face focuses"));
    expect(held).toContain("if (!frame || held !== null || !desktop) return;");
    expect(held).toContain("if (height > 0) setHeld(height);");
    expect(held).toContain("}, [held, desktop]);");
    expect(shellSrc).toContain("style={win.held === null ? undefined : { height: win.held }}");
    expect(shellSrc).toContain('if (event.key !== "Tab") return;');
    expect(shellSrc).toContain('document.body.style.overflow = "hidden"');
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
    expect(entrySrc).toContain('const EDIT_ENTRY_FLAG = "socialProfileEdit";');
    expect(entrySrc).toContain("flag: EDIT_ENTRY_FLAG,");
    expect(entrySrc).toContain("window.history.pushState(\n    { houseClient: true, [EDIT_ENTRY_FLAG]: true },");
    expect(shellSrc).toContain("window.history.pushState(\n      { houseClient: true, [flag]: true },");
    // The page without ?edit carries no window flags (stripped or underneath).
    const strip = shellSrc.slice(shellSrc.indexOf("const strip = () => {"), shellSrc.indexOf("const install = (face: F)"));
    expect(strip).toContain('window.history.replaceState({}, "",');
    expect(strip).not.toContain("[flag]");
    for (const source of [entrySrc, shellSrc]) {
      expect(source).not.toContain("__NA");
      expect(source).not.toContain("navigateOwned");
    }
    expect(shellSrc).toContain("window.history.back();");
    // ?edit is read whatever the width; only opening needs a computer.
    expect(shellSrc).toContain('const addressFace = parse(house?.search ?? "");');
    expect(entrySrc).toContain("opensOnArrival: isHouseDesktop,");
    // Late callbacks only touch the window they belong to.
    expect(shellSrc).toContain("if (winRef.current?.key !== key) return;");
    expect(entrySrc).toContain("onClose={() => entry.close(win.key)}");
    expect(entrySrc).toContain("router.replace(socialProfileEditWindowHref(face))");
  });

  it("always has the profile underneath a window, so Back reaches the ask", () => {
    // Arrived with the page (the Home prompt's Bio, a link, the old route):
    // the entry is rewritten as the profile, and the window's pushed on top.
    expect(shellSrc).toContain(
      "opensOnArrival()) {\n        if (!isOwnEntry()) install(addressFace);\n        open(addressFace, true);",
    );
    const install = shellSrc.slice(shellSrc.indexOf("const install = (face: F)"), shellSrc.indexOf("const addressHasWindow"));
    // Next's own state rides the rewrite as it is, so Next's address stays on
    // ?edit, and the entry underneath is never taken for a window entry.
    expect(install).toContain('window.history.replaceState(window.history.state, "", closedHref(');
    expect(install).not.toContain("[flag]");
    expect(install).toContain("push(face);");
    expect(entrySrc).toContain("closedHref: socialProfileEditWindowClosedHref,");
    // Next leaving ?edit while the browser is still on it is not Back.
    const leaving = shellSrc.slice(shellSrc.indexOf("if (addressFace === null && prev !== null)"));
    expect(leaving.indexOf("if (addressHasWindow()) return;")).toBeGreaterThan(-1);
    expect(leaving.indexOf("if (addressHasWindow()) return;")).toBeLessThan(leaving.indexOf("requestRef.current()"));
  });

  it("brings a failed save back into view, even over a window opened meanwhile", () => {
    const reopen = shellSrc.slice(
      shellSrc.indexOf("function reopenAfterFailure("),
      shellSrc.indexOf("function onPersisting("),
    );
    // A window opened meanwhile waited (nothing typed): it reopens at the face.
    expect(reopen).toContain("if (winRef.current) {\n      open(face, pushedRef.current);\n      return;\n    }");
    // No window: reopen with its own entry, so Back asks.
    expect(reopen).toContain("push(face);\n    open(face, true);");
    expect(reopen).toContain("if (!mountedRef.current) return;");
    expect(entrySrc).toContain("waiting={entry.saving}");
    expect(entrySrc).toContain("onPersisting={entry.onPersisting}");
    expect(entrySrc).toContain("onPersistFailed={entry.reopenAfterFailure}");
    expect(shellSrc).toContain("setSaving(true);");
  });

  it("leaves for the camera only through the ask when there are changes", () => {
    expect(windowSrc).toContain("onLeave={askLeave}");
    // Discard drops the draft first, then goes where the ask was for.
    const discard = shellSrc.slice(shellSrc.indexOf("function discard()"), shellSrc.indexOf("function keepEditing()"));
    expect(discard).toContain("onDiscard();");
    expect(discard).toContain("const go = leave?.go;");
    expect(discard.indexOf("onDiscard();")).toBeLessThan(discard.indexOf("go();"));
    expect(windowSrc).toContain("onDiscard: edit.discard,");
    // The camera remembers Edit's index, never a face.
    const leave = windowSrc.slice(windowSrc.indexOf("function askLeave("), windowSrc.indexOf("return ("));
    expect(leave).toContain("win.ask(() => {");
    expect(leave).toContain(
      "rememberSocialGoLiveOpener(socialProfileEditIndexHref(window.location.pathname, window.location.search));",
    );
    expect(leave.indexOf("rememberSocialGoLiveOpener(")).toBeLessThan(leave.indexOf("router.push(href)"));
    // Never while the server has the save; Keep editing returns focus to Live.
    const ask = shellSrc.slice(shellSrc.indexOf("function ask(go"), shellSrc.indexOf("function onEscape()"));
    expect(ask).toContain("if (holdOpen) return;");
    expect(ask).toContain("rememberFocus();");
  });

  it("waits for an upload, keeps focus inside, and chooses it after the ask closes (review fixes)", () => {
    // A picture or video still uploading: X, Esc, the scrim, Back and Done wait.
    expect(windowSrc).toContain("const holdOpen = busy || edit.uploading;");
    const options = windowSrc.slice(windowSrc.indexOf("useHouseWindow({"), windowSrc.indexOf("onDone: () =>"));
    expect(options).toContain("    busy,\n    holdOpen,\n");
    // Only an element inside the window is remembered (a scrim click is not).
    const remember = shellSrc.slice(shellSrc.indexOf("function rememberFocus()"), shellSrc.indexOf("function restoreFocus("));
    expect(remember).toContain("frameRef.current?.contains(active) ? active : null;");
    // The target is chosen after React commits (the ask's inert is gone then).
    const restore = shellSrc.slice(shellSrc.indexOf("function restoreFocus("), shellSrc.indexOf("function requestClose()"));
    expect(restore.indexOf("window.requestAnimationFrame(() => {")).toBeGreaterThan(-1);
    expect(restore.indexOf("window.requestAnimationFrame(() => {")).toBeLessThan(restore.indexOf('saved.closest("[inert]")'));
  });

  it("opens Topics through Edit's own entry, not the shell's", () => {
    // The shell's click owner skips a house link, so the link's handler runs
    // and writes an entry Next can see.
    const topics = entrySrc.slice(entrySrc.indexOf("export function SocialProfileEditTopicsLink"));
    expect(topics).toContain('data-house-link=""');
    expect(topics).toContain('pushEditEntry("topics");');
    // A shell entry is not taken for one the window pushed: only its own flag.
    expect(shellSrc).toContain(
      "const isOwnEntry = () => (window.history.state as Record<string, unknown> | null)?.[flag] === true;",
    );
  });
});
