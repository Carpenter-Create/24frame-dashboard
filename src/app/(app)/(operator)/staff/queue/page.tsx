import { Suspense } from "react";

import { HousePageSearch } from "@/components/chrome/house-page-search";
import { titleArtworkUrls } from "@/lib/artwork";
import { createClient } from "@/lib/supabase/server";
import { LIST_PAGE, UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";
import {
  QUEUE_ACTIVE_STATUSES,
  QUEUE_PAGE,
  collectFirstSubmitAts,
  queueOrgName,
  queueSubmittedAt,
  queueSubmittedDateLabel,
  queueSubmitterLabel,
} from "@/lib/queue";
import { filterTitles } from "@/lib/titles-browse";
import {
  TITLES_CATALOG,
  catalogReleaseYear,
  catalogSearchMissCopy,
  catalogSearchQuery,
  catalogStillSrc,
} from "@/lib/titles-catalog";
import { opsCatalogId, titleOpsPath } from "@/lib/title-public-id";
import type { TitleStatus } from "@/lib/titles";
import {
  TitlesCatalogEmpty,
  TitlesCatalogFrame,
  TitlesCatalogHeader,
  TitlesCatalogList,
  TitlesCatalogListRow,
  TitlesCatalogToolbar,
} from "@/components/titles/titles-catalog";

// Staff /queue is the Titles catalog list, scoped to active work across orgs.
// RLS is_gc_staff is the cross-org read. Row status is the shared Titles
// track — the setter stays on GC title detail. Search is the Titles catalog
// toolbar SoT (`HousePageSearch` + `?q=` + `filterTitles`) — not a Queue lookalike.

export default async function GcQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const sp = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const q = catalogSearchQuery(sp.q);
  const supabase = await createClient();
  const { data: titles } = await supabase
    .from("titles")
    .select("id, title, catalog_id, status, created_at, created_by, release_date, organizations(name)")
    .in("status", [...QUEUE_ACTIVE_STATUSES])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(...rangeFor(LIST_PAGE));

  const list = titles ?? [];
  const titleIds = list.map((t) => t.id);
  const createdByIds = [
    ...new Set(list.map((t) => t.created_by).filter((id): id is string => Boolean(id))),
  ];

  const [{ data: findingRows }, { data: profileRows }, { data: auditRows }, posters] =
    await Promise.all([
      titleIds.length
        ? supabase
            .from("findings")
            .select("entity_id")
            .eq("entity_type", "title")
            .eq("status", "open")
            .in("entity_id", titleIds)
            .range(...rangeFor(UNPAGINATED_MAX))
        : Promise.resolve({ data: [] as { entity_id: string }[] }),
      createdByIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", createdByIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
      titleIds.length
        ? supabase
            .from("audit_log")
            .select("entity_id, at, after")
            .eq("entity", "titles")
            .eq("action", "update")
            .in("entity_id", titleIds)
            .order("at", { ascending: true })
            .range(...rangeFor(UNPAGINATED_MAX))
        : Promise.resolve({ data: [] as { entity_id: string; at: string; after: unknown }[] }),
      titleArtworkUrls(supabase, titleIds),
    ]);

  const findingsByTitle: Record<string, number> = {};
  for (const f of findingRows ?? []) {
    findingsByTitle[f.entity_id] = (findingsByTitle[f.entity_id] ?? 0) + 1;
  }
  const profileNames = new Map((profileRows ?? []).map((row) => [row.id, row.display_name]));
  const submitAts = collectFirstSubmitAts(auditRows ?? []);

  const rows = list.map((t) => {
    const submittedAt = queueSubmittedAt(t.created_at, submitAts.get(t.id) ?? null);
    return {
      key: t.id,
      href: titleOpsPath(t.id),
      title: t.title,
      stillUrl: catalogStillSrc(posters.get(t.id)?.banner),
      status: t.status as TitleStatus,
      year: catalogReleaseYear(t.release_date),
      publicId: opsCatalogId(t.catalog_id) ?? t.catalog_id,
      staff: {
        submitter: queueSubmitterLabel(t.created_by ? profileNames.get(t.created_by) : null),
        submittedOn: queueSubmittedDateLabel(submittedAt),
        orgName: queueOrgName(t.organizations?.name),
        findings: findingsByTitle[t.id] ?? 0,
      },
      submittedAt,
    };
  });
  rows.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : a.submittedAt > b.submittedAt ? -1 : 0));

  const hasQueue = rows.length > 0;
  const visible = filterTitles(rows, q);
  const emptyCopy =
    !hasQueue
      ? QUEUE_PAGE.empty
      : q.trim()
        ? catalogSearchMissCopy(q)
        : QUEUE_PAGE.empty;

  return (
    <TitlesCatalogFrame empty={!hasQueue} data-queue-catalog="">
      <TitlesCatalogHeader title={QUEUE_PAGE.title} />

      {hasQueue ? (
        <TitlesCatalogToolbar
          search={
            <Suspense fallback={null}>
              <HousePageSearch placeholder={TITLES_CATALOG.searchPlaceholder} />
            </Suspense>
          }
        />
      ) : null}

      {visible.length === 0 ? (
        <TitlesCatalogEmpty>{emptyCopy}</TitlesCatalogEmpty>
      ) : (
        <TitlesCatalogList>
          {visible.map((r) => (
            <TitlesCatalogListRow
              key={r.key}
              href={r.href}
              title={r.title}
              stillUrl={r.stillUrl}
              status={r.status}
              year={r.year}
              publicId={r.publicId}
              staff={r.staff}
            />
          ))}
        </TitlesCatalogList>
      )}
    </TitlesCatalogFrame>
  );
}
