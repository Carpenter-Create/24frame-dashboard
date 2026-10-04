# [GC][24Frame] LOCK — Home Following Mux active gate v1

**Date:** 2026-09-29 (CT)  
**Status:** **LOCKED** — ops / performance gate. No visual invent.  
**Amended (Adam 2026-10-04, Reels rail):** the Feed's Reels rail tiles are stills (Mux thumbnails, minted when the rail nears the viewport); they never join the band order and never mount a player. One player at a time still holds. See [`social-feed-reel-rail-lock-v1.md`](social-feed-reel-rail-lock-v1.md).  
**Entity:** Global Content / 24Frame only  
**SoT:** `src/lib/social-following-mux-active.ts`  
**Host:** `SocialOptimisticFeed` → `SocialPostCard` `muxBandId` → `social-feed-video.tsx` / `social-feed-carousel.tsx`  
**Warm:** `SocialFollowingMuxWarm` in `src/components/social/social-following-mux-band.tsx`  
**Player:** `src/components/social/social-mux-player.tsx` (mounts only when rendered)

## One lock

Social Home **Following** mounts Mux for the video post that is at least 60% on screen (`SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO`). The next video warms one signed JWT and does not mount the player. Every other video stays closed: no Mux JS, no metadata preload, and no signed token mint.

The first page may contain many video posts (`SOCIAL_FOLLOWING_WALL_LIMIT` stays 50). `IntersectionObserver` uses thresholds `0`, `0.6`, `0.75`, and `1` against the viewport. Until a video crosses the line, the wall stays closed: no Mux player, no metadata preload.

A still is not the player. When any part of a Home video frame meets the viewport, including above the fold and under 60%, the card may mint one thumbnail JWT and paint that still. It does not wait for a scroll. Videos that have not met the viewport do not mint. Missing width or height still paints that still; it does not become an empty box or a 16:9 guess.

A carousel on that post mounts the visible Mux slide and warms the next Mux slide.

`SocialOptimisticFeed` passes `muxBandId` through `SocialPostCard`. Group feeds that share that list use the same band. Profile, activity, single-post, immersive, and DM playback omit `muxBandId` and still mount when they render.

Autoplay and mute on the mounted feed player stay the defaults already on main. This gate does not change them.

Explore For You keeps its own warm window (`EXPLORE_FOR_YOU_MUX_WARM_AHEAD` in `src/lib/social-explore-mux-warm.ts`).

If `IntersectionObserver` is missing, the first video mounts and the next warms.

## Out

Schema change. Server mint of the whole wall. Eager mint of every signed video on the first page. Staying armed after the post leaves the screen. A second player. Changing Explore mute or autoplay. Changing the session playback-token cache, feed batching, TanStack Following `initialData`, or the author-card module.

## Rollback

Revert the PR that seeded this lock. No migration.
