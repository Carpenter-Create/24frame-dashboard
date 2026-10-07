import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
    loading,
  }: {
    src: string;
    className?: string;
    loading?: "eager" | "lazy";
  }) => createElement("img", { src, className, alt: "", loading }),
}));

const dynamicRegistry = vi.hoisted(() => ({
  resolve: (source: string): ((props: Record<string, unknown>) => unknown) | null =>
    source ? null : null,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options?: { ssr?: boolean }) => {
    if (options?.ssr === false) {
      return function MuxPlayerStub() {
        return null;
      };
    }
    const source = loader.toString();
    return function SocialDynamic(props: Record<string, unknown>) {
      const Comp = dynamicRegistry.resolve(source);
      if (!Comp) return null;
      return createElement(Comp as never, props);
    };
  },
}));

import { HOUSE_MODULE_CLASS } from "@/lib/house-shell";
import { HOUSE_PHONE_WRAP_CLASS, housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { IDENTITY_AVATAR_CLASS } from "@/lib/house-sheet";
import { SOCIAL, socialFeedRelativeTime, socialPostHref } from "@/lib/social";
import {
  SOCIAL_AVATAR_POST_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_IN_CARD_FILL_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_POST_WORDS_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_PROFILE_GRID_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS,
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_AVATAR_SLOT_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_TRAIL_CLASS,
  SOCIAL_PROFILE_HEADLINE_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_INTRO_CLASS,
  SOCIAL_PROFILE_MUTUALS_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_POSTS_EMPTY_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_PROFILE_ROLES_CLASS,
  SOCIAL_PROFILE_STAT_CLASS,
  SOCIAL_PROFILE_STAT_LABEL_CLASS,
  SOCIAL_PROFILE_STAT_VALUE_CLASS,
  SOCIAL_PROFILE_STATS_CLASS,
  SOCIAL_PROFILE_STATS_GRID_CLASS,
  SOCIAL_PROFILE_TAGLINE_CLASS,
  SOCIAL_PROFILE_TILE_CLASS,
} from "@/lib/social-chrome";
import { SocialAvatar } from "./social-avatar";
import { SocialConversationFaces } from "./social-conversation-faces";
import { SocialPersonRow } from "./social-person-row";
import { SocialAuthorHistory, SocialPostCard } from "./social-post-card";
import { SocialPostMedia } from "./social-post-media";
import { SocialProfileIdentity } from "./social-profile-identity";

dynamicRegistry.resolve = (source) =>
  source.includes("social-post-media") ? (SocialPostMedia as never) : null;

const here = dirname(fileURLToPath(import.meta.url));
const postSrc = readFileSync(join(here, "social-post-card.tsx"), "utf8");
const mediaSrc = readFileSync(join(here, "social-post-media.tsx"), "utf8");
const identitySrc = readFileSync(join(here, "social-profile-identity.tsx"), "utf8");
const personSrc = readFileSync(join(here, "social-person-row.tsx"), "utf8");
const avatarSrc = readFileSync(join(here, "social-avatar.tsx"), "utf8");

describe("SocialAvatar", () => {
  it("renders a signed photo URL as an img on the house identity circle", () => {
    const html = renderToStaticMarkup(
      <SocialAvatar name="Ada Lovelace" photoUrl="https://s3.example/signed-avatar" />,
    );
    expect(html).toContain('data-social-avatar=""');
    expect(html).toContain(IDENTITY_AVATAR_CLASS);
    expect(html).toContain("overflow-hidden");
    expect(html).toContain('src="https://s3.example/signed-avatar"');
    expect(html).not.toContain("AL");
  });

  it("keeps initials when the signed URL is null", () => {
    const html = renderToStaticMarkup(<SocialAvatar name="Ada Lovelace" photoUrl={null} />);
    expect(html).toContain(IDENTITY_AVATAR_CLASS);
    expect(html).toContain("AL");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("overflow-hidden");
  });
});

describe("SocialPersonRow", () => {
  it("prints handle above a real name and never prints Member", () => {
    const named = renderToStaticMarkup(
      <SocialPersonRow handle="joshua" displayName="Joshua A" photoUrl={null} href="/social/u/joshua" />,
    );
    expect(named).toContain("data-social-person-row");
    expect(named).toContain("data-social-person-handle");
    expect(named).toContain("@joshua");
    expect(named).toContain("Joshua A");
    expect(named.indexOf("@joshua")).toBeLessThan(named.indexOf("Joshua A"));
    expect(named).toContain('href="/social/u/joshua"');
    expect(named).not.toContain("truncate");

    const sentinel = renderToStaticMarkup(
      <SocialPersonRow handle="joshua" displayName="Member" photoUrl={null} />,
    );
    expect(sentinel).toContain("@joshua");
    expect(sentinel).not.toContain("Member");
    expect(sentinel).not.toContain("data-social-person-name");
    expect(personSrc).toContain("socialPersonIdentity");
  });
});

describe("SocialConversationFaces", () => {
  it("stacks two initials for a group room", () => {
    const html = renderToStaticMarkup(
      <SocialConversationFaces
        people={[
          { name: "Bob One", photoUrl: null },
          { name: "Carol One", photoUrl: null },
        ]}
      />,
    );
    expect(html).toContain("data-social-conversation-faces");
    expect(html).toContain("BO");
    expect(html).toContain("CO");
  });
});

describe("SocialPostCard faces", () => {
  it("shows the author photo when a signed URL is present", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: "https://s3.example/signed-avatar",
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [],
        }}
      />,
    );
    expect(html).toContain('src="https://s3.example/signed-avatar"');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain('href="/social/u/ada"');
    // Cards lock: a text-only post is the one post card (the soft grey
    // card at radius 24), not the Option A radius-16 module.
    expect(html).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    expect(html).not.toContain(HOUSE_MODULE_CLASS);
    expect(html).not.toContain("data-social-post-mobile");
    expect(html).not.toContain("hidden md:flex");
    expect(html).not.toContain("md:hidden");
    // The 40 credit avatar is a circle the photo fills: no grey behind a photo.
    const face = html.slice(html.indexOf("data-social-avatar"), html.indexOf("<img"));
    for (const cls of ["size-10", "shrink-0", "rounded-full", "overflow-hidden"]) {
      expect(face, cls).toMatch(new RegExp(`[" ]${cls}[" ]`));
    }
    expect(SOCIAL_AVATAR_POST_CLASS).toContain("size-10");
    expect(SOCIAL_AVATAR_POST_CLASS).toContain("rounded-full");
    expect(face).not.toContain("bg-surface");
    expect(html).not.toContain("/social/u/@");
    expect(html).not.toContain("AL");
    expect(html).not.toContain("data-social-avatar-ring");
    expect(html).not.toContain("ring-accent");
    expect(html).toContain("data-social-comment-open");
  });

  it("keeps author initials when the signed URL is null", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [],
        }}
      />,
    );
    expect(html).toContain("AL");
    expect(html).not.toContain("<img");
    // No photo: the initials sit on the in-card fill so the circle reads
    // on the grey card (cards lock: every post is a card).
    const face = html.slice(html.indexOf("data-social-avatar"), html.indexOf("AL"));
    expect(face).toContain("size-10");
    expect(face).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    const onPage = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1m",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        }}
      />,
    );
    // A media post is a card too: the same in-card fill behind the initials.
    const pageFace = onPage.slice(onPage.indexOf("data-social-avatar"), onPage.indexOf(">AL<"));
    expect(pageFace).toContain(SOCIAL_IN_CARD_FILL_CLASS);
  });

  it("reuses signed account faces and does not add a second upload", () => {
    expect(postSrc).toContain('from "./social-avatar"');
    expect(avatarSrc).toContain("photoUrl");
    expect(postSrc).toContain("photoUrl");
    expect(postSrc).not.toContain("signedAvatarUrl");
    expect(postSrc).not.toContain("putAvatarObject");
    expect(postSrc).not.toContain("uploadAccountPhoto");
    expect(postSrc).not.toContain("type=\"file\"");
    expect(postSrc).not.toContain("S3_BUCKET");
    expect(postSrc).not.toContain("24frame-media");
    expect(avatarSrc).not.toContain("signedAvatarUrl");
    expect(avatarSrc).toContain("onError");
    expect(avatarSrc).toContain("SocialMediaImage");
    expect(avatarSrc).not.toContain("<img");
    expect(mediaSrc).toContain("SocialMediaImage");
    expect(mediaSrc).toContain("SocialFeedVideo");
    expect(mediaSrc).not.toContain("<img");
    expect(mediaSrc).not.toContain("@next/next/no-img-element");
    expect(postSrc).not.toContain("<img");
    expect(postSrc).not.toContain("@next/next/no-img-element");
  });
});

