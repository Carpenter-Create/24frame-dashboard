import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_MUTUALS_FACE_CAP,
  SOCIAL_MUTUALS_NAME_CAP,
  emptySocialProfileMutuals,
  socialFollowedByLine,
  socialMutualFromProfile,
} from "@/lib/social-profile-mutuals";

describe("social profile mutuals", () => {
  it("prints Followed by A, B +N more and omits an empty list", () => {
    expect(socialFollowedByLine([])).toBeNull();
    expect(socialFollowedByLine(["Ada"])).toBe(`${SOCIAL.profile.followedBy} Ada`);
    expect(socialFollowedByLine(["Ada", "Bob"], 3)).toBe(
      `${SOCIAL.profile.followedBy} Ada, Bob ${SOCIAL.profile.followedByMore.replace("{n}", "3")}`,
    );
    expect(SOCIAL_MUTUALS_NAME_CAP).toBe(2);
    expect(SOCIAL_MUTUALS_FACE_CAP).toBe(2);
    expect(emptySocialProfileMutuals()).toEqual({ people: [], extra: 0 });
  });

  it("labels a mutual with the person-row name SoT, never Member", () => {
    expect(
      socialMutualFromProfile({ id: "u3", handle: "carol", display_name: "Carol King" }).label,
    ).toBe("Carol King");
    expect(socialMutualFromProfile({ id: "u4", handle: "dan", display_name: "Member" }).label).toBe(
      "dan",
    );
  });
});
