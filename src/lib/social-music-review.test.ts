import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
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
    expect(row?.secondary).toContain("Fixture Track · Fixture Artist");
    expect(row?.secondary).not.toContain("—");
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

  it("pins the locked end-user and staff sentences", () => {
    expect(SOCIAL.music.pending).toBe("This video is not visible to others yet.");
    expect(SOCIAL.music.blocked).toBe("This video can't be shared because it includes music.");
    expect(SOCIAL.music.tooLong).toBe("PENDING DESIGN LOCK: This video is longer than 8 minutes.");
    expect(SOCIAL.music.welcomePending).toBe(
      "PENDING DESIGN LOCK: This welcome video is not visible to others yet.",
    );
    expect(SOCIAL.music.legacyHeld).toBe("PENDING DESIGN LOCK: This video is held until it can be checked.");
    expect(SOCIAL.music.malformed).toBe("PENDING DESIGN LOCK: This video can't be checked.");
    expect(SOCIAL_MUSIC_REVIEW).toMatchObject({
      title: "Music review",
      subtitle: "Social videos held after a music check.",
      empty: "No videos are waiting.",
      blocked: "Blocked",
      unfinished: "Unfinished",
      post: "Social post",
      story: "Social story",
      matchFallback: "Music match",
      unfinishedDetail: "The check did not finish. The video stays hidden.",
    });
    const [row] = musicReviewDirectoryRows([
      {
        id: "scan-3",
        surface: "post",
        authorName: null,
        status: "blocked",
        vendorTitle: null,
        vendorArtist: null,
        vendorScore: 25,
        assetId: "asset00000000",
      },
    ]);
    expect(row?.secondary).toContain("Music match");
    expect(row?.secondary).not.toContain("Commercial");
  });
});
