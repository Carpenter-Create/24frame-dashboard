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

At the 1440 frame:

| Surface | Measure |
| --- | --- |
| Header | Full-bleed 1440 / full viewport. Desktop shell gutters 32 / 32. |
| Dest rail | On. `--sidebar-width` (256); 60 collapsed. |
| Left inset | 32px (`--shell-gutter-inline-start`), after the rail. |
| Right inset | 32px (`--shell-gutter-inline-end`). |
| Home content column | 1120px with the rail (1440 − 256 − 32 − 32). 1316px collapsed. |
| Rail-free frame | 1376px (1440 − 32 − 32). Co-Productions only. |
| Phone | Unchanged (existing max-md pad) |

Do not center Home on the old page cap. Home uses the dest-rail slot
(`--sidebar-width`, 256) like every workspace.

Implementation: Home content uses `--shell-gutter-inline-start` left
and `--shell-gutter-inline-end` right, inside main. Only
Co-Productions sets `--sidebar-width` to `0px` (no rail). Lead chrome
is full-bleed either way. `--access-rail-width` aliases that slot and
is not the Home canvas inset. `--content-inset` (48) and
`--chrome-gutter` (16) stay for reading measure, phone, and dest-rail
geometry.
