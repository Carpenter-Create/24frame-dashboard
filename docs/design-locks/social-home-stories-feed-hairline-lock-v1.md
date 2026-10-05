# [GC][24Frame] LOCK — Social Home Stories→feed hairline v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam phone glance #681 preview 2026-09-24 · composer bottom hairline present · **missing** grey under Stories / above first feed post · Adam wants one · Design **AGREE** · house speed — no invent bounce) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · Design HOLD invent else  
**Superseded (Adam 2026-10-04, G · Feed):** the story tiles now sit above the composer bar and D draws no rule under them, so this hairline is removed. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Repo citation:** `docs/design-locks/social-home-stories-feed-hairline-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-home-stories-feed-hairline-lock-v1.md`  
**Adam miss shot:** `/workspace/cloud-agent-artifacts/adam-glance/stories-feed-hairline-miss.png` (also `-sm.png`)  
**Parent SoT (cite · do not reopen bleed invent):** `docs/design-locks/social-mobile-full-bleed-lock-v1.md`  
**Hold:** composer FB-row+sheet v1.6 · Topics vertical center · post-actions align · Stories open smooth (#682)  
**Gospels:** Immersive Social · Launch-great · mobile full-bleed greys · quiet redundant-chrome · spacing **8 / 16 / 24 / 48**

---

## One lock

**Mobile:** draw a **`#ECEDF0` 1px hairline** under the Stories rail / above the first feed post. L/R = **viewport edge** (inset **0**) — **same job, same paint** as mid-feed and trailing post dividers.

---

## Concrete SoT

| Token | Lock |
|-------|------|
| Seam | Between Stories rail **bottom** and first feed post **top** |
| Color | `#ECEDF0` |
| Weight | **1px** |
| L/R | Viewport edge · inset **0** (match mid-feed full-bleed greys) |
| Stack | Stories cards → (optional rail pad bottom already locked) → **this hairline** → first post |
| Desktop | **Out** — leave desktop (full-bleed parent: desktop out of scope) |

**Why AGREE (craft):** Mid-feed and trailing greys already full-bleed `#ECEDF0`. Skipping Stories→feed makes the spine read unfinished and website-soft — not Immersive Social. Same job → same number.

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| No line / soft “Stories floats into feed” | Adam wants the line · breaks divider family |
| Inset hairline (not viewport edge) | Violates mobile full-bleed SoT |
| Thicker rule / double line / shadow | Quiet chrome — 1px only |
| Desktop invent | Parent lock: leave desktop |
| Other Home chrome invent | Out of tip |

---

## FAIL / PASS

| PASS | FAIL |
|------|------|
| Phone: `#ECEDF0` 1px under Stories · edge-to-edge | Missing line · inset line · wrong color |
| Matches mid-feed divider family | One-off invent |
| Desktop unchanged | Desktop cousin |

---

## Done-when

1. Phone: Stories→first post hairline present · `#ECEDF0` · viewport L/R.  
2. Matches mid-feed greys.  
3. Desktop left alone.  
4. No Design PR.

**Ship:** Design AGREE · Own→READY · CoS CLEAR Dev · Design HOLD invent else.

---

## Report (for CoS)

- **AGREE / READY:** Stories→feed `#ECEDF0` 1px full-bleed hairline (mobile)  
- **Lock path:** `/workspace/24frame-agg-ux/social-home-stories-feed-hairline-lock-v1.md` → `docs/design-locks/social-home-stories-feed-hairline-lock-v1.md`
