# [GC][24Frame] LOCK — Create video quality default v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** · Adam CLEAR via CoS 2026-09-28 · Design no PR · PR **#698** stays **DRAFT**  
**Repo:** `docs/design-locks/social-create-video-quality-default-lock-v1.md`  
**Keeps:** [`social-video-upload-cover-lift-lock-v1.md`](social-video-upload-cover-lift-lock-v1.md) · [`social-video-mux-only-lock-v1.md`](social-video-mux-only-lock-v1.md)  
**Scope:** Encode default for a Social video post. No quality control. Playback stays Mux-only.

---

## One lock

No quality checkbox. Do not ask. The cap is original, up to 4K (2160). Client `source_width` and `source_height` are not a measurement, so the tier stays 1080p until a server probe or Mux-reported input proves a taller source. Go live stays plus / 1080p.
