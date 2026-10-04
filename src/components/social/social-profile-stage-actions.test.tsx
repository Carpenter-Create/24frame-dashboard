import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/social/query-actions", () => ({ readSocialFollowState: vi.fn() }));
vi.mock("@/app/(app)/social/actions", () => ({}));

import {
  SOCIAL_ACTION_CLASS,
  SOCIAL_ACTION_SECONDARY_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS,
} from "@/lib/social-chrome";

import { SocialFollowButton } from "./social-engagement";

const buttonClass = (html: string) => html.match(/<button type="submit" class="([^"]*)"/)?.[1] ?? "";

describe("Profile Stage actions (docs/design-locks/social-profile-stage-lock-v1.md)", () => {
  it("renders the visitor Follow as the accent pill and Following as the hairline pill", () => {
    const follow = renderToStaticMarkup(
      <SocialFollowButton followeeId="u2" handle="ada" following={false} viewerId="u1" stretch pill />,
    );
    expect(buttonClass(follow).startsWith(SOCIAL_PROFILE_ACTION_PILL_CLASS)).toBe(true);
    expect(buttonClass(follow)).toContain("w-full");
    const following = renderToStaticMarkup(
      <SocialFollowButton followeeId="u2" handle="ada" following viewerId="u1" stretch pill />,
    );
    expect(buttonClass(following).startsWith(SOCIAL_PROFILE_ACTION_PILL_SECONDARY_CLASS)).toBe(true);
  });

  it("leaves Follow elsewhere (For You, follow lists) on the house action classes", () => {
    const follow = renderToStaticMarkup(<SocialFollowButton followeeId="u2" handle="ada" following={false} />);
    expect(buttonClass(follow)).toBe(SOCIAL_ACTION_CLASS);
    const following = renderToStaticMarkup(<SocialFollowButton followeeId="u2" handle="ada" following />);
    expect(buttonClass(following)).toBe(SOCIAL_ACTION_SECONDARY_CLASS);
  });

  it("puts the profile action pills on both profile routes", () => {
    const own = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    expect(own).toContain("className={SOCIAL_PROFILE_ACTION_PILL_CLASS}");
    expect(own).toContain("<SocialShareButton handle={identity.handle} />");
    const visitor = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const follow = visitor.slice(visitor.indexOf("<SocialFollowButton"), visitor.indexOf("/>", visitor.indexOf("<SocialFollowButton")));
    expect(follow).toMatch(/\n\s+stretch\n\s+pill\n/);
  });

  it("opens the owner's avatar crop in the trail under the hero, never over the cover", () => {
    const src = readFileSync("src/components/social/social-profile-avatar-edit.tsx", "utf8");
    expect(src).toContain("setTrail(coverTrailTarget(buttonRef.current));");
    expect(src).toContain("{crop && trail?.isConnected ? createPortal(crop, trail) : crop}");
    expect(src).toContain("ref={buttonRef}");
  });
});
