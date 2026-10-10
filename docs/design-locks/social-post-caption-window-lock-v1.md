# [GC][24Frame] LOCK — Edit caption: the window over the post v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "approved, use the defaults") · Design Own→READY
**Amended 2026-10-10:** [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md) (Adam, 2026-10-09, "approved, do it after Edit caption merges. make both better than it is."): the menu item reads **Edit caption** (was Edit; `SOCIAL.post.edit` retired); on a phone it is a row in the ⋯ sheet; Delete is **Remove**.
**Scope:** The author's Edit caption from a post's ⋯, wherever `SocialPostCard` renders: the Feed (both lanes), a group, your own Profile Activity (the Comments pill included), a member's profile showing your posts, and the permalink. Also the places this device shows the edited words: the card, the tap immersive, Explore For You, and the Feed's reel tiles.
**Entity:** Global Content / 24Frame only
**Follows:**
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md) (the object-edit job)
- [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md) (the ask)
- [`aggregation-title-details-window-lock-v1.md`](aggregation-title-details-window-lock-v1.md) (the phone sheet)
- [`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md) (the avatar, field and preview)

**Amends:**
- [`social-confirm-copy-lock-v1.md`](social-confirm-copy-lock-v1.md): Edit caption has no Cancel.
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md): one-face windows, and a leftover window address.
- [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) §7, the ⋯ row: Edit caption opens this window (the label was Edit until 2026-10-10, [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md)).

**Supersedes:** the 480 Edit caption dialog with its Cancel · Save footer.

---

## 0) Founder direction (verbatim)

Asked to build the window audit's recommendations (recommendation #3, Edit caption):

> make sure we do your recommendations above, resolve any flaw or security issues, and let me know if you still need me to answer anything that I may have missed.

The open questions, answered on 2026-10-09:

> approved, use the defaults

| Question | Decision (the default) |
|----------|------------------------|
| Approve the lock: Edit caption becomes the house window (✕ · Edit caption · Done), retiring Save and Cancel here | LOCKED as written. |
| Phone: the same window as the full AppSheet, or keep the AppSheet card with Cancel / Save and no ask | The full AppSheet through the shell. |
| The ask: title and buttons only, or add a line "Caption isn't saved." (new copy) | No line, so no new copy. |
| Save: optimistic (the words show at once; a failure reopens with the draft), or wait for the server | Optimistic. |
| Media: every item stacked, or only the first | Every item stacked, read-only. |
| Also stop Delete sending database text to the browser, in this PR | Yes, in this PR. |
| File two gaps as follow-ups: `posts.body` has no database length limit; a post still being published shows ⋯ and its edit fails | Both filed below. |
| After the independent review the build changed underneath, with no change to copy or look: one caption host for all of Social (one caption window at a time; a failure that lands while another post's window is open reopens after it closes); the edited words also show in Explore and the Feed's reel tiles; the shared window shell gets a three-line fix so Back always asks. Proceed in this PR? | Yes, in this PR. Each item is covered by tests and recorded here. |
| Eight more places in the same server file still send database text to the browser (follow, like, story send, comment delete). Fix them here or as a follow-up? | A follow-up, listed below with the other two. This PR stays one lock row. |

Refined after independent review, engineering only, no copy or look change: one window at a time; the edited words also show in Explore and the Feed's reels; a leftover window address gets its own Back entry.

Refined after the second review, engineering only, no copy or look change: Edit opens at once on a profile tab or activity pill (those never load in Next, so only a Home lane still loading holds it); a window that reopens while browser Back closes another keeps its own entry, so its close goes Back.

---

## 1) Desktop — the window

The house window shell (`components/chrome/house-window`) over the page that shows the post. There is no route change and no skeleton.

| Token | Lock |
|-------|------|
| Geometry | The 600 window (`HOUSE_DIALOG_WINDOW_CLASS`). It holds the height it opens at, up to 80vh. |
| Header | ✕ · Edit caption · Done. One face: no Back. |
| Body | Pad 24. The 40 avatar beside the caption field, in the composer's field type: 17 / 420, line 1.5 (the post's desktop type), the first line on the avatar's centre. On a phone the field stays 17 (a post reads 15 there), so iOS never zooms. |
| Field | Placeholder "Add a caption…". Cap 2,000. It grows to 40% of the viewport, then scrolls. |
| Media | Under the field, every media item stacked, read-only, at the composer's preview: min(40vh, 320), radius-lg, surface-muted. A photo shows its still; a video shows its poster with the play disc. No add, no remove, no player, no tap. |
| Overflow | Taller content scrolls inside the body. |
| Esc | The ask (Keep editing), then the window. A double Esc never discards. |
| Keys | ⌘/Ctrl+Enter is Done. Tab stays inside the window. |
| Focus | Opens in the field with the caret at the end; returns to the ⋯ on close. |

## 2) Phone — the same window as the full sheet

The same header, field and media fill the full AppSheet (`APP_SHEET_FULL_HOST_CLASS`), clear of the status bar and the home indicator. The ask is the sheet card, Keep editing first. A resize swaps the host and keeps the draft. The composer's own 90vh sheet is unchanged.

## 3) One draft, one Done

- The draft is the caption as it shows on this device when the window opens.
- Done checks first, and nothing is sent on a problem. The line sits under the field:
  - an emptied text post: "Write a post or attach a photo or video.";
  - over 2,000 characters: "That caption is too long.".
- Unchanged: Done closes.
- Changed: the new caption shows at once on this device (the card, the immersive, Explore, the Feed's reel tiles), the window closes, and the save runs in the background.
- On failure the last caption the server holds comes back, and the window reopens with the draft and the error ("Could not save that caption." or the server's refusal).
- Saves for one post go out in order; only the latest edit can reopen the window.
- Opening a post whose save is still out waits (the window is inert, Done held) until it answers.
- One caption window at a time. A failure that lands while another post's window is open reopens when that one closes. A removed post never reopens.
- No page refresh. Every surface that shows a post's words on this device reads the owner's edit (`useSocialPostLiveBody`); a new one must too.
- A post shared into Messages keeps the caption as it was sent.

## 4) Leaving with changes

"Discard changes?" · Keep editing · Discard, with no line under the title. It is Edit profile's approved ask, drawn by the shell: a strip at the window's foot on desktop (Discard, then Keep editing, focused), the AppSheet card on a phone (Keep editing first). Reloading or closing the tab raises the browser's own prompt.

## 5) Address

- `?caption` is the window's own history entry, written with the browser's own call and its own flag. Every other param is kept and the screen never remounts. The post is never in the address.
- Browser Back and the phone back gesture close the window, asking first when there are changes.
- An address that arrives with `?caption` opens nothing (a reload has no draft). The next Edit puts the page under it and pushes the window's own entry, so Back still asks.
- An Edit chosen while a Home lane is still loading, or while the last window's Back is still landing, opens once that lands, if its post is still on the page. A failed save waits for the same.
- Browser Back before the window's code has loaded closes it there (nothing is typed yet) through the host's own close, so focus returns to the post's ⋯ and the next Edit opens.
- A profile tab or activity pill (Posts, Photos, Videos, Comments), yours or a member's, never holds an Edit: the shell keeps those pills client-only, so Next's address stays behind them by design. The window opens at once over the pill and keeps its query.

## 6) Who

- The author only. The ⋯ shows only on the author's own posts; that is a convenience, not the gate.
- The server checks the post id (a uuid) and the length before anything else: before it reads, and before it can create a profile.
- It reads the post under row security (active posts only), refuses a non-author, and writes the body only.
- The database stamps `edited_at` and refuses every other field.
- Database text is logged on the server; the browser gets the fixed line. A dropped connection gets the same line, for Edit caption and for Remove.
- An invalid group in the request is never refused; it only skips refreshing that group's page.

## 7) Not

- No media change.
- No Save / Cancel footer.
- No route.
- No dialog over a dialog.
- No new copy.
- Remove keeps its confirm (Remove this post? · Keep · Remove), now the house ask ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md)).

## Copy

**Existing, reused:** "Edit caption", "Post options", "Close", "Done", "Back" (required by the shell, never shown), "Add a caption…", "Discard changes?", "Keep editing", "Discard", "Photo", "Video", "That caption is too long.", "Write a post or attach a photo or video.", "Could not save that caption.", "Could not remove that post.", "Only the author can change this post.", "That post is not visible.", "Create a creator profile to post, like, comment, or message.", "Not authenticated." ("Edit" retired 2026-10-10: the menu reads "Edit caption".)

**Retired:** "Save" and "Cancel" (`SOCIAL.post.editSave`, `SOCIAL.post.editCancel`).

**New, pending founder approval:** none. This window adds no user-facing line.

## Follow-ups (not in this PR)

- Eight more raw database messages in `src/app/(app)/social/light-actions.ts` (follow, like, story send, comment delete).
- `posts.body` has no database length check, so an author calling the database directly could store more than 2,000 characters. The fix is SQL the founder applies; an agent only drafts it.
- Edit on a post that is still being published (its card has no server id yet) reopens with "That post is not visible.".

## Gates

- `src/lib/social-post-own.test.ts`: the address, dirty, Done, restore, the saving flag, the version and the reset.
- `src/lib/social-optimistic.test.ts`: a dropped connection, the save runner, and the order and rollback of two edits.
- `src/lib/social-post-own-input.test.ts`: the request parser.
- `src/app/(app)/social/post-own-actions.test.ts`: a malformed id or an over-long body is refused before any read; no database text reaches the browser; an invalid group still saves.
- `src/lib/social-feed-reels.test.ts`, `src/lib/house-client-shell.test.ts`: the reel tile and the settled address (a Home lane or period still loading is not settled; a profile tab or activity pill is).
- `src/components/social/social-post-caption-window.test.tsx`: both hosts, the contents, the media, the error wiring, the shell.
- `src/components/social/social-post-caption-host.test.tsx`: the one entry on the layout, the window loading on first use, no page refresh.
- `src/components/social/social-post-caption-host.client.test.tsx`: the host driven over the real window entry, a browser history and Next's address: it opens at once, and at once over a profile pill; it waits for a Home lane or a landing close; a queued Edit whose card left opens nothing; a failure reopens with the draft, in place, or after another post's window closes; a removed post never reopens; a window reopened as Back closes another goes Back on close.
- `src/components/social/social-post-owner.test.tsx`, `social-post-card-owner.test.tsx`: Remove's copy, the retired keys, the menu's request.
- `social-feed-immersive.test.tsx`, `social-explore-for-you.test.tsx`, `social-feed-reel-rail.test.tsx`: each reads the owner's edit.
- `social-ui-boundary.test.ts`: the window stays off the layout, the card and the menu.
- `src/components/chrome/house-window.test.tsx` and `src/lib/house-overlay.test.ts`: the shell's leftover-address entry, and the window draws the shell.
- pgTAP `supabase/tests/social_post_author_edit_test.sql` stays the database gate (no SQL change).

## Verify on ship

1. Computer: ⋯ → Edit caption on a Feed photo post opens the 600 window over the Feed, and the address gains `&caption` with no reload. It shows the avatar, the caption with the caret at its end, and the photo under it, not clickable.
2. Change the words → Done: the card shows them as the window leaves. Open the photo: the immersive shows them.
3. Change the words → Esc → the ask; Esc → back to editing; browser Back → the ask; Discard → closed, the old caption, focus on the ⋯.
4. Own Profile → Activity → the Comments pill (a post shown twice), the permalink, a member profile with your own posts, and a group. On a video post the poster shows and nothing plays.
5. Switch the Feed lane and open Edit at once: it opens once the lane lands. Reload with the window open, then Edit again: Back still asks.
6. Phone (390): the same window fills the sheet below the status bar. ✕ with changes → the ask card, Keep editing first. The back gesture → the ask. An emptied text post → Done shows "Write a post or attach a photo or video." and nothing is sent.
7. In devtools block `/api/social/post-own` → Done: the caption flips back and the window reopens with the draft and "Could not save that caption.". With the block on, ⋯ → Remove → Remove shows "Could not remove that post." in place, and Keep closes it.
