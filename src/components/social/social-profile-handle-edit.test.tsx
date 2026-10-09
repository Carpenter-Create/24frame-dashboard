import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { SocialProfileHandleEditor } from "./social-profile-handle-edit";

describe("SocialProfileHandleEditor", () => {
  it("keeps the bare handle field on the Username face, not the index pill", () => {
    const html = renderToStaticMarkup(
      <SocialProfileHandleEditor
        value="ada"
        onChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-handle");
    expect(html).toContain(SOCIAL.profile.username);
    expect(html).toContain("data-social-profile-edit-handle");
    expect(html).toContain("data-social-handle-field");
    expect(html).toContain("data-social-handle-prefix");
    expect(html).toContain('id="social-edit-handle"');
    expect(html).toContain('value="ada"');
    expect(html).not.toContain('value="@ada"');
    expect(html).not.toContain("data-social-handle-url");
    expect(html).not.toContain("https://24frame.co/@ada");
    // One draft: the face writes through; Edit's one Done saves it.
    expect(html).not.toContain("data-social-profile-handle-done");
    expect(html).not.toMatch(/id="social-edit-handle"[^>]*t-body-sm/);
  });
});
