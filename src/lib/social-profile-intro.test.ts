import { describe, expect, it } from "vitest";

import { socialProfileIntro } from "./social-profile-intro";

describe("socialProfileIntro — Stage headline and tagline from the bio", () => {
  it("makes the first line the headline and the rest the tagline", () => {
    expect(socialProfileIntro("Founder · Investor · Music Executive\nBuilding For the Generations®")).toEqual({
      headline: "Founder · Investor · Music Executive",
      tagline: "Building For the Generations®",
    });
    // Further lines stay in the tagline with their soft newlines.
    expect(socialProfileIntro("Line one\r\nLine two\nLine three")).toEqual({
      headline: "Line one",
      tagline: "Line two\nLine three",
    });
  });

  it("keeps a one-line bio as a headline alone, trimmed", () => {
    expect(socialProfileIntro("  Writes engines.  ")).toEqual({ headline: "Writes engines.", tagline: null });
    expect(socialProfileIntro("Writes engines.\n   \n")).toEqual({ headline: "Writes engines.", tagline: null });
  });

  it("shows the owner's empty-bio hint as the muted tagline, and nothing for visitors", () => {
    expect(socialProfileIntro("", "Your public face. Edit anytime.")).toEqual({
      headline: null,
      tagline: "Your public face. Edit anytime.",
    });
    expect(socialProfileIntro("   ", "  ")).toEqual({ headline: null, tagline: null });
    expect(socialProfileIntro(null)).toEqual({ headline: null, tagline: null });
    expect(socialProfileIntro(undefined, null)).toEqual({ headline: null, tagline: null });
    // A real bio always wins over the hint.
    expect(socialProfileIntro("Writes engines.", "hint")).toEqual({ headline: "Writes engines.", tagline: null });
  });
});
