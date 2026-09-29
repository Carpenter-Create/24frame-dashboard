# [GC][24Frame] LOCK — Home Following Mux active gate v1

**Date:** 2026-09-29 (CT)  
**Status:** **LOCKED** — ops / performance gate. No visual invent.  
**Entity:** Global Content / 24Frame only  
**SoT:** `src/lib/social-following-mux-active.ts`  
**Host:** `src/components/social/social-following-wall-bound.tsx` (`SocialMuxActiveGate`)  
**Player:** `src/components/social/social-mux-player.tsx`

## One lock

Social Home **Following** video posts do not mint Mux signed playback JWTs, and do not mount Mux playback, until that post is in the viewport or within one viewport above or below (`SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN` = `100% 0px`).

The first page may contain many video posts (`SOCIAL_FOLLOWING_WALL_LIMIT`). Only the active band arms. A post that arms stays armed, so the clip being watched is not torn down when the observer fires again.

Autoplay and mute stay the rules already on main. This gate does not change them.

Explore For You keeps its own warm window (`src/lib/social-explore-mux-warm.ts`). Stories, DMs, group feeds, and profile posts sit outside this provider.

If `IntersectionObserver` is missing, the post arms immediately so playback still works.

## Out

Schema change. Server mint of the whole wall. Eager mint of every signed video on the first page. A second player. Changing Explore mute or autoplay.

## Rollback

Revert the PR that seeded this lock. No migration.
