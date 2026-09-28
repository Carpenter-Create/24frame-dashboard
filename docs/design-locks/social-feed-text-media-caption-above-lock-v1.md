# [GC][24Frame] LOCK — Social feed text+media caption above v1

**Date:** 2026-09-25 (CT)
**Status:** **SUPERSEDED** by [`social-feed-text-media-caption-below-lock-v1.md`](social-feed-text-media-caption-below-lock-v1.md) (Adam CLEAR via CoS 2026-09-28 caption-below). Historical record of the #685 caption-above-media order. Do not implement caption-above.
**Repo:** `docs/design-locks/social-feed-text-media-caption-above-lock-v1.md`
**Amends:** `docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md` §A caption stack pointed here while this lock was current. Media face stayed that lock. Caption stack now points at the caption-below lock.

## One lock

A feed post with **both** text and media renders:

1. author row
2. caption (text body)
3. media
4. actions
5. likes

Comments, when N > 0, stay after likes.

Caption is the existing text stack only, above the media. This tip does not change caption type, gaps, or the media face.

## Media face (not this tip)

Stays `social-feed-photo-scale-immersive-lock-v1.md`: full-bleed width, max height `min(70vh, 560)`, tap immersive. Do not reopen those tokens here.

## Unchanged

| Post | Order |
|------|--------|
| Text only | Existing blend: author, actions, likes, caption |
| Media only | author, media, actions, likes |
| Stories | Instagram, media-first. Out. |

## Out

Stories. Write compose. DM compose. Share sheet. Photo scale and tap immersive (photo-scale lock). Multi-media carousel vs collage (separate lock). New spacing or IA beyond this reorder.
