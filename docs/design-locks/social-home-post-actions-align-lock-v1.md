# [GC][24Frame] LOCK — Social Home post action icons even align v1

**Date:** 2026-09-24 (CT) · **Amend:** FAIL tip nudge dropped · Adam closer → gap **16→8** (keep 40/24/equal/baseline) · **Idle ink:** house `text-ink-2` (light `#3D4450`). Box path checked 2026-09-25; `24frame-agg-ux` lock file was not in the tree. This amend records that Design READY. Do not hard-code `#5E646E` on this row.  
**Status:** **LOCKED** · Design no PR · path stays `docs/design-locks/social-home-post-actions-align-lock-v1.md`  
**Amended (founder 2026-10-05, H · Posts):** on the feed post only, Like · Comment · Share are round grey 40 (phone 44) with 20 ink glyphs and their counts beside them, 8 apart. The immersive dock, the Explore rail and the create preview keep this lock's bare 40 hits with 24 glyphs. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) §7.  
**Box:** `/workspace/24frame-agg-ux/social-home-post-actions-align-lock-v1.md`  
**Miss shots:** `post-actions-uneven-fail.png` · `post-actions-still-uneven-fail.png`  
**Cite:** Immersive Social · launch-great · spacing **8 / 16 / 24 / 48**

## One lock

Like · Comment · Share = **one even triplet** in **both** idle (outline) and liked (filled heart). Equal gaps. Shared optical baseline. No heart high or low.

## Concrete (phone + desktop — same component)

| Token | Lock |
|-------|------|
| Row | `flex items-center` · L→R Heart · Comment · Share |
| Hit | **Identical** wrappers: **40×40** · `inline-flex items-center justify-center` — **never** naked icons as flex children |
| Glyph | **24×24** box centered in hit · same for all three |
| Gap | **8** (`gap-2`) **hit-edge → hit-edge** only (Adam 2026-09-24: closer) |
| Heart fill vs outline | **Same** box · **same** transform · weight only (`bold` idle / `fill` liked). PASS must hold in **both** states |
| Optical | **Drop** free ≤1px invent nudge. Prefer **zero** translate. If Phosphor Heart still sits high, one shared correction only: **`translateY(1px)` down on Heart in both states** — never outline-only / fill-only |
| Ink | Idle house `text-ink-2` (light `#3D4450`) · liked heart Sporty Blue `#1769FF` |
| Counts | Stay **below** row |

## Explicit OUT

Unequal gaps · mixed hit sizes · naked size-22 icons · `gap-3.5` / off-scale gaps · state-only nudge · hard-coded idle `#5E646E` on this row · composer / full-bleed / Stories invent · Design PR

## Done-when

Adam glance even on outline **and** filled heart · three 40 hits · gap **8** · no Design PR.
