// Cards · posts (founder 2026-10-06, Direction B: "B."; "notice how every
// single facebook post type is clearly in its own surface?"): the post
// face everywhere SocialPostCard renders. One assertion group per gate of
// the cards lock (C1, C3–C5, C7, C9); the exact class values are pinned
// once in src/lib/social-feed-cards-lock.test.ts and referenced here.
// docs/design-locks/social-feed-cards-lock-v1.md
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
  SOCIAL_CARD_FILL_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_CAROUSEL_DOTS_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_IN_CARD_FILL_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_AVATAR_EMPTY_CLASS,
  SOCIAL_POST_COMMENTS_CLASS,
  SOCIAL_POST_COUNT_CHIP_CLASS,
  SOCIAL_POST_COUNT_CLASS,
  SOCIAL_POST_GROUP_CLASS,
  SOCIAL_POST_HEAD_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS,
  SOCIAL_POST_META_CLASS,
  SOCIAL_POST_META_DOT_CLASS,
  SOCIAL_POST_MORE_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_PLAY_DISC_CLASS,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
  SOCIAL_POST_ROUND_IN_GROUP_CLASS,
  SOCIAL_POST_SCREEN_CLASS,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_POST_TOPIC_CHIP_CLASS,
  SOCIAL_POST_WORDS_CLASS,
  socialPostKind,
} from "@/lib/social-chrome";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { SocialIcon } from "./social-icon";
import { SocialPostCard } from "./social-post-card";
import { SocialPostMedia } from "./social-post-media";
import { SocialPostWallSkeleton } from "./social-skeletons";

dynamicRegistry.resolve = (source) =>
  source.includes("social-post-media") ? (SocialPostMedia as never) : null;

const tokens = readFileSync("src/app/tokens.css", "utf8");

const MUX_ID = "uNbxnGLKJ00yfbijDO8COxT";

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

function render(model: SocialPostCardModel, comments: string | null = null): string {
  return renderToStaticMarkup(
    <SocialPostCard post={model} comments={comments ? <p data-test-comments="">{comments}</p> : null} />,
  );
}

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

