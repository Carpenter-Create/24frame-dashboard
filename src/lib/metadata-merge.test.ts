import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANGUAGES } from "./languages";
import {
  GENRES,
  METADATA_FIELDS,
  METADATA_LIST_MAX,
  METADATA_RUNTIME_MAX,
  METADATA_RUNTIME_MIN,
  METADATA_SYNOPSIS_MAX,
  METADATA_TEXT_MAX,
  METADATA_YEAR_MIN,
  RATINGS,
  metadataMaxYear,
  normalizeStoredMetadata,
  requiredComplete,
} from "./metadata";
import {
  MERGE_TITLE_METADATA,
  metadataCheckField,
  metadataMergeArgs,
  metadataMergeMissing,
  submitRequiredMissing,
} from "./metadata-merge";
import { ISO_COUNTRIES } from "./territories";

// The Metadata window's atomic save: the helpers the server action uses, and
// pins tying the draft SQL (the title findings migration, founder-applied) to
// the app's registry, the types entry and the shared normalize fixtures.

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261009120000_title_findings_server_derived.sql"),
  "utf8",
);
const PGTAP = readFileSync(join(process.cwd(), "supabase/tests/title_metadata_merge_test.sql"), "utf8");
const TYPES = readFileSync(join(process.cwd(), "src/lib/supabase/database.types.ts"), "utf8");

