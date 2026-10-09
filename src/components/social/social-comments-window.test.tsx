import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import { HOUSE_WINDOW_FRAME_FILL_CLASS, HOUSE_WINDOW_HEADER_SPACER_CLASS, HOUSE_WINDOW_PANEL_CLASS } from "@/lib/house-window";
import { SOCIAL } from "@/lib/social";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import {
  SOCIAL_COMMENTS_WINDOW_AVATAR_EMPTY_CLASS,
  SOCIAL_IN_CARD_FILL_CLASS,
  SOCIAL_POST_PLAY_DISC_CLASS,
} from "@/lib/social-chrome";
import type { SocialCommentCard } from "@/lib/social-comments";
import {
  socialCommentsPostFromCard,
  socialCommentsPostFromExplore,
  type SocialCommentsPost,
} from "@/lib/social-comments-window";
import { clearSocialMuxPlaybackTokenCache } from "@/lib/social-mux";

import { SocialCommentsWindow } from "./social-comments-window";
import type { SocialCommentThreadState } from "./use-social-comment-thread";

// docs/design-locks/social-comments-window-lock-v1.md

const windowSrc = readFileSync("src/components/social/social-comments-window.tsx", "utf8");
const rowSrc = readFileSync("src/components/social/social-comment-row.tsx", "utf8");
const PLAYBACK = "uNbxnGLKJ00yfbijDO8COxT";

const card: SocialPostCardModel = {
  id: "p1",
  body: "A caption that is never clamped.",
  likeCount: 2,
  commentCount: 2,
  liked: false,
  createdAt: "2026-10-01T12:00:00.000Z",
  authorId: "u1",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: null,
  groupSlug: "writers",
  groupName: "Writers",
  canLike: true,
  media: [{ kind: "image", url: "https://cf.example/a", width: 1080, height: 1350 }],
};

function comment(id: string, name: string, handle: string | null): SocialCommentCard {
  return {
    id,
    post_id: "p1",
    author_id: `u-${id}`,
    body: `Body ${id}`,
    created_at: "2026-10-01T13:00:00.000Z",
    authorHandle: handle,
    authorName: name,
    authorPhotoUrl: null,
    canDelete: false,
  };
}

function thread(over: Partial<SocialCommentThreadState> = {}): SocialCommentThreadState {
  return {
    comments: [comment("c1", "Grace Hopper", "grace"), comment("c2", "Alan Turing", "alan")],
    loading: false,
    error: "",
    body: "",
    setBody: () => undefined,
    pending: false,
    submit: () => true,
    remove: () => undefined,
    ...over,
  };
}

function render({
  post = socialCommentsPostFromCard(card),
  state = thread(),
  canComment = true,
}: {
  post?: SocialCommentsPost;
  state?: SocialCommentThreadState;
  canComment?: boolean;
} = {}) {
  return renderToStaticMarkup(
    <SocialCommentsWindow thread={state} post={post} canComment={canComment} onClose={() => undefined} />,
  );
}

function slice(html: string, from: string): string {
  return html.slice(html.indexOf(from));
}

afterEach(() => {
  clearSocialMuxPlaybackTokenCache();
});

