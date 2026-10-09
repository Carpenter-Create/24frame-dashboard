import { describe, expect, it } from "vitest";

import {
  ADD_RIGHT,
  ADD_RIGHT_CHOICE_CLASS,
  ADD_RIGHT_CHOICES_CLASS,
  ADD_RIGHT_COUNTRIES_CLASS,
  ADD_RIGHT_SEARCH_CLASS,
  ADD_RIGHT_TERRITORY_LINE_CLASS,
  EMPTY_ADD_RIGHT,
  addRightChangedRows,
  addRightClosedHref,
  addRightCodes,
  addRightCountryGroups,
  addRightDiscardLine,
  addRightGrantOnTitle,
  addRightOnTitleLine,
  addRightOpenHref,
  addRightRequest,
  addRightSummary,
  addRightTogglePick,
  addRightType,
  addRightTypeGroups,
  addRightValues,
  checkAddRight,
  mapAddRightsRpcError,
  parseAddRightWindow,
  type AddRightDraft,
} from "./add-right";
import { housePhoneForbidsTruncate } from "./house-phone-stack";
import { RIGHTS_CATEGORIES } from "./rights";
import { TITLE_DETAILS } from "./title-details";

const TITLE = "22222222-2222-4222-8222-222222222222";

function draft(next: Partial<AddRightDraft> = {}): AddRightDraft {
  return { ...EMPTY_ADD_RIGHT, ...next };
}