describe("Social profile public face", () => {
  it("renders identity, bio, and author history through PostCard", () => {
    const identity = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl="https://s3.example/signed-avatar"
        bio="Writes engines."
        actions={<button type="button">Edit profile</button>}
      />,
    );
    expect(identity).toContain("Edit profile");
    expect(identitySrc).toContain("actions?: ReactNode");
    expect(identitySrc).not.toContain("actions?: () => ReactNode");
    expect(identitySrc).not.toContain("{actions()}");
    expect(identity).toContain("data-social-profile-identity");
    // Stage lock: every profile has the hero; no cover shows the band fill.
    expect(identity).toContain("data-social-profile-hero");
    expect(identity).not.toContain('data-social-profile-cover=""');
    expect(identity).toContain("data-social-profile-cover-empty");
    expect(identity).not.toContain("bg-accent-wash");
    expect(identity).toContain("data-social-profile-head");
    expect(identity).toContain("data-social-profile-face");
    expect(identity).toContain("data-social-profile-name");
    expect(identity).toContain("Ada Lovelace");
    expect(identity).toContain("data-social-profile-handle");
    expect(identity).toContain("@ada");
    expect(identity).toContain(SOCIAL_PROFILE_HANDLE_CLASS);
    expect(identity).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
    expect(identity.indexOf("data-social-profile-head")).toBeLessThan(identity.indexOf("data-social-profile-name"));
    expect(identity.indexOf("data-social-profile-name")).toBeLessThan(identity.indexOf("data-social-profile-face"));
    const identityHead = identity.slice(
      identity.indexOf("data-social-profile-head"),
      identity.indexOf("data-social-profile-face"),
    );
    expect(identityHead).toContain("border-[3px] border-band-ink");
    expect(identityHead).toContain("data-social-avatar");
    expect(identityHead.indexOf("data-social-profile-name")).toBeLessThan(identityHead.indexOf("data-social-profile-handle"));
    expect(identityHead).not.toContain("data-social-profile-stats");
    expect(identity).not.toContain("data-social-profile-stats");
    expect(identity).not.toContain("data-social-profile-mutuals");
    expect(identity).not.toContain("data-social-profile-url");
    expect(identity).not.toContain("24frame.co/@ada");
    expect(identity).not.toContain("Copies ");
    expect(identity).not.toContain("data-social-share-hint");
    expect(identitySrc).not.toContain("socialProfilePublicHost");
    expect(identitySrc).not.toContain("socialShareHint");
    expect(identitySrc).toContain("SocialProfileCover");
    expect(identitySrc).not.toContain("SocialProfileBanner");
    expect(identitySrc).not.toContain("socialProfileRendersCoverBand");
    expect(identitySrc).toContain("SOCIAL_PROFILE_STAGE_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_FACE_CLASS");
    expect(identitySrc).not.toContain("SOCIAL_PROFILE_META_CLASS");
    // Source order = phone order: hero, then intro, actions, stats, mutuals, roles, links.
    const identityMarkup = identitySrc.slice(identitySrc.indexOf('data-social-profile-identity=""'));
    const order = [
      'data-social-profile-hero=""',
      "data-social-profile-name",
      "data-social-profile-handle",
      'data-social-profile-face=""',
      "data-social-profile-headline",
      "data-social-profile-tagline",
      'data-social-profile-actions=""',
      "<SocialProfileStats",
      'data-social-profile-mutuals=""',
      'data-social-profile-roles=""',
      "<SocialProfileLinkRow",
    ];
    let at = -1;
    for (const marker of order) {
      const next = identityMarkup.indexOf(marker);
      expect(next, marker).toBeGreaterThan(at);
      at = next;
    }
    expect(identityMarkup).not.toContain("data-social-profile-topics");
    expect(identityMarkup).not.toContain("data-social-profile-topic=");
    expect(identity).toContain("Writes engines.");
    expect(identity).toContain('src="https://s3.example/signed-avatar"');
    expect(identity).not.toContain("data-social-profile-roles");
    expect(identity).not.toContain("data-social-profile-topics");
    expect(identity).not.toContain("data-social-profile-links");
    expect(identity).not.toContain("data-social-profile-imdb");

    const withRoles = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        roles={["actor", "producer", "screenwriter", "investor"]}
      />,
    );
    expect(withRoles).toContain("data-social-profile-roles");
    for (const slug of ["actor", "producer", "screenwriter", "investor"]) {
      expect(withRoles).toContain(`data-social-profile-role="${slug}"`);
    }
    expect(withRoles).toContain("Actor");
    expect(withRoles).toContain("Investor");
    expect(withRoles).not.toContain("Actor · Producer");
    expect(withRoles).not.toContain(" · ");
    expect(withRoles).not.toContain("data-social-profile-roles-more");
    expect(withRoles).not.toContain("+1");
    expect(withRoles).not.toContain("Roles:");
    expect(withRoles).not.toContain("Professions:");
    expect(withRoles).not.toContain("Topics:");
    // Stage lock: wrapping chips (phone never scrolls sideways), plain, no +N.
    expect(withRoles).toContain(`class="${SOCIAL_PROFILE_ROLES_CLASS}"`);
    expect(withRoles).toContain(SOCIAL_PROFILE_ROLE_PILL_CLASS);
    expect(SOCIAL_PROFILE_ROLES_CLASS).toContain("flex-wrap");
    expect(withRoles).not.toContain("data-house-chip-rail");
    expect(withRoles.slice(withRoles.indexOf("data-social-profile-roles"))).not.toContain("overflow-x-auto");
    expect(withRoles).not.toContain("text-[11px]");
    expect(withRoles).not.toContain("truncate");
    const roleRow = withRoles.slice(withRoles.indexOf("data-social-profile-roles"));
    expect(roleRow).not.toContain("<svg");
    expect(withRoles.indexOf("data-social-profile-name")).toBeLessThan(withRoles.indexOf("data-social-profile-roles"));
    expect(withRoles.indexOf('data-social-profile-role="actor"')).toBeLessThan(
      withRoles.indexOf('data-social-profile-role="investor"'),
    );
    expect(withRoles.indexOf('data-social-profile-role="investor"')).toBeLessThan(
      withRoles.indexOf('data-social-profile-role="producer"'),
    );
    expect(withRoles.indexOf('data-social-profile-role="producer"')).toBeLessThan(
      withRoles.indexOf('data-social-profile-role="screenwriter"'),
    );

    const adamDesktop = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Adam Carpenter"
        handle="adam"
        photoUrl={null}
        bio={"Founder · Investor · Music Executive\nBuilding For the Generations®"}
        roles={["executive_producer", "music_supervisor", "composer", "musician", "music_director"]}
      />,
    );
    expect(adamDesktop).toContain("Executive Producer");
    expect(adamDesktop).toContain("Music Supervisor");
    expect(adamDesktop).toContain("Music Director");
    expect(adamDesktop).not.toContain("data-social-profile-roles-more");
    expect(adamDesktop.replaceAll("calc(100%+2*var(--chrome-gutter))", "")).not.toContain("+2");
    // The bio's first line is the headline, the next the tagline (the mockup's text).
    const headlineAt = adamDesktop.indexOf("data-social-profile-headline");
    const taglineAt = adamDesktop.indexOf("data-social-profile-tagline");
    expect(adamDesktop.slice(headlineAt, taglineAt)).toContain(">Founder · Investor · Music Executive</p>");
    expect(adamDesktop.slice(taglineAt)).toContain(">Building For the Generations®</p>");
    expect(adamDesktop).toContain(SOCIAL_PROFILE_HEADLINE_CLASS);
    expect(adamDesktop).toContain(SOCIAL_PROFILE_TAGLINE_CLASS);
    expect(adamDesktop.indexOf("Adam Carpenter")).toBeLessThan(headlineAt);
    expect(taglineAt).toBeLessThan(adamDesktop.indexOf('data-social-profile-role="executive_producer"'));
    expect(adamDesktop.indexOf('data-social-profile-role="composer"')).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="executive_producer"'),
    );

    const ownerHint = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" bio="   " bioHint={SOCIAL.profile.ownFace} />,
    );
    expect(ownerHint).not.toContain("data-social-profile-headline");
    expect(ownerHint).toContain(`>${SOCIAL.profile.ownFace}</p>`);
    expect(ownerHint.slice(ownerHint.indexOf("data-social-profile-tagline"))).toContain("text-ink-2");

    const stacked = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        bio="Writes engines."
        stats={{ posts: 1, followers: 2, following: 3 }}
        roles={["actor"]}
        websiteUrl="https://example.com"
        actions={<button type="button">Edit profile</button>}
        mutuals={{
          people: [{ id: "u3", handle: "carol", displayName: "Carol", label: "Carol" }],
          extra: 0,
        }}
      />,
    );
    const stackOrder = [
      "data-social-profile-name",
      "data-social-profile-handle",
      "data-social-profile-headline",
      "data-social-profile-actions",
      "data-social-profile-stats",
      "data-social-profile-mutuals",
      "data-social-profile-roles",
      "data-social-profile-links",
    ];
    let stackAt = -1;
    for (const marker of stackOrder) {
      const next = stacked.indexOf(marker);
      expect(next, marker).toBeGreaterThan(stackAt);
      stackAt = next;
    }
    expect(stacked).not.toContain("data-social-profile-topics");
    expect(stacked).not.toContain("data-social-profile-cover-dims");

    const withStats = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        bio="Writes engines."
        stats={{ posts: 12, followers: 4, following: 7 }}
        roles={["actor"]}
        actions={<button type="button">Edit profile</button>}
      />,
    );
    expect(withStats).toContain(SOCIAL_PROFILE_HEAD_CLASS);
    expect(withStats).not.toContain("data-social-profile-meta");
    expect(withStats).toContain("size-16");
    expect(withStats).toContain("@min-[40rem]/hero:size-20");
    expect(withStats).not.toContain("size-20 ");
    expect(withStats).not.toContain("size-24");
    expect(withStats).toContain("data-social-profile-stats");
    expect(withStats).toContain(SOCIAL_PROFILE_STATS_CLASS);
    expect(withStats).toContain(SOCIAL_PROFILE_STATS_GRID_CLASS);
    // Phone: a surface-muted strip of three cells with hairline dividers.
    // Desktop: one inline row that wraps, value then label.
    const grid = SOCIAL_PROFILE_STATS_GRID_CLASS.split(" ");
    expect(grid).toEqual(
      expect.arrayContaining(["grid", "grid-cols-3", "rounded-[var(--radius-lg)]", "bg-surface-muted", "md:flex", "md:flex-wrap", "md:bg-transparent"]),
    );
    const cell = SOCIAL_PROFILE_STAT_CLASS.split(" ");
    expect(cell).toEqual(expect.arrayContaining(["border-l", "border-hairline", "first:border-l-0", "md:flex-row", "md:border-l-0"]));
    expect(SOCIAL_PROFILE_STAT_VALUE_CLASS).toContain("t-data");
    expect(SOCIAL_PROFILE_STAT_VALUE_CLASS).toContain("md:font-semibold");
    expect(SOCIAL_PROFILE_STAT_LABEL_CLASS).toContain("text-ink-2");
    expect(SOCIAL_PROFILE_STAT_LABEL_CLASS).toContain("break-words");
    expect(withStats).toContain('data-social-profile-stat="posts"');
    expect(withStats).toContain('href="/social/u/ada/follows"');
    expect(withStats).toContain('href="/social/u/ada/follows?tab=following"');
    const postsStat = withStats.slice(
      withStats.indexOf('data-social-profile-stat="posts"'),
      withStats.indexOf('data-social-profile-stat="followers"'),
    );
    expect(postsStat.indexOf(">12<")).toBeLessThan(postsStat.indexOf(`>${SOCIAL.profile.postsStat}<`));
    // Desktop reads the stats inline, so one is singular: "1 post", "1 follower".
    const ones = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" stats={{ posts: 1, followers: 1, following: 1 }} />,
    );
    const statText = (stat: string) => {
      const at = ones.indexOf(`data-social-profile-stat="${stat}"`);
      return ones.slice(at, ones.indexOf(stat === "posts" ? "</p>" : "</a>", at)).replace(/<[^>]+>/g, " ").replace(/^[^>]*>/, "").replace(/\s+/g, " ").trim();
    };
    expect(statText("posts")).toBe("1 post");
    expect(statText("followers")).toBe("1 follower");
    expect(statText("following")).toBe("1 following");
    const head = withStats.slice(withStats.indexOf("data-social-profile-head"), withStats.indexOf("data-social-profile-face"));
    expect(head).not.toContain("data-social-profile-stats");
    expect(head).not.toContain("data-social-profile-roles");
    expect(head.indexOf("data-social-avatar")).toBeLessThan(head.indexOf("data-social-profile-name"));
    expect(withStats).toContain(SOCIAL_PROFILE_ACTIONS_CLASS);
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("break-words");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("@container/profile flex");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).not.toContain("gap-");
    expect(withStats).not.toContain("truncate");
    expect(withStats).not.toContain("1784");
    expect(withStats).not.toContain("data-social-profile-copy");

    const withMutuals = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        mutuals={{
          people: [
            { id: "u3", handle: "carol", displayName: "Carol King", label: "Carol King" },
            { id: "u4", handle: "dan", displayName: "Dan", label: "Dan" },
          ],
          extra: 3,
        }}
      />,
    );
    expect(withMutuals).toContain("data-social-profile-mutuals");
    expect(withMutuals).toContain("Followed by Carol King, Dan +3 more");
    expect(withMutuals).not.toContain("data-social-profile-intro");

    const withImdb = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        imdbUrl="https://www.imdb.com/name/nm0000158/"
      />,
    );
    expect(withImdb).toContain("data-social-profile-imdb");
    expect(withImdb).toContain('data-social-profile-link="imdb"');
    expect(withImdb).toContain('data-social-profile-link-glyph="film-slate"');
    expect(withImdb).toContain('href="https://www.imdb.com/name/nm0000158/"');
    expect(withImdb).toContain(`aria-label="${SOCIAL.profile.imdb}"`);
    expect(withImdb).not.toContain(">imdb.com/name/nm0000158<");

    const withLinks = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        websiteUrl="https://instagram.com/ada"
      />,
    );
    expect(withLinks).toContain("data-social-profile-links");
    expect(withLinks).toContain('data-social-profile-link="instagram"');
    expect(withLinks).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(withLinks).toContain('href="https://instagram.com/ada"');
    expect(withLinks).toContain('aria-label="Instagram"');
    expect(withLinks).not.toContain(">instagram.com/ada<");
    expect(withLinks).toContain('rel="noopener noreferrer"');
    expect(withLinks).not.toContain("data-social-profile-links-more");

    const unknownHost = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        websiteUrl="https://ada.example/press"
      />,
    );
    expect(unknownHost).toContain('data-social-profile-link="website"');
    expect(unknownHost).toContain('data-social-profile-link-glyph="globe"');
    expect(unknownHost).toContain('href="https://ada.example/press"');
    expect(unknownHost).toContain(">ada.example</span>");
    expect(unknownHost).not.toContain(">website<");
    expect(unknownHost).not.toContain(">https://ada.example/press<");

    const overflow = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        websiteUrl={JSON.stringify(["https://instagram.com/ada", "https://youtube.com/@ada", "https://x.com/ada"])}
      />,
    );
    expect(overflow).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(overflow).toContain('data-social-profile-link-glyph="youtube-logo"');
    expect(overflow).toContain('data-social-profile-link-glyph="x-logo"');
    expect(overflow).not.toContain("data-social-profile-links-more");
    expect(overflow).not.toContain(">+1<");
    expect(overflow).not.toContain("data-social-profile-links-sheet");
    expect(identitySrc).not.toContain("socialProfileRolesLine");
    expect(identitySrc).toContain("socialProfileRolesRailItems");
    expect(identitySrc).not.toContain("HouseChipRail");
    expect(identitySrc).not.toContain("data-social-profile-roles-more");
    expect(identitySrc).not.toContain('item.kind === "more"');
    expect(personSrc).not.toContain("socialProfileRolesRailItems");

    const history = renderToStaticMarkup(
      <SocialAuthorHistory
        truncated={false}
        posts={[
          {
            id: "p1",
            body: "hello",
            likeCount: 0,
            liked: false,
            createdAt: "2026-09-13T12:00:00.000Z",
            authorId: "u1",
            authorHandle: "ada",
            authorName: "Ada Lovelace",
            authorPhotoUrl: null,
            groupSlug: null,
            groupName: null,
            canLike: false,
            media: [],
          },
        ]}
      />,
    );
    expect(history).toContain("data-social-author-history");
    expect(history).toContain("data-social-author-posts");
    expect(history).toContain(SOCIAL_FEED_GUTTER_CLASS);
    // Cards lock: the history is the wall of cards (8 / 16 apart); a
    // text-only post is the post card like every kind.
    expect(history).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    expect(history).not.toContain("divide-y divide-hairline");
    expect(history).not.toContain("border border-hairline bg-surface");
    expect(postSrc).not.toContain('className="flex flex-col bg-surface md:hidden"');
    expect(postSrc).not.toContain("data-social-post-mobile");
    expect(history).toContain('data-social-post="p1"');
    expect(history).toContain("hello");
    expect(history).not.toContain("data-social-profile-grid");
  });

  it("renders media and text posts as chronological feed cards, not an IG grid", () => {
    const html = renderToStaticMarkup(
      <SocialAuthorHistory
        truncated={false}
        posts={[
          {
            id: "clip",
            body: "Mux smoke",
            likeCount: 0,
            liked: false,
            createdAt: "2026-09-20T12:00:00.000Z",
            authorId: "u1",
            authorHandle: "ada",
            authorName: "Ada Lovelace",
            authorPhotoUrl: null,
            groupSlug: null,
            groupName: null,
            canLike: false,
            media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT" }],
          },
          {
            id: "note",
            body: "First caption post test",
            likeCount: 0,
            liked: false,
            createdAt: "2026-09-20T12:01:00.000Z",
            authorId: "u1",
            authorHandle: "ada",
            authorName: "Ada Lovelace",
            authorPhotoUrl: null,
            groupSlug: null,
            groupName: null,
            canLike: false,
            media: [],
          },
        ]}
      />,
    );
    expect(html).not.toContain("data-social-profile-grid");
    expect(html).not.toContain(SOCIAL_PROFILE_GRID_CLASS);
    expect(html).not.toContain(SOCIAL_PROFILE_TILE_CLASS);
    expect(html).not.toContain("aspect-square");
    expect(html).not.toContain("data-social-profile-play");
    expect(html).toContain(SOCIAL_FEED_GUTTER_CLASS);
    expect(html).not.toContain("aspect-video");
    expect(html).not.toContain("aspect-[4/5]");
    expect(html).toContain('data-social-post="clip"');
    expect(html).toContain("Mux smoke");
    // Cards lock: a video sits in the card's media block with the play
    // disc — no screen band and no "Video" word; a photo carries no kind word.
    expect(html).toContain('data-social-post-kind="video"');
    expect(html).toContain("data-social-post-play-disc");
    expect(html).not.toContain("data-social-post-screen-head");
    expect(html).not.toContain(`>${SOCIAL.post.videoLabel}<`);
    expect(html).not.toContain(SOCIAL.home.photoKind);
    expect(html).toContain('data-social-post="note"');
    expect(html).toContain("First caption post test");
    expect(html).not.toContain("View comments");
    expect(html).not.toContain("data-social-comment-trail");
    expect(html.indexOf('data-social-post="clip"')).toBeLessThan(html.indexOf('data-social-post="note"'));
  });

  it("shows an honest empty state and names the bound when truncated", () => {
    const empty = renderToStaticMarkup(<SocialAuthorHistory posts={[]} truncated={false} />);
    expect(empty).toContain("data-social-author-empty");
    expect(empty).toContain(SOCIAL.profile.postsEmpty);
    expect(empty).toContain(SOCIAL_PROFILE_POSTS_EMPTY_CLASS);
    expect(empty).not.toContain(SOCIAL_EMPTY_PANEL_CLASS);
    expect(empty).not.toContain("py-[var(--space-12)]");
    expect(empty).not.toContain(SOCIAL.profile.edit);
    expect(empty).not.toContain(SOCIAL.profile.completeIdentity);
    expect(empty).not.toContain(SOCIAL.profile.postsEmptyHint);
    expect(empty).not.toContain(SOCIAL.profile.postsEmptyOwnHint);

    const withCreate = renderToStaticMarkup(
      <SocialAuthorHistory
        posts={[]}
        truncated={false}
        emptyAction={{ href: "/social/create?kind=media", label: SOCIAL.profile.sharePost }}
      />,
    );
    expect(withCreate).toContain(SOCIAL.profile.sharePost);
    expect(withCreate).toContain("/social/create?kind=media");
    expect(withCreate).not.toContain(SOCIAL.profile.edit);
    expect(withCreate).not.toContain(SOCIAL.profile.completeIdentity);
    expect(withCreate).not.toContain("/social/profile/edit");
    expect(postSrc).toContain("SocialProfilePostsEmpty");
    expect(postSrc).not.toContain("emptySecondary");
    expect(postSrc).not.toContain("emptyHint");

    const truncated = renderToStaticMarkup(<SocialAuthorHistory posts={[]} truncated />);
    expect(truncated).toContain("data-social-author-truncated");
    expect(truncated).toContain(SOCIAL.profile.postsTruncated);
  });
});