describe("Comments window (social-comments-window-lock-v1)", () => {
  it("is the house 600 window filling 80vh: X · Comments, no Done, a 44 spacer", () => {
    const html = render();
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    for (const token of HOUSE_WINDOW_PANEL_CLASS.split(" ")) expect(html).toContain(token);
    expect(html).toContain(`data-social-comment-thread-window="" class="${HOUSE_WINDOW_FRAME_FILL_CLASS}"`);
    expect(html).toContain('data-social-comment-thread=""');
    expect(html).toContain('data-social-comment-thread-close=""');
    expect(html).toContain(`aria-label="${SOCIAL.create.close}"`);
    expect(html).toMatch(/<h2[^>]*>Comments<\/h2>/);
    expect(html).not.toContain("data-social-comment-thread-done");
    expect(html).toContain(`<span aria-hidden="true" class="${HOUSE_WINDOW_HEADER_SPACER_CLASS}"></span>`);
    // A filled frame never takes a held px height.
    expect(html).not.toMatch(/data-social-comment-thread-window=""[^>]*style=/);
  });

  it("puts the post, then the thread, in the body and the composer in the pinned foot", () => {
    const html = render();
    const order = [
      "data-social-comment-thread-post",
      "data-social-post-caption",
      "data-social-comment-thread-media",
      "data-social-comment-thread-list",
      "data-social-comment-thread-foot",
    ].map((attr) => html.indexOf(attr));
    for (const index of order) expect(index).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const foot = slice(html, "data-social-comment-thread-foot");
    expect(foot).toContain("data-social-comment-composer");
    expect(foot).toContain(`placeholder="${SOCIAL.post.commentPlaceholder}"`);
    expect(foot).toContain(`aria-label="${SOCIAL.post.commentPlaceholder}"`);
    expect(foot).toContain(`>${SOCIAL.post.commentSubmit}</button>`);
    expect(foot).toMatch(/<button type="submit" disabled=""/);
    expect(html).not.toContain('id="social-comment-body"');
    expect(html).toContain("A caption that is never clamped.");
    expect(html).not.toContain("line-clamp");
  });

  it("shows the need-profile line instead of a field, and an error in the foot", () => {
    const signedOut = render({ canComment: false });
    expect(slice(signedOut, "data-social-comment-thread-foot")).toContain(SOCIAL.cta.needProfile);
    expect(signedOut).not.toContain("<textarea");
    const failed = render({ state: thread({ error: SOCIAL.post.commentFailed }) });
    const foot = slice(failed, "data-social-comment-thread-foot");
    expect(foot).toMatch(/<p role="status"[^>]*>Could not post that comment\.<\/p>/);
    // Typed text enables Post.
    expect(render({ state: thread({ body: "hi" }) })).not.toMatch(/<button type="submit" disabled=""/);
  });

  it("links the author, the group and each commenter through the house link the window can hold", () => {
    const html = render();
    const houseLink = (href: string, text: string) =>
      new RegExp(`<a (?=[^>]*data-house-link="")(?=[^>]*href="${href}")[^>]*>${text}</a>`);
    expect(html).toMatch(houseLink("/social/u/grace", "Grace Hopper"));
    expect(html).toMatch(houseLink("/social/u/alan", "Alan Turing"));
    expect(html).toMatch(houseLink("/social/u/ada", "Ada Lovelace"));
    expect(html).toMatch(houseLink("/social/groups/writers", "Writers"));
    // The face repeats the name for a pointer only.
    expect(html).toMatch(/<a tabindex="-1" aria-hidden="true"[^>]*href="\/social\/u\/ada"/);
    expect(html).toMatch(/<time dateTime="2026-10-01T12:00:00.000Z">/);
    // An empty thread says so; a loading one draws nothing.
    expect(render({ state: thread({ comments: [] }) })).toContain(SOCIAL.post.commentEmpty);
    const loading = render({ state: thread({ comments: [], loading: true }) });
    expect(loading).not.toContain(SOCIAL.post.commentEmpty);
  });

  it("draws one still: a public video's poster with a static play disc and no player, 4:5 until known", () => {
    const html = render({
      post: socialCommentsPostFromCard({
        ...card,
        media: [{ kind: "video", url: "", playbackId: PLAYBACK, playbackPolicy: "public" }],
      }),
    });
    expect(html).toContain('data-social-comment-thread-media="video"');
    expect(html).toContain(`src="https://image.mux.com/${PLAYBACK}/thumbnail.webp?time=0"`);
    expect(html).toContain(`<span aria-hidden="true" class="${SOCIAL_POST_PLAY_DISC_CLASS}"><svg`);
    expect(html).toContain('data-social-icon="play"');
    expect(html).not.toContain("<mux-player");
    expect(html).not.toContain("data-mux-player");
    expect(html).toContain("aspect-ratio:0.8");
    // Signed with nothing in the session cache: no still yet (never a broken image).
    const signed = render({
      post: socialCommentsPostFromCard({
        ...card,
        media: [{ kind: "video", url: "", playbackId: PLAYBACK, playbackPolicy: "signed" }],
      }),
    });
    expect(signed).toContain('data-social-comment-thread-media="video"');
    expect(signed).not.toContain("<img");
  });

  it("shows the item it opened on with the carousel chip, nothing for a text post, and no time for Explore", () => {
    const three = render({
      post: socialCommentsPostFromCard(
        {
          ...card,
          media: [
            { kind: "image", url: "https://cf.example/a" },
            { kind: "image", url: "https://cf.example/b" },
            { kind: "image", url: "https://cf.example/c" },
          ],
        },
        2,
      ),
    });
    expect(three).toContain(">3 / 3</span>");
    expect(three).toContain('src="https://cf.example/c"');
    expect(three).not.toContain('src="https://cf.example/a"');
    const text = render({ post: socialCommentsPostFromCard({ ...card, media: [] }) });
    expect(text).not.toContain("data-social-comment-thread-media");
    const explore = render({
      post: socialCommentsPostFromExplore({
        postId: "p2",
        playbackId: PLAYBACK,
        playbackPolicy: "public",
        body: "Explore words.",
        authorId: "u2",
        authorHandle: "grace",
        authorName: "Grace Hopper",
        authorPhotoUrl: "",
        likeCount: 0,
        commentCount: 0,
        liked: false,
        canLike: true,
      }),
    });
    expect(explore).not.toContain("<time");
    expect(explore).toContain("Explore words.");
    // No photo: the face's fill reads on the white body (not the card's white fill).
    expect(explore).toContain(SOCIAL_COMMENTS_WINDOW_AVATAR_EMPTY_CLASS);
    expect(explore).not.toContain(SOCIAL_IN_CARD_FILL_CLASS);
  });

  it("asks before typed text is lost, posts on ⌘/Ctrl+Enter, and stays in tokens", () => {
    expect(windowSrc).toContain("dirty: socialCommentDraftDirty(");
    expect(windowSrc).toContain("busy: false");
    expect(windowSrc).toContain("holdOpen: false");
    expect(windowSrc).toContain('phone: "hidden"');
    expect(windowSrc).toContain("onDone: send");
    expect(windowSrc).toMatch(/^\s+fill$/m);
    expect(windowSrc).not.toContain("doneLabel");
    const ask = windowSrc.slice(windowSrc.indexOf("<HouseWindowAsk"), windowSrc.indexOf("/>", windowSrc.indexOf("<HouseWindowAsk")));
    expect(ask).toContain("title={SOCIAL.profile.discardTitle}");
    expect(ask).toContain("keepLabel={SOCIAL.profile.discardKeep}");
    expect(ask).toContain("discardLabel={SOCIAL.profile.discardConfirm}");
    expect(ask).toContain("lines={[]}");
    expect(windowSrc).toContain("win.ask(");
    // Every link out (the face, the name, the group, each commenter) takes
    // the one leave path; lib/social-comments-window covers what it does.
    const leave = windowSrc.slice(windowSrc.indexOf("const leave: SocialCommentLeave"), windowSrc.indexOf("const foot ="));
    expect(leave).toContain("socialCommentsLeave(event, {");
    expect(leave).toContain("modified: houseNavIgnorePendingClick(event),");
    expect(leave).toMatch(/^\s+dirty,$/m);
    expect(leave).toContain("ask: (go) => win.ask(go),");
    expect(leave).toContain("close: onClose,");
    expect(leave).toContain("push: (to) => router.push(to),");
    expect(windowSrc.split("<HouseLink").length - 1).toBe(3);
    expect(windowSrc.match(/onClick=\{\(event\) => onLeave\(event, (memberHref|groupHref)\)\}/g)).toHaveLength(3);
    expect(windowSrc.split("onLeave={leave}").length - 1).toBe(2);
    expect(rowSrc).toContain("onClick={(event) => onLeave(event, href)}");
    expect(windowSrc).toContain("useId");
    expect(windowSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(windowSrc).not.toMatch(/\bshadow-/);
    expect(windowSrc).not.toMatch(/\btruncate\b|line-clamp/);
  });
});
