# [GC][24Frame] LOCK — Explore For You immersive v2

**Date:** 2026-09-26 (CT)  
**Status:** **LOCKED** · Adam LOCK Explore v2 2026-09-26 · **video-only** fold 2026-09-26 · Design Own→READY · Design no PR · CoS CLEAR Dev after READY  
**Repo:** `docs/design-locks/social-explore-for-you-immersive-lock-v2.md`  
**Box:** `/workspace/24frame-agg-ux/social-explore-for-you-immersive-lock-v2.md`  
**Supersedes:** `social-explore-discovery-lock-v1.md` (IG grid) · **#693 DRAFT wrong shape** — do not invent on grid; ship from this v2  
**Standing:** Immersive Social · Media Immersion Doctrine · launch-great · rich-calm v1.4 · quiet redundant-chrome · spacing **8 / 16 / 24 / 48** · **no** drop shadows · Geist · Sporty Blue `#1769FF` · mobile never-truncate  
**Scope:** `/social` **Explore** only  
**Cites:** `social-video-mux-only-lock-v1.md` · `social-home-post-actions-align-lock-v1.md` (40/24/gap-8) · `social-post-share-sheet-ig-lock-v1.md` · photo-scale immersive stage tokens (dark stage / scrim) for chrome grammar only — **not** Home feed post face navigation

---

## One lock

**Explore default = TikTok-style vertical immersive For You. Full-screen video-only discovery · vertical swipe · people / keywords / hashtags discovery. Stay in immersive media forever on open — NEVER navigate to Home feed post face. No photos in the vertical For You feed (Adam LOCK 2026-09-26).**

---

## A) For You host

| Token | Lock (one SoT) |
|-------|----------------|
| Default | Explore opens **For You** vertical immersive stream |
| Stage | Full viewport media · near-black **`#0A0A0B`** letterbox only if needed · **Media Immersion** (not a grid, not a paper card feed) |
| Fit | Active item **`object-fit: cover`** · fills stage (vertical-first) |
| Swipe | Vertical snap · one item per viewport · next/prev For You |
| Video | Mux-only play surface · autoplay when active · pause when off-screen · cite Mux-only |
| Media kinds | **Video only** in For You / discovery streams · **photos OUT** of vertical Explore feed |
| Social shell | Existing Social tab dock may remain for IA · media fills the Explore content area · **0** Home-feed post chrome |
| Fail | Soft grid of thumbs · FB mosaic · dumping user onto Home post unit · photo tiles in For You |

**FAIL:** IG Explore grid as primary (#693 / v1) · photos in vertical Explore.  
**PASS:** Full-screen vertical **video** · app immersion · swipe For You.

---

## B) Chrome on the immersive face (stay in media)

| Token | Lock (one SoT) |
|-------|----------------|
| Open / tap | **Stay in immersive** · deepen chrome or play/pause · **NEVER** route to Home feed post face / caption-above feed unit |
| Actions | Like · Comment · Share — geometry cite post-actions (40/24/gap-8) · TikTok-class **trailing** rail on the media · liked = Sporty Blue · light ink on dark |
| Caption / meta | Bottom-leading on media · scrim (~40%→0 over **120**) · username + caption · house Geist · never-truncate by stacking (mobile gospel) |
| Comment | Sheet / thread **over** immersive · dismiss returns to same For You item · does **not** leave Explore for Home |
| Share | Existing Share sheet lock · over immersive |
| Author | Tap avatar/name → profile (allowed leave) · media open itself does **not** become Home feed |

---

## C) Discovery (people / keywords / hashtags)

| Token | Lock (one SoT) |
|-------|----------------|
| Entry | Search / discover control on Explore · inset from safe edges · quiet chrome |
| Results | People · keywords · hashtags — selecting one filters or starts a **vertical immersive** stream of matching **video** |
| Shape | Results stay **immersive video** (same For You host) · **not** a Home feed list · **not** the superseded IG grid as primary · **no** photo results in this stream |
| Clear | Returns to default For You |

---

## D) Photos — LOCKED OUT of vertical Explore

**Adam LOCK 2026-09-26:** Explore v2 For You / discovery vertical feed = **video-only**. **No photos** intercalated in the vertical stream.

| Token | Lock |
|-------|------|
| For You | Video only · Mux |
| Discovery streams | Video only (people / keywords / hashtags filters) |
| Photos | Stay on Home / Profile / Create — **not** Explore vertical |
| Rejected | Photo intercalation · still grids · photo tiles in For You |

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| IG-class discovery grid as Explore primary | Superseded · #693 wrong shape |
| Navigate open → Home feed post face | Adam: stay in immersive media |
| Caption-above Home stack inside Explore open | Home grammar for Home · Explore = vertical immersive |
| FB collage / mosaic | Out |
| Inventing on grid while v2 ships | Do not · supersede via this lock |
| Photos in vertical For You / discovery | Adam LOCK video-only |
| Design PR | CoS seeds · Dev ships after CLEAR |

---

## Must-fix

1. Explore default = vertical full-screen For You · vertical swipe.  
2. Open/tap stays in immersive media — never Home feed post face.  
3. Discovery (people / keywords / hashtags) stays immersive **video** stream.  
4. Mux-only video · Media Immersion cover stage.  
5. Vertical Explore = **video-only** · photos OUT (§D).  
6. v1 grid / #693 superseded.

---

## Done-when

1. Tip cites this v2 lock · Adam glance: TikTok-class video For You · not grid · no photos in stream.  
2. Design Own→READY · CoS CLEAR Dev · #693 reshaped or replaced to this lock.

**Ship:** Design Own→READY · CoS routes Dev.
