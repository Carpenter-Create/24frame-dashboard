import { describe, expect, it } from "vitest";

import {
  SOCIAL_STORY_HOLD_TAP_MS,
  SOCIAL_STORY_SWIPE_PX,
  storyHoldRelease,
  storyTrayStep,
  type SocialStoryTrayAuthor,
} from "@/lib/social-story-tray";

function author(id: string, items: string[]): SocialStoryTrayAuthor {
  return {
    authorId: id,
    authorName: id,
    authorPhotoUrl: null,
    unseen: false,
    coverUrl: null,
    coverKind: null,
    items: items.map((item) => ({ id: item, createdAt: item, body: null, media: [] })),
  };
}

const tray = [author("a", ["a1", "a2"]), author("b", ["b1"])];

describe("story tray", () => {
  it("advances within the author, then to the next author, then closes", () => {
    expect(storyTrayStep(tray, { author: 0, item: 0 }, "next")).toEqual({ author: 0, item: 1 });
    expect(storyTrayStep(tray, { author: 0, item: 1 }, "next")).toEqual({ author: 1, item: 0 });
    expect(storyTrayStep(tray, { author: 1, item: 0 }, "next")).toBe("close");
  });

  it("steps back to the previous author's last item", () => {
    expect(storyTrayStep(tray, { author: 1, item: 0 }, "prev")).toEqual({ author: 0, item: 1 });
    expect(storyTrayStep(tray, { author: 0, item: 0 }, "prev")).toBeNull();
  });

  it("treats a hold release as resume and a left-third tap as prev", () => {
    expect(
      storyHoldRelease({
        elapsedMs: SOCIAL_STORY_HOLD_TAP_MS,
        dx: 0,
        dy: 0,
        width: 300,
        x: 200,
      }),
    ).toBe("resume");
    expect(
      storyHoldRelease({ elapsedMs: 40, dx: 0, dy: 0, width: 300, x: 40 }),
    ).toBe("prev");
    expect(
      storyHoldRelease({ elapsedMs: 40, dx: 0, dy: 0, width: 300, x: 200 }),
    ).toBe("next");
    expect(
      storyHoldRelease({
        elapsedMs: 40,
        dx: -SOCIAL_STORY_SWIPE_PX,
        dy: 4,
        width: 300,
        x: 20,
      }),
    ).toBe("next");
  });
});
