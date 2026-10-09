# [GC][24Frame] LOCK — Edit profile: the window over your live profile v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "build it") · Design Own→READY
**Scope:** Edit profile on desktop (the window) and phone (the sheet): the host, the one draft, the one save, leaving with changes.
**Entity:** Global Content / 24Frame only
**Supersedes (in part):**
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md): "No Dialog for durable settings" (amended there, with the reason).
- The desktop HouseDrawer for Edit profile and its faces (it floated over an empty page).
- Each face's own Done (Name, Username) and Bio's own save inside Edit: one draft, one Done.

---

## Founder direction (verbatim)

On the desktop Edit profile drawer over an empty grey page:

> next on social, the 'edit profile' section is this. lol

With Apple Account's page of cards, each opening a centred window for one topic:

> notice apple. why is it a rule that we shouldn't do this?

> take a moment to think hard about what we're building...something fresh, expensive, and a great user experience. now, what's the best decision?

A design panel (five approaches, three judges: premium feel, user experience and safety, engineering fit) chose the window. Presented with the window, the rule change and the discard copy:

> build it

---

## 1) Desktop — the window

| Token | Lock |
|-------|------|
| Open | The owner's **Edit profile** pill (a button on `md+`, `aria-haspopup="dialog"`) opens the window over the profile. A panel hop to `?edit` on the mounted screen: no route change, no skeleton, the profile and its tab stay underneath, dimmed by the house scrim |
| Window | HouseDialog at its window width: `HOUSE_DIALOG_WINDOW_CLASS` (600, 92vw cap, radius 24, no edge, no shadow), the composer's own geometry. No pad of its own; overflow clipped to the radius |
| Height | The frame takes the height it opens at (up to 80vh) and holds it until it closes, so a face never makes it jump. Shorter faces sit at the top of the wash; taller faces scroll inside |
| Header | 64, surface, hairline under. Left: the round grey 44 (`HOUSE_HEADER_ROUND_BUTTON_CLASS`): **X** (Close) on the index, **‹** (Back) on a face. Centre: the face title, 17 / 600, naming the dialog. Right: **Done**, the accent pill (40 tall). Done always saves everything and closes |
| Index | On the wash, pad 24, gap 16: the 88 avatar and **Edit picture**; the Welcome video card; the drill card Name · Username · Professions · Topics · IMDb · Links · Bio with their live summaries. Nothing typed on the index |
| Faces | A row pushes its face into the same frame: 220ms ease-out slide from the right (Back: from the left), instant under reduced motion. The face's first field takes focus; Back returns focus to the row it came from. Faces are today's faces, unchanged in content |
| Photo | **Edit picture** (and the avatar) toggles the house menu (MenuSurface) dropped under it, inside the window; it takes focus on its first row, a click anywhere outside closes it, and focus returns to Edit picture. The crop runs in place; Done waits while it is open; opening a face closes both. Photo and welcome video still save the moment they are confirmed; the profile behind updates at once |
| Esc | Closes the nearest layer: the photo menu, the crop, the ask (Keep editing), a face (Back), then the window. A second Esc keeps editing: a double Esc never discards |
| Keyboard | ⌘/Ctrl + Enter is Done from anywhere in the window. Tab stays inside the window |
| Close | X, Esc on the index, a click on the scrim, and browser Back all take one path: with nothing changed the window closes; with changes it asks first (§3). Closing returns focus to the pill |
| Done | Valid: the profile behind repaints under the scrim, the window closes, the write runs in the background; a failure rolls the paint back and reopens the window at the face at fault, with the draft and its error. A window opened while that write is still out waits for its answer (Done pending, nothing editable), so a failure reopens it at the face too and never hides behind it. Invalid: the window goes to the face at fault with its error |
| Username | A changed username waits for the server (Done shows pending): it is the public address, and "taken" is a common answer. "Taken" stays on Username with its error. While it waits nothing leaves or changes: X, Esc, the scrim and Back do nothing, and the window is inert. Every other field stays optimistic |
| Address | The `?edit` entry is written with the browser's own history calls (no shell-only marker), so Next keeps it as its address: a server action under the window (a new photo) never writes a stale address back. A window always has the profile without `?edit` underneath it: one that came with the page (the Home prompt's Bio, a link, the old Edit route) rewrites its entry as the profile, keeping Next's own state so Next's address stays on `?edit`, and pushes its own on top. So browser Back always reaches the ask and never leaves the page with the draft. Closing pops that entry |
| Paint | The window paints the saved draft without the save-hop cover (that cover is for the phone's hop to the profile route; under the window it would remount the page). The cached profile row is merged, never replaced, so the cover and welcome video stay; a failed save puts the row back |
| Width | Below md the window is hidden and holds no keys and no scroll lock; its draft is kept, and it shows again at md+. A resize is never "Back" |
| Other entries | Interests' **Topics** (empty Interests, owner) opens the window at Topics, the Interests tab kept behind it. `/social/profile/edit[?face=]` and `/social/profile/edit/bio` on a computer hand over to the window (`?edit[=face]`) |
| Not | A drawer, a separate page, an editing mode on the profile, a pencil on every section. The cover keeps its in-place editor on the hero |

## 2) Phone — the sheet

| Token | Lock |
|-------|------|
| Host | Unchanged: the full-screen sheet on `/social/profile/edit` (back ‹ · Edit profile · Done) |
| Faces | back ‹ · title · **Done**. Back keeps what you typed; Done is the one save (the same as the index's) |
| Leaving | With changes, the back ‹ asks first: the house AppSheet card, **Keep editing** (first, focused) then **Discard**, stacked full width |
| Bio | Inside Edit, Bio is part of the one draft. The Home prompt's standalone Bio route keeps its own check |

## 3) One draft, one save, the ask

| Token | Lock |
|-------|------|
| Draft | Every face writes into one draft as you type. Back never drops anything |
| Save | One write: Name, Username, Professions, Topics, IMDb, Links and **Bio** when this draft changed it (`createSocialProfile` writes Bio when the form carries it; over 150 returns the Bio limit). An unchanged Bio is left out, so a Bio saved meanwhile from the Home prompt is never overwritten |
| Ask | Title **"Discard changes?"**; a line naming the changed fields in row order ("Name and Topics aren't saved." · one field: "Name isn't saved."); when a new picture or welcome video already saved, a line saying so. **Keep editing** · **Discard**. On desktop, a strip rising at the foot inside the window (the body above is inert); never a dialog over a dialog |
| Discard | The draft goes; saved media stays. After a failed save, the failed draft is dropped from the overlay too |
| Browser | While the draft has changes, reloading or closing the tab raises the browser's own prompt |

## 4) Welcome video — Media or Live (amended 2026-10-09)

> also, add welcome video should have the media icon (to upload a file) or live (to record a file)

| Token | Lock |
|-------|------|
| Card | Label "Welcome video"; the clip (closed plate or the local preview) when there is one; then a row: the + fan's **Media** and **Live** rounds (`SOCIAL_CREATE_TILES`: the same glyph and name; round grey 44s, as in the composer's tool row), and **Remove welcome video** at the end when there is one. The text buttons "Add / Replace welcome video" give way to the rounds (the file input keeps that name) |
| Media | The video file pick, as before: saves on confirm |
| Live | The 24Frame camera for the welcome video (`/social/live?for=welcome`), remembering where Edit opened it. With changes in the draft, it asks first (Keep editing · Discard); Discard then opens the camera |
| Camera | Header "Welcome video"; no caption and no dictate on the review; the round accent save (up arrow) is named "Add welcome video" and shows the blue bar. The clip goes to the media S3 posts lane (never Mux, never a post), is saved as the welcome video, shows on the profile at once from this device, and the camera returns to where it opened (the window on a computer, the sheet on a phone). The "use a video" fallback in errors is a post path and is not offered |
| Copy | Existing only: "Welcome video", "Add welcome video", "Media", "Live", "Remove welcome video" |

## Copy

"Discard changes?", "{fields} aren't saved." / "{field} isn't saved.", "Your new picture is already saved.", "Your new welcome video is already saved.", "Keep editing", "Discard" (Adam approved the set with "build it"; the singular and welcome video lines follow the approved pattern). Everything else is existing copy.

## Gates

- `house-overlay.test.ts`: G1 maps `object-edit` to app-sheet (phone) and house-dialog (desktop); G4 window: one 600 geometry (`HOUSE_DIALOG_WINDOW_CLASS`), the composer and Edit profile compose from it; G5: Edit profile and its faces carry no HouseDrawerFrame.
- `social-profile-edit-window.test.tsx`: the window's header contract, Esc order, the ask, Done paths, held height, the inline photo menu.
- `social-profile-edit.test.ts` (lib): the changed-fields diff, the discard line, `?edit` parsing, the error → face map, Bio in the one save.

## Verify on ship

1. Desktop: Edit profile dims the profile and opens the 600 window; no route change; the tab behind stays.
2. A row slides its face in; Back slides the index back; the window never changes height.
3. Change Name, press Esc twice: the ask shows, then keeps editing. X → Discard closes; nothing saved.
4. Change Topics, Done: the profile behind already shows the new topics as the window leaves.
5. Change Username to a taken one: Done waits, then "That handle is already taken." on Username.
6. Browser Back with changes asks; without changes closes. The same from the Home prompt's Add bio (the window came with the page).
7. Done on a change that fails, then reopen Edit at once: it waits, then shows the face at fault with its error.
8. Phone: Name → type → Back keeps it; back ‹ on the index with changes asks Keep editing · Discard.
