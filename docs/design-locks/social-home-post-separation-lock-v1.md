# [GC][24Frame] LOCK — Social Home post separation v1

**Date:** 2026-09-29 (CT)
**Status:** **LOCKED** · CoS / Adam · **Option A** supersedes the #715 2px rule
**Entity:** Global Content / 24Frame only
**Amends:**
- The #715 `border-y-2 border-hairline` rule on `SOCIAL_FEED_ROW_CLASS`
- [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) — inter-post hairline
- [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md) — hairline
- Feed-post viewport bleed in [`social-mobile-full-bleed-lock-v1.md`](social-mobile-full-bleed-lock-v1.md). Stories rail bleed stays
**Unchanged:** under-post time stays on its own line below the caption and below the comment trail. Not beside the author name. Stories→feed seam stays [`social-home-stories-feed-hairline-lock-v1.md`](social-home-stories-feed-hairline-lock-v1.md). Text-only grammar stays frozen. Mobile Lock A floating dock stays. Dock, header, slider, waffle, and Explore stay.

## One lock

Each feed post is a light-grey rounded surface card on the white page canvas. That is the Aggregation module look. Facebook is a grey page with white cards. This is the inverse. Do not paint the page grey.

Home, Profile Activity, and author history share `SocialPostCard` and `SOCIAL_FEED_ROW_CLASS`. The card applies wherever that row class applies. No Home-only fork. Phone and desktop share the card. No `md:` fork for color or radius.

## Card

| Token | Lock |
|-------|------|
| Class | `HOUSE_MODULE_CLASS` on `SOCIAL_FEED_ROW_CLASS` |
| Fill | `bg-surface-muted` |
| Radius | `rounded-[var(--radius-lg)]`. No new radius |
| Shadow | `shadow-none` |
| Clip | `overflow-hidden` on the card, so a full-bleed image does not square off the corners |
| Sides | The card does not bleed to the phone viewport. `SOCIAL_MOBILE_BLEED_CLASS` is not on the row or on feed media. White canvas shows at the sides. The frame gutter is that canvas |
| Rule | `border-y-2 border-hairline` is **removed**. The 2px rule double-stacked with the card edge. No second rule on the card |

## Gap

| Token | Lock |
|-------|------|
| Class | `HOUSE_SECTION_AIR_CLASS` (`gap-[var(--space-6)]`) on `SOCIAL_FEED_GUTTER_CLASS` |
| Fill | No grey fill in the gap. The gap shows the white page canvas (`bg-surface` / page `--bg`). No `bg-surface-muted` on the gutter |
| Size | That gap. No larger gap |
| Gutter | `flex flex-col` plus the section gap. No `divide-y` |

## Under-post time

Stays the last chrome line inside the post, on its own line. Not beside the author. Format, color, and `SOCIAL_POST_TIME_CLASS` stay [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md).

`SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS` = `pb-[var(--space-4)]` stays padding under that line, inside the card. It is not the separator. The separator is the card plus the gutter gap.

## Out

Grey page wash. White cards on a grey canvas. The 2px top and bottom rule. A second rule on the card. Shadow. A Home-only card fork. An `md:` fork for color or radius. Moving the time beside the author. A gap larger than `--space-6`. Dock, header, slider, waffle, or Explore changes.
