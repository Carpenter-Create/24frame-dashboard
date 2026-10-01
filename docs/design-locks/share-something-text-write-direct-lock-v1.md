# [GC][24Frame] LOCK — Share something text opens write compose v1

**Date:** 2026-09-25 (CT)  
**Status:** **LOCKED** · Adam FAIL on the Create sheet hop · Design no PR · path stays `docs/design-locks/share-something-text-write-direct-lock-v1.md`  
**Box:** `/workspace/24frame-agg-ux/share-something-text-write-direct-lock-v1.md` — checked 2026-09-25; that file was not in the tree. This lock records the approved SoT from the CLEAR.  
**Cite:** Home composer FB-row v1.6 stays. Photo and Camera icons stay. Create sheet stays on bottom-nav + and other Create entries.
**Dock + superseded (2026-10-01):** the phone dock + fans Media · Write · Go live. See `docs/design-locks/social-create-fan-lock-v1.md`. Desktop rail Create stays the dialog.
**Entry presentation superseded (2026-09-29):** the Home prompt + avatar open that same write compose in a bottom sheet. See `docs/design-locks/share-something-write-compose-sheet-lock-v1.md`. Kind, attach, Photo, Camera, and Create + in this lock stay. Deep link and the Create Write tile still use `/social/create?kind=text`.

## One lock

The Home **Share something** text / placeholder hit opens **write compose** immediately, with the keyboard. It does not open the Create sheet (Media / Write / Go live).

## Concrete

| Surface | Lock |
|---------|------|
| Prompt + avatar (`data-social-composer-prompt-row`) | Write compose in the house bottom sheet (`docs/design-locks/share-something-write-compose-sheet-lock-v1.md`). No Create sheet. `aria-label={SOCIAL.create.title}` stays. Visible text stays **Share something** |
| Write compose | Existing create surface, kind text. Body field focused for the keyboard |
| Attach | That write compose can attach photo or video (`Add photo or video`). No second chooser |
| Home Photo and Camera | Unchanged. Same media picks, glyph 16, hit 32 |
| Bottom-nav + and other Create entries | Create sheet stays |

## Explicit OUT

Inventing a menu · Groups · #682 · #683 · changing Photo / Camera · reopening composer chrome, Topics, full-bleed, or post actions · undraft

## Done-when

Tapping Share something lands on write compose with the keyboard up, and that compose can attach media. Photo and Camera on the Home row stay. + still opens the Create sheet.
