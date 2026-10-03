import { describe, expect, it } from "vitest";

import { pickActiveMembership } from "./active-org";
import { appAccessBlocked } from "./app-access";

const STATUSES = ["registered", "awaiting_payment", "active", "payment_lapsed", "closed"] as const;
type Status = (typeof STATUSES)[number];

function membership(id: string, status: Status) {
  return { role: "account_owner" as const, organizations: { id, name: id, status } };
}

describe("pickActiveMembership", () => {
  it("honours the cookie among active orgs", () => {
    const rows = [membership("a", "active"), membership("b", "active")];

    expect(pickActiveMembership(rows, "b")?.organizations.id).toBe("b");
    expect(pickActiveMembership(rows, null)?.organizations.id).toBe("a");
  });

  it("picks the active org when the first membership is not active", () => {
    const rows = [membership("lapsed", "payment_lapsed"), membership("live", "active")];

    expect(pickActiveMembership(rows, null)?.organizations.id).toBe("live");
  });

  it("ignores a cookie for a non-active org while an active one exists", () => {
    const rows = [membership("live", "active"), membership("new", "registered")];

    expect(pickActiveMembership(rows, "new")?.organizations.id).toBe("live");
  });

  it("keeps the cookie and first-row order when no org is active", () => {
    const rows = [membership("a", "registered"), membership("b", "awaiting_payment")];

    expect(pickActiveMembership(rows, "b")?.organizations.id).toBe("b");
    expect(pickActiveMembership(rows, null)?.organizations.id).toBe("a");
  });

  it("returns null with no memberships", () => {
    expect(pickActiveMembership([], "a")).toBeNull();
  });

  // The app gate sends a mid-onboarding pick to /onboarding; the onboarding
  // welcome sends anyone with an active org back to /. Both at once is a loop.
  it("never sends the app to onboarding when onboarding would send it back", () => {
    for (const first of STATUSES) {
      for (const second of STATUSES) {
        for (const cookie of [null, "a", "b"]) {
          const rows = [membership("a", first), membership("b", second)];
          const picked = pickActiveMembership(rows, cookie);
          const appToOnboarding = appAccessBlocked(picked?.organizations ?? null, false);
          const onboardingToApp = rows.some((row) => row.organizations.status === "active");

          expect(
            appToOnboarding && onboardingToApp,
            `${first}/${second}, cookie ${cookie ?? "none"}`,
          ).toBe(false);
        }
      }
    }
  });
});
