import { TIER_META, type Tier } from "@/lib/agreements";
import { ORG_ROLE_LABELS, type OrgRole } from "@/lib/org-roles";
import {
  CLIENTS_PAGE,
  CLIENT_DIRECTORY_FILTERS,
  GC_CLIENTS_HREF,
  ORG_STATUS_LABELS,
  clientDirectoryFilterLabel,
  filterClientOrgs,
  parseClientDirectoryFilter,
  type ClientDirectoryFilter,
  type OrgStatus,
} from "./clients-filter";

// Server/agreement directory logic. Client Components must import
// clients-filter — this module pulls agreements (server-only).

export type { OrgRole };
export { ORG_ROLE_LABELS };
export type { ClientDirectoryFilter, OrgStatus };
export {
  CLIENTS_PAGE,
  CLIENT_DIRECTORY_FILTERS,
  ORG_STATUS_LABELS,
  clientDirectoryFilterLabel,
  filterClientOrgs,
  parseClientDirectoryFilter,
};

// One active seat on one client org, as returned by gc_client_directory().
export type ClientDirectoryRow = {
  user_id: string;
  email: string | null;
  org_id: string;
  organization: string;
  org_status: OrgStatus;
  role: OrgRole;
  joined_at: string;
  last_sign_in: string | null;
  /** Current contract term's tier. Null until a contract_terms row exists. */
  tier: Tier | null;
  term_expires_at: string | null;
  /** Stripe's own status string. Null for Access (no subscription) and for orgs that never paid. */
  subscription_status: string | null;
};

/** One person's seat. Only the facts that actually vary per person. */
export type ClientSeat = {
  userId: string;
  email: string;
  role: string;
  lastSeen: string;
};

/** One client organization and its seats. Org-level facts are stated once, here. */
export type ClientOrg = {
  orgId: string;
  organization: string;
  tier: string;
  status: string;
  /** Null when no contract term exists — there is no term to end. */
  termEnds: string | null;
  seats: ClientSeat[];
};

export const CLIENT_PROFILE = {
  infoTitle: "Rights Holder",
  peopleTitle: "People",
  peopleEmpty: "No people on this rights holder.",
  status: "Status",
  plan: "Plan",
  termEnds: "Term ends",
} as const;

export { GC_CLIENTS_HREF };

export function clientOrgHref(orgId: string): string {
  return `${GC_CLIENTS_HREF}/${orgId}`;
}

export function clientDirectorySecondary(org: ClientOrg): string {
  const people = org.seats.length === 1 ? "1 person" : `${org.seats.length} people`;
  return org.tier === "—" ? people : `${people} · ${org.tier}`;
}

/** Seat social-row meta. Role and last seen stay one muted line — not a table. */
export function clientSeatSecondary(seat: ClientSeat): string {
  return `${seat.role} · ${seat.lastSeen}`;
}

export function clientOrgFields(org: ClientOrg): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [
    { label: CLIENT_PROFILE.status, value: org.status },
    { label: CLIENT_PROFILE.plan, value: org.tier },
  ];
  if (org.termEnds) fields.push({ label: CLIENT_PROFILE.termEnds, value: org.termEnds });
  return fields;
}

const NO_VALUE = "—";

// UTC so a row reads the same for every operator, and so tests do not depend on the
// machine's timezone.
const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function day(iso: string | null): string {
  return iso ? fmt.format(new Date(iso)) : NO_VALUE;
}

// A term end is a contractual horizon, not an appointment — month and year is the honest
// precision for a roster. The exact date lives on the contract.
function monthYear(iso: string): string {
  return monthFmt.format(new Date(iso));
}

/**
 * The contract tier, plus Stripe's status when it is abnormal.
 *
 * These are two facts and the divergence is the useful part: a failed card sits at
 * `past_due` for 30 days while the contract still reads Pro, until `lapse_org` appends the
 * access term. Showing only the contract would hide the one window where a call still helps.
 *
 * A null tier is NOT rendered as Access. It means either "signed up, never contracted" or the
 * unregistered live-mode webhook (SECURITY-STATUS B5) — both unknown. Labels come from
 * TIER_META so there is one tier vocabulary; its prices are stale and deliberately unused.
 */
export function tierCell(tier: Tier | null, subscriptionStatus: string | null): string {
  const label = tier ? TIER_META[tier].label : NO_VALUE;
  const healthy = subscriptionStatus === null || subscriptionStatus === "active";
  return healthy ? label : `${label} · ${subscriptionStatus}`;
}

/**
 * Group the flat RPC rows by organization.
 *
 * Keyed on org_id, never on the name: org names are free text and not unique, so grouping by
 * name would fuse two separate clients into one. Insertion order is preserved, which keeps the
 * RPC's own (organization, then email) ordering rather than re-sorting it here.
 */
export function toClientOrgs(rows: ClientDirectoryRow[] | null): ClientOrg[] {
  const byOrg = new Map<string, ClientOrg>();

  for (const r of rows ?? []) {
    let org = byOrg.get(r.org_id);
    if (!org) {
      org = {
        orgId: r.org_id,
        organization: r.organization,
        tier: tierCell(r.tier, r.subscription_status),
        status: ORG_STATUS_LABELS[r.org_status],
        termEnds: r.term_expires_at ? monthYear(r.term_expires_at) : null,
        seats: [],
      };
      byOrg.set(r.org_id, org);
    }
    org.seats.push({
      userId: r.user_id,
      email: r.email ?? NO_VALUE,
      role: ORG_ROLE_LABELS[r.role],
      lastSeen: day(r.last_sign_in),
    });
  }

  return [...byOrg.values()];
}
