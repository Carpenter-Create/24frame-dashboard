# [GC][24Frame] LOCK — Social Home craft Wave 1 v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** (Adam CLEAR 2026-09-28 · Claude FAIL rematch) · Design Own→READY · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS CLEARs Dev  
**Scope:** Social **Home feed post rhythm** · content margin · header trailing icon grammar · listed free nits  
**Entity:** Global Content / 24Frame only  
**Positioning:** **Coinbase shell × IG feed rhythm × FB hint** (FB hint **deferred** — not this wave)  
**House:** Geist · Sporty Blue `#1769FF` · spacing **8 / 16 / 24 / 48** where on-scale · hairline only where this lock keeps it · **no** drop shadows · Launch-great · Media Immersion · quiet redundant-chrome  
**Related (do not reopen OUT list):** `social-mobile-full-bleed-lock-v1.md` · `social-home-post-actions-align-lock-v1.md` · `social-home-density-craft-sequel-lock-v1.md` (M3/M4/M7) · `shell-workspace-waffle-layer-lock-v1.md` · `social-home-stories-feed-hairline-lock-v1.md` (Stories→feed seam — not inter-post) · `social-feed-under-post-time-lock-v1.md` (under-post time line) · `social-home-post-separation-lock-v1.md` (**amends** this lock’s inter-post hairline DELETE and its ~8–12 next-author air only)  
**No invent** beyond Adam CLEAR Wave 1, except the two points the post-separation lock amends.

---

## One lock

Wave 1 rematch = **IG-class post rhythm** inside Coinbase shell: tighter media→meta stack, **one 16pt content margin**, even trailing icons, and a short free-nit list. **Inter-post hairline and next-author air are amended** by `social-home-post-separation-lock-v1.md` (hairline back on the feed row; air ~16–24). No gray FB fill band. Parked items stay PARK / FREEZE.

---

## 1) Post rhythm

| Token | Lock |
|-------|------|
| Media → actions | **~10pt** under media (actions sit close under the media stage) |
| Likes / caption / comments stack | **4–6pt** between those meta rows |
| Before next author | **Amended** — cite `social-home-post-separation-lock-v1.md`. Was ~8–12 (`pb-[var(--space-2)]`). Now `pb-[var(--space-4)]` (16), measured ~18. Phone and desktop still share it. The 2026-09-28 **~24pt** / `--space-6` row air stays superseded — it opened ~32 CSS px with the old time strut |
| Inter-post hairline | **Amended** — cite `social-home-post-separation-lock-v1.md`. Wave 1 deleted it. Adam 2026-09-29 puts `border-b border-hairline` back on the feed row. Still **no** gray FB fill band |
| Stories → feed seam | **Not** redefined here — cite `social-home-stories-feed-hairline-lock-v1.md` if that section seam remains; this lock kills **post→post** dividers only |

**PASS:** Dense IG-like stack under media · next-author air and post→post hairline per `social-home-post-separation-lock-v1.md` · no inter-post gray fill band.  
**FAIL:** Loose website gaps · FB gray fill strip between posts · actions far under media.

**Amends:** Mid-feed **inter-post** `#ECEDF0` dividers from mobile full-bleed / spine “between posts hairline” intent were **OUT** for post→post in Wave 1. `social-home-post-separation-lock-v1.md` puts the hairline back on the feed row and does not restore a gray fill. Full-bleed **media** L/R on phone **stays**.

---

## 2) Content margin + action glyph align

| Token | Lock |
|-------|------|
| Content margin | **One 16pt** horizontal inset for **everything except full-bleed media** |
| Full-bleed media | Unchanged phone SoT (viewport edge) — cite mobile full-bleed |
| Action glyph optical edge | Align action **glyph** optical edge to the **text** content edge (same 16 inset family — glyphs don’t float inside/outside the text column) |

**PASS:** One margin SoT · actions optically share the text column edge.  
**FAIL:** Mixed 12/16/20 insets · glyphs indented differently from caption/likes text.

---

## 3) Header trailing icons

| Token | Lock |
|-------|------|
| Icon box | Shared **24pt** box for trailing utility glyphs |
| Stroke | **Same stroke** weight across trailing icons |
| Waffle | **Weight match bell** (same optical stroke / weight family) |
| Avatar | **~28** (~**1.15×** the 24 box) |
| Tap | Keep **44** tap targets |
| Scope | Header trailing cluster (search peers / bell / waffle / avatar) — do not resize phone **dock** under this row |

**Note vs density M3:** Wave 1 locks trailing **24pt box** + waffle=bell weight + avatar ~28. Prefer this Wave 1 SoT for Social/header trailing craft rematch; no arbitrary ~18px.

**PASS:** Even 24 boxes · waffle matches bell · avatar ~28 · 44 taps.  
**FAIL:** Uneven stroke · waffle heavier/lighter than bell · tiny/huge avatar · lost 44 taps.

---

## 4) Free nits (IN)

| Nit | Lock |
|-----|------|
| Zero likes | **Hide** the likes line when count is **0** |
| Singular | **`1 like`** (not “1 likes”) |
| Action gaps | **Even** action icon gaps · keep **44** tap hits (cite post-actions align even triplet; gap SoT remains align/density `gap-2` / **8** unless a later Adam CLEAR changes it) |
| Play control | Video play control ships with a **backing disc** (quiet disc behind the glyph — not a naked glyph on media) |

---

## OUT / PARK (this wave)

Do **not** ship in Wave 1:

| Item | Status |
|------|--------|
| Composer cut | **PARK** |
| Story rings swap | **PARK** |
| Chip blue dual-fill | **PARK** |
| Caption clamp | **PARK** |
| Dual name → handle | **PARK** |
| Author row shrink | **PARK** |
| Glass chrome | **PARK** |
| Header hide-on-scroll | **PARK** |
| Text-only post grammar | **FREEZE** until separate Design lock |
| FB hint (full) | **Deferred** (positioning only) |

---

## Explicit OUT

- Inventing FB gray inter-post bands  
- Bagging PARK / FREEZE items into this tip  
- Desktop bleed invent beyond existing locks  
- Design PR  

---

## Gates

**G1.** Media→actions ~10 · likes/caption/comments 4–6 · next-author air and post→post hairline per `social-home-post-separation-lock-v1.md` (not the Wave 1 ~8–12 / hairline-delete reading).  
**G2.** One **16** content margin (except full-bleed media) · action glyph optical edge aligns to text.  
**G3.** Trailing icons shared **24** box · same stroke · waffle=bell weight · avatar ~28 · tap **44**.  
**G4.** Hide 0 likes · `1 like` · even action gaps / 44 taps · play control with backing disc.  
**G5.** PARK / FREEZE list untouched.

---

## Verify-on-ship

1. Phone and desktop Social Home feed: post→post hairline and ~16–24 CSS px air per `social-home-post-separation-lock-v1.md`; no gray fill band; tight meta under media.  
2. Inset chrome shares one 16 margin; full-bleed media still edge-to-edge on phone.  
3. Header: 24 boxes, waffle matches bell, avatar ~28, 44 taps.  
4. 0 likes hidden; one like reads “1 like”; play control has backing disc.

---

## Repo citation

CoS seeds: `docs/design-locks/social-home-craft-wave-1-lock-v1.md`  
Box craft: `/workspace/24frame-agg-ux/social-home-craft-wave-1-lock-v1.md`
