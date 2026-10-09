# House overlay dual-host v1

The job picks the host. Phone and desktop are different hosts. A breakpoint does not promote one into the other.

## Phone — AppSheet

- Top radius 16
- Pad 16
- Close 44
- Max height 90vh
- Scrim ink 40%
- No shadow

## Desktop — HouseDialog

- Max width 400 for confirm
- Max width 480 for a short form
- Max width 600 for a window: one object edited over the page that shows it (the composer; Edit profile). Radius 24, no edge, no shadow. One geometry constant (`HOUSE_DIALOG_WINDOW_CLASS`) feeds every window
- A window with faces holds one height while open: the height it opens at, up to 80vh. Faces push inside it (220ms). Header: close or back · title · Done. Done saves once
- A changed window asks before it closes, inside the window: Keep editing · Discard
- Pad 24 (a window's header and body carry their own; the composer keeps its locked 16)
- Button footer (a window's actions sit in its header)

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
