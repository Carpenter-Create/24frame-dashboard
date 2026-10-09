# [GC][24Frame] LOCK — Comments: the window over the page v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "approved, use the defaults") · phase 1
**Scope:** Comments on a post: the desktop window, and the phone comment sheet where it mounts. Covers the host, the post shown with the thread, the composer, leaving with typed text, where the window opens, and the shell parts it adds.
**Entity:** Global Content / 24Frame only
**Follows:** [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md) (the window job) and [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md) (the house window shell).
**Supersedes:** the desktop 480 HouseDialog comment thread (`HouseDialogFrame size="form"` with `HouseOverlayHead`).

---

## Founder direction (verbatim)

Asked whether to build the Comments window (phase 1), item 6 of a numbered list of decisions on 2026-10-09:

> 6) yes, please.

The open questions, answered on 2026-10-09:

> approved, use the defaults

(Adam, 2026-10-09, replying to the open decisions for four builds: Edit caption, Add a right, Deliver and Comments. For Comments that message named no new copy and the phone sheet unchanged in phase 1; the answer adopts every default in the table below as the decision.)

The visual defaults, answered on 2026-10-09:

> ok, approved

(Adam, 2026-10-09. The reply to Comments' visual defaults: the still at its true shape (Q1), the window always 80vh (Q2), and a video as a still with the play disc and no player (Q6). The same reply also covered the Add a right sequencing, which is outside this lock.)

| Question | Decision (the default) |
|----------|------------------------|
| Q1 Media in the window: the still full width at its true shape, the body scrolling past it to the comments, or capped at 40vh so the first comments show on open? | True shape, no cap; the body scrolls. |
| Q2 Window height: always the full 80vh, or the height it reaches once the thread loads? | Always 80vh. It never jumps; short threads leave white space. |
| Q3 Ask copy: reuse Edit profile's "Discard changes?" with Keep editing · Discard and no line, or a new title and line? | Reuse the existing strings; no new copy. |
| Q4 Phone: keep the comment sheet as it is, or bring the ask to the phone sheet too? | Keep the phone sheet as it is in phase 1. |
| Q5 Permalink: the card's round Comment opens the window over a page that already shows the thread, or moves focus to the inline composer? | Open the window, as everywhere else; phase 2 settles the permalink. |
| Q6 Video posts: a still with the static play disc and no player, or playable in the window? | Still with the play disc; no player. |
| Q7 Closing while a comment is still sending: close at once, or keep the window open until the server answers? | Close at once, as today. |

---

## 1) Desktop — the window

The house window shell (`components/chrome/house-window`) over the page. No route change.

| Token | Lock |
|-------|------|
| Geometry | The 600 window (`HOUSE_DIALOG_WINDOW_CLASS`: radius 24, no edge, no shadow). The frame fills 80vh (`fill`, `HOUSE_WINDOW_FRAME_FILL_CLASS`) and never takes the held px height, so a resize never clips the foot. |
| Header | 64: ✕ · "Comments" (17 / 600), centred by a 44 spacer where Done would sit. No Done: Post is the one action. |
| Body | The white page canvas (`--bg`), pad 24, scrolls. |
| The post | The 40 face (no photo: initials on `--surface-muted`, so the circle reads on the white body); the name; "time · Group" (the time is left out when unknown); the caption, live and never clamped; one still of the item the window opened on, at its true shape (photo 1.91:1 to 4:5; video 4:5 to 2.39:1, 4:5 until its shape is known), with the static play disc on a video. No player, no tap. |
| Several items | The "1 / 3" chip on the still. The feed card opens on item 1 (the carousel's place is not carried); the viewer opens on its own item. |
| The thread | A hairline under the post, then the rows (the 32 face, the name 13 / 600, the body 15 / 420, the time 13 ink-2) or "No comments yet."; nothing while loading. |
| Foot | Pinned under the body (surface, hairline above): the error line, then the field · Post, or the need-profile line. |
| Focus | The field on open; Comment again on close. After your post, the body scrolls to it. |
| Signed stills | From the session's token cache, or minted on a miss through the existing gated playback route. A failed mint leaves the grey frame. |

## 2) Leaving

- ✕, Esc, the scrim and the author, group and commenter links share one path. Empty field: the window closes. Typed text: the strip "Discard changes?" with Discard · Keep editing (Keep editing focused).
- A double Esc never discards. ⌘/Ctrl+Enter posts, and does nothing while the ask shows. Tab stays inside.
- A modified click (⌘, Ctrl, Shift, Alt, or not the main button) opens a new tab and leaves the window as it is.
- Reloading or closing the tab with text raises the browser's own prompt.
- Closing while a comment is sending (Q7): it closes at once; the comment finishes on its own. If that comment then fails, the count rolls back and the text is not kept.
- An offline post shows "Could not post that comment." (and an offline remove "Could not remove that comment."), never the browser's own network text.

## 3) Where it opens

- Every `SocialPostCard`: the Feed, Profile and activity, a member's posts, the permalink.
- The viewer's dock: mounted at the stage's root (z-50 there), above the stage ✕ (z-30) and the dock (z-20), below Share (body, z-60). A key the window takes (Esc, a Tab its trap moved) is marked handled, so the stage leaves it alone; a second Esc closes the stage.
- Explore: on `document.body`, over the stage; closing returns to the same item.

## 4) Phone

- The comment sheet, unchanged in look and behaviour (Q4): its ✕ and scrim close it as before.
- In the viewer it mounts at the stage's root, so the stage ✕ no longer paints over its scrim, and its Esc is marked handled, so the viewer does not close with it.

## 5) Shell parts (optional, no fork)

- Done is optional: left out, a 44 spacer keeps the title centred, and ⌘/Ctrl+Enter still runs the window's action.
- `foot`: a pinned area under the body, inert while the window asks or is busy.
- `fill`: the frame fills 80vh and never takes the held px height.
- `container`: where the window mounts (a layer that owns it), else the page body.
- For every window: ⌘/Ctrl+Enter does nothing while the ask is up.
- Every window before this one passes none of them and draws the same markup as before.
- A sheet window with a foot is not built.

## 6) Copy

**Existing, reused:** "Comments", "Close", "Back" (the shell's header takes it; never drawn), "Write a comment…" (the placeholder and the field's name), "Post", "No comments yet.", "Remove", "Write a comment.", "That comment is too long.", "Could not post that comment.", "Could not remove that comment.", "Create a creator profile to post, like, comment, or message.", "You", "Discard changes?", "Keep editing", "Discard", "{current} / {total}".

**New, pending founder approval:** none.

## 7) Out (phase 2 and later)

- `?post=` and its history entry. Until then browser Back with typed text leaves without asking.
- The time as a link; DM share cards opening the window.
- Like or Share in the window; a player; replies or likes on comments; paging past 200 comments.

## Found, not changed here

Raised separately; none is changed by this lock:

1. Creating and removing a comment can return database text to the browser.
2. A post id is not checked as a UUID before the insert.
3. The comments load route returns an inline English "Missing post.".
4. A failed load shows "Could not post that comment."; a correct line needs new copy.
5. A thread over 200 comments hides the newest (the load ignores `truncated`); it needs paging and copy. The thread no longer lowers the post's count from a cut page.
6. Removing a comment reports success when no row matched.
7. On the Explore phone path the sheet mounts inside the rail; check on a phone whether the dock paints over its foot.

## Gates

- `house-window.test.tsx`: no Done and the spacer; the foot after the body, inert while busy and while the ask shows; the fill class; the held-height guard; the mount target; ⌘/Ctrl+Enter never runs Done behind the ask.
- `house-window.test.ts` (lib): the fill, foot and spacer classes.
- `social-comments-window.test.ts` (lib): the dirty rule, both post builders, the video frame, the link rule and what a link click does (typed text: held and asked, Discard closes then goes; modified: left alone; clean: closes), focus return and its close edge.
- `social-optimistic.test.ts`: a dropped request maps to the house line.
- `social-feed-immersive.test.ts`: a handled Esc never closes the stage.
- `social-comments-window.test.tsx`: the window, its order, the foot states, the house links, the still, the chip, Explore without a time, the face fill, and source pins (dirty, no hold, `fill`, no Done, the ask's copy, every link out on the one leave path).
- `social-comment-thread.test.tsx`: the trigger (post, layer, aria-haspopup, focus return on close), the sheet owning Esc (marked handled) and the portal, no 480 dialog, the load and count deltas, the page thread's own field id and name.
- `social-feed-immersive.test.tsx`, `social-explore-for-you.test.tsx`, `social-ui.test.tsx`: the call sites.
- `house-overlay.test.ts` (G5), `social-feed-register-lock.test.ts`, `social-ui-boundary.test.ts`: the shell, tokens only, and the lazy chunk.
- Edit profile and Metadata: rendered to static markup before and after the shell change, byte-identical.

## Verify on ship

1. Feed card Comment opens the 600 window with the post on top.
2. A post with 40+ comments: the body scrolls and the composer stays visible.
3. Empty field: Esc closes and focus returns to Comment.
4. Type, Esc: the strip shows; Esc again keeps editing with the text intact.
5. Typed text, then the scrim or ✕: it asks; Discard closes.
6. ⌘/Ctrl+Enter posts and the comment scrolls into view. With the ask up, ⌘/Ctrl+Enter does nothing.
7. Offline, post: the text returns with "Could not post that comment.".
8. A commenter's name with text asks; with none, it closes and goes; ⌘-click opens a tab and keeps the window.
9. Resize the browser to 600 tall: the foot stays visible.
10. Edit profile and Metadata look and behave as before; with the ask up, ⌘/Ctrl+Enter does nothing.
11. A signed video on a Profile card: the still appears after a mint.
12. The viewer, a photo and a video, then Comment: the window sits above the stage ✕ (✕ not clickable) and below Share; Tab stays inside; one Esc closes only the window, a second closes the viewer; the video behind keeps playing with no second audio.
13. Explore on a computer: Comment opens the window over the header and the stage; closing returns to the same playing item; the still shows for signed and public clips.
14. Phone at 390: the Feed sheet is unchanged (scrolls, composer at the foot, ✕ closes); inside the viewer the sheet covers the stage ✕; the permalink's inline thread still posts.
