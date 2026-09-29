# [GC][24Frame] LOCK — Social feed under-post time v1

**Date:** 2026-09-29 (CT)
**Status:** **LOCKED** · CoS / Adam
**Entity:** Global Content / 24Frame only
**Cite:** [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) · [`social-feed-text-media-caption-below-lock-v1.md`](social-feed-text-media-caption-below-lock-v1.md)

## One lock

The feed post separator is an **under-post relative time** on its own line. It sits **below the caption** (and below the comment trail when that line is present) as the **last chrome line** inside the post, then Wave 1 **~24 air** into the next author.

It is **not** beside the author name.

Home, Profile Activity, and author history share `SocialPostCard`. Same line everywhere that card renders.

## Format

| Age | Label |
|-----|--------|
| Under a minute | `Just now` |
| Under an hour | `Nm` |
| 1–23 hours | `Nh` |
| 1 day and older | `Nd` |

No clock time. No “ago”. No “Yesterday”. No calendar month/day. `Nd` replaces both.

`socialRelativeTime` stays the non-feed string (activity, DMs, comments, stories, news). Feed cards call `socialFeedRelativeTime`.

## Color

House **tertiary** `text-ink-3` (light `#6B7280`). That is the muted token for the requested ~`#8E8E8E` register. Not primary ink. Not `text-ink-2` (`#3D4450`). No new hex in components.

Type stays xs, normal tracking. Not `t-label`. The line wraps. It does not truncate. Phone and desktop share it.

## Wave 1 air

Hairline stays **out**. No `divide-y`, no post→post border. `SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS` stays `pb-[var(--space-6)]` on `SOCIAL_FEED_ROW_CLASS`. The time is inside that row, so the 24 is the air after the time.

## Out

Author-row time. Clock times. “ago”. Inter-post hairline. A second post-card fork.
