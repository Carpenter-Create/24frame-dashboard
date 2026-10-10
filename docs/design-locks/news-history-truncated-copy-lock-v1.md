# [GC][24Frame] LOCK: News History truncated notice v1.1

**Date:** 2026-10-09 (CT) · **v1.1:** 2026-10-09 (CT), source-filter empty state (Codex N-5)
**Status:** LOCKED · Design Own→READY · Design opens no PR · CoS seeds docs/design-locks · Dev applies on #808
**Repo citation:** `docs/design-locks/news-history-truncated-copy-lock-v1.md`

| Key | Lock |
|-----|------|
| `NEWS_PAGE.truncated` (`src/lib/news.ts`) | **Some headlines aren't shown here.** |

- No count, because the page cap can land on 0, 15 or 300 rows. No em dash. Straight apostrophe.
- When the list is truncated, hide the empty state "No headlines from the last 90 days." completely, even at 0 rows. Show only the notice, in its existing host and style.
- When the list is not truncated, the behavior is unchanged: the empty state shows only when there truly are none.
- **v1.1 rule:** when the list is truncated, no empty state shows. This covers "No headlines from the last 90 days." and the source-filter "No headlines from the selected sources." (`news.ts` ~323), and any future filtered empty line. A capped read can't prove a source has none. Only "Some headlines aren't shown here." shows, in its existing host. There's no new wording, and the filter controls stay as they are.
- Uncapped: both empty states behave exactly as today.
- Out of scope: the cap value, a "load more" control or any new UI.
