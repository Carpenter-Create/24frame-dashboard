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
  }: {
    src: string;
    className?: string;
  }) => createElement("img", { src, className, alt: "" }),
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

import { HOUSE_CHIP_RAIL_CLASS } from "@/lib/house-chip-rail";
import { HOUSE_PHONE_WRAP_CLASS, housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { IDENTITY_AVATAR_CLASS } from "@/lib/house-sheet";
import { SOCIAL, socialFeedRelativeTime, socialPostHref } from "@/lib/social";
import {
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_AVATAR_PROFILE_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_PROFILE_GRID_CLASS,
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_FACE_LEAD_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HEAD_OVERLAP_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_STATS_LEAD_CLASS,
  SOCIAL_PROFILE_POSTS_EMPTY_CLASS,
  SOCIAL_PROFILE_ROLE_PILL_CLASS,
  SOCIAL_PROFILE_ROLES_RAIL_ROWS,
  SOCIAL_PROFILE_ROLES_ROW_CLASS,
  SOCIAL_PROFILE_STAT_CLASS,
  SOCIAL_PROFILE_STAT_LABEL_CLASS,
  SOCIAL_PROFILE_STAT_VALUE_CLASS,
  SOCIAL_PROFILE_STATS_CLASS,
  SOCIAL_PROFILE_STATS_GRID_CLASS,
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
    expect(html).toContain("bg-surface");
    expect(html).toContain(SOCIAL_FEED_ROW_CLASS);
    expect(html).not.toContain("data-social-post-mobile");
    expect(html).not.toContain("hidden md:flex");
    expect(html).not.toContain("md:hidden");
    expect(SOCIAL_FEED_ROW_CLASS).toMatch(/(?:^|\s)bg-surface(?:\s|$)/);
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("bg-surface-muted");
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
  });

  it("reuses signed account faces and does not add a second upload", () => {
    expect(postSrc).toContain('from "./social-avatar"');
    expect(avatarSrc).toContain("IDENTITY_AVATAR_CLASS");
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
    expect(identity).not.toContain('data-social-profile-cover=""');
    expect(identity).not.toContain("data-social-profile-cover-empty");
    expect(identity).not.toContain("h-[112px]");
    expect(identity).not.toContain("bg-accent-wash");
    expect(identity).toContain("data-social-profile-head");
    expect(identity).toContain("data-social-profile-face");
    expect(identity).toContain("data-social-profile-name");
    expect(identity).toContain("Ada Lovelace");
    expect(identity).toContain("data-social-profile-handle");
    expect(identity).toContain("@ada");
    expect(identity).toContain(SOCIAL_PROFILE_HANDLE_CLASS);
    expect(identity).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain("text-ink-2");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toContain("t-title");
    expect(identity.indexOf("data-social-profile-head")).toBeLessThan(
      identity.indexOf("data-social-profile-name"),
    );
    expect(identity.indexOf("data-social-profile-name")).toBeLessThan(
      identity.indexOf("data-social-profile-face"),
    );
    const identityHead = identity.slice(
      identity.indexOf("data-social-profile-head"),
      identity.indexOf("data-social-profile-face"),
    );
    expect(identityHead).not.toContain("-mt-[40px]");
    expect(identityHead).not.toContain("md:-mt-");
    expect(identityHead).toContain("border-2 border-surface");
    expect(identityHead).toContain("data-social-avatar");
    expect(identityHead).toContain("data-social-profile-name");
    expect(identityHead).toContain("Ada Lovelace");
    expect(identityHead).toContain("data-social-profile-handle");
    expect(identityHead).toContain("@ada");
    expect(identityHead.indexOf("data-social-profile-name")).toBeLessThan(
      identityHead.indexOf("data-social-profile-handle"),
    );
    expect(identityHead).not.toContain("data-social-profile-stats");
    expect(identity).not.toContain("data-social-profile-stats");
    expect(identity).not.toContain("data-social-profile-mutuals");
    expect(identity).not.toContain("data-social-profile-url");
    expect(identity).not.toContain("24frame.co/@ada");
    expect(identity).not.toContain("https://24frame.co/@ada");
    expect(identity).not.toContain("Copies ");
    expect(identity).not.toContain("data-social-share-hint");
    expect(identitySrc).not.toContain("socialProfilePublicHost");
    expect(identitySrc).not.toContain("socialShareHint");
    expect(identitySrc).toContain("data-social-profile-head");
    expect(identitySrc).toContain("SocialProfileBanner");
    expect(identitySrc).toContain("socialProfileRendersCoverBand");
    expect(identitySrc).toContain("SOCIAL_PROFILE_COVER_STACK_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_HEAD_OVERLAP_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_INSET_CLASS");
    expect(identitySrc).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(identitySrc).not.toContain("data-social-profile-meta");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    const identityMarkup = identitySrc.slice(identitySrc.indexOf("data-social-profile-identity"));
    expect(identityMarkup.indexOf("data-social-profile-head")).toBeLessThan(
      identityMarkup.indexOf("data-social-profile-name"),
    );
    expect(identityMarkup.indexOf("data-social-profile-name")).toBeLessThan(
      identityMarkup.indexOf("data-social-profile-handle"),
    );
    expect(identityMarkup.indexOf("data-social-profile-handle")).toBeLessThan(
      identityMarkup.indexOf("data-social-profile-face"),
    );
    expect(identityMarkup.indexOf("data-social-profile-face")).toBeLessThan(
      identityMarkup.indexOf("SocialProfileStats"),
    );
    expect(identityMarkup.indexOf("SocialProfileStats")).toBeLessThan(
      identityMarkup.indexOf("data-social-profile-bio"),
    );
    expect(identityMarkup.indexOf("HouseChipRail")).toBeLessThan(
      identityMarkup.indexOf("<SocialProfileLinkRow"),
    );
    expect(identityMarkup.indexOf("<SocialProfileLinkRow")).toBeLessThan(
      identityMarkup.indexOf("{actionRow}"),
    );
    expect(identityMarkup.indexOf("{actionRow}")).toBeLessThan(
      identityMarkup.indexOf("data-social-profile-mutuals"),
    );
    expect(identityMarkup).not.toContain("data-social-profile-topics");
    expect(identityMarkup).not.toContain("data-social-profile-topic");
    expect(identitySrc).toContain("data-social-profile-handle");
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
    expect(withRoles).toContain('data-social-profile-role="actor"');
    expect(withRoles).toContain('data-social-profile-role="producer"');
    expect(withRoles).toContain('data-social-profile-role="screenwriter"');
    expect(withRoles).toContain('data-social-profile-role="investor"');
    expect(withRoles).toContain("Actor");
    expect(withRoles).toContain("Producer");
    expect(withRoles).toContain("Screenwriter");
    expect(withRoles).toContain("Investor");
    expect(withRoles).not.toContain("Actor · Producer");
    expect(withRoles).not.toContain(" · ");
    expect(withRoles).not.toContain("data-social-profile-roles-more");
    expect(withRoles).not.toContain("+1");
    expect(withRoles).not.toContain("Roles:");
    expect(withRoles).not.toContain("Professions:");
    expect(withRoles).not.toContain("Topics:");
    expect(withRoles).toContain(SOCIAL_PROFILE_ROLES_ROW_CLASS);
    expect(withRoles).toContain(SOCIAL_PROFILE_ROLE_PILL_CLASS);
    expect(SOCIAL_PROFILE_ROLES_RAIL_ROWS).toBe(1);
    expect(SOCIAL_PROFILE_ROLES_ROW_CLASS).toBe(HOUSE_CHIP_RAIL_CLASS);
    expect(SOCIAL_PROFILE_ROLES_ROW_CLASS).toContain("overflow-x-auto");
    expect(SOCIAL_PROFILE_ROLES_ROW_CLASS).toContain("no-scrollbar");
    expect(SOCIAL_PROFILE_ROLES_ROW_CLASS).not.toContain("flex-wrap");
    expect(withRoles).toContain("data-house-chip-rail");
    expect(withRoles).toContain('data-house-chip-rail-row="0"');
    expect(withRoles).not.toContain('data-house-chip-rail-row="1"');
    expect(withRoles).toContain("overflow-x-auto");
    expect(withRoles).toContain("no-scrollbar");
    expect(withRoles).not.toContain("flex-wrap");
    expect(withRoles).toContain("bg-surface-muted");
    expect(withRoles).toContain("rounded-full");
    expect(withRoles).toContain("t-body-sm");
    expect(withRoles).toContain("h-8");
    expect(withRoles).not.toContain("py-[var(--space-2)]");
    expect(withRoles).not.toContain("text-[11px]");
    expect(withRoles).not.toContain("truncate");
    expect(withRoles.indexOf("data-social-profile-name")).toBeLessThan(
      withRoles.indexOf("data-social-profile-roles"),
    );
    expect(withRoles.indexOf("Ada Lovelace")).toBeLessThan(
      withRoles.indexOf('data-social-profile-role="actor"'),
    );
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
        bio="Founder · Investor · Music Executive"
        roles={[
          "executive_producer",
          "music_supervisor",
          "composer",
          "musician",
          "music_director",
        ]}
      />,
    );
    expect(adamDesktop).toContain('data-social-profile-role="executive_producer"');
    expect(adamDesktop).toContain('data-social-profile-role="music_supervisor"');
    expect(adamDesktop).toContain('data-social-profile-role="composer"');
    expect(adamDesktop).toContain('data-social-profile-role="musician"');
    expect(adamDesktop).toContain('data-social-profile-role="music_director"');
    expect(adamDesktop).toContain("Executive Producer");
    expect(adamDesktop).toContain("Music Supervisor");
    expect(adamDesktop).toContain("Composer");
    expect(adamDesktop).toContain("Musician");
    expect(adamDesktop).toContain("Music Director");
    expect(adamDesktop).not.toContain("data-social-profile-roles-more");
    expect(adamDesktop).not.toContain("+2");
    expect(adamDesktop).not.toContain("Executive Producer · Music Supervisor · Composer +2");
    expect(adamDesktop).not.toContain("Executive Producer · Music Supervisor");
    expect(adamDesktop).toContain("Founder · Investor · Music Executive");
    expect(adamDesktop.indexOf("Adam Carpenter")).toBeLessThan(
      adamDesktop.indexOf("Founder · Investor · Music Executive"),
    );
    expect(adamDesktop.indexOf("Founder · Investor · Music Executive")).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="executive_producer"'),
    );
    expect(adamDesktop.indexOf('data-social-profile-role="composer"')).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="executive_producer"'),
    );
    expect(adamDesktop.indexOf('data-social-profile-role="executive_producer"')).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="music_director"'),
    );
    expect(adamDesktop.indexOf('data-social-profile-role="music_director"')).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="music_supervisor"'),
    );
    expect(adamDesktop.indexOf('data-social-profile-role="music_supervisor"')).toBeLessThan(
      adamDesktop.indexOf('data-social-profile-role="musician"'),
    );
    const adamRoles = adamDesktop.slice(
      adamDesktop.indexOf("data-social-profile-roles"),
      adamDesktop.indexOf('data-social-profile-role="musician"') + 280,
    );
    expect(adamRoles).toContain("data-house-chip-rail");
    expect(adamRoles).toContain('data-house-chip-rail-row="0"');
    expect(adamRoles).not.toContain('data-house-chip-rail-row="1"');
    expect(adamRoles).toContain("overflow-x-auto");
    expect(adamRoles).toContain("no-scrollbar");
    expect(adamRoles).not.toContain("flex-wrap");
    expect(adamRoles).toContain("Executive Producer");
    expect(adamRoles).toContain("Music Supervisor");
    expect(adamRoles).toContain("Composer");
    expect(adamRoles).toContain("Musician");
    expect(adamRoles).toContain("Music Director");
    expect(adamRoles).not.toContain("+2");
    expect(adamRoles).not.toContain("data-social-profile-roles-more");

    const withRolesOnly = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        roles={["actor"]}
      />,
    );
    expect(withRolesOnly).toContain("data-social-profile-roles");
    expect(withRolesOnly).toContain('data-social-profile-role="actor"');
    expect(withRolesOnly).not.toContain("data-social-profile-topics");
    expect(withRolesOnly).not.toContain("data-social-profile-topic");
    expect(withRolesOnly).not.toContain("Topics:");

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
      "data-social-profile-stats",
      "data-social-profile-bio",
      "data-social-profile-roles",
      "data-social-profile-links",
      "data-social-profile-actions",
      "data-social-profile-mutuals",
    ];
    let stackAt = -1;
    for (const marker of stackOrder) {
      const at = stacked.indexOf(marker);
      expect(at, marker).toBeGreaterThan(stackAt);
      stackAt = at;
    }
    expect(stacked).not.toContain("data-social-profile-topics");
    expect(stacked).not.toContain("data-social-profile-topic");
    expect(stacked).toContain("data-social-profile-roles");
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
    expect(withStats).toContain("data-social-profile-head");
    expect(withStats).toContain(SOCIAL_PROFILE_HEAD_CLASS);
    expect(withStats).not.toContain("data-social-profile-meta");
    expect(SOCIAL_PROFILE_HEAD_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_HEAD_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toContain("items-end");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toContain("items-center");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toContain("items-start");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toContain("gap-[var(--space-4)]");
    expect(withStats).toContain(SOCIAL_AVATAR_PROFILE_CLASS);
    expect(withStats).toContain("size-20");
    expect(withStats).not.toContain("size-[72px]");
    expect(withStats).not.toContain("md:size-[88px]");
    expect(withStats).not.toContain("size-24");
    expect(withStats).toContain("data-social-profile-stats");
    expect(withStats).toContain(SOCIAL_PROFILE_STATS_CLASS);
    expect(withStats).toContain(SOCIAL_PROFILE_STATS_GRID_CLASS);
    expect(SOCIAL_PROFILE_STATS_CLASS).toBe("w-full min-w-0");
    expect(SOCIAL_PROFILE_STATS_CLASS).not.toContain("w-fit");
    expect(SOCIAL_PROFILE_STATS_CLASS).not.toContain("max-w-xs");
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).toContain("flex-wrap");
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).toContain("gap-x-[var(--space-8)]");
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).toContain("border-b border-hairline");
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).not.toContain("inline-flex");
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).not.toContain("grid-cols-3");
    expect(withStats).not.toContain("grid w-full grid-cols-3");
    expect(withStats).not.toContain("flex min-w-0 max-w-xs flex-1 items-center");
    expect(withStats).toContain(SOCIAL_PROFILE_STAT_CLASS);
    expect(SOCIAL_PROFILE_STAT_CLASS).toContain("items-start");
    expect(SOCIAL_PROFILE_STAT_CLASS).toContain("text-left");
    expect(SOCIAL_PROFILE_STAT_CLASS).not.toContain("text-center");
    expect(withStats).toContain(SOCIAL_PROFILE_STAT_VALUE_CLASS);
    expect(SOCIAL_PROFILE_STAT_VALUE_CLASS).toContain("t-heading");
    expect(SOCIAL_PROFILE_STAT_VALUE_CLASS).toContain("t-data");
    expect(SOCIAL_PROFILE_STAT_VALUE_CLASS).not.toContain("font-semibold");
    expect(withStats).toContain(SOCIAL_PROFILE_STAT_LABEL_CLASS);
    expect(SOCIAL_PROFILE_STAT_LABEL_CLASS).toContain("text-ink-3");
    expect(SOCIAL_PROFILE_STAT_LABEL_CLASS).not.toContain("t-label");
    expect(SOCIAL_PROFILE_STAT_LABEL_CLASS).toContain("break-words");
    expect(withStats).toContain('data-social-profile-stat="posts"');
    expect(withStats).toContain('data-social-profile-stat="followers"');
    expect(withStats).toContain('data-social-profile-stat="following"');
    expect(withStats).toContain('href="/social/u/ada/follows"');
    expect(withStats).toContain('href="/social/u/ada/follows?tab=following"');
    expect(withStats).not.toContain("/social/u/ada/follows?tab=followers");
    const postsStat = withStats.slice(
      withStats.indexOf('data-social-profile-stat="posts"'),
      withStats.indexOf('data-social-profile-stat="followers"'),
    );
    expect(postsStat.indexOf(">12<")).toBeLessThan(postsStat.indexOf(`>${SOCIAL.profile.postsStat}<`));
    const head = withStats.slice(
      withStats.indexOf("data-social-profile-head"),
      withStats.indexOf("data-social-profile-face"),
    );
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("data-social-profile-name");
    expect(head).toContain("Ada Lovelace");
    expect(head).toContain("data-social-profile-handle");
    expect(head).toContain("@ada");
    expect(head).toContain(SOCIAL_PROFILE_HANDLE_CLASS);
    expect(head.indexOf("data-social-profile-name")).toBeLessThan(
      head.indexOf("data-social-profile-handle"),
    );
    expect(head).not.toContain("data-social-profile-stats");
    expect(head).not.toContain("data-social-profile-roles");
    expect(head).not.toContain("data-social-profile-bio");
    expect(head.indexOf("data-social-avatar")).toBeLessThan(
      head.indexOf("data-social-profile-name"),
    );
    expect(withStats.indexOf("data-social-profile-name")).toBeLessThan(
      withStats.indexOf("data-social-profile-face"),
    );
    expect(withStats.indexOf("data-social-profile-face")).toBeLessThan(
      withStats.indexOf("data-social-profile-stats"),
    );
    expect(withStats.indexOf("data-social-profile-stats")).toBeLessThan(
      withStats.indexOf("data-social-profile-bio"),
    );
    expect(withStats.indexOf("data-social-profile-bio")).toBeLessThan(
      withStats.indexOf("data-social-profile-roles"),
    );
    expect(withStats.indexOf("data-social-profile-roles")).toBeLessThan(
      withStats.indexOf("data-social-profile-actions"),
    );
    expect(withStats.indexOf("data-social-profile-actions")).toBeLessThan(
      withStats.indexOf("Edit profile"),
    );
    expect(withStats).toContain(SOCIAL_PROFILE_ACTIONS_CLASS);
    expect(SOCIAL_PROFILE_ACTIONS_CLASS).toContain("mt-[var(--space-3)]");
    expect(SOCIAL_PROFILE_ACTIONS_CLASS).not.toContain("mt-[12px]");
    expect(SOCIAL_PROFILE_ACTIONS_CLASS).not.toContain("mt-[16px]");
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("break-words");
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("t-heading");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("t-title");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toMatch(/md:|max-md:|text-\[/);
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("font-semibold");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("mt-[var(--space-3)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toContain("flex-1");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toContain("--space-1");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toBe("flex flex-col");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).not.toContain("gap-");
    expect(withStats).not.toContain("truncate");
    expect(withStats).not.toContain("1784");
    expect(withStats).not.toContain("data-social-profile-cover-dims");
    expect(withStats).toContain("Actor");
    expect(withStats).not.toContain("flex-wrap gap-4");
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
    expect(withMutuals).not.toContain("data-social-profile-bio");

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
    expect(withImdb).not.toContain(">https://www.imdb.com/name/nm0000158/<");

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
    expect(withLinks).not.toContain(">https://instagram.com/ada<");
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
    expect(unknownHost).toContain('aria-label="ada.example"');
    expect(unknownHost).not.toContain(">website<");
    expect(unknownHost).not.toContain(">https://ada.example/press<");

    const overflow = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        photoUrl={null}
        websiteUrl={JSON.stringify([
          "https://instagram.com/ada",
          "https://youtube.com/@ada",
          "https://x.com/ada",
        ])}
      />,
    );
    expect(overflow).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(overflow).toContain('data-social-profile-link-glyph="youtube-logo"');
    expect(overflow).toContain('data-social-profile-link-glyph="x-logo"');
    expect(overflow).not.toContain("data-social-profile-links-more");
    expect(overflow).not.toContain(">+1<");
    expect(overflow).not.toContain(">instagram.com/ada<");
    expect(overflow).not.toContain(">x.com/ada<");
    expect(overflow).not.toContain("data-social-profile-links-sheet");
    expect(identitySrc).not.toContain("socialProfileRolesLine");
    expect(identitySrc).toContain("socialProfileRolesRailItems");
    expect(identitySrc).toContain("HouseChipRail");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ROLES_RAIL_ROWS");
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
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide-y");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("bg-surface-muted");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("py-");
    expect(history).toContain(SOCIAL_FEED_ROW_CLASS);
    expect(history).not.toContain("divide-y divide-hairline");
    expect(history).not.toContain("border border-hairline bg-surface");
    expect(SOCIAL_FEED_ROW_CLASS).toMatch(/(?:^|\s)bg-surface(?:\s|$)/);
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("bg-surface-muted");
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
    expect(html).toContain("aspect-video");
    expect(html).toContain('data-social-post="clip"');
    expect(html).toContain("Mux smoke");
    expect(html).not.toContain(SOCIAL.home.videoKind);
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
  it("keeps feed media on the 4:5 / 16:9 frame SoT, never aspect-square", () => {
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
    expect(still).toContain("aspect-[4/5]");
    expect(still).toContain("object-cover");
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
    expect(clip).toContain("aspect-video");
    expect(clip).toContain("object-cover");
    expect(clip).not.toContain("aspect-square");

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
          media: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", width: 1080, height: 1350 }],
        }}
      />,
    );
    expect(portrait).toContain("aspect-[4/5]");
    expect(portrait).not.toContain("aspect-square");

    const postCard = postSrc.slice(postSrc.indexOf("export function SocialPostCard"));
    const postMedia = mediaSrc.slice(mediaSrc.indexOf("export function SocialPostMedia"));
    expect(postCard).not.toContain("aspect-square");
    expect(postMedia).not.toContain("aspect-square");
    expect(postMedia).toContain("socialMediaFrameClass");
    expect(postMedia).toContain("data-social-feed-media-open");
    expect(postMedia).toContain("SOCIAL.post.viewPhoto");
    expect(postMedia).toContain("SOCIAL.post.viewVideo");
    expect(postCard).toContain("<SocialPostMedia items={post.media} onOpen={setImmersiveIndex} />");
    expect(still).toContain("min(70vh,560px)");
    expect(still).toContain('aria-label="View photo"');
    expect(still).toContain("max-md:-mx-");
    expect(clip).toContain('aria-label="View video"');
    expect(clip).toContain("min(70vh,560px)");
  });

  it("places caption under media, actions, and likes when both exist", () => {
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
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html).not.toContain("data-social-like-count");
    expect(html).not.toContain(`0 ${SOCIAL.post.likes}`);
    expect(html.indexOf("data-social-post-actions")).toBeLessThan(html.indexOf("data-social-post-caption"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("hello"));
    expect(html).toContain("mt-[10px]");
    expect(html).toContain("gap-[6px]");
    expect(html).toContain("pb-[var(--space-2)]");
    expect(html).not.toContain("pb-[var(--space-6)]");
    expect(html).toContain("-ml-[var(--space-2)]");
    expect(html).toContain("gap-2");
    expect(html).not.toContain("divide-hairline");
    expect(html).not.toContain("border-hairline");
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
    expect(one).toContain("1 like");
    expect(one).not.toContain("1 likes");
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
    expect(many).toContain("mt-[var(--space-2)]");
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
    expect(html).toContain("data-social-post-media");
    expect(html).toContain("data-social-post-carousel");
    expect(html).toContain('data-social-post-image=""');
    expect(html).toContain('src="https://cf.example/signed-image"');
    expect(html).toContain("1 of 2");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("signed-video");
    expect(html).not.toContain("grid-cols");
    expect(html).toContain("data-social-carousel-mux-missing");

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
    expect(singleVideo).toContain("data-social-post-video");
    expect(singleVideo).toContain("data-social-video-closed");
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
    expect(multi).toContain("1 of 3");
    expect(multi).toContain("Show media 1 of 3");
    expect(multi).toContain('data-social-mux-player="playback123456"');
    expect(multi).not.toContain("proxy.mp4");
    expect(multi).not.toContain("<video");
    expect(multi).not.toContain("grid-cols");
    expect(multi).not.toContain("collage");
    expect(multi.indexOf("Ada Lovelace")).toBeLessThan(multi.indexOf("data-social-post-carousel"));
    expect(multi.indexOf("data-social-post-carousel")).toBeLessThan(multi.indexOf("data-social-post-actions"));
    expect(multi.indexOf("data-social-post-actions")).toBeLessThan(multi.indexOf(`4 ${SOCIAL.post.likes}`));
    expect(multi.indexOf(`4 ${SOCIAL.post.likes}`)).toBeLessThan(multi.indexOf("data-social-post-caption"));
    expect(multi.indexOf("data-social-post-carousel")).toBeLessThan(multi.indexOf("two stills"));
    expect(multi.indexOf(`4 ${SOCIAL.post.likes}`)).toBeLessThan(multi.indexOf("two stills"));
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

describe("SocialPostCard 24Frame blend", () => {
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

  it("places caption under media, actions, and likes when the post has both text and media", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard
        post={cardPost({
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        })}
      />,
    );
    expect(html).toContain(SOCIAL_FEED_ROW_CLASS);
    expect(html).toContain("max-md:px-[var(--chrome-gutter)]");
    expect(html).not.toContain("px-[var(--space-4)]");
    const mediaOpen = html.slice(
      html.indexOf("data-social-post-media"),
      html.indexOf(">", html.indexOf("data-social-post-media")) + 1,
    );
    expect(mediaOpen).toContain("w-full");
    expect(mediaOpen).toContain("px-0");
    expect(mediaOpen).toContain("max-md:-mx-[var(--chrome-gutter)]");
    expect(mediaOpen).not.toContain("px-[var(--space-4)]");
    const media = html.slice(html.indexOf("data-social-post-media"), html.indexOf("data-social-post-actions"));
    expect(media).not.toContain("md:rounded-[8px]");
    expect(media).not.toContain("rounded-");
    expect(html).toContain('data-social-post-time=""');
    expect(html).toContain(socialFeedRelativeTime(createdAt));
    expect(html).toContain(SOCIAL_POST_TIME_CLASS);
    expect(html).not.toMatch(/data-social-post-time=""[^>]*\bt-label\b/);
    expect(html.slice(0, html.indexOf("data-social-post-media"))).not.toContain("data-social-post-time");
    expect(html).toContain(`href="${socialPostHref("p1")}"`);
    expect(html).toContain(`data-social-post-href="${socialPostHref("p1")}"`);
    expect(html).toContain("data-social-like-count");
    expect(html).toContain('data-social-post-actions=""');
    expect(html).toContain('data-social-icon="heart"');
    expect(html).toContain('data-social-icon="chat-circle"');
    expect(html).toContain('data-social-post-share=""');
    expect(html).toContain('data-social-icon="paper-plane-tilt"');
    expect(html).toContain('data-social-comment-open=""');
    expect(html).not.toContain("data-social-post-share-sheet");
    expect(html).not.toContain("data-social-comment-thread");
    expect(html).toContain(`4 ${SOCIAL.post.likes}`);
    expect(html).toContain('data-social-post-caption=""');
    expect(html).toContain("ada");
    expect(html).toContain("hello");
    expect(html).toContain(`2 ${SOCIAL.post.comments}`);
    expect(html).toContain("data-social-comment-trail");
    expect(html).toContain("self-start text-left");
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html.indexOf("data-social-post-actions")).toBeLessThan(html.indexOf(`4 ${SOCIAL.post.likes}`));
    expect(html.indexOf(`4 ${SOCIAL.post.likes}`)).toBeLessThan(html.indexOf("data-social-post-caption"));
    expect(html.indexOf("data-social-post-caption")).toBeLessThan(html.indexOf("data-social-comment-trail"));
    expect(html.indexOf("data-social-comment-trail")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html).not.toContain("data-social-post-mobile");
    expect(html).not.toContain("hidden md:flex");
    expect(html).not.toContain("md:hidden");
    expect(html).not.toContain("text-[10px]");
    expect(html).not.toContain("uppercase");
    expect(html).not.toContain(SOCIAL.home.videoKind);
    expect(html).not.toContain(SOCIAL.home.photoKind);
    expect(html).not.toContain(SOCIAL.follow.following);
    expect(html).not.toContain("truncate");
  });

  it("keeps media-only posts as author, media, actions, likes", () => {
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
    expect(html.slice(0, html.indexOf("data-social-post-media"))).not.toContain("data-social-post-time");
    expect(html.indexOf("Ada Lovelace")).toBeLessThan(html.indexOf("data-social-post-media"));
    expect(html.indexOf("data-social-post-media")).toBeLessThan(html.indexOf("data-social-post-actions"));
    expect(html.indexOf("data-social-post-actions")).toBeLessThan(html.indexOf(`4 ${SOCIAL.post.likes}`));
    expect(html.indexOf(`4 ${SOCIAL.post.likes}`)).toBeLessThan(html.indexOf("data-social-post-time"));
  });

  it("keeps the same stack for text-only posts and hides the trail when N is 0", () => {
    const html = renderToStaticMarkup(
      <SocialPostCard post={cardPost({ commentCount: 0, media: [] })} />,
    );
    expect(html).not.toContain("data-social-post-media");
    expect(html.slice(0, html.indexOf("data-social-post-actions"))).not.toContain("data-social-post-time");
    expect(html.indexOf("data-social-post-caption")).toBeLessThan(html.indexOf("data-social-post-time"));
    expect(html.indexOf("data-social-post-actions")).toBeLessThan(html.indexOf(`4 ${SOCIAL.post.likes}`));
    expect(html.indexOf(`4 ${SOCIAL.post.likes}`)).toBeLessThan(html.indexOf("data-social-post-caption"));
    expect(html).toContain('data-social-icon="chat-circle"');
    expect(html.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).not.toContain("View comments");
    expect(html).not.toContain(`0 ${SOCIAL.post.comments}`);
    expect(html).toContain("hello");
    expect(html).not.toContain(SOCIAL.create.text);
  });

  it("shows a left muted N comments trail only when N > 0", () => {
    const quiet = renderToStaticMarkup(<SocialPostCard post={cardPost({ commentCount: 0 })} />);
    expect(quiet.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(quiet).not.toContain("data-social-comment-trail");
    expect(quiet).not.toContain("View comments");
    expect(quiet).not.toContain(`0 ${SOCIAL.post.comments}`);

    const active = renderToStaticMarkup(<SocialPostCard post={cardPost({ commentCount: 3 })} />);
    expect(active).toContain("data-social-comment-trail");
    expect(active).toContain("self-start text-left t-body-sm text-ink-2");
    expect(active).toContain(`3 ${SOCIAL.post.comments}`);
    expect(active.match(/data-social-comment-open/g)?.length).toBe(2);
    expect(active.indexOf("data-social-post-caption")).toBeLessThan(
      active.indexOf("data-social-comment-trail"),
    );
    expect(active.indexOf("data-social-comment-trail")).toBeLessThan(
      active.indexOf("data-social-post-time"),
    );
    expect(active).not.toContain("View comments");
    expect(active).not.toContain("text-center");
  });

  it("keeps under-post time as muted separator chrome without a post hairline", () => {
    const label = socialFeedRelativeTime(createdAt);
    expect(label).toMatch(/^\d+d$/);
    expect(label).not.toMatch(/ago|Yesterday|:/);
    const html = renderToStaticMarkup(<SocialPostCard post={cardPost()} />);
    const timeOpen = html.slice(
      html.indexOf("data-social-post-time"),
      html.indexOf(">", html.indexOf("data-social-post-time")) + 1,
    );
    expect(timeOpen).toContain("text-ink-3");
    expect(timeOpen).not.toContain("text-ink-2");
    expect(timeOpen).not.toMatch(/(?:^|\s)text-ink(?:\s|$)/);
    expect(timeOpen).not.toContain("truncate");
    expect(housePhoneForbidsTruncate(SOCIAL_POST_TIME_CLASS)).toBe(true);
    expect(SOCIAL_POST_TIME_CLASS).toContain("break-words");
    expect(SOCIAL_POST_TIME_CLASS).not.toMatch(/md:|max-md:/);
    expect(html).not.toContain("divide-y");
    expect(html).not.toContain("divide-hairline");
    expect(html).not.toContain("border-b");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide");
    expect(SOCIAL_POST_TIME_CLASS).toMatch(/(?:^|\s)block(?:\s|$)/);
    expect(SOCIAL_POST_TIME_CLASS).toContain("leading-none");
    expect(SOCIAL_FEED_ROW_CLASS).toContain("pb-[var(--space-2)]");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("pb-[var(--space-6)]");
    expect(SOCIAL_FEED_ROW_CLASS).not.toMatch(/md:pb-|max-md:pb-/);
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("border");
    const lock = readFileSync("docs/design-locks/social-feed-under-post-time-lock-v1.md", "utf8");
    expect(lock).toContain("social-home-craft-wave-1-lock-v1.md");
    expect(lock).toContain("text-ink-3");
    expect(lock).toContain("8–12");
    expect(lock).toContain("pb-[var(--space-2)]");
    expect(lock).toContain("stacking is **out**");
    const quiet = renderToStaticMarkup(
      <SocialPostCard post={cardPost()} permalink={false} />,
    );
    expect(quiet).toContain("data-social-post-time");
    expect(quiet.slice(0, quiet.indexOf("data-social-post-actions"))).not.toContain(
      "data-social-post-time",
    );
    expect(quiet.indexOf("data-social-post-caption")).toBeLessThan(
      quiet.indexOf("data-social-post-time"),
    );
    expect(quiet).not.toContain(`href="${socialPostHref("p1")}"`);
  });

  it("does not fork desktop meta-row chrome in source", () => {
    const postCard = postSrc.slice(postSrc.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("SOCIAL_FEED_ROW_CLASS");
    expect(postCard).toContain("data-social-post-time");
    expect(postCard).toContain("SOCIAL_POST_TIME_CLASS");
    expect(postCard).toContain("socialFeedRelativeTime");
    expect(postCard).not.toContain("socialRelativeTime");
    expect(postCard).not.toContain("data-social-post-time=\"\" className=\"t-label");
    const authorRow = postCard.slice(
      postCard.indexOf('className="flex min-w-0 items-center gap-2.5"'),
      postCard.indexOf("{media ?"),
    );
    expect(authorRow).not.toContain("data-social-post-time");
    expect(authorRow).not.toContain("{time}");
    const row = postCard.slice(postCard.indexOf("className={SOCIAL_FEED_ROW_CLASS}"));
    expect(row.indexOf("<SocialCommentTrigger post={thread} />")).toBeLessThan(row.indexOf("{time}"));
    expect(postCard).toContain("socialPostHref");
    expect(postCard).toContain("SocialLikeButton");
    expect(postCard).toContain("SocialLikeCount");
    expect(postCard).toContain("SocialCommentTrigger");
    expect(postCard).toContain("SocialPostShareButton");
    expect(postCard).toContain("SOCIAL_POST_ACTIONS_CLASS");
    expect(postCard).toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(postCard).not.toContain("gap-3.5");
    expect(postCard).not.toContain("gap-4");
    expect(postCard.split("<SocialCommentTrigger").length - 1).toBe(2);
    expect(postCard).toContain("<SocialCommentTrigger post={thread} icon />");
    expect(postCard).toContain("<SocialCommentTrigger post={thread} />");
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

function expectNameBelowCover(html: string) {
  const head = html.slice(
    html.indexOf("data-social-profile-head"),
    html.indexOf("data-social-profile-face"),
  );
  expect(head).toContain(SOCIAL_PROFILE_HEAD_OVERLAP_CLASS);
  expect(head).toContain("-mt-[40px]");
  expect(head).not.toContain("md:-mt-");
  expect(head).toContain(SOCIAL_PROFILE_HEAD_CLASS);
  expect(head).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
  expect(head).not.toContain("items-end");
  expect(head).not.toContain("data-social-profile-avatar-hang");
  expect(head.indexOf("data-social-avatar")).toBeLessThan(head.indexOf("data-social-profile-name"));
  const nameAt = head.indexOf("data-social-profile-name");
  const handleAt = head.indexOf("data-social-profile-handle");
  expect(handleAt).toBeGreaterThan(nameAt);
  const nameOpen = head.slice(head.lastIndexOf("<", nameAt), head.indexOf(">", nameAt));
  expect(nameOpen).toContain("t-heading");
  expect(nameOpen).not.toContain("t-title");
  expect(nameOpen).toContain("text-ink");
  expect(nameOpen).not.toContain("text-white");
  expect(nameOpen).not.toContain("text-band-ink");
  expect(nameOpen).not.toContain("truncate");
  expect(head.slice(nameAt)).not.toContain("-mt-[40px]");
}

describe("Social profile cover band", () => {
  it("lips the whole head column so the name starts under the avatar", () => {
    const identity = identitySrc.slice(identitySrc.indexOf("export function SocialProfileIdentity"));
    expect(identity).not.toContain("data-social-profile-avatar-hang");
    expect(identity).not.toContain("SOCIAL_PROFILE_HEAD_ON_COVER_CLASS");
    expect(identity).not.toContain("SOCIAL_PROFILE_NAME_STACK_ON_COVER_CLASS");
    const headHost = identity.slice(
      identity.indexOf('data-social-profile-head=""'),
      identity.indexOf("data-social-profile-name"),
    );
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_OVERLAP_CLASS");
    expect(headHost).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(headHost).toContain("SocialAvatar");
    expect(headHost.indexOf("SocialAvatar")).toBeLessThan(
      headHost.indexOf("SOCIAL_PROFILE_NAME_STACK_CLASS"),
    );
  });

  it("omits the empty band and avatar hang for a visitor with no cover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" coverUrl="   " />,
    );
    expect(html).not.toContain('data-social-profile-cover=""');
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("h-[112px]");
    expect(html).not.toContain("md:h-[224px]");
    expect(html).not.toContain("bg-accent-wash");
    expect(html).not.toContain("-mt-[40px]");
    expect(html).not.toContain("md:-mt-");
    expect(html).not.toContain("data-social-profile-avatar-hang");
    expect(html).toContain("data-social-profile-head");
    expect(html).toContain(SOCIAL_PROFILE_HEAD_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
    expect(html).not.toContain("pt-[var(--space-3)]");
    expect(html).toContain("data-social-profile-name");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("data-social-avatar");
  });

  it("shows the cover photo and avatar hang when a visitor has a cover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        coverUrl="https://cf.example/cover.jpg"
      />,
    );
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).toContain("data-social-profile-cover");
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("bg-accent-wash");
    expect(html.indexOf("data-social-profile-cover")).toBeLessThan(
      html.indexOf("data-social-profile-head"),
    );
    const head = html.slice(
      html.indexOf("data-social-profile-head"),
      html.indexOf("data-social-profile-face"),
    );
    expectNameBelowCover(html);
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("Ada Lovelace");
    expect(head).not.toContain("data-social-profile-stats");

    const longName = "Adam Carpenter Builds For the Generations Across a Very Long Display Name";
    const wrapped = renderToStaticMarkup(
      <SocialProfileIdentity
        name={longName}
        handle="acarpcreate"
        coverUrl="https://cf.example/dark-cover.jpg"
      />,
    );
    expectNameBelowCover(wrapped);
    expect(wrapped).toContain(longName);
    expect(wrapped).toContain("@acarpcreate");
    const wrappedName = wrapped.slice(
      wrapped.indexOf("data-social-profile-name"),
      wrapped.indexOf("data-social-profile-handle"),
    );
    expect(wrappedName).toContain("break-words");
    expect(wrappedName).not.toContain("truncate");
  });

  it("keeps the empty band, Add cover chrome, and avatar hang on the owner profile", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        coverUrl={null}
        coverEdit={<button type="button" data-social-profile-cover-edit="">Add cover photo</button>}
      />,
    );
    expect(html).toContain("data-social-profile-cover-block");
    expect(html).toContain("data-social-profile-cover-empty");
    expect(html).toContain("bg-accent-wash");
    expect(html).toContain("h-[112px]");
    expect(html).toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("<img");
    const head = html.slice(
      html.indexOf("data-social-profile-head"),
      html.indexOf("data-social-profile-face"),
    );
    expectNameBelowCover(html);
    expect(head).toContain("data-social-avatar");
    expect(head).toContain("Ada Lovelace");
    expect(head).not.toContain("data-social-profile-stats");
  });

  it("keeps the photo and edit chrome when the owner has a cover", () => {
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name="Ada Lovelace"
        handle="ada"
        coverUrl="https://cf.example/cover.jpg"
        coverEdit={<button type="button" data-social-profile-cover-edit="">Edit cover</button>}
      />,
    );
    expect(html).toContain('src="https://cf.example/cover.jpg"');
    expect(html).toContain("data-social-profile-cover-edit");
    expect(html).not.toContain("data-social-profile-cover-empty");
    expect(html).not.toContain("bg-accent-wash");
    expectNameBelowCover(html);
  });
});

