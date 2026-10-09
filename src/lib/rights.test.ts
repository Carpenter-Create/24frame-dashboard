import { describe, expect, it } from "vitest";

import { Constants } from "@/lib/supabase/database.types";
import { EXCLUSIVITY_LABEL, RIGHTS_CATEGORIES, RIGHTS_META, RIGHTS_TYPE_CODES, exclusivityLabel } from "./rights";

describe("rights taxonomy (lib/rights)", () => {
  it("covers the database's rights types exactly once (the Add right zod enum source)", () => {
    expect(RIGHTS_TYPE_CODES).toHaveLength(21);
    expect(new Set(RIGHTS_TYPE_CODES).size).toBe(RIGHTS_TYPE_CODES.length);
    expect(new Set(RIGHTS_TYPE_CODES)).toEqual(new Set(Constants.public.Enums.rights_type));
  });

  it("gives every type a label and a description", () => {
    for (const category of RIGHTS_CATEGORIES) {
      expect(category.category.trim()).not.toBe("");
      for (const type of category.types) {
        expect(type.label.trim()).not.toBe("");
        expect(type.description.trim()).not.toBe("");
        expect(RIGHTS_META[type.code]).toEqual({ label: type.label, category: category.category });
      }
    }
  });

  it("reads exclusivity as the rights list always has", () => {
    expect(exclusivityLabel(true)).toBe("Exclusive");
    expect(exclusivityLabel(false)).toBe("Non-exclusive");
    expect(EXCLUSIVITY_LABEL).toEqual({ exclusive: "Exclusive", nonExclusive: "Non-exclusive" });
  });
});
