# House dual-host primitive audit v1

One row unlock at a time. A pull request opens the next row. It does not start a later row, and it does not fork a lookalike.

| Priority | Row |
| --- | --- |
| P0 | HouseOverlay dual-host. Geometry is [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md). |
| P0 | Extend HousePageSelect. Do not add a second phone select. |
| P1 | HouseField + SettingsFieldStack. |
| P1 | HouseSegment / HouseChip. |
| P2 | HouseEmpty / Pending / Error. |

Phone never-truncate applies on every row. A source-of-truth trigger does not use `truncate`.

## Extend HousePageSelect: opened 2026-10-09

Authorized by Adam, 2026-10-09: "make sure we do your recommendations above, resolve any flaw or security issues, and let me know if you still need me to answer anything that I may have missed." (the window audit's recommendation #4, Add a right). The plan's questions were answered the same day: "approved, use the defaults". That includes two pull requests, this row first and the Add right window second.

- `HousePageSelectOptions`, the list HousePageSelect draws in its menu and phone sheet, is exported. With no opt-in prop it draws exactly what it drew before, for every caller (pinned byte for byte in `src/components/chrome/house-page-select.pin.json`, first rendered from `origin/main` 553a53a). A later change that is meant to alter a caller's markup rewrites the pin with `UPDATE_HOUSE_PAGE_SELECT_PIN=1 pnpm exec vitest run src/components/chrome/house-page-select.test.tsx` and says so in its pull request.
- Opt-in `inline`: the list laid flat in a page or window (`HOUSE_PAGE_SELECT_INLINE_LIST_CLASS`, the panel surface without its float). Labelled groups are `role="group"`. The list is one Tab stop: the chosen option, else the first, and the stop follows focus. ↓ ↑ Home End move and typing jumps to a label (`houseFormSelectListKeyDown` over `houseFormSelectListKey`, the form Select's keys; tested with fake option nodes in `src/lib/house-form-select.test.ts`). Rows are 44 with the form hover.
- Opt-in `multiple` with `values`: many chosen, `aria-multiselectable`.
- An option's optional `detail`: a second line under its label, the house wrap.
- The bare list owns no Esc listener, portal or sheet, and never carries `data-house-form-select-menu`, so Esc stays its host's. No second select: `ui/select.tsx` is unchanged.
- No caller uses an opt-in yet, so nothing a person sees changes and no copy is added. The first caller is the Add right window, which lands with its own lock.
- Dependency: inside a house window, `inline` needs the window's Tab trap (`houseWindowFocusables`) to skip `tabindex="-1"` (Add right plan A1). Until it does, the trap counts every option as a stop, and Tab from the list's one stop at the foot of a window body leaves the window. So the first caller lands with that shell change or after it. `house-page-select.test.tsx` fails if any file uses `HousePageSelectOptions` while the trap still counts `tabindex="-1"`.
