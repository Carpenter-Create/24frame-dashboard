import { afterEach, describe, expect, it } from "vitest";

import { SOCIAL_ROUTES } from "@/lib/social";

import {
  rememberSocialGoLiveOpener,
  resetSocialGoLiveOpenerForTests,
  takeSocialGoLiveExitHref,
} from "./social-go-live-nav";

afterEach(() => {
  resetSocialGoLiveOpenerForTests();
});

describe("Go live exit", () => {
  it("returns to the page that opened the camera", () => {
    rememberSocialGoLiveOpener("/social/profile");
    expect(takeSocialGoLiveExitHref()).toBe("/social/profile");
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);
  });

  it("keeps the opener query so a filtered Explore restores", () => {
    rememberSocialGoLiveOpener("/social/explore?tag=music");
    expect(takeSocialGoLiveExitHref()).toBe("/social/explore?tag=music");
  });

  it("refuses write compose, the camera, and an off-app href", () => {
    rememberSocialGoLiveOpener("/social/create");
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);

    rememberSocialGoLiveOpener("/social/create?kind=text");
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);

    rememberSocialGoLiveOpener(SOCIAL_ROUTES.createLive);
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);

    rememberSocialGoLiveOpener("//evil.example/social");
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);

    rememberSocialGoLiveOpener("https://evil.example/social");
    expect(takeSocialGoLiveExitHref()).toBe(SOCIAL_ROUTES.home);
  });
});