describe("SocialPostCard media", () => {
  it("keeps feed media at its true shape (photo 1.91:1 … 4:5, video by its edges), never aspect-square", () => {
    const still = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        }}
      />,
    );
    // H · Posts: an image with no stored shape draws at the 4:5 default
    // until it loads; the frame carries the aspect as a style.
    expect(still).toContain("aspect-ratio:0.8");
    expect(still).toContain("object-cover");
    expect(still).toContain('loading="eager"');
    expect(still).not.toContain('loading="lazy"');
    expect(still).not.toContain("aspect-square");

    const clip = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p2",
          body: "clip",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT" }],
        }}
      />,
    );
    expect(clip).not.toContain("aspect-video");
    expect(clip).not.toContain("aspect-[4/5]");
    expect(clip).toContain("object-contain");
    expect(clip).toContain('loading="eager"');
    expect(clip).toContain('data-social-feed-video-poster=""');
    expect(clip).toContain("https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp?time=0");
    expect(clip).not.toContain("aspect-square");
    expect(clip).not.toContain("data-social-feed-video-frame=");

    const portrait = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p3",
          body: "tall",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", width: 1080, height: 1920 }],
        }}
      />,
    );
    expect(portrait).toContain('data-social-feed-video-frame="portrait"');
    // Cards lock: a 9:16 phone video draws 4:5 in the feed, the still
    // cover-cropped in the frame (the whole frame one tap away).
    expect(portrait).toContain("aspect-ratio:0.8");
    expect(portrait).not.toContain("height:auto");
    expect(portrait).toContain('data-social-feed-video-poster=""');
    expect(portrait).toContain('loading="eager"');
    expect(portrait).toContain("https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp?time=0");
    expect(portrait).not.toContain("aspect-video");
    expect(portrait).not.toContain("aspect-[4/5]");
    expect(portrait).not.toContain("aspect-square");
    expect(portrait).not.toContain("md:aspect");

    const landscape = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p4",
          body: "wide",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "video", url: "", playbackId: "WideMuxPlaybackId01", width: 1920, height: 1080 }],
        }}
      />,
    );
    expect(landscape).toContain('data-social-feed-video-frame="landscape"');
    expect(landscape).toContain(`aspect-ratio:${1920 / 1080}`);
    expect(landscape).not.toContain("aspect-[4/5]");
    expect(landscape).not.toContain("object-fill");

    const postCard = postSrc.slice(postSrc.indexOf("export function SocialPostCard"));
    const postMedia = mediaSrc.slice(mediaSrc.indexOf("export function SocialPostMedia"));
    expect(postCard).not.toContain("aspect-square");
    expect(postMedia).not.toContain("aspect-square");
    expect(postMedia).toContain("socialPostPhotoAspect");
    expect(postMedia).not.toContain("socialMediaFrameClass");
    expect(postMedia).toContain("socialFeedVideoFrame");
    expect(postMedia).toContain("data-social-feed-media-open");
    expect(postMedia).toContain("SOCIAL.post.viewPhoto");
    expect(postMedia).toContain("SOCIAL.post.viewVideo");
    expect(postCard).toContain("onOpen={setImmersiveIndex}");
    expect(postCard).toContain("muxBandId={muxBandId}");
    // No 560 cap on a photo or a video: each fills the card's media block
    // at its shape (a video held to 4:5 … 2.39:1, cards lock).
    expect(still).not.toContain("min(70vh,560px)");
    expect(still).toContain('aria-label="View photo"');
    expect(still).toContain(SOCIAL_POST_MEDIA_CLASS);
    expect(still).not.toContain(HOUSE_MODULE_CLASS);
    expect(clip).toContain('aria-label="View video"');
    expect(clip).not.toContain("min(70vh,560px)");
    expect(portrait).not.toContain("min(70vh");
    expect(landscape).not.toContain("min(70vh");
  });

  it("places the header (name, time) on top, then the caption, the media and the actions", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        }}
      />,
    );
    expect(html.indexOf("Ada Lovelace")).toBeGreaterThan(-1);
    // Cards lock: the header on top (name, then the time), the caption,
    // the media, then the actions.
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html.indexOf("data-social-post-time")).toBeLessThan(html.indexOf("data-social-post-caption"));
    expect(html.indexOf("data-social-post-caption")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    // No likes yet: no count beside the heart, no "0".
    expect(html).not.toContain("data-social-like-count");
    expect(html).not.toContain(`0 ${SOCIAL.post.likes}`);
    // The caption takes the one words style, never clamped.
    expect(html).toContain(`class="${SOCIAL_POST_WORDS_CLASS}"`);
    expect(SOCIAL_POST_WORDS_CLASS).not.toMatch(/line-clamp|truncate/);
    // No caption handle prefix: the name sits just above it.
    const caption = html.slice(html.indexOf("data-social-post-caption"));
    expect(caption.slice(0, caption.indexOf("</p>"))).not.toContain("font-semibold");
    // Plain words, not a link: the permalink is the time's 44 hit.
    expect(html.slice(html.lastIndexOf("<", html.indexOf("data-social-post-caption")))).toMatch(/^<p /);
    // The Option A card is gone: no module, no in-card pads, no optical pull.
    expect(html).not.toContain(HOUSE_MODULE_CLASS);
    expect(html).not.toContain("pb-[var(--space-6)]");
    expect(html).not.toContain("-ml-[var(--space-2)]");
    expect(html).not.toContain("divide-hairline");
    expect(html).not.toContain("border-y-2");
    expect(html).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
  });

  it("reads one like as singular and keeps a plural count", () => {
    const one = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 1,
          liked: true,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: true,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        }}
      />,
    );
    expect(one).toContain("data-social-like-count");
    // The count beside the heart is the bare number; its name says the words.
    expect(one).toContain('aria-label="1 like"');
    expect(one).not.toContain("1 likes");
    const oneCount = one.slice(one.indexOf("data-social-like-count"));
    expect(oneCount.slice(oneCount.indexOf(">") + 1, oneCount.indexOf("</button>"))).toBe("1");
    const many = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p2",
          body: "hello",
          likeCount: 4,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: true,
          media: [],
        }}
      />,
    );
    expect(many).toContain(`4 ${SOCIAL.post.likes}`);
    // The round heart on the card takes the in-card round (the page white;
    // dark --surface-muted, lighter than the dark --surface card).
    expect(many).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    const heart = many.slice(many.indexOf("data-social-like="), many.indexOf("data-social-like-count"));
    expect(heart).toContain(SOCIAL_POST_ROUND_CLASS);
    expect(many).not.toContain("mt-[10px]");
  });

  it("renders signed image and video URLs", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [
            { kind: "image", url: "https://cf.example/signed-image" },
            { kind: "video", url: "https://cf.example/signed-video" },
          ],
        }}
      />,
    );
    // A legacy video (no Mux playback, no still) cannot draw: the card
    // drops it (cards lock), so the still is one frame, not a swipe of two.
    expect(html).toContain("data-social-post-media");
    expect(html).not.toContain("data-social-post-carousel");
    expect(html).toContain('data-social-post-image=""');
    expect(html).toContain('src="https://cf.example/signed-image"');
    expect(html).not.toContain("1 of 2");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("signed-video");
    expect(html).not.toContain("grid-cols");

    const singleVideo = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p1v",
          body: "hello",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "video", url: "https://cf.example/signed-video" }],
        }}
      />,
    );
    // Alone, the legacy video leaves a text card (never the bare black strip).
    expect(singleVideo).toContain('data-social-post-kind="text"');
    expect(singleVideo).not.toContain("data-social-post-video");
    expect(singleVideo).not.toContain("data-social-post-screen");
    expect(singleVideo).not.toContain("signed-video");
    expect(singleVideo).not.toContain("<video");
    expect(singleVideo).not.toContain("data-social-post-carousel");

    const mux = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p2",
          body: "clip",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT" }],
        }}
      />,
    );
    expect(mux).toContain('data-social-mux-player="uNbxnGLKJ00yfbijDO8COxT"');
    expect(mediaSrc).toContain("SocialFeedVideo");

    const cheese = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "cheese",
          body: "Cheese please test",
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-28T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "adam",
          authorName: "Adam",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [
            {
              kind: "video",
              url: "",
              playbackId: "uNbxnGLKJ00yfbijDO8COxT",
              playbackPolicy: "signed",
            },
          ],
        }}
      />,
    );
    expect(cheese).toContain("Cheese please test");
    expect(cheese).toContain('data-social-mux-player="uNbxnGLKJ00yfbijDO8COxT"');
    expect(cheese).toContain('data-social-mux-playback="pending"');
    expect(cheese).not.toContain("data-social-post-image");
    expect(cheese).not.toContain("data-social-feed-video-poster");
    expect(cheese).not.toContain("image.mux.com");
    expect(cheese).not.toContain("<img");
    expect(cheese).not.toContain("<video");
  });

  it("swipes two or more media as one carousel and keeps a single frame for one", () => {
    const multi = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p4",
          body: "two stills",
          likeCount: 4,
          commentCount: 1,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: true,
          media: [
            { kind: "image", url: "https://cf.example/one.jpg" },
            { kind: "image", url: "https://cf.example/two.jpg" },
            { kind: "video", url: "https://cf.example/proxy.mp4", playbackId: "playback123456" },
          ],
        }}
      />,
    );
    expect(multi).toContain("data-social-post-carousel");
    expect(multi).toContain("data-social-post-carousel-track");
    expect(multi).toContain("snap-x");
    expect(multi).toContain("social-feed-carousel-slide");
    expect(multi.match(/data-social-post-carousel-slide/g)?.length).toBe(3);
    expect(multi.match(/data-social-post-carousel-dot="/g)?.length).toBe(3);
    expect(multi).toContain('data-social-post-carousel-dot="active"');
    // The counter: "1 / 3" on the photo (a chip), "1 of 3" for the live region.
    expect(multi).toContain("1 of 3");
    expect(multi).toContain('<span aria-hidden="true">1 / 3</span>');
    expect(multi).toContain("Show media 1 of 3");
    expect(multi).toContain('data-social-mux-player="playback123456"');
    expect(multi).not.toContain("proxy.mp4");
    expect(multi).not.toContain("<video");
    expect(multi).not.toContain("grid-cols");
    expect(multi).not.toContain("collage");
    // Cards lock: header → caption → the swipe → the actions with counts.
    expect(multi.indexOf("Ada Lovelace")).toBeLessThan(multi.indexOf("data-social-post-caption"));
    expect(multi.indexOf("two stills")).toBeLessThan(multi.indexOf("data-social-post-carousel"));
    expect(multi.indexOf("data-social-post-carousel")).toBeLessThan(multi.indexOf("data-social-post-actions"));
    expect(multi.indexOf("data-social-post-actions")).toBeLessThan(multi.indexOf(`4 ${SOCIAL.post.likes}`));
    expect(multi).not.toContain("truncate");

    const mediaOnly = renderToStaticMarkup(
      <SocialPostCard
        post={{
          id: "p5",
          body: null,
          likeCount: 0,
          liked: false,
          createdAt: "2026-09-12T14:00:00.000Z",
          authorId: "u1",
          authorHandle: "ada",
          authorName: "Ada Lovelace",
          authorPhotoUrl: null,
          groupSlug: null,
          groupName: null,
          canLike: false,
          media: [
            { kind: "image", url: "https://cf.example/one.jpg" },
            { kind: "image", url: "https://cf.example/two.jpg" },
          ],
        }}
      />,
    );
    expect(mediaOnly).not.toContain("data-social-post-caption");
    expect(mediaOnly.indexOf("data-social-post-carousel")).toBeLessThan(
      mediaOnly.indexOf("data-social-post-actions"),
    );
    expect(mediaOnly).toContain("1 of 2");
  });
});

