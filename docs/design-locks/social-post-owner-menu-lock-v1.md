# [GC][24Frame] LOCK — A post's ⋯: the owner menu and the Remove confirm v1

**Date:** 2026-10-10
**Status:** **LOCKED** (Adam, 2026-10-09, "approved, do it after Edit caption merges. make both better than it is.") · Design Own→READY. Everything this lock fixes is approved (§0). Question 1 (the danger ink) is decided and built here (Adam, 2026-10-10, "Yes, change that."; §0a). Questions 2–5 add nothing to this PR: each one's default is "not in this PR", and the follow-up it names comes back to the founder as its own item.
**Scope:** The author's ⋯ wherever `SocialPostCard` renders: the Feed in both lanes, a group, your own Profile Activity (the Comments pill included), a member's profile showing your posts, and the permalink. Its menu on both widths, and the Remove confirm. No other post surface has an owner control (the immersive, Explore, reels, stories and Messages have none), and none is added.
**Entity:** Global Content / 24Frame only
**Follows:**
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md): the confirm job (AppSheet on a phone, HouseDialog's 400 on desktop) and MenuSurface.
- [`mobile-menu-family-tree-v1.md`](mobile-menu-family-tree-v1.md): Family A, through its gate (`menuHostClass`; `lib/menu-host.ts`).
- [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md): the house ask.
- [`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md): Edit caption.

**Amends:**
- [`social-confirm-copy-lock-v1.md`](social-confirm-copy-lock-v1.md): the menu says Remove, the body is new, and the confirm is the house ask.
- [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md): §7's ⋯ row, Keeps, Verify-on-ship 7.
- [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md): Keeps.
- [`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md): the header's Amends, §6, §7, Copy, Gates, Verify on ship.
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md): Phone (Close 44) and Desktop (the confirm; the ask's module).
- [`mobile-menu-family-tree-v1.md`](mobile-menu-family-tree-v1.md): Family A.

**Primitive row:** inside the P0 HouseOverlay dual-host row. [`house-dual-host-primitive-audit-v1.md`](house-dual-host-primitive-audit-v1.md) records the HouseWindowAsk panel; no new row is opened.

---

## 0) Founder direction (verbatim)

The proposal (2026-10-09), verbatim. It answered Adam's question about the ⋯ Edit · Delete popover and the "Remove this post?" sheet, with screenshots of both:

> **1) Layout**
>
> - **Desktop:** the ⋯ popover is right. It's the standard desktop pattern and matches the locked menu style.
> - **Phone:** it's the weak spot.
>   - The popover is small, sits mid-screen and covers the next post's actions, so it's awkward to reach with a thumb.
>   - The confirm that follows is a bottom sheet, so the menu and its confirm use two different styles.
>   - Better: on a phone, ⋯ opens the same bottom sheet, with full-width rows for Edit and Delete.
> - **The confirm sheet:**
>   - It has two ways to cancel (✕ and Keep).
>   - Keep is a button but Remove is plain red text, so the action looks lighter than the escape.
>   - Better: match the house "Discard changes?" sheet, with two full-width stacked buttons, Keep first and Remove in red, and no ✕.
>
> **2) Copy**
>
> - **The verbs don't match.** The menu says "Delete" but the sheet says "Remove". Pick one. I'd use **Remove** everywhere, because the post isn't erased: it's taken down and GC keeps the record. "Delete" would promise something that isn't true.
> - **"Edit" undersells and oversells.** Only the caption can change. **"Edit caption"** sets the right expectation and matches the window's title.
> - **The body text is incomplete.** The post also leaves Explore and groups, and the author can't undo a removal (the database only allows active → removed). Proposed:
>   > Remove this post?
>   > It comes off 24Frame, with its comments and likes. You can't undo this.
>   > **Keep** · **Remove**
>
> All of this is locked copy you approved in September. That lock explicitly kept the menu as "Delete", so changing it needs your OK. If you approve, I'll make it a small follow-up PR after Edit caption merges, since both touch the same menu.

The phone rows read Edit caption · Remove, not the layout part's "Edit and Delete": the copy part renames both items, and Adam approved both parts together. The summary recorded with his answer:

