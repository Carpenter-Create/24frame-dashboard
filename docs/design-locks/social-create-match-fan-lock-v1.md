# [GC][24Frame] LOCK — Create matches the fan: Media · Write · Record, one writer v1

**Date:** 2026-10-08 (CT)
**Status:** **LOCKED** (Adam, 2026-10-08, in chat) · Design Own→READY
**Scope:** Social create on the phone and desktop: the + fan's labels, the Feed's "Share something" row, and the write composer on every host (the desktop window, the phone sheet, the full-page writer).
**Entity:** Global Content / 24Frame only
**Supersedes (in part):**
- [`social-create-fan-lock-v1.md`](social-create-fan-lock-v1.md): the tile label "Go live" is now "Record".
- [`share-something-write-compose-sheet-lock-v1.md`](share-something-write-compose-sheet-lock-v1.md): "Home Photo and Camera" (now the fan's Media and Record), and the phone sheet's layout (the X and Post bar on top, the caption row at the bottom).
- [`write-compose-immersive-icons-lock-v1.md`](write-compose-immersive-icons-lock-v1.md) and [`write-compose-voice-first-immersive-lock-v1.md`](write-compose-voice-first-immersive-lock-v1.md): the full-page writer's layout (top X and Post, the bottom caption row with the camera glyph).
- [`social-go-live-camera-chrome-lock-v1.md`](social-go-live-camera-chrome-lock-v1.md): the camera's header reads "Record".

---

## Founder direction (verbatim, 2026-10-08)

> I love the lower nav bar and radius menu including media, post/write, and go live. But maybe we can use better/one words?

> But, my issue is more so with the share something row and how the options work. Is it just me or can this flow better?

> The experiences (radius menu versus write something row) don't quite feel the same....or the radius menu feels more modern/current/up to date and the write something row almost feels 'behind'

Asked, the founder picked **"Media · Write · Record (Recommended)"** (one word each, and true: the camera records a clip, then posts it; nothing streams live) and **"Match the fan (Recommended)"**: the row's rounds are the fan's Media and Record, Record opens the 24Frame camera (never the phone's own camera app), and the write composer takes the desktop window's layout on the phone too.

---

## 1) Labels

| Token | Lock |
|-------|------|
| Fan tiles | **Media · Write · Record** (the tile list, `SOCIAL_CREATE_TILES`, is the one source) |
| Record everywhere | The same word names the camera's header, the composer's Record glyph, and the row's Record round. Glyphs unchanged (image, pencil, broadcast) |

## 2) The "Share something" row

| Token | Lock |
|-------|------|
| Layout | Unchanged: the 44 avatar, the pill, two round 44s on the in-card fill |
| Rounds | The fan's **Media** and **Record** tiles, read from the tile list: same glyph, name, and act |
| Media | The same media pick the fan's Media opens (iOS shows its own Photo Library / Take Photo / Choose Files menu first; a web page cannot skip it) |
| Record | A link to the 24Frame camera (`/social/live`), remembering where it opened. No `capture` input: never the phone's own camera app |
| Prompt | Unchanged: opens the one write composer |

## 3) One writer, three hosts

| Token | Lock |
|-------|------|
| Layout | The desktop window's ([`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md) §2) on every host: the round grey 44 close; the 40 avatar beside the field (17 / 420, line 1.5; placeholder "Share something"); attached media under the text; a hairline, then the tool row: round grey 44 **Media**, round grey 44 **Record**, the **Post** pill at the end |
| Desktop window | Hugs its content, as locked |
| Phone sheet | Fills the sheet: the tool row sits at its bottom, above the keyboard (the sheet already tracks the visual viewport) |
| Full page (`/social/create?kind=text`, the fan's Write) | Fills the viewport (pinned to the visual viewport): the tool row at the bottom, above the keyboard. Close leaves to Home |
| Field size | 17px (iOS Safari zooms the page on a field under 16px) |
| Gone | The phone's top X + Post bar, the bottom caption row and its camera glyph |
| Copy | Existing only: "Share something", "Add photo or video", "Record", "Close", "Post" |

## Explicit OUT

- The phone's own camera app from any Social create entry
- New glyphs (Record keeps the broadcast glyph; a change is a separate founder call)
- Changes to the fan's motion, the media caption step, or the camera itself

## Verify-on-ship

1. Phone: the dock's + fans Media · Write · Record.
2. Phone Feed: the row shows the avatar, the pill, then Media and Record. Record opens the 24Frame camera; X returns to the Feed.
3. Phone: tap "Share something": the sheet shows the close, your avatar beside the field, and Media · Record · Post above the keyboard.
4. Phone: the fan's Write opens the same layout full-page.
5. Desktop: the composer window is unchanged except the Record name.