describe("Add right window (lib/add-right)", () => {
  it("opens on ?add-right at a known face; anything else opens the index", () => {
    expect(parseAddRightWindow("")).toBeNull();
    expect(parseAddRightWindow("?edit")).toBeNull();
    expect(parseAddRightWindow("?add-right")).toBe("index");
    expect(parseAddRightWindow("?a=1&add-right=territory")).toBe("territory");
    expect(parseAddRightWindow("?add-right=type")).toBe("type");
    expect(parseAddRightWindow("?add-right=bogus")).toBe("index");
    expect(parseAddRightWindow("?add-right=__proto__")).toBe("index");
  });

  it("keeps the page's other params and never carries the Metadata window's", () => {
    expect(addRightOpenHref("/t/1", "")).toBe("/t/1?add-right");
    expect(addRightOpenHref("/t/1", "?a=1", "exclusivity")).toBe("/t/1?a=1&add-right=exclusivity");
    expect(addRightOpenHref("/t/1", "?a=1&edit=required")).toBe("/t/1?a=1&add-right");
    expect(addRightClosedHref("/t/1", "?a=1&add-right=type")).toBe("/t/1?a=1");
    expect(addRightClosedHref("/t/1", "?edit&a=1&add-right")).toBe("/t/1?a=1");
  });

  it("keeps each territory mode's own picks, so a switch never turns picks into exclusions", () => {
    let d = draft({ mode: "include" });
    d = addRightTogglePick(d, "GB");
    d = addRightTogglePick(d, "IE");
    expect(addRightCodes(d)).toEqual(["GB", "IE"]);
    d = { ...d, mode: "exclude" };
    expect(addRightCodes(d)).toEqual([]);
    d = addRightTogglePick(d, "FR");
    expect(addRightCodes(d)).toEqual(["FR"]);
    d = { ...d, mode: "include" };
    expect(addRightCodes(d)).toEqual(["GB", "IE"]);
    d = addRightTogglePick(d, "GB");
    expect(addRightCodes(d)).toEqual(["IE"]);
    d = { ...d, mode: "world" };
    expect(addRightCodes(d)).toEqual([]);
    // Worldwide takes no picks.
    expect(addRightTogglePick(d, "US")).toBe(d);
    // The empty draft is never changed in place.
    expect(EMPTY_ADD_RIGHT.picks).toEqual({ include: [], exclude: [] });
  });

  it("names only effective changes in the ask", () => {
    expect(addRightChangedRows(EMPTY_ADD_RIGHT)).toEqual([]);
    // Picks held under a mode not chosen, with Worldwide: no Territory row.
    expect(addRightChangedRows(draft({ picks: { include: ["GB"], exclude: [] } }))).toEqual([]);
    expect(addRightChangedRows(draft({ mode: "include" }))).toEqual(["territory"]);
    expect(addRightChangedRows(draft({ type: "svod", exclusive: false }))).toEqual(["type", "exclusivity"]);
    expect(addRightDiscardLine([])).toBe("");
    expect(addRightDiscardLine(["type"])).toBe("Rights type isn't saved.");
    expect(addRightDiscardLine(["type", "exclusivity"])).toBe("Rights type and Exclusivity aren't saved.");
    expect(addRightDiscardLine(["type", "territory", "exclusivity"])).toBe(
      "Rights type, Territory and Exclusivity aren't saved.",
    );
  });

  it("checks in face order with the exact lines", () => {
    expect(checkAddRight(addRightValues(EMPTY_ADD_RIGHT))).toEqual({ face: "type", error: "Select a rights type." });
    expect(checkAddRight(addRightValues(draft({ type: "svod", mode: "include" })))).toEqual({
      face: "territory",
      error: "Choose at least one country.",
    });
    // An earlier face's problem is named first.
    expect(checkAddRight(addRightValues(draft({ mode: "include", exclusive: true })))?.face).toBe("type");
    expect(checkAddRight(addRightValues(draft({ type: "svod" })))).toEqual({
      face: "exclusivity",
      error: "Choose exclusive or non-exclusive.",
    });
    expect(checkAddRight(addRightValues(draft({ type: "svod", exclusive: false })))).toBeNull();
  });

  it("summarises each row in full, never capped", () => {
    expect(addRightSummary(EMPTY_ADD_RIGHT, "type")).toBe("—");
    expect(addRightSummary(EMPTY_ADD_RIGHT, "territory")).toBe("Worldwide");
    expect(addRightSummary(EMPTY_ADD_RIGHT, "exclusivity")).toBe("—");
    expect(addRightSummary(draft({ mode: "include" }), "territory")).toBe("Only these countries");
    expect(addRightSummary(draft({ mode: "exclude" }), "territory")).toBe("Worldwide except");
    const six = draft({ mode: "include", picks: { include: ["US", "GB", "IE", "FR", "DE", "CA"], exclude: [] } });
    const line = addRightSummary(six, "territory");
    expect(line).toBe("Canada, France, Germany, Ireland, United Kingdom, United States");
    expect(line).not.toContain("+");
    expect(addRightSummary(draft({ type: "svod", exclusive: true }), "type")).toBe("SVOD");
    expect(addRightSummary(draft({ type: "svod", exclusive: true }), "exclusivity")).toBe("Exclusive");
    expect(addRightSummary(draft({ exclusive: false }), "exclusivity")).toBe("Non-exclusive");
  });

  it("lists the 21 rights in their 5 categories, each with its description", () => {
    const groups = addRightTypeGroups();
    expect(groups.map((g) => g.label)).toEqual(RIGHTS_CATEGORIES.map((c) => c.category));
    const options = groups.flatMap((g) => g.options);
    expect(options).toHaveLength(21);
    expect(options.map((o) => o.key)).toEqual(RIGHTS_CATEGORIES.flatMap((c) => c.types.map((t) => t.code)));
    for (const option of options) expect(option.detail).toBeTruthy();
    expect(options.find((o) => o.key === "svod")).toEqual({ key: "svod", label: "SVOD", detail: "Subscription streaming." });
    expect(addRightType("svod")).toBe("svod");
    expect(addRightType("netflix")).toBeNull();
  });

  it("finds countries by name, accent, code and common name, by continent", () => {
    const keys = (query: string) => addRightCountryGroups(query).flatMap((g) => g.options.map((o) => o.key));
    expect(keys("cote")).toContain("CI");
    expect(keys("uk")).toContain("GB");
    expect(keys("zz")).toEqual([]);
    expect(addRightCountryGroups("zz")).toEqual([]);
    expect(keys("")).toHaveLength(249);
    // Empty continents drop out.
    expect(addRightCountryGroups("ireland").map((g) => g.label)).toEqual(["Europe"]);
  });

  it("sends one complete grant: no org, no window, no countries with Worldwide", () => {
    expect(addRightRequest(TITLE, EMPTY_ADD_RIGHT)).toBeNull();
    expect(addRightRequest(TITLE, draft({ type: "svod", mode: "include", exclusive: true }))).toBeNull();
    const world = addRightRequest(
      TITLE,
      draft({ type: "svod", exclusive: false, picks: { include: ["GB"], exclude: ["FR"] } }),
    );
    expect(world).toEqual({ titleId: TITLE, rightsType: "svod", mode: "world", countryCodes: [], exclusive: false });
    const include = addRightRequest(
      TITLE,
      draft({ type: "avod", mode: "include", exclusive: true, picks: { include: ["GB", "IE"], exclude: ["FR"] } }),
    );
    expect(include).toEqual({
      titleId: TITLE,
      rightsType: "avod",
      mode: "include",
      countryCodes: ["GB", "IE"],
      exclusive: true,
    });
    for (const key of ["orgId", "windowStart", "windowEnd", "p_effective_from"]) {
      expect(include).not.toHaveProperty(key);
    }
  });

  it("finds the same right and territory set on the title, whatever the order or exclusivity", () => {
    const grants = [
      { rights_type: "svod" as const, territory_mode: "world" as const, territories: [], exclusive: true },
      { rights_type: "svod" as const, territory_mode: "include" as const, territories: ["IE", "GB"], exclusive: false },
    ];
    expect(addRightGrantOnTitle(grants, { rightsType: "svod", mode: "include", territories: ["GB", "IE"] })).toBe(
      grants[1],
    );
    expect(addRightGrantOnTitle(grants, { rightsType: "svod", mode: "include", territories: ["GB"] })).toBeNull();
    expect(addRightGrantOnTitle(grants, { rightsType: "avod", mode: "world", territories: [] })).toBeNull();
    expect(addRightGrantOnTitle(grants, { rightsType: "svod", mode: "world", territories: [] })).toBe(grants[0]);
    expect(
      addRightOnTitleLine({ rights_type: "svod", territory_mode: "include", territories: ["GB", "IE"], exclusive: true }),
    ).toBe("SVOD · Exclusive · Ireland, United Kingdom is already on this title.");
    expect(
      addRightOnTitleLine({ rights_type: "avod", territory_mode: "exclude", territories: ["FR"], exclusive: false }),
    ).toBe("AVOD · Non-exclusive · Worldwide except France is already on this title.");
  });

  it("maps a refused add to an approved line and never echoes its input", () => {
    expect(mapAddRightsRpcError("Not authenticated")).toBe("Not authenticated.");
    expect(mapAddRightsRpcError("Not authorized to set rights for this organization")).toBe("Not authorized.");
    expect(mapAddRightsRpcError("Title does not belong to this organization")).toBe("Not authorized.");
    const leaked = 'new row violates check constraint "rights_grants_check" secret-detail';
    expect(mapAddRightsRpcError(leaked)).toBe("Could not save.");
    expect(mapAddRightsRpcError(leaked)).not.toContain("secret-detail");
    for (const line of ["Not authenticated.", "Not authorized.", "Could not save."]) {
      expect([TITLE_DETAILS.notAuthenticated, TITLE_DETAILS.notAuthorized, TITLE_DETAILS.saveFailed]).toContain(line);
    }
  });

  it("uses the Metadata window's chrome strings and the four new lines", () => {
    expect(ADD_RIGHT.close).toBe(TITLE_DETAILS.close);
    expect(ADD_RIGHT.done).toBe(TITLE_DETAILS.done);
    expect(ADD_RIGHT.discardTitle).toBe(TITLE_DETAILS.discardTitle);
    expect(ADD_RIGHT.countryRequired).toBe("Choose at least one country.");
    expect(ADD_RIGHT.search).toBe("Search countries");
    expect(ADD_RIGHT.noMatch).toBe("No countries match.");
    expect(ADD_RIGHT.onTitle("SVOD · Exclusive · Worldwide")).toBe("SVOD · Exclusive · Worldwide is already on this title.");
  });

  it("stacks and wraps on a phone, never truncates, and keeps the search in view", () => {
    for (const cls of [ADD_RIGHT_CHOICES_CLASS, ADD_RIGHT_CHOICE_CLASS, ADD_RIGHT_TERRITORY_LINE_CLASS]) {
      expect(housePhoneForbidsTruncate(cls)).toBe(true);
    }
    expect(ADD_RIGHT_CHOICES_CLASS).toContain("flex-col");
    expect(ADD_RIGHT_CHOICE_CLASS).toContain("min-h-11");
    expect(ADD_RIGHT_SEARCH_CLASS).toContain("sticky top-0");
    expect(ADD_RIGHT_SEARCH_CLASS).toContain("bg-bg");
  });

  it("stops a keyed-to country below the sticky search, never under it", () => {
    // The search is py-[var(--space-2)] around a 42px field (58px), and the
    // focus ring reaches 5px above a row: an option scrolled to the top edge
    // keeps 4.5rem (72px) clear.
    expect(ADD_RIGHT_SEARCH_CLASS).toContain("py-[var(--space-2)]");
    expect(ADD_RIGHT_COUNTRIES_CLASS).toBe("[&_[data-house-page-select-option]]:scroll-mt-18");
  });
});
