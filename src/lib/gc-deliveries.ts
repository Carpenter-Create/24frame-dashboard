import { buildQuery } from "@/lib/catalog-view";
import {
  DELIVERY_STATUS_FILTERS,
  deliveryStatusFilterLabel,
  isCanonicalUuid,
  parseDeliveryStatusFilter,
  type DeliveryStatusFilter,
} from "@/lib/deliveries-browse";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import type { DeliveryStatus } from "@/lib/titles";
import { catalogReleaseYear, catalogStillSrc } from "@/lib/titles-catalog";
import { TITLES_HREF, publicCatalogId, titleOpsPath } from "@/lib/title-public-id";
import { staffPath } from "@/lib/workspace";

// Staff /staff/gc/deliveries — staff-wide Licensing Status (all titles / all orgs).
// Client nest copy stays on DASHBOARD_LICENSING. Href stays /staff/gc/deliveries.
// v2 list: Titles catalog parent + indented channel sub-rows. No fluff
// subtitle. Deliver CTA is selection-gated. Avails-sourced title pool.
export const GC_DELIVERIES_HREF = staffPath("gc/deliveries");

export const GC_LICENSING_STATUS = {
  title: "Licensing Status",
  empty: "No licensing status yet.",
  actionLabel: "View titles",
  actionHref: TITLES_HREF,
  filterMiss: "No licensing status matches these filters.",
  searchMiss: (q: string) => `No titles match “${q}”.`,
  showAll: "Show all",
  searchPlaceholder: "Search titles or channels",
  statusFilterLabel: "Filter by status",
  vendorFilterLabel: "Filter by channel",
  vendorAll: "All",
} as const;

export function licensingDeliverLabel(n: number): string {
  return `Deliver · ${n}`;
}

export function licensingDeliverVisible(selectedCount: number): boolean {
  return selectedCount >= 1;
}

/** The ticks the list draws now, in tick order. Deliver · N counts only these
 *  and the window takes only these: a tick a search or filter hides comes
 *  back with its row but never goes (closing Deliver then drops it, see
 *  licensingPruneSelection), and with no row drawn there is no Deliver (no
 *  overlay over an empty page). */
export function licensingShownSelection(selected: readonly string[], groupIds: readonly string[]): string[] {
  const shown = new Set(groupIds);
  return selected.filter((id) => shown.has(id));
}

export const LICENSING_VENDOR_INDENT_CLASS = "pl-[var(--space-6)]";

/** A channel sub-row Deliver just created fades in after the window leaves
 *  (220ms; none under reduced motion). globals.css `licensing-row-paint`. */
export const LICENSING_VENDOR_NEW_CLASS = "licensing-row-paint";

/** The ticks once Deliver closes: delivered titles un-tick, and ids the list
 *  does not draw (a hand-over's) drop. Failed, unsent and set-aside titles
 *  stay ticked. */
export function licensingPruneSelection(
  selected: readonly string[],
  groupIds: readonly string[],
  deliveredIds: readonly string[],
): string[] {
  const shown = new Set(groupIds);
  const delivered = new Set(deliveredIds);
  return selected.filter((id) => shown.has(id) && !delivered.has(id));
}

export function licensingActivityDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function licensingVendorCountLabel(n: number): string {
  return n === 1 ? "1 channel" : `${n} channels`;
}

export type LicensingVendorRow = {
  deliveryId: string;
  vendorId: string;
  vendorName: string;
  status: DeliveryStatus;
  submittedAt: string | null;
};

export type LicensingTitleGroup = {
  id: string;
  title: string;
  href: string;
  stillUrl: string | null;
  year: string | null;
  publicId: string | null;
  lastActivity: string | null;
  vendors: LicensingVendorRow[];
};

export type LicensingDeliveryInput = {
  id: string;
  title_id: string;
  vendor_id: string;
  status: DeliveryStatus;
  created_at?: string | null;
  titles?: {
    title?: string | null;
    catalog_id?: string | null;
    release_date?: string | null;
  } | null;
  vendors?: { name?: string | null } | null;
};

export type LicensingTitleInput = {
  id: string;
  title: string;
  catalog_id?: string | null;
  release_date?: string | null;
};

export function licensingTitleMeta(group: LicensingTitleGroup): string {
  if (group.vendors.length > 0) {
    const parts = [licensingVendorCountLabel(group.vendors.length)];
    const activity = licensingActivityDate(group.lastActivity);
    if (activity) parts.push(`last activity ${activity}`);
    return parts.join(" · ");
  }
  return [group.year, group.publicId].filter(Boolean).join(" · ");
}

function deliveryRecency(iso: string | null | undefined): string {
  return iso ?? "";
}

