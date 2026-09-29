# [GC][24Frame] LOCK — Stories home rail · mint on visible v1

**Date:** 2026-09-29
**Status:** LOCKED (efficiency wave item 2 — Home Stories rail JWT / signed-URL storm)
**Repo citation:** `docs/design-locks/stories-home-rail-mint-on-visible-lock-v1.md`
**Keeps:** unsigned Mux poster hold in `SocialStoryMuxThumb` · `loading="eager"` once a still is allowed to paint (`social-story-rail-cover.tsx`, iOS overflow-x) · home tall card geometry in `stories-home-rail-fb-card-lock-v1.md` and `stories-home-rail-card-identity-lock-v1.md`

---

## One lock

Social Home must not call `/api/social/mux-playback` for every rail card on load. The ring cap stays `SOCIAL_STORIES_RAIL_LIMIT` (80).

Home paint warms the active card and the next one (`SOCIAL_STORY_RAIL_MUX_WARM_AHEAD` = 2), the same window as Explore. Those two carry a thumbnail JWT and do not fetch again. Every later signed card stays pending until it intersects the viewport, plus one card of horizontal lookahead (`0px 160px 0px 160px`). Story stills withhold `/api/social/media` the same way. The viewer still mints when a story opens.

## Concrete

| Thumb | On mount, off screen | When intersecting |
|-------|----------------------|-------------------|
| Signed Mux, active or next | Server thumbnail JWT. No `/api/social/mux-playback` from the card | Already painted |
| Signed Mux, later | Pending span. No `/api/social/mux-playback`. No `image.mux.com` src | Client thumbnail JWT, then the still. `loading="eager"` |
| Story still (media proxy) | Held. No `/api/social/media` src | Same proxy URL. `loading="eager"`. Not `loading="lazy"` |
| Public Mux | Unchanged. No JWT | Unchanged |
| Raw video, no playback id | Closed face. No file URL | Closed face |

No schema. No new copy. No card geometry change.

## Out

Native `loading="lazy"` on this overflow rail. Server mint of the full ring. A second thumb component.
