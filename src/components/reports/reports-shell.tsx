import { formatUsdCents } from "@/lib/finance";
import {
  dashboardAsOfLine,
  dashboardDeltaLine,
  dashboardHeroMoney,
  revenuePlayheadKey,
  type DashboardPeriod,
  type DashboardRevenueHero,
} from "@/lib/dashboard-admin";
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_CARD_PAD_HERO,
  DASHBOARD_CARD_PAD_LIST,
  DASHBOARD_RELATED_GAP_CLASS,
  DASHBOARD_ROW_LIST_CLASS,
  DASHBOARD_ROW_STACK_CLASS,
  DASHBOARD_ROW_TITLE_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-craft";
import { REPORTS_PAGE, type ReportsPeriod, type ReportsPeriodOption, type ReportsUserOption } from "@/lib/reports";
import {
  REPORTS_CHROME_CLASS,
  REPORTS_FIXTURE_BANNER_CLASS,
  REPORTS_HERO_ASOF_CLASS,
  REPORTS_HERO_CLASS,
  REPORTS_HERO_COMPOSITION_CLASS,
  REPORTS_HERO_DELTA_CLASS,
  REPORTS_HERO_REVENUE_CLASS,
  REPORTS_HERO_VALUE_CLASS,
  REPORTS_STACK_CLASS,
  REPORTS_TITLE_DESKTOP_CLASS,
  REPORTS_TITLE_MOBILE_CLASS,
} from "@/lib/reports-craft";
import { REPORTS_FIXTURE, reportsFixtureLabel } from "@/lib/reports-fixture";
import type { ReportsCompositionRow } from "@/lib/reports-view";
import type { DashboardRankedTitle } from "@/lib/dashboard-home";
import type { ReportsCountRow } from "@/lib/reports";
import { cn } from "@/lib/cn";

import { ReportsControls } from "@/components/reports/reports-controls";
import { ReportsRevenueChart } from "@/components/reports/reports-chart";
import { ReportsTerritories, ReportsTopPerforming } from "@/components/reports/reports-ranked";
import { ReportsDetailTable } from "@/components/reports/reports-table";
import type { ReportsDetailRow } from "@/lib/reports-view";

export function ReportsFixtureBanner() {
  return (
    <p data-reports-fixture-banner="" role="status" className={REPORTS_FIXTURE_BANNER_CLASS}>
      {REPORTS_FIXTURE.banner} · {REPORTS_FIXTURE.note}
    </p>
  );
}

export function ReportsChrome({
  period,
  options,
  userIds,
  users,
  downloadHref,
  showUserScope,
}: {
  period: ReportsPeriod;
  options: readonly ReportsPeriodOption[];
  userIds: readonly string[];
  users: readonly ReportsUserOption[];
  downloadHref: string | null;
  showUserScope: boolean;
}) {
  return (
    <div data-reports-chrome="" className={REPORTS_CHROME_CLASS}>
      <header className="min-w-0">
        <h1 data-reports-title="">
          <span data-reports-title-mobile="" className={REPORTS_TITLE_MOBILE_CLASS}>
            {REPORTS_PAGE.title}
          </span>
          <span data-reports-title-desktop="" className={REPORTS_TITLE_DESKTOP_CLASS}>
            {REPORTS_PAGE.title}
          </span>
        </h1>
        <p className="mt-[var(--space-2)] t-body-sm text-ink-3">{REPORTS_PAGE.subtitle}</p>
      </header>
      <ReportsControls
        period={period}
        options={options}
        userIds={userIds}
        users={users}
        downloadHref={downloadHref}
        showUserScope={showUserScope}
      />
    </div>
  );
}

export function ReportsRevenueCard({
  hero,
  fixture = false,
}: {
  hero: DashboardRevenueHero;
  fixture?: boolean;
}) {
  const raw = dashboardHeroMoney(hero.totalCents);
  const value = fixture ? reportsFixtureLabel(raw) : raw;
  return (
    <section
      data-reports-hero=""
      data-reports-revenue=""
      aria-label={REPORTS_PAGE.revenue}
      className={DASHBOARD_CARD_CLASS}
    >
      <div className={cn("flex flex-col", DASHBOARD_RELATED_GAP_CLASS, DASHBOARD_CARD_PAD_HERO)}>
        <p className={DASHBOARD_SECTION_TITLE_CLASS}>{REPORTS_PAGE.revenue}</p>
        <p data-reports-stat="revenue" className={REPORTS_HERO_VALUE_CLASS}>
          {value}
        </p>
        {hero.compare ? (
          <p data-reports-revenue-compare="" className={REPORTS_HERO_DELTA_CLASS}>
            {dashboardDeltaLine(hero.compare)}
          </p>
        ) : null}
        <p data-reports-revenue-asof="" className={REPORTS_HERO_ASOF_CLASS}>
          {dashboardAsOfLine(hero)}
        </p>
      </div>
    </section>
  );
}

