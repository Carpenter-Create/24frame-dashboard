# [GC][24Frame] LOCK — Stories home rail · mint on visible v1

**Date:** 2026-09-29
**Status:** LOCKED (efficiency wave item 2 — Home Stories rail JWT / signed-URL storm)
**Repo citation:** `docs/design-locks/stories-home-rail-mint-on-visible-lock-v1.md`
**Keeps:** unsigned Mux poster hold in `SocialStoryMuxThumb` · `loading="eager"` once a still is allowed to paint (`social-story-rail-cover.tsx`, iOS overflow-x) · home tall card geometry in `stories-home-rail-fb-card-lock-v1.md` and `stories-home-rail-card-identity-lock-v1.md`

---

## One lock

Social Home must not mint a Mux playback JWT, or request a story-still media signed URL, for every rail card on load.

A card mints when it intersects the viewport, plus one card of horizontal lookahead (`0px 160px 0px 160px`). The viewer still mints when a story opens. Cards that are not intersecting stay on the muted face.

## Concrete

| Thumb | On mount, off screen | When intersecting |
|-------|----------------------|-------------------|
| Signed Mux | Pending span. No `/api/social/mux-playback`. No `image.mux.com` src | Thumbnail JWT, then the still. `loading="eager"` |
| Story still (media proxy) | Held. No `/api/social/media` src | Same proxy URL. `loading="eager"`. Not `loading="lazy"` |
| Public Mux | Unchanged. No JWT | Unchanged |
| Raw video, no playback id | Closed face. No file URL | Closed face |

No schema. No new copy. No card geometry change.

## Out

Native `loading="lazy"` on this overflow rail. Server mint of the full ring. A second thumb component.
