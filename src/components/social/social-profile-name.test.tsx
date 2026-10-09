import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SETTINGS_DIALOG_LABEL_CLASS } from "@/lib/settings";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_PROFILE_EDIT_LABEL_CLASS } from "@/lib/social-chrome";
import { SocialProfileEditFaceHostProvider } from "./social-profile-edit-face";
import { SocialProfileNameEditor } from "./social-profile-name";

describe("SocialProfileNameEditor", () => {
  it("renders First / Middle / Last on the Name face; Done is Edit's one save, not the face's", () => {
    const html = renderToStaticMarkup(
      <SocialProfileNameEditor
        firstName="Ada"
        middleName=""
        lastName="Lovelace"
        onChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-name");
    expect(html).toContain(SOCIAL.profile.name);
    expect(html).toContain("data-social-profile-edit-names");
    expect(html).toContain(SOCIAL.profile.firstName);
    expect(html).toContain(SOCIAL.profile.middleName);
    expect(html).toContain(SOCIAL.profile.lastName);
    expect(html).toContain('id="social-edit-first-name"');
    expect(html).toContain('id="social-edit-middle-name"');
    expect(html).toContain('id="social-edit-last-name"');
    expect(html).toContain('value="Ada"');
    expect(html).toContain('value="Lovelace"');
    expect(html).not.toContain('id="social-edit-name"');
    // One draft (social-profile-edit-window-lock-v1): no face-level save.
    expect(html).not.toContain("data-social-profile-name-done");
    expect(html).toContain(SOCIAL_PROFILE_EDIT_LABEL_CLASS);
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).toContain(SETTINGS_DIALOG_LABEL_CLASS);
    expect(html).toContain("flex-col");
    expect(html).toContain("t-control");
    expect(html).not.toMatch(/id="social-edit-first-name"[^>]*t-body-sm/);
    expect(html).not.toContain("truncate");
  });

  it("splits a three-part name into First / Middle / Last on the face", () => {
    const html = renderToStaticMarkup(
      <SocialProfileNameEditor
        firstName="Adam"
        middleName="James"
        lastName="Carpenter"
        onChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain('value="Adam"');
    expect(html).toContain('value="James"');
    expect(html).toContain('value="Carpenter"');
  });

  it("draws back · Name · Done on the phone sheet, where Done is the one save", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditFaceHostProvider
        value={{ kind: "sheet", error: SOCIAL.profile.firstNameRequired, pending: false, onDone: () => undefined }}
      >
        <SocialProfileNameEditor
          firstName=""
          middleName=""
          lastName="Lovelace"
          onChange={() => undefined}
          onBack={() => undefined}
        />
      </SocialProfileEditFaceHostProvider>,
    );
    expect(html).toContain("data-social-profile-name-back");
    expect(html).toContain("data-social-profile-edit-face-done");
    expect(html).toContain(SOCIAL.profile.done);
    expect(html).toContain(SOCIAL.profile.firstNameRequired);
  });

  it("is the body only inside the desktop window (the window owns the header)", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditFaceHostProvider value={{ kind: "window", error: "" }}>
        <SocialProfileNameEditor
          firstName="Ada"
          middleName=""
          lastName="Lovelace"
          onChange={() => undefined}
          onBack={() => undefined}
        />
      </SocialProfileEditFaceHostProvider>,
    );
    expect(html).toContain("data-social-profile-name");
    expect(html).toContain('value="Ada"');
    expect(html).not.toContain("data-social-profile-name-header");
    expect(html).not.toContain("data-social-profile-name-back");
    expect(html).not.toContain("data-social-profile-edit-face-done");
    expect(html).not.toContain('data-house-overlay-host="app-sheet"');
  });
});
