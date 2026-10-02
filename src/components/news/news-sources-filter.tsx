"use client";

import { HouseLink } from "@/components/chrome/house-link";
import type { MouseEvent } from "react";

import { SegmentedTrack } from "@/components/ui/segmented-track";
import { cn } from "@/lib/cn";
import {
  DASHBOARD_NEWS_SOURCE_CHIPS_CLASS,
  DASHBOARD_NEWS_SOURCE_TRACK_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_TOP_PILL_THUMB_CLASS,
} from "@/lib/dashboard-craft";
import {
  NEWS_PAGE,
  NEWS_SOURCE_ALL,
  NEWS_SOURCE_FILTER_SOURCES,
  newsHistoryHref,
  newsSourceFilterIndex,
  selectNewsSourceFilter,
  type NewsSourceId,
} from "@/lib/news";
import { SEGMENTED_TRACK_PERSIST, segmentedItemOn } from "@/lib/segmented-track";

// Sources lens for /home/news. House SegmentedTrack under the H1:
// All first, then one segment per allowlisted outlet (A-Z). Exclusive
// single-select: All, or one outlet. Selected ink follows visualIndex
// (accent thumb + white label). The host scrolls; the track uses the
// house scroll-row token so the muted pill covers every outlet.
// Never a checkbox rail, gapped chip-fill, or a second bottom float.

export function NewsSourceChips({
  selected,
  onSelect,
}: {
  selected: readonly NewsSourceId[];
  onSelect: (next: NewsSourceId[]) => void;
}) {
  const options = [
    { id: NEWS_SOURCE_ALL, label: NEWS_PAGE.sourcesAll },
    ...NEWS_SOURCE_FILTER_SOURCES.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  ] as const;

  return (
    <div
      role="group"
      aria-label={NEWS_PAGE.sources}
      data-news-source-chips=""
      className={DASHBOARD_NEWS_SOURCE_CHIPS_CLASS}
    >
      <SegmentedTrack
        activeIndex={newsSourceFilterIndex(selected)}
        persistKey={SEGMENTED_TRACK_PERSIST.newsSource}
        trackClass={DASHBOARD_NEWS_SOURCE_TRACK_CLASS}
        thumbClass={DASHBOARD_TOP_PILL_THUMB_CLASS}
        data-news-source-track=""
      >
        {({ selectedIndex }) =>
          options.map((option, index) => {
            const on = segmentedItemOn(index, selectedIndex);
            const next = selectNewsSourceFilter(option.id);
            return (
              <HouseLink
                key={option.id}
                href={newsHistoryHref(next)}
                scroll={false}
                data-segmented-item=""
                data-news-source-option={option.id}
                aria-pressed={on}
                className={cn(
                  DASHBOARD_TOP_PILL_BUTTON_CLASS,
                  on
                    ? DASHBOARD_TOP_PILL_BUTTON_ON_CLASS
                    : DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
                )}
                onClick={(event) => onSourceClick(event, () => onSelect(next))}
              >
                {option.label}
              </HouseLink>
            );
          })
        }
      </SegmentedTrack>
    </div>
  );
}

function onSourceClick(event: MouseEvent<HTMLAnchorElement>, onPick: () => void) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  onPick();
}
