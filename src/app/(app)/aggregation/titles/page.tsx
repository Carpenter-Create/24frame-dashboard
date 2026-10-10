import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import { LIST_PAGE, probeRange, splitProbe } from "@/lib/list-bounds";
import { InlineNotice } from "@/components/ui/inline-notice";
import { HousePageSearch } from "@/components/chrome/house-page-search";
import { AddTitleButton } from "./add-title-button";
import { titleArtworkUrls } from "@/lib/artwork";
import { filterTitles, type BrowseTitle } from "@/lib/titles-browse";
import {
  TITLES_CATALOG,
  catalogReleaseYear,
  catalogSearchMissCopy,
  catalogSearchQuery,
  catalogStillSrc,
  filterCatalogByStatus,
  parseCatalogStatusFilter,
} from "@/lib/titles-catalog";
import { aggregationViewAsSurface } from "@/lib/aggregation-impersonation";
import { publicCatalogId, titleClientPath } from "@/lib/title-public-id";
import {
  TitlesCatalogEmpty,
  TitlesCatalogFrame,
  TitlesCatalogHeader,
  TitlesCatalogList,
  TitlesCatalogListRow,
  TitlesCatalogToolbar,
} from "@/components/titles/titles-catalog";
import { TitleLifecycleControls } from "./[id]/title-lifecycle-controls";
import type { TitleStatus } from "@/lib/titles";
import {
  titleHasLifecycleActions,
  titleLifecycleFlags,
  titleListHasReportingActivity,
} from "@/lib/titles-lifecycle";

