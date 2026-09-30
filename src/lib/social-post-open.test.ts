import { describe, expect, it } from "vitest";

import { socialPostOpenShouldGoBack } from "./social-post-open";

describe("social post open dismiss", () => {
  it("returns to the feed on a soft-nav intercept", () => {
    expect(
      socialPostOpenShouldGoBack({
        dismiss: "back",
        referrer: "",
        origin: "https://24frame.test",
      }),
    ).toBe(true);
  });

  it("uses a same-origin referrer on a hard load", () => {
    expect(
      socialPostOpenShouldGoBack({
        dismiss: "home",
        referrer: "https://24frame.test/social",
        origin: "https://24frame.test",
      }),
    ).toBe(true);
    expect(
      socialPostOpenShouldGoBack({
        dismiss: "home",
        referrer: "https://elsewhere.test/social",
        origin: "https://24frame.test",
      }),
    ).toBe(false);
    expect(
      socialPostOpenShouldGoBack({
        dismiss: "home",
        referrer: null,
        origin: "https://24frame.test",
      }),
    ).toBe(false);
  });
});
