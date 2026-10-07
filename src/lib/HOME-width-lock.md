# Home width lock

Amended 2026-09-23. Desktop shell L/R yield to
`docs/design-locks/shell-desktop-horizontal-gutter-lock-v2.md`
(32 start / 32 end). Phone unchanged.

Amended 2026-10-04 (Adam,
`docs/design-locks/shell-unified-chrome-lock-v1.md`): Home shows the
dest rail like every workspace (Home · Industry news). Home sits
behind the dest-rail slot: main starts after `--sidebar-width`, and
the 32 / 32 shell gutters sit inside main. The Home grids follow the
Home frame (a size container), not the viewport: two columns (main +
22rem News) from a 960px frame, Education covers 2-up from 592 and
3-up from 960.

Amended 2026-10-04 (Adam, "Yes, everywhere";
`docs/design-locks/shell-screening-chrome-lock-v1.md`): the rail slot
was 200 (64 collapsed) and the header 52. Superseded below.

Amended 2026-10-05 (Adam, "I like the designs. Let's use them.";
`docs/design-locks/shell-coinbase-register-lock-v1.md`): the side menu
is a full-height 240 column (80 collapsed) and the header (80) starts
at its right edge. With the rail open the Home frame reaches 960 at a
1264 viewport (was 1224): one column from 768 to 1263. Collapsed, two
columns from 1104 (was 1088). The Home container thresholds are
unchanged.

Amended 2026-10-07 (founder, "Header height locked: 56 (match
Facebook), shell-wide."; `docs/design-locks/social-feed-cards-lock-v1.md`
§8): the header is 56, not 80; then "Phone header → 56 same as
desktop.": on phone 56, not 60. Heights only: no width or threshold here
changes.

At the 1440 frame:

| Surface | Measure |
| --- | --- |
| Header | From the side menu's edge to the viewport's right edge (the side menu is full height). Lead pad 24, end pad 32. |
| Dest rail | On. `--sidebar-width` (240); 80 collapsed. |
| Left inset | 32px (`--shell-gutter-inline-start`), after the rail. |
| Right inset | 32px (`--shell-gutter-inline-end`). |
| Home content column | 1136px with the rail (1440 − 240 − 32 − 32). 1296px collapsed (1440 − 80 − 32 − 32). |
| Rail-free frame | 1376px (1440 − 32 − 32). Co-Productions only. |
| Phone | Unchanged (existing max-md pad) |

Do not center Home on the old page cap. Home uses the dest-rail slot
(`--sidebar-width`, 240) like every workspace.

Implementation: Home content uses `--shell-gutter-inline-start` left
and `--shell-gutter-inline-end` right, inside main. Only
Co-Productions sets `--sidebar-width` to `0px` (no rail); its header is
then full-bleed and carries the brand mark. `--access-rail-width` aliases that slot and
is not the Home canvas inset. `--content-inset` (48) and
`--chrome-gutter` (16) stay for reading measure, phone, and dest-rail
geometry.