/** One function's own source: from its `create or replace` to the next `$$;`. */
function functionSql(name: string): { header: string; body: string; after: string } {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} is defined in the migration`).toBeGreaterThanOrEqual(0);
  expect(MIGRATION.indexOf(`create or replace function public.${name}(`, start + 1), `${name} is defined once`).toBe(-1);
  const end = MIGRATION.indexOf("\n$$;", start);
  const open = start + `create or replace function public.${name}`.length;
  return {
    header: MIGRATION.slice(open, MIGRATION.indexOf(")", open) + 1).replace(/\s+/g, " ").replace("( ", "(").replace(" )", ")"),
    body: MIGRATION.slice(start, end),
    after: MIGRATION.slice(end + "\n$$;".length).trimStart(),
  };
}

function sqlTextArray(body: string, name: string): string[] {
  const match = new RegExp(`${name}\\s+(?:constant\\s+)?text\\[\\] := array\\[([^\\]]*)\\]`).exec(body);
  expect(match, `${name} is a literal array`).not.toBeNull();
  return (match?.[1] ?? "").split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
}

// Real error shapes (PostgREST's PGRST202 text, Postgres's 42883 text).
const PGRST202 = {
  code: "PGRST202",
  message:
    "Could not find the function public.merge_title_metadata(p_clear, p_org_id, p_set, p_title_id) in the schema cache",
};
const UNDEFINED_MERGE = {
  code: "42883",
  message: "function public.merge_title_metadata(p_clear => text[], p_org_id => uuid, p_set => jsonb, p_title_id => uuid) does not exist",
};

describe("metadataMergeArgs", () => {
  it("splits the changes into set and clear, in registry order", () => {
    expect(metadataMergeArgs({ runtime_minutes: 100, director: null })).toEqual({
      set: { runtime_minutes: 100 },
      clear: ["director"],
    });
    expect(metadataMergeArgs({ keywords: ["a"], synopsis: "A film.", cast: null, genre: null })).toEqual({
      set: { synopsis: "A film.", keywords: ["a"] },
      clear: ["genre", "cast"],
    });
    expect(Object.keys(metadataMergeArgs({ keywords: ["a"], synopsis: "A film." }).set)).toEqual(["synopsis", "keywords"]);
  });

  it("leaves out undefined values and keys outside the registry", () => {
    expect(metadataMergeArgs({ budget: 1, director: undefined, toString: null })).toEqual({ set: {}, clear: [] });
  });
});

describe("metadataMergeMissing", () => {
  it("is true only when the merge function itself is missing", () => {
    expect(metadataMergeMissing(PGRST202)).toBe(true);
    expect(metadataMergeMissing(UNDEFINED_MERGE)).toBe(true);
  });

  it("is false for anything raised inside the function, and every other failure", () => {
    for (const error of [
      { code: "42883", message: "function public.check_title_metadata(jsonb) does not exist" },
      { code: "42883", message: "operator does not exist: jsonb = text" },
      {
        code: "PGRST202",
        message: "Could not find the function public.set_title_metadata(p_data, p_org_id, p_title_id) in the schema cache",
      },
      { code: "PGRST202", message: "Could not find the function public.merge_title_metadata_v2(p_set) in the schema cache" },
      { code: "P0001", message: "merge_title_metadata: Title does not belong to this organization" },
      { code: "22023", message: "genre: not in the list" },
      { code: "42501", message: "permission denied for function merge_title_metadata" },
      { code: "PGRST203", message: "Could not choose the best candidate function between: public.merge_title_metadata" },
      { code: "", message: "TypeError: fetch failed (merge_title_metadata)" },
      { message: "merge_title_metadata" },
      { code: "PGRST202" },
      undefined,
      null,
    ]) {
      expect(metadataMergeMissing(error), JSON.stringify(error)).toBe(false);
    }
  });
});

describe("metadataCheckField", () => {
  it("names the registry field a 22023 refusal starts with", () => {
    expect(metadataCheckField({ code: "22023", message: "genre: x\nmore" })).toBe("genre");
    expect(metadataCheckField({ code: "22023", message: "cast: at most 50" })).toBe("cast");
    expect(metadataCheckField({ code: "22023", message: "runtime_minutes: 1 to 1000" })).toBe("runtime_minutes");
  });

  it("is null for anything else", () => {
    expect(metadataCheckField({ code: "22023", message: "budget: x" })).toBeNull();
    expect(metadataCheckField({ code: "22023", message: "p_set must be a JSON object" })).toBeNull();
    expect(metadataCheckField({ code: "22023", message: 'Unknown metadata field "budget"' })).toBeNull();
    expect(metadataCheckField({ code: "22023", message: "Metadata is too large" })).toBeNull();
    expect(metadataCheckField({ code: "22023", message: "x\ngenre: y" })).toBeNull();
    expect(metadataCheckField({ code: "P0001", message: "genre: x" })).toBeNull();
    expect(metadataCheckField({ code: "22023" })).toBeNull();
    expect(metadataCheckField(null)).toBeNull();
  });
});

describe("submitRequiredMissing", () => {
  it("is true only for submit_title's empty required field refusal", () => {
    expect(
      submitRequiredMissing({ code: "P0001", message: 'Cannot submit: required metadata field "synopsis" is missing' }),
    ).toBe(true);
    for (const error of [
      { code: "22023", message: 'Cannot submit: required metadata field "synopsis" is missing' },
      { code: "P0001", message: "Title not found in this organization, or not in draft" },
      { code: "P0001", message: 'x Cannot submit: required metadata field "synopsis" is missing' },
      { code: "P0001" },
      undefined,
      null,
    ]) {
      expect(submitRequiredMissing(error), JSON.stringify(error)).toBe(false);
    }
  });
});

describe("merge_title_metadata SQL (draft, founder-applied)", () => {
  it("has the signature, gate and locks the action relies on, in its own body", () => {
    const merge = functionSql(MERGE_TITLE_METADATA);
    expect(merge.header).toBe("(p_org_id uuid, p_title_id uuid, p_set jsonb, p_clear text[])");
    expect(merge.body).toContain("security definer");
    expect(merge.body).toContain("set search_path = public");
    expect(merge.body).toContain("public.member_can(auth.uid(), p_org_id, 'operate')");
    expect(merge.body).toMatch(
      /from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;/,
    );
    expect(merge.body).toMatch(/from public\.title_metadata m\s+where m\.title_id = p_title_id\s+for update;/);
    expect(merge.body).toMatch(/\bfor update\b/);
    expect(merge.body).toContain("public.normalize_stored_title_metadata(");
    expect(merge.body).toContain("public.check_title_metadata(");
    expect(merge.body).toContain("public.refresh_title_findings(");
    expect(merge.after.split("\n").slice(0, 2)).toEqual([
      "revoke execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[]) from public, anon;",
      "grant  execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[]) to authenticated;",
    ]);
  });

  it("gives every metadata writer the same title lock, before it touches the record", () => {
    for (const name of ["set_title_metadata", "submit_title"]) {
      const { body } = functionSql(name);
      const lock = body.search(/from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id[^;]*for no key update;/);
      expect(lock, name).toBeGreaterThan(0);
      expect(lock, name).toBeLessThan(body.indexOf("public.title_metadata"));
    }
  });

  it("gives every caller of the findings refresh that title lock before it refreshes (Codex on #799)", () => {
    const names = [...MIGRATION.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]);
    const callers = names.filter(
      (name) => name !== "refresh_title_findings" && functionSql(name).body.includes("public.refresh_title_findings("),
    );
    expect([...callers].sort()).toEqual([
      "merge_title_metadata",
      "reconcile_title_findings",
      "set_title_metadata",
      "submit_title",
    ]);
    for (const name of callers) {
      const { body } = functionSql(name);
      const lock = body.search(/from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id[^;]*for no key update;/);
      expect(lock, name).toBeGreaterThan(0);
      expect(lock, name).toBeLessThan(body.indexOf("public.refresh_title_findings("));
    }
    // reconcile: a live title in p_org_id only, refused at the lock.
    expect(functionSql("reconcile_title_findings").body).toMatch(
      /from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;\s+if not found then\s+raise exception 'Title not found in this organization';\s+end if;/,
    );
  });

  it("submit_title refuses another org's title at the lock, then reads the record as the app does (Codex on #799)", () => {
    const { body } = functionSql("submit_title");
    // Refused at the lock, before the record is read.
    expect(body).toMatch(
      /for no key update;\s+if not found then\s+raise exception 'Title not found in this organization, or not in draft';/,
    );
    const read = body.indexOf("select data into v_data from public.title_metadata");
    const normalize = body.indexOf("v_data := public.normalize_stored_title_metadata(v_data);");
    expect(read).toBeGreaterThan(body.indexOf("if not found then"));
    expect(normalize).toBeGreaterThan(read);
    expect(normalize).toBeLessThan(body.indexOf("foreach v_key in array v_required"));
    expect(normalize).toBeLessThan(body.indexOf("public.check_title_metadata(v_required_values)"));
    // The refusal submitTitle reads as the required-fields notice.
    const raised = /raise exception '(Cannot submit: required metadata field "%" is missing)'/.exec(body)?.[1] ?? "";
    expect(submitRequiredMissing({ code: "P0001", message: raised.replace("%", "synopsis") })).toBe(true);
  });

  it("submit_title checks only the required tier's values, as requiredComplete counts them (Codex on #799)", () => {
    const { body } = functionSql("submit_title");
    const subset = body.search(
      /select coalesce\(jsonb_object_agg\(e\.key, e\.value\), '\{\}'::jsonb\) into v_required_values\s+from jsonb_each\(v_data\) e\s+where e\.key = any \(v_required\);/,
    );
    const check = body.indexOf("perform public.check_title_metadata(v_required_values);");
    expect(subset).toBeGreaterThan(body.indexOf("v_data := public.normalize_stored_title_metadata(v_data);"));
    expect(check).toBeGreaterThan(subset);
    expect(body).not.toMatch(/check_title_metadata\(\s*v_data\s*\)/);
    // The app's side of the same gate: a refused recommended or optional
    // value never counts against the required tier; a refused required one does.
    const required = {
      synopsis: "A film.",
      runtime_minutes: 96,
      release_year: 2024,
      genre: "drama",
      primary_language: "en",
      country_of_origin: "US",
    };
    expect(requiredComplete({ ...required, director: "x".repeat(201), alternate_title: "y".repeat(201) })).toEqual({
      filled: 6,
      total: 6,
    });
    expect(requiredComplete({ ...required, primary_language: "zz" })).toEqual({ filled: 5, total: 6 });
    expect(requiredComplete({ ...required, country_of_origin: "ZZ" })).toEqual({ filled: 5, total: 6 });
  });

  it("keeps the normalize helper internal and its registry equal to the app's", () => {
    const normalize = functionSql("normalize_stored_title_metadata");
    expect(normalize.header).toBe("(p_data jsonb)");
    expect(normalize.body).not.toContain("security definer");
    expect(normalize.after.split("\n")[0]).toBe(
      "revoke execute on function public.normalize_stored_title_metadata(jsonb) from public, anon, authenticated, service_role;",
    );
    expect(normalize.after).not.toMatch(/^grant\s+execute on function public\.normalize_stored_title_metadata/m);
    expect(sqlTextArray(normalize.body, "c_keys")).toEqual(METADATA_FIELDS.map((f) => f.key));
    expect(sqlTextArray(normalize.body, "c_numbers")).toEqual(
      METADATA_FIELDS.filter((f) => f.type === "number").map((f) => f.key),
    );
    expect(sqlTextArray(normalize.body, "c_lists")).toEqual(
      METADATA_FIELDS.filter((f) => f.type === "list").map((f) => f.key),
    );
  });

  it("is typed by hand in database.types.ts with the SQL's argument names", () => {
    const entry = /\n {6}merge_title_metadata: \{\n {8}Args: \{([^}]*)\}\n {8}Returns: undefined\n {6}\}/.exec(TYPES);
    expect(entry).not.toBeNull();
    const typed = [...(entry?.[1] ?? "").matchAll(/(p_\w+):/g)].map((m) => m[1]).sort();
    const sql = [...functionSql(MERGE_TITLE_METADATA).header.matchAll(/(p_\w+) /g)].map((m) => m[1]).sort();
    expect(typed).toEqual(sql);
    expect(entry?.[1]).toContain("p_clear: string[]");
    expect(entry?.[1]).toContain("p_set: Json");
  });
});

describe("check_title_metadata matches the app's registry and limits", () => {
  const { body } = functionSql("check_title_metadata");

  it("checks exactly the registry's keys", () => {
    const keys = [...body.matchAll(/^\s*when ((?:'[a-z_]+'(?:,\s*)?)+) then/gm)].flatMap((m) =>
      m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, "")),
    );
    expect([...keys].sort()).toEqual(METADATA_FIELDS.map((f) => f.key).sort());
  });

  it("accepts exactly the values the app's lists offer (Codex on #799)", () => {
    const listAfter = (key: string) => {
      const match = new RegExp(`when '${key}' then[\\s\\S]*?not in \\(([\\s\\S]*?)\\)`).exec(body);
      return (match?.[1] ?? "").split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
    };
    expect(listAfter("genre")).toEqual(GENRES.map((g) => g.value));
    expect(listAfter("rating")).toEqual(RATINGS.map((r) => r.value));
    expect(listAfter("primary_language")).toEqual(LANGUAGES.map((l) => l.value));
    expect(listAfter("country_of_origin")).toEqual(Object.keys(ISO_COUNTRIES));
    // Each list is the vocabulary the app's schema enforces for that field.
    for (const key of ["genre", "primary_language", "country_of_origin", "rating"]) {
      const vocab = METADATA_FIELDS.find((f) => f.key === key)?.vocab?.map((v) => v.value) ?? [];
      expect(vocab.length, key).toBeGreaterThan(0);
      expect(new Set(listAfter(key)).size, key).toBe(listAfter(key).length);
      expect([...listAfter(key)].sort(), key).toEqual([...vocab].sort());
    }
    // No shape check stands in for a list.
    expect(body).not.toContain("!~");
  });

  it("holds the approved limits, counting raw characters without trimming", () => {
    expect(body).toContain(`char_length(v_text) > ${METADATA_SYNOPSIS_MAX}`);
    expect(body).toContain(`char_length(v_text) > ${METADATA_TEXT_MAX}`);
    expect(body).toContain(`v_num < ${METADATA_RUNTIME_MIN} or v_num > ${METADATA_RUNTIME_MAX}`);
    expect(body).toContain(`v_num < ${METADATA_YEAR_MIN}`);
    expect(body).toContain("extract(year from now())::int + 1 + 5");
    expect(metadataMaxYear(new Date(Date.UTC(2026, 5, 1)))).toBe(2026 + 1 + 5);
    expect(body).toContain(`jsonb_array_length(v_val) > ${METADATA_LIST_MAX}`);
    expect(body).toContain(`char_length(v_item #>> '{}') > ${METADATA_TEXT_MAX}`);
    expect(body).not.toMatch(/trim\(/i);
  });

  it("submit_title's required list is the registry's required tier", () => {
    const required = sqlTextArray(functionSql("submit_title").body, "v_required");
    expect(required).toEqual(METADATA_FIELDS.filter((f) => f.tier === "required").map((f) => f.key));
  });
});

