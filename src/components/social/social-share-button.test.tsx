import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialProfilePublicUrl } from "@/lib/social";
import { SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS } from "@/lib/social-chrome";
import { SocialShareButton } from "./social-share-button";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "social-share-button.tsx"), "utf8");

describe("SocialShareButton", () => {
  it("opens the share sheet from the labelled Share profile pill (Stage lock)", () => {
    const html = renderToStaticMarkup(<SocialShareButton handle="acarpcreate" />);
    expect(html).toContain("data-social-share");
    expect(html).toContain(`data-social-share-url="${socialProfilePublicUrl("acarpcreate")}"`);
    expect(html).toContain(`>${SOCIAL.profile.shareProfile}</button>`);
    expect(html).toContain(`class="${SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS}"`);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("data-social-share-sheet");
    expect(html).not.toContain("data-social-share-toast");
    expect(html).not.toContain("24frame.co/@acarpcreate</");
    expect(html).not.toContain("Copies ");
    // Hairline secondary pill, 44 tall; it stretches only inside the phone action row.
    const pill = SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS.split(" ");
    expect(pill).toEqual(expect.arrayContaining(["min-h-11", "rounded-full", "border", "border-hairline", "bg-surface", "text-ink"]));
    expect(pill).not.toContain("flex-1");
    expect(src).toContain("SocialShareSheet");
    expect(src).toContain("setOpen(true)");
    expect(src).toContain("{SOCIAL.profile.shareProfile}");
    expect(src).not.toContain("clipboard.writeText");
    expect(src).not.toContain("InlineNotice");
    expect(src).not.toContain("SOCIAL_SHARE_TOAST_CLASS");
  });
});
