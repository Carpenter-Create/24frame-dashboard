import Link from "next/link";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { titleArtworkUrls } from "@/lib/artwork";
import { HousePageSearch } from "@/components/chrome/house-page-search";
import { InlineNotice } from "@/components/ui/inline-notice";
import { LicensingStatusList } from "@/components/licensing/licensing-status-list";
import {
  TitlesCatalogEmpty,
  TitlesCatalogFrame,
  TitlesCatalogHeader,
  TitlesCatalogToolbar,
} from "@/components/titles/titles-catalog";
import {
  GC_DELIVERIES_EMPTY,
  GC_DELIVERIES_TRUNCATED,
  GC_LICENSING_STATUS,
  filterLicensingGroups,
  gcLicensingHasFilters,
  gcLicensingShowAllHref,
  groupLicensingTitles,
  parseDeliveryStatusFilter,
  parseGcLicensingChannelFilter,
} from "@/lib/gc-deliveries";
import {
  loadGcDeliveryCompanions,
  uniqueIds,
} from "@/lib/gc-deliveries-companions";
import { catalogSearchQuery } from "@/lib/titles-catalog";
import { LIST_PAGE, UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";

import { deliverTitles, loadDeliverChoices } from "./deliver-actions";
import { LicensingStatusFilter } from "./licensing-status-filter";
import { LicensingVendorFilter } from "./licensing-vendor-filter";

export default async function GcDeliveriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const sp = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const q = catalogSearchQuery(sp.q);
  const statusFilter = parseDeliveryStatusFilter(sp.status);
  const vendorFilter = parseGcLicensingChannelFilter(sp.channel, sp.vendor);
  const supabase = await createClient();
  let deliveriesQuery = supabase
    .from("deliveries")
    .select(
      "id, territory, status, vendor_id, title_id, created_at, titles(title, catalog_id, release_date), vendors(name)",
    )
    .order("created_at", { ascending: false });
  if (statusFilter !== "all") {
    deliveriesQuery = deliveriesQuery.eq("status", statusFilter);
  }
  if (vendorFilter) {
    deliveriesQuery = deliveriesQuery.eq("vendor_id", vendorFilter);
  }
  const { data: deliveries } = await deliveriesQuery
    // BOUNDED — all orgs; the largest list in the app.
    .range(...rangeFor(LIST_PAGE));
  const list = deliveries ?? [];

  // Avails-sourced deliver pool: live (Approved) + in_delivery (ready).
  // Parent identity is the Titles catalog row, not a Licensing-only card.
  const { data: titleRows } = await supabase
    .from("titles")
    .select("id, title, catalog_id, release_date")
    .in("status", ["in_delivery", "live"])
    .order("title")
    .range(...rangeFor(UNPAGINATED_MAX));
  const { data: vendorRows } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("active", true)
    .order("name")
    .range(...rangeFor(UNPAGINATED_MAX));
  const companions = await loadGcDeliveryCompanions(supabase, {
    formTitleIds: uniqueIds((titleRows ?? []).map((t) => t.id)),
    pageTitleIds: [],
    pageDeliveryIds: [],
  });
  const vendorOpts = (vendorRows ?? []).map((v) => ({ id: v.id, name: v.name }));
  // Deliver (the window over this list) is for staff with operate only. A
  // hint: the actions and create_delivery enforce. Only a literal true counts.
  const user = await getAuthUser();
  let canDeliver = false;
  if (user) {
    const { data: canOperate, error: canOperateError } = await supabase.rpc("gc_can", {
      p_uid: user.id,
      p_capability: "operate",
    });
    canDeliver = !canOperateError && canOperate === true;
  }
  const titleIds = uniqueIds([
    ...list.map((d) => d.title_id),
    ...(titleRows ?? []).map((t) => t.id),
  ]);
  const artwork = await titleArtworkUrls(supabase, titleIds.slice(0, LIST_PAGE));
  const stills = new Map<string, string | null>();
  for (const id of titleIds) {
    stills.set(id, artwork.get(id)?.banner ?? null);
  }

  const groups = filterLicensingGroups(
    groupLicensingTitles({
      deliveries: list,
      titles: titleRows ?? [],
      stills,
    }),
    { q, status: statusFilter, vendor: vendorFilter },
  );

  const grantsTruncated = companions.grants.truncated;
  const filtered = gcLicensingHasFilters(statusFilter, vendorFilter) || q.trim() !== "";
  const emptyCopy = q.trim()
    ? GC_LICENSING_STATUS.searchMiss(q.trim())
    : filtered
      ? GC_LICENSING_STATUS.filterMiss
      : GC_DELIVERIES_EMPTY.title;
  const emptyHref = filtered ? gcLicensingShowAllHref() : GC_DELIVERIES_EMPTY.actionHref;
  const emptyLabel = filtered ? GC_LICENSING_STATUS.showAll : GC_DELIVERIES_EMPTY.actionLabel;

  return (
    <TitlesCatalogFrame data-gc-licensing-status="">
      <TitlesCatalogHeader
        title={GC_LICENSING_STATUS.title}
        filters={
          <>
            <LicensingStatusFilter status={statusFilter} vendor={vendorFilter} q={q} />
            <LicensingVendorFilter
              status={statusFilter}
              vendor={vendorFilter}
              vendors={vendorOpts}
              q={q}
            />
          </>
        }
      />

      {grantsTruncated ? (
        <InlineNotice tone="info" className="mb-4" data-gc-deliveries-truncated="grants">
          {GC_DELIVERIES_TRUNCATED.grants}
        </InlineNotice>
      ) : null}

      <TitlesCatalogToolbar
        search={
          <Suspense fallback={null}>
            <HousePageSearch placeholder={GC_LICENSING_STATUS.searchPlaceholder} />
          </Suspense>
        }
      />

      <LicensingStatusList
        groups={groups}
        vendors={vendorOpts}
        canDeliver={canDeliver}
        deliverActions={canDeliver ? { load: loadDeliverChoices, deliver: deliverTitles } : null}
        empty={
          <TitlesCatalogEmpty data-gc-licensing-empty="">
            {emptyCopy}{" "}
            <Link
              href={emptyHref}
              className="t-body-sm text-accent transition-colors hover:underline"
            >
              {emptyLabel}
            </Link>
          </TitlesCatalogEmpty>
        }
      />
    </TitlesCatalogFrame>
  );
}
