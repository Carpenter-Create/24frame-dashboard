import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANGUAGES } from "./languages";
import {
  GENRES,
  METADATA_FIELDS,
  METADATA_LIST_MAX,
  METADATA_LOGIC_VERSION,
  METADATA_RUNTIME_MAX,
  METADATA_RUNTIME_MIN,
  METADATA_SYNOPSIS_MAX,
  METADATA_TEXT_MAX,
  METADATA_YEAR_MIN,
  RATINGS,
  metadataMaxYear,
  metadataValueAccepted,
  normalizeStoredMetadata,
  requiredComplete,
  storedNumberText,
} from "./metadata";
import {
  MERGE_TITLE_METADATA,
  metadataCheckField,
  metadataMergeArgs,
  metadataMergeMissing,
  metadataRefusalError,
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
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
/** SQL comment text as prose: the `--` prefixes and line breaks folded to spaces. */
const prose = (sql: string) => sql.replace(/\n\s*--\s?/g, " ").replace(/\s+/g, " ");

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

// Bugbot on #799: the window reads an over-long entry as the entry limit
// (metadataValueError), so the database's refusal of the same value does too.
describe("metadataRefusalError", () => {
  it("reads a list refused for one entry as the entry limit, any other list refusal as the count", () => {
    expect(metadataRefusalError({ code: "22023", message: "cast: each entry 1 to 200 characters" }, "cast")).toBe(
      "Up to 200 characters.",
    );
    expect(metadataRefusalError({ code: "22023", message: "keywords: each entry 1 to 200 characters\nx" }, "keywords")).toBe(
      "Up to 200 characters.",
    );
    expect(metadataRefusalError({ code: "22023", message: "cast: at most 50" }, "cast")).toBe("Up to 50 entries.");
    expect(metadataRefusalError({ code: "22023", message: "keywords: expected a list" }, "keywords")).toBe(
      "Up to 50 entries.",
    );
    // The entry wording on a field that is not a list is that field's own line.
    expect(metadataRefusalError({ code: "22023", message: "director: each entry 1 to 200 characters" }, "director")).toBe(
      "Up to 200 characters.",
    );
    expect(metadataRefusalError({ code: "22023", message: "genre: not in the list" }, "genre")).toBe(
      "Choose one from the list.",
    );
    expect(metadataRefusalError({ code: "22023", message: "runtime_minutes: 1 to 1000" }, "runtime_minutes")).toBe(
      "Enter whole minutes, 1 to 1,000.",
    );
  });

  it("matches the check's own list refusals, word for word", () => {
    const { body } = functionSql("check_title_metadata");
    expect(body).toContain("raise exception '%: at most 50', v_key using errcode = '22023';");
    expect(body).toContain("raise exception '%: each entry 1 to 200 characters', v_key using errcode = '22023';");
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

// Codex on #799: findings are derived from the record as the window reads it,
// and the check has no byte cap that could refuse a record within the limits.
describe("the findings refresh and the check (draft, founder-applied)", () => {
  it("derives findings from the normalized record, as requiredComplete counts it", () => {
    const { body } = functionSql("refresh_title_findings");
    expect(body).toContain(
      "v_findings := public.title_metadata_findings(public.normalize_stored_title_metadata(v_data));",
    );
    expect(body).not.toMatch(/title_metadata_findings\(v_data\)/);
  });

  // Codex on #799: filled means filled with a value the checks accept, in the
  // database as in metadataTierCount, under the same logic version.
  it("finds a field missing when empty or refused by its check, stamped with the app's logic version", () => {
    const findings = functionSql("title_metadata_findings");
    expect(findings.body).toContain("language sql stable");
    expect(findings.body).toContain(
      "where public.title_metadata_value_empty(coalesce(p_data, '{}'::jsonb) -> f.key)\n     or not public.title_metadata_value_valid(f.key, coalesce(p_data, '{}'::jsonb) -> f.key);",
    );
    const valid = functionSql("title_metadata_value_valid").body;
    expect(valid).toContain("perform public.check_title_metadata(jsonb_build_object(p_key, p_value));");
    expect(valid).toMatch(/exception when sqlstate '22023' then\s+return false;/);
    // Defined after the check it calls, and the validator after both.
    expect(MIGRATION.indexOf("create or replace function public.check_title_metadata(")).toBeLessThan(
      MIGRATION.indexOf("create or replace function public.title_metadata_value_valid("),
    );
    expect(MIGRATION.indexOf("create or replace function public.title_metadata_value_valid(")).toBeLessThan(
      MIGRATION.indexOf("create or replace function public.title_metadata_findings("),
    );
    expect(functionSql("refresh_title_findings").body).toContain(`'${METADATA_LOGIC_VERSION}', now(), 'open', null)`);
  });

  // The audit on #799: the internal refresh and both passes are revoked from
  // service_role too, as normalize_stored_title_metadata is, and never granted.
  it("keeps the refresh internal: no client role, service_role included", () => {
    expect(functionSql("refresh_title_findings").after.split("\n")[0]).toBe(
      "revoke execute on function public.refresh_title_findings(uuid, uuid) from public, anon, authenticated, service_role;",
    );
    expect(MIGRATION).not.toMatch(/grant\s+execute on function public\.refresh_title_findings/);
  });

  it("has no size cap of its own", () => {
    const { body } = functionSql("check_title_metadata");
    expect(body).not.toMatch(/octet_length|pg_column_size|too large/i);
  });
});

// Codex on #799: findings forged before the migration are re-derived once,
// when it is applied, by a pass no client may call.
describe("the one pass over live titles' findings (draft, founder-applied)", () => {
  it("is definer-only, revoked from every client role, and runs once at apply", () => {
    const pass = functionSql("refresh_live_title_findings");
    expect(pass.header).toBe("()");
    expect(pass.body).toContain("security definer");
    expect(pass.body).toContain("set search_path = public");
    expect(pass.after).toMatch(
      /^revoke execute on function public\.refresh_live_title_findings\(\) from public, anon, authenticated, service_role;/,
    );
    expect(pass.after).not.toMatch(/grant\s+execute on function public\.refresh_live_title_findings/);
    // Called once, after it is defined and revoked.
    const run = MIGRATION.indexOf("do $$\nbegin\n  perform public.refresh_live_title_findings();\nend;\n$$;");
    expect(run).toBeGreaterThan(MIGRATION.indexOf("revoke execute on function public.refresh_live_title_findings()"));
    expect(MIGRATION.split("perform public.refresh_live_title_findings();")).toHaveLength(2);
  });

  // Codex on #799: an old-body reconcile takes no title lock, so the final
  // pass waits for every transaction that began before it, then refreshes.
  it("drains every older client transaction before the final pass, and refuses blind", () => {
    const finish = functionSql("finish_title_findings_repair");
    expect(finish.header).toBe("(p_max_wait_seconds integer default 120)");
    expect(finish.body).not.toContain("security definer");
    expect(finish.after).toMatch(
      /^revoke execute on function public\.finish_title_findings_repair\(integer\) from public, anon, authenticated, service_role;/,
    );
    expect(MIGRATION).not.toMatch(/grant\s+execute on function public\.finish_title_findings_repair/);
    const body = finish.body;
    // pg_stat_activity shows other roles' transactions by inherited privilege
    // (USAGE), not bare membership (review on #799).
    const guard = body.indexOf("pg_has_role(current_user, 'pg_read_all_stats', 'usage')");
    expect(body).not.toMatch(/pg_has_role\([^)]*'member'\)/i);
    const since = body.indexOf("v_since timestamptz := clock_timestamp();");
    const drain = body.search(
      /from pg_stat_activity a\s+where a\.backend_type = 'client backend'\s+and a\.pid <> pg_backend_pid\(\)\s+and a\.xact_start < v_since;/,
    );
    const refuse = body.indexOf("raise exception '% transaction(s) from before this call are still open; nothing was refreshed', v_open;");
    const pass = body.indexOf("return public.refresh_live_title_findings();");
    for (const at of [guard, since, drain, refuse, pass]) expect(at).toBeGreaterThan(0);
    expect(since).toBeLessThan(drain);
    // Each look clears the cached activity first, so ended transactions drop
    // out (Codex on #799): the clear sits inside the loop, before the read.
    const clear = body.indexOf("perform pg_stat_clear_snapshot();");
    expect(clear).toBeGreaterThan(body.indexOf("  loop\n"));
    expect(clear).toBeLessThan(drain);
    expect(guard).toBeLessThan(drain);
    expect(drain).toBeLessThan(pass);
    expect(refuse).toBeLessThan(pass);
    // The pass runs only after the loop: never inside it.
    expect(body.indexOf("end loop;")).toBeLessThan(pass);
    // Never run by the migration itself (its own transaction is the one to drain).
    expect(MIGRATION).not.toMatch(/perform public\.finish_title_findings_repair|select public\.finish_title_findings_repair/);
  });
});

// Review on #799: what the founder is told about the passes, and what he runs.
describe("the apply runbook and the claims about the passes (draft, founder-applied)", () => {
  const LOCK = read("docs/design-locks/aggregation-title-details-window-lock-v1.md");
  const CURRENT = read("docs/status/CURRENT.md");
  const FINDINGS_PGTAP = read("supabase/tests/findings_test.sql");
  /** This migration's own section of CURRENT.md (others share the phrasing). */
  const currentSection = () => {
    const heading = "## Title metadata checks and atomic save";
    expect(CURRENT).toContain(heading);
    const section = CURRENT.slice(CURRENT.indexOf(heading));
    return section.slice(0, section.indexOf("\n---"));
  };

  // Every pass re-stamps derived_at and appends an audit row per open
  // finding, so a pass is not idempotent; a pass in the same UTC year over
  // records and findings unchanged since the last one changes no finding's
  // status, code or message.
  it("never calls a pass idempotent, and says what a re-run does change", () => {
    for (const text of [MIGRATION, FINDINGS_PGTAP, LOCK, currentSection()]) expect(text).not.toMatch(/idempotent/i);
    // Qualified (review on #799): a refused call writes nothing; unchanged
    // records alone are not enough (an old-body reconcile can write findings
    // between passes), and the release-year limit moves on 1 January.
    const step9 = LOCK.split("\n").find((line) => line.startsWith("9. ")) ?? "";
    for (const text of [currentSection().replace(/\s+/g, " "), step9]) {
      expect(text).toContain("a refused call writes nothing");
      expect(text).toMatch(
        /[Oo]nce a pass has run, another pass in the same UTC year over records and findings unchanged since then changes no finding's status, code or message/,
      );
      expect(text).not.toMatch(/another pass over records unchanged since then/);
      expect(text).toContain("re-stamps `derived_at` and appends one audit row per open finding");
      expect(text).not.toMatch(/a re-run changes no finding|Re-running it is safe/);
    }
    expect(step9).toContain("a reconcile still on the old body can write findings between passes");
    expect(step9).toContain("the release-year limit moves on 1 January");
    expect(prose(MIGRATION)).toContain(
      "A second pass in the same UTC year, over records and findings unchanged since the first, changes no finding's status, code or message (review on #799: between passes a reconcile on the old body can still write findings, section 10, and the release-year limit moves on 1 January).",
    );
    expect(prose(MIGRATION)).not.toContain("A second pass over an unchanged record");
    expect(prose(MIGRATION)).toContain("each pass re-stamps derived_at on every open validator finding");
    expect(FINDINGS_PGTAP).toContain("'a second pass over unchanged records changes no finding''s status, code or message'");
    expect(FINDINGS_PGTAP).toMatch(
      /where f\.status is distinct from p\.status or f\.code is distinct from p\.code\s+or f\.message is distinct from p\.message/,
    );
    expect(FINDINGS_PGTAP).toContain("select id, code, status, message from public.findings where source = 'validator';");
  });

  // The lock's checklist once left out the final pass and the after-check.
  it("the lock's checklist runs the final pass and the after-check between the apply and the merge", () => {
    const row = LOCK.split("\n").find((line) => line.startsWith("| What does Adam need to do? |")) ?? "";
    const steps = [
      "apply that migration to production once, as one transaction, in a quiet window",
      "run `select public.finish_title_findings_repair();` as `postgres`, in its own transaction, and run it again if it refuses because transactions are still open",
      "run the read-only after-check, expecting 0",
      "the preview checks",
      "(6) merge",
    ].map((step) => row.indexOf(step));
    for (const at of steps) expect(at).toBeGreaterThan(0);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    expect(row).toContain("a concurrent `link_title_to_work_of` can deadlock with it");
    expect(row).toContain("if it aborts the migration, the migration rolls back whole and re-running it is safe");
    // This migration's own section of CURRENT.md (others share the phrasing).
    const heading = "## Title metadata checks and atomic save";
    expect(CURRENT).toContain(heading);
    const section = CURRENT.slice(CURRENT.indexOf(heading));
    const current = section.slice(0, section.indexOf("\n---")).replace(/\s+/g, " ");
    for (const text of [current, prose(MIGRATION)]) {
      expect(text).toContain("finish_title_findings_repair");
      expect(text).toContain("after-check");
      expect(text).toContain("quiet window");
      expect(text).toContain("link_title_to_work_of");
    }
    const gate = ["applies it in a quiet window", "finish_title_findings_repair", "read-only after-check", "verifies on the PR preview", "then merges"].map(
      (step) => current.indexOf(step),
    );
    for (const at of gate) expect(at).toBeGreaterThan(0);
    expect([...gate].sort((a, b) => a - b)).toEqual(gate);
  });

  // One after-check, word for word, in the SQL the founder approves and in the lock.
  it("the after-check in the lock is the one in the migration", () => {
    const fromSql = /--   (select count\(\*\) as titles_out_of_step[\s\S]*?'\{\}'::jsonb\)\)\)\) d\);)/.exec(MIGRATION)?.[1] ?? "";
    const fromLock = /```sql\n\s*(select count\(\*\) as titles_out_of_step[\s\S]*?d\);)\n\s*```/.exec(LOCK)?.[1] ?? "";
    expect(fromSql).not.toBe("");
    expect(prose(fromSql)).toBe(fromLock.replace(/\s+/g, " "));
    // Read-only, as the window reads the record.
    expect(fromLock).not.toMatch(/\b(update|insert|delete|truncate)\b|refresh_|finish_/i);
    expect(fromLock).toContain("public.title_metadata_findings(public.normalize_stored_title_metadata(");
    // Code, severity and message on both sides (review on #799), each side
    // in code order, so a finding with a forged message or severity counts.
    expect(fromLock).toContain(
      "array_agg(f.code || '|' || f.severity::text || '|' || f.message order by f.code), '{}'::text[])",
    );
    expect(fromLock).toContain(
      "array_agg((d->>'code') || '|' || (d->>'severity') || '|' || (d->>'message') order by d->>'code'), '{}'::text[])",
    );
    // title_metadata_findings's own keys.
    const { body: derive } = functionSql("title_metadata_findings");
    for (const key of ["'code',", "'severity',", "'message',"]) expect(derive).toContain(key);
    // The descriptions say what it compares.
    const step10 = LOCK.split("\n").find((line) => line.startsWith("10. ")) ?? "";
    for (const text of [step10, prose(MIGRATION)]) {
      expect(text).toContain("the same codes, each with the same severity and message");
    }
  });

  // Review on #799 (parity): a repair's "from" is the page's JSON.parse
  // reading, compared with the exact stored jsonb.
  it("says a repair from a value JSON.parse rounds is skipped, the safe direction", () => {
    expect(prose(MIGRATION)).toContain(
      "\"from\" is the stored value as the page's JSON.parse read it, compared here with jsonb equality against the exact stored value",
    );
    expect(prose(MIGRATION)).toContain("the repair is skipped. That is the safe direction");
    const actions = prose(read("src/app/(app)/aggregation/titles/[id]/actions.ts").replace(/\n\s*\/\/\s?/g, "\n-- "));
    expect(actions).toContain("`from` is the stored value as JSON.parse read it, and the merge compares it with the exact stored jsonb");
    expect(actions).toContain("the repair is skipped, the safe direction (the check then names the field)");
  });

  it("the checks test claims the year bounds, not the UTC reading, which vitest pins", () => {
    const header = read("supabase/tests/title_metadata_checks_test.sql").split("\nbegin;")[0];
    expect(prose(header)).toContain("The year tests cover the bounds (1888, and next year plus five), not the time zone");
    expect(prose(header)).not.toMatch(/\(Adam 2026-10-09, "Add these limits"; the year limit counted in UTC/);
    expect(functionSql("check_title_metadata").body).toContain("extract(year from now() at time zone 'UTC')::int + 1 + 5");
  });
});

