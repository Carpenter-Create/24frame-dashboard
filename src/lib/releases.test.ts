import { describe, it, expect } from "vitest";

import {
  effectiveReleaseDate,
  displayOriginalDate,
  isUpcoming,
  isNewRelease,
  isJustIn,
  formatReleaseDate,
  checkReleaseInfo,
  latestOriginalReleaseDate,
  releaseInfoSchema,
} from "./releases";

const NOW = new Date("2026-07-21T12:00:00Z");

describe("effectiveReleaseDate", () => {
  it("is the GC-owned release_date", () => {
    expect(effectiveReleaseDate({ release_date: "2026-08-01" })).toBe("2026-08-01");
    expect(effectiveReleaseDate({ release_date: null })).toBeNull();
  });
});

describe("displayOriginalDate", () => {
  it("prefers the historical original, falls back to release_date", () => {
    expect(displayOriginalDate({ original_release_date: "2019-05-01", release_date: "2026-08-01" })).toBe("2019-05-01");
    expect(displayOriginalDate({ original_release_date: null, release_date: "2026-08-01" })).toBe("2026-08-01");
    expect(displayOriginalDate({ original_release_date: null, release_date: null })).toBeNull();
  });
});

describe("isUpcoming", () => {
  it("true only for a future release date", () => {
    expect(isUpcoming("2026-07-22", NOW)).toBe(true);
    expect(isUpcoming("2026-07-21", NOW)).toBe(false); // today is not upcoming
    expect(isUpcoming("2026-07-20", NOW)).toBe(false);
    expect(isUpcoming(null, NOW)).toBe(false);
  });
});

describe("isNewRelease", () => {
  it("true within the trailing 30d window, inclusive of today", () => {
    expect(isNewRelease("2026-07-21", NOW)).toBe(true); // today
    expect(isNewRelease("2026-06-21", NOW)).toBe(true); // exactly 30d ago
    expect(isNewRelease("2026-06-20", NOW)).toBe(false); // 31d ago
    expect(isNewRelease("2026-07-22", NOW)).toBe(false); // future is upcoming, not new
    expect(isNewRelease(null, NOW)).toBe(false);
  });
});

describe("isJustIn", () => {
  it("true when added within the trailing 30d window", () => {
    expect(isJustIn("2026-07-20T09:00:00Z", NOW)).toBe(true);
    expect(isJustIn("2026-05-01T09:00:00Z", NOW)).toBe(false);
  });
});

describe("formatReleaseDate", () => {
  it("renders a plain calendar date without TZ shift, or a dash", () => {
    expect(formatReleaseDate("2026-08-01")).toBe("Aug 1, 2026");
    expect(formatReleaseDate(null)).toBe("—");
  });
});

const LATE = new Date("2026-10-09T23:30:00Z");

describe("release info (the title's Metadata window, Release face)", () => {
  it("asks a re-release for its original date, in the past (Adam 2026-10-09)", () => {
    expect(checkReleaseInfo({ releaseType: "new_release", originalReleaseDate: null }, LATE)).toBeNull();
    expect(checkReleaseInfo({ releaseType: "re_release", originalReleaseDate: null }, LATE)).toBe(
      "Original release date is required for a re-release.",
    );
    expect(checkReleaseInfo({ releaseType: "re_release", originalReleaseDate: "1999-12-31" }, LATE)).toBeNull();
    expect(checkReleaseInfo({ releaseType: "re_release", originalReleaseDate: "2026-10-12" }, LATE)).toBe(
      "Choose a date in the past.",
    );
  });

  it("never refuses someone's own today, wherever it already is", () => {
    // 23:30 UTC on the 9th is already the 10th east of UTC+1.
    expect(latestOriginalReleaseDate(LATE)).toBe("2026-10-10");
    expect(checkReleaseInfo({ releaseType: "re_release", originalReleaseDate: "2026-10-10" }, LATE)).toBeNull();
    expect(checkReleaseInfo({ releaseType: "re_release", originalReleaseDate: "2026-10-11" }, LATE)).toBe(
      "Choose a date in the past.",
    );
  });

  it("takes only a release type and a calendar date from the browser", () => {
    expect(releaseInfoSchema.safeParse({ releaseType: "re_release", originalReleaseDate: "2001-02-03" }).success).toBe(
      true,
    );
    expect(releaseInfoSchema.safeParse({ releaseType: "re_release", originalReleaseDate: "2001-02-30" }).success).toBe(
      false,
    );
    expect(releaseInfoSchema.safeParse({ releaseType: "re_release", originalReleaseDate: "2001-02-03'--" }).success).toBe(
      false,
    );
    expect(releaseInfoSchema.safeParse({ releaseType: "premiere", originalReleaseDate: null }).success).toBe(false);
  });
});
