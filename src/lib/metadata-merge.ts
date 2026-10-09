import { METADATA_FIELDS } from "@/lib/metadata";

// The title Metadata window's save
// (docs/design-locks/aggregation-title-details-window-lock-v1.md): only the
// changed fields go to merge_title_metadata, which merges them onto the
// stored record under a lock on the title, checks the whole record and
// refreshes findings in one transaction (the title findings migration,
// founder-applied). Pure helpers; the server action decides what to do.

export const MERGE_TITLE_METADATA = "merge_title_metadata";

type DatabaseError = { code?: string | null; message?: string | null } | null | undefined;

/** The changes as the merge takes them, in registry order: a value is set,
 *  null clears the field. Undefined values and keys outside the registry are
 *  left out. */
export function metadataMergeArgs(changes: Record<string, unknown>): {
  set: Record<string, unknown>;
  clear: string[];
} {
  const set: Record<string, unknown> = {};
  const clear: string[] = [];
  for (const f of METADATA_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(changes, f.key)) continue;
    const value = changes[f.key];
    if (value === undefined) continue;
    if (value === null) clear.push(f.key);
    else set[f.key] = value;
  }
  return { set, clear };
}

/** True only when the database says merge_title_metadata itself is missing:
 *  PostgREST's PGRST202, or Postgres 42883, naming the function. A 42883
 *  raised inside it names another function or an operator, so it never
 *  counts; nor does any other code. */
export function metadataMergeMissing(error: DatabaseError): boolean {
  if (!error) return false;
  if (error.code !== "PGRST202" && error.code !== "42883") return false;
  return new RegExp(`\\b${MERGE_TITLE_METADATA}\\b`).test(error.message ?? "");
}

/** The registry field a database check refused (22023 whose first line is
 *  "<field>: …"), or null. Only the key is used; the line shown comes from
 *  lib, never from the database. */
export function metadataCheckField(error: DatabaseError): string | null {
  if (!error || error.code !== "22023") return null;
  const firstLine = (error.message ?? "").split("\n")[0];
  const key = /^([a-z_]+):/.exec(firstLine)?.[1];
  return key && METADATA_FIELDS.some((f) => f.key === key) ? key : null;
}
