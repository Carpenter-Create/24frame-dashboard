import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: null }),
    },
  }),
}));

import { middleware } from "@/middleware";

// Signed out: where /login is told to send you after sign-in.
async function loginRedirect(path: string): Promise<URL> {
  const res = await middleware(new NextRequest(`http://localhost${path}`));
  const location = res.headers.get("location");
  if (!location) throw new Error(`no redirect for ${path}`);
  const url = new URL(location);
  expect(url.pathname).toBe("/login");
  return url;
}

describe("signed-out deep links", () => {
  it("sends the page, with its query, to /login as next", async () => {
    const url = await loginRedirect("/social/u/ada?tab=media");

    expect(url.searchParams.get("next")).toBe("/social/u/ada?tab=media");
    expect([...url.searchParams.keys()]).toEqual(["next"]);
  });

  it("adds no next for the default land", async () => {
    expect((await loginRedirect("/")).search).toBe("");
    expect((await loginRedirect("/home")).search).toBe("");
  });

  it("adds no next for API calls", async () => {
    expect((await loginRedirect("/api/assets/url")).search).toBe("");
  });

  it("never carries an off-site next", async () => {
    const url = await loginRedirect("//evil.example/x");

    expect(url.searchParams.get("next")).toBeNull();
  });
});
