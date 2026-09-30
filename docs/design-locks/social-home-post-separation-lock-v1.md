# [GC][24Frame] LOCK — Social Home post separation v1

**Date:** 2026-09-29 (CT) · interior air and in-feed video aspect 2026-09-30 (CT) · desktop Home column 2026-09-30 (CT)
**Status:** **LOCKED** · CoS / Adam · **Option A** supersedes the #715 2px rule
**Entity:** Global Content / 24Frame only
**Amends:**
- The #715 `border-y-2 border-hairline` rule on `SOCIAL_FEED_ROW_CLASS`
- [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) — inter-post hairline
- [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md) — hairline
- Feed-post viewport bleed in [`social-mobile-full-bleed-lock-v1.md`](social-mobile-full-bleed-lock-v1.md). Stories rail bleed stays
**Unchanged:** under-post time stays on its own line below the caption and below the comment trail. Not beside the author name. Stories→feed seam stays [`social-home-stories-feed-hairline-lock-v1.md`](social-home-stories-feed-hairline-lock-v1.md). Text-only author→actions gap stays `mt-[var(--space-2)]`. Mobile Lock A floating dock stays. Dock, header, slider, waffle, and Explore stay. Stories, the composer, and autoplay policy stay.

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

`SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS` = `pb-[var(--space-6)]` is padding under that line, inside the card. It is not the separator. The separator is the card plus the gutter gap. The previous interior bottom was `pb-[var(--space-4)]`.

## Interior air

The card was flush at the top and tight under the media. Air uses house spacing tokens only. No new scale, hex, or radius. Media stays full width of the card (`px-0`). Chrome is inset.

| Gap | Token |
|-----|--------|
| Card edge → author | `SOCIAL_FEED_AUTHOR_EDGE_CLASS` = `px-[var(--space-4)] pt-[var(--space-4)]` |
| Card edge → actions, likes, caption, time | `SOCIAL_FEED_META_EDGE_CLASS` = `px-[var(--space-4)]` |
| Author → media | `mt-[var(--space-4)]` on `SOCIAL_POST_MEDIA_CLASS`. Was `--space-2` |
| Media → actions | `SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS` = `mt-[var(--space-4)]`. Was `mt-[10px]` |
| Actions → likes / caption / time | `SOCIAL_FEED_META_ROW_GAP_CLASS` = `gap-[var(--space-4)]`. Was `gap-[6px]`. Time stays on its own line |
| Time → card bottom | `pb-[var(--space-6)]` on the row. Was `pb-[var(--space-4)]` |

Phone and desktop share these classes. No `md:` fork. Home, Profile Activity, and author history share `SocialPostCard`, so they share this air.

## In-feed video aspect

A portrait video is vertical inside the surface card before the viewer opens it. The box is the media's real width and height (`socialFeedVideoFrame`). Not a filename. Not `kind`. Not a bare orientation label. Missing edges do not become a 16:9 guess.

| Case | Frame |
|------|--------|
| `height > width` | Portrait. `aspect-ratio` is `width / height`. Not `aspect-video`. Not a 4:5 crop of a taller video |
| `width > height` | Landscape. Same ratio. Not stretched into the portrait box |
| `width === height` | Square. That ratio |
| Cap | `min(70vh, 560px)` still applies. When it binds, the width narrows (`min(100%, calc(cap * width / height))`) so the ratio stays. The picture is not cover-cropped into a landscape slot and not stretched. The still is in flow (`height: auto` on that ratio), not an absolute layer in an empty box |
| Missing width or height | The picture still paints. Not a 16:9 guess and not an empty reserved box. The still is in flow, `object-contain`, capped at `min(70vh, 560px)`, until real edges exist |
| Still | A public thumb paints in the card immediately (`loading="eager"`). A signed thumb paints when any part of the frame meets the viewport, including above the fold. It does not wait for the 60% Mux player mount |
| Phone and non-Home desktop | The same function. No host that paints a portrait video as landscape |
| Desktop Home | The function stays. At `lg`, `[data-social-home]` fills the frame to the column width and drops the cap's width narrowing. Aspect stays width/height. Portrait video is not cropped into 4:5. It is not a narrow strip in a wider grey card. Landscape stays the full card width |

Stills stay `socialMediaFrameClass` (4:5 / 16:9). N≥2 stays the shared carousel stage. Explore stays the portrait stage that already shipped.

## Desktop Home column

Phone is unchanged. Profile, Messages, and Create stay on the shared 720 center and the 1052 end-aligned pair.

| Token | Lock |
|-------|------|
| Row | `SOCIAL_DESKTOP_HOME_ROW_CLASS`. Start-aligned. `lg:max-w-[802px]`. Not `lg:ml-auto` |
| Feed | `SOCIAL_DESKTOP_HOME_FEED_CLASS`. `lg:max-w-[470px]`. Below `lg`, the same full-width column as the shared center |
| Rail | Existing `SocialForYouRail` (people already loaded, latest course). Sticky at `lg` inside `[data-social-home]`. No invented accounts, Follow control, or recommendation API |
| Nav | Lock A stays: Home, Explore, Create, Messages, Profile. Floating dock and Soft-nav pills stay. Not an icon rail |
| Cards | Option A stays. `HOUSE_MODULE_CLASS` on every post. Grey surface, white page, landscape media full width of the card |
| Stills | Portrait stills stay `object-cover` inside the capped box. No left/right letterbox |
| Stories | Restyle only a row that already exists. Do not add one |
| Lens | One filled pill on desktop Home. Phone still fills lane and topic together. See the density sequel |

The shell header gutters stay 32 / 32. This Home row does not claim the avatar trailing plane. Profile and Messages still do.

## Out

Grey page wash. White cards on a grey canvas. The 2px top and bottom rule. A second rule on the card. Shadow. A Home-only card fork for color or radius. An `md:` fork for color, radius, or the shared in-feed video function. Moving the time beside the author. A gutter gap larger than `--space-6`. A portrait video in a landscape frame. A cover-crop of a portrait video into 16:9 or 4:5. A portrait video narrowed inside a wider grey card on desktop Home. Stretching a video. Choosing the frame from a filename or from `kind`. Dock, header, slider, waffle, or Explore changes. A second filled lens on desktop Home. An invented Suggested-for-you list.