export function ReportsChartCard({
  period,
  hero,
  fixture = false,
}: {
  period: ReportsPeriod;
  hero: DashboardRevenueHero;
  fixture?: boolean;
}) {
  return (
    <section
      data-reports-chart=""
      aria-label={REPORTS_PAGE.series}
      className={DASHBOARD_CARD_CLASS}
    >
      <div className={cn(DASHBOARD_CARD_PAD_LIST)}>
        <p className={DASHBOARD_SECTION_TITLE_CLASS}>{REPORTS_PAGE.series}</p>
      </div>
      <div className="border-t border-hairline">
        <ReportsRevenueChart
          points={hero.points}
          playheadKey={revenuePlayheadKey(period as DashboardPeriod, hero.points)}
          fixture={fixture}
        />
      </div>
    </section>
  );
}

export function ReportsComposition({
  rows,
  fixture = false,
}: {
  rows: readonly ReportsCompositionRow[];
  fixture?: boolean;
}) {
  return (
    <section
      data-reports-composition=""
      aria-label={REPORTS_PAGE.composition}
      className={DASHBOARD_CARD_CLASS}
    >
      <div className={cn(DASHBOARD_CARD_PAD_LIST)}>
        <p className={DASHBOARD_SECTION_TITLE_CLASS}>{REPORTS_PAGE.composition}</p>
      </div>
      {rows.length === 0 ? (
        <p
          data-reports-composition-empty=""
          className="border-t border-hairline px-[var(--space-4)] py-[var(--space-2)] t-body-sm text-ink-3"
        >
          {REPORTS_PAGE.compositionEmpty}
        </p>
      ) : (
        <ul className={DASHBOARD_ROW_LIST_CLASS}>
          {rows.map((row) => {
            const value =
              row.cents != null
                ? fixture
                  ? reportsFixtureLabel(formatUsdCents(row.cents))
                  : formatUsdCents(row.cents)
                : String(row.count);
            return (
              <li key={row.name} data-reports-composition-row="" className={DASHBOARD_ROW_STACK_CLASS}>
                <span className={DASHBOARD_ROW_TITLE_CLASS}>{row.name}</span>
                <span className="t-data t-body-sm shrink-0 text-ink">{value}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ReportsBody({
  period,
  options,
  userIds,
  users,
  downloadHref,
  showUserScope,
  hero,
  composition,
  titles,
  platforms,
  userRows,
  territories,
  detail,
  fixture = false,
}: {
  period: ReportsPeriod;
  options: readonly ReportsPeriodOption[];
  userIds: readonly string[];
  users: readonly ReportsUserOption[];
  downloadHref: string | null;
  showUserScope: boolean;
  hero: DashboardRevenueHero;
  composition: readonly ReportsCompositionRow[];
  titles: readonly DashboardRankedTitle[];
  platforms: readonly ReportsCountRow[];
  userRows: readonly ReportsCountRow[];
  territories: readonly ReportsCountRow[];
  detail: readonly ReportsDetailRow[];
  fixture?: boolean;
}) {
  return (
    <div data-reports-body="" className={REPORTS_STACK_CLASS}>
      {fixture ? <ReportsFixtureBanner /> : null}
      <ReportsChrome
        period={period}
        options={options}
        userIds={userIds}
        users={users}
        downloadHref={downloadHref}
        showUserScope={showUserScope}
      />
      <div data-reports-overview-row="" className={REPORTS_HERO_CLASS}>
        <div data-reports-overview-revenue="" className={REPORTS_HERO_REVENUE_CLASS}>
          <ReportsRevenueCard hero={hero} fixture={fixture} />
        </div>
        <div data-reports-overview-composition="" className={REPORTS_HERO_COMPOSITION_CLASS}>
          <ReportsComposition rows={composition} fixture={fixture} />
        </div>
      </div>
      <ReportsChartCard period={period} hero={hero} fixture={fixture} />
      <ReportsTopPerforming
        titles={titles}
        platforms={platforms}
        users={userRows}
        periodLabel={period.label}
        updated={hero.updated}
        showUsers={showUserScope}
      />
      <ReportsTerritories rows={territories} periodLabel={period.label} updated={hero.updated} />
      <ReportsDetailTable rows={detail} periodLabel={period.label} />
    </div>
  );
}
