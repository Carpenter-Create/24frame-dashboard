# [GC][24Frame] LOCK — Desktop Create opens the composer v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** Desktop (`md+`) Social only: the side menu's Create row, and the write composer window that it and the Feed's **Share something** open. The phone is unchanged: the dock's + still fans Media · Write · Go live ([`social-create-fan-lock-v1.md`](social-create-fan-lock-v1.md)), and Share something still opens the bottom sheet ([`share-something-write-compose-sheet-lock-v1.md`](share-something-write-compose-sheet-lock-v1.md)).  
**Entity:** Global Content / 24Frame only  
**Amended 2026-10-08 (one window, one author):** Adam, in chat: "also, the avatar doesn't show" (Create showed initials; Share something showed the photo), then: "that tells me you are probably not coding the two from a single source of truth, but making two separate components look the same. is that correct?" It was one window fed by two author sources. Now the shell owns the only window (`SocialComposeContext`); Create and Share something both open it, with one author, the shell's account identity (the header avatar's face, `/api/account/photo`), which the Social avatar loads directly with the session.  
**Amended 2026-10-08 (create matches the fan):** [`social-create-match-fan-lock-v1.md`](social-create-match-fan-lock-v1.md) (Adam, "Media · Write · Record", "Match the fan"). The phone sheet and the full-page writer now take this window's layout too, and the Go live glyph is named "Record".
**Avatar rule (Adam, 2026-10-08, in chat):** "the avatar should always use whatever the users 24frame avatar in their global settings is. however, if they update the avatar on social, then the avatar should upsert globally. two-way." Held by construction: one object per person (`avatars/{user-id}/avatar`), written only by the account actions, which Settings and every Social photo editor call (guard: `src/lib/avatar-single-source.test.ts`).  
**Supersedes (in part):**
- [`social-create-fan-lock-v1.md`](social-create-fan-lock-v1.md) "Desktop rail Create: Existing Create dialog stays." The desktop Create dialog (the Media · Write · Go live tiles) is gone.
- [`share-something-write-compose-sheet-lock-v1.md`](share-something-write-compose-sheet-lock-v1.md) "Desktop: HouseDialog short form (max 480)" and its Done-when "Desktop rail Create stays the dialog". The desktop host is the window below. Inside it, the phone sheet's top bar (X and Post) and bottom caption row give way to the window's own layout; the phone sheet keeps them.

---

## Founder direction (verbatim, 2026-10-08)

> also, the app looks premium and new but this create menu is still the old look on desktop and/or just doesn't match the bar we've set on everything else.

A small menu beside the Create row was offered and first picked ("Menu by Create"). Then:

> should we do the radius menu like mobile on desktop?

> or do like X where when you select post, the window to post opens and from there you select which type of post?

Asked "Which should desktop Create be?", the founder picked **"Open the composer (Recommended)"**: Create opens the same composer window Share something opens, focused on the text; photo/video attach and a Go live glyph sit in its tool row; the window comes up to the new look; no chooser.

---

## 1) Create

| Token | Lock |
|-------|------|
| Trigger | The side menu's Create row (expanded and collapsed) stays an ordinary row ([`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) §2). A button with `aria-haspopup="dialog"` |
| Opens | The composer window (§2) at once, the text focused. No chooser, no menu, no tiles |
| Author | The shell's account name and photo (the same photo the Feed's composer shows). Unknown name: "You" (the Create page's fallback) |

## 2) The composer window (desktop)

| Token | Lock |
|-------|------|
| Host | The house dialog over the house scrim (ink 40%), centred. Escape, the scrim, and the close dismiss it |
| Panel | **600** wide (92vw cap), radius **24** (the Feed card's), **no edge**, no shadow, pad **16**, the page surface. It hugs its content up to 80vh; the text and media scroll inside |
| Close | Top left: the round grey **44** (the header controls' class) with the **20** X |
| Body | 8 under the close: the **40** avatar, **12**, then the field, set in the post's own desktop type (**17 / 420**, line 1.5, ink; placeholder "Share something" in ink-2), its first line on the avatar's centre, at least 120 tall and growing. Attached photos and videos stack under the text, radius **16** (the card media's), up to 320 tall each, a round grey 44 remove on each |
| Tool row | A hairline, 12, then: round grey **44 Media** (the 20 image glyph; opens the photo-and-video library, multiple) and round grey **44 Go live** (the 20 broadcast glyph; opens `/social/live`, remembering where it was opened, and closes the window), 8 apart; at the end the **Post** pill (accent, 40 tall, radius full, 15 / 500). Post is disabled only while media uploads (the sheet's rule) |
| Copy | Existing strings only: "Share something", "Add photo or video", "Go live", "Close", "Post" |

## 3) Menus (found while building §1)

The house menus (the post ··· menu and every Radix menu) move focus to the row under the pointer, and the house focus ring (`:focus-visible`, globals.css) followed the mouse onto those rows and squared the 12 panel to 4. Menus now mark the active row with their highlight wash only, and keep their own radius. The trigger keeps the ring for keyboard users.

---

## Explicit OUT

- A desktop chooser of any shape: tiles, a menu, or the phone's radial fan
- The window on phone
- New copy, drafts, audience or schedule controls
- A drop shadow, glass, or an edge on the panel

---

## Gates

**G1.** `AppShell` owns the window and its open state, above the side menu's Suspense swap (fallback → resolved), so a draft survives the chrome resolving. Social's Create row in `side-nav.tsx` is a dialog trigger (`data-social-create-compose="dest"`, `aria-haspopup="dialog"`, `onClick={compose?.onOpen}`). `social-create-sheet.tsx` (the tile dialog) is gone. The window's field has its own id (it can open over the Create page's).  
**G2.** `SocialWriteComposeSheet` passes `presentation="dialog"` on desktop and `panelClassName={SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS}` (`w-[min(92vw,600px)] rounded-[var(--radius-xl)] border-0 p-[var(--space-4)]`).  
**G3.** The dialog presentation reads close → avatar + field → tool row (Media, Go live, Post); Media and Go live use `HOUSE_HEADER_ROUND_BUTTON_CLASS` with 20 glyphs; Go live calls `rememberSocialGoLiveOpener` before closing.  
**G4.** Only the full page pins the compose form to the viewport (`presentation !== "page"` returns early), so the window hugs its content.  
**G5.** globals.css: `[data-radix-menu-content]:focus-visible` and its `[role="menuitem"]:focus-visible` drop the outline and revert the radius to the layer's.

## Verify-on-ship

1. Desktop, light and dark: Social → Create in the side menu, expanded and collapsed. The window opens with the cursor in the field; type, then Post.
2. Media in the tool row: pick a photo and a video; both preview under the text; remove one.
3. Go live: lands on the Go live screen; leaving it returns to where Create was opened.
4. The Feed's Share something opens the same window.
5. Phone: the dock's + still fans; Share something still opens the bottom sheet.
6. Open a post's ··· menu and hover its rows: grey wash, no blue ring; the panel's corners stay round.
