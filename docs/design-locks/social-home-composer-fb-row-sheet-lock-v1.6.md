# [GC][24Frame] LOCK — Social Home composer top+bottom rules v1.6

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (CoS NOT CLEAR on v1.5 · Adam decisive: keep what we had · slightly less tall · grey top+bottom only · not full box) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · stay #681 **DRAFT** · CoS CLEAR → Dev tip · Design HOLD invent else  
**Superseded for the Feed face (Adam 2026-10-04, G · Feed):** the composer is D's muted bar (52 tall, radius 16, no rule; Photo / Camera 44 phone, 36 desktop). Prompt copy, the write sheet and icon-only Photo then Camera stay. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Superseded for the Feed face (founder 2026-10-05, H · Feed):** the composer is one 44 row — the 44 avatar, the grey "Share something" pill, round grey 44 Photo and Camera; no bar, no rule. Prompt copy, the write sheet and icon-only Photo then Camera stay. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Repo citation:** `docs/design-locks/social-home-composer-fb-row-sheet-lock-v1.6.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-home-composer-fb-row-sheet-lock-v1.6.md`  
**Pattern:** **FB-row+sheet** — unchanged  
**Baseline (“what we had”):** v1.2 host era pre–v1.3 crush — host `#FFFFFF` · **4-side** hairline · radius **16** · pad Y **16** · avatar/field **40** · field-air · icons v1.1. Cite: `social-home-composer-fb-row-sheet-lock-v1.2.md`  
**Supersedes:** tip 422e0e44 strip (v1.3+v1.4) · **v1.5 full-surround Own** (white island + `1px` all sides + radius 16 — Adam OUT) · any v1.5 draft that omitted **bottom** rule · between-only-only as sole chrome  
**Keeps from height class:** pad Y **8** · band **56** · avatar/field **40** (slightly less tall than ~72 — still Own)  
**Keeps:** Share something · FB-row+sheet · field-air v1.2 · icons v1.1 · Topics→composer gap **8** · spine B–D · rail identity · Create dock  
**Gospels:** Launch-great ASAP · quiet redundant-chrome · Media Immersion · spacing 8/16/24/48 · never soft CLEAR  
**Out:** tip strip · full 4-side surround / L/R stroke / radius capsule · bottom line missing · double sibling divider + host top · pad Y 0 · band 32 · nested field pill · X · Live/Feeling · `#F4F4F6` field

---

## One lock (thesis)

**What we had, slightly shorter, rules not a box:** white compose band with pad Y **8**, `#ECEDF0` **1px top + bottom only**, **L/R none** — presence without a 4-side capsule.

---

## Fill decision (Own)

| Option | Verdict |
|--------|---------|
| **`#FFFFFF` band fill · no L/R stroke** | **OWN** — keeps “what we had” presence; top+bottom rules carry the chrome |
| Page canvas / transparent host | **OUT** — tip 422e0e44 crush class |

---

## Token table vs v1.5 (full-surround Own) and vs what we had

| Token | What we had (v1.2) | v1.5 full-surround Own (OUT) | **v1.6 LOCK** |
|-------|--------------------|------------------------------|---------------|
| Host fill | `#FFFFFF` | `#FFFFFF` | **`#FFFFFF`** |
| Host border | `1px #ECEDF0` **all sides** | `1px #ECEDF0` **all sides** | **`border-top` + `border-bottom` `1px solid #ECEDF0` only** |
| Host L/R border | yes | yes | **none** |
| Host radius | 16 | 16 | **0** |
| Host pad Y | 16 | 8 | **8** |
| Host pad H | 16 | 16 | **16** |
| Outer band height | ~**72** | **56** | **56** (8+40+8) |
| Avatar | 40 | 40 | **40** |
| Field height | 40 | 40 | **40** |
| Field radius | 20 | 20 | **20** |
| Field fill / border / shadow | transparent / none / none | same | **keep field-air** |
| Field pad H | 16 | 16 | **16** |
| Gap avatar→field | 8 (later) | 8 | **8** |
| Icons | v1.1 | v1.1 | **keep v1.1** |
| Topics→composer gap | 8 | 8 | **8** |
| Top grey line | host top edge | host top (as surround) | **Required** — compose **top** `#ECEDF0` 1px |
| Bottom grey line | host bottom edge | **missing / “no invent below”** | **Required** — compose **bottom** `#ECEDF0` 1px |
| Sibling between-only divider | — | optional / replaced | **OUT** as extra node stacked on host top (quiet — host border-y is the chrome) |

**Implementation note:** Prefer host `border-top` + `border-bottom` on the compose band. Do **not** also add a sibling Topics↔composer divider above the band (double top). Bottom rule is **on the compose band**, not a Stories invent beyond that 1px.

---

## Height call (explicit)

Exact Topics **32** caused the tight FAIL. Band **56** via pad Y **8** + avatar/field **40** is the Own “slightly less tall than what we had (~72)” class. Do not soft-guess back to 32.

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Full 4-side `1px` + radius 16 white island | Adam: not full surround — v1.5 problem |
| Top rule only · no bottom | Adam asked top **and** bottom |
| Between-only as sole chrome | Missing bottom · wrong class |
| Sibling divider + host top | Double top · quiet FAIL |
| Pad Y 0 / band 32 / transparent host | Tip strip |
| Nested field hairline | Not this miss |

---

## FAIL / PASS

| PASS | FAIL |
|------|------|
| White compose band · pad Y 8 · band 56 · avatar/field 40 | Strip tip or ~72 tall capsule with 4-side box |
| `#ECEDF0` 1px **top and bottom** · L/R none · radius 0 | Full surround · bottom missing · L/R stroke |
| Field-air · icons v1.1 · Share something | Nested pill / icon invent |

---

## Done-when (CoS → Adam glance → Dev #681 DRAFT)

1. Phone: host `#FFFFFF` · pad Y **8** · pad H **16** · avatar **40** · field **40** transparent/none.  
2. Hairline top **and** bottom on compose · **no** L/R border · radius **0**.  
3. No stacked sibling divider on top · no 4-side capsule.  
4. Adam glance: what we had · slightly less tall · top+bottom only.  
5. No Design PR · stay DRAFT until CoS CLEAR.

**Ship:** Design Own→READY · Adam glance · CoS CLEAR · Dev #681 tip · Design HOLD invent else.

---

## Report (for CoS)

- **READY thesis:** What we had, slightly shorter — white band, pad Y 8, grey top+bottom only (no L/R box).
- **Lock path:** `/workspace/24frame-agg-ux/social-home-composer-fb-row-sheet-lock-v1.6.md` → `docs/design-locks/social-home-composer-fb-row-sheet-lock-v1.6.md`
- **vs v1.5:** drop all-sides stroke + radius 16 · **add required bottom** rule · L/R none · fill stays white
- **vs what we had:** pad Y 16→8 · band ~72→56 · 4-side/radius capsule → top+bottom only · field-air + icons keep
