import { describe, expect, it } from "vitest";
import {
  METADATA_FIELDS,
  computeMetadataFindings,
  metadataTierCount,
  metadataValueAccepted,
  metadataValueError,
  normalizeStoredMetadata,
  parseMetadata,
  requiredComplete,
} from "./metadata";

describe("computeMetadataFindings", () => {
  it("empty metadata → all required (high) + recommended (low), no optional", () => {
    const f = computeMetadataFindings({});
    const high = f.filter((x) => x.severity === "high");
    const low = f.filter((x) => x.severity === "low");
    expect(high).toHaveLength(6); // synopsis, runtime_minutes, release_year, genre, primary_language, country_of_origin
    expect(low).toHaveLength(4); // director, cast, rating, keywords
    expect(f.some((x) => x.field === "alternate_title")).toBe(false); // optional never flagged
    expect(f.every((x) => x.code === `metadata.missing.${x.field}`)).toBe(true);
    expect(high.every((x) => x.tier === "required" && x.message.endsWith("is required."))).toBe(true);
    expect(low.every((x) => x.tier === "recommended" && x.message.endsWith("is recommended."))).toBe(true);
  });

  it("fully complete (required + recommended) → no findings", () => {
    const full = {
      synopsis: "A film.", runtime_minutes: 94, release_year: 2026, genre: "drama",
      primary_language: "en", country_of_origin: "US",
      director: "Jo", cast: ["A", "B"], rating: "PG", keywords: ["holiday"],
    };
    expect(computeMetadataFindings(full)).toEqual([]);
  });

  it("partial → exactly the missing subset", () => {
    const f = computeMetadataFindings({ synopsis: "x", genre: "drama" });
    const missing = f.map((x) => x.field).sort();
    expect(missing).toEqual(
      ["cast", "country_of_origin", "director", "keywords", "primary_language", "rating", "release_year", "runtime_minutes"].sort(),
    );
  });

  it("empty-array and blank-string count as missing", () => {
    const f = computeMetadataFindings({ synopsis: "", cast: [] });
    expect(f.some((x) => x.field === "synopsis")).toBe(true); // "" is empty
    expect(f.some((x) => x.field === "cast")).toBe(true); // [] is empty
  });

  // Codex on #799: text that trims to nothing (String.prototype.trim) is
  // empty, as the page shows it, the window trims it and submit_title and the
  // findings read it (title_metadata_value_empty).
  it("text that trims to nothing counts as missing; other text does not", () => {
    const f = computeMetadataFindings({ synopsis: " \u00a0", director: "\u3000\ufeff", genre: "drama" });
    expect(f.some((x) => x.field === "synopsis")).toBe(true);
    expect(f.some((x) => x.field === "director")).toBe(true);
    // U+0085 and U+200B are not JS whitespace: filled, as the database reads them.
    expect(computeMetadataFindings({ synopsis: "\u0085" }).some((x) => x.field === "synopsis")).toBe(false);
    expect(metadataValueAccepted("synopsis", " ")).toBe(false);
    expect(metadataValueAccepted("synopsis", " A film. ")).toBe(true);
    expect(metadataValueAccepted("runtime_minutes", 0)).toBe(false);
    expect(metadataValueAccepted("budget", "x")).toBe(false);
  });

  // metadata-v2 (Codex on #799): filled means filled with a value the checks
  // accept, as metadataTierCount and requiredComplete count it.
  it("a value the checks refuse is not filled, exactly as the tier count reads it", () => {
    const stored = {
      synopsis: "A film.", runtime_minutes: 0, release_year: 2024, genre: "drama",
      primary_language: "en", country_of_origin: "ZZ",
      director: "x".repeat(201), cast: ["A"], rating: "PG", keywords: ["k"],
    };
    const f = computeMetadataFindings(stored);
    expect(f.map((x) => x.field).sort()).toEqual(["country_of_origin", "director", "runtime_minutes"]);
    expect(f.find((x) => x.field === "runtime_minutes")).toMatchObject({ severity: "high", message: "Runtime (minutes) is required." });
    // The required findings are exactly what requiredComplete leaves unfilled.
    const required = METADATA_FIELDS.filter((x) => x.tier === "required").length;
    expect(f.filter((x) => x.tier === "required")).toHaveLength(required - requiredComplete(stored).filled);
    expect(f.filter((x) => x.tier === "recommended")).toHaveLength(
      METADATA_FIELDS.filter((x) => x.tier === "recommended").length - metadataTierCount(stored, "recommended").filled,
    );
  });
});

