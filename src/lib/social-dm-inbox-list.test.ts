import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { socialDmInboxMatchesQuery, socialDmInboxTitle } from "@/lib/social-dm-inbox-list";

describe("social DM inbox list", () => {
  it("shows the viewer handle and no title word when the handle is absent", () => {
    expect(socialDmInboxTitle("acarpcreate")).toBe("acarpcreate");
    expect(socialDmInboxTitle("@Ada")).toBe("Ada");
    expect(socialDmInboxTitle("Messages")).toBe("Messages");
    expect(socialDmInboxTitle("@")).toBe("");
    expect(socialDmInboxTitle("  ")).toBe("");
    expect(socialDmInboxTitle("")).toBe("");
    expect(socialDmInboxTitle(null)).toBe("");
    expect(socialDmInboxTitle(undefined)).toBe("");
    expect(socialDmInboxTitle(null)).not.toBe(SOCIAL.dms.title);
    expect(socialDmInboxTitle(undefined)).not.toBe("Messages");

    const src = readFileSync("src/lib/social-dm-inbox-list.ts", "utf8");
    const fn = src.slice(
      src.indexOf("export function socialDmInboxTitle"),
      src.indexOf("export function socialDmInboxMatchesQuery"),
    );
    expect(fn).not.toContain("Messages");
    expect(fn).not.toContain("SOCIAL.dms.title");
    expect(fn).not.toContain("startCta");
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