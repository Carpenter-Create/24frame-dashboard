// H · Posts (founder 2026-10-05, approving the H boards: "I like the
// designs. Let's use them."): the post face everywhere SocialPostCard
// renders. One assertion group per decision in the lock's §7 (G9–G14).
// docs/design-locks/social-feed-register-lock-v1.md §7
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const dynamicRegistry = vi.hoisted(() => ({
  resolve: (source: string): ((props: Record<string, unknown>) => unknown) | null =>
    source ? null : null,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options?: { ssr?: boolean }) => {
    if (options?.ssr === false) return () => null;
    const source = loader.toString();
    return function SocialDynamic(props: Record<string, unknown>) {
      const Comp = dynamicRegistry.resolve(source);
      return Comp ? createElement(Comp as never, props) : null;
    };
  },
}));

import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_CAROUSEL_DOTS_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_POST_CAPTION_CLASS,
  SOCIAL_POST_CLASS,
  SOCIAL_POST_COUNT_CHIP_CLASS,
  SOCIAL_POST_COUNT_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_MORE_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_ROUND_CARD_CLASS,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
  SOCIAL_POST_ROUND_IN_GROUP_CARD_CLASS,
  SOCIAL_POST_SCREEN_CLASS,
  SOCIAL_POST_SCREEN_HEAD_CLASS,
  SOCIAL_POST_TEXT_BODY_CLASS,
  SOCIAL_POST_TEXT_CARD_CLASS,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_POST_TOPIC_CHIP_CLASS,
  socialPostActionsClass,
  socialPostAvatarEmptyClass,
  socialPostFootClass,
  socialPostKind,
} from "@/lib/social-chrome";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { SocialPostCard } from "./social-post-card";
import { SocialPostMedia } from "./social-post-media";
import { SocialPostWallSkeleton } from "./social-skeletons";

dynamicRegistry.resolve = (source) =>
  source.includes("social-post-media") ? (SocialPostMedia as never) : null;

const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

function post(overrides: Partial<SocialPostCardModel> = {}): SocialPostCardModel {
  return {
    id: "p1",
    body: "Night exterior, take 4. One practical, a wet street, and a long lens.",
    likeCount: 4,
    commentCount: 2,
    liked: false,
    createdAt: "2026-09-12T14:00:00.000Z",
    authorId: "u1",
    authorHandle: "elena",
    authorName: "Elena Ruiz",
    authorPhotoUrl: "https://cf.example/elena.jpg",
    groupSlug: null,
    groupName: null,
    canLike: true,
    media: [{ kind: "image", url: "https://cf.example/still.jpg", width: 1200, height: 800 }],
    topic: "Cinematography",
    ...overrides,
  };
}

function render(model: SocialPostCardModel): string {
  return renderToStaticMarkup(<SocialPostCard post={model} />);
}

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

/** The opening tag of the first element carrying `attr`. */
function openTag(html: string, attr: string): string {
  const at = html.indexOf(attr);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

describe("H · Posts (founder 2026-10-05)", () => {
  it("G9: a photo fills the column at its true shape (1.91:1 … 4:5) at radius 24 with no card or frame", () => {
    const html = render(post());
    expect(html).toContain('data-social-post-kind="photo"');
    // The article is no card: no fill, no radius, no border.
    expect(openTag(html, "data-social-post=")).toContain(`class="${SOCIAL_POST_CLASS}"`);
    expect(SOCIAL_POST_CLASS).not.toMatch(/bg-|rounded|border|shadow/);
    // The media block: radius 24 from md; phone meets the viewport at radius 0.
    expect(openTag(html, "data-social-post-media")).toContain(SOCIAL_POST_MEDIA_CLASS);
    expect(hasClass(SOCIAL_POST_MEDIA_CLASS, "md:rounded-[var(--radius-xl)]")).toBe(true);
    expect(hasClass(SOCIAL_POST_MEDIA_CLASS, "max-md:-mx-[var(--chrome-gutter)]")).toBe(true);
    expect(SOCIAL_POST_MEDIA_CLASS).not.toMatch(/(?:^|\s)rounded-|border|shadow-(?!none)/);
    // True shape: 1200×800 is 3:2; out-of-range shapes hold at the limits.
    expect(openTag(html, "data-social-post-image")).toContain("aspect-ratio:1.5");
    expect(render(post({ media: [{ kind: "image", url: "u", width: 1080, height: 1920 }] }))).toContain(
      "aspect-ratio:0.8",
    );
    expect(render(post({ media: [{ kind: "image", url: "u", width: 3000, height: 1000 }] }))).toContain(
      "aspect-ratio:1.91",
    );
    expect(html).not.toContain("min(70vh,560px)");
  });

  it("G9: the topic and the counter are small chips on the photo (28, the band at 72%, 13 / 500)", () => {
    const html = render(post());
    const chip = openTag(html, "data-social-post-topic");
    expect(chip).toContain(SOCIAL_POST_TOPIC_CHIP_CLASS);
    expect(html).toContain(">Cinematography</span>");
    for (const cls of ["h-7", "px-2.5", "rounded-full", "bg-band/72", "text-band-ink", "font-medium", "pointer-events-none", "top-4", "left-4"]) {
      expect(hasClass(SOCIAL_POST_TOPIC_CHIP_CLASS, cls), cls).toBe(true);
    }
    expect(hasClass(SOCIAL_POST_TOPIC_CHIP_CLASS, "text-[length:var(--text-xs)]")).toBe(true);
    expect(hasClass(SOCIAL_POST_COUNT_CHIP_CLASS, "right-4")).toBe(true);
    expect(hasClass(SOCIAL_POST_COUNT_CHIP_CLASS, "tabular-nums")).toBe(true);
    // No topic: no chip.
    expect(render(post({ topic: null }))).not.toContain("data-social-post-topic");
    // Two or more items: one frame at the first still's shape, "1 / 3" on it.
    const swipe = render(
      post({
        media: [
          { kind: "image", url: "a", width: 1080, height: 1350 },
          { kind: "image", url: "b" },
          { kind: "image", url: "c" },
        ],
      }),
    );
    expect(openTag(swipe, "data-social-post-carousel=")).toContain("aspect-ratio:0.8");
    expect(openTag(swipe, "data-social-post-carousel=")).toContain(SOCIAL_POST_MEDIA_CLASS);
    expect(swipe).toContain(SOCIAL_POST_COUNT_CHIP_CLASS);
    expect(swipe).toContain('<span aria-hidden="true">1 / 3</span>');
    expect(swipe).toContain('<span class="sr-only">1 of 3</span>');
    // The dots are drawn from md. Below md a finger swipes and reads the
    // chip, but the dots stay buttons in the accessibility tree: visually
    // hidden (sr-only) until one has keyboard focus, never display:none,
    // so a keyboard, switch or screen-reader user can change slides.
    const dots = openTag(swipe, "data-social-post-carousel-dots");
    expect(dots).toContain(`class="${SOCIAL_FEED_CAROUSEL_DOTS_CLASS}"`);
    expect(hasClass(SOCIAL_FEED_CAROUSEL_DOTS_CLASS, "flex")).toBe(true);
    expect(hasClass(SOCIAL_FEED_CAROUSEL_DOTS_CLASS, "max-md:not-focus-within:sr-only")).toBe(true);
    for (const gone of ["hidden", "max-md:hidden", "md:flex", "invisible", "sr-only", "max-md:sr-only"]) {
      expect(hasClass(SOCIAL_FEED_CAROUSEL_DOTS_CLASS, gone), gone).toBe(false);
    }
    expect(dots).not.toContain("aria-hidden");
    const dotButtons = swipe.match(/<button[^>]*data-social-post-carousel-dot=[^>]*>/g) ?? [];
    expect(dotButtons.length).toBe(3);
    expect(dotButtons[0]).toContain('aria-current="true"');
    expect(dotButtons[1]).toContain('aria-label="Show media 2 of 3"');
    for (const dot of dotButtons) expect(dot).not.toMatch(/tabindex="-1"|aria-hidden|disabled/);
    expect(swipe).toContain(">Cinematography</span>");
  });

  it("G10: a video plays on the near-black screen (radius 24) under a band: the topic left, \"Video\" right", () => {
    const html = render(
      post({
        media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", width: 1920, height: 1080 }],
      }),
    );
    expect(html).toContain('data-social-post-kind="video"');
    expect(openTag(html, "data-social-post-screen=")).toContain(SOCIAL_POST_SCREEN_CLASS);
    expect(hasClass(SOCIAL_POST_SCREEN_CLASS, "bg-screen")).toBe(true);
    expect(openTag(html, "data-social-post-media")).toContain("md:rounded-[var(--radius-xl)]");
    const head = html.slice(html.indexOf("data-social-post-screen-head"), html.indexOf("data-social-feed-media-frame"));
    expect(head).toContain(SOCIAL_POST_SCREEN_HEAD_CLASS);
    expect(head.indexOf("Cinematography")).toBeLessThan(head.indexOf(`>${SOCIAL.post.videoLabel}<`));
    expect(SOCIAL.post.videoLabel).toBe("Video");
    for (const cls of ["min-h-11", "justify-between", "px-4", "text-band-ink/72", "font-medium"]) {
      expect(hasClass(SOCIAL_POST_SCREEN_HEAD_CLASS, cls), cls).toBe(true);
    }
    // The existing frame, player and tap-to-immersive stay inside the screen.
    expect(html).toContain('data-social-feed-video-frame="landscape"');
    expect(html).toContain('data-social-mux-player="uNbxnGLKJ00yfbijDO8COxT"');
    expect(html).toContain(`aria-label="${SOCIAL.post.viewVideo}"`);
    expect(html.indexOf("data-social-post-screen-head")).toBeLessThan(html.indexOf("data-social-mux-player"));
    // The one new token: the screen, near-black in light, true black in dark.
    const root = tokens.slice(tokens.indexOf(":root {"), tokens.indexOf("@media (max-width: 767px)"));
    const dark = tokens.slice(tokens.indexOf(".dark {"));
    expect(root).toMatch(/--screen:\s*#0f0f0f;/);
    expect(dark).toMatch(/--screen:\s*#000000;/);
    expect(globals).toContain("--color-screen: var(--screen);");
  });

  it("G11: the credit row sits under the media: the 40 circle, the name 17 / 600, the time 15 quiet — no role line", () => {
    const html = render(post());
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-credit"));
    expect(openTag(html, "data-social-post-credit")).toContain(socialPostFootClass("photo"));
    expect(hasClass(socialPostFootClass("photo"), "mt-3")).toBe(true);
    expect(hasClass(socialPostFootClass("photo"), "md:mt-4")).toBe(true);
    const avatar = openTag(html, "data-social-avatar");
    for (const cls of ["size-10", "rounded-full", "shrink-0", "overflow-hidden"]) {
      expect(hasClass(avatar.match(/class="([^"]*)"/)?.[1] ?? "", cls), cls).toBe(true);
    }
    // A photo face has no grey behind it.
    expect(avatar).not.toMatch(/bg-surface/);
    expect(html).toContain(`<span class="${SOCIAL_POST_NAME_CLASS}">Elena Ruiz</span>`);
    expect(SOCIAL_POST_NAME_CLASS).toContain("text-[length:var(--text-base)] font-semibold");
    // The avatar and the name are one 44 link to the member.
    const author = openTag(html, 'href="/social/u/elena"');
    expect(author).toContain("min-h-11");
    expect(html).toContain(SOCIAL_POST_TIME_CLASS);
    expect(SOCIAL_POST_TIME_CLASS).toContain("text-[length:var(--text-sm)]");
    expect(SOCIAL_POST_TIME_CLASS).toContain("text-ink-3 dark:text-ink-2");
    // No role eyebrow until members choose one.
    const name = html.slice(html.indexOf("data-social-post-name"), html.indexOf("Elena Ruiz"));
    expect(name).not.toContain("uppercase");
    expect(html).not.toContain("tracking-[0.06em]");
  });

  it("G12: round grey 40 / 44 actions, glyph 20, 8 apart, counts beside (none at zero), the owner's quiet ⋯", () => {
    const html = render(post({ owned: true }));
    const actions = html.slice(html.indexOf("data-social-post-actions"), html.indexOf("data-social-post-owner"));
    expect(openTag(html, "data-social-post-actions")).toContain(socialPostActionsClass("photo"));
    expect(hasClass(socialPostActionsClass("photo"), "gap-2")).toBe(true);
    for (const cls of ["size-11", "md:size-10", "rounded-full", "bg-surface-muted", "text-ink"]) {
      expect(hasClass(SOCIAL_POST_ROUND_CLASS, cls), cls).toBe(true);
    }
    expect(actions).toContain(`class="${SOCIAL_POST_ROUND_CLASS}"`);
    expect(SOCIAL_POST_ROUND_GLYPH).toBe(20);
    expect(actions.match(/width="20"/g)?.length).toBe(3);
    // Like · Comment · Share, in that order.
    expect(actions.indexOf("data-social-like=")).toBeLessThan(actions.indexOf("data-social-comment-open"));
    expect(actions.indexOf("data-social-comment-open")).toBeLessThan(actions.indexOf("data-social-post-share"));
    // Counts beside: the like count opens who liked; Comment is named with its count.
    expect(openTag(actions, "data-social-like-count")).toContain('aria-label="4 likes"');
    expect(openTag(actions, "data-social-like-count")).toContain('aria-haspopup="dialog"');
    expect(openTag(actions, "data-social-like-count")).toContain(SOCIAL_POST_COUNT_CLASS);
    expect(actions).toContain('aria-label="Comment, 2 comments"');
    expect(SOCIAL_POST_COUNT_CLASS).toContain("text-[length:var(--text-sm)] font-medium tabular-nums text-ink-2");
    const quiet = render(post({ likeCount: 0, commentCount: 0 }));
    expect(quiet).not.toContain("data-social-like-count");
    expect(quiet).not.toContain("data-social-comment-count");
    expect(quiet).toContain('aria-label="Comment"');
    // Phone: their own row under the caption, aligned to the name (52).
    expect(hasClass(socialPostActionsClass("photo"), "pl-[52px]")).toBe(true);
    expect(hasClass(socialPostActionsClass("photo"), "order-4")).toBe(true);
    expect(hasClass(socialPostActionsClass("photo"), "md:order-2")).toBe(true);
    // The owner's ⋯: quiet, outside the trio.
    expect(openTag(html, "data-social-post-owner")).toContain(SOCIAL_POST_MORE_CLASS);
    expect(actions).not.toContain("data-social-post-owner");
    expect(render(post())).not.toContain("data-social-post-owner");
  });

  it("G13: the caption is 17 / 420 ink-2 under the credit, never clamped; a text post is the soft grey card at 20 / 480", () => {
    const html = render(post());
    expect(openTag(html, "data-social-post-caption")).toContain(SOCIAL_POST_CAPTION_CLASS);
    // Plain words (as drawn); the permalink is the time's 44 hit.
    expect(openTag(html, "data-social-post-caption").startsWith("<p ")).toBe(true);
    expect(openTag(html, "data-social-post-time").startsWith("<time ")).toBe(true);
    const permalink = html.match(/<a [^>]*href="\/social\/p\/p1"[^>]*>/)?.[0] ?? "";
    expect(permalink).toContain(SOCIAL_POST_TIME_CLASS);
    // One link to the permalink (the article's data hook aside).
    expect(html.match(/\shref="\/social\/p\/p1"/g)?.length).toBe(1);
    expect(html.indexOf("data-social-post-credit")).toBeLessThan(html.indexOf("data-social-post-caption"));
    for (const cls of ["mt-2", "pl-[52px]", "text-ink-2", "md:text-[length:var(--text-base)]", "whitespace-pre-wrap", "break-words"]) {
      expect(hasClass(SOCIAL_POST_CAPTION_CLASS, cls), cls).toBe(true);
    }
    expect(SOCIAL_POST_CAPTION_CLASS).not.toMatch(/line-clamp|truncate|text-ellipsis|font-semibold/);
    const text = render(post({ media: [], topic: null }));
    expect(socialPostKind([])).toBe("text");
    expect(openTag(text, "data-social-post=")).toContain(SOCIAL_POST_TEXT_CARD_CLASS);
    for (const cls of ["bg-surface-muted", "rounded-[var(--radius-xl)]", "p-4", "md:p-6"]) {
      expect(hasClass(SOCIAL_POST_TEXT_CARD_CLASS, cls), cls).toBe(true);
    }
    expect(SOCIAL_POST_TEXT_CARD_CLASS).not.toMatch(/border|shadow/);
    expect(openTag(text, "data-social-post-caption")).toContain(SOCIAL_POST_TEXT_BODY_CLASS);
    for (const cls of ["text-[length:var(--text-lg)]", "[font-weight:var(--type-title-weight)]", "leading-[1.4]", "tracking-[-0.02em]", "text-ink"]) {
      expect(hasClass(SOCIAL_POST_TEXT_BODY_CLASS, cls), cls).toBe(true);
    }
    // Rounds on the grey card are the page white.
    expect(text).toContain(`class="${SOCIAL_POST_ROUND_CARD_CLASS}"`);
    expect(hasClass(SOCIAL_POST_ROUND_CARD_CLASS, "bg-surface")).toBe(true);
    expect(text).not.toContain("data-social-post-media");
  });

  it("G13: on the grey card the rounds and the empty avatar sit lighter than the card in light and dark (the board's onMuted)", () => {
    const root = tokens.slice(tokens.indexOf(":root {"), tokens.indexOf("@media (max-width: 767px)"));
    const darkBlock = tokens.slice(tokens.indexOf(".dark {"));
    const block = { light: root, dark: darkBlock } as const;
    // The fill a class string paints in a theme: `dark:bg-*` under .dark, else `bg-*`.
    function fill(classes: string, theme: "light" | "dark"): string {
      const list = classes.split(/\s+/);
      const dark = list.find((c) => c.startsWith("dark:bg-"));
      const base = list.find((c) => c.startsWith("bg-")) ?? "";
      const token = (theme === "dark" && dark ? dark.slice("dark:".length) : base).slice("bg-".length);
      return block[theme].match(new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6});`))?.[1]?.toLowerCase() ?? `missing ${token}`;
    }
    function luminance(hex: string): number {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    }
    const onCard: Array<[string, string]> = [
      ["Like / Share round", SOCIAL_POST_ROUND_CARD_CLASS],
      ["Comment round", SOCIAL_POST_ROUND_IN_GROUP_CARD_CLASS],
      ["empty avatar", socialPostAvatarEmptyClass("card")],
    ];
    for (const theme of ["light", "dark"] as const) {
      const card = fill(SOCIAL_POST_TEXT_CARD_CLASS, theme);
      for (const [name, cls] of onCard) {
        expect(luminance(fill(cls, theme)), `${theme}: ${name} lighter than the card`).toBeGreaterThan(luminance(card));
      }
    }
    // The board's values, in existing tokens: light card #f4f4f6 under
    // #ffffff rounds; dark card #1e2126 under #25292f rounds.
    expect(fill(SOCIAL_POST_TEXT_CARD_CLASS, "light")).toBe("#f4f4f6");
    expect(fill(SOCIAL_POST_ROUND_CARD_CLASS, "light")).toBe("#ffffff");
    expect(fill(SOCIAL_POST_TEXT_CARD_CLASS, "dark")).toBe("#1e2126");
    expect(fill(SOCIAL_POST_ROUND_CARD_CLASS, "dark")).toBe("#25292f");
    // Off the card nothing remaps: page rounds are muted in both themes.
    expect(SOCIAL_POST_ROUND_CLASS).not.toContain("dark:");
    expect(socialPostAvatarEmptyClass("page")).toBe("bg-surface-muted");
    // Rendered: a text post with no photo carries the card's classes.
    const text = render(post({ media: [], topic: null, authorPhotoUrl: null }));
    expect(openTag(text, "data-social-post=")).toContain(SOCIAL_POST_TEXT_CARD_CLASS);
    expect(text).toContain(`class="${SOCIAL_POST_ROUND_CARD_CLASS}"`);
    expect(text).toContain(`class="${SOCIAL_POST_ROUND_IN_GROUP_CARD_CLASS}"`);
    expect(openTag(text, "data-social-avatar")).toContain(socialPostAvatarEmptyClass("card"));
  });

  it("G14: the wall is 24 / 48 and the wall skeleton uses the live post classes", () => {
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col gap-[var(--space-6)] md:gap-[var(--space-12)]");
    const skeleton = renderToStaticMarkup(<SocialPostWallSkeleton />);
    expect(skeleton).toContain(`class="${SOCIAL_FEED_GUTTER_CLASS}"`);
    expect(skeleton.match(/data-social-post-skeleton/g)?.length).toBe(3);
    expect(skeleton).toContain(`class="${SOCIAL_POST_MEDIA_CLASS}"`);
    expect(skeleton).toContain("aspect-[4/5]");
    expect(skeleton).toContain(socialPostFootClass("photo"));
    expect(skeleton).toContain(socialPostActionsClass("photo"));
    // Three posts, each with the three round actions.
    expect(skeleton.match(/md:size-10/g)?.length).toBe(9);
  });
});
