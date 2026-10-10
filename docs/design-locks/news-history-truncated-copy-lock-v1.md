# [GC][24Frame] LOCK: News History truncated notice v1

**Date:** 2026-10-09 (CT)
**Status:** LOCKED · Design Own→READY · Design opens no PR · CoS seeds docs/design-locks · Dev applies on #808
**Repo citation:** `docs/design-locks/news-history-truncated-copy-lock-v1.md`

| Key | Lock |
|-----|------|
| `NEWS_PAGE.truncated` (`src/lib/news.ts`) | **Some headlines aren't shown here.** |

- No count, because the page cap can land on 0, 15 or 300 rows. No em dash. Straight apostrophe.
- When the list is truncated, hide the empty state "No headlines from the last 90 days." completely, even at 0 rows. Show only the notice, in its existing host and style.
- When the list is not truncated, the behavior is unchanged: the empty state shows only when there truly are none.
- Out of scope: the cap value, a "load more" control or any new UI.