/** The opening tag of the first element carrying `attr`. */
function openTag(html: string, attr: string): string {
  const at = html.indexOf(attr);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

/** Every kind the Feed draws, as the loaders hand it to the card. */
const KINDS: Array<[string, SocialPostCardModel]> = [
  ["text", post({ media: [], topic: null })],
  ["photo", post()],
  [
    "swipe",
    post({
      media: [
        { kind: "image", url: "a", width: 1080, height: 1350 },
        { kind: "image", url: "b" },
        { kind: "image", url: "c" },
      ],
    }),
  ],
  ["landscape video", post({ media: [{ kind: "video", url: "", playbackId: MUX_ID, width: 1920, height: 1080 }] })],
  ["vertical video", post({ media: [{ kind: "video", url: "", playbackId: MUX_ID, width: 1080, height: 1920 }] })],
  ["group", post({ media: [], topic: null, groupSlug: "writers-room", groupName: "Writers' Room" })],
  ["owned", post({ owned: true })],
];

describe("Cards · posts (founder 2026-10-06)", () => {
  it("C3: every post kind is one card, header on top: header → words → media → actions", () => {
    for (const [name, model] of KINDS) {
      const html = render(model);
      expect(openTag(html, "data-social-post="), name).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
      const at = (needle: string) => html.indexOf(needle);
      // The media block: one frame, or the swipe's carousel.
      const media = Math.max(at("data-social-post-media"), at("data-social-post-carousel="));
      expect(at("data-social-post-head"), name).toBeGreaterThan(-1);
      expect(at("data-social-post-head"), name).toBeLessThan(at("data-social-post-caption"));
      if (model.media.length > 0) {
        expect(at("data-social-post-caption"), name).toBeLessThan(media);
        expect(media, name).toBeLessThan(at("data-social-post-actions"));
      } else {
        expect(media, name).toBe(-1);
        expect(at("data-social-post-caption"), name).toBeLessThan(at("data-social-post-actions"));
      }
      expect(openTag(html, "data-social-post-head"), name).toContain(`class="${SOCIAL_POST_HEAD_CLASS}"`);
      expect(openTag(html, "data-social-post-actions"), name).toContain(`class="${SOCIAL_POST_ACTIONS_CLASS}"`);
    }
  });

  it("C3: the header — the 40 face, the name as the member link, the meta \"2h · Group\", the owner's ⋯ at its end", () => {
    const html = render(post({ owned: true, groupSlug: "writers-room", groupName: "Writers' Room" }));
    const head = html.slice(html.indexOf("data-social-post-head"), html.indexOf("data-social-post-caption"));
    // The face repeats the member link for a pointer, out of the tab order
    // and the accessibility tree; the name is the one member link.
    const memberLinks = head.match(/<a [^>]*href="\/social\/u\/elena"[^>]*>/g) ?? [];
    expect(memberLinks).toHaveLength(2);
    expect(memberLinks[0]).toContain('tabindex="-1"');
    expect(memberLinks[0]).toContain('aria-hidden="true"');
    expect(memberLinks[1]).toContain(`class="${SOCIAL_POST_NAME_CLASS}"`);
    expect(memberLinks[1]).not.toMatch(/tabindex|aria-hidden/);
    expect(head).toContain(">Elena Ruiz</a>");
    const avatar = openTag(html, "data-social-avatar");
    for (const cls of ["size-10", "rounded-full", "shrink-0", "overflow-hidden"]) {
      expect(hasClass(avatar.match(/class="([^"]*)"/)?.[1] ?? "", cls), cls).toBe(true);
    }
    // A photo face has no grey behind it.
    expect(avatar).not.toMatch(/bg-surface/);
    // The meta: the time (the permalink), an aria-hidden dot, the group.
    const meta = head.slice(head.indexOf("data-social-post-meta"));
    expect(openTag(head, "data-social-post-meta")).toContain(`class="${SOCIAL_POST_META_CLASS}"`);
    expect(meta.indexOf('href="/social/p/p1"')).toBeLessThan(meta.indexOf(`class="${SOCIAL_POST_META_DOT_CLASS}"`));
    expect(meta).toContain(`<span aria-hidden="true" class="${SOCIAL_POST_META_DOT_CLASS}">·</span>`);
    expect(openTag(meta, 'href="/social/groups/writers-room"')).toContain(`class="${SOCIAL_POST_GROUP_CLASS}"`);
    expect(meta).toContain("Writers&#x27; Room</a>");
    expect(openTag(meta, 'href="/social/p/p1"')).toContain(`class="${SOCIAL_POST_TIME_CLASS}"`);
    // The owner's ⋯ closes the header; others see none.
    expect(openTag(head, "data-social-post-owner")).toContain(SOCIAL_POST_MORE_CLASS);
    expect(head.indexOf("data-social-post-meta")).toBeLessThan(head.indexOf("data-social-post-owner"));
    expect(render(post())).not.toContain("data-social-post-owner");
    // No role eyebrow until members choose one.
    expect(head).not.toContain("uppercase");
    expect(html).not.toContain("tracking-[0.06em]");
  });

  it("C3: one words style for a caption and a text body, never clamped; the time is the one permalink", () => {
    const photo = render(post());
    const text = render(post({ media: [], topic: null }));
    expect(socialPostKind([])).toBe("text");
    for (const html of [photo, text]) {
      expect(openTag(html, "data-social-post-caption")).toContain(`class="${SOCIAL_POST_WORDS_CLASS}"`);
      expect(openTag(html, "data-social-post-caption").startsWith("<p ")).toBe(true);
      expect(html.match(/\shref="\/social\/p\/p1"/g)?.length).toBe(1);
    }
    expect(SOCIAL_POST_WORDS_CLASS).not.toMatch(/line-clamp|truncate|text-ellipsis/);
    // The permalink page draws the time as plain text (no self link).
    const page = renderToStaticMarkup(<SocialPostCard post={post()} permalink={false} />);
    expect(page).not.toContain('href="/social/p/p1"');
    expect(page).toContain("<time ");
  });

  it("C4: a photo keeps its true shape (1.91:1 … 4:5) inside the card, with the topic chip on it", () => {
    const html = render(post());
    expect(html).toContain('data-social-post-kind="photo"');
    expect(openTag(html, "data-social-post-media")).toContain(`class="${SOCIAL_POST_MEDIA_CLASS}"`);
    expect(openTag(html, "data-social-post-image")).toContain("aspect-ratio:1.5");
    expect(render(post({ media: [{ kind: "image", url: "u", width: 1080, height: 1920 }] }))).toContain(
      "aspect-ratio:0.8",
    );
    expect(render(post({ media: [{ kind: "image", url: "u", width: 3000, height: 1000 }] }))).toContain(
      "aspect-ratio:1.91",
    );
    expect(html).not.toContain("min(70vh,560px)");
    const chip = openTag(html, "data-social-post-topic");
    expect(chip).toContain(SOCIAL_POST_TOPIC_CHIP_CLASS);
    expect(html).toContain(">Cinematography</span>");
    for (const cls of ["h-7", "px-2.5", "rounded-full", "bg-band/72", "text-band-ink", "font-medium", "pointer-events-none", "top-4", "left-4"]) {
      expect(hasClass(SOCIAL_POST_TOPIC_CHIP_CLASS, cls), cls).toBe(true);
    }
    expect(hasClass(SOCIAL_POST_COUNT_CHIP_CLASS, "right-4")).toBe(true);
    expect(render(post({ topic: null }))).not.toContain("data-social-post-topic");
  });

  it("C4: a swipe is one frame at the first still's shape with \"1 / 3\"; the dots stay buttons below md", () => {
    const swipe = render(KINDS[2]![1]);
    expect(openTag(swipe, "data-social-post-carousel=")).toContain("aspect-ratio:0.8");
    expect(openTag(swipe, "data-social-post-carousel=")).toContain(SOCIAL_POST_MEDIA_CLASS);
    expect(swipe).toContain(SOCIAL_POST_COUNT_CHIP_CLASS);
    expect(swipe).toContain('<span aria-hidden="true">1 / 3</span>');
    expect(swipe).toContain('<span class="sr-only">1 of 3</span>');
    const dots = openTag(swipe, "data-social-post-carousel-dots");
    expect(dots).toContain(`class="${SOCIAL_FEED_CAROUSEL_DOTS_CLASS}"`);
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

  it("C4: a video sits in the media block — no screen, no band, no \"Video\"; 4:5 … 2.39:1; a static play disc", () => {
    const landscape = render(KINDS[3]![1]);
    const vertical = render(KINDS[4]![1]);
    for (const html of [landscape, vertical]) {
      expect(html).toContain('data-social-post-kind="video"');
      expect(openTag(html, "data-social-post-screen=")).toContain(`class="${SOCIAL_POST_SCREEN_CLASS}"`);
      expect(openTag(html, "data-social-post-media")).toContain(`class="${SOCIAL_POST_MEDIA_CLASS}"`);
      expect(html).not.toContain("bg-screen");
      expect(html).not.toContain("data-social-post-screen-head");
      expect(html).not.toContain(`>${SOCIAL.post.videoLabel}<`);
      // The disc says "video": aria-hidden, under the player in the DOM.
      const disc = openTag(html, "data-social-post-play-disc");
      expect(disc).toContain(`class="${SOCIAL_POST_PLAY_DISC_CLASS}"`);
      expect(disc).toContain('aria-hidden="true"');
      expect(html.indexOf("data-social-post-play-disc")).toBeLessThan(html.indexOf("data-social-mux-player"));
      // The frame, the player and tap-to-immersive stay; the topic chip sits on the media.
      expect(html).toContain(`data-social-mux-player="${MUX_ID}"`);
      expect(html).toContain(`aria-label="${SOCIAL.post.viewVideo}"`);
      expect(html).toContain(">Cinematography</span>");
    }
    expect(landscape).toContain('data-social-feed-video-frame="landscape"');
    expect(openTag(landscape, "data-social-feed-video-frame")).toContain(`aspect-ratio:${1920 / 1080}`);
    // A 9:16 phone video draws 4:5 (cover-cropped), the whole frame one tap away.
    expect(vertical).toContain('data-social-feed-video-frame="portrait"');
    expect(openTag(vertical, "data-social-feed-video-frame")).toContain("aspect-ratio:0.8");
    expect(vertical).not.toContain("min(70vh");
  });

  it("C5: media that cannot draw is dropped in the card; a post left with none is a text card (no words: one quiet line)", () => {
    // A legacy video: no Mux playback id and no still (the loader's url "").
    const legacy = render(post({ media: [{ kind: "video", url: "" }] }));
    expect(legacy).toContain('data-social-post-kind="text"');
    expect(openTag(legacy, "data-social-post=")).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    expect(legacy).not.toContain("data-social-post-screen");
    expect(legacy).not.toContain("data-social-feed-media-frame");
    expect(legacy).toContain("Night exterior, take 4.");
    // Mixed: the still stays, alone in one frame (no swipe of one).
    const mixed = render(post({ media: [{ kind: "video", url: "" }, { kind: "image", url: "https://cf.example/s.jpg" }] }));
    expect(mixed).toContain('data-social-post-kind="photo"');
    expect(mixed).not.toContain("data-social-post-carousel=");
    expect(mixed).toContain('src="https://cf.example/s.jpg"');
    // The legacy video is the post's only media and it has no words: one
    // quiet line in the words' place, between the header and the actions
    // (never a header and actions around nothing).
    const bare = render(post({ body: "", media: [{ kind: "video", url: "" }] }));
    expect(bare).toContain('data-social-post-kind="text"');
    expect(bare).not.toContain("data-social-post-caption");
    const line = openTag(bare, "data-social-post-media-unavailable");
    expect(line).toContain(`class="${SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS}"`);
    expect(bare).toContain(`>${SOCIAL.post.mediaUnavailable}</p>`);
    expect(bare.indexOf("data-social-post-head")).toBeLessThan(bare.indexOf("data-social-post-media-unavailable"));
    expect(bare.indexOf("data-social-post-media-unavailable")).toBeLessThan(bare.indexOf("data-social-post-actions"));
    // Only then: the words win when there are any; a post that never had
    // media, or one whose still remains, draws no line.
    for (const [name, model] of [
      ["captioned legacy", post({ media: [{ kind: "video", url: "" }] })],
      ["text, no media", post({ body: "", media: [] })],
      ["still remains", post({ body: "", media: [{ kind: "video", url: "" }, { kind: "image", url: "https://cf.example/s.jpg" }] })],
    ] as const) {
      expect(render(model), name).not.toContain("data-social-post-media-unavailable");
    }
  });

  it("C3 / C7: round actions on the in-card fill, a 20 Regular glyph, 8 apart, counts beside (none at zero)", () => {
    const html = render(post({ owned: true }));
    const actions = html.slice(html.indexOf("data-social-post-actions"), html.indexOf("</article>"));
    expect(actions).toContain(`class="${SOCIAL_POST_ROUND_CLASS}"`);
    expect(actions).toContain(`class="${SOCIAL_POST_ROUND_IN_GROUP_CLASS}"`);
    expect(SOCIAL_POST_ROUND_CLASS).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    expect(SOCIAL_POST_ROUND_GLYPH).toBe(20);
    expect(actions.match(/width="20"/g)?.length).toBe(3);
    // Regular glyphs: the heart is the default SocialIcon (Regular), not Bold.
    const path = (svg: string) => svg.match(/<path d="[^"]*"/)?.[0] ?? "missing";
    const regular = path(renderToStaticMarkup(<SocialIcon name="heart" size={20} />));
    const bold = path(renderToStaticMarkup(<SocialIcon name="heart" size={20} weight="bold" />));
    expect(regular).not.toBe(bold);
    expect(actions).toContain(regular);
    expect(actions).not.toContain(bold);
    // Like · Comment · Share, in that order.
    expect(actions.indexOf("data-social-like=")).toBeLessThan(actions.indexOf("data-social-comment-open"));
    expect(actions.indexOf("data-social-comment-open")).toBeLessThan(actions.indexOf("data-social-post-share"));
    // Counts beside: the like count opens who liked; Comment is named with its count.
    expect(openTag(actions, "data-social-like-count")).toContain('aria-label="4 likes"');
    expect(openTag(actions, "data-social-like-count")).toContain('aria-haspopup="dialog"');
    expect(openTag(actions, "data-social-like-count")).toContain(SOCIAL_POST_COUNT_CLASS);
    expect(actions).toContain('aria-label="Comment, 2 comments"');
    const quiet = render(post({ likeCount: 0, commentCount: 0 }));
    expect(quiet).not.toContain("data-social-like-count");
    expect(quiet).not.toContain("data-social-comment-count");
    expect(quiet).toContain('aria-label="Comment"');
    // The owner's ⋯ is in the header, never in the trio.
    expect(actions).not.toContain("data-social-post-owner");
  });

  it("C3: the permalink's comments (and Profile's \"You commented\") sit inside the card under the actions", () => {
    const html = render(post(), "Lesssgoooooo!");
    const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    expect(article).toContain(
      `<div data-social-post-comments="" class="${SOCIAL_POST_COMMENTS_CLASS}"><p data-test-comments="">Lesssgoooooo!</p></div>`,
    );
    expect(article.indexOf("data-social-post-actions")).toBeLessThan(article.indexOf("data-social-post-comments"));
    expect(render(post())).not.toContain("data-social-post-comments");
  });

  it("C1: every in-card control sits lighter than the card, and the card lifts off the page, in light and dark", () => {
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
    const inCard: Array<[string, string]> = [
      ["Like / Share round", SOCIAL_POST_ROUND_CLASS],
      ["Comment round", SOCIAL_POST_ROUND_IN_GROUP_CLASS],
      ["empty avatar", SOCIAL_POST_AVATAR_EMPTY_CLASS],
    ];
    for (const theme of ["light", "dark"] as const) {
      const card = fill(SOCIAL_CARD_FILL_CLASS, theme);
      for (const [name, cls] of inCard) {
        expect(luminance(fill(cls, theme)), `${theme}: ${name} lighter than the card`).toBeGreaterThan(luminance(card));
      }
      const page = block[theme].match(/--bg:\s*(#[0-9a-fA-F]{6});/)?.[1]?.toLowerCase() ?? "missing bg";
      if (theme === "light") expect(luminance(card), "light: the grey card under the white canvas").toBeLessThan(luminance(page));
      else expect(luminance(card), "dark: the card above the page").toBeGreaterThan(luminance(page));
    }
    // Rendered: a text post with no photo carries the in-card fill on its rounds and empty face.
    const text = render(post({ media: [], topic: null, authorPhotoUrl: null }));
    expect(text).toContain(`class="${SOCIAL_POST_ROUND_CLASS}"`);
    expect(text).toContain(`class="${SOCIAL_POST_ROUND_IN_GROUP_CLASS}"`);
    expect(openTag(text, "data-social-avatar")).toContain(SOCIAL_POST_AVATAR_EMPTY_CLASS);
  });

  it("C9: the wall skeleton draws the live card in the live order", () => {
    const skeleton = renderToStaticMarkup(<SocialPostWallSkeleton />);
    expect(skeleton).toContain(`class="${SOCIAL_FEED_GUTTER_CLASS}"`);
    const cards = skeleton.match(/<div data-social-post-skeleton="" class="[^"]*"/g) ?? [];
    expect(cards).toHaveLength(3);
    for (const card of cards) expect(card).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    const first = skeleton.slice(skeleton.indexOf("data-social-post-skeleton"));
    const at = (cls: string) => first.indexOf(`class="${cls}"`);
    expect(at(SOCIAL_POST_HEAD_CLASS)).toBeGreaterThan(-1);
    expect(at(SOCIAL_POST_HEAD_CLASS)).toBeLessThan(at(SOCIAL_POST_MEDIA_CLASS));
    expect(at(SOCIAL_POST_MEDIA_CLASS)).toBeLessThan(at(SOCIAL_POST_ACTIONS_CLASS));
    expect(skeleton).toContain("aspect-[4/5]");
    // Three cards, each with the three live rounds.
    expect(skeleton.match(/md:size-10/g)?.length).toBe(9);
  });
});
