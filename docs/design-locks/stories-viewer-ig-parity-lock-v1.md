# [GC][24Frame] LOCK — Stories viewer Instagram parity v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam product 2026-09-24 CT · SCOPE RAISE — **100% Instagram** viewer, not hop-only, not soft-grade) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev · overnight P0 drive-to-merge when IG bar met  
**Repo citation (ship):** `docs/design-locks/stories-viewer-ig-parity-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/stories-viewer-ig-parity-lock-v1.md`  
**Supersedes:** `stories-viewer-advance-ig-lock-v1.md` (same night hop-only Own→READY — absorb into this lock; do not ship hop-only alone)  
**Blocks:** #664 undraft until this lock READY → Dev tip → Codex PASS → CoS box smoke → Adam advance/viewer iPhone glance  
**Scope:** Full Instagram Stories **viewer** experience (playback, progress, advance, hold, tray loop, 9:16 fill).  
**Keep / do not reopen:** `create-story-photo-video-fb-layout-lock-v1.5` (Take+Upload — Adam iPhone media PASS) · `stories-home-rail-fb-card-lock-v1` · Coinbase chrome / shell gutters · geometry fights already settled in `stories-viewer-desktop-ig-carousel-lock-v1`  
**Out of scope:** text story · create Take/Upload changes · ornamental chrome invent · IG brand/music/ads clone  
**Gospels:** Stories = Facebook/Instagram grade only · rich-calm v1.4 (IG/TikTok/YouTube media level) · film/media audience G0 · Coinbase/thoughtful shell · **no soft-grade** · no drop shadows  
**House register:** Geist · Sporty Blue `#1769FF` · spacing **8 / 16 / 24 / 48** · surfaces as house SoT  
**Amended 2026-10-07:** House SoT auditor 2026-10-05, P0 (CoS brief): on phone the header's author name never truncates (house gospel 2026-09-19, AGENTS.md). It stacks over the time beside the face and wraps (`SOCIAL_STORY_VIEWER_AUTHOR_CLASS`, the house phone stack; the name is the house person name, `SOCIAL_PERSON_NAME_CLASS`). From md the name and the time share one line, and a long name wraps there too.

---

## One lock

The Stories **viewer** is **100% Instagram** in behavior and media presence: tall **9:16** filled media, white progress segments synced to playback, **auto-advance** after each item, **pause-on-hold**, and **smooth in-viewer** next/prev through the author tray into the next author — never a soft thin viewer, never a remount flash.

---

## 1–2. Auto-advance + manual hop (IG)

| Token | Lock |
|-------|------|
| Auto-advance | When the current item’s duration completes, advance to the **next item** with **no tap** |
| Photo duration | **5000 ms** (5.0 s) — Instagram peer default for stills |
| Video duration | **Exact media duration** to natural `ended` — do **not** clamp to 5 s |
| Manual next | Tap/click **right ~⅔** of media · swipe left · desktop chevron next |
| Manual prev | Tap/click **left ~⅓** of media · swipe right · desktop chevron prev |
| Transition | **In-viewer morph only** — media stage crossfade **or** horizontal slide **220 ms** ease-out |
| Shell | Progress host + header + reply/like **stay mounted** across item and author hops |
| Forbidden | Route remount · full page refresh · `Link`/`router.push` hop that remounts the viewer · blank/white flash · hard cut with no 220 ms morph |

URL may update quietly for shareability **only** if the viewer shell does not remount or flash.

---

## 3. Progress segments

| Token | Lock |
|-------|------|
| Count | **One segment per story item** in the **current author’s tray** |
| Fill | Past = 100% · Current = **0→100% linear** over that item’s duration · Future = empty track |
| Sync | Progress clock = media clock (photo timer or video playback) |
| Geometry | Height **2px** · gap **2px** · fill **white** on dark stage (existing viewer white progress language — **not** Sporty Blue fill) |

---

## 4. Pause-on-hold

| Token | Lock |
|-------|------|
| Hold | Pointer/touch **down** on media → **pause** progress fill **and** pause video |
| Release | Resume from paused progress + resume video |
| During hold | Auto-advance does **not** fire; hold itself is not a next tap |

---

## 5. Tall 9:16 media fill (cite — do not reopen)

Keep `docs/design-locks/stories-viewer-desktop-ig-carousel-lock-v1.md`:

| Surface | Lock (cite only) |
|---------|------------------|
| Phone | Full-bleed single **9:16** card · media **object-cover** fill · no letterbox grey void as the primary read |
| Desktop | Dark stage · center **9:16** · dimmed neighbors · chevrons · white progress · reply+like · 24Frame mark (not IG brand) |
| Media | Photo **and** video at Instagram/TikTok/YouTube **presence/fill/immersion** (rich-calm v1.4) |

Do **not** reopen card radius, neighbor %, stage color, or chevron geometry in this PR. This lock owns **behavior + fill integrity**; geometry stays that file.

---

## 6. Tray → viewer → next item → next author (IG loop)

| Step | Lock |
|------|------|
| Entry | Home rail card / Create follow-on → open viewer on that author’s **first unseen** (or tapped) item |
| Next item | Auto or manual → next item in **same author tray** |
| Tray end | After author’s **last** item → **first item of next author** in rail order (same mounted viewer) |
| Prev across authors | At author’s first item, prev → **previous author’s last item** |
| Whole tray end | After last author’s last item → **close viewer** → Social Home `/social` (or prior entry) |
| Loop | IG tray walk as above — **not** infinite self-loop on one author unless product later amends |

---

## Keep closed (cite only)

- `docs/design-locks/stories-viewer-desktop-ig-carousel-lock-v1.md` — stage / 9:16 / neighbors / chrome  
- `docs/design-locks/stories-home-rail-fb-card-lock-v1.md` — FB tall rail cards  
- `docs/design-locks/create-story-photo-video-fb-layout-lock-v1.5.md` — Take+Upload (media PASS)  
- `docs/design-locks/24frame-visual-register-rich-calm-lock-v1.md` — v1.4 media peer grade  

---

## Dev ship checklist (one line)

**Ship:** persistent viewer host · photo **5s** / video **media-length** clocks · white segment fill synced · auto-advance item→author→close · hold pause/resume · manual next/prev **220ms** in-viewer morph only (no remount/flash) · 9:16 cover fill per existing carousel lock — **no** create-story / rail / gutter edits.

---

## FAIL / PASS (Codex + CoS box smoke + Adam iPhone viewer glance)

**PASS when:**

1. Photo ~5 s then advances with **no tap**.  
2. Video plays **full length** then advances with **no tap**.  
3. Progress segments = item count and fill with playback.  
4. Hold pauses; release resumes.  
5. Media fills tall **9:16** (no soft thin letterbox as the read).  
6. Manual hop is smooth in-viewer; tray end → next author; end → closes.  
7. Create path unchanged (still Adam media PASS).

**FAIL when:** soft-grade thin viewer · remount/flash hop · tap required after finished item · progress not synced · geometry reopen / create-story reopen.

---

## Done-when

- Lock cited at `docs/design-locks/stories-viewer-ig-parity-lock-v1.md`  
- One Dev PR matches this checklist only  
- Codex PASS + CoS box smoke + Adam iPhone viewer/advance glance → CoS undraft #664  

---

## Label

**[Global Content][24Frame]** Stories viewer Instagram parity v1
