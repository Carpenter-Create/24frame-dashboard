# [GC][24Frame] LOCK — Messages inbox IG DM list v1

**Date:** 2026-09-29  
**Status:** **CoS list lock** for the Messages inbox page only. Draft until founder undraft.  
**Repo citation:** `docs/design-locks/social-dms-inbox-ig-lock-v1.md`  
**Reference:** Instagram DM inbox — handle + pencil compose, search pill, thread rows (avatar, name, preview, relative time, blue unread dot), no full-width hairlines between rows.  
**Scope:** `/social/dms` list page. Thread `dms/[id]` and compose immersion stay closed.  
**Cites:** `src/lib/house-phone-shell.ts` (IA A — destinations live in the floating phone dock) · `dm-thread-immersive-real-estate-lock-v1.md` (inbox keeps Social chrome and the dock; thread hide stays on the thread) · `dm-compose-immersive-ia-lock-v1.md` (New message at `/social/dms/new` — this lock only links the pencil)

---

## One lock

The Messages list drops the page title block. Chrome is an IG-style list header (viewer handle, or **Messages** when there is no handle) with a pencil that opens the existing compose route, a search pill under that header, and thread rows with vertical spacing instead of full-width hairlines. The house shell and the phone dock stay. Primary tabs do not move to the top.

---

## A) List header

| Token | Lock |
|-------|------|
| Page title block | **OUT** — no `PageHeader`, no subtitle, no “Start a conversation” text link |
| Title | Viewer handle when a profile exists (no `@`). Otherwise `Messages` |
| Compose | Pencil, top-right, hit 44, glyph 24. `href` `/social/dms/new`. Accessible name stays **Start a conversation**. Omitted when there is no profile |
| Host | Inside the Social center column, under the existing house shell. Same on phone and desktop |

---

## B) Search

| Token | Lock |
|-------|------|
| Place | Under the list header |
| Face | House search pill (`rounded-full`, muted fill, MagnifyingGlass) |
| Placeholder | Existing copy **Search** |
| Behavior | Client filter of rows already loaded (name and preview). No new API |
| Shell search | Stays. This pill does not replace it |

---

## C) Thread row

| Token | Lock |
|-------|------|
| Order | Avatar · name · preview line with trailing relative time · unread dot |
| Hairline | **OUT** — no `border-b` on inbox rows |
| Rhythm | Vertical padding `--space-3`. No full-bleed rule |
| Preview | Existing excerpt. Wraps. Does not use line-clamp |
| Time | `socialRelativeTime` on `last_message_at` (`2h`, `45m`, and the helper’s existing older forms). Trails the preview on the same line with a middot when both exist |
| Unread | Blue dot, `bg-accent` (Sporty Blue `#1769FF` in light). Replaces the visible “N unread” line. Count stays on the dot’s accessible name |
| Name | Semibold when unread, medium when read. Wraps |

---

## D) Chrome around the list

| Token | Lock |
|-------|------|
| House shell | Stays on the inbox |
| Phone dock | Stays. IA A: Home · Explore · Create · Messages · Profile live in the floating dock |
| Tab flip | **OUT** — do not move primary tabs to a top bar |
| Desktop For You | Stays in the existing slot beside the center column |
| Thread route | Unchanged. Dock hide remains the thread immersive lock |
| Compose route | Unchanged beyond the pencil link |

---

## OUT

- Notes tray (no source of truth)
- Primary / Requests / General filters
- Rewriting `dms/[id]` or compose immersion
- New time-format family
- Invented search, notes, or filter copy

---

## FAIL / PASS

**PASS:** List header is handle (or Messages) plus pencil. Search pill filters loaded rows. Rows have no full-width hairline, show preview with relative time, and mark unread with a blue dot. Dock and For You stay.  
**FAIL:** Page title + subtitle + text link still lead the list. Hairlines between rows. “N unread” as a text line. Notes or request filters invented. Primary tabs moved above the list. Thread or compose chrome rewritten in this pass.
