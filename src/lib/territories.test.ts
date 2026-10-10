import { describe, expect, it } from "vitest";

import { resolveTerritoryRef as dashboardResolveTerritoryRef } from "@/lib/dashboard-register";
import { Constants } from "@/lib/supabase/database.types";
import {
  CONTINENTS,
  COUNTRY_GROUPS,
  ISO_COUNTRIES,
  ISO_COUNTRIES_BY_NAME,
  TERRITORY_MODES,
  TERRITORY_MODE_LABEL,
  describeTerritory,
  matchCountries,
  resolveTerritories,
  resolveTerritoryRef,
  territoryLine,
} from "./territories";

describe("territories (lib/territories)", () => {
  it("offers the database's three territory modes", () => {
    expect([...TERRITORY_MODES]).toEqual([...Constants.public.Enums.territory_mode]);
    expect(TERRITORY_MODE_LABEL).toEqual({
      world: "Worldwide",
      include: "Only these countries",
      exclude: "Worldwide except",
    });
  });

  it("partitions the 249 ISO countries into continents, each once", () => {
    const codes = Object.values(CONTINENTS).flat();
    expect(codes).toHaveLength(249);
    expect(new Set(codes).size).toBe(249);
    expect(new Set(codes)).toEqual(new Set(Object.keys(ISO_COUNTRIES)));
    expect(ISO_COUNTRIES_BY_NAME).toHaveLength(249);
  });

  it("groups the countries in continent order, each continent by name", () => {
    expect(COUNTRY_GROUPS.map((g) => g.continent)).toEqual(Object.keys(CONTINENTS));
    expect(COUNTRY_GROUPS).toHaveLength(7);
    for (const group of COUNTRY_GROUPS) {
      const names = group.countries.map((c) => c.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
      expect(new Set(group.countries.map((c) => c.code))).toEqual(new Set(CONTINENTS[group.continent]));
    }
  });

  it("finds countries by name (accents and case aside), code and common name", () => {
    expect(matchCountries("cote").has("CI")).toBe(true);
    expect(matchCountries("UK").has("GB")).toBe(true);
    expect(matchCountries("uk").has("GB")).toBe(true);
    expect(matchCountries("us").has("US")).toBe(true);
    expect(matchCountries("GB").has("GB")).toBe(true);
    expect(matchCountries("aland").has("AX")).toBe(true);
    expect(matchCountries("").size).toBe(249);
    expect(matchCountries("  ").size).toBe(249);
    expect(matchCountries("zz").size).toBe(0);
  });

  it("writes a territory in full, by name, with the exclusion named", () => {
    expect(territoryLine("world", ["GB"])).toBe("Worldwide");
    expect(territoryLine("include", [])).toBe("Only these countries");
    expect(territoryLine("include", ["GB", "IE"])).toBe("Ireland, United Kingdom");
    expect(territoryLine("exclude", ["US", "CA"])).toBe("Worldwide except Canada, United States");
    const six = territoryLine("include", ["US", "GB", "IE", "FR", "DE", "CA"]);
    expect(six).toBe("Canada, France, Germany, Ireland, United Kingdom, United States");
    expect(six).not.toContain("+");
  });

  it("resolves a selection to sorted, deduped, real codes", () => {
    expect(resolveTerritories("world", ["GB"])).toEqual([]);
    expect(resolveTerritories("include", [" us", "US", "ca"])).toEqual(["CA", "US"]);
    expect(() => resolveTerritories("include", ["XX"])).toThrow();
    expect(() => resolveTerritories("include", [])).toThrow();
    expect(() => resolveTerritories("exclude", [])).toThrow();
  });

  it("keeps describeTerritory as the rights list reads it, capped at four", () => {
    expect(describeTerritory("world", [])).toBe("Worldwide");
    expect(describeTerritory("include", ["GB", "IE"])).toBe("United Kingdom, Ireland");
    expect(describeTerritory("include", ["US", "GB", "IE", "FR", "DE", "CA"])).toBe(
      "United States, United Kingdom, Ireland, France +2",
    );
    expect(describeTerritory("exclude", ["US"])).toBe("Worldwide except United States");
  });

  it("still resolves territory references through lib/dashboard-register", () => {
    expect(dashboardResolveTerritoryRef).toBe(resolveTerritoryRef);
    expect(resolveTerritoryRef("uk")).toEqual({ code: "GB", name: "United Kingdom" });
    expect(resolveTerritoryRef("United States of America")).toEqual({ code: "US", name: "United States" });
    expect(resolveTerritoryRef("Narnia")).toEqual({ code: null, name: "Narnia" });
    expect(resolveTerritoryRef(" ")).toEqual({ code: null, name: "" });
  });
});
