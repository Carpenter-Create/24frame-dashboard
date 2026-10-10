import { describe, expect, it } from "vitest";

import { ADD_RIGHT_PARAM } from "./add-right";
import { metadataTierCount, normalizeStoredMetadata, parseMetadata } from "./metadata";
import { TITLE_PAGE_WINDOW_PARAMS } from "./titles";
import {
  TITLE_DETAILS,
  TITLE_DETAILS_PARAM,
  TITLE_DETAILS_TIERS,
  checkTitleDetails,
  draftToMetadata,
  metadataChanges,
  metadataRepairs,
  metadataToDraft,
  parseTitleDetailsWindow,
  releaseChanged,
  releaseDraft,
  releaseInfoFromDraft,
  titleDetailsChangedRows,
  titleDetailsClosedHref,
  titleDetailsDiscardLine,
  titleDetailsFaceForField,
  titleDetailsMetadata,
  titleDetailsOpenHref,
  titleDetailsReleaseSummary,
  titleDetailsTierSummary,
  type MetadataDraft,
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
    // The page under Metadata never carries Add right's query: one window
    // per address.
    expect(titleDetailsClosedHref("/t/1", "?a=1&edit&add-right=territory")).toBe("/t/1?a=1");
    expect(TITLE_PAGE_WINDOW_PARAMS).toContain(TITLE_DETAILS_PARAM);
    expect(TITLE_PAGE_WINDOW_PARAMS).toContain(ADD_RIGHT_PARAM);
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

  it("names a Cast or Keywords entry over 200 characters with the entry line, and too many entries with the list line", () => {
    const draft = draftOf();
    draft.metadata.cast = `Ada, ${"x".repeat(201)}`;
    expect(checkTitleDetails(draft, NOW)).toEqual({
      face: "recommended",
      field: "cast",
      error: "Up to 200 characters.",
    });
    draft.metadata.cast = Array.from({ length: 51 }, (_, i) => `c${i}`).join(",");
    expect(checkTitleDetails(draft, NOW)).toEqual({ face: "recommended", field: "cast", error: "Up to 50 entries." });
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

// The audit on #799: the window read the stored record through its own
// round trip (lists re-split, numbers through Number(), choices trimmed), so
// it could call a field complete that the page, the queue and submit refuse,
// never send it, and refuse Done over a field nobody touched.
describe("the Metadata window reads the stored record as the page reads it", () => {
  const FULL = { ...STORED, director: "Jo", rating: "PG", keywords: ["k"] };
  const release = releaseDraft(NEW_RELEASE);

  // What the page counts after Done: the stored record, read as the page
  // reads it, with Done's changes merged on as merge_title_metadata merges
  // them. A repair lands only while the stored value (`now`, by default the
  // record the window opened on) is still its `from`, and never over a change.
  function afterDone(
    stored: Record<string, unknown>,
    changes: Record<string, unknown>,
    repairs: Record<string, { from: unknown; to: unknown }> = {},
    now: Record<string, unknown> = stored,
  ) {
    const merged = normalizeStoredMetadata(now);
    for (const [key, repair] of Object.entries(repairs)) {
      if (key in changes || !(key in now)) continue;
      if (JSON.stringify(now[key]) === JSON.stringify(repair.from)) merged[key] = repair.to;
    }
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) delete merged[key];
      else merged[key] = value;
    }
    return merged;
  }

  it("never blocks Done, or sends, an untouched field the page accepts", () => {
    // 30 entries with a comma each: valid as stored, 60 entries once re-split.
    const stored = { ...FULL, cast: Array.from({ length: 30 }, (_, i) => `Last${i}, First${i}`) };
    const draft: MetadataDraft = { ...metadataToDraft(stored), synopsis: "Edited." };
    expect(checkTitleDetails({ metadata: draft, release }, NOW, stored)).toBeNull();
    expect(metadataChanges(stored, draft)).toEqual({ synopsis: "Edited." });
    expect(titleDetailsTierSummary(draft, "recommended", stored)).toBe("4 of 4 complete");
    expect(metadataTierCount(normalizeStoredMetadata(stored), "recommended").filled).toBe(4);
    // Without the stored record every typed value is checked, as before.
    expect(checkTitleDetails({ metadata: draft, release }, NOW)?.field).toBe("cast");
    // Editing Cast itself still checks what was typed.
    draft.cast = `${draft.cast}, Extra`;
    expect(checkTitleDetails({ metadata: draft, release }, NOW, stored)).toEqual({
      face: "recommended",
      field: "cast",
      error: "Up to 50 entries.",
    });
  });

  it("repairs an untouched field the page refuses into what the field shows, with an edit, without asking on close", () => {
    const stored = { ...FULL, cast: "Ada, Bob" };
    const draft = { ...metadataToDraft(stored), synopsis: "Edited." };
    const changes = metadataChanges(stored, draft);
    const repairs = metadataRepairs(stored, draft);
    // The change alone; the repair carries the stored value it expects.
    expect(changes).toEqual({ synopsis: "Edited." });
    expect(repairs).toEqual({ cast: { from: "Ada, Bob", to: ["Ada", "Bob"] } });
    // The merge accepts the record Done leaves (before: refused on Cast).
    expect(parseMetadata(afterDone(stored, changes, repairs)).ok).toBe(true);
    expect(titleDetailsMetadata(stored, draft)).toEqual(afterDone(stored, changes, repairs));
    // A repair is not a change anyone made: closing asks about Required only.
    expect(
      titleDetailsChangedRows({ metadata: stored, release: NEW_RELEASE }, { metadata: draft, release }),
    ).toEqual(["required"]);
    expect(
      titleDetailsChangedRows({ metadata: stored, release: NEW_RELEASE }, { metadata: metadataToDraft(stored), release }),
    ).toEqual([]);
  });

  // Review on #799: the repair went out as a change, so another user's Cast,
  // saved after the window opened, was overwritten with the stale one.
  it("never overwrites a save made since the window opened", () => {
    const opened = { ...FULL, cast: "Ada, Bob" };
    const draft = { ...metadataToDraft(opened), synopsis: "Edited." };
    const changes = metadataChanges(opened, draft);
    const repairs = metadataRepairs(opened, draft);
    expect(changes).not.toHaveProperty("cast");
    const savedSince = { ...FULL, cast: ["Cy"] };
    expect(afterDone(opened, changes, repairs, savedSince).cast).toEqual(["Cy"]);
    // Unchanged since: the repair lands.
    expect(afterDone(opened, changes, repairs, opened).cast).toEqual(["Ada", "Bob"]);
  });

  // Review on #799: Done with no edit saved repairs, so it could be refused
  // over a field nobody touched, or rewrite one, without a word.
  it("sends nothing on Done with no edit", () => {
    for (const shape of [
      { cast: "Ada, Bob" },
      { cast: ["Smith, Jr.", 5] },
      { cast: [1, "Ada"], genre: "Drama" },
      { director: 5 },
      { director: "x".repeat(200) + " " },
    ]) {
      const stored: Record<string, unknown> = { ...FULL, ...shape };
      const draft = metadataToDraft(stored);
      expect(metadataChanges(stored, draft), JSON.stringify(shape)).toEqual({});
      expect(metadataRepairs(stored, draft), JSON.stringify(shape)).toEqual({});
      expect(titleDetailsMetadata(stored, draft), JSON.stringify(shape)).toEqual(normalizeStoredMetadata(stored));
    }
  });

  it("never repairs into a value the field does not show, or splits or drops a stored entry", () => {
    for (const shape of [
      { runtime_minutes: "0x60" },
      { runtime_minutes: "96e0000" },
      { release_year: "0o3720" },
      { runtime_minutes: true },
      { genre: " drama" },
      { synopsis: { a: 1 } },
      { cast: [["Ada"]] },
      // Review on #799: one name with a comma would become two entries, and
      // an entry that shows empty would be dropped.
      { cast: ["Smith, Jr.", 5] },
      { cast: [{ a: 1 }, "Ada"] },
      { keywords: [["k"], "space"] },
    ]) {
      const stored: Record<string, unknown> = { ...FULL, ...shape };
      const draft = { ...metadataToDraft(stored), alternate_title: "Other" };
      expect(metadataRepairs(stored, draft), JSON.stringify(shape)).toEqual({});
      expect(metadataChanges(stored, draft), JSON.stringify(shape)).toEqual({ alternate_title: "Other" });
    }
    // A list whose entries each show as one entry is repaired, whole.
    const lone = { ...FULL, cast: [1, "Ada", null, " "] };
    expect(metadataRepairs(lone, { ...metadataToDraft(lone), alternate_title: "Other" })).toEqual({
      cast: { from: [1, "Ada", null, " "], to: ["1", "Ada"] },
    });
    // An object shows empty, as the page shows it (never "[object Object]").
    expect(metadataToDraft({ synopsis: { a: 1 }, cast: [{ a: 1 }, "Ada"] })).toMatchObject({ synopsis: "", cast: ", Ada" });
    // Retyping a refused stored number sends it (before: "0x60" read as 96, so 96 sent nothing).
    const stored = { ...FULL, runtime_minutes: "0x60" };
    expect(metadataChanges(stored, { ...metadataToDraft(stored), runtime_minutes: "96" })).toEqual({ runtime_minutes: 96 });
    // And typed hex is refused with the field's line, as the page refuses it stored.
    expect(checkTitleDetails({ metadata: { ...metadataToDraft(FULL), runtime_minutes: "0x60" }, release }, NOW, FULL)).toEqual({
      face: "required",
      field: "runtime_minutes",
      error: "Enter whole minutes, 1 to 1,000.",
    });
  });

  it("counts every row as the page counts the record Done leaves: as it is now with no edit, with the repairs with one", () => {
    for (const shape of [
      { cast: "Ada, Bob" },
      { cast: [1, "Ada"] },
      { cast: [null, "Ada"] },
      { cast: [["Ada"]] },
      { cast: ["Smith, Jr.", 5] },
      { cast: 5 },
      { cast: Array.from({ length: 30 }, (_, i) => `Last${i}, First${i}`) },
      { runtime_minutes: "0x60" },
      { runtime_minutes: "96e0000" },
      { runtime_minutes: "0".repeat(401) + "96" },
      { release_year: "0o3720" },
      { runtime_minutes: true },
      { genre: " drama" },
      { genre: ["drama"] },
      { director: "x".repeat(200) + " " },
      { synopsis: " " },
      { synopsis: { a: 1 } },
    ]) {
      const stored: Record<string, unknown> = { ...FULL, ...shape };
      for (const edit of [{}, { alternate_title: "Other" }] as MetadataDraft[]) {
        const draft: MetadataDraft = { ...metadataToDraft(stored), ...edit };
        const changes = metadataChanges(stored, draft);
        const repairs = metadataRepairs(stored, draft);
        const label = `${JSON.stringify(shape)} ${JSON.stringify(edit)}`;
        expect(changes, label).toEqual(edit);
        if (Object.keys(edit).length === 0) expect(repairs, label).toEqual({});
        const after = afterDone(stored, changes, repairs);
        for (const tier of TITLE_DETAILS_TIERS) {
          const { filled, total } = metadataTierCount(after, tier);
          expect(titleDetailsTierSummary(draft, tier, stored), `${label} ${tier}`).toBe(
            TITLE_DETAILS.tierSummary(filled, total),
          );
        }
        // Done never refuses an untouched field itself; the merge names any the page refuses.
        expect(checkTitleDetails({ metadata: draft, release }, NOW, stored), label).toBeNull();
      }
    }
  });
});
