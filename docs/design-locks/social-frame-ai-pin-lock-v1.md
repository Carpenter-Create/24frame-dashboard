# [GC][24Frame] LOCK — 24Frame AI pin on Social Messages and send grids v1

**Date:** 2026-10-01  
**Status:** Adam product lock. Draft until founder PASS.  
**Repo citation:** `docs/design-locks/social-frame-ai-pin-lock-v1.md`  
**Amends:** `social-dms-inbox-ig-lock-v1.md` (first thread only) · `social-post-share-sheet-ig-lock-v1.md` (first grid cell only) · `stories-send-dm-craft-lock-v1.md` (first grid cell only) · `dm-thread-immersive-real-estate-lock-v1.md` (this route is a DM thread)

---

## One lock

24Frame AI is the first Messages thread and the first person in share and send grids. It stays pinned. Human threads and people keep their existing order underneath. Opening it opens one DM-shaped conversation at `/social/dms/24frame-ai`. The brain is the existing Ask 24Frame AI stack. It is not a human direct message and not a second assistant.

---

## A) Messages list

| Token | Lock |
|-------|------|
| Place | First row of `/social/dms`, including an otherwise empty inbox |
| Label | `24Frame AI` (`ASSISTANT_NAME`) |
| Face | House sparkle mark on the person-avatar circle |
| Open | `/social/dms/24frame-ai` — same chrome as a DM thread (back, face, title, bubbles, Message… composer). The Social header and phone dock hide, same as a human thread |
| Order | Not sorted by recency under human chats |
| Search | Client filter already on the list. A query that misses the name hides the row. A query that hits it keeps the row first |
| Empty copy | Hidden while this row is present |

`/social/dms?ai=1` is not the open. The house shell treats that query as the inbox screen, so the overlay never mounts.

---

## B) Share and send people grids

| Token | Lock |
|-------|------|
| Surfaces | Post Share sheet and Stories Send sheet people grid and search results |
| Place | First cell when the query matches or is empty |
| Open | Same conversation. Post share adds `?post=`. Story send adds `?story=`. The sheet closes. The thread shows the existing DM share card for that visit |
| Send | The cell does not select a recipient and does not call `open_or_get_direct_conversation` |
| Identity | Stable id `24frame-ai`. Not a profile id |
| Model | The card is context on the thread. It is not an Ask turn and does not run the model by itself |

---

## C) Thread

| Token | Lock |
|-------|------|
| Route | `/social/dms/24frame-ai` |
| Chrome | DM thread header, message column, composer. Placeholder `Message…`. House sparkle for 24Frame AI. Back returns to Messages |
| Brain | `startAskFrameAiConversation`, `appendAskFrameAiTurn`, `completeAskFrameAiTurn`. Same rows, same operator. Latest Ask conversation by `updated_at` |
| Opener | `What's on your mind?` once, when the thread has no stored messages. Display only. Not written. Not sent |
| History | Stored turns render as bubbles. No opener |
| Gate | If Ask is not unlocked, the thread still opens. Existing included / upgrade copy. No opener. No local reply |
| Header Ask | Unchanged. Overlay on the current path |

---

## OUT

- A second model, prompt set, or Muse product
- Sending the opener, or running the model because a post was shared
- Overlay as the Messages or share open path
- Dock gospel, Create fan, Go live
- New-message compose roster
- Notes tray, request filters, or a second assistant glyph
