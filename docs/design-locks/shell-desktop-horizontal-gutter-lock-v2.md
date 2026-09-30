# [GC][24Frame] LOCK — Desktop shell horizontal gutters (symmetric) v2

**Date:** 2026-09-23 (CT)  
**Status:** **LOCKED** Adam amend 2026-09-23 post-#661 · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev one PR  
**Supersedes:** `shell-desktop-horizontal-gutter-lock-v1.md` — Coinbase **asymmetric L32 / R44** (#661 shipped that pair; Adam glanced prod and amended)  
**Scope:** Desktop **shell chrome horizontal gutters only** — viewport → logo leading ink (**L**) and viewport → avatar trailing ink (**R**), and **content column edges that share those gutters**. Content trailing edge must line up with the **right edge of the avatar** (Aggregation cards · Social For you rail · other full-bleed shell columns).  
**Explicit OUT:** Soft-nav · Settings IA · phone gutters · Coinbase asymmetric **32/44** · inventing a SoT number without measuring · Design opening a PR  

**Evidence (Adam Desktop post-#661, both 2880×1800 @2× → CSS ≈ device/2):**  
- `/workspace/24frame-agg-ux/shell-gutter-post661-aggregation.png` — Adam 2026-09-23 **4:38 PM CT** (`app.24frame.co/social` Home / Your story; shell chrome same house lead as Aggregation)  
- `/workspace/24frame-agg-ux/shell-gutter-post661-social-explore.png` — Adam 2026-09-23 **4:40 PM CT** (`app.24frame.co/social` Create photo story; shell chrome same)  
- Extra: `/workspace/24frame-agg-ux/shell-gutter-post661-shot3.png` — Adam **4:42 PM CT** (same Create surface)  

Note: Parent-cited attachment hashes `1755307…` / `5d1c390…` were **not on the box**; evidence copied from Adam Desktop screenshots taken at amend time.

**House:** Geist · Sporty Blue · Coinbase-calm · spacing scale **8 / 16 / 24 / 48** · **no drop shadows**  
**Cites:** house chrome unify lead · Soft-nav stays as shipped — **do not invent Soft-nav** in the Dev PR that implements this lock

---

## One lock

Desktop shell horizontal gutters are **symmetric**. One number both sides, from the **measured current logo inset** after #661 (not a new invented SoT):

| Edge | SoT inset (CSS px) | Measure |
|------|--------------------|---------|
| **Left** | **32** | Viewport → logo leading ink (black corner bracket / mark) |
| **Right** | **32** | Viewport → avatar trailing ink — **same number as Left** |

**Content columns that use shell gutters** flush to:
- **L** = logo leading ink  
- **R** = avatar trailing ink  

So Aggregation cards, Social For you rail, and other full-bleed shell columns share the **same** trailing plane as the avatar. Not a tighter inner 16. Not flush to something left of the avatar.

**32** = measured logo inset (64 device px @2×) and sits on the house multiple-of-8 grid (within ±2 of 32 — no rounding invent).

Do **not** keep #661’s asymmetric **32 / 44**. Do **not** invent 48 both sides or any other number without a new Adam measure.

---

## Evidence table (measured)

All values CSS px (= device/2 on 2880-wide shots). App chrome below browser UI; logo ink at device x=64; avatar widest trailing ink at device x=2791.

| Shot | Surface | **L** (viewport→logo) | **R** (viewport→avatar) | Content trailing air (viewport→content trail) | Miss (content vs avatar) |
|------|---------|----------------------:|------------------------:|----------------------------------------------:|--------------------------|
| post661 aggregation (4:38) | Social Home / Your story cards | **32.0** | **44.0** | Story card trail ≈ **140** (dark card @ device x=2600); outer gray stage ≈ **15.5** (stage @ device x=2848) | Cards sit **~96** CSS **left** of avatar; gray stage **overshoots** avatar by **~28.5** CSS toward viewport |
| post661 social-explore (4:40) | Social Create photo story | **32.0** | **44.0** | White action cards trail ≈ **193** (device x≈2493); outer gray panel ≈ **15.5** | Cards sit **~149** CSS **left** of avatar; gray panel overshoots avatar like shot 1 |
| post661 shot3 (4:42) | Same Create surface | **32.0** | **44.0** | Same pattern as 4:40 | Same |

**Shell chrome after #661:** L **32** / R **44** confirmed (asymmetric).  
**SoT chosen for v2:** **L = R = 32** (logo inset; house ×8).  
**Content amend:** trailing edge of shell-gutter content must equal avatar trailing plane (both at **32** CSS from viewport once R is corrected).

---

## What must share the gutter

Same **L = R = 32** for:

1. **Header lead** — logo (and workspace lead cluster start)  
2. **Header trail** — avatar (outermost utility)  
3. **Primary content column** left edge when the page uses full-bleed shell gutters  
4. **Trailing content column** right edge (Aggregation cards · Social For you rail · Industry news when it shares shell gutter) — **flush to avatar trailing ink**

One shared token pair preferred, e.g. `--shell-gutter-inline-start: 32px` · `--shell-gutter-inline-end: 32px` (or one `--shell-gutter-inline: 32px` used both sides) so Aggregation · Social · Education · Settings do not drift.

Centered page-max canvases that are **not** on shell gutters stay on their existing measures — do not force every Social inner card to full-bleed; the lock is for columns that **claim** the shell gutter.

---

## Explicit OUT

- Soft-nav invent / Soft-nav geometry reopen  
- Settings drill-in IA (locked separately)  
- Phone gutters (separate if Adam raises)  
- Coinbase asymmetric **32/44** (v1 / #661 — **superseded**)  
- Inventing a SoT without measuring Adam / current logo inset  
- “Just use 48 both sides” or keep R **44**  
- Pixel-cloning Coinbase brand (blue C, rail layout) — **insets only**  
- Design opening a PR

---

## Supersedes

| Prior | Yields to |
|-------|-----------|
| `shell-desktop-horizontal-gutter-lock-v1.md` (L **32** / R **44** Coinbase asymmetric) | **This v2** — L **=** R **=** **32** + content flush to avatar |
| #661 shipped tokens `--shell-gutter-inline-start: 32px` / `--shell-gutter-inline-end: 44px` | Both **32**; content columns that share shell gutters follow |

In-card pad **16**, section gaps **24**, module radius, Soft-nav, phone `--chrome-gutter` stay elsewhere.

---

## Gates

**G1.** Desktop left shell gutter = **32** CSS px (viewport → logo leading ink).  
**G2.** Desktop right shell gutter = **32** CSS px (viewport → avatar trailing ink). **Identical** to G1 — not 44, not 48.  
**G3.** Content columns that share shell gutters align to the **same** L/R pair; trailing content edge **flush** to avatar trailing ink (Aggregation cards · Social For you rail · equivalent full-bleed columns).  
**G4.** One shared shell gutter SoT across workspaces using house lead chrome — logo/avatar inset does not drift by workspace; L and R use the same token value.  
**G5.** #661 asymmetric **32/44** gone on desktop shell (`--shell-gutter-inline-end` is **32**, not **44**).  
**G6.** No Soft-nav invent in the Dev PR.  
**G7.** No Settings IA reopen.  
**G8.** No phone gutter change.  
**G9.** Design does **not** open a PR — CoS routes one Dev PR to this lock.

---

## Repo citation

CoS seeds: `docs/design-locks/shell-desktop-horizontal-gutter-lock-v2.md`  
Box lock: `/workspace/24frame-agg-ux/shell-desktop-horizontal-gutter-lock-v2.md`  
Superseded stub: `/workspace/24frame-agg-ux/shell-desktop-horizontal-gutter-lock-v1.md`
