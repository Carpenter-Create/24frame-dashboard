import { redirect } from "next/navigation";

import { InlineNotice } from "@/components/ui/inline-notice";
import { PageHeader } from "@/components/ui/page-header";
import { NewsHistory } from "@/components/news/news-history";
import { NEWS_PAGE, NEWS_SOURCE_PARAM, newsHistoryBackLink, parseNewsSourceFilter } from "@/lib/news";
import { loadNewsHistory } from "@/lib/news-load";
import { getOrgContext } from "@/lib/supabase/context";

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const now = new Date();
  const loaded = await loadNewsHistory(now);
  const sp = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const selected = parseNewsSourceFilter(sp[NEWS_SOURCE_PARAM]);

  return (
    <div data-news-history="">
      <NewsHistory
        heading={
          <PageHeader
            title={NEWS_PAGE.title}
            subtitle={NEWS_PAGE.subtitle}
            backLink={newsHistoryBackLink()}
            className="pb-0"
          />
        }
        notice={
          loaded.truncated ? (
            <InlineNotice tone="info" className="mb-4" data-my-list-truncated="news">
              {NEWS_PAGE.truncated}
            </InlineNotice>
          ) : null
        }
        truncated={loaded.truncated}
        items={loaded.failed ? [] : loaded.rows}
        now={now}
        selected={selected}
      />
    </div>
  );
}
