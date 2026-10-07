import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import { housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { SOCIAL, socialMemberHref } from "@/lib/social";
import {
  SOCIAL_PERSON_NAME_CLASS,
  SOCIAL_PERSON_SECONDARY_CLASS,
  SOCIAL_STORY_ACTIVITY_NAME_CLASS,
} from "@/lib/social-chrome";
import { SocialStoryActivitySheet } from "./social-story-activity-sheet";

const LONG_NAME = "Maximilian Alexander Featherstonehaugh-Smythe";
const LONG_HANDLE = "maximilian_featherstonehaugh"; // within HANDLE_MAX (30)

const viewers = [
  { id: "v-long", name: LONG_NAME, handle: LONG_HANDLE, photoUrl: null },
  { id: "v-short", name: "Ada", handle: "ada", photoUrl: null },
];

function render(open: boolean, list: typeof viewers = viewers) {
  return renderToStaticMarkup(
    createElement(SocialStoryActivitySheet, {
      storyId: "s1",
      open,
      onClose: () => {},
      viewers: list,
    }),
  );
}

describe("Story activity sheet: phone never-truncate (house gospel 2026-09-19)", () => {
  it("pins the viewer name and handle classes to the house person wrap", () => {
    expect(SOCIAL_STORY_ACTIVITY_NAME_CLASS).toBe(`${SOCIAL_PERSON_NAME_CLASS} t-body text-ink`);
    expect(SOCIAL_STORY_ACTIVITY_NAME_CLASS).toBe(
      "block min-w-0 max-w-full whitespace-normal break-words t-body text-ink",
    );
    expect(SOCIAL_PERSON_SECONDARY_CLASS).toBe(
      "block min-w-0 max-w-full whitespace-normal break-words t-body-sm text-ink-2",
    );
    expect(housePhoneForbidsTruncate(SOCIAL_STORY_ACTIVITY_NAME_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PERSON_SECONDARY_CLASS)).toBe(true);
    // Composed from the person-name primitive, not a hand-typed copy of its value.
    expect(readFileSync("src/lib/social-chrome.ts", "utf8")).toContain(
      `SOCIAL_STORY_ACTIVITY_NAME_CLASS = \`\${SOCIAL_PERSON_NAME_CLASS}`,
    );
  });

  it("renders long and short viewers in the phone sheet with wrapping names and handles", () => {
    const html = render(true);
    expect(html).toContain(APP_SHEET_HOST_CLASS);
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain(SOCIAL.stories.activity);
    for (const viewer of viewers) {
      expect(html).toContain(`data-social-story-activity-row="${viewer.id}"`);
      expect(html).toContain(`href="${socialMemberHref(viewer.handle)}"`);
      expect(html).toContain(`class="${SOCIAL_STORY_ACTIVITY_NAME_CLASS}">${viewer.name}<`);
      expect(html).toContain(`class="${SOCIAL_PERSON_SECONDARY_CLASS}">@${viewer.handle}<`);
    }
    expect(housePhoneForbidsTruncate(html)).toBe(true);
  });

  it("keeps the sheet source free of a one-line cut", () => {
    const src = readFileSync("src/components/social/social-story-activity-sheet.tsx", "utf8");
    expect(housePhoneForbidsTruncate(src)).toBe(true);
    expect(src).toContain("className={SOCIAL_STORY_ACTIVITY_NAME_CLASS}");
    expect(src).toContain("className={SOCIAL_PERSON_SECONDARY_CLASS}");
  });

  it("renders nothing when closed and the empty line when nobody viewed", () => {
    expect(render(false)).toBe("");
    const empty = render(true, []);
    expect(empty).toContain("data-social-story-activity-empty");
    expect(empty).toContain(SOCIAL.stories.activityEmpty);
    expect(empty).not.toContain("data-social-story-activity-row");
  });
});
