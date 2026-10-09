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

function render(initialFace?: "edit" | "name" | "topics") {
  return renderToStaticMarkup(
    <SocialProfileEditWindow
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
      "setAsking(false)",
    );
    expect(escape).not.toContain("discard(");
    expect(windowSrc).toContain('if (event.key === "Escape") {\n        event.preventDefault();');
  });

  it("asks before leaving with changes, inside the window, and closes at once when clean", () => {
    const close = windowSrc.slice(windowSrc.indexOf("function requestClose()"), windowSrc.indexOf("function done()"));
    expect(close).toContain("if (!edit.dirty) {\n      onClose();\n      return true;\n    }");
    expect(close).toContain("setAsking(true);");
    // X, the scrim and browser Back all take requestClose.
    expect(windowSrc).toContain("onClose={() => {\n        requestClose();\n      }}");
    expect(windowSrc).toContain('data-social-profile-edit-close=""');
    expect(windowSrc).toContain('variant="strip"');
    expect(windowSrc).toContain("inert={asking}");
    expect(entrySrc).toContain("const closed = requestRef.current ? requestRef.current() : true;");
    // Leaving the tab with changes: the browser's own prompt.
    expect(windowSrc).toContain("useSocialProfileEditLeaveGuard(edit.dirty)");
    expect(editSrc).toContain('window.addEventListener("beforeunload", onBeforeUnload)');
  });

  it("saves once: paint the profile behind, release the hop, close; ⌘/Ctrl+Enter is Done", () => {
    const done = windowSrc.slice(windowSrc.indexOf("function done()"), windowSrc.indexOf("function discard()"));
    expect(done).toContain("leave: onClose");
    expect(done).toContain("afterPaint: releaseSocialProfileSaveHop");
    expect(done).toContain("onPersistFailed");
    expect(windowSrc).toContain('event.key === "Enter" && (event.metaKey || event.ctrlKey)');
    expect(windowSrc).toContain("disabled={edit.pending || edit.cropOpen}");
    expect(windowSrc).toContain("aria-busy={edit.pending}");
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

  it("opens by a panel hop to ?edit and closes by popping or stripping it", () => {
    expect(entrySrc).toContain("house?.navigateOwned(socialProfileEditWindowOpenHref(at.pathname, at.search))");
    expect(entrySrc).toContain("window.history.back();");
    expect(entrySrc).toContain("socialProfileEditWindowClosedHref(window.location.pathname, window.location.search)");
    expect(entrySrc).toContain("onPersistFailed={(face) => open(face, false)}");
    expect(entrySrc).toContain("router.replace(socialProfileEditWindowHref(face))");
  });
});
