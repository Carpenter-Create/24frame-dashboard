import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  parseSocialCategoryParam,
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_LABELS,
  SOCIAL_CATEGORY_TOPICS,
  sortByLabelAlpha,
  sortTopicsAlpha,
} from "./social-categories";

describe("locked Social Home categories", () => {
  it("keeps Adam's exact labels in locale-aware A-Z order", () => {
    expect([...SOCIAL_CATEGORY_TOPICS]).toEqual(sortTopicsAlpha(SOCIAL_CATEGORY_TOPICS));
    expect(SOCIAL_CATEGORY_LABELS).toEqual([
      "All",
      "Acting",
      "AI filmmaking",
      "Animation",
      "Casting",
      "Cinematography",
      "Content creator",
      "Directors",
      "Distribution",
      "Film Festivals",
      "Financing",
      "Music",
      "Post-production",
      "Producers",
      "Screenwriting",
      "Vertical micro dramas",
    ]);
    expect(sortTopicsAlpha(["Music", "acting", "AI filmmaking"])).toEqual([
      "acting",
      "AI filmmaking",
      "Music",
    ]);
    expect(sortByLabelAlpha(["Music", "acting", "AI filmmaking"], (label) => label)).toEqual(
      sortTopicsAlpha(["Music", "acting", "AI filmmaking"]),
    );
    expect(SOCIAL_CATEGORY_TOPICS).not.toContain("Cinematographers");
    expect(SOCIAL_CATEGORY_TOPICS).not.toContain("Composers");
    expect(SOCIAL_CATEGORY_TOPICS).toHaveLength(15);
  });

  it("treats All and unknown values as reset", () => {
    expect(parseSocialCategoryParam(undefined)).toBe(SOCIAL_CATEGORY_ALL);
    expect(parseSocialCategoryParam("all")).toBe(SOCIAL_CATEGORY_ALL);
    expect(parseSocialCategoryParam("Cinematography")).toBe("Cinematography");
    expect(parseSocialCategoryParam("cinematography")).toBe("Cinematography");
    expect(parseSocialCategoryParam("Music")).toBe("Music");
    expect(parseSocialCategoryParam("Cousins")).toBe(SOCIAL_CATEGORY_ALL);
  });

  it("does not keep a lane-blind Home topic href", () => {
    const src = readFileSync("src/lib/social-categories.ts", "utf8");
    expect(src).not.toContain("socialHomeLensHref");
  });
});
