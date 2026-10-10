# House overlay dual-host v1

The job picks the host. Phone and desktop are different hosts. A breakpoint does not promote one into the other.

## Phone — AppSheet

- Top radius 16
- Pad 16
- Close 44 (a post's ⋯ sheet and its Remove confirm carry none: the scrim, Esc and the ask's Keep close them; [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md))
- Max height 90vh
- Scrim ink 40%
- No shadow
- A window, with faces or one face (a post's caption), may take the full AppSheet (`APP_SHEET_FULL_HOST_CLASS`) on a phone instead of its own phone route: the same header, faces and ask, clear of the safe areas (the title's Metadata window; a title's Add right window; Deliver over Licensing Status; a post's caption; Edit profile keeps its sheet route). The 90vh cap is for card sheets

## Desktop — HouseDialog

- Max width 400 for confirm
- Max width 480 for a short form
- A post's Remove confirm is the house ask in this width: the title, its line, Keep then Remove in a row, no ✕; on a phone the same ask is the AppSheet card ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md), amended 2026-10-10; Adam, 2026-10-09, "approved, do it after Edit caption merges. make both better than it is.")
- Max width 600 for a window: one object edited over the page that shows it, or one record added to the list that page shows (the composer; Edit profile; a title's Metadata; a title's Add right; Deliver over Licensing Status; a post's caption; amended 2026-10-09, [`aggregation-add-right-window-lock-v1.md`](aggregation-add-right-window-lock-v1.md)). Radius 24, no edge, no shadow. One geometry constant (`HOUSE_DIALOG_WINDOW_CLASS`) feeds every window
- A window holds one height while open: the height it opens at, up to 80vh. Faces push inside it (220ms). Header: close or back · title · Done. One Done, one action; a part that saved stays saved. A linear window (Deliver) keeps one action that names its step: Continue, then the commit ("Deliver · N"), then Done; its result face shows close, never back ([`staff-licensing-deliver-window-lock-v1.md`](staff-licensing-deliver-window-lock-v1.md))
- A changed window asks before it closes, inside the window: Keep editing · Discard
- Pad 24 (a window's header and body carry their own; the composer keeps its locked 16)
- Button footer (a window's actions sit in its header)
- One shell draws every window, with faces or one: `lib/house-window` (classes, the query helpers) and `components/chrome/house-window` (`useHouseWindow`, `HouseWindowFrame`, `HouseWindowAsk`, `useHouseWindowEntry`). A new window brings its faces, copy and save; the header, Esc order, the ask, held height, focus and the history entry are the shell's. When a window opens from the page on an address that already carries its query, the shell puts the page under it and pushes its own entry, so Back always reaches the ask (social-post-caption-window-lock-v1)
- `HouseWindowAsk` lives in `components/chrome/house-window-ask` (re-exported by the shell). Its frameless panel, its own alertdialog described by its line, lets a confirm host draw it; the strip and the sheet are unchanged ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md))
- Tab and a face's first focus count only real Tab stops: an element with tabindex -1 is skipped (a list's roving options are reached with the arrows), and a radio group is one stop, as the browser has it (its checked radio, else its first)
- A window whose faces hold long lists may open at 80vh (`fill`) instead of holding the height it opens at
- A window may also show one object to read and add to (Comments). A window whose one action lives in its body (Post at a pinned foot) draws no Done, and ⌘/Ctrl+Enter runs that action. A window whose content arrives after it opens fills 80vh. A window opened from a layer that owns it (the immersive viewer, a full-screen viewer, not a HouseDialog) mounts inside that layer. ⌘/Ctrl+Enter does nothing while the ask is up. See [`social-comments-window-lock-v1.md`](social-comments-window-lock-v1.md)

## HouseDrawer

- Right edge, width 400
- Hairline
- Pad 24
- Phone never uses a side strip
- Opens over the page whose row it edits. Never over an empty page

## MenuSurface

- Radius 12
- Hug content
- Hairline
- No shadow

## OUT

- No AppSheet on desktop
- No Dialog for a Settings index or a Settings destination: those stay drill-in pages with their own URL ([`settings-desktop-drill-in-ia-lock-v1.md`](settings-desktop-drill-in-ia-lock-v1.md))
- No overlay over an empty page
- No dialog over a dialog
- No Drawer for ···
- No fifth host (a window is HouseDialog at its third width, not a host)
- Menu body absorb is a separate lock

## Why (amended 2026-10-09)

"No Dialog for durable settings" carried no recorded rationale, and the code already contradicted it: company name edits in a HouseDialog (`company-profile-form.tsx`, asserted by G8), and the 600 composer window (Adam, 2026-10-08) is a HouseDialog. On 2026-10-09 Adam showed Edit profile's drawer floating over an empty page beside Apple Account's card-to-centred-window, and asked why the rule forbids it. After a design review, Adam approved the window ("build it"). The amended lines keep the likely intent (Settings navigation stays drill-in pages) and allow one object to be edited in a window over the page that shows it. See [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md).
