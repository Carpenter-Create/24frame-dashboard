import { describe, expect, it } from "vitest";

import {
  TITLE_DETAILS,
  checkTitleDetails,
  draftToMetadata,
  metadataChanges,
  metadataToDraft,
  parseTitleDetailsWindow,
  releaseChanged,
  releaseDraft,
  releaseInfoFromDraft,
  titleDetailsChangedRows,
  titleDetailsClosedHref,
  titleDetailsDiscardLine,
  titleDetailsFaceForField,
  titleDetailsOpenHref,
  titleDetailsReleaseSummary,
  titleDetailsTierSummary,
} from "./title-details";

const NOW = new Date("2026-10-09T12:00:00Z");

const STORED = {
  synopsis: "A film.",
  runtime_minutes: 96,
  release_year: 2024,
  genre: "drama",
  primary_language: "en",
  country_of_origin: "US",
  cast: ["Ada", "Grace"],
};

const NEW_RELEASE = { releaseType: "new_release" as const, originalReleaseDate: null };

function draftOf(metadata: Record<string, unknown> = STORED, release = NEW_RELEASE) {
  return { metadata: metadataToDraft(metadata), release: releaseDraft(release) };
}

describe("title Metadata window (lib/title-details)", () => {
  it("opens on ?edit at a known face; anything else opens the index", () => {
    expect(parseTitleDetailsWindow("")).toBeNull();
    expect(parseTitleDetailsWindow("?tab=x")).toBeNull();
    expect(parseTitleDetailsWindow("?edit")).toBe("index");
    expect(parseTitleDetailsWindow("?edit=required")).toBe("required");
    expect(parseTitleDetailsWindow("?edit=release")).toBe("release");
    expect(parseTitleDetailsWindow("?edit=javascript:alert(1)")).toBe("index");
    expect(parseTitleDetailsWindow("?edit=__proto__")).toBe("index");
    expect(titleDetailsOpenHref("/t/1", "")).toBe("/t/1?edit");
    expect(titleDetailsOpenHref("/t/1", "?a=1", "release")).toBe("/t/1?a=1&edit=release");
    expect(titleDetailsClosedHref("/t/1", "?a=1&edit=required")).toBe("/t/1?a=1");
  });

  it("round-trips stored values through the fields", () => {
    const draft = metadataToDraft(STORED);
    expect(draft.cast).toBe("Ada, Grace");
    expect(draft.runtime_minutes).toBe("96");
    expect(draft.director).toBe("");
    expect(draftToMetadata(draft)).toEqual(STORED);
  });

  it("sends only what changed, and a cleared field as null", () => {
    const draft = metadataToDraft(STORED);
    expect(metadataChanges(STORED, draft)).toEqual({});
    draft.runtime_minutes = " 100 ";
    draft.cast = "Ada,  Grace , ";
    draft.synopsis = "";
    draft.director = "Jo";
    expect(metadataChanges(STORED, draft)).toEqual({ runtime_minutes: 100, synopsis: null, director: "Jo" });
  });

  it("keeps no original date for a new release, and sees a release change", () => {
    expect(releaseInfoFromDraft({ type: "new_release", originalDate: "2001-01-01" })).toEqual(NEW_RELEASE);
    expect(releaseInfoFromDraft({ type: "re_release", originalDate: "2001-01-01" })).toEqual({
      releaseType: "re_release",
      originalReleaseDate: "2001-01-01",
    });
    expect(releaseChanged(NEW_RELEASE, { type: "new_release", originalDate: "2001-01-01" })).toBe(false);
    expect(releaseChanged(NEW_RELEASE, { type: "re_release", originalDate: "" })).toBe(true);
  });

  it("names the changed rows in row order, as Edit profile's ask does", () => {
    const draft = draftOf();
    expect(titleDetailsChangedRows({ metadata: STORED, release: NEW_RELEASE }, draft)).toEqual([]);
    draft.metadata.alternate_title = "Other";
    draft.metadata.genre = "comedy";
    draft.release.type = "re_release";
    const rows = titleDetailsChangedRows({ metadata: STORED, release: NEW_RELEASE }, draft);
    expect(rows).toEqual(["required", "optional", "release"]);
    expect(titleDetailsDiscardLine(["required"])).toBe("Required isn't saved.");
    expect(titleDetailsDiscardLine(["required", "release"])).toBe("Required and Release aren't saved.");
    expect(titleDetailsDiscardLine(rows)).toBe("Required, Optional and Release aren't saved.");
    expect(titleDetailsDiscardLine([])).toBe("");
  });

  it("finds the first problem in face and field order, with its approved line", () => {
    expect(checkTitleDetails(draftOf(), NOW)).toBeNull();
    const draft = draftOf();
    draft.metadata.keywords = Array.from({ length: 51 }, (_, i) => `k${i}`).join(",");
    draft.metadata.runtime_minutes = "0";
    expect(checkTitleDetails(draft, NOW)).toEqual({
      face: "required",
      field: "runtime_minutes",
      error: "Enter whole minutes, 1 to 1,000.",
    });
    draft.metadata.runtime_minutes = "90.5";
    expect(checkTitleDetails(draft, NOW)?.field).toBe("runtime_minutes");
    draft.metadata.runtime_minutes = "1000";
    expect(checkTitleDetails(draft, NOW)).toEqual({ face: "recommended", field: "keywords", error: "Up to 50 entries." });
    draft.metadata.keywords = "k".repeat(201);
    expect(checkTitleDetails(draft, NOW)).toEqual({
      face: "recommended",
      field: "keywords",
      error: "Up to 200 characters.",
    });
    draft.metadata.keywords = "";
    // Next year plus five, from today's year (2032 in 2026).
    const maxYear = new Date().getUTCFullYear() + 6;
    draft.metadata.release_year = String(maxYear + 1);
    expect(checkTitleDetails(draft)).toEqual({
      face: "required",
      field: "release_year",
      error: `Enter a year from 1888 to ${maxYear}.`,
    });
    draft.metadata.release_year = String(maxYear);
    expect(checkTitleDetails(draft)).toBeNull();
    draft.metadata.synopsis = "x".repeat(4001);
    expect(checkTitleDetails(draft, NOW)?.error).toBe("Up to 4,000 characters.");
    draft.metadata.synopsis = "x".repeat(4000);
    draft.metadata.production_company = "y".repeat(201);
    expect(checkTitleDetails(draft, NOW)).toEqual({
      face: "optional",
      field: "production_company",
      error: "Up to 200 characters.",
    });
    draft.metadata.production_company = "";
    draft.metadata.genre = "Drama";
    expect(checkTitleDetails(draft, NOW)?.error).toBe("Choose one from the list.");
  });

  it("asks a re-release for an original date in the past", () => {
    const draft = draftOf();
    draft.release = { type: "re_release", originalDate: "" };
    expect(checkTitleDetails(draft, NOW)).toEqual({
      face: "release",
      field: "original_release_date",
      error: "Original release date is required for a re-release.",
    });
    draft.release.originalDate = "2030-01-01";
    expect(checkTitleDetails(draft, NOW)?.error).toBe("Choose a date in the past.");
    draft.release.originalDate = "2026-10-09";
    expect(checkTitleDetails(draft, NOW)).toBeNull();
  });

  it("maps a field to the face it is edited on", () => {
    expect(titleDetailsFaceForField("genre")).toBe("required");
    expect(titleDetailsFaceForField("cast")).toBe("recommended");
    expect(titleDetailsFaceForField("production_company")).toBe("optional");
    expect(titleDetailsFaceForField("original_release_date")).toBe("release");
    expect(titleDetailsFaceForField("nope")).toBe("index");
  });

  it("counts a row only with values Done would accept", () => {
    const draft = metadataToDraft(STORED);
    expect(titleDetailsTierSummary(draft, "required")).toBe("6 of 6 complete");
    draft.runtime_minutes = "0";
    expect(titleDetailsTierSummary(draft, "required")).toBe("5 of 6 complete");
    expect(titleDetailsTierSummary(draft, "recommended")).toBe("1 of 4 complete");
    expect(titleDetailsTierSummary(draft, "optional")).toBe("0 of 2 complete");
    expect(titleDetailsReleaseSummary({ type: "new_release", originalDate: "" })).toBe("New release");
    expect(titleDetailsReleaseSummary({ type: "re_release", originalDate: "2001-05-04" })).toBe(
      "Re-release · May 4, 2001",
    );
    expect(TITLE_DETAILS.title).toBe("Metadata");
  });
});
