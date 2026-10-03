import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/dashboard-sign-in-rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dashboard-sign-in-rate-limit")>(
    "@/lib/dashboard-sign-in-rate-limit",
  );
  return {
    ...actual,
    assertDashboardSignInAllowed: vi.fn(),
  };
});
vi.mock("@/lib/auth-magic-link", () => ({
  DASHBOARD_SIGN_IN_SENT: "Check your email for a secure sign-in link.",
  DASHBOARD_SIGN_IN_SEND_FAILED: "Could not send the sign-in link. Please try again.",
  DASHBOARD_SIGN_IN_RATE_LIMITED: "Too many requests. Please try again later.",
  issueDashboardSignInLink: vi.fn(),
}));

import { headers } from "next/headers";
import { issueDashboardSignInLink } from "@/lib/auth-magic-link";
import { AuthSesSuppressedError } from "@/lib/auth-ses";
import {
  assertDashboardSignInAllowed,
  DashboardSignInRateLimitError,
} from "@/lib/dashboard-sign-in-rate-limit";
import { requestMagicLink } from "./actions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("requestMagicLink next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === "origin" ? "https://app.24frame.co" : null),
    } as unknown as Awaited<ReturnType<typeof headers>>);
    vi.mocked(assertDashboardSignInAllowed).mockResolvedValue(undefined);
    vi.mocked(issueDashboardSignInLink).mockResolvedValue(undefined);
  });

  it("carries a safe next into the sign-in link", async () => {
    await requestMagicLink(
      { ok: false, message: "" },
      form({ email: "jane@acmefilms.com", next: "/social/u/ada?tab=media" }),
    );

    expect(issueDashboardSignInLink).toHaveBeenCalledWith({
      email: "jane@acmefilms.com",
      requestOrigin: "https://app.24frame.co",
      next: "/social/u/ada?tab=media",
    });
  });

  it("drops an off-site next", async () => {
    await requestMagicLink(
      { ok: false, message: "" },
      form({ email: "jane@acmefilms.com", next: "//evil.example/x" }),
    );

    expect(vi.mocked(issueDashboardSignInLink).mock.calls[0]?.[0]).not.toHaveProperty("next");
  });
});

describe("requestMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue({
      get: (name: string) => {
        if (name === "origin") return "https://app.24frame.co";
        if (name === "x-forwarded-for") return "203.0.113.10, 10.0.0.1";
        return null;
      },
    } as unknown as Awaited<ReturnType<typeof headers>>);
    vi.mocked(assertDashboardSignInAllowed).mockResolvedValue(undefined);
    vi.mocked(issueDashboardSignInLink).mockResolvedValue(undefined);
  });

  it("requires an email before rate-limit or minting", async () => {
    await expect(requestMagicLink({ ok: false, message: "" }, form({}))).resolves.toEqual({
      ok: false,
      message: "Enter your email address.",
    });
    expect(assertDashboardSignInAllowed).not.toHaveBeenCalled();
    expect(issueDashboardSignInLink).not.toHaveBeenCalled();
  });

  it("returns the rate-limit message without minting", async () => {
    vi.mocked(assertDashboardSignInAllowed).mockRejectedValue(
      new DashboardSignInRateLimitError("email"),
    );
    await expect(
      requestMagicLink({ ok: false, message: "" }, form({ email: "jane@acmefilms.com" })),
    ).resolves.toEqual({
      ok: false,
      message: "Too many requests. Please try again later.",
    });
    expect(issueDashboardSignInLink).not.toHaveBeenCalled();
  });

  it("returns one fixed success string and does not leak mint errors", async () => {
    const result = await requestMagicLink(
      { ok: false, message: "" },
      form({ email: " jane@acmefilms.com " }),
    );
    expect(result).toEqual({
      ok: true,
      message: "Check your email for a secure sign-in link.",
    });
    expect(assertDashboardSignInAllowed).toHaveBeenCalledWith({
      email: "jane@acmefilms.com",
      ip: "203.0.113.10",
    });
    expect(issueDashboardSignInLink).toHaveBeenCalledWith({
      email: "jane@acmefilms.com",
      requestOrigin: "https://app.24frame.co",
    });
  });

  it("returns the suppressed-destination string without AWS internals", async () => {
    const logged = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(issueDashboardSignInLink).mockRejectedValue(
      new AuthSesSuppressedError("jane@acmefilms.com"),
    );
    await expect(
      requestMagicLink({ ok: false, message: "" }, form({ email: "jane@acmefilms.com" })),
    ).resolves.toEqual({
      ok: false,
      message: "This address cannot receive sign-in mail.",
    });
    expect(logged).toHaveBeenCalledWith(
      "[dashboard-sign-in] SES destination suppressed",
      "jane@acmefilms.com",
    );
    logged.mockRestore();
  });

  it("logs mint/send failures and returns a generic client string", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(issueDashboardSignInLink).mockRejectedValue(
      new Error("User not found: jane@acmefilms.com hashed_token=secret"),
    );
    await expect(
      requestMagicLink({ ok: false, message: "" }, form({ email: "jane@acmefilms.com" })),
    ).resolves.toEqual({
      ok: false,
      message: "Could not send the sign-in link. Please try again.",
    });
    expect(logged).toHaveBeenCalledWith(
      "[dashboard-sign-in] mint/send failed",
      "User not found: jane@acmefilms.com hashed_token=secret",
    );
    logged.mockRestore();
  });

  it("does not verify Turnstile or read a turnstile field", () => {
    const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
    const formSrc = readFileSync(new URL("./login-form.tsx", import.meta.url), "utf8");
    expect(actions).not.toMatch(/verifyTurnstile|cf-turnstile-response/);
    expect(formSrc).not.toMatch(/Turnstile|LOGIN_TURNSTILE|marsidev/);
  });
});