> Approved proposal: phone ⋯ opens the bottom sheet (full-width rows "Edit caption" / "Remove"); desktop popover stays with those labels; confirm = house ask (Keep first, Remove red, stacked full width on phone; no ✕); one verb "Remove"; copy: "Remove this post?" / "It comes off 24Frame, with its comments and likes. You can't undo this." / Keep · Remove.

Adam's answer, 2026-10-09:

> approved, do it after Edit caption merges. make both better than it is.

The record reads the second sentence as "layout and copy: improve beyond the proposal where it is clearly better; any further new copy is listed in the PR". This build adds no copy and no visual element beyond the proposal; its improvements are engineering only (§4–§6).

Edit caption merged first (#804, `64f3e3b`). This build sits on `origin/main` `8ea5154`.

| Decision | The approved summary | Recorded |
|----------|---------------------|----------|
| A phone's ⋯ opens the bottom sheet of rows, Edit caption then Remove, full width | "phone ⋯ opens the bottom sheet (full-width rows "Edit caption" / "Remove")" | §2 |
| The desktop popover is kept, with the same two labels | "desktop popover stays with those labels" | §1 |
| One verb: Remove. "Delete" is retired for posts | "one verb "Remove"" | Copy |
| The edit item reads "Edit caption" ("Edit" is retired) | "full-width rows "Edit caption" / "Remove"" | Copy |
| Remove this post? · the new line · Keep · Remove | "copy: "Remove this post?" / "It comes off 24Frame, with its comments and likes. You can't undo this." / Keep · Remove" | Copy |
| The confirm is the house ask: Keep first, stacked full width on a phone, no ✕ on either width | "confirm = house ask (Keep first, … stacked full width on phone; no ✕)" | §3 |
| Keep is the ask's accent pill and Remove its outlined pill, in the house danger ink (`--danger`, §0a) | "house ask" (its Keep is the accent pill and its other action the outlined pill, as Edit profile's ask draws them) and "Remove red" | §3 |
| One request, no dismiss mid-request, the line in place, focus kept, no Remove in the first 500 ms | "make both better than it is" (engineering only) | §4–§6 |


### 0a) The danger ink (founder, 2026-10-10, verbatim)

Codex flagged the house red on this PR (P1: the hex below AA in dark mode, not a token). The proposal put to Adam, with WCAG ratios (white / grey card; dark bg / surface / muted): light `#bc4a3d` 5.0 / 4.6, dark `#cf776d` 5.9 / 5.0 / 4.5, "Say yes and I'll add it as a token in a small follow-up, moving all five uses of the old red at once." Adam's answer:

> Yes, change that. Also, merge what is verifiably safe and ready to merge.

Built in this PR instead of a follow-up, because the Codex thread is here and the first new use (`HOUSE_DANGER_INK_CLASS`) is in this PR:

- `--danger` in `tokens.css`: light `#bc4a3d`, dark `#cf776d`, the old red's hue (a step darker on light, lighter on dark). `--color-danger` maps it, so every danger ink is `text-danger`.
- All five old uses move to it at once: the Remove row and the ask's danger action (`HOUSE_DANGER_INK_CLASS`), the danger button, the menu's danger item, Log out, and the avatar sheet's Remove picture. No `#c4564a` is left in source.
- It is text only: no fill, border or wash. Form errors stay on-system (known-divergences D3).

---

## 1) Desktop — the thread ··· popover

Unchanged in place and surface: MenuSurface sparse, radius 12, hairline, no shadow, 44 rows, aligned to the end, 6 under the ⋯.

