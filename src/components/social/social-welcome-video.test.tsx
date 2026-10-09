import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL_WELCOME_VIDEO_CLASS } from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";
import { SocialWelcomeVideo } from "./social-welcome-video";

describe("SocialWelcomeVideo", () => {
  it("renders a closed face when a welcome video is present", () => {
    const html = renderToStaticMarkup(<SocialWelcomeVideo present />);
    expect(html).toContain("data-social-welcome-video");
    expect(html).toContain("data-social-video-closed");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("mux-player");
    expect(html).not.toContain("src=");
    expect(html).toContain(SOCIAL_WELCOME_VIDEO_CLASS);
    expect(SOCIAL_WELCOME_VIDEO_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(renderToStaticMarkup(<SocialWelcomeVideo present={false} />)).toBe("");
  });

  it("shows the locked welcome hold to the owner", () => {
    const html = renderToStaticMarkup(<SocialWelcomeVideo present notice="welcomePending" />);
    expect(html).toContain(SOCIAL.music.welcomePending);
    expect(html).toContain("data-social-welcome-music");
    expect(renderToStaticMarkup(<SocialWelcomeVideo present={false} notice="welcomePending" />)).toBe("");
  });
});
