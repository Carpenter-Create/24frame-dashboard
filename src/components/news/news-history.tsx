"use client";

import { useState, type ReactNode } from "react";

import { NewsRail } from "@/components/news/news-rail";
import { NewsSourceChips } from "@/components/news/news-sources-filter";
import { NewsStickyHeader } from "@/components/news/news-sticky-header";
import {
  DASHBOARD_NEWS_HISTORY_COLUMN_CLASS,
  DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS,
  DASHBOARD_SECTION_AIR_CLASS,
} from "@/lib/dashboard-craft";
import {
  canonicalizeNewsSourceFilter,
  filterNewsBySources,
  newsHistoryEmptyCopy,
  newsHistoryHref,
  type NewsItem,
  type NewsSourceId,
} from "@/lib/news";

// /home/news body: house source SegmentedTrack under the page H1,
// then a full-width list. Filter is client-side over the loaded
// 90-day window; URL ?source= stays the share/refresh contract.
//
// Title + subtitle + source track pin as one NewsStickyHeader block
// while the feed scrolls. Do not leave a second non-sticky PageHeader
// on the page. Heading is passed in so back / H1 / filter share the pin.
//
// The page wash is full canvas (chrome continuation). Title + filter
// and the feed share DASHBOARD_NEWS_HISTORY_COLUMN_CLASS so the pin
// does not become a floating 840 card.

export function NewsHistory({
  items,
  now,
  selected: initialSelected,
  heading,
  notice,
  truncated = false,
}: {
  items: readonly NewsItem[];
  now: Date | string;
  selected: readonly NewsSourceId[];
  heading?: ReactNode;
  notice?: ReactNode;
  truncated?: boolean;
}) {
  const [selected, setSelected] = useState<NewsSourceId[]>(() =>
    canonicalizeNewsSourceFilter(initialSelected),
  );
  const at = now instanceof Date ? now : new Date(now);
  const visible = filterNewsBySources(items, selected);

  function onSelect(next: NewsSourceId[]) {
    setSelected(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", newsHistoryHref(next));
    }
  }

  return (
    <div data-news-history-layout="" className={DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS}>
      <NewsStickyHeader surface="page">
        <div
          data-news-history-lead=""
          className={`flex flex-col ${DASHBOARD_SECTION_AIR_CLASS} ${DASHBOARD_NEWS_HISTORY_COLUMN_CLASS}`}
        >
          {heading}
          <NewsSourceChips selected={selected} onSelect={onSelect} />
        </div>
      </NewsStickyHeader>
      <div className={DASHBOARD_NEWS_HISTORY_COLUMN_CLASS}>
        {notice}
        <NewsRail
          items={visible}
          now={at}
          history
          empty={newsHistoryEmptyCopy(items, visible, truncated)}
        />
      </div>
    </div>
  );
}
