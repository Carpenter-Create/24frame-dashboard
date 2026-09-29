# [GC][24Frame] LOCK — Social Home post separation v1

**Date:** 2026-09-29 (CT)
**Status:** **LOCKED** · CoS / Adam
**Entity:** Global Content / 24Frame only
**Amends (these two points only):**
- [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) — inter-post hairline DELETE, and ~8–12 next-author air
- [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md) — hairline OUT, and ~8–12 air
**Unchanged:** under-post time stays on its own line below the caption and below the comment trail. Not beside the author name. Stories→feed seam stays [`social-home-stories-feed-hairline-lock-v1.md`](social-home-stories-feed-hairline-lock-v1.md). Text-only grammar stays frozen.

## One lock

Between feed posts: **~16–24 CSS px** from the under-post time baseline to the next author, and a **2px** house rule on the top and the bottom of each post. Not a 1px hairline. Not a gray fill band.

Home, Profile Activity, and author history share `SocialPostCard` and `SOCIAL_FEED_ROW_CLASS`. Same separation everywhere that row class applies.

## Air

| Token | Lock |
|-------|------|
| Class | `SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS` = `pb-[var(--space-4)]` on `SOCIAL_FEED_ROW_CLASS` |
| Measured | `--space-4` is 16. Time stays `block` + `leading-none`. ~2px of the em stays below the baseline, so baseline → next author is **~18 CSS px**, inside 16–24 |
| Why not `--space-6` | 24 of padding plus ~2px measures **~26**, outside the band. The earlier `--space-6` row also opened ~32 CSS px while the time link still inherited line-height 1.6. That stacking stays out |
| Scope | Phone and desktop share it. No `md:` fork |

## Hairline

| Token | Lock |
|-------|------|
| Rule | `border-y-2 border-hairline` on `SOCIAL_FEED_ROW_CLASS`. Top and bottom |
| Superseded | The 1px bottom-only rule (`border-b border-hairline`) is superseded |
| Weight | **2px**. Not 1px. Not a heavy bar |
| Color | House `border-hairline` (`--border`, light `#ECEDF0`). Same token as other Social hairlines. No new hex |
| Contact | No margin between rows. The gutter has no gap, so the bottom rule of post N touches the top rule of post N+1. No white gap between those rules. No padding outside the rules |
| Phone | Full-bleed. The row already carries `SOCIAL_MOBILE_BLEED_CLASS`. The rules meet the viewport. Content stays inset by `SOCIAL_MOBILE_BLEED_PAD_CLASS` |
| Desktop | Same class. No `md:` fork. The row is the column width, so the rules span the column |
| Gutter | `SOCIAL_FEED_GUTTER_CLASS` stays `flex flex-col`. No `divide-y`. A gutter divide would sit inside the column and would double the row rules |
| Fill | Row stays `bg-surface`. The air is padding inside the rules, so the canvas cannot show as a band. No `bg-surface-muted` fill |

## Under-post time

Stays the last chrome line inside the post. Format, color, and `SOCIAL_POST_TIME_CLASS` stay [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md).

## Out

Author-row time. Gray FB band fill. Text-only grammar rewrite. Stories→feed seam change. A second card shell. `md:` air fork. `md:` rule fork. `--space-6` row air. The 1px bottom-only `border-b` rule. Padding or margin outside the rules.
