// A swap re-hold is allowed only when Postgres proves the conditional update
// did not commit. The pointer re-read is an extra guard. It is not proof.
// A client can time out at 150ms, read the pre-commit pointer, and tag the
// new key. The locked UPDATE then commits, and the pointer names a tagged face.
//
// Proof is one of:
// - no error, and `data` is an array of length 0 (the filter matched nothing)
// - an ErrorResponse whose SQLSTATE is listed below
//
// `data === null` with no error is not proof. The response body can be lost
// after commit. A transport error, a timeout, a missing code, and any SQLSTATE
// outside this list are not proof. Do not tag on those.

import { avatarPointerNamesKey } from "@/lib/account-avatar";

/**
 * SQLSTATE classes whose ErrorResponse aborts the statement before commit.
 * Match the first two characters. `40003` is excluded below. `57014` is the
 * only code from class 57 that counts, and it is not in this list.
 *
 * 0A feature not supported. 0L invalid grantor. 0P invalid role specification.
 * 20 case not found. 21 cardinality violation. 22 data exception.
 * 23 integrity constraint violation. 24 invalid cursor state.
 * 25 invalid transaction state. 26 invalid SQL statement name.
 * 27 triggered data change violation. 2B dependent privilege descriptors.
 * 2D invalid transaction termination. 2F SQL routine exception.
 * 34 invalid cursor name. 38 external routine exception.
 * 39 external routine invocation exception. 3B savepoint exception.
 * 3D invalid catalog name. 3F invalid schema name.
 * 40 transaction rollback, except 40003 statement_completion_unknown.
 * 42 syntax error or access rule violation. 44 WITH CHECK OPTION violation.
 * 53 insufficient resources. 54 program limit exceeded.
 * 55 object not in prerequisite state. P0 PL/pgSQL error.
 */
export const AVATAR_SWAP_ROLLBACK_CLASSES = [
  "0A",
  "0L",
  "0P",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "2B",
  "2D",
  "2F",
  "34",
  "38",
  "39",
  "3B",
  "3D",
  "3F",
  "40",
  "42",
  "44",
  "53",
  "54",
  "55",
  "P0",
] as const;

/** statement_completion_unknown. The server does not say whether it committed. */
export const AVATAR_SWAP_UNKNOWN_COMPLETION = "40003";

/** query_canceled. The rest of class 57 (shutdown, crash, cannot connect) is not proof. */
export const AVATAR_SWAP_QUERY_CANCELED = "57014";

const ROLLBACK_CLASSES = new Set<string>(AVATAR_SWAP_ROLLBACK_CLASSES);

/**
 * These do not prove a rollback. Do not tag when the swap error is one of them.
 * - 08 connection exception
 * - 40003 statement_completion_unknown
 * - class 57 except 57014 (57P01 admin_shutdown, 57P02 crash_shutdown, 57P03 cannot_connect_now)
 * - 58 system error
 * - XX internal error
 * - F0 config file error
 * - HV foreign-data wrapper error
 * - a missing code, an empty code, a non-SQLSTATE, or a PostgREST `PGRST*` code
 * - a client TimeoutError, AbortError, TypeError, or HTTP 502/503/504 with no SQLSTATE
 */
export function avatarSwapErrorProvesRollback(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = error.code;
  if (typeof code !== "string" || !/^[0-9A-Z]{5}$/.test(code)) return false;
  if (code === AVATAR_SWAP_UNKNOWN_COMPLETION) return false;
  if (code === AVATAR_SWAP_QUERY_CANCELED) return true;
  return ROLLBACK_CLASSES.has(code.slice(0, 2));
}

/** No error and an empty array. Null data is not an empty match. */
export function avatarSwapMatchedNoRows(error: unknown, data: readonly unknown[] | null | undefined): boolean {
  return !error && Array.isArray(data) && data.length === 0;
}

export function avatarSwapMayRehold(error: unknown, data: readonly unknown[] | null | undefined): boolean {
  return avatarSwapMatchedNoRows(error, data) || avatarSwapErrorProvesRollback(error);
}

/**
 * After the existing pointer re-read. `committed` means that read names the new
 * key: the swap is the live face, so the caller returns success and does not tag.
 * `rehold` means there is proof the swap did not commit and the read shows the
 * key is not live. `unfinished` means there is no proof, or the only evidence
 * was a re-read of a pointer that does not name the key. Never tag on `unfinished`.
 */
export function avatarSwapFailureDecision(input: {
  error: unknown;
  data: readonly unknown[] | null | undefined;
  live: string | null;
  userId: string;
  key: string;
}): "committed" | "rehold" | "unfinished" {
  if (avatarPointerNamesKey(input.userId, input.live, input.key)) return "committed";
  if (avatarSwapMayRehold(input.error, input.data)) return "rehold";
  return "unfinished";
}
