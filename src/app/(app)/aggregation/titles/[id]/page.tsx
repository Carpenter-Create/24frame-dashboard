import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { TitleHero } from "@/components/layout/title-hero";
import { FieldList } from "@/components/layout/field-list";
import { StatusChip } from "@/components/layout/status-chip";
import { RIGHTS_META, exclusivityLabel } from "@/lib/rights";
import { describeTerritory } from "@/lib/territories";
import { GENRES, METADATA_FIELDS, requiredComplete } from "@/lib/metadata";
import { TITLE_DETAILS } from "@/lib/title-details";
import { InlineNotice } from "@/components/ui/inline-notice";
import { FindingsCard } from "@/components/findings/findings-card";
import { titleArtworkUrls } from "@/lib/artwork";
import { screenerKindFor, isPostApprovalTitleStatus } from "@/lib/assets";
import { RELEASE_TYPE_LABEL, formatReleaseDate, type ReleaseType } from "@/lib/releases";
import { AddRightEntry } from "./add-right-window";
import { ReleaseInfoForm } from "./release-info-form";
import { TitleDetailsEntry, TitleDetailsLink } from "./title-details-window";
import { AssetUpload } from "./asset-upload";
import { ScreenerSourceControl } from "./screener-source-control";
import { BuyerShareControl } from "./buyer-share-control";
import { ScreenerWatchButton } from "./screener-watch-button";
import { TrailerPlayButton } from "./trailer-play-button";
import { AssetDownloadButton } from "./asset-download-button";
import { SubmitButton } from "./submit-button";
import { TitleLifecycleControls } from "./title-lifecycle-controls";
import { ATTENTION_HREF } from "@/lib/findings";
import { TITLES_HREF } from "@/lib/title-public-id";
import {
  DELIVERY_STATUS_ROW_LABELS,
  TITLE_DETAIL,
  TITLE_DETAIL_ASSET_FILE_CLASS,
  TITLE_DETAIL_LEDGER_COPY_CLASS,
  TITLE_DETAIL_LEDGER_META_CLASS,
  TITLE_DETAIL_LEDGER_ROW_CLASS,
  TITLE_DETAIL_SURFACE_CLASS,
  titleDisplayStatus,
  type TitleStatus,
} from "@/lib/titles";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import { aggregationViewAsSurface } from "@/lib/aggregation-impersonation";
import { titleLifecycleFlags } from "@/lib/titles-lifecycle";
import { TITLE_DELIVERIES_TRUNCATED } from "@/lib/deliveries-browse";
import { DETAIL_LIST, rangeFor } from "@/lib/list-bounds";
import { loadMyDeliveries } from "@/lib/my-lists";
import {
  firstTitleMatch,
  isCanonicalTitleSlug,
  publicCatalogId,
  titleClientPath,
} from "@/lib/title-public-id";

const ASSET_KIND_LABELS: Record<
  "master" | "caption" | "artwork" | "poster" | "banner" | "screener" | "trailer",
  string
> = {
  master: "Master",
  caption: "Caption",
  artwork: "Poster", // legacy generic 'artwork' == the vertical poster (backfilled)
  poster: "Poster",
  banner: "Banner",
  screener: "Screener",
  trailer: "Trailer",
};

const HERO_META_SKIP = new Set(["synopsis", "director", "cast"]);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024,
    i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function metadataValue(
  value: unknown,
  vocab?: { value: string; label: string }[],
): string | null {
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string" || !value.trim()) return null;
  return vocab?.find((o) => o.value === value)?.label ?? value;
}

function TitleDetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`${TITLE_DETAIL_SURFACE_CLASS} flex flex-col gap-[var(--space-4)]`}
      data-title-detail-section=""
    >
      <h2 className="t-heading text-ink" data-title-detail-section-title="">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Title detail — leading art, meta + Play trailer, then product-true sections.
