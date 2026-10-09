import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RSA_MARKERS = [
  "getSignedUrl",
  "presignAvatarGet",
  "signedAvatarUrl(",
  "signedSocialMediaUrl(",
  "@aws-sdk",
  "@/lib/s3-avatars",
  "@/lib/s3-social-media",
] as const;

const SOCIAL_HOME_CRITICAL = [
  "src/app/(app)/social/page.tsx",
  "src/app/(app)/home/page.tsx",
] as const;

describe("house speed lock — no RSA on Social Home / Home critical path", () => {
  it("keeps display helpers on the edge proxy SoT", () => {
    const edge = readFileSync("src/lib/social-edge.ts", "utf8");
    const avatars = readFileSync("src/lib/s3-avatars.ts", "utf8");
    const media = readFileSync("src/lib/s3-social-media.ts", "utf8");
    expect(edge).toContain("export function signedAvatarUrls");
    expect(edge).toContain("export function signedSocialMediaByPostId");
    expect(edge).toContain("socialAvatarFaces");
    expect(edge).toContain("socialMediaProxiesByPostId");
    expect(avatars).toContain("socialAvatarFaces");
    expect(avatars).not.toContain("unique.map(async (userId) => [userId, await signedAvatarUrl");
    expect(media).toContain("socialMediaProxiesByPostId");
    expect(media).not.toContain("await signedSocialMediaUrl(item.key)");
    expect(avatars).toContain("presignAvatarGet");
    expect(media).toContain("export async function signedSocialMediaUrl");
  });

  it("does not RSA-sign avatars or post media on Social Home / Home overview", () => {
    for (const path of SOCIAL_HOME_CRITICAL) {
      const src = readFileSync(path, "utf8");
      expect(src).toContain("@/lib/social-edge");
      expect(src).toContain("signedAvatarUrls");
      for (const marker of RSA_MARKERS) {
        if (marker === "signedAvatarUrl(" || marker === "signedSocialMediaUrl(") {
          expect(src).not.toContain(marker);
        } else if (marker === "@/lib/s3-avatars" || marker === "@/lib/s3-social-media") {
          expect(src).not.toContain(marker);
        } else if (marker === "getSignedUrl" || marker === "presignAvatarGet" || marker === "@aws-sdk") {
          expect(src).not.toContain(marker);
        }
      }
    }
    const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    expect(home).toContain("signedSocialMediaByPostId");
    expect(home).toContain("SocialFollowingWallBound");
    expect(home).toContain("loadCachedFollowingPosts");
    expect(home).toContain("loadCachedFolloweeIds");
    const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    expect(profile).toContain("SocialQueryBound");
  });

  it("owns Follow through the house runner and follow fetch API", () => {
    const engagement = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const follow = engagement.slice(
      engagement.indexOf("export function SocialFollowButton"),
      engagement.indexOf("export function SocialLikeButton"),
    );
    const sot = readFileSync("src/lib/social-optimistic.ts", "utf8");
    const house = readFileSync("src/lib/optimistic-mutation.ts", "utf8");
    const light = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    expect(house).toContain("export function runOptimisticMutation");
    expect(sot).toContain("runOptimisticMutation");
    expect(sot).toContain('followHref: "/api/social/follow"');
    expect(follow).toContain("runSocialOptimisticMutation");
    expect(follow).toContain("persistSocialFollowLatest");
    expect(follow).toContain("beginSocialFollowEpoch");
    expect(follow).not.toContain("toggleSocialFollow");
    expect(follow).not.toContain("disabled={pending}");
    expect(follow).not.toContain("const result = await toggleSocialFollow");
    const followChunk = light.slice(
      light.indexOf("export async function toggleSocialFollow"),
      light.indexOf("export async function toggleSocialLike"),
    );
    expect(followChunk).not.toContain("revalidatePath");
    const followApi = readFileSync("src/app/api/social/follow/route.ts", "utf8");
    expect(followApi).toContain("followPersistSchema");
    expect(followApi).toContain("z.string().uuid()");
  });

  it("routes chrome and Social dest taps through one HouseLink", () => {
    const surfaces = [
      "src/components/chrome/side-nav.tsx",
      "src/components/chrome/house-phone-bottom-nav.tsx",
      "src/components/chrome/workspace-switcher.tsx",
      "src/components/chrome/house-lead-chrome.tsx",
      "src/components/social/social-home-topics.tsx",
      "src/components/social/social-profile-tabs.tsx",
      "src/components/social/social-follows-tabs.tsx",
      "src/components/social/social-activity-pills.tsx",
      "src/components/social/social-profile-stats.tsx",
      "src/components/social/social-profile-edit-face.tsx",
      "src/components/social/social-profile-edit.tsx",
      // The Edit profile pill moved into its own island (phone link + window button).
      "src/components/social/social-profile-edit-entry.tsx",
    ];
    for (const path of surfaces) {
      const src = readFileSync(path, "utf8");
      expect(src).toContain("HouseLink");
      expect(src).not.toContain('import Link from "next/link"');
    }
    const primitive = readFileSync("src/components/chrome/house-link.tsx", "utf8");
    expect(primitive).toContain("navigateOwned");
    expect(primitive).toContain("data-house-link");
  });

  // Screen changes are Next navigations: a hidden copy of the layout's
  // children renders Next's current route, not the screen it was kept for.
  it("mounts the house client shell with one outlet for Next's screen", () => {
    const layout = readFileSync("src/app/(app)/layout.tsx", "utf8");
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const provider = readFileSync("src/components/chrome/house-client-shell.tsx", "utf8");
    expect(layout).toContain("HousePathProvider");
    expect(shell).toContain("HouseScreenOutlet");
    expect(shell.match(/<HouseScreenOutlet>/g)?.length).toBe(1);
    expect(shell).toContain("useHousePathname");
    expect(provider).toContain("history.pushState");
    expect(provider).toContain("houseClientHistoryState(window.history.state)");
    expect(provider).toContain("navigateOwned");
    expect(provider).toContain("houseHop(href, dest)");
    expect(provider).toContain("houseReconcileOwnedHref");
    expect(provider).toContain("houseRememberScroll");
    expect(provider).toContain("captureLeadScroll");
    expect(provider).toContain("captureLeadScroll(screenKey)");
    expect(provider).toContain("<Suspense");
    expect(provider).toContain("HousePathSearchBound");
    expect(provider).toContain("useSearchParams");
    const outlet = provider.slice(provider.indexOf("export function HouseScreenOutlet"));
    expect(outlet).not.toContain("useSearchParams");
    expect(outlet).not.toContain("useState");
  });

  it("lets Query own the Following wall after boot", () => {
    const bound = readFileSync("src/components/social/social-following-wall-bound.tsx", "utf8");
    const actions = readFileSync("src/app/(app)/social/query-actions.ts", "utf8");
    const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    const face = readFileSync("src/components/social/social-own-profile.tsx", "utf8");
    expect(bound).toContain("query.data ?? wall");
    expect(bound).toContain("SocialOptimisticFeed");
    expect(bound).not.toContain("return children");
    expect(actions).toContain("socialFollowingWallView");
    expect(actions).toContain("signedSocialMediaByPostId");
    expect(home).toContain("socialFollowingWallView");
    expect(face).toContain("socialProfileQueryKey");
    expect(face).toContain("socialProfileFaceFromRow");
    expect(face).not.toContain("row?.bio ?? props.bio");
    expect(actions).toContain("canLike: !!viewer");
    expect(actions).not.toContain("canLike: true");
  });
});
