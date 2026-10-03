// Which membership the app treats as the active org.
//
// The app sends a user whose active org is mid-onboarding to onboarding
// (appAccessBlocked), and the onboarding welcome sends anyone with an active
// org back to the app. Picking a non-active org while an active one exists
// made the two redirect into each other forever. So the gc_active_org cookie
// chooses among active orgs first, and a non-active org is picked only when
// none is active (onboarding then resumes it, as before).
export function pickActiveMembership<T extends { organizations: { id: string; status: string } }>(
  rows: readonly T[],
  cookieOrgId: string | null,
): T | null {
  const active = rows.filter((row) => row.organizations.status === "active");
  const pool = active.length > 0 ? active : rows;
  return pool.find((row) => row.organizations.id === cookieOrgId) ?? pool[0] ?? null;
}