// RLS-scoped; operate-capable roles (account_owner, delivery_ops — §4) see the edit forms.
export default async function TitleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  const supabase = await createClient();
  // Resolved once per request and shared with the layout above (React cache()).
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrg) redirect("/");
  const rows = ctx.rows;

  const title = await firstTitleMatch(async (filter) => {
    const { data } = await supabase
      .from("titles")
      .select("id, title, status, org_id, catalog_id, screener_source, release_type, original_release_date, release_date")
      .eq(filter.field, filter.value)
      .maybeSingle();
    return data;
  }, slug);
  if (!title) notFound(); // RLS returns null for another org's title → 404

  const publicId = publicCatalogId(title.catalog_id);
  if (publicId && !isCanonicalTitleSlug(slug, title.catalog_id)) {
    redirect(titleClientPath(title.catalog_id));
  }

  const titleId = title.id;
  const titleHref = titleClientPath(title.catalog_id);

  // Title-org role, not only the active-org cookie. Staff still get
  // lifecycle flags via ctx.isGcStaff when they are not operate on this org.
  // View-as installs a synthetic owner role for the client catalog; that
  // role does not grant operate or staff lifecycle controls.
  const titleRole =
    rows.find((m) => m.organizations.id === title.org_id)?.role ??
    (ctx.activeOrg.id === title.org_id ? ctx.activeRole : null);
  const { canOperate, isStaff: lifecycleStaff } = aggregationViewAsSurface({
    viewAs: ctx.aggregationViewAs,
    canOperate: titleRole === "account_owner" || titleRole === "delivery_ops",
    isGcStaff: ctx.isGcStaff,
  });

  const { data: grants } = await supabase
    .from("rights_grants")
    .select("id, rights_type, territory_mode, territories, exclusive, window_start, window_end")
    .eq("title_id", titleId)
    .is("effective_to", null)
    .order("created_at", { ascending: false })
    .range(...rangeFor(DETAIL_LIST));
  const list = grants ?? [];

  const { data: assets } = await supabase
    .from("assets")
    .select("id, kind, original_filename, bytes, received_at")
    .eq("title_id", titleId)
    .order("received_at", { ascending: false })
    .range(...rangeFor(DETAIL_LIST));
  const assetList = assets ?? [];

  const { data: metaRow } = await supabase
    .from("title_metadata")
    .select("data")
    .eq("title_id", titleId)
    .maybeSingle();
  const meta = (metaRow?.data as Record<string, unknown>) ?? {};
  const complete = requiredComplete(meta);

  const { data: latestReview } = await supabase
    .from("title_reviews")
    .select("decision, reason, created_at")
    .eq("title_id", titleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const showRejection =
    title.status === "draft" && latestReview?.decision === "reject" && !!latestReview.reason;

  const titleDeliveries = await loadMyDeliveries(supabase, {
    titleId,
    limit: DETAIL_LIST,
  });
  const titleDlv = titleDeliveries.rows;
  const liveCount = titleDlv.filter((d) => d.status === "live").length;
  const totalCount = titleDlv.length;

  // Parallel — two independent reads (the repo's easiest perf regression is awaiting these
  // in sequence). Share links are RLS-scoped to this org's title, but since 20260806000300
  // that includes GC-authored screener links too (the author partition was removed — one
  // active link per (title, recipient), whoever created it). The list comes back empty only
  // for a role that may not share at all. Links are per-buyer (Task 4), so this is a bounded
  // list, not a single row.
  const [{ data: findings }, { data: shareLinks }] = await Promise.all([
    supabase
      .from("findings")
      .select("id, message, severity")
      .eq("entity_type", "title")
      .eq("entity_id", titleId)
      .eq("status", "open")
      .order("severity", { ascending: true })
      .range(...rangeFor(DETAIL_LIST)),
    supabase
      .from("portal_links")
      .select("id, share_token, expires_at, recipient_name")
      .eq("title_id", titleId)
      .eq("purpose", "screener_view")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .range(...rangeFor(DETAIL_LIST)),
  ]);

  // A client may share once GC has approved, but never a withdrawn title — mirrors the
  // status gate inside create_screener_link so the control is not offered when it would fail.
  const canShareScreener =
    canOperate && ["in_delivery", "live", "takedown_requested"].includes(title.status);
  const portalBase = process.env.PORTAL_BASE_URL?.replace(/\/+$/, "") ?? "";
  // share_token is nullable in the schema but never null for a non-revoked row in practice;
  // filter defensively rather than risk building a /portal/null URL.
  //
  // recipient_name is passed through as-is (string | null), NOT coerced to a placeholder here.
  // GC mints a screener link during chain-of-title review with no recipient at all, and since
  // 20260806000300 that row is visible on this list too. Coercing null to a label string at
  // this layer would make "no buyer attached" indistinguishable, by type, from a real typed
  // name — which is exactly what let a stale build of this page pass a placeholder string into
  // the "Replace link" action as if it were real recipient data. BuyerShareControl owns the
  // null-aware label and gates the replace action on the real type, not string comparison.
  const buyerLinks = (shareLinks ?? [])
    .filter((l): l is typeof l & { share_token: string } => !!l.share_token)
    .map((l) => ({
      linkId: l.id,
      recipientName: l.recipient_name,
      url: `${portalBase}/portal/${l.share_token}`,
      expiresAt: l.expires_at,
    }));

  const art = (await titleArtworkUrls(supabase, [titleId])).get(titleId) ?? { poster: null, banner: null };

  const statusLabel = titleDisplayStatus(title.status as TitleStatus, liveCount, totalCount);
  const statusTone: "neutral" | "active" | "muted" =
    title.status === "archived" || title.status === "draft"
      ? "muted"
      : liveCount > 0
        ? "active"
        : "neutral";

  const canSubmit = canOperate && title.status === "draft";
  const needsReportingCheck =
    lifecycleStaff && title.status !== "draft" && title.status !== "archived";
  const { data: hasReportingActivity } = needsReportingCheck
    ? await supabase.rpc("title_has_reporting_activity", { p_title_id: titleId })
    : { data: false };
  // gc_can(operate) is delete_title's staff gate: staff whose GC role cannot
  // operate (legal, accountant) are not offered Delete. Members never call it.
  const { data: staffCanOperate } = lifecycleStaff
    ? await supabase.rpc("gc_can", { p_uid: ctx.user.id, p_capability: "operate" })
    : { data: false };
  const lifecycleFlags = titleLifecycleFlags(
    { isStaff: lifecycleStaff, canOperate, staffCanOperate: staffCanOperate === true },
    title.status as TitleStatus,
    hasReportingActivity === true,
  );

  // Screener is watchable when its source exists: a dedicated screener asset if the title
  // is set to 'dedicated', else the master. (The stream is signed server-side, RLS-scoped.)
  // screenerKindFor IS /api/screener/url's rule — the route calls the same function — so the
  // button cannot render for a request that would then 404.
  // ctx already resolved gc_staff for this request -- no second lookup.
  const screenerKind = screenerKindFor(title.screener_source, ctx.isGcStaff, title.status);
  const screenerAvailable = screenerKind !== null && assetList.some((a) => a.kind === screenerKind);

  // A BUYER link (one the client mints with a recipient's name) can only ever stream a
  // dedicated screener — /api/portal/screener refuses the stream outright for a named
  // recipient when screener_source is 'master' (see buyer-page.ts's hasRecipientName gate).
  // GC's own operational link is exempt from that gate, but BuyerShareControl only ever mints
  // buyer links, so the control needs the STRICTER of the two conditions, not screenerAvailable
  // above (which also counts a master fallback that a buyer link cannot use).
  const screenerReadyForBuyers =
    title.screener_source === "dedicated" && assetList.some((a) => a.kind === "screener");

  const trailer = assetList.find((a) => a.kind === "trailer");
  const synopsis = metadataValue(meta.synopsis);
  const genre = metadataValue(meta.genre, GENRES);
  const yearFromDate = title.release_date
    ? /^(\d{4})-\d{2}-\d{2}$/.exec(title.release_date)?.[1] ?? null
    : null;
  const year =
    yearFromDate ?? (typeof meta.release_year === "number" ? String(meta.release_year) : null);
  const heroMeta = [year, genre, publicId].filter((v): v is string => !!v);
  const director = metadataValue(meta.director);
  const cast = metadataValue(meta.cast);
  const metadataItems = [
    { label: "Status", value: <StatusChip label={statusLabel} tone={statusTone} /> },
    { label: "Release type", value: RELEASE_TYPE_LABEL[title.release_type as ReleaseType] },
    ...(title.release_date
      ? [{ label: "Release", value: formatReleaseDate(title.release_date) }]
      : []),
    { label: "Rights", value: `${list.length} ${list.length === 1 ? "grant" : "grants"}` },
    { label: "Metadata", value: `${complete.filled} of ${complete.total} complete` },
    {
      label: "Catalog ID",
      value: <span className="select-all tabular-nums text-ink-3">{publicId ?? "—"}</span>,
    },
    ...METADATA_FIELDS.filter((f) => !HERO_META_SKIP.has(f.key))
      .map((f) => {
        const value = metadataValue(meta[f.key], f.vocab);
        return value ? { label: f.label, value } : null;
      })
      .filter((item): item is { label: string; value: string } => item !== null),
  ];
  const showAssets = canOperate || assetList.length > 0;
  const showRights = canOperate || list.length > 0;
  const showCredits = !!director || !!cast;
  const showDeliveries = titleDlv.length > 0;

  return (
    <section className={TITLE_DETAIL_SURFACE_CLASS} data-title-detail="">
      <TitleHero
        title={title.title}
        backHref={TITLES_HREF}
        backLabel="Titles"
        status={title.status}
        liveCount={liveCount}
        bannerUrl={art.banner}
        posterUrl={art.poster}
        meta={heroMeta}
        action={trailer ? <TrailerPlayButton assetId={trailer.id} /> : null}
        secondary={screenerAvailable ? <ScreenerWatchButton titleId={title.id} /> : null}
        overflow={
          <TitleLifecycleControls
            titleId={title.id}
            titleName={title.title}
            status={title.status as TitleStatus}
            isStaff={lifecycleStaff}
            flags={lifecycleFlags}
          />
        }
      />

      <nav
        aria-label={TITLE_DETAIL.relatedLabel}
        className="mt-[var(--space-4)] flex min-w-0 flex-wrap gap-[var(--space-4)]"
        data-title-ops-links=""
      >
        <Link href={TITLES_HREF} className="t-body-sm text-accent">
          {TITLE_DETAIL.deliveriesLink}
        </Link>
        <Link href={ATTENTION_HREF} className="t-body-sm text-accent">
          {TITLE_DETAIL.healthLink}
        </Link>
      </nav>

      <div className={`${TITLE_DETAIL_SURFACE_CLASS} mt-[var(--space-6)] flex flex-col gap-[var(--space-6)] border-t border-hairline pt-[var(--space-6)]`}>
        {/* Attention — surfaced only when there's something to act on */}
        {titleDeliveries.truncated ? (
          <InlineNotice tone="info" data-my-list-truncated="title-deliveries">
            {TITLE_DELIVERIES_TRUNCATED}
          </InlineNotice>
        ) : null}
        {(findings ?? []).length > 0 ? <FindingsCard findings={findings ?? []} /> : null}
        {showRejection ? (
          <InlineNotice tone="error">Returned for revision: {latestReview!.reason}</InlineNotice>
        ) : null}
        {canSubmit ? (
          complete.filled >= complete.total ? (
            <SubmitButton orgId={title.org_id} titleId={title.id} />
          ) : (
            <InlineNotice tone="info">
              {TITLE_DETAIL.requiredNotice(complete.total)}{" "}
              <TitleDetailsLink face="required" className="text-accent">
                {TITLE_DETAILS.editMetadata}
              </TitleDetailsLink>
            </InlineNotice>
          )
        ) : null}
        {synopsis ? (
          <TitleDetailSection title={TITLE_DETAIL.sectionSynopsis}>
            <p className={`${HOUSE_PHONE_WRAP_CLASS} t-body text-ink-2`}>{synopsis}</p>
          </TitleDetailSection>
        ) : null}

        <TitleDetailSection title={TITLE_DETAIL.sectionMetadata}>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="sr-only">{TITLE_DETAIL.sectionMetadata}</CardTitle>
              {/* Operators edit in the Metadata window over this page; it
                  lives here, never in the notice that Submit replaces. */}
              {canOperate ? (
                <TitleDetailsEntry
                  titleId={title.id}
                  metadata={meta}
                  release={{
                    releaseType: title.release_type as ReleaseType,
                    originalReleaseDate: title.original_release_date,
                  }}
                  releaseDate={title.release_date}
                />
              ) : (
                <Link href={`${titleHref}/metadata`} className="t-body-sm text-accent">
                  {TITLE_DETAIL.viewMetadata}
                </Link>
              )}
            </CardHeader>
            <FieldList items={metadataItems} />
            <CardBody className="border-t border-hairline">
              <ReleaseInfoForm
                releaseType={title.release_type as ReleaseType}
                originalReleaseDate={title.original_release_date}
                releaseDate={title.release_date}
                canOperate={canOperate}
              />
            </CardBody>
          </Card>
        </TitleDetailSection>

        {showAssets ? (
          <TitleDetailSection title={TITLE_DETAIL.sectionAssets}>
            <Card>
              {canOperate ? (
                <CardBody className="border-b border-hairline">
                  <div className="max-w-xl space-y-4">
                    <AssetUpload titleId={title.id} />
                    <ScreenerSourceControl
                      titleId={title.id}
                      current={(title.screener_source ?? "master") as "master" | "dedicated"}
                      isPostApproval={isPostApprovalTitleStatus(title.status)}
                      hasDedicatedScreener={assetList.some((a) => a.kind === "screener")}
                    />
                    {canShareScreener ? (
                      <BuyerShareControl
                        titleId={title.id}
                        links={buyerLinks}
                        screenerReadyForBuyers={screenerReadyForBuyers}
                      />
                    ) : null}
                  </div>
                </CardBody>
              ) : null}
              {assetList.length === 0 ? (
                <CardBody>
                  <p className="t-body-sm text-ink-3">No files uploaded yet.</p>
                </CardBody>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {assetList.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col gap-2 rounded-[var(--radius)] border border-hairline bg-surface p-3"
                    >
                      <AssetDownloadButton assetId={a.id} kind={a.kind} />
                      <div className="flex min-w-0 flex-col px-0.5">
                        <span className="t-label text-ink-2">{ASSET_KIND_LABELS[a.kind]}</span>
                        <span className={TITLE_DETAIL_ASSET_FILE_CLASS}>
                          {a.original_filename ? `${a.original_filename} · ` : ""}
                          {formatBytes(a.bytes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TitleDetailSection>
        ) : null}

        {showCredits ? (
          <TitleDetailSection title={TITLE_DETAIL.sectionCredits}>
            <FieldList
              items={[
                ...(director ? [{ label: "Director", value: director }] : []),
                ...(cast ? [{ label: "Cast", value: cast }] : []),
              ]}
            />
          </TitleDetailSection>
        ) : null}

        {showRights ? (
          <TitleDetailSection title={TITLE_DETAIL.sectionRights}>
            <Card>
              {/* Operators add a grant in the Add right window over this
                  page; existing grants stay inline and read-only. */}
              {canOperate ? (
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="sr-only">{TITLE_DETAIL.sectionRights}</CardTitle>
                  <AddRightEntry titleId={title.id} />
                </CardHeader>
              ) : null}
              {list.length === 0 ? (
                <CardBody>
                  <p className="t-body-sm text-ink-3">{TITLE_DETAIL.rightsEmpty}</p>
                </CardBody>
              ) : (
                <div className="divide-y divide-hairline">
                  {list.map((g) => (
                    <div key={g.id} className={TITLE_DETAIL_LEDGER_ROW_CLASS}>
                      <div className={TITLE_DETAIL_LEDGER_COPY_CLASS}>
                        <span className={`${HOUSE_PHONE_WRAP_CLASS} t-body-sm font-medium text-ink`}>
                          {RIGHTS_META[g.rights_type].label}
                        </span>
                        <span className={`${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink-3`}>
                          {exclusivityLabel(g.exclusive)}
                        </span>
                      </div>
                      <span className={TITLE_DETAIL_LEDGER_META_CLASS}>
                        {describeTerritory(g.territory_mode, g.territories)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TitleDetailSection>
        ) : null}

        {showDeliveries ? (
          <TitleDetailSection title={TITLE_DETAIL.sectionDeliveries}>
            <Card>
              <div className="divide-y divide-hairline">
                {titleDlv.map((d) => (
                  <div key={d.delivery_id} className={TITLE_DETAIL_LEDGER_ROW_CLASS}>
                    <span className={`${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink-2`}>
                      {d.vendor_name} · {d.territory}
                    </span>
                    <span className={`${HOUSE_PHONE_WRAP_CLASS} t-body-sm font-medium text-ink md:shrink-0 md:text-right`}>
                      {DELIVERY_STATUS_ROW_LABELS[d.status]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TitleDetailSection>
        ) : null}
      </div>
    </section>
  );
}