describe("metadata limits (Adam 2026-10-09, \"Add these limits\")", () => {
  it("refuses values past the approved limits, naming the field and its line", () => {
    // Next year plus five (2032 in 2026).
    const year = new Date().getUTCFullYear() + 6;
    expect(parseMetadata({ runtime_minutes: 1 }).ok).toBe(true);
    expect(parseMetadata({ runtime_minutes: 1000 }).ok).toBe(true);
    expect(parseMetadata({ runtime_minutes: 0 })).toEqual({
      ok: false,
      field: "runtime_minutes",
      error: "Enter whole minutes, 1 to 1,000.",
    });
    expect(parseMetadata({ runtime_minutes: 1001 }).ok).toBe(false);
    expect(parseMetadata({ release_year: 1888 }).ok).toBe(true);
    expect(parseMetadata({ release_year: year }).ok).toBe(true);
    expect(parseMetadata({ release_year: 1887 }).ok).toBe(false);
    expect(parseMetadata({ release_year: year + 1 })).toEqual({
      ok: false,
      field: "release_year",
      error: `Enter a year from 1888 to ${year}.`,
    });
    expect(parseMetadata({ synopsis: "x".repeat(4000) }).ok).toBe(true);
    expect(parseMetadata({ synopsis: "x".repeat(4001) }).ok).toBe(false);
    expect(parseMetadata({ director: "é".repeat(200) }).ok).toBe(true);
    // Counted as the database counts: characters, not UTF-16 units.
    expect(parseMetadata({ director: "🎬".repeat(200) }).ok).toBe(true);
    expect(parseMetadata({ director: "x".repeat(201) }).ok).toBe(false);
    expect(parseMetadata({ cast: Array.from({ length: 50 }, () => "a") }).ok).toBe(true);
    expect(parseMetadata({ cast: Array.from({ length: 51 }, () => "a") })).toEqual({
      ok: false,
      field: "cast",
      error: "Up to 50 entries.",
    });
    expect(parseMetadata({ keywords: ["x".repeat(201)] }).ok).toBe(false);
    expect(parseMetadata({ genre: "Drama" })).toEqual({ ok: false, field: "genre", error: "Choose one from the list." });
  });

  it("names a list entry over 200 characters with the entry line, and too many entries with the list line (Bugbot on #801)", () => {
    expect(parseMetadata({ cast: ["Ada", "x".repeat(201)] })).toEqual({
      ok: false,
      field: "cast",
      error: "Up to 200 characters.",
    });
    expect(parseMetadata({ keywords: ["🎬".repeat(201)] })).toEqual({
      ok: false,
      field: "keywords",
      error: "Up to 200 characters.",
    });
    expect(parseMetadata({ keywords: ["🎬".repeat(200)] }).ok).toBe(true);
    // Too many entries is the count line, even when an entry is long too.
    expect(parseMetadata({ cast: Array.from({ length: 51 }, () => "x".repeat(201)) })).toEqual({
      ok: false,
      field: "cast",
      error: "Up to 50 entries.",
    });
    // Any other list problem keeps the list line.
    expect(parseMetadata({ cast: "Ada, Bob" })).toEqual({ ok: false, field: "cast", error: "Up to 50 entries." });
    expect(metadataValueError("cast", ["x".repeat(201)])).toBe("Up to 200 characters.");
    // Only a list entry reads the entry line; a text field keeps its own.
    expect(metadataValueError("director", "x".repeat(201))).toBe("Up to 200 characters.");
    expect(metadataValueError("keywords", ["ok"])).toBe("Up to 50 entries.");
    expect(metadataValueError("runtime_minutes", 0)).toBe("Enter whole minutes, 1 to 1,000.");
  });

  it("strips keys outside the registry", () => {
    const parsed = parseMetadata({ synopsis: "A film.", budget: 1 });
    expect(parsed).toEqual({ ok: true, data: { synopsis: "A film." } });
  });

  it("counts a tier only with values that pass their check", () => {
    expect(metadataTierCount({ synopsis: "A", runtime_minutes: 0, genre: "drama" }, "required")).toEqual({
      filled: 2,
      total: 6,
    });
    expect(metadataTierCount({ cast: [] }, "recommended")).toEqual({ filled: 0, total: 4 });
  });
});

describe("metadata choices", () => {
  it("lists countries by name, so a long list reads in order", () => {
    const labels = (METADATA_FIELDS.find((f) => f.key === "country_of_origin")?.vocab ?? []).map((o) => o.label);
    expect(labels.length).toBeGreaterThan(100);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "en")));
  });
});

describe("normalizeStoredMetadata", () => {
  it("drops empties, reads numeric text as numbers, drops blank list entries, keeps the rest as it is", () => {
    expect(
      normalizeStoredMetadata({
        synopsis: "",
        director: null,
        cast: ["", "Smith, Jr.", " "],
        keywords: [],
        runtime_minutes: " 96 ",
        release_year: "soon",
        genre: "Drama",
        budget: 1,
      }),
    ).toEqual({ cast: ["Smith, Jr."], runtime_minutes: 96, release_year: "soon", genre: "Drama" });
    // Text that trims to nothing is dropped, as empty (Codex on #799).
    expect(normalizeStoredMetadata({ director: " ", synopsis: "\u2028", genre: "drama" })).toEqual({ genre: "drama" });
    expect(normalizeStoredMetadata(null)).toEqual({});
  });
});

describe("requiredComplete", () => {
  it("counts a required field only when its value is accepted (Codex on #801)", () => {
    const full = { synopsis: "A", runtime_minutes: 90, release_year: 2024, genre: "drama", primary_language: "en", country_of_origin: "US" };
    expect(requiredComplete(full)).toEqual({ filled: 6, total: 6 });
    expect(requiredComplete({ ...full, runtime_minutes: 0 })).toEqual({ filled: 5, total: 6 });
    expect(requiredComplete({ ...full, genre: "Drama" })).toEqual({ filled: 5, total: 6 });
    expect(requiredComplete({ ...full, runtime_minutes: "90" })).toEqual({ filled: 6, total: 6 });
    // A Synopsis that trims to nothing is missing, as submit_title reads it (Codex on #799).
    expect(requiredComplete({ ...full, synopsis: " \u00a0" })).toEqual({ filled: 5, total: 6 });
    expect(requiredComplete(null)).toEqual({ filled: 0, total: 6 });
  });
});
