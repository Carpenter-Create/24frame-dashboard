# [GC][24Frame] LOCK — Social Home / shell density craft sequel v1

**Date:** 2026-09-28 (CT)  
**Amend:** 2026-09-28 (CT) — Adam **LOCKED** density amend (Cursor **DM-1–4**) · Own→READY amend  
**Status:** **LOCKED** · Design Own→READY · Design does **not** open a PR · CoS seeds / re-seeds `docs/design-locks/` · **Dev DRAFT only after #699 is on main** + this READY (do **not** bag into waffle / #699 tip)  
**Scope:** Desktop trailing utility density · Social Home lane chips in Topics rail (dual-axis) · feed post-action gap unify  
**Entity:** Global Content / 24Frame only  
**House:** Coinbase register · Geist · Sporty Blue `#1769FF` · spacing **8 / 16 / 24 / 48** · hairline · no drop shadows · Launch-great · quiet redundant-chrome  
**Still in:** **M3** · **M4** · **M7**  
**Dropped:** **M5 reorder** (Topics stay above composer)  
**Out of this lock:** S1–S4 · cover-lift lock text amend · magic-link browse · waffle Layer 1/2 IA (`shell-workspace-waffle-layer-lock-v1.md` — separate tip)  
**No invent** beyond Adam LOCKED DM-1–4 voice.

---

## Sequencing

| Rule | Lock |
|------|------|
| Tip | **Sequel** after **#699** merges to main — **not** folded into the waffle tip |
| Dev start | **HOLD** until `#699` on main **and** this amend seeded / CLEARED by CoS |
| Design | Own→READY amend · HOLD invent else |

---

## One lock

Three density ships (M5 reorder **OUT**):

1. **M3** — Desktop trailing cluster gap **`space-4` (16)** · glyph **`HOUSE_HEADER_TRAILING_DESKTOP` = `size-5` (20)** — house tokens only.  
2. **M4** — Fold **Following / For you** into Topics as **leading lane chips** · **dual-axis** · **filled-pill** on-state only · **phone gets lane chips** (IA).  
3. **M7** — Feed post actions **`gap-2` (8)** · unify with post-actions-align / immersive row.

---

## M3 — Coinbase shell · desktop trailing cluster (DM-1)

**Superseded 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) (Adam, "Yes, everywhere"): desktop trailing controls are 34 boxes **8** apart (`space-2`), glyphs **18**; the avatar sits 4 further out. M4 and M7 stay.

| Token | Lock |
|-------|------|
| Surface | **Desktop** header trailing utility cluster only |
| Cluster gap | **`var(--space-4)` / `space-4` = 16** — not a 12–16 band · not arbitrary px |
| Utility glyph | **`HOUSE_HEADER_TRAILING_DESKTOP`** (class peer: `HOUSE_HEADER_TRAILING_DESKTOP_CLASS`) = **`size-5` (20)** |
| Forbidden | **`~18`** · invented px · off-token sizes |
| Phone dock | **Do not resize** — M3 is desktop header only |
| Waffle tip | Do **not** reopen waffle IA; density only |

**PASS:** Desktop trailing uses `space-4` gap + `size-5` desktop trailing glyph token.  
**FAIL:** gap-8 / ~18px / phone dock resized / bagged into #699.

---

## M4 — Fold Following / For you into Topics · dual-axis (DM-2)

| Token | Lock |
|-------|------|
| `SocialHomeTabs` underline strip | **OUT** — fold into Topics rail |
| Leading chips | **Following** · **For you** as **lane chips** at the **start** of the Topics rail · then topic chips (All / categories) |
| Dual-axis | **Lane + topic both can be lit** at once (independent axes — not mutually exclusive single-select across the whole rail) |
| On-state | **Filled-pill only** (existing selected chip / filled-pill grammar) |
| Forbidden on-state | **Sporty Blue underline** in this rail (no tab-underline grammar here) |
| Chip height | **32** (Topics SoT) |
| **Phone IA** | Phone **gets lane chips for the first time** — same dual-axis Topics rail (record as IA; not desktop-only) |
| URLs | Keep `?lane=following` / `?lane=for-you` (or equivalent) via lane chips — do not invent `/social/home` |

**PASS:** One Topics rail · lane chips leading · dual-axis lit · filled-pill only · phone + desktop.  
**FAIL:** Standalone `SocialHomeTabs` underline strip · underline on-state · phone missing lane chips.

---

## M5 — DROPPED (DM-3)

| Token | Lock |
|-------|------|
| Stack order | **KEEP** **Topics → composer → Stories → wall** |
| Reorder to composer → stories → topics | **OUT** of this sequel — do **not** ship |
| Topics → composer gap | **8** HOLD (`topics-strip-center` v1 + composer v1.6) |
| Topics center / vertical-center | HOLD — do not reopen |

Do **not** amend spine / activity-feed stack order in this tip.

---

## M7 — Feed post actions gap unify (DM-4)

| Token | Lock |
|-------|------|
| Row | Like · Comment · Share (even triplet) |
| Gap | **`gap-2` (8)** — per `social-home-post-actions-align-lock-v1.md` |
| Supersedes | Prior density-sequel **`gap-4` (16)** wording in this file — **OUT** |
| Prefer | **Shared token** with immersive feed action row (one gap SoT) |
| Keeps | Hit **40** · glyph **24** · equal baseline · idle `text-ink-2` · liked heart Sporty Blue |
| Kill | Live **`gap-3.5`** (off-scale) wherever it still appears |

**PASS:** Actions use **8** / `gap-2` · shared with immersive row.  
**FAIL:** `gap-3.5` or `gap-4` on this row after amend.

---

## Explicit OUT

- **M5 reorder** (and hide-on-scroll Topics-as-reorder alternate)  
- S1–S4  
- Cover-lift / Mux / video upload lock text amend  
- Magic-link browse / auth verify  
- Bagging into waffle (#699) tip  
- Resizing phone dock glyphs under M3  
- Arbitrary ~18px glyphs · underline lane chrome in Topics rail  
- Design PR  

---

## Gates

**G1.** Sequel tip only after **#699** on main.  
**G2.** Desktop trailing gap **`space-4` (16)** · glyph **`HOUSE_HEADER_TRAILING_DESKTOP` = `size-5` (20)** · phone dock untouched.  
**G3.** Following/For you = Topics **leading lane chips** · dual-axis · filled-pill only · **phone included**.  
**G4.** Topics **remain above** composer · gap **8** HOLD.  
**G5.** Post actions **`gap-2` (8)** · shared immersive token · no `gap-3.5` / no density `gap-4`.

---

## Verify-on-ship (after #699 + this tip)

1. Mac desktop header: trailing gap 16 (`space-4`); glyphs `size-5` via `HOUSE_HEADER_TRAILING_DESKTOP`; phone dock unchanged.  
2. Mac + phone Social Home: no underline Following/For you strip; lane chips lead Topics; lane + topic can both be lit; filled-pill on-state only.  
3. Above-fold still Topics → composer → Stories → wall; Topics→composer gap 8.  
4. Feed actions: gap-2 / 8 between hits (align + immersive unify).

---

## Repo citation

CoS seeds / re-seeds: `docs/design-locks/social-home-density-craft-sequel-lock-v1.md`  
Box craft: `/workspace/24frame-agg-ux/social-home-density-craft-sequel-lock-v1.md`
