import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

import { SOCIAL } from "@/lib/social";
import { POST_SHARE_RECIPIENT_CAP } from "@/lib/social-post-share";
import { SocialPostShareButton } from "./social-post-share-button";
import { SocialPostShareSheet } from "./social-post-share-sheet";

const person = {
  id: "u2",
  name: "Lauren Montoya",
  handle: "lauren",
  photoUrl: null,
};

const other = {
  id: "u3",
  name: "Vincent Valdez",
  handle: "vincent",
  photoUrl: null,
};

describe("SocialPostShareSheet", () => {
  it("opens one dark drawer: search, 3-col grid, copy link, system share", () => {
    const src = readFileSync("src/components/social/social-post-share-sheet.tsx", "utf8");
    const html = renderToStaticMarkup(
      createElement(SocialPostShareSheet, {
        postId: "p1",
        open: true,
        onClose: () => undefined,
        directory: [person, other],
      }),
    );
    expect(html).toContain('data-social-post-share-host="ig-drawer"');
    expect(html).toContain("items-end");
    expect(html).toContain("md:items-center");
    expect(html).toContain("bg-[#181818]");
    expect(html).toContain("rounded-t-[16px]");
    expect(html).toContain("md:rounded-[16px]");
    expect(html).toContain("max-h-[90vh]");
    expect(html).not.toContain("h-[70vh]");
    expect(src).not.toContain("h-[70vh]");
    expect(src).not.toContain("bg-[#181820]");
    expect(src).toContain("attempt_id");
    expect(html).toContain("shadow-none");
    expect(html).toContain("bg-ink/40");
    expect(html).toContain("h-10");
    expect(html).toContain("rounded-[20px]");
    expect(html).toContain(SOCIAL.post.shareSearch);
    expect(html).toContain("grid-cols-3");
    expect(html).toContain("gap-4");
    expect(html).toContain("size-14");
    expect(html).toContain('data-social-post-share-cell="u2"');
    expect(html).toContain('data-social-post-share-cell="u3"');
    const ai = html.indexOf('data-social-post-share-cell="24frame-ai"');
    const firstHuman = html.indexOf('data-social-post-share-cell="u2"');
    expect(ai).toBeGreaterThan(-1);
    expect(ai).toBeLessThan(firstHuman);
    expect(html).toContain('href="?ai=1"');
    expect(html).toContain("data-social-frame-ai");
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain("24Frame AI");
    expect(html).toContain(SOCIAL.post.shareCopyLink);
    expect(html).toContain(SOCIAL.post.shareTo);
    expect(html).toContain('data-social-post-share-footer="closed"');
    expect(html).toMatch(/data-social-post-share-submit=""\s+disabled/);
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("line-clamp");
    expect(src).not.toContain("Add to story");
    expect(src).not.toContain("Facebook");
    expect(src).not.toContain("WhatsApp");
    expect(src).not.toContain("newGroup");
    expect(src).not.toContain("SocialCommentThread");
    expect(src).not.toContain("HouseDialogFrame");
    expect(src).not.toContain("AppSheet");
    expect(src).not.toContain("document.body.style.overflow");
    expect(src).toContain("postShareUiAfter");
  });

  it("morphs the same drawer for multi-select, message, and Send", () => {
    const html = renderToStaticMarkup(
      createElement(SocialPostShareSheet, {
        postId: "p1",
        open: true,
        onClose: () => undefined,
        directory: [person, other],
        initialSelectedIds: ["u2", "u3"],
      }),
    );
    expect(html).toContain('data-social-post-share-footer="open"');
    expect(html).toContain("data-social-post-share-check");
    expect(html.match(/data-social-post-share-check=/g)?.length).toBe(2);
    expect(html).toContain("bg-[#1769FF]");
    expect(html).toContain("size-5");
    expect(html).toContain(SOCIAL.post.writeMessage);
    expect(html).toContain("h-12");
    expect(html).toContain(SOCIAL.post.send);
    expect(html).not.toMatch(/data-social-post-share-submit=""\s+disabled/);
    expect(html).not.toContain("data-social-post-share-secondary");
    expect(html).not.toContain(SOCIAL.post.shareCopyLink);
    expect(html).toContain("data-social-post-share-grid");
  });

  it("stops a further select once 16 people are chosen", () => {
    const directory = Array.from({ length: POST_SHARE_RECIPIENT_CAP + 1 }, (_, index) => ({
      id: `u${index}`,
      name: `Person ${index}`,
      handle: `p${index}`,
      photoUrl: null,
    }));
    const html = renderToStaticMarkup(
      createElement(SocialPostShareSheet, {
        postId: "p1",
        open: true,
        onClose: () => undefined,
        directory,
        initialSelectedIds: directory.slice(0, POST_SHARE_RECIPIENT_CAP).map((item) => item.id),
      }),
    );
    const cell = (id: string) => {
      const marker = `data-social-post-share-cell="${id}"`;
      const at = html.indexOf(marker);
      return html.slice(at, html.indexOf(">", at));
    };
    expect(cell("u0")).not.toContain("disabled");
    expect(cell(`u${POST_SHARE_RECIPIENT_CAP}`)).toContain("disabled");
    expect(html.match(/data-social-post-share-check=/g)?.length).toBe(POST_SHARE_RECIPIENT_CAP);
  });
});

describe("SocialPostShareButton", () => {
  it("is a share control and does not mount the sheet or the comment thread", () => {
    const html = renderToStaticMarkup(createElement(SocialPostShareButton, { postId: "p1" }));
    expect(html).toContain('data-social-post-share=""');
    expect(html).toContain("size-10");
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
    expect(html).not.toContain('width="22"');
    expect(html).toContain('data-social-icon="paper-plane-tilt"');
    expect(html).toContain(`aria-label="${SOCIAL.post.share}"`);
    expect(html).not.toContain("data-social-post-share-sheet");
    expect(html).not.toContain("data-social-comment-thread");
    expect(html).not.toContain("data-social-comment-open");
  });
});
