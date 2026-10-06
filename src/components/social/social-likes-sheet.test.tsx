import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { APP_SHEET_HOST_CLASS, APP_SHEET_SCRIM_CLASS } from "@/lib/house-sheet";
import { displayHandle, SOCIAL } from "@/lib/social";
import { SOCIAL_POST_TIME_CLASS } from "@/lib/social-chrome";
import { SocialLikesSheet } from "./social-likes-sheet";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "social-likes-sheet.tsx"), "utf8");
const countSrc = readFileSync(join(here, "social-engagement.tsx"), "utf8");

describe("SocialLikesSheet", () => {
  it("uses house app-sheet chrome and a calm empty", () => {
    const html = renderToStaticMarkup(
      <SocialLikesSheet postId="p1" open onClose={() => undefined} />,
    );
    expect(html).toContain("data-social-likes-sheet");
    expect(html).toContain(APP_SHEET_HOST_CLASS);
    expect(html).toContain(APP_SHEET_SCRIM_CLASS);
    expect(html).toContain(SOCIAL.post.likesTitle);
    expect(html).toContain(SOCIAL.create.close);
    expect(html).toContain("data-social-likes-list");
    expect(src).toContain("createPortal");
    expect(src).toContain("Escape");
    expect(src).toContain("AppSheetSurface");
    expect(src).toContain("AppSheetHead");
    expect(src).toContain("Close44");
    expect(src).toContain("/api/social/likes");
    expect(src).toContain("displayHandle");
    expect(src).toContain(displayHandle("maya") && "break-words");
    expect(src).not.toContain("t-label");
    expect(src).not.toMatch(/(?:^|[^a-z])truncate(?:[^a-z]|$)/);
  });

  it("renders nothing when closed", () => {
    expect(
      renderToStaticMarkup(<SocialLikesSheet postId="p1" open={false} onClose={() => undefined} />),
    ).toBe("");
  });

  it("opens from the likes count control", () => {
    const count = countSrc.slice(countSrc.indexOf("export function SocialLikeCount"));
    expect(count).toContain("data-social-like-count");
    expect(count).toContain("SocialLikesSheet");
    expect(count).toContain("setOpen(true)");
    expect(count).toContain("aria-haspopup=\"dialog\"");
    expect(count).not.toContain("<p className=\"t-body-sm font-semibold text-ink\">");
    // H · Posts: the count is the bare number beside the round heart
    // ("4", named "4 likes"); it still opens who liked.
    expect(count).toContain("socialPostActionCount(view.likeCount)");
    expect(count).toContain("aria-label={label}");
    expect(count).toContain("className={SOCIAL_POST_COUNT_CLASS}");
    // Cards: the time is the header meta's permalink, a 44 hit on phone
    // that sets no ink of its own (the meta's ink-2), never a t-label.
    expect(SOCIAL_POST_TIME_CLASS).toContain("min-h-11");
    expect(SOCIAL_POST_TIME_CLASS).not.toMatch(/(?:^|\s)text-ink(?:\s|$)/);
    expect(SOCIAL_POST_TIME_CLASS).not.toContain("t-label");
  });
});
