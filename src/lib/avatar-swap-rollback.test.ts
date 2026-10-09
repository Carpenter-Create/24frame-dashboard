import { describe, expect, it } from "vitest";

import { avatarRecheckObjectKey } from "@/lib/account-avatar";
import {
  AVATAR_SWAP_QUERY_CANCELED,
  AVATAR_SWAP_ROLLBACK_CLASSES,
  AVATAR_SWAP_UNKNOWN_COMPLETION,
  avatarSwapErrorProvesRollback,
  avatarSwapFailureDecision,
  avatarSwapMatchedNoRows,
  avatarSwapMayRehold,
} from "@/lib/avatar-swap-rollback";

const USER = "11111111-1111-4111-8111-111111111111";
const NEXT = avatarRecheckObjectKey(USER, "33333333-3333-4333-8333-333333333333");
const PREVIOUS = avatarRecheckObjectKey(USER, "22222222-2222-4222-8222-222222222222");

describe("avatar swap rollback proof", () => {
  it("accepts only the documented SQLSTATE classes, plus query_canceled", () => {
    for (const klass of AVATAR_SWAP_ROLLBACK_CLASSES) {
      const code = `${klass}000`.slice(0, 5);
      expect(avatarSwapErrorProvesRollback({ code }), code).toBe(true);
    }
    expect(avatarSwapErrorProvesRollback({ code: "23514", message: "check" })).toBe(true);
    expect(avatarSwapErrorProvesRollback({ code: "42501" })).toBe(true);
    expect(avatarSwapErrorProvesRollback({ code: "40001" })).toBe(true);
    expect(avatarSwapErrorProvesRollback({ code: "40P01" })).toBe(true);
    expect(avatarSwapErrorProvesRollback({ code: AVATAR_SWAP_QUERY_CANCELED })).toBe(true);
    expect(avatarSwapErrorProvesRollback({ code: "55P03" })).toBe(true);
  });

  it("rejects transport errors, unknown completion, and classes that can outlive commit", () => {
    expect(avatarSwapErrorProvesRollback({ code: AVATAR_SWAP_UNKNOWN_COMPLETION })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "08006" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "57P01" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "57P02" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "57P03" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "58000" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "XX000" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "F0000" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "HV000" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "PGRST116" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ code: "" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ message: "swap failed" })).toBe(false);
    expect(avatarSwapErrorProvesRollback({ name: "TimeoutError", message: "socket timeout" })).toBe(false);
    expect(avatarSwapErrorProvesRollback(null)).toBe(false);
    expect(avatarSwapErrorProvesRollback(undefined)).toBe(false);
  });

  it("treats an empty match as proof and a missing body as not proof", () => {
    expect(avatarSwapMatchedNoRows(null, [])).toBe(true);
    expect(avatarSwapMayRehold(null, [])).toBe(true);
    expect(avatarSwapMatchedNoRows(null, null)).toBe(false);
    expect(avatarSwapMayRehold(null, null)).toBe(false);
    expect(avatarSwapMayRehold(null, [{ id: USER }])).toBe(false);
    expect(avatarSwapMayRehold({ message: "swap failed" }, null)).toBe(false);
    expect(avatarSwapMayRehold({ code: "23514" }, null)).toBe(true);
    expect(avatarSwapMatchedNoRows({ message: "swap failed" }, [])).toBe(false);
    expect(avatarSwapMayRehold({ message: "swap failed" }, [])).toBe(false);
  });

  it("re-holds only with proof that the new key is not live, and treats a named key as committed", () => {
    expect(
      avatarSwapFailureDecision({
        error: { message: "FetchError: request timed out" },
        data: null,
        live: PREVIOUS,
        userId: USER,
        key: NEXT,
      }),
    ).toBe("unfinished");
    expect(
      avatarSwapFailureDecision({
        error: null,
        data: [],
        live: PREVIOUS,
        userId: USER,
        key: NEXT,
      }),
    ).toBe("rehold");
    expect(
      avatarSwapFailureDecision({
        error: { code: "23514", message: "check" },
        data: null,
        live: PREVIOUS,
        userId: USER,
        key: NEXT,
      }),
    ).toBe("rehold");
    expect(
      avatarSwapFailureDecision({
        error: { message: "swap failed" },
        data: null,
        live: NEXT,
        userId: USER,
        key: NEXT,
      }),
    ).toBe("committed");
    expect(
      avatarSwapFailureDecision({
        error: null,
        data: [],
        live: NEXT,
        userId: USER,
        key: NEXT,
      }),
    ).toBe("committed");
  });
});
