# [GC][24Frame] LOCK — Social dock Create fan v1

**Date:** 2026-10-01
**Status:** **LOCKED** · Adam course-correct · phone dock + drops the Create sheet
**Amended 2026-10-08:** [`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md) (Adam, "Open the composer"). Desktop Create no longer opens the Create dialog: it opens the composer window, with Media and Go live in its tool row. The phone fan is unchanged.
**Amended 2026-10-08 (create matches the fan):** [`social-create-match-fan-lock-v1.md`](social-create-match-fan-lock-v1.md) (Adam, "Match the fan"; the label, 2026-10-09: "Live / Not record", everywhere). The tile label "Go live" is now "Live".
**Arc:** 2026-10-01 tighten · Adam PASS · 90° cluster over the +, scrim and label pills stay
**Route:** 2026-10-01 Go live opens `/social/live` directly. It is not a child of write compose.
**Supersedes:** the bottom-nav + row in `share-something-text-write-direct-lock-v1.md`, `share-something-write-compose-sheet-lock-v1.md`, and `write-compose-immersive-icons-lock-v1.md`. Share something, Photo, and Camera stay on those locks.

## One lock

Tapping the floating dock **+** fans **Media · Write · Go live** in a tight arc above the dock, clustered over the +. There is no Create bottom sheet on that button.

## Concrete

| Surface | Lock |
|---------|------|
| Dock + | Toggle. Open rotates the plus 45° toward ×. Tap + again, tap the scrim, tap outside, or Escape dismisses |
| Arc | 90° over the +, radius 100. Media at 135°, Write at 90°, Go live at 45°. Same three actions. Media still opens the mixed roll. Go live opens `/social/live` |
| Craft | Soft surface circles, hairline, dock float shadow, Regular 24px glyphs, ink-2. Each label sits on a soft surface pill above its circle (hairline, full words, no truncate) |
| Contrast | While open, a soft ink wash at 25% and a light blur cover the feed under the dock. The dock pill and the circles stay clear. Not the house sheet’s 40% wash and not a sheet |
| Motion | Scale out from the + and back. The scrim fades with the fan. Reduced motion skips the transition |
| Other dock items | Feed (was Home), Explore, Messages, Profile stay |
| Dock + face | Accent circle (`bg-accent text-accent-contrast`) inside the pill — [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md), Adam 2026-10-04. A 2px accent ring marks it on its own route. The fan circles stay surface |
| Desktop rail Create | *(Superseded 2026-10-08: opens the composer window, [`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md).)* This lock is the phone dock |
| Home composer | Share something, Photo, and Camera stay. They do not open this fan |

## Explicit OUT

A Create sheet or waffle clone on the dock + · accent-filled tiles · new actions · changing the other four dock glyphs · DNS, mail, SES
