import Link from "next/link";

import { HousePeriodPresets } from "@/components/chrome/house-period-presets";
import { HouseActionArrow } from "@/components/chrome/house-action-arrow";
import { CourseCard } from "@/components/courses/course-card";
import {
  DashboardHomeEmpty,
  DashboardHomePanel,
} from "@/components/dashboard/dashboard-home";
import { OverviewModule } from "@/components/overview/overview-module";
import { NewsRail } from "@/components/news/news-rail";
import { Skeleton } from "@/components/layout/skeleton";
import type { CourseRow } from "@/lib/courses";
import { DASHBOARD_ADMIN, type DashboardPeriod } from "@/lib/dashboard-admin";
import {
  DASHBOARD_CARD_PAD_LIST,
  DASHBOARD_RELATED_GAP_CLASS,
  DASHBOARD_ROW_CLASS,
  DASHBOARD_ROW_LIST_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-craft";
import type { ClientHomeDoNextItem, DashboardChangeRow } from "@/lib/dashboard-home";
import { TITLES_HREF } from "@/lib/title-public-id";
import { formatUsdCents } from "@/lib/finance";
import type { NewsItem } from "@/lib/news";
import {
  OVERVIEW_AREA_AI_CLASS,
  OVERVIEW_AREA_EDUCATION_CLASS,
  OVERVIEW_AREA_NEEDS_CLASS,
  OVERVIEW_AREA_NEWS_CLASS,
  OVERVIEW_AREA_REVENUE_CLASS,
  OVERVIEW_AREA_SOCIAL_CLASS,
  OVERVIEW_EDUCATION_COVERS_CLASS,
  OVERVIEW_HOME_FRAME_CLASS,
  OVERVIEW_HOME_LAYOUT_CLASS,
  OVERVIEW_MODULE_ARROW_CLASS,
  OVERVIEW_MODULE_NEST_CLASS,
  OVERVIEW_PAGE,
  overviewHref,
} from "@/lib/overview";
import { REPORTS_PERIOD_PRESETS, reportsPeriodPresetKey } from "@/lib/reports";
import { SocialMediaImage } from "@/components/social/social-media-image";
import { SOCIAL_AVATAR_32_CLASS } from "@/lib/social-chrome";
import { SOCIAL_OVERVIEW_FACE_IMAGE_SIZES } from "@/lib/social-media-display";
import type { SocialHomeChat } from "@/lib/social-home-chats";
import { socialDmHref, socialInitials } from "@/lib/social";

// Home IA v2 order rewrite. Revenue first. News is the right
// rail once the Home frame is two-column (container query — Home
// sits beside the dest rail) and the last full-width stack otherwise.
// This-week pulse stays with Revenue. Social stays avatars-only.
// Period presets share HousePeriodPresets (Reports chips on md+;
// HousePageSelect on phone). Never a wrapping Home chip fork.
// Top performing is not on Home.

export function OverviewHome({
  revenueCents,
  period,
  socialUnread,
  socialChats,
  socialFaces,
  courses,
  courseCovers,
  courseProgress,
  needsYou,
  weekPulse,
  aiNext,
  news,
  now,
}: {
  revenueCents: number | null;
  period: DashboardPeriod;
  socialUnread: number;
  socialChats: readonly SocialHomeChat[];
  socialFaces: ReadonlyMap<string, string | null>;
  courses: readonly CourseRow[];
  courseCovers?: ReadonlyMap<string, string>;
  courseProgress?: ReadonlyMap<string, number>;
  needsYou: readonly { id: string; what: string; href: string }[];
  weekPulse: readonly DashboardChangeRow[];
  aiNext: readonly ClientHomeDoNextItem[];
  news: readonly NewsItem[];
  now: Date;
}) {
  return (
    <div data-overview-frame="" className={OVERVIEW_HOME_FRAME_CLASS}>
      <div data-overview-layout="" className={OVERVIEW_HOME_LAYOUT_CLASS}>
      <div className={OVERVIEW_AREA_REVENUE_CLASS}>
      <DashboardHomePanel aria-label={OVERVIEW_PAGE.revenue} data-overview-revenue="">
        <div className={`flex items-center justify-between ${DASHBOARD_RELATED_GAP_CLASS} ${DASHBOARD_CARD_PAD_LIST}`}>
          <p className={DASHBOARD_SECTION_TITLE_CLASS}>{OVERVIEW_PAGE.revenue}</p>
          <Link
            href={OVERVIEW_PAGE.revenueHref}
            aria-label={OVERVIEW_PAGE.aggregation}
            data-overview-revenue-arrow=""
            className={OVERVIEW_MODULE_ARROW_CLASS}
          >
            <HouseActionArrow />
          </Link>
        </div>
        <div
          data-overview-revenue-period=""
          className="px-[var(--space-4)]"
        >
          <HousePeriodPresets
            value={period.kind}
            items={REPORTS_PERIOD_PRESETS.map((preset) => ({
              key: preset.grain,
              label: preset.label,
              href: overviewHref({ period: reportsPeriodPresetKey(preset.grain, now) }),
            }))}
            ariaLabel={DASHBOARD_ADMIN.period}
            sheetTitle={DASHBOARD_ADMIN.period}
            closeLabel={DASHBOARD_ADMIN.close}
            chipDataAttr="data-overview-revenue-period-chip"
          />
        </div>
        <div className="border-t border-hairline px-[var(--space-4)] py-[var(--space-4)]">
          {revenueCents === null ? (
            <DashboardHomeEmpty>{OVERVIEW_PAGE.revenueEmpty}</DashboardHomeEmpty>
          ) : (
            <p data-overview-revenue-value="" className="t-display t-data text-ink">
              {formatUsdCents(revenueCents)}
            </p>
          )}
        </div>
        {weekPulse.length > 0 ? (
          <ul data-overview-pulse="" className={DASHBOARD_ROW_LIST_CLASS}>
            {weekPulse.map((row) => (
              <li key={row.key} data-overview-week-row={row.key} className={DASHBOARD_ROW_CLASS}>
                <span className="t-body-sm text-ink">{row.label}</span>
                <span className="t-data t-body-sm text-ink-2">{row.count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </DashboardHomePanel>
      </div>

      <div className={OVERVIEW_AREA_SOCIAL_CLASS}>
      <OverviewModule
        testId="social"
        title={OVERVIEW_PAGE.social}
        href={OVERVIEW_PAGE.socialHref}
        empty={OVERVIEW_PAGE.socialEmpty}
      >
        {socialChats.length > 0 ? (
          <div className={`flex flex-col ${OVERVIEW_MODULE_NEST_CLASS}`}>
            <p data-overview-social-unread="" className="t-body-sm text-ink-2">
              {socialUnread} {OVERVIEW_PAGE.socialUnread}
            </p>
            <div data-overview-social-faces="" className="flex items-center gap-[var(--space-2)]">
              {socialChats.map((chat) => {
                const peerId = chat.peerIds[0];
                const photo = peerId ? socialFaces.get(peerId) : null;
                return (
                  <Link
                    key={chat.conversationId}
                    href={socialDmHref(chat.conversationId)}
                    data-overview-social-face={chat.conversationId}
                    className={`${SOCIAL_AVATAR_32_CLASS} relative`}
                  >
                    {photo ? (
                      <SocialMediaImage src={photo} sizes={SOCIAL_OVERVIEW_FACE_IMAGE_SIZES} />
                    ) : (
                      socialInitials(chat.label)
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </OverviewModule>
      </div>

      <div className={OVERVIEW_AREA_EDUCATION_CLASS}>
      <OverviewModule
        testId="education"
        title={OVERVIEW_PAGE.education}
        href={OVERVIEW_PAGE.educationHref}
        empty={OVERVIEW_PAGE.educationEmpty}
      >
        {courses.length > 0 ? (
          <ul
            data-overview-education-covers=""
            className={OVERVIEW_EDUCATION_COVERS_CLASS}
          >
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                coverUrl={courseCovers?.get(course.id)}
                density="home"
                progressPercent={courseProgress?.get(course.id)}
              />
            ))}
          </ul>
        ) : null}
      </OverviewModule>
      </div>

      <div className={OVERVIEW_AREA_NEEDS_CLASS}>
      <OverviewModule
        testId="needs-you"
        title={OVERVIEW_PAGE.needsYou}
        href={OVERVIEW_PAGE.needsYouHref}
        empty={OVERVIEW_PAGE.needsYouEmpty}
      >
        {needsYou.length > 0 ? (
          <ul className={DASHBOARD_ROW_LIST_CLASS}>
            {needsYou.map((row) => (
              <li key={row.id} className={DASHBOARD_ROW_CLASS}>
                <Link href={row.href} className="t-body-sm font-medium text-ink">
                  {row.what}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </OverviewModule>
      </div>

      <div className={OVERVIEW_AREA_AI_CLASS}>
      <OverviewModule
        testId="ai-next"
        title={OVERVIEW_PAGE.aiNext}
        href={OVERVIEW_PAGE.aiNextHref}
        cta={OVERVIEW_PAGE.aiAsk}
        empty={OVERVIEW_PAGE.aiNextEmpty}
      >
        {aiNext.length > 0 ? (
          <ul className={DASHBOARD_ROW_LIST_CLASS}>
            {aiNext.map((row) => (
              <li key={row.id} data-overview-ai-next={row.id} className={DASHBOARD_ROW_CLASS}>
                <Link
                  href={`${TITLES_HREF}/${row.id}`}
                  className="min-w-0 truncate t-body-sm font-medium text-ink"
                >
                  {row.title}
                </Link>
                {row.reason ? <span className="t-body-sm text-ink-3">{row.reason}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </OverviewModule>
      </div>

      <aside data-overview-news="" className={OVERVIEW_AREA_NEWS_CLASS}>
        <NewsRail items={news} now={now} viewAll />
      </aside>
      </div>
    </div>
  );
}

/** Same grid as live Home so streamed modules do not reflow the chrome. */
export function HomeOverviewSkeleton() {
  return (
    <div data-overview-frame="" className={OVERVIEW_HOME_FRAME_CLASS}>
    <div data-overview-layout="" data-overview-skeleton="" className={OVERVIEW_HOME_LAYOUT_CLASS}>
      <div className={OVERVIEW_AREA_REVENUE_CLASS}>
        <Skeleton className="h-40 w-full" />
      </div>
      <div className={OVERVIEW_AREA_SOCIAL_CLASS}>
        <Skeleton className="h-24 w-full" />
      </div>
      <div className={OVERVIEW_AREA_EDUCATION_CLASS}>
        <Skeleton className="h-24 w-full" />
      </div>
      <div className={OVERVIEW_AREA_NEEDS_CLASS}>
        <Skeleton className="h-24 w-full" />
      </div>
      <div className={OVERVIEW_AREA_AI_CLASS}>
        <Skeleton className="h-24 w-full" />
      </div>
      <aside className={OVERVIEW_AREA_NEWS_CLASS}>
        <Skeleton className="h-64 w-full" />
      </aside>
    </div>
    </div>
  );
}
