# [GC][24Frame] LOCK — Social video upload + feed cover-lift v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** · Adam CLEAR (Video P0) · Design Own→READY · Design no PR · CoS routes Dev · tip `17db6be5` / PR **#698** · Codex FREEZE lifted by this cite  
**Repo:** `docs/design-locks/social-video-upload-cover-lift-lock-v1.md`  
**Box:** `/workspace/24frame-agg-ux/social-video-upload-cover-lift-lock-v1.md`  
**Keeps:** `social-video-mux-only-lock-v1.md` (playback Mux-only — do not reopen)  
**Standing:** Immersive Social · Media Immersion Doctrine · launch-great · faster feel · quiet redundant-chrome · spacing **8 / 16 / 24 / 48** · **no** drop shadows  
**Scope:** Social video **pick → create/cover → encode/upload** and **paused feed** first-frame lift. Stories Take/Upload layout locks unchanged unless they contradict fewer-screens (then fewer-screens wins for post/create video path).  
**No invent** beyond Adam voice below.

---

## One lock

**After pick: prefer a single screen. No quality checkbox — default original / up to 4K (2160). Faster feel. On iOS paused feed, the first frame must lift (loadeddata) — never a stuck still.**

---

## A) Create / upload — fewer screens

| Token | Lock (one SoT) |
|-------|----------------|
| After pick | Prefer **one** screen (preview + post/send) — **not** a multi-step quality / encode wizard |
| Quality UI | **Remove** quality checkbox / quality picker |
| Default encode | **Original** quality · cap **up to 4K (2160)** — no user toggle |
| Feel | Faster: fewer screens · less waiting chrome · no invent progress theater beyond calm necessary status |
| Playback path | New uploads still mint **Mux** (cite Mux-only) |

**FAIL:** Extra quality step · checkbox to “optimize” · multi-screen after pick.  
**PASS:** Pick → one create screen → post; encode defaults silently to original≤2160.

---

## B) Feed cover-lift (iOS paused)

| Token | Lock (one SoT) |
|-------|----------------|
| Symptom | iOS paused-feed first-frame still that **never lifts** |
| Fix | First frame / poster **must lift** when media is ready — bind lift to **`loadeddata`** (or equivalent ready signal Dev already uses in tip) so the still does not stick |
| Face | Feed video face stays Immersive Social (full-bleed / capped face per feed locks) — this lock owns **lift timing**, not reopening scale/carousel |
| Autoplay policy | Muted / paused feed policy OK · when frame is ready it **shows live/ready face**, not a frozen never-lift still |

**FAIL:** Stuck first-frame still on iOS paused feed after load.  
**PASS:** `loadeddata` (ready) lifts the cover/still into the playable face.

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Reopening Mux-only / second player | Cite Mux-only |
| Inventing quality presets / bitrate menus | Adam: no checkbox · original≤2160 |
| Multi-screen encode wizard | Fewer screens |
| Soft “optimize for feed” UX invent | Faster feel · Adam voice only |
| Design PR | CoS seeds · Dev #698 |

---

## Must-fix

1. Single screen after pick (prefer).  
2. No quality checkbox · default original / up to 4K (2160).  
3. Faster feel (fewer steps / less chrome delay).  
4. iOS paused-feed first frame lifts on `loadeddata`.  
5. Tip #698 cites this lock + Mux-only.

---

## Done-when

1. #698 tip cites this path · Codex unblocked on Design lock.  
2. Adam glance: single-screen create · no quality UI · feed cover lifts on iOS.  
3. Design Own→READY · CoS CLEAR merge path per house rules.

**Ship:** Design Own→READY · CoS routes Dev on #698.
