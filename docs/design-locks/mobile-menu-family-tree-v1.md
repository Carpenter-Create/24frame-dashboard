# Mobile menu family tree v1

Phone menus belong to one family. Desktop is a separate lane. Do not cross a family by patching a lookalike.

## Family A — AppSheet + SheetGroup

Account and actions. The phone host is AppSheet. Rows sit in SheetGroup.

A post's ⋯ on a phone is Family A: the AppSheet card with one inset SheetGroup (Edit caption · Remove); its confirm is the house ask in the same card. The ⋯ goes through `menuHostClass` (phone A, desktop the thread ··· MenuSurface), and `lib/menu-host.ts` gates it as `post-owner-menu` and `post-owner-sheet` ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md), amended 2026-10-10; Adam, 2026-10-09, "approved, do it after Edit caption merges. make both better than it is.").

## Family B — SettingsHubList

Settings uses the hub list. It does not borrow sheet cards from Family A.

## Family C — HousePageSelect, phone

In-page filter and select on phone. Extend HousePageSelect. Do not add a second phone select.

## Family D — MobileNav on AppSheet chrome

Mobile navigation uses AppSheet chrome. It is not a new host.

## OUT

- No sheet cards on Settings.
- No bare push on Account.
- Desktop is separate. Do not promote a phone family into the desktop host with a breakpoint.

## Parks

Parked. Not a license to patch a family, and not a fifth menu.

- Desktop menu hosts. They stay off families A–D until their own lock.
- Sheet cards on Settings.
- A bare push menu on Account.
