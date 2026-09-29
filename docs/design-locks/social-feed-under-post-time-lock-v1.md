# [GC][24Frame] LOCK — Social feed under-post time v1

**Date:** 2026-09-29 (CT)
**Status:** **LOCKED** · CoS / Adam
**Entity:** Global Content / 24Frame only
**Cite:** [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) · [`social-feed-text-media-caption-below-lock-v1.md`](social-feed-text-media-caption-below-lock-v1.md)
**Amended (air + hairline only):** [`social-home-post-separation-lock-v1.md`](social-home-post-separation-lock-v1.md)

## One lock

The feed post separator is an **under-post relative time** on its own line. It sits **below the caption** (and below the comment trail when that line is present) as the **last chrome line** inside the post. The gap into the next author, and the post→post hairline, are the post-separation lock.

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

## Air and hairline

Those two points moved. Cite [`social-home-post-separation-lock-v1.md`](social-home-post-separation-lock-v1.md).

`SOCIAL_POST_TIME_CLASS` stays `block` + `leading-none`. The permalink link must not inherit body line-height 1.6 — that strut put ~8px under the glyphs.

The 2026-09-29 reading (`pb-[var(--space-2)]`, hairline out, measured ~10 from the time baseline) is **amended**. The earlier Wave 1 `pb-[var(--space-6)]` sat under the time and opened **~32 CSS px** (~34 on the prod screenshot, ~102 device px at 3x). That stacking is **out**. Post separation uses `--space-4`, not `--space-6`. No `divide-y` on the gutter.

## Out

Author-row time. Clock times. “ago”. A gray fill band. A second post-card fork. Post→post hairline is **in** — see the post-separation lock.
