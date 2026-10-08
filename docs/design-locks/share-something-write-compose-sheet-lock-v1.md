# [GC][24Frame] LOCK — Share something opens write compose as a bottom sheet v1

**Date:** 2026-09-29 (CT)
**Status:** **LOCKED** · CoS / Adam CLEAR · sheet, not a full-page navigation
**Amended 2026-10-08:** [`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md) (Adam, "Open the composer"). On desktop the write compose is the composer window (600, radius 24: close, the avatar beside the field, then Media, Go live and Post), and the side menu's Create opens it too. The phone sheet below is unchanged.
**Repo:** `docs/design-locks/share-something-write-compose-sheet-lock-v1.md`
**Supersedes:** the route-jump presentation in `docs/design-locks/share-something-text-write-direct-lock-v1.md` for the Home prompt + avatar hit only
**Keeps:** that lock’s destination (kind=text write compose, keyboard, attach photo/video, no Create chooser), Home Photo and Camera, bottom-nav +, and the FB-row chrome lock `docs/design-locks/social-home-composer-fb-row-sheet-lock-v1.6.md`
**Inside the sheet:** `docs/design-locks/write-compose-voice-first-immersive-lock-v1.md` and `docs/design-locks/write-compose-immersive-icons-lock-v1.md` still govern the compose craft (X, Post, caption, camera far-right, no feed mic, font ≥16, house light, no shadow)
**Hosts:** HouseOverlay dual-host lock v1 — phone AppSheet, desktop HouseDialog

## One lock

The Home **Share something** prompt + avatar opens **write compose** (kind=text) in a house overlay that **slides up from the bottom** on phone, over Home. It does not navigate to `/social/create` as a full-page load.

## Concrete

| Surface | Lock |
|---------|------|
| Prompt + avatar (`data-social-composer-prompt-row`) | Button. Opens the write sheet. Not a link to `/social/create?kind=text`. Not the Create chooser. `aria-label={SOCIAL.create.title}` stays. Visible text stays **Share something** |
| Phone | AppSheet. Bottom, full width, top radius **16**, pad **16**, max **90vh**, scrim ink **40%**, **no** shadow, rise from the bottom. `md:hidden`. Home stays mounted under the scrim |
| Desktop | *(Superseded 2026-10-08: the composer window, [`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md).)* HouseDialog short form (max **480**). Not an AppSheet promoted into a modal |
| Compose inside | Existing kind=text write compose. Body focused. Attach photo or video stays (camera). No second chooser. No second title row — X and Post stay the chrome. The dialog name is screen-reader only |
| Dismiss | X, scrim, and Escape, per the house sheet. Returns to the same Home. No Social shell remount |
| Deep link and Create **Write** tile | `/social/create?kind=text` stays the page for a direct visit and for the chooser Write tile |
| Home Photo and Camera | Unchanged |
| Bottom-nav + and other Create entries | Create chooser sheet stays |

## URL

House social sheets do not sync a route. Pushing `/social/create` from this hit would remount the Social shell. The create route stays for deep links and the Write tile.

## Explicit OUT

Create chooser on this hit · full-page navigation as the Share something entry · a new overlay host · glass · a drop shadow beyond the house sheet · a drag gesture the house sheet does not have · changing the FB-row chrome · changing Photo / Camera · undraft

## Done-when

Tapping Share something opens write compose in the bottom sheet over Home, with the body focused, and dismiss returns to that Home. Photo and Camera on the Home row stay. Phone dock + fans Media · Write · Go live (`docs/design-locks/social-create-fan-lock-v1.md`). Desktop rail Create opens the composer window (amended 2026-10-08).
