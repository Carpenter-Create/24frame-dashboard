# [GC][24Frame] LOCK — Paused feed Mux cover-lift v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** · Adam CLEAR via CoS 2026-09-28 · Design no PR · PR **#698** stays **DRAFT**  
**Repo:** `docs/design-locks/social-feed-paused-mux-cover-lift-lock-v1.md`  
**Keeps:** [`social-video-mux-only-lock-v1.md`](social-video-mux-only-lock-v1.md) · [`social-video-upload-cover-lift-lock-v1.md`](social-video-upload-cover-lift-lock-v1.md)  
**Scope:** Paused Home feed and immersive Mux mount. Lift timing only. Does not reopen scale, carousel, or a second player.

---

## One lock

A paused Home or immersive Mux face does not keep a first-frame still over the player while waiting on `loadeddata`. iOS does not emit that event until play, so the still would stay. The player mounts without that cover. Stories, Explore, and the DM story card stay chromeless or autoplay and keep the still until the first frame.
