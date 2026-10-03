import { describe, expect, it } from "vitest";

import { AUTH_DEFAULT_NEXT, safeAuthCallbackNext, signInNextParam } from "./auth-callback-next";

describe("safeAuthCallbackNext (P0-1)", () => {
  it("allows same-origin path-relative URLs and defaults to /home", () => {
    expect(AUTH_DEFAULT_NEXT).toBe("/home");
    expect(safeAuthCallbackNext(null)).toBe("/home");
    expect(safeAuthCallbackNext(undefined)).toBe("/home");
    expect(safeAuthCallbackNext("")).toBe("/home");
    expect(safeAuthCallbackNext("/")).toBe("/home");
    expect(safeAuthCallbackNext("/?ai=1")).toBe("/home?ai=1");
    expect(safeAuthCallbackNext("/staff/queue")).toBe("/staff/queue");
    expect(safeAuthCallbackNext("/home?ai=1")).toBe("/home?ai=1");
    expect(safeAuthCallbackNext("/settings/profile")).toBe("/settings/profile");
  });

  it("rejects protocol-relative, backslash, @, and schemes", () => {
    expect(safeAuthCallbackNext("//evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("//evil.example/phish")).toBe("/home");
    expect(safeAuthCallbackNext("https://evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("http://evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("javascript:alert(1)")).toBe("/home");
    expect(safeAuthCallbackNext("\\\\evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("/\\evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("/foo\\bar")).toBe("/home");
    expect(safeAuthCallbackNext("/@attacker")).toBe("/home");
    expect(safeAuthCallbackNext("/queue@evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("queue")).toBe("/home");
    expect(safeAuthCallbackNext("aggregation/queue")).toBe("/home");
  });

  it("rejects encoded and control-character bypasses", () => {
    expect(safeAuthCallbackNext("/%2F%2Fevil.example")).toBe("/home");
    expect(safeAuthCallbackNext("/%5Cevil.example")).toBe("/home");
    expect(safeAuthCallbackNext("/%40attacker")).toBe("/home");
    expect(safeAuthCallbackNext("/queue%0d%0aLocation:%20https://evil.example")).toBe("/home");
    expect(safeAuthCallbackNext("/que\nue")).toBe("/home");
  });
});

describe("signInNextParam", () => {
  it("keeps a safe page and drops the default land", () => {
    expect(signInNextParam("/social/u/ada?tab=media")).toBe("/social/u/ada?tab=media");
    expect(signInNextParam(["/staff/queue", "/other"])).toBe("/staff/queue");
    expect(signInNextParam("/home")).toBeNull();
    expect(signInNextParam("/")).toBeNull();
    expect(signInNextParam(null)).toBeNull();
    expect(signInNextParam(undefined)).toBeNull();
  });

  it("drops anything safeAuthCallbackNext rejects", () => {
    for (const raw of ["//evil.example/x", "https://evil.example", "/%40attacker", "/a\\b"]) {
      expect(signInNextParam(raw)).toBeNull();
    }
  });
});
