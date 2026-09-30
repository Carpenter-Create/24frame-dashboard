# [GC][24Frame] LOCK — Social mobile full-bleed media + dividers v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam 2026-09-24 · mobile full-bleed · desktop leave · CoS tip-first CLEAR Dev · Design lock parallel/after · house speed — no invent bounce) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · Design HOLD invent else  
**Repo citation:** `docs/design-locks/social-mobile-full-bleed-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-mobile-full-bleed-lock-v1.md`  
**Supersedes:** `social-full-bleed-lock-v1.md` (desktop-in amend — **REVERT**; Adam: leave desktop)  
**Adam call:** On mobile Social, media images and grey lines touch the edges / full width like Facebook so it feels like an app not a website. **Desktop left alone.**  
**Gospels:** Launch-great ASAP · Media Immersion · Immersive Social / Home north star · quiet redundant-chrome · phone never-truncate  
**Related:** `social-home-spine-density-lock-v1.1.md` feed bleed intent — this lock raises **phone** media + horizontal greys to **viewport edge** (0 inset)  
**Amended for feed posts:** [`social-home-post-separation-lock-v1.md`](social-home-post-separation-lock-v1.md) Option A. The feed card and its media stay inside the column. White canvas shows at the sides. Stories rail bleed and the Stories→feed seam stay.
**Out:** Desktop bleed invent · soft “almost full” · bleeding text/meta · website postcard inset media on phone

---

## One lock

**Mobile Social only:** Stories rail bleed stays viewport full-bleed. Feed posts do not — Option A in [`social-home-post-separation-lock-v1.md`](social-home-post-separation-lock-v1.md) keeps the card and its media inside the column. Text, avatar, actions, and captions stay inset. **Desktop feed bleed stays out of scope.**

---

## Phone SoT (concrete)

| Surface | Lock |
|---------|------|
| Post / feed **media** (image · video frame) | **Amended** — card edge, not the viewport. `overflow-hidden` on the card clips it to `radius-lg`. Cite the post-separation lock |
| Horizontal **grey dividers** (`#ECEDF0`) | Stories→feed seam stays viewport full-bleed. The feed post 2px rule is removed |
| Author row · avatar · name · meta · actions · caption · comments teaser | Keep **inset** (house pad H **16** unless a tighter locked surface says otherwise) |
| Stories **rail** host | Full-width **scroll host** (rail reaches viewport edges; cards scroll inside) |
| Stories **viewer** | Already full-bleed — **keep** |
| Compose top/bottom hairlines (#681 v1.6) | On phone, horizontal section greys follow viewport-bleed when they are section lines |
| Page / shell horizontal pad | Frame gutter stays. Feed cards do not cancel it. Stories rail still bleeds through it |

---

## Desktop

**Out of scope.** Do not invent a desktop bleed cousin. Leave desktop Social feed as currently locked elsewhere.

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Desktop media/divider full-bleed this lock | Adam: leave desktop |
| Phone Stories rail inset inside the viewport | Adam FAIL — website feel. Feed cards are the exception: white canvas at the sides |
| Bleeding captions / actions / avatars | Breaks FB text-inset grammar |
| Soft half-bleed | No invent bounce |

---

## FAIL / PASS

| PASS | FAIL |
|------|------|
| Phone Stories rail touches the viewport. Feed posts are surface cards inset on the white canvas | Side gutters on the Stories rail. Feed posts bled to the viewport |
| Text / chrome stay inset | Text also full-bleed |
| Desktop unchanged by this lock | Desktop bleed invent |

---

## Done-when

1. Phone Stories rail L/R flush to the viewport. Feed media meets the card edge.  
2. Phone Stories→feed seam flush to the viewport. Feed post rules are removed.  
3. Text/meta inset.  
4. Desktop left alone.  
5. No Design PR.

**Ship:** Design Own→READY (parallel/after) · Design HOLD invent else.

---

## Report (for CoS)

- **READY:** mobile-only full-bleed media + grey dividers · desktop out  
- **Lock path:** `/workspace/24frame-agg-ux/social-mobile-full-bleed-lock-v1.md` → `docs/design-locks/social-mobile-full-bleed-lock-v1.md`
