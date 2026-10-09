import type { Database } from "@/lib/supabase/database.types";
import { staffPath } from "@/lib/workspace";

// Client-safe Clients status lens. No server-only, no Node crypto, no
// agreements. Client Components (clients-status-filter) import this module
// only. Server/agreement grouping stays in clients.ts.

export type OrgStatus = Database["public"]["Enums"]["org_status"];

/** The Clients directory (Staff). Here so Client Components can link to it. */
export const GC_CLIENTS_HREF = staffPath("gc/clients");

export const CLIENTS_PAGE = {
  title: "Clients",
  empty: "No clients yet.",
  statusFilterLabel: "Filter by status",
} as const;

// Org lifecycle as GC sees it. Deliberately plain: an operator needs the state, not a
// reassuring euphemism for it.
export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  registered: "Registered",
  awaiting_payment: "Awaiting payment",
  active: "Active",
  payment_lapsed: "Payment lapsed",
  closed: "Closed",
};

export const CLIENT_DIRECTORY_FILTERS = [
  { key: "all", label: "All" },
  ...(Object.entries(ORG_STATUS_LABELS) as [OrgStatus, string][]).map(([key, label]) => ({
    key,
    label,
  })),
] as const;

export type ClientDirectoryFilter = (typeof CLIENT_DIRECTORY_FILTERS)[number]["key"];

export function parseClientDirectoryFilter(value: string | undefined): ClientDirectoryFilter {
  return CLIENT_DIRECTORY_FILTERS.some((option) => option.key === value)
    ? (value as ClientDirectoryFilter)
    : "all";
}

export function clientDirectoryFilterLabel(status: ClientDirectoryFilter): string {
  return CLIENT_DIRECTORY_FILTERS.find((option) => option.key === status)?.label ?? "All";
}

export function filterClientOrgs<T extends { status: string }>(
  orgs: readonly T[],
  filter: ClientDirectoryFilter,
): T[] {
  if (filter === "all") return [...orgs];
  const wanted = ORG_STATUS_LABELS[filter as OrgStatus];
  return orgs.filter((org) => org.status === wanted);
}