describe("normalize parity (the fixtures shared with title_metadata_merge_test.sql)", () => {
  const block = /-- normalize-fixtures:start\n([\s\S]*?)\n-- normalize-fixtures:end/.exec(PGTAP)?.[1] ?? "";
  const lines = block.split("\n").filter((line) => line.trim() !== "");
  const rows = lines.map((line) => {
    const match = /^\s*\(\$j\$(.*?)\$j\$,\s*\$j\$(.*?)\$j\$,\s*\$j\$(.*?)\$j\$\),?\s*(--\s*js-differs)?\s*$/.exec(line);
    expect(match, line).not.toBeNull();
    return { input: match?.[1] ?? "", sql: match?.[2] ?? "", js: match?.[3] ?? "", differs: Boolean(match?.[4]) };
  });

  it("has the shared rows, two of them the known differences", () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(rows.filter((row) => row.differs).map((row) => row.input)).toEqual([
      '{"runtime_minutes":"0x60"}',
      '{"runtime_minutes":"1e999"}',
    ]);
  });

  it("normalizeStoredMetadata gives each row's app result", () => {
    for (const row of rows) {
      expect(normalizeStoredMetadata(JSON.parse(row.input) as never), row.input).toEqual(JSON.parse(row.js));
    }
  });

  it("the database gives the same result except on the marked rows", () => {
    for (const row of rows.filter((r) => !r.differs)) {
      expect(JSON.parse(row.sql), row.input).toEqual(JSON.parse(row.js));
    }
  });
});