- Items: [pencil] **Edit caption**, [bin] **Remove** (the house danger ink, as today's bin).
- Edit caption appears only where the caption window exists (never a dead control).
- Choosing an item hands focus to what it opens. Esc or a click outside returns it to the ⋯.

## 2) Phone — the house AppSheet card (Family A)

- From the bottom: AppSheetFrame, the house scrim, AppSheetCard (top radius 16, pad 16, the safe area in the bottom pad, max 90vh, no shadow).
- One inset SheetGroup: **Edit caption** · **Remove**. Rows are 48 tall, full width, text only, and wrap. Remove is in the house danger ink. With no caption host, Remove is the only row.
- Its accessible name is "Post options". No visible title, no ✕, no handle, no Cancel row.
- The scrim, Esc and an address change close it.
- It rises 320 ms ease-out; under reduced motion it does not.
- Remove turns the same card into the confirm (§3): no second rise, and the scrim stays.
- The ⋯ is drawn once for each width through the family tree's gate (`menuHostClass`), as the account menu's triggers are: the phone ⋯ is a plain button that opens on click (Radix opens on finger-down, and a sheet rising under a finger still down would take the release as a scrim tap); the desktop ⋯ is the Radix trigger inside `hidden md:contents`. The server draws both, so there is no swap after hydration. `lib/menu-host.ts` registers the ⋯ (`post-owner-menu`) and the sheet (`post-owner-sheet`).

## 3) The confirm — the house ask in the confirm hosts

- **Remove this post?**, then the line, then **Keep** · **Remove**.
- Keep: the ask's accent pill, focused when the confirm opens.
- Remove: the ask's outlined pill in the house danger ink, the same weight as Keep (no longer bare red text).
- Both at least 44 tall, 20 side pad, fully rounded.
- Phone: inside the same AppSheet card, stacked full width, Keep first.
- Desktop: HouseDialog's 400 confirm (pad 24, radius 16, hairline, no shadow, centred over the house scrim), the buttons in a row at the right, Keep first. They wrap rather than clip. (The strip inside a window orders Discard · Keep editing; that ask sits inside a window, this confirm stands alone.)
- No ✕ on either width. Keep, Esc and the scrim are the ways out.
- The confirm is its own alertdialog, named by its title and described by its line, so focus landing on Keep reads both. The host frame keeps the name "Post options".

## 4) Pending and failure

- One request. Both buttons wait (the house disabled look) and Remove is busy. Esc, the scrim, Keep and an address change do nothing until the answer lands.
- Focus moves to the confirm's panel before the buttons wait, and Tab cannot leave it.
- A failure shows its line in place, above the buttons; Keep and Remove work again and focus returns to Remove, also when a click on the scrim took it while the removal waited. A retry clears the old line while it waits. Closing clears it.
- The line is the route's fixed answer: "Could not remove that post." for a dropped connection or a database error, otherwise "That post is not visible.", "Only the author can change this post.", "Create a creator profile to post, like, comment, or message." or "Not authenticated.". A request that throws ends the wait with "Could not remove that post.".
- Success removes every copy of the post on the page, refreshes the page as before, and moves focus into the post after the one acted on (its name link, else its first shown link or button). On the permalink there is no next post; the page refreshes to its existing "That post is not visible.".
- A width change keeps an open confirm (pending or not, with its line) and closes an open menu.

## 5) Focus and keys

- Focus goes into the surface: the popover's first item on a keyboard open, the sheet's first row, the confirm's Keep (its panel when it appears waiting). Tab and Shift+Tab stay inside the sheet or the confirm.
- Every dismiss returns focus to the ⋯ on the next frame, with two exceptions: Edit caption (the ⋯ at once, then the window when it opens) and a removal (the next post).
- Esc: the popover closes (Radix) · the menu closes · the confirm keeps · nothing while pending.
- Back: no history entry (no house sheet takes one). Leaving the page takes the sheet or the confirm with it. A change of the house pathname closes an idle menu or confirm, as the account sheet does. There is no raw popstate listener, so a window's own late Back cannot close a sheet opened in that gap.
- The page under the sheet or the confirm does not scroll; it is given back on close.

## 6) No accidental Remove

- Remove, and the confirm's scrim, ignore any press in the first 500 ms after the confirm appears.
- So a double tap on a phone, or a double-click on desktop, on the menu's Remove leaves the confirm up and removes nothing. (On a phone the menu's Remove row and the confirm's Remove button sit within about 2 px of each other in the same bottom card.)
- Nothing on screen marks this: no disabled look, no timer. A retry after a failure is not delayed.

## 7) Who

The author only. The server is unchanged: `DELETE /api/social/post-own` (auth, the uuid check before any read, the post read under RLS, the author check, the scoped `active → removed` update, RLS `posts_update_author`, the `protect_post_author_mutation` trigger, and no DELETE grant). The ⋯ is a convenience, not the gate. Nothing is deleted: the row stays and GC staff can still read it. The browser sends the same request as before and never sees database text.

## 8) Not

- No ✕ on the confirm, and no dialog over a dialog.
- No new copy beyond the approved line.
- One new token, `--danger` (§0a), and no hex outside `tokens.css`: every danger ink is `text-danger`.
- No second menu or select primitive, and no fifth menu family.
- No history entry for the sheet.
- No change to Edit caption's window, AppSheetFrame, HouseDialogFrame or HouseScrim. `ui/Dialog` leaves this menu; other screens keep it.

## Copy

**Existing, reused:** "Edit caption" (`SOCIAL.post.editTitle`), "Remove" (`SOCIAL.post.deleteConfirm`: one string for the menu item and the confirm's button), "Remove this post?", "Keep" (also the confirm's scrim label), "Could not remove that post.", "Post options" (the ⋯ and both frames' accessible name), "Close" (the menu face's scrim), and the route's fixed lines ("That post is not visible.", "Only the author can change this post.", "Create a creator profile to post, like, comment, or message.", "Not authenticated.").

**New, approved (Adam, 2026-10-09, in the proposal; §0):** "It comes off 24Frame, with its comments and likes. You can't undo this." (`SOCIAL.post.deleteBody`, a straight apostrophe as the nearby lines). It is the only new user-facing line, and it is listed here so it shows in the PR.

**Retired:** "Delete" (`SOCIAL.post.delete`), "Edit" (`SOCIAL.post.edit`), and the old body "It'll come off your profile and the feed. Comments and likes go with it."

## Questions for follow-ups (outside this lock)

The plan raised five questions after the approval. Question 1 is decided (§0a). For 2–5 each default is "not in this PR", so this PR adds nothing for them, and what it ships stays inside §0. Each follow-up it names is not approved here: it comes back to the founder as its own item before any of it is built.

| # | Question | This PR (the default) |
|---|----------|----------------------------------|
| 1 | The house red (`#c4564a`), used for Remove, Log out and the bin, is below WCAG AA for normal text: 4.4:1 on white, 4.0:1 on the sheet's grey row card, 3.7:1 and 3.3:1 in dark mode, where it does not change. The fix is a `--danger` token with light and dark values (known-divergences D3). Do it in this PR? | **Decided (Adam, 2026-10-10, "Yes, change that.") and built here (§0a):** `--danger`, light `#bc4a3d`, dark `#cf776d`, AA on every surface; all five literals moved at once. |
| 2 | The line holds everywhere the post itself is read. The one exception: a post sent in Messages keeps the caption snip its message stored (up to 120 characters), though the photo stops loading. Ship the line and fix the DM card later, or change the line now? | The approved line ships. A follow-up makes a DM post card whose post is removed show the existing "Post unavailable" (`SOCIAL.dms.postUnavailable`) instead of the stored snip; it is a visible change, so it comes back as its own small PR. |
| 3 | On a phone, should the back gesture close the sheet or the confirm in place instead of leaving the page? It would mean giving this sheet its own history entry; no house sheet has one. | Not in this PR. Back works as on every house sheet: it leaves the page and the sheet goes with it. |
| 4 | Two failure edges, no new words: (a) a request that never answers holds the confirm until the browser gives up (Back still leaves the page); a ~20 s ceiling could say "Could not remove that post." while the removal may still land; (b) a post already removed in another tab answers "That post is not visible." and its card stays until a refresh. Add either? | Not in this PR. One follow-up: the ceiling with the existing line and a refresh straight after it; it comes back only if a "not sure yet" line is wanted. |
| 5 | Feedback beyond what was approved: a "Removing…" label, a visible or spoken "Post removed" line, leaving the permalink after removing a post there. Want any? | Not in this PR. While it works both buttons grey out and screen readers hear "busy"; afterwards the post leaves and focus moves to the next post; the permalink refreshes to its existing "That post is not visible.". |

## Follow-ups (not in this PR)

- The follow-ups that questions 2–5 name, each for the founder's sign-off.
- Remove on a post still being published (it has no server id yet) reads "That post is not visible.", the same gap as Edit caption's ([`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md), Follow-ups).
- The Feed's reel tiles and the For you rail read server data, so a removed post can show there until the refresh lands.

## Build notes (engineering only)

- `HouseWindowAsk` moved verbatim to `src/components/chrome/house-window-ask.tsx` (re-exported by `house-window.tsx`, so every caller is unchanged). The strip and the sheet are pinned byte for byte in `src/components/chrome/house-window-ask.pin.json`, rendered from `origin/main` `8ea5154` before the move (the ask is unchanged there since `64f3e3b`). Opt-ins: `variant="panel"`, `layout`, `discardTone="danger"`, `busy`, `notice`, and `panelRef` (the host's handle on the panel, for its Tab hold).
- The flow's state is pure (`src/lib/social-post-owner.ts`): the step, the menu's surface, pending and the line; the host chooser; the focus target after a removal; the 500 ms guard; the Tab decision, built over the house window's own `houseWindowTabTarget`.
- `src/components/social/use-social-post-owner.ts` runs it: the request, focus, keys, the scroll lock, the width and address closes. `src/components/social/social-post-focus.ts` holds the DOM reads for the focus after a removal.

## Gates

- `src/lib/social-post-owner.test.ts`: the reducer, the host, the focus target, the press guard, the Tab decision.
- `src/components/social/use-social-post-owner.client.test.tsx`: one request, the press guard, no dismiss mid-request, a failure in place and its retry, a throw, a removal (the next post read before the hide, every copy hidden, one refresh), the request's fields, idle Esc, the scrim, the address close and no popstate close, focus in, Tab, the scroll lock, Edit caption's hand-off, a width change, and Radix's close focus.
- `src/components/social/social-post-focus.test.ts`: the post after the copy acted on, its name link, else its first shown stop.
- `src/components/social/social-post-owner-sheet.test.tsx`: the phone sheet's two faces and the desktop confirm.
- `src/components/chrome/house-window-ask.test.tsx` (with `house-window-ask.pin.json`) and `house-window-ask.client.test.tsx`: today's asks unchanged, the re-export, the opt-ins, the panel's focus (including its return to the action after a scrim click took focus while it waited).
- `src/components/social/social-post-owner.test.tsx`: the copy, the two ⋯ through the gate, their server markup, the caption host.
- `src/components/social/social-post-owner.client.test.tsx`: on both widths the confirm's scrim runs the guarded `dismissFromScrim`, never the plain dismiss; Keep runs dismiss and Remove runs remove.
- `src/components/social/social-post-verb.test.ts`: no post surface says Delete.
- `src/components/social/social-ui-boundary.test.ts`: the owner menu carries the ask's own module and the sheet, never the window shell or the caption window.
- `src/lib/house-sheet.test.ts`: the danger constant is `text-danger`, with no hex.
- `src/app/tokens.test.ts`: `--danger` per mode, its `text-danger` mapping, AA on every light and dark surface (where `#c4564a` was not), the old red's hue, and no `#c4564a` left in source.
- `src/lib/menu-host.test.ts`: `post-owner-menu`, `post-owner-sheet`, Family A's host, and the gate on each ⋯.
- The full gate, with no new lint warning in `src` (the baseline at `8ea5154` is zero).

## Verify on ship (founder, optional, about 5 minutes)

Use the preview at 1280 and 390, in light and dark.

1. Computer, a Feed photo post: ⋯ opens the small popover under it with Edit caption and Remove. Edit caption opens the caption window as before.
2. ⋯ → Remove opens the 400 confirm: "Remove this post?", the new line, Keep (blue, focused) and Remove (outlined, red). There is no ✕. Tab moves between Keep and Remove only. Esc closes it and focus is on the ⋯. A scrim click does the same.
3. Double-click Remove in the popover: the confirm opens and stays open.
4. In devtools, block `/api/social/post-own`, then ⋯ → Remove → Remove. Both buttons grey; Esc, the scrim and Tab do nothing. Then "Could not remove that post." appears above the buttons, and Keep closes. Unblock, then Remove: the post leaves, and focus is on the next post.
5. Phone 390: ⋯ opens a sheet from the bottom with two full-width rows, Edit caption and Remove (red), with no ✕. A tap above it closes it.
6. ⋯ → Remove: the same sheet becomes the confirm, with Keep (blue) on top and Remove (outlined, red) under it, both full width, and no flash.
7. Double-tap the Remove row: the confirm appears and stays, and the post is still there.
8. A tap above the confirm keeps the post. With the network blocked, Remove → the scrim does nothing until the line appears.
9. Own Profile → Activity → the Comments pill, where one post appears twice: Remove takes both copies away. Also try a group, a member profile and the permalink, which refreshes to "That post is not visible.".
10. Reduced motion (OS setting): the sheet appears without rising. Optional, with VoiceOver: on the confirm, focus lands on Keep and the title and the line are read.
