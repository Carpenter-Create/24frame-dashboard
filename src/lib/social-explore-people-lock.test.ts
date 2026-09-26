import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL_NAV } from "./nav";
import { SOCIAL_PHONE_DESTS } from "./house-phone-shell";
import {
  SOCIAL,
  SOCIAL_ROUTES,
  SOCIAL_SEARCH_INTENT_PARAM,
  SOCIAL_SEARCH_PEOPLE_INTENT,
  socialSearchHref,
} from "./social";

const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const explore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
const search = readFileSync("src/app/(app)/social/search/page.tsx", "utf8");
const leadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");

describe("Explore vs people discovery lock (Adam 2026-09-20)", () => {
  it("keeps Explore as a video For You and uses people as a stream filter", () => {
    expect(SOCIAL.explore.searchPlaceholder).toBe("People, keywords, hashtags");
    expect(SOCIAL.explore.noResults).toBe("No matching videos.");
    expect(SOCIAL.explore.empty).toBe("No videos to explore yet.");
    expect(JSON.stringify(SOCIAL.explore)).not.toContain("creators");
    expect(explore).toContain("loadExploreMedia");
    expect(explore).toContain("loadExploreSearch");
    expect(explore).toContain("loadPeopleSearch");
    expect(explore).toContain("data-social-explore-for-you");
    expect(explore).toContain("socialMediaProxiesByPostId");
    expect(explore).not.toContain("data-social-explore-grid");
    expect(explore).not.toContain("SOCIAL_PROFILE_GRID_CLASS");
    expect(explore).not.toContain("SocialDesktopForYouSlot");
    expect(explore).not.toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(explore).not.toContain("SocialForYouRail");
    expect(explore).not.toContain("SocialSuggestedPeople");
    expect(explore).not.toContain("loadSuggestedPeople");
    expect(explore).not.toContain("SocialPersonRow");
    expect(explore).not.toContain("socialPostHref");
    expect(explore).not.toContain("Reels");
    expect(explore).not.toContain("people rail");
  });

  it("puts people discovery on header Search with people intent", () => {
    expect(SOCIAL_ROUTES.search).toBe("/social/search");
    expect(socialSearchHref({ intent: "people" })).toBe("/social/search?intent=people");
    expect(socialSearchHref({ q: "ada" })).toBe("/social/search?intent=people&q=ada");
    expect(SOCIAL.search.people).toBe("People");
    expect(SOCIAL.search.searchPlaceholder).toBe("Search people");
    expect(search).toContain("data-social-search-people");
    expect(search).toContain("SocialSuggestedPeople");
    expect(search).toContain("loadSuggestedPeople");
    expect(search).toContain("loadPeopleSearch");
    expect(search).toContain("socialAvatarFaces");
    expect(search).toContain(SOCIAL_SEARCH_INTENT_PARAM);
    expect(search).toContain(SOCIAL_SEARCH_PEOPLE_INTENT);
    expect(leadSearch).toContain(`action ?? (live ? SOCIAL_ROUTES.search`);
    expect(leadSearch).toContain("socialSearchHref({ intent: \"people\" })");
    expect(leadSearch).toContain("SOCIAL_SEARCH_PEOPLE_INTENT");
    expect(leadSearch).not.toContain("SOCIAL_ROUTES.explore");
    expect(leadSearch).not.toContain("SocialSearchSheet");
    expect(existsSync("src/app/(app)/social/search/page.tsx")).toBe(true);
  });

  it("routes the empty following-wall CTA to Search(people), not Explore", () => {
    expect(SOCIAL.home.findPeople).toBe("Find people");
    expect(SOCIAL.home.emptyHint).toBe(
      "Posts, stories, and updates from people you follow show up here.",
    );
    expect(SOCIAL.home.emptyHint).not.toMatch(/Explore/i);
    expect(SOCIAL.home.findPeopleHint).toBe("Search for people to follow and start your following wall.");
    expect(SOCIAL.home.findPeopleHint).not.toMatch(/Explore/i);
    expect(home).toContain("socialSearchHref({ intent: \"people\" })");
    expect(home).toContain("SOCIAL.home.findPeople");
    expect(home).not.toContain("SOCIAL_ROUTES.explore");
    expect(home).not.toContain("SOCIAL.home.goExplore");
    expect(home).not.toContain("Explore creators");
  });

  it("does not add a sixth dock tab or stack people+Reels as Explore", () => {
    expect(SOCIAL_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.search);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.search);
    expect(SOCIAL_NAV.some((item) => item.label === "People")).toBe(false);
    expect(explore).not.toContain("SocialSuggestedPeople");
    expect(explore).not.toContain("Reels");
  });
});
