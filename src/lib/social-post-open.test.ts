import { describe, expect, it } from "vitest";

import { socialPostOpenCloseHref } from "./social-post-open";

const origin = "https://24frame.test";
const post = `${origin}/social/p/p1`;

describe("social post open dismiss", () => {
  it("returns to the feed on a soft-nav intercept", () => {
    expect(
      socialPostOpenCloseHref({
        dismiss: "back",
        referrer: "",
        origin,
        href: post,
      }),
    ).toBe("back");
  });

  it("closes a hard load to the same-origin referrer path", () => {
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: `${origin}/social`,
        origin,
        href: post,
      }),
    ).toBe("/social");
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: `${origin}/social/u/ada?tab=posts#top`,
        origin,
        href: post,
      }),
    ).toBe("/social/u/ada?tab=posts#top");
  });

  it("closes a hard load to home when the referrer cannot leave this post", () => {
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: "https://elsewhere.test/social",
        origin,
        href: post,
      }),
    ).toBeNull();
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: null,
        origin,
        href: post,
      }),
    ).toBeNull();
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: post,
        origin,
        href: post,
      }),
    ).toBeNull();
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: `${post}#comments`,
        origin,
        href: post,
      }),
    ).toBeNull();
    expect(
      socialPostOpenCloseHref({
        dismiss: "home",
        referrer: "not a url",
        origin,
        href: post,
      }),
    ).toBeNull();
  });
});
