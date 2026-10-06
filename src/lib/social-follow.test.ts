import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { NOTIFICATION_PREF_DEFAULTS, parseNotificationPrefsRow } from "@/lib/notification-prefs";
import { SOCIAL } from "@/lib/social";
import {
  FOLLOW_CONFIRM_MS,
  filterSocialFollowsPeople,
  followButtonLabel,
  followedConfirmCopy,
  isFollowUniqueViolation,
  newFollowerNoticeCopy,
  newFollowerSourceRefs,
  shouldNotifyNewFollower,
  socialFollowsSearchMatches,
} from "@/lib/social-follow";

describe("social follow helpers", () => {
  it("treats unique-constraint codes as an already-following edge", () => {
    expect(isFollowUniqueViolation({ message: "duplicate key", code: "23505" })).toBe(true);
    expect(isFollowUniqueViolation({ message: "duplicate key value" })).toBe(true);
    expect(isFollowUniqueViolation({ message: "new row violates row-level security", code: "42501" })).toBe(
      false,
    );
    expect(isFollowUniqueViolation(null)).toBe(false);
  });

  it("notifies on the default in-app pref and skips when that channel is off", () => {
    expect(shouldNotifyNewFollower(NOTIFICATION_PREF_DEFAULTS)).toBe(true);
    expect(
      shouldNotifyNewFollower(
        parseNotificationPrefsRow({
          prefs: { new_follower: { in_app: false, email: false } },
        }),
      ),
    ).toBe(false);
  });

  it("names the actor with a handle and links to the follower profile", () => {
    expect(newFollowerNoticeCopy("ada")).toEqual({
      title: SOCIAL.follow.newFollowerTitle,
      body: "@ada followed you",
    });
    expect(SOCIAL.follow.newFollowerTitle).toBe("New follower");
    expect(newFollowerSourceRefs({ actorId: "u1", handle: "ada" })).toEqual({
      actor_id: "u1",
      handle: "ada",
      path: "/social/u/ada",
    });
  });

  it("confirms a follow with the display handle and no unfollow toast", () => {
    expect(followedConfirmCopy("joshua")).toBe("Following @joshua");
    expect(followedConfirmCopy("@Joshua")).toBe("Following @Joshua");
    expect(FOLLOW_CONFIRM_MS).toBe(3500);
    expect(followedConfirmCopy("joshua")).not.toMatch(/unfollow/i);
  });

  it("flips Follow immediately, then toasts on persist — both required", () => {
    const src = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const chunk = src.slice(
      src.indexOf("export function SocialFollowButton"),
      src.indexOf("export function SocialLikeButton"),
    );
    expect(chunk).toContain("persistSocialFollowLatest");
    expect(chunk).toContain("runSocialOptimisticMutation");
    expect(chunk).not.toContain("toggleSocialFollow");
    expect(chunk).not.toContain("router.refresh()");
    expect(chunk).toContain("setOverride");
    expect(chunk).toContain("FormError");
    expect(chunk).not.toContain("disabled={pending}");
    expect(chunk).toContain("followedConfirmCopy");
    expect(chunk).toContain("followButtonLabel");
    expect(chunk).toContain("followsYou");
    expect(chunk).toContain("SOCIAL_FOLLOW_COMPACT_IDLE_CLASS");
    expect(chunk).toContain("FOLLOW_CONFIRM_MS");
    expect(chunk).toContain("data-social-follow-toast");
    expect(chunk).toContain("InlineNotice");
    expect(chunk).not.toContain("Dialog");
    expect(chunk).toContain('aria-live="polite"');
    expect(chunk).toContain("setConfirm(false)");
    expect(chunk).toContain("if (next) setConfirm(true)");
    expect(chunk.indexOf("setOverride(next)")).toBeLessThan(chunk.indexOf("persistSocialFollow"));
    expect(chunk.indexOf("persistSocialFollow")).toBeLessThan(chunk.indexOf("if (next) setConfirm(true)"));
  });

  it("labels Follow, Following, and Follow back from one helper", () => {
    expect(followButtonLabel(false)).toBe(SOCIAL.follow.follow);
    expect(followButtonLabel(true)).toBe(SOCIAL.follow.following);
    expect(followButtonLabel(false, true)).toBe(SOCIAL.follow.followBack);
    expect(followButtonLabel(true, true)).toBe(SOCIAL.follow.following);
  });

  it("filters the follow list by handle or display name", () => {
    const people = [
      { handle: "sunflowerlane", display_name: "Kiya Shaferer" },
      { handle: "gc.gramms", display_name: "Gcinita Gc Lukhele" },
    ];
    expect(socialFollowsSearchMatches(people[0]!, "sun")).toBe(true);
    expect(socialFollowsSearchMatches(people[0]!, "kiya")).toBe(true);
    expect(socialFollowsSearchMatches(people[0]!, "gc")).toBe(false);
    expect(filterSocialFollowsPeople(people, "  GC  ").map((row) => row.handle)).toEqual(["gc.gramms"]);
    expect(filterSocialFollowsPeople(people, "")).toHaveLength(2);
  });

  it("keeps one follow button for public profile, Suggested people, and the follow list", () => {
    const profile = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const suggested = readFileSync("src/components/social/social-for-you.tsx", "utf8");
    const list = readFileSync("src/components/social/social-follows-list.tsx", "utf8");
    expect(profile).toContain("<SocialFollowButton");
    expect(suggested).toContain("<SocialFollowButton");
    expect(list).toContain("<SocialFollowButton");
    expect(profile).not.toContain("toggleSocialFollow");
    expect(suggested).not.toContain("toggleSocialFollow");
    expect(list).not.toContain("toggleSocialFollow");
  });

  it("counts live follow rows instead of leftover follower_count", () => {
    const src = readFileSync("src/lib/social-feed.ts", "utf8");
    const chunk = src.slice(
      src.indexOf("export async function loadProfileSocialCounts"),
      src.indexOf("export type SocialFollowingWallPage"),
    );
    expect(chunk).toContain('.eq("followee_id", profileId)');
    expect(chunk).toContain('.eq("follower_id", profileId)');
    expect(chunk).toContain('select("followee_id"');
    expect(chunk).toContain('select("follower_id"');
    expect(chunk).not.toContain("follower_count");
  });
});