// Client `/titles` is the catalog you operate: active titles by default,
// Archived via the status filter. Soft-deleted titles are omitted.
// Phone stacks full-width landscape art over the title; desktop keeps the
// landscape-thumb row. Client chrome uses 24F- public ids; ops keeps GC-.

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = catalogSearchQuery(sp.q);
  const statusFilter = parseCatalogStatusFilter(str(sp.status));

  const supabase = await createClient();
  // Shared with the layout via React cache() — no second identity check, no second
  // memberships query. Free here because the layout already resolved it this request.
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrg) redirect("/");
  const activeOrg = ctx.activeOrg;
  const { canOperate, isStaff: lifecycleStaff } = aggregationViewAsSurface({
    viewAs: ctx.aggregationViewAs,
    canOperate: ctx.canOperate,
    isGcStaff: ctx.isGcStaff,
  });

  // BOUNDED (catalog-at-scale spec, phase 1). Unbounded, this returned exactly 1,000 rows
  // at PostgREST's max_rows with no error — a client with 1,200 films could not see 200 of
  // them and nothing said so. Probe fetches one extra row so truncation is detectable
  // without an exact count(*), which is its own cost over an RLS-filtered table.
  // Keyset pagination is phase 2; this makes the limit honest in the meantime.
  const [tFrom, tTo] = probeRange(LIST_PAGE);
  let titlesQuery = supabase
    .from("titles")
    .select("id, title, status, created_at, catalog_id, release_date")
    .eq("org_id", activeOrg.id)
    .is("deleted_at", null);
  if (statusFilter === "all") {
    titlesQuery = titlesQuery.neq("status", "archived");
  } else if (statusFilter === "archived") {
    titlesQuery = titlesQuery.eq("status", "archived");
  } else if (statusFilter === "submitted") {
    titlesQuery = titlesQuery.in("status", ["submitted", "in_delivery"]);
  } else {
    titlesQuery = titlesQuery.eq("status", statusFilter);
  }
  const { data: titlePage } = await titlesQuery
    .order("created_at", { ascending: false })
    .range(tFrom, tTo);
  const { rows: list, truncated } = splitProbe(titlePage, LIST_PAGE);
  const ids = list.map((t) => t.id);
  const posters = await titleArtworkUrls(supabase, ids);

  const all: BrowseTitle[] = list.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    created_at: t.created_at,
    release_date: t.release_date,
    live: 0,
    total: 0,
    posterUrl: posters.get(t.id)?.poster ?? null,
    bannerUrl: posters.get(t.id)?.banner ?? null,
  }));

  const filtered = filterCatalogByStatus(filterTitles(all, q), statusFilter);

  const catalogById = new Map(list.map((t) => [t.id, t.catalog_id]));
  // gc_can(operate) is delete_title's staff gate: staff whose GC role cannot
  // operate (legal, accountant) are not offered Delete. Members never call it.
  const { data: staffCanOperate } = lifecycleStaff
    ? await supabase.rpc("gc_can", { p_uid: ctx.user.id, p_capability: "operate" })
    : { data: false };
  const lifecycleActor = { isStaff: lifecycleStaff, canOperate, staffCanOperate: staffCanOperate === true };
  const stills = filtered.map((r) => {
    const catalogId = catalogById.get(r.id) ?? null;
    const flags = titleLifecycleFlags(
      lifecycleActor,
      r.status,
      titleListHasReportingActivity(r.status),
    );
    return {
      key: r.id,
      href: titleClientPath(catalogId),
      title: r.title,
      stillUrl: catalogStillSrc(r.bannerUrl),
      status: r.status,
      liveCount: r.live,
      year: catalogReleaseYear(r.release_date),
      publicId: publicCatalogId(catalogId),
      flags,
    };
  });

  const emptyCopy =
    list.length === 0
      ? canOperate
        ? TITLES_CATALOG.empty
        : TITLES_CATALOG.emptyReadOnly
      : q.trim()
        ? catalogSearchMissCopy(q)
        : TITLES_CATALOG.statusMiss;

  return (
    <TitlesCatalogFrame empty={list.length === 0}>
      <TitlesCatalogHeader
        q={list.length > 0 ? q : undefined}
        status={list.length > 0 ? statusFilter : undefined}
        action={
          canOperate ? (
            <AddTitleButton orgId={activeOrg.id} appearance="icon" />
          ) : undefined
        }
      />

      {list.length > 0 || canOperate ? (
        <TitlesCatalogToolbar
          search={
            list.length > 0 ? (
              <Suspense fallback={null}>
                <HousePageSearch placeholder={TITLES_CATALOG.searchPlaceholder} />
              </Suspense>
            ) : undefined
          }
          action={
            canOperate ? (
              <AddTitleButton orgId={activeOrg.id} appearance="labeled" />
            ) : undefined
          }
        />
      ) : null}

      {/* Honest about the bound. Silent truncation is the bug this replaced — a client with
          more titles than the page size could not see them and nothing said so. Paging
          arrives in phase 2 of the catalog-at-scale spec; until then, say it out loud. */}
      {truncated ? (
        <InlineNotice tone="info">
          Your catalog has more than {LIST_PAGE} titles. Search finds anything in the{" "}
          {LIST_PAGE} shown; full browsing of larger catalogs is coming shortly.
        </InlineNotice>
      ) : null}

      {stills.length === 0 ? (
        <TitlesCatalogEmpty>{emptyCopy}</TitlesCatalogEmpty>
      ) : (
        <TitlesCatalogList>
          {stills.map((r) => (
            <TitlesCatalogListRow
              key={r.key}
              href={r.href}
              title={r.title}
              stillUrl={r.stillUrl}
              status={r.status}
              liveCount={r.liveCount}
              year={r.year}
              publicId={r.publicId}
              overflow={
                titleHasLifecycleActions(r.flags) ? (
                  <TitleLifecycleControls
                    titleId={r.key}
                    titleName={r.title}
                    status={r.status as TitleStatus}
                    isStaff={lifecycleStaff}
                    flags={r.flags}
                  />
                ) : undefined
              }
            />
          ))}
        </TitlesCatalogList>
      )}
    </TitlesCatalogFrame>
  );
}
