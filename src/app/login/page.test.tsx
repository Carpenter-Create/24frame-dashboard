import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ requestMagicLink: vi.fn() }));

import LoginPage from "./page";

async function render(params: { error?: string; next?: string }) {
  return renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(params) }));
}

describe("LoginPage next", () => {
  it("posts a safe next with the sign-in form", async () => {
    const html = await render({ next: "/social/u/ada?tab=media" });

    expect(html).toContain('name="next"');
    expect(html).toContain('value="/social/u/ada?tab=media"');
  });

  it("drops an off-site or default next", async () => {
    for (const next of ["//evil.example/x", "https://evil.example", "/home"]) {
      expect(await render({ next })).not.toContain('name="next"');
    }
    expect(await render({})).not.toContain('name="next"');
  });
});