// Cards lock (founder 2026-10-06): the post face everywhere SocialPostCard
// renders — one card, the header on top, the words, the media, the round
// actions with counts beside. Replaces H · Posts (the media as the card,
// the credit row under it) and the Option A blend before it.
// docs/design-locks/social-feed-cards-lock-v1.md
describe("SocialPostCard cards", () => {
  const createdAt = "2026-09-12T14:00:00.000Z";

  function cardPost(overrides: Partial<Parameters<typeof SocialPostCard>[0]["post"]> = {}) {
    return {
      id: "p1",
      body: "hello",
      likeCount: 4,
      commentCount: 2,
      liked: false,
      createdAt,
      authorId: "u1",
      authorHandle: "ada",
      authorName: "Ada Lovelace",
      authorPhotoUrl: null,
      groupSlug: null,
      groupName: null,
      canLike: true,
      media: [] as { kind: "image"; url: string }[],
      ...overrides,
    };
  }

  it("draws header (name, time) → caption → media → round actions with counts on a photo post", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={cardPost({
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        })}
      />,
    );
    expect(html).toContain('data-social-post-kind="photo"');
    expect(html).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    expect(html).not.toContain(HOUSE_MODULE_CLASS);
    const mediaOpen = html.slice(
      html.indexOf("data-social-post-media"),
      html.indexOf(">", html.indexOf("data-social-post-media")) + 1,
    );
    // Inside the card: the media block (inset on desktop, edge to edge on phone), no frame.
    expect(mediaOpen).toContain(`class="${SOCIAL_POST_MEDIA_CLASS}"`);
    expect(mediaOpen).not.toContain("border");
    expect(html).toContain('data-social-post-time=""');
    expect(html).toContain(socialFeedRelativeTime(createdAt));
    expect(html).toContain(SOCIAL_POST_TIME_CLASS);
    expect(html).not.toMatch(/data-social-post-time=""[^>]*\bt-label\b/);
    // The time is in the header, above the media.
    expect(html.slice(0, html.indexOf("data-social-post-media"))).toContain("data-social-post-time");
    expect(html).toContain(`href="${socialPostHref("p1")}"`);
    expect(html).toContain(`data-social-post-href="${socialPostHref("p1")}"`);
    expect(html).toContain('data-social-post-actions=""');
    expect(html).toContain('data-social-icon="heart"');
    expect(html).toContain('data-social-icon="chat-circle"');
    expect(html).toContain('data-social-post-share=""');
    expect(html).toContain('data-social-icon="paper-plane-tilt"');
    expect(html).toContain('data-social-comment-open=""');
    expect(html).not.toContain("data-social-post-share-sheet");
    expect(html).not.toContain("data-social-comment-thread");
    // Counts beside the rounds: Like "4" (named "4 likes"), Comment "2"
    // inside "Comment, 2 comments".
    expect(html).toContain("data-social-like-count");
    expect(html).toContain(`aria-label="4 ${SOCIAL.post.likes}"`);
    expect(html).toContain('aria-label="Comment, 2 comments"');
    expect(html).toContain('data-social-comment-count=""');
    expect(html).toContain('data-social-post-caption=""');
    expect(html).toContain("hello");
    // No comment trail, no likes line, no under-post time line.
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).not.toContain(`2 ${SOCIAL.post.comments}<`);
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html.indexOf("data-social-post-time")).toBeLessThan(html.indexOf("data-social-post-caption"));
    expect(html.indexOf("data-social-post-caption")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html).not.toContain("data-social-post-mobile");
    expect(html).not.toContain("hidden md:flex");
    expect(html).not.toContain("md:hidden");
    expect(html).not.toContain("text-[10px]");
    // No role eyebrow yet ("Members choose one; no line until they do").
    expect(html).not.toContain("uppercase");
    expect(html).not.toContain(SOCIAL.home.videoKind);
    expect(html).not.toContain(SOCIAL.home.photoKind);
    expect(html).not.toContain(SOCIAL.follow.following);
    expect(html).not.toContain("truncate");
  });

  it("keeps a media-only post as header → media → actions with no caption", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={cardPost({
          body: null,
          commentCount: 0,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        })}
      />,
    );
    expect(html).not.toContain("data-social-post-caption");
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-time")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html.indexOf("data-social-post-time")).toBeLessThan(html.indexOf(`4 ${SOCIAL.post.likes}`));
    // No comments: the round alone, named "Comment", no count.
    expect(html).toContain('aria-label="Comment"');
    expect(html).not.toContain("data-social-comment-count");
  });

  it("draws a text-only post as the same card, its body in the one words style", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard post={cardPost({ commentCount: 0, media: [] })} />,
    );
    expect(html).not.toContain("data-social-post-media");
    expect(html).toContain('data-social-post-kind="text"');
    expect(html).toContain(`class="${SOCIAL_FEED_CARD_CLASS}"`);
    expect(html).toContain(`class="${SOCIAL_POST_WORDS_CLASS}"`);
    // On the card: the round actions on the in-card fill; the time in the header's meta.
    expect(html).toContain(`class="${SOCIAL_POST_ROUND_CLASS}"`);
    expect(html.slice(0, html.indexOf("data-social-post-actions"))).toContain("data-social-post-time");
    expect(html.indexOf("data-social-post-caption")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html).toContain('data-social-icon="chat-circle"');
    expect(html.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).not.toContain("View comments");
    expect(html).not.toContain(`0 ${SOCIAL.post.comments}`);
    expect(html).toContain("hello");
    expect(html).not.toContain(SOCIAL.create.text);
  });

  it("puts the comment count beside the round, never as a trail under the caption", () => {
    const quiet = renderToStaticMarkup(<SocialPostCard post={cardPost({ commentCount: 0 })} />);
    expect(quiet.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(quiet).not.toContain("data-social-comment-trail");
    expect(quiet).not.toContain("data-social-comment-count");
    expect(quiet).not.toContain(`0 ${SOCIAL.post.comments}`);

    const active = renderToStaticMarkup(<SocialPostCard post={cardPost({ commentCount: 3 })} />);
    expect(active).not.toContain("data-social-comment-trail");
    expect(active.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(active).toContain('aria-label="Comment, 3 comments"');
    const count = active.slice(active.indexOf("data-social-comment-count"));
    expect(count.slice(count.indexOf(">") + 1, count.indexOf("</span>"))).toBe("3");
    // The count sits in the action row at the card's end, after the words.
    expect(active.indexOf("data-social-post-caption")).toBeLessThan(active.indexOf("data-social-comment-count"));
    expect(active).not.toContain("View comments");
    expect(active).not.toContain("text-center");
    const one = renderToStaticMarkup(<SocialPostCard post={cardPost({ commentCount: 1 })} />);
    expect(one).toContain('aria-label="Comment, 1 comment"');
  });

  it("keeps the time in the header's meta: a 44 permalink hit on phone, no separator line", () => {
    const label = socialFeedRelativeTime(createdAt);
    expect(label).toMatch(/^\d+d$/);
    expect(label).not.toMatch(/ago|Yesterday|:/);
    const html = renderToStaticMarkup(
      <SocialPostCard post={cardPost({ media: [{ kind: "image", url: "https://cf.example/i" }] })} />,
    );
    const timeLink = html.slice(html.lastIndexOf("<a", html.indexOf("data-social-post-time")), html.indexOf("data-social-post-time"));
    expect(timeLink).toContain(SOCIAL_POST_TIME_CLASS);
    expect(housePhoneForbidsTruncate(SOCIAL_POST_TIME_CLASS)).toBe(true);
    expect(html).not.toContain("divide-y");
    expect(html).not.toContain("divide-hairline");
    expect(html).not.toContain("border-y-2");
    const quiet = renderToStaticMarkup(
      <SocialPostCard post={cardPost()} permalink={false} />,
    );
    expect(quiet).toContain("data-social-post-time");
    expect(quiet.indexOf("data-social-post-time")).toBeLessThan(quiet.indexOf("data-social-post-caption"));
    expect(quiet).not.toContain(`href="${socialPostHref("p1")}"`);
  });

  it("composes one face in source: no breakpoint fork, the round actions, the post kind", () => {
    const postCard = postSrc.slice(postSrc.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("className={SOCIAL_FEED_CARD_CLASS}");
    expect(postCard).toContain("socialPostKind(media)");
    expect(postCard).toContain("className={SOCIAL_POST_TIME_CLASS}");
    expect(postCard).toContain("socialFeedRelativeTime");
    expect(postCard).not.toContain("socialRelativeTime");
    expect(postCard).toContain("socialPostHref");
    expect(postCard).toContain("SocialLikeButton");
    expect(postCard).toContain("SocialLikeCount");
    expect(postCard).toContain("SocialCommentTrigger");
    expect(postCard).toContain("SocialPostShareButton");
    expect(postCard).toContain("<SocialCommentTrigger post={thread} round />");
    expect(postCard).toContain("<SocialPostShareButton postId={post.id} round />");
    expect(postCard).toContain("className={SOCIAL_POST_ACTIONS_CLASS}");
    expect(postCard).not.toContain("SOCIAL_FEED_ROW_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(postCard.split("<SocialCommentTrigger").length - 1).toBe(1);
    expect(postCard).not.toContain("viewComments");
    expect(postCard).not.toContain("View comments");
    expect(postCard).not.toContain("hidden md:flex");
    expect(postCard).not.toContain("md:hidden");
    expect(postCard).not.toContain("data-social-post-mobile");
    expect(postCard).not.toContain("text-[10px]");
    expect(postCard).not.toContain("SOCIAL.home.videoKind");
    expect(postCard).not.toContain("SOCIAL.home.photoKind");
    expect(postCard).not.toContain("SOCIAL.create.text");
    expect(postCard).not.toContain("SOCIAL.follow.following");
  });
});

// Stage lock (docs/design-locks/social-profile-stage-lock-v1.md): the name
// and handle sit on the hero, over the scrim, bottom-left, in band-ink.
function expectNameOnHero(html: string) {
  const hero = html.slice(html.indexOf("data-social-profile-hero"), html.indexOf("data-social-profile-face"));
  expect(hero).toContain(SOCIAL_PROFILE_HERO_CLASS);
  expect(hero).toContain(SOCIAL_PROFILE_HEAD_CLASS);
  expect(hero).toContain(SOCIAL_PROFILE_AVATAR_ROW_CLASS);
  expect(hero).toContain(SOCIAL_PROFILE_AVATAR_SLOT_CLASS);
  expect(hero).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
  expect(hero).not.toContain("-mt-[calc(");
  expect(hero).not.toContain("md:-mt-");
  expect(hero).not.toContain("data-social-profile-avatar-hang");
  expect(hero.indexOf("data-social-avatar")).toBeLessThan(hero.indexOf("data-social-profile-name"));
  const nameAt = hero.indexOf("data-social-profile-name=");
  const handleAt = hero.indexOf("data-social-profile-handle");
  expect(handleAt).toBeGreaterThan(nameAt);
  const nameOpen = hero.slice(hero.lastIndexOf("<", nameAt), hero.indexOf(">", nameAt));
  expect(nameOpen).toContain("t-title");
  expect(nameOpen).toContain("text-band-ink");
  expect(nameOpen).not.toContain("text-ink ");
  expect(nameOpen).not.toContain("truncate");
}

describe("Profile Stage lock — hero", () => {
  it("shows the cover layer under the identity when a visitor has a cover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" coverUrl="https://cf.example/cover.jpg" />,
    );
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("data-social-profile-head-trail");
    const hero = html.slice(html.indexOf("data-social-profile-hero"), html.indexOf("data-social-profile-face"));
    expect(hero.indexOf('data-social-profile-cover=""')).toBeLessThan(hero.indexOf("data-social-profile-head"));
    expectNameOnHero(html);
  });

  it("keeps the band-filled hero for a visitor with no cover, so the name stays legible", () => {
    const html = renderToStaticMarkup(<SocialProfileIdentity name="Ada Lovelace" handle="ada" coverUrl="   " />);
    expect(html).toContain('data-social-profile-hero="" data-social-profile-cover-empty=""');
    expect(html).not.toContain('data-social-profile-cover=""');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("bg-accent-wash");
    expect(html).not.toContain("aspect-[4/1]");
    expectNameOnHero(html);
  });

  it("wraps a long name and handle on the hero, never truncating", () => {
    const longName = "Adam Carpenter Builds For the Generations Across a Very Long Display Name";
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name={longName}
        handle="acarpcreate-of-a-very-long-handle"
        coverUrl="https://cf.example/dark-cover.jpg"
        stats={{ posts: 2, followers: 1, following: 1 }}
      />,
    );
    expectNameOnHero(html);
    expect(html).toContain(longName);
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_NAME_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_HANDLE_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_HERO_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_HEADLINE_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_TAGLINE_CLASS)).toBe(true);
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("text-ellipsis");
  });

  it("gives the owner Edit cover on the stage and the trail under the hero", () => {
    const visitor = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" coverUrl="https://cf.example/cover.jpg" />,
    );
    expect(visitor).not.toContain("data-social-profile-head-trail");
    const hop = renderToStaticMarkup(<SocialProfileIdentity name="Ada Lovelace" handle="ada" coverUrl={null} />);
    expect(hop).not.toContain("data-social-profile-head-trail");
    const editor = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        coverUrl={null}
        coverEdit={<button type="button" data-social-profile-cover-edit="">Add cover photo</button>}
      />,
    );
    expect(editor).toContain('data-social-profile-head-trail=""');
    expect(editor).toContain(SOCIAL_PROFILE_HEAD_TRAIL_CLASS);
    expect(editor).toMatch(/data-social-profile-head-trail="" class="[^"]*"><\/div>/);
    // Edit cover renders on the stage after the (clipped) hero; the trail
    // follows the stage, above the face.
    const stageAt = editor.indexOf("data-social-profile-stage");
    const editAt = editor.indexOf("data-social-profile-cover-edit");
    const trailAt = editor.indexOf("data-social-profile-head-trail");
    expect(editor.indexOf("data-social-profile-handle")).toBeLessThan(editAt);
    expect(stageAt).toBeLessThan(editAt);
    expect(editAt).toBeLessThan(trailAt);
    expect(trailAt).toBeLessThan(editor.indexOf("data-social-profile-face"));
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).toContain("empty:hidden");
    expect(SOCIAL_PROFILE_HEAD_TRAIL_CLASS).not.toContain("calc(");
  });

  it("lays the face out by the mockup: two columns from md once the column is 35rem, one column otherwise", () => {
    const step = "md:@min-[35rem]/profile:";
    const face = SOCIAL_PROFILE_FACE_CLASS.split(" ");
    expect(face).toEqual(expect.arrayContaining(["flex", "flex-col", `${step}grid`, `${step}grid-cols-[minmax(0,1fr)_auto]`]));
    // Actions: the right column in the two-column step; on phone every action stretches.
    expect(SOCIAL_PROFILE_ACTIONS_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["max-md:*:flex-1", `${step}col-start-2`, `${step}row-start-1`, `${step}row-span-4`]),
    );
    for (const [value, row] of [
      [SOCIAL_PROFILE_INTRO_CLASS, 1],
      [SOCIAL_PROFILE_STATS_CLASS, 2],
      [SOCIAL_PROFILE_MUTUALS_CLASS, 3],
    ] as const) {
      expect(value.split(" ")).toEqual(expect.arrayContaining([`${step}col-start-1`, `${step}row-start-${row}`]));
    }
    expect(SOCIAL_PROFILE_ROLES_CLASS.split(" ")).toEqual(expect.arrayContaining([`${step}col-span-2`, `${step}row-start-5`]));
    // Headline 17 → 20 at title weight; tagline 15 ink-2.
    expect(SOCIAL_PROFILE_HEADLINE_CLASS).toContain("text-[length:var(--text-base)]");
    expect(SOCIAL_PROFILE_HEADLINE_CLASS).toContain("md:text-[length:var(--text-lg)]");
    expect(SOCIAL_PROFILE_HEADLINE_CLASS).toContain("[font-weight:var(--type-title-weight)]");
    expect(SOCIAL_PROFILE_TAGLINE_CLASS).toContain("t-body-sm");
    expect(SOCIAL_PROFILE_TAGLINE_CLASS).toContain("text-ink-2");
    // Pills: Edit profile / Follow accent 44, Share / Following hairline 44.
    expect(SOCIAL_PROFILE_ACTION_PILL_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["min-h-11", "rounded-full", "bg-accent", "text-accent-contrast"]),
    );
    expect(SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["min-h-11", "rounded-full", "border-hairline", "bg-surface"]),
    );
  });

  it("keeps the avatar and its edit badge on the hero with the scrim behind the text", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        coverUrl="https://cf.example/cover.jpg"
        photoAction={<button type="button" data-social-profile-avatar-edit="">Edit picture</button>}
        coverEdit={<button type="button" data-social-profile-cover-edit="">Edit cover</button>}
      />,
    );
    const slotAt = html.indexOf("data-social-profile-avatar-slot");
    expect(html.indexOf("data-social-profile-avatar-edit")).toBeGreaterThan(slotAt);
    expect(html.indexOf("data-social-profile-avatar-edit")).toBeLessThan(html.indexOf("data-social-profile-name-stack"));
    const openTag = (marker: string) => {
      const at = html.indexOf(marker);
      return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at));
    };
    // The avatar row eases from band/75 (the name stack's solid fill) to clear.
    expect(openTag("data-social-profile-avatar-row")).toContain("color-mix(in_oklab,var(--band)_75%,transparent),");
    expect(openTag("data-social-profile-name-stack")).toContain("bg-band/75");
    expect(openTag("data-social-profile-head=")).toContain("group-has-[[data-social-cover-drag]]/hero:hidden");
  });
});