export function groupLicensingTitles(input: {
  deliveries: readonly LicensingDeliveryInput[];
  titles?: readonly LicensingTitleInput[];
  stills?: ReadonlyMap<string, string | null>;
}): LicensingTitleGroup[] {
  const titleById = new Map<string, LicensingTitleInput>();
  for (const title of input.titles ?? []) titleById.set(title.id, title);

  const byTitle = new Map<string, LicensingDeliveryInput[]>();
  for (const row of input.deliveries) {
    const list = byTitle.get(row.title_id) ?? [];
    list.push(row);
    byTitle.set(row.title_id, list);
    if (!titleById.has(row.title_id) && row.titles?.title) {
      titleById.set(row.title_id, {
        id: row.title_id,
        title: row.titles.title,
        catalog_id: row.titles.catalog_id ?? null,
        release_date: row.titles.release_date ?? null,
      });
    }
  }

  const groups: LicensingTitleGroup[] = [];
  const seen = new Set<string>();

  for (const [titleId, rows] of byTitle) {
    const title = titleById.get(titleId);
    if (!title) continue;
    seen.add(titleId);
    const vendors = [...rows]
      .sort((a, b) => (deliveryRecency(a.created_at) < deliveryRecency(b.created_at) ? 1 : -1))
      .map((row) => ({
        deliveryId: row.id,
        vendorId: row.vendor_id,
        vendorName: row.vendors?.name ?? "",
        status: row.status,
        submittedAt: row.created_at ?? null,
      }));
    groups.push({
      id: title.id,
      title: title.title,
      href: titleOpsPath(title.id),
      stillUrl: catalogStillSrc(input.stills?.get(title.id) ?? null),
      year: catalogReleaseYear(title.release_date),
      publicId: publicCatalogId(title.catalog_id),
      lastActivity: vendors[0]?.submittedAt ?? null,
      vendors,
    });
  }

  for (const title of input.titles ?? []) {
    if (seen.has(title.id)) continue;
    groups.push({
      id: title.id,
      title: title.title,
      href: titleOpsPath(title.id),
      stillUrl: catalogStillSrc(input.stills?.get(title.id) ?? null),
      year: catalogReleaseYear(title.release_date),
      publicId: publicCatalogId(title.catalog_id),
      lastActivity: null,
      vendors: [],
    });
  }

  return groups.sort((a, b) => {
    const aRec = deliveryRecency(a.lastActivity);
    const bRec = deliveryRecency(b.lastActivity);
    if (aRec !== bRec) return aRec < bRec ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

export function filterLicensingGroups(
  groups: readonly LicensingTitleGroup[],
  opts: { q?: string; status?: DeliveryStatusFilter; vendor?: string | null },
): LicensingTitleGroup[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const status = opts.status ?? "all";
  const vendor = opts.vendor ?? null;

  return groups.flatMap((group) => {
    const vendors = group.vendors.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (vendor && row.vendorId !== vendor) return false;
      return true;
    });
    const hay = [group.title, ...group.vendors.map((row) => row.vendorName)]
      .join(" ")
      .toLowerCase();
    if (q && !hay.includes(q)) return [];
    if ((status !== "all" || vendor) && vendors.length === 0) return [];
    return [{ ...group, vendors: status === "all" && !vendor ? group.vendors : vendors }];
  });
}

export const GC_DELIVERIES_EMPTY = {
  title: GC_LICENSING_STATUS.empty,
  actionLabel: GC_LICENSING_STATUS.actionLabel,
  actionHref: GC_LICENSING_STATUS.actionHref,
} as const;

export const GC_LICENSING_VENDOR_ALL = "all";

export { DELIVERY_STATUS_FILTERS, deliveryStatusFilterLabel, parseDeliveryStatusFilter };
export type { DeliveryStatusFilter };

export type GcLicensingVendor = { id: string; name: string };

type QueryValue = string | string[] | undefined;

export function parseGcLicensingVendorFilter(v: QueryValue): string | null {
  if (typeof v !== "string") return null;
  if (v === "" || v === GC_LICENSING_VENDOR_ALL) return null;
  if (!isCanonicalUuid(v)) return null;
  return v.toLowerCase();
}

/** Prefer ?channel=; keep reading ?vendor= so old Licensing Status links work. */
export function parseGcLicensingChannelFilter(
  channel: QueryValue,
  vendor?: QueryValue,
): string | null {
  return parseGcLicensingVendorFilter(channel) ?? parseGcLicensingVendorFilter(vendor);
}

export function gcLicensingHasFilters(
  status: DeliveryStatusFilter,
  vendor: string | null,
): boolean {
  return status !== "all" || vendor !== null;
}

export function buildGcLicensingQuery(opts: {
  status: DeliveryStatusFilter;
  vendor: string | null;
  q?: string;
}): string {
  return buildQuery({
    q: opts.q?.trim() || undefined,
    status: opts.status === "all" ? undefined : opts.status,
    channel: opts.vendor ?? undefined,
  });
}

export function gcLicensingHref(
  status: DeliveryStatusFilter,
  vendor: string | null,
  q = "",
): string {
  return `${GC_DELIVERIES_HREF}${buildGcLicensingQuery({ status, vendor, q })}`;
}

export function gcLicensingShowAllHref(): string {
  return gcLicensingHref("all", null);
}

export function gcLicensingVendorOptions(
  vendors: readonly GcLicensingVendor[],
): { key: string; label: string }[] {
  return [
    { key: GC_LICENSING_VENDOR_ALL, label: GC_LICENSING_STATUS.vendorAll },
    ...vendors.map((vendor) => ({ key: vendor.id, label: vendor.name })),
  ];
}

export function gcLicensingVendorLabel(
  vendor: string | null,
  vendors: readonly GcLicensingVendor[],
): string {
  if (!vendor) return GC_LICENSING_STATUS.vendorAll;
  return vendors.find((row) => row.id.toLowerCase() === vendor)?.name ?? GC_LICENSING_STATUS.vendorAll;
}

// Honesty copy when a companion list hits the probe cap. A short list that looks
// finished is the failure — same contract as the catalog truncation notice.
export const GC_DELIVERIES_TRUNCATED = {
  grants: `Showing the first ${UNPAGINATED_MAX} active grants. More exist — this list is not complete.`,
  companions:
    "Portal records for the deliveries on this page were cut off. Links, sessions, or the access log may be incomplete.",
} as const;
