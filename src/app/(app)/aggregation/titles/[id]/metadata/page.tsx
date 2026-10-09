import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import { PageHeader } from "@/components/ui/page-header";
import { METADATA_FIELDS } from "@/lib/metadata";
import { TITLE_DETAILS_PARAM } from "@/lib/title-details";
import { aggregationViewAsSurface } from "@/lib/aggregation-impersonation";
import {
  firstTitleMatch,
  isCanonicalTitleSlug,
  publicCatalogId,
  titleClientPath,
} from "@/lib/title-public-id";

// Title metadata (§12 path 1). RLS-scoped. Operate-capable roles
// (account_owner, delivery_ops — §4) edit in the title's Metadata window, so
// this address hands them over to it on the title page (window on a computer,
// full sheet on a phone); others get the read-only list here.
export default async function TitleMetadataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const supabase = await createClient();
  // Resolved once per request and shared with the layout above (React cache()).
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const title = await firstTitleMatch(async (filter) => {
    const { data } = await supabase
      .from("titles")
      .select("id, title, org_id, catalog_id")
      .eq(filter.field, filter.value)
      .maybeSingle();
    return data;
  }, slug);
  if (!title) notFound();

  const publicId = publicCatalogId(title.catalog_id);
  if (publicId && !isCanonicalTitleSlug(slug, title.catalog_id)) {
    redirect(titleClientPath(title.catalog_id, "/metadata"));
  }

  // The role in the org that owns THIS title -- not necessarily the active org.
  // ctx.rows already holds every active membership, so this needs no extra query.
  // The same rule as the title page.
  const titleRole =
    ctx.rows.find((r) => r.organizations.id === title.org_id)?.role ??
    (ctx.activeOrg?.id === title.org_id ? ctx.activeRole : null);
  const { canOperate } = aggregationViewAsSurface({
    viewAs: ctx.aggregationViewAs,
    canOperate: titleRole === "account_owner" || titleRole === "delivery_ops",
    isGcStaff: ctx.isGcStaff,
  });
  if (canOperate) redirect(`${titleClientPath(title.catalog_id)}?${TITLE_DETAILS_PARAM}`);

  const { data: row } = await supabase
    .from("title_metadata")
    .select("data")
    .eq("title_id", title.id)
    .maybeSingle();
  const data = (row?.data as Record<string, unknown> | null) ?? {};

  return (
    <>
      <PageHeader
        title={title.title}
        subtitle="Metadata"
        backLink={{ href: titleClientPath(title.catalog_id), label: "Back to title" }}
      />
      <dl className="flex max-w-xl flex-col gap-2">
        {METADATA_FIELDS.map((f) => {
          const v = data[f.key];
          let shown: string;
          if (Array.isArray(v)) shown = v.length ? v.join(", ") : "—";
          else if (v == null || v === "") shown = "—";
          else if (f.type === "select") shown = f.vocab?.find((o) => o.value === v)?.label ?? String(v);
          else shown = String(v);
          return (
            <div key={f.key} className="flex justify-between gap-4 border-b border-hairline py-1.5">
              <dt className="t-body-sm text-ink-3">{f.label}</dt>
              <dd className="t-body-sm text-ink-2">{shown}</dd>
            </div>
          );
        })}
      </dl>
    </>
  );
}
