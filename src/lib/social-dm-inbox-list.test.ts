import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { socialDmInboxMatchesQuery, socialDmInboxTitle } from "@/lib/social-dm-inbox-list";

describe("social DM inbox list", () => {
  it("prefers the viewer handle and falls back to Messages", () => {
    expect(socialDmInboxTitle("acarpcreate")).toBe("acarpcreate");
    expect(socialDmInboxTitle("@Ada")).toBe("Ada");
    expect(socialDmInboxTitle("  ")).toBe(SOCIAL.dms.title);
    expect(socialDmInboxTitle(null)).toBe(SOCIAL.dms.title);
  });

  it("filters loaded rows by name or preview", () => {
    const bob = { label: "Bob One", excerpt: "Sent you a story" };
    const carol = { label: "Carol One", excerpt: null };
    expect(socialDmInboxMatchesQuery("", bob)).toBe(true);
    expect(socialDmInboxMatchesQuery("   ", carol)).toBe(true);
    expect(socialDmInboxMatchesQuery("bob", bob)).toBe(true);
    expect(socialDmInboxMatchesQuery("STORY", bob)).toBe(true);
    expect(socialDmInboxMatchesQuery("carol", bob)).toBe(false);
    expect(socialDmInboxMatchesQuery("carol", carol)).toBe(true);
  });
});