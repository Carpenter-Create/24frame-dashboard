# [GC][24Frame] LOCK — Stories Home rail card identity v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam phone 2026-09-24 — avatar is enough · no bottom name on user story cards · CoS Own→READY) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Superseded on the Feed (Adam 2026-10-04, G · Feed):** D's tiles carry no avatar ring; the first name sits under the tile (never on it, no scrim). See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Superseded on the Feed (founder 2026-10-05, H · Feed):** the Feed's story cards carry the avatar ring top-left and the name on the picture ("Elena R.") over a dark scrim, as the approved H board draws them. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Repo citation:** `docs/design-locks/stories-home-rail-card-identity-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/stories-home-rail-card-identity-lock-v1.md`  
**Adam glance:** `/workspace/24frame-agg-ux/stories-rail-identity-adam-glance.png`  
**Bar:** launch-great · Media Immersion · Immersive Social · social density (no redundant chrome) — same instinct as DM header density  
**Phone SoT.** Desktop follows same rail face (no desktop-only name exception).  
**Dev citation surface:** Fold into **#681** amend tip (Home Stories rail chrome / spine density lane). Do **not** open a separate Stories-only tip unless #681 already closed — then #682 only if that tip already owns Home rail.

---

## One lock

On **user** story cards in the Home Stories rail, **top-left avatar identifies the author**. Do **not** also show a name / handle label on the bottom of the media surface (e.g. “ADAM C.”).

---

## Concrete (phone SoT)

| Card | Face lock |
|------|-----------|
| **Other / own live story card** | Full-bleed story media · **top-left** avatar + unseen/seen ring (existing ring SoT) · **no** bottom name · **no** bottom handle · **no** name gradient scrim |
| **Create story card** | Keep existing label grammar — **Create story** on the create card (unchanged). This lock does **not** remove Create’s label |
| Accessibility | Author name stays on `aria-label` / sr-only if needed — **not** visible chrome on the card face |

### Remove (supersede)

From `docs/design-locks/stories-home-rail-fb-card-lock-v1.md` § bottom name gradient / G4 — **OUT** for user story cards:

- Bottom truncated name (`Adam C.` / `SOCIAL_HOME_STORY_NAME_CLASS`)
- Dark → transparent name scrim whose only job is that label

Avatar ring geometry, media cover, Create card split/label, and card sizes stay cited from rail FB card lock + spine density **v1.1** (136×240 phone) — **do not reopen** those here.

---

## Scope

| In | Out |
|----|-----|
| Home Stories **rail card face** only | Stories **viewer** header name (keep — different surface) |
| Phone + desktop same | Desktop-only keep-name invent |
| Soft keep name “for clarity” | FAIL — redundant chrome |
| Dev guessing alternate label | FAIL |

---

## FAIL / PASS

| PASS | FAIL |
|------|------|
| User story cards: media + top avatar only | “ADAM C.” / any bottom name on card |
| Create story still labeled | Stripping Create story label |
| Rail still launch-great media-first | Replacing name with louder chrome |

---

## Done-when

1. Home rail user story cards show **no** bottom name / handle.  
2. Top-left avatar (+ ring) remains.  
3. Create story card still shows **Create story**.  
4. Cite this lock on **#681** amend (preferred) · no Design PR.

**Ship:** Design Own→READY · CoS CLEAR · Dev fold #681 · Design HOLD invent else.
