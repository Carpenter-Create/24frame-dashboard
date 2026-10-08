import { describe, expect, it } from "vitest";

import { SOCIAL_MUSIC_REVIEW, musicReviewDirectoryRows } from "@/lib/social-music-review";

describe("musicReviewDirectoryRows", () => {
  it("shows a blocked vendor hit to staff and does not link to the social post", () => {
    const [row] = musicReviewDirectoryRows([
      {
        id: "scan-1",
        surface: "post",
        authorName: "Elena Ruiz",
        status: "blocked",
        vendorTitle: "Fixture Track",
        vendorArtist: "Fixture Artist",
        vendorScore: 91,
        assetId: "asset12345678",
      },
    ]);
    expect(row).toMatchObject({
      id: "scan-1",
      name: "Social post · Elena Ruiz",
      trailing: SOCIAL_MUSIC_REVIEW.blocked,
    });
    expect(row?.secondary).toContain("Fixture Track — Fixture Artist");
    expect(row?.secondary).toContain("score 91");
    expect(row?.secondary).toContain("asset12345678");
    expect(row?.href).toBeUndefined();
  });

  it("lists an unfinished check without a song title", () => {
    const [row] = musicReviewDirectoryRows([
      {
        id: "scan-2",
        surface: "story",
        authorName: null,
        status: "pending",
        vendorTitle: null,
        vendorArtist: null,
        vendorScore: null,
        assetId: "asset99999999",
      },
    ]);
    expect(row?.name).toBe("Social story");
    expect(row?.trailing).toBe(SOCIAL_MUSIC_REVIEW.unfinished);
    expect(row?.secondary).toContain(SOCIAL_MUSIC_REVIEW.unfinishedDetail);
    expect(row?.secondary).not.toContain("Fixture");
  });
});
