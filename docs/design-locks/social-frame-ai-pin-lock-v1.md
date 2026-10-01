# [GC][24Frame] LOCK — 24Frame AI pin on Social Messages and send grids v1

**Date:** 2026-10-01  
**Status:** Adam product lock. Draft until founder PASS.  
**Repo citation:** `docs/design-locks/social-frame-ai-pin-lock-v1.md`  
**Amends:** `social-dms-inbox-ig-lock-v1.md` (first thread only) · `social-post-share-sheet-ig-lock-v1.md` (first grid cell only) · `stories-send-dm-craft-lock-v1.md` (first grid cell only)

---

## One lock

24Frame AI is the first Messages thread and the first person in share and send grids. It stays pinned. Human threads and people keep their existing order underneath. Opening it opens the existing Ask 24Frame AI overlay. It is not a direct message.

---

## A) Messages list

| Token | Lock |
|-------|------|
| Place | First row of `/social/dms`, including an otherwise empty inbox |
| Label | `24Frame AI` (`ASSISTANT_NAME`) |
| Face | House sparkle mark on the person-avatar circle |
| Open | `/social/dms?ai=1` — the shell overlay on Messages |
| Order | Not sorted by recency under human chats |
| Search | Client filter already on the list. A query that misses the name hides the row. A query that hits it keeps the row first |
| Empty copy | Hidden while this row is present |

---

## B) Share and send people grids

| Token | Lock |
|-------|------|
| Surfaces | Post Share sheet and Stories Send sheet people grid and search results |
| Place | First cell when the query matches or is empty |
| Open | `?ai=1` on the current path. The sheet closes so the overlay is the front surface |
| Send | The cell does not select a recipient and does not call `open_or_get_direct_conversation` |
| Identity | Stable id `24frame-ai`. Not a profile id |

---

## OUT

- A new AI product, prompt, or share-into-chat pipeline
- Dock gospel, Create fan, Go live
- New-message compose roster
- Notes tray, request filters, or a second assistant glyph