describe("Design lock v1 — profile head geometry", () => {
  it("stacks name under an 80px avatar with a 40px lip (G1–G5)", () => {
    const longName = "Adam Carpenter of a Very Long Display Name That Must Wrap On Phone";
    const html = renderToStaticMarkup(
      <SocialProfileIdentity
        name={longName}
        handle="acarpcreate-of-a-very-long-handle-that-must-wrap"
        coverUrl="https://cf.example/cover.jpg"
        stats={{ posts: 2, followers: 1, following: 1 }}
      />,
    );
    const coverEnd = html.indexOf("data-social-profile-head");
    const cover = html.slice(0, coverEnd);
    const head = html.slice(coverEnd, html.indexOf("data-social-profile-face"));
    const face = html.slice(html.indexOf("data-social-profile-face"));

    expect(cover).toContain("data-social-profile-cover");
    expect(cover).not.toContain("data-social-profile-name");
    expect(cover).not.toContain("data-social-profile-handle");

    expect(SOCIAL_PROFILE_HEAD_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_HEAD_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toMatch(/\bitems-end\b|\bitems-center\b|\bflex-1\b|\bmd:|\blg:/);
    expect(head).toContain(SOCIAL_PROFILE_HEAD_CLASS);
    expect(head).not.toContain("items-end");
    expect(head).not.toContain("gap-[var(--space-4)]");
    expect(head.indexOf("data-social-avatar")).toBeLessThan(head.indexOf("data-social-profile-name"));
    expect(head.indexOf("data-social-profile-name")).toBeLessThan(
      head.indexOf("data-social-profile-handle"),
    );
    expect(head).not.toContain("data-social-profile-stats");

    expect(SOCIAL_AVATAR_PROFILE_CLASS).toContain("size-20");
    expect(SOCIAL_AVATAR_PROFILE_CLASS).not.toMatch(/size-\[72px\]|md:size-\[88px\]|\bmd:|\blg:/);
    expect(head).toContain("size-20");
    expect(SOCIAL_PROFILE_HEAD_OVERLAP_CLASS).toBe("relative z-10 -mt-[40px]");
    expect(head).toContain(SOCIAL_PROFILE_HEAD_OVERLAP_CLASS);
    expect(head).toContain("border-2 border-surface");
    expect(head).not.toContain("border-4");

    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("t-heading");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("t-title");
    expect(head).toContain(SOCIAL_PROFILE_NAME_CLASS);
    expect(head).toContain(longName);
    expect(head).toContain(SOCIAL_PROFILE_HANDLE_CLASS);
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain("text-ink-2");

    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("mt-[var(--space-3)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toMatch(
      /flex-1|items-center|justify-center|min-h-|pt-20|pt-\[80px\]|h-20|size-20|\bmd:|\blg:/,
    );
    expect(head).toContain(SOCIAL_PROFILE_NAME_STACK_CLASS);
    expect(SOCIAL_PROFILE_STATS_LEAD_CLASS).toBe("mt-[var(--space-6)]");
    expect(face).toContain(SOCIAL_PROFILE_STATS_LEAD_CLASS);
    expect(face.indexOf(SOCIAL_PROFILE_STATS_LEAD_CLASS)).toBeLessThan(
      face.indexOf("data-social-profile-stats"),
    );

    expect(SOCIAL_PROFILE_NAME_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_NAME_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(SOCIAL_PROFILE_HANDLE_CLASS)).toBe(true);
    expect(head).not.toContain("truncate");
    expect(head).not.toContain("text-ellipsis");
  });

  it("keeps the no-stats face lead off the avatar disk", () => {
    expect(SOCIAL_PROFILE_FACE_LEAD_CLASS).toBe("mt-[var(--space-3)]");
    expect(SOCIAL_PROFILE_FACE_LEAD_CLASS).not.toContain("80");
    expect(SOCIAL_PROFILE_STATS_LEAD_CLASS).not.toContain("80");
    const html = renderToStaticMarkup(
      <SocialProfileIdentity name="Ada Lovelace" handle="ada" bio="Writes engines." />,
    );
    expect(html).toContain(SOCIAL_PROFILE_FACE_LEAD_CLASS);
    expect(html).not.toContain(SOCIAL_PROFILE_STATS_LEAD_CLASS);
    expect(html).not.toContain("-mt-[40px]");
  });
});