describe("merge_title_metadata SQL (draft, founder-applied)", () => {
  it("has the signature, gate and locks the action relies on, in its own body", () => {
    const merge = functionSql(MERGE_TITLE_METADATA);
    expect(merge.header).toBe("(p_org_id uuid, p_title_id uuid, p_set jsonb, p_clear text[], p_repair jsonb default null)");
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
      "revoke execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb) from public, anon;",
      "grant  execute on function public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb) to authenticated;",
    ]);
    expect(MIGRATION).toContain("--   drop function public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb);");
    expect(MIGRATION).not.toMatch(/merge_title_metadata\(uuid, uuid, jsonb, text\[\]\)/);
  });

  // Review on #799: a repair sent with the window's stale view overwrote a
  // save made since. It now applies only while the stored value is still the
  // one the window opened on, under the lock, never over a field the save
  // sets or clears, and never as a clear.
  it("applies a repair only while the stored value is the one the window opened on", () => {
    const { body } = functionSql(MERGE_TITLE_METADATA);
    expect(body).toContain("v_repair  jsonb  := coalesce(p_repair, '{}'::jsonb);");
    expect(body).toMatch(
      /if jsonb_typeof\(v_repair\) <> 'object' then\s+raise exception 'p_repair must be a JSON object' using errcode = '22023';/,
    );
    const loop = body.indexOf("for v_key, v_fix in select key, value from jsonb_each(v_repair) loop");
    expect(loop).toBeGreaterThan(body.search(/from public\.title_metadata m\s+where m\.title_id = p_title_id\s+for update;/));
    expect(body.slice(loop)).toMatch(
      new RegExp(
        [
          "if jsonb_typeof\\(v_fix\\) = 'object'",
          "and not \\(v_set \\? v_key\\)",
          "and not \\(v_key = any \\(v_clear\\)\\)",
          "and not public\\.title_metadata_value_empty\\(v_fix -> 'to'\\)",
          "and \\(v_current -> v_key\\) = \\(v_fix -> 'from'\\) then",
          "v_fixed := v_fixed \\|\\| jsonb_build_object\\(v_key, v_fix -> 'to'\\);",
          "end if;",
          "end loop;",
        ].join("\\s+"),
      ),
    );
    // Applied under the change: the save's own set and clear win.
    expect(body).toContain("(public.normalize_stored_title_metadata(v_current) || v_fixed || v_set) - v_clear);");
    expect(body.split("v_fixed :=")).toHaveLength(2);
    // "from" is compared with the stored value as stored, the raw record the
    // window opened on, never a normalized copy (review on #799: Cast stored
    // as [1,"Ada"," "] normalizes to [1,"Ada"]): v_current is only ever the
    // row read, and normalize runs once, in the merge, after the repairs.
    expect(body).not.toMatch(/v_current\s*:=/);
    expect(body.match(/into v_current\b/g)).toHaveLength(2);
    expect(body.split("normalize_stored_title_metadata(")).toHaveLength(2);
  });

  it("gives every metadata writer the same title lock, before it touches the record", () => {
    for (const name of ["set_title_metadata", "submit_title", MERGE_TITLE_METADATA]) {
      const { body } = functionSql(name);
      const lock = body.search(/from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id[^;]*for no key update;/);
      expect(lock, name).toBeGreaterThan(0);
      expect(lock, name).toBeLessThan(body.indexOf("public.title_metadata"));
    }
  });

  // Review on #799: the FOR UPDATE pins also matched the conflict branch's
  // re-read, so they could not see the main read lose its row lock, or the
  // title lock move after it (a merge would then hold the record and wait
  // for the title while set_title_metadata holds the title and waits for the
  // record).
  it("merge_title_metadata locks the title before its first read of the record, and that main read is FOR UPDATE", () => {
    const { body } = functionSql(MERGE_TITLE_METADATA);
    const lock = body.search(
      /perform 1 from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;\s+if not found then\s+raise exception 'Title does not belong to this organization';\s+end if;/,
    );
    const firstRead = body.indexOf("from public.title_metadata m");
    expect(lock).toBeGreaterThan(0);
    expect(firstRead).toBeGreaterThan(lock);
    // The first statement on the record, whole: the main read, FOR UPDATE,
    // followed by the no-record branch (so not the conflict re-read).
    const readStart = body.lastIndexOf("select m.data into v_current", firstRead);
    const readEnd = body.indexOf(";", firstRead);
    expect(readStart).toBeGreaterThan(lock);
    expect(body.slice(readStart, readEnd)).toMatch(
      /^select m\.data into v_current\s+from public\.title_metadata m\s+where m\.title_id = p_title_id\s+for update$/,
    );
    expect(body.slice(readEnd)).toMatch(/^;\s+if not found then\s+v_merged := public\.check_title_metadata\(v_set - v_clear\);/);
    // The conflict branch's re-read is the only other read, and comes after.
    expect(body.split("from public.title_metadata m")).toHaveLength(3);
    expect(body.indexOf("from public.title_metadata m", readEnd)).toBeGreaterThan(body.indexOf("on conflict (title_id) do nothing;"));
  });

  // Codex on #799: an unlocked exists check let a delete that committed
  // before the update leave set_title_release_info writing a deleted title.
  it("set_title_release_info takes the live-title lock before it updates, and its update repeats the predicates", () => {
    const { body } = functionSql("set_title_release_info");
    const lock = body.search(
      /perform 1 from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;\s+if not found then\s+raise exception 'Title does not belong to this organization';/,
    );
    const update = body.indexOf("update public.titles");
    expect(lock).toBeGreaterThan(0);
    expect(lock).toBeLessThan(update);
    expect(body).not.toMatch(/if not exists \(/);
    expect(body.slice(update)).toMatch(
      /where id = p_title_id and org_id = p_org_id and deleted_at is null;\s+if not found then\s+raise exception 'Title does not belong to this organization';/,
    );
  });

  it("gives every caller of the findings refresh that title lock before it refreshes (Codex on #799)", () => {
    const names = [...MIGRATION.matchAll(/create or replace function public\.(\w+)\(/g)].map((m) => m[1]);
    const callers = names.filter(
      (name) => name !== "refresh_title_findings" && functionSql(name).body.includes("public.refresh_title_findings("),
    );
    expect([...callers].sort()).toEqual([
      "create_title",
      "merge_title_metadata",
      "reconcile_title_findings",
      "refresh_live_title_findings",
      "set_title_metadata",
      "submit_title",
    ]);
    // The one pass locks each live title as it walks them, and create_title
    // holds the row it inserted (below).
    for (const name of callers.filter((caller) => !["refresh_live_title_findings", "create_title"].includes(caller))) {
      const { body } = functionSql(name);
      const lock = body.search(/from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id[^;]*for no key update;/);
      expect(lock, name).toBeGreaterThan(0);
      expect(lock, name).toBeLessThan(body.indexOf("public.refresh_title_findings("));
    }
    const pass = functionSql("refresh_live_title_findings").body;
    const walk = pass.search(/from public\.titles t\s+where t\.deleted_at is null\s+order by t\.id\s+for no key update/);
    expect(walk).toBeGreaterThan(0);
    expect(walk).toBeLessThan(pass.indexOf("public.refresh_title_findings(r.org_id, r.id)"));
    const create = functionSql("create_title").body;
    const insert = create.indexOf("insert into public.titles");
    expect(insert).toBeGreaterThan(0);
    expect(create.indexOf("perform public.refresh_title_findings(p_org_id, v_title);")).toBeGreaterThan(insert);
    expect(create.indexOf("perform public.refresh_title_findings(p_org_id, v_title);")).toBeLessThan(
      create.indexOf("return v_title;"),
    );
    // The refresh takes the title lock itself (a no-op under its callers'), in
    // a statement of its own, then reads the record in the next (review on
    // #799): a statement reads from the snapshot it starts with, so a call
    // that waited on the lock reads what the save holding it committed.
    const refresh = functionSql("refresh_title_findings").body;
    const refreshLock = refresh.search(
      /perform 1 from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;\s+if not found then\s+raise exception 'Title not found in this organization';\s+end if;/,
    );
    const refreshRead = refresh.indexOf(
      "v_data := coalesce((select m.data from public.title_metadata m where m.title_id = p_title_id), '{}'::jsonb);",
    );
    expect(refreshLock).toBeGreaterThan(0);
    expect(refreshRead).toBeGreaterThan(refreshLock);
    expect(refreshRead).toBeLessThan(refresh.indexOf("v_findings := public.title_metadata_findings("));
    expect(refresh.split("public.title_metadata m")).toHaveLength(2);
    expect(refresh).not.toMatch(/join public\.title_metadata/);
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
    // A soft-deleted title is refused at the same lock (Bugbot on #799).
    expect(body).toMatch(
      /from public\.titles t\s+where t\.id = p_title_id and t\.org_id = p_org_id and t\.deleted_at is null\s+for no key update;/,
    );
    const read = body.indexOf("select data into v_data from public.title_metadata");
    const normalize = body.indexOf("v_data := public.normalize_stored_title_metadata(v_data);");
    expect(read).toBeGreaterThan(body.indexOf("if not found then"));
    expect(normalize).toBeGreaterThan(read);
    expect(normalize).toBeLessThan(body.indexOf("foreach v_key in array v_required"));
    expect(normalize).toBeLessThan(body.indexOf("public.check_title_metadata(v_required_values)"));
    // Empty as the app and the findings read it (Codex on #799): never btrim,
    // which kept " " missing here while the findings called it filled.
    expect(body).toContain("if public.title_metadata_value_empty(v_data -> v_key) then");
    expect(body).not.toMatch(/btrim/);
    expect(requiredComplete({
      synopsis: " \u00a0", runtime_minutes: 96, release_year: 2024, genre: "drama",
      primary_language: "en", country_of_origin: "US",
    })).toEqual({ filled: 5, total: 6 });
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

  // The audit on #799: a deleted title's findings leave the queue with it.
  it("my_findings serves a title's findings only while the title is live", () => {
    const mine = functionSql("my_findings");
    expect(mine.header).toBe("(p_limit integer default 500, p_org_id uuid default null)");
    expect(mine.body).toContain("security definer");
    expect(mine.body).toMatch(
      /and \(entity_type <> 'title' or exists \(\s+select 1 from public\.titles t\s+where t\.id = findings\.entity_id and t\.deleted_at is null\)\)/,
    );
    expect(mine.body).toContain("limit least(greatest(coalesce(p_limit, 0), 0), 501);");
    expect(mine.after.split("\n").slice(0, 2)).toEqual([
      "revoke execute on function public.my_findings(integer, uuid) from public, anon;",
      "grant  execute on function public.my_findings(integer, uuid) to authenticated;",
    ]);
  });

  // The audit on #799: a delete that read 'draft' unlocked could soft-delete
  // a title a submit had just put in review.
  it("delete_title checks the status it acts on under the title lock", () => {
    const { body } = functionSql("delete_title");
    const view = body.indexOf("if not public.member_can(auth.uid(), v_org, 'view') then");
    const lock = body.search(
      /select status into v_status\s+from public\.titles\s+where id = p_title_id and deleted_at is null\s+for no key update;\s+if not found then\s+raise exception 'Title is already deleted';/,
    );
    const draftOnly = body.indexOf("if v_status <> 'draft' then");
    expect(view).toBeGreaterThan(0);
    expect(lock).toBeGreaterThan(view);
    expect(lock).toBeLessThan(draftOnly);
    expect(lock).toBeLessThan(body.indexOf("v_status <> 'draft' and coalesce(v_has_reporting, false)"));
    expect(body).toMatch(
      /where id = p_title_id\s+and deleted_at is null;\s+if not found then\s+raise exception 'Title is already deleted';\s+end if;\s+update public\.assets/,
    );
  });

  // Adam, 2026-10-10, "Yes, in #799 (Recommended)": the staff gate is the one
  // this migration's other title writes put on GC staff, so GC legal and
  // accountant cannot delete.
  it("delete_title's staff gate is gc_can(auth.uid(), 'operate'), never is_gc_staff", () => {
    const { body, after } = functionSql("delete_title");
    expect(body).toContain("  v_staff := public.gc_can(auth.uid(), 'operate');\n  if not v_staff then");
    expect(body).not.toContain("is_gc_staff");
    // The member branch keeps its gate and line; nothing else moves.
    expect(body).toMatch(
      /if not v_staff then\s+if not public\.member_can\(auth\.uid\(\), v_org, 'operate'\) then\s+raise exception 'Not authorized to delete this title';/,
    );
    // After the lock, before either branch.
    expect(body.indexOf("v_staff := public.gc_can(")).toBeGreaterThan(body.indexOf("for no key update;"));
    expect(after.split("\n").slice(0, 2)).toEqual([
      "revoke execute on function public.delete_title(uuid) from public, anon;",
      "grant  execute on function public.delete_title(uuid) to authenticated;",
    ]);
    // The decision, verbatim, where the SQL is approved.
    expect(prose(MIGRATION)).toContain(
      "Adam, 2026-10-10, verbatim: \"Yes, in #799 (Recommended)\", choosing \"Add the one-line gate change plus pgTAP tests that legal and accountant are refused. You approve it with the rest of #799's SQL before applying. I'll also hide the Delete button from staff who can't use it.\"",
    );
    // pgTAP refuses legal and accountant, and still lets the operating roles delete.
    const pgtap = read("supabase/tests/titles_delete_archive_test.sql");
    for (const line of [
      "'P0001', 'Not authorized to delete this title', 'gc_legal cannot delete a draft');",
      "'P0001', 'Not authorized to delete this title', 'gc_accountant cannot delete a draft');",
      "'gc_delivery_ops still deletes a draft');",
      "'gc_account_owner still deletes a draft');",
    ]) {
      expect(pgtap).toContain(line);
    }
  });

  // Review on #799: the SQL once called gc_can(operate) "the gate every other
  // GC write uses". It names the writes that do, and the two that still take
  // any GC staff, and each claim holds in the SQL it names.
  it("says which title writes gate GC staff on gc_can(operate), and which still take is_gc_staff", () => {
    expect(MIGRATION).not.toMatch(/every other GC\s+(?:--\s+)?write/);
    expect(prose(MIGRATION)).toContain(
      "the gate this migration's other title writes put on GC staff (reconcile_title_findings directly; set_title_metadata, set_title_release_info, submit_title, merge_title_metadata and create_title through member_can)",
    );
    expect(prose(MIGRATION)).toContain(
      "gc_set_title_status (20260918120000_gc_title_status_override.sql) and mark_deleted_title_prefix_purged (20260917120200_title_delete_s3_purge.sql) still accept any GC staff (is_gc_staff). Neither changes here; narrowing them is a separate founder decision.",
    );
    for (const name of ["set_title_metadata", "set_title_release_info", "submit_title", "merge_title_metadata", "create_title"]) {
      const { body } = functionSql(name);
      expect(body, name).toMatch(/if not public\.member_can\(auth\.uid\(\), p_org_id, 'operate'\) then/);
      expect(body, name).not.toContain("is_gc_staff");
    }
    expect(functionSql("reconcile_title_findings").body).toContain(
      "if not (public.gc_can(auth.uid(), 'operate') or public.member_can(auth.uid(), p_org_id, 'operate')) then",
    );
    // The two named as still is_gc_staff: defined once, in the files named.
    const migrations = readdirSync(join(process.cwd(), "supabase/migrations")).filter((f) => f.endsWith(".sql"));
    for (const [name, file, gate] of [
      ["gc_set_title_status", "20260918120000_gc_title_status_override.sql", "if not public.is_gc_staff(auth.uid()) then"],
      ["mark_deleted_title_prefix_purged", "20260917120200_title_delete_s3_purge.sql", "if not public.is_gc_staff(auth.uid())"],
    ] as const) {
      const definers = migrations.filter((f) =>
        read(`supabase/migrations/${f}`).includes(`create or replace function public.${name}(`),
      );
      expect(definers, name).toEqual([file]);
      const sql = read(`supabase/migrations/${file}`);
      const start = sql.indexOf(`create or replace function public.${name}(`);
      expect(sql.slice(start, sql.indexOf("\n$$;", start)), name).toContain(gate);
    }
    // The lock records both, and the Archive and Restore gap, for Adam.
    const LOCK = read("docs/design-locks/aggregation-title-details-window-lock-v1.md");
    const row = (what: string) => LOCK.split("\n").find((line) => line.startsWith(`| ${what} |`)) ?? "";
    expect(row("Other GC writes")).toContain(
      "`gc_set_title_status` and `mark_deleted_title_prefix_purged` still accept any GC staff (`is_gc_staff`). #799 changes neither; narrowing them is a separate founder decision.",
    );
    expect(row("The menu")).toContain(
      "Title actions still offers Archive and Restore to GC legal and accountant staff, whom `archive_title` and `restore_title` refuse (review on #799); hiding them is a separate founder decision.",
    );
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
    const typed = [...(entry?.[1] ?? "").matchAll(/(p_\w+)\??:/g)].map((m) => m[1]).sort();
    const sql = [...functionSql(MERGE_TITLE_METADATA).header.matchAll(/(p_\w+) /g)].map((m) => m[1]).sort();
    expect(typed).toEqual(sql);
    expect(entry?.[1]).toContain("p_clear: string[]");
    expect(entry?.[1]).toContain("p_set: Json");
    // Defaulted in SQL, so optional here.
    expect(entry?.[1]).toContain("p_repair?: Json");
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
    // In UTC, as metadataMaxYear counts it, whatever the session's time zone (audit on #799).
    expect(body).toContain("extract(year from now() at time zone 'UTC')::int + 1 + 5");
    expect(body).not.toMatch(/extract\(year from now\(\)\)/);
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
  // One row per line, (input, sql_expected, js_expected), and nothing after
  // it: no row may be marked as a known difference.
  const rows = lines.map((line) => {
    const match = /^\s*\(\$j\$(.*?)\$j\$,\s*\$j\$(.*?)\$j\$,\s*\$j\$(.*?)\$j\$\),?\s*$/.exec(line);
    expect(match, line).not.toBeNull();
    return { input: match?.[1] ?? "", sql: match?.[2] ?? "", js: match?.[3] ?? "" };
  });
  const jsOf = (input: string) => rows.find((row) => row.input === input)?.js;

  // Codex on #799: hex, binary and octal text stays text on both sides, a
  // lossy decimal rounds alike on both, and text that trims to nothing is
  // empty on both. No known difference is left.
  it("has the shared rows, with no known difference", () => {
    expect(rows.length).toBeGreaterThanOrEqual(44);
    expect(block).not.toMatch(/js-differs/);
    for (const input of ['{"runtime_minutes":"0x60"}', '{"runtime_minutes":"0b11"}', '{"release_year":"0o3720"}']) {
      expect(jsOf(input), input).toBe(input);
    }
    expect(jsOf('{"runtime_minutes":"1.00000000000000000001"}')).toBe('{"runtime_minutes":1}');
    expect(jsOf('{"runtime_minutes":96.00000000000000000001}')).toBe('{"runtime_minutes":96}');
    expect(jsOf('{"runtime_minutes":"1e999"}')).toBe('{"runtime_minutes":"1e999"}');
    expect(jsOf('{"runtime_minutes":" "}')).toBe("{}");
    // The boundaries the double read depends on (review on #799): just past
    // its range stays text; its largest power of ten, a denormal, a bare
    // point either side and 2^53 + 1 read as the same double on both sides;
    // -0 and an underflow below -0 read as 0, as numeric has no -0.
    expect(jsOf('{"runtime_minutes":"1.7976931348623159e308"}')).toBe('{"runtime_minutes":"1.7976931348623159e308"}');
    expect(jsOf('{"runtime_minutes":"1e308"}')).toBe('{"runtime_minutes":1e308}');
    expect(jsOf('{"runtime_minutes":"3e-324"}')).toBe('{"runtime_minutes":5e-324}');
    expect(jsOf('{"runtime_minutes":"5."}')).toBe('{"runtime_minutes":5}');
    expect(jsOf('{"runtime_minutes":".5"}')).toBe('{"runtime_minutes":0.5}');
    expect(jsOf('{"release_year":"9007199254740993"}')).toBe('{"release_year":9007199254740992}');
    expect(jsOf('{"runtime_minutes":"-0"}')).toBe('{"runtime_minutes":0}');
    expect(jsOf('{"runtime_minutes":"-1e-400"}')).toBe('{"runtime_minutes":0}');
  });

  it("reads stored number text with the database's grammar, character for character", () => {
    const sqlNumber = /c_number\s+constant text := '([^']+)';/.exec(MIGRATION)?.[1];
    expect(sqlNumber).toBe("^[+-]?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][+-]?[0-9]{1,3})?$");
    expect(readFileSync(join(process.cwd(), "src/lib/metadata.ts"), "utf8")).toContain(
      `const STORED_DECIMAL_TEXT = /${sqlNumber}/;`,
    );
  });

  // Codex on #799: "1.00000000000000000001" was 1 in the app (Number()) and
  // refused by the exact numeric read; the audit on #799: so was a stored JSON
  // number, which the page's JSON.parse rounds. Both sides now read the same
  // IEEE-754 double.
  it("reads number text and JSON numbers as the double JS reads, whatever the session's float output", () => {
    const { header, body } = functionSql("normalize_stored_title_metadata");
    expect(header).toBe("(p_data jsonb)");
    expect(body).toMatch(/language plpgsql immutable\s+set search_path = public\s+set extra_float_digits = 1\s+as \$\$/);
    expect(body).toContain("if v_key = any (c_numbers) and jsonb_typeof(v_value) in ('string', 'number') then");
    expect(body).toContain("v_value := to_jsonb(v_text::float8);");
    expect(body).toMatch(
      /exception when numeric_value_out_of_range then\n(\s+--[^\n]*\n)+\s+if abs\(v_text::numeric\) < 1 then\s+v_value := to_jsonb\(0\);\s+end if;\s+end;/,
    );
    // Never the 15-digit float8::numeric cast, and no exact numeric read of
    // the value it keeps.
    expect(body).not.toMatch(/float8\)?::numeric|trunc\(|v_n\b/);
    // The app's side: Number() is the double; past its range, not a number.
    expect(storedNumberText("1.00000000000000000001")).toBe(1);
    expect(storedNumberText("1000.0000000000001")).toBe(1000.0000000000001);
    expect(storedNumberText("1e999")).toBeNull();
    expect(storedNumberText("-1e999")).toBeNull();
    expect(storedNumberText("1e-400")).toBe(0);
    expect(storedNumberText("0x60")).toBeNull();
    expect(storedNumberText("96e0000")).toBeNull();
    expect(storedNumberText("9".repeat(401))).toBeNull();
    // -0 is 0, as the database's numeric reads it (review on #799).
    expect(Object.is(storedNumberText("-0"), 0)).toBe(true);
    expect(Object.is(storedNumberText("-1e-400"), 0)).toBe(true);
    expect(Object.is(normalizeStoredMetadata({ runtime_minutes: "-0" }).runtime_minutes, 0)).toBe(true);
  });

  // Codex on #799: " " was filled to the findings and the app, missing to
  // submit and the window. One rule now: text that trims to nothing (with JS
  // String.prototype.trim's set) is empty.
  it("empties and trims with exactly JS String.prototype.trim's set, in both SQL helpers", () => {
    const ws = /c_ws\s+constant text := '(\[[^']+\])';/.exec(MIGRATION)?.[1] ?? "";
    expect(ws).not.toBe("");
    expect(functionSql("title_metadata_value_empty").body).toContain(`and p_value #>> '{}' ~ '^${ws}*$')`);
    expect(functionSql("normalize_stored_title_metadata").body).toContain(
      "continue when public.title_metadata_value_empty(v_value);",
    );
    const one = new RegExp(`^${ws}$`);
    const differs: string[] = [];
    for (let code = 0; code <= 0xffff; code++) {
      const ch = String.fromCharCode(code);
      if (one.test(ch) !== (ch.trim() === "")) differs.push(code.toString(16));
    }
    expect(differs).toEqual([]);
    // The app's emptiness is the same rule.
    expect(metadataValueAccepted("synopsis", "  ﻿　")).toBe(false);
    expect(metadataValueAccepted("synopsis", "\u0085")).toBe(true);
    expect(metadataValueAccepted("director", " Jo ")).toBe(true);
  });

  it("normalizeStoredMetadata gives each row's app result", () => {
    for (const row of rows) {
      expect(normalizeStoredMetadata(JSON.parse(row.input) as never), row.input).toEqual(JSON.parse(row.js));
    }
  });

  // The same literal on both sides, not merely the same once JSON.parse
  // rounds it: pgTAP compares the database's result with sql_expected exactly.
  it("the database gives the same result on every row", () => {
    for (const row of rows) {
      expect(row.sql, row.input).toBe(row.js);
      expect(JSON.parse(row.sql), row.input).toEqual(JSON.parse(row.js));
    }
  });
});
