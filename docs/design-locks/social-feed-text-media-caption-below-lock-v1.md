# [GC][24Frame] LOCK — Social feed text+media caption below v1

**Date:** 2026-09-28 (CT)
**Status:** **LOCKED** · Adam CLEAR via CoS 2026-09-28 caption-below
**Superseded in part (founder 2026-10-05, H · Posts):** the order is media → credit row (avatar, name, time; the round actions on desktop) → caption (phone: the actions under the caption). The likes line and the comment trail are counts beside the round Like and Comment. The caption stays below the media. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) §7.  
**Repo:** `docs/design-locks/social-feed-text-media-caption-below-lock-v1.md`
**Supersedes:** [`social-feed-text-media-caption-above-lock-v1.md`](social-feed-text-media-caption-above-lock-v1.md) (#685 caption-above-media)
**Media face:** stays [`social-feed-photo-scale-immersive-lock-v1.md`](social-feed-photo-scale-immersive-lock-v1.md). Do not reopen.

## One lock

A feed post with **both** text and media renders:

1. author row
2. media
3. actions
4. likes
5. caption
6. comments when N > 0

Caption is the existing text stack only, under likes and above the comment trail. This tip does not change caption type, gaps, or the media face.

## Media face (not this tip)

Stays `social-feed-photo-scale-immersive-lock-v1.md`: full-bleed width, max height `min(70vh, 560)`, tap immersive. Do not reopen those tokens here.

Carousel / multi-media face is unchanged. Caption on that face follows the same below order.

## Unchanged

| Post | Order |
|------|--------|
| Text only | author, actions, likes, caption, comments when N > 0 |
| Media only | author, media, actions, likes |
| Stories | Instagram, media-first. Out. |

## Out

Stories. Write compose. DM compose. Share sheet. Photo scale and tap immersive (photo-scale lock). Multi-media carousel vs collage (separate lock). New spacing, type, or IA beyond this reorder.
