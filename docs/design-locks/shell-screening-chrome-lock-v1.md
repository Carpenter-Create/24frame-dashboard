# [GC][24Frame] LOCK — Screening-room shell: text-lane header, tile-less side menu, named phone switch, ink dock mark v1

**Date:** 2026-10-04 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-04, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** The shared shell only, in every workspace (Home, Aggregation, Social, Education, Staff): desktop header, desktop side menu (expanded and collapsed), phone top bar, phone dock. Settings keeps its own rail rows; the Education course rail keeps its own style. No page bodies (Feed, Explore, Profile faces are later PRs).  
**Entity:** Global Content / 24Frame only  
**Source:** G · Combined spec §1–§3.5 (Feed and Explore from D · Screening room) and the boards `CombinedFeed.dc.html`, `CombinedExplore.dc.html`, `CombinedProfile.dc.html`. The boards' hexes are translated to the existing tokens in `src/app/tokens.css`; no new hex. The boards' "24Frame" text is a placeholder: the brand mark stays the existing mark.  
**Supersedes (in part):** [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) §1 switcher face, labels pad, trailing sizes, Explore compact size; §2 rows, idle, active, collapsed; §3 phone switch face and the accent dock mark; G4, G6 (accent mark); Measured · [`shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`](shell-desktop-top-nav-slider-waffle-phone-lock-v1.md) §1 face (any track or thumb) · [`shell-workspace-waffle-layer-lock-v1.md`](shell-workspace-waffle-layer-lock-v1.md) "no workspace name in the header" · [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) §3 box sizes · [`social-home-density-craft-sequel-lock-v1.md`](social-home-density-craft-sequel-lock-v1.md) M3 (desktop trailing gap and glyph) · [`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md) §A Social shell and §A2 Column (the sliding row) and §A2 Exit (the filled 44 chip) · the tokens comment "Joshua bar 2026-09-22" (88 header) and the 256 / 60 side-menu slot · [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) §2 Home content and founder decision 3 range (one column from 768 to 1279 → **768 to 1223** with the 200 rail; amended in place).  
**Superseded in part 2026-10-05** by [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) (Adam, "I like the designs. Let's use them."): §1 — the header is **80** with one hairline and starts at the side menu's edge; the workspace switcher is the primary **pill slider** (muted track, ink thumb, 17 / 600, 44) from `lg` and the grey workspace pill below `lg` (no text lanes, no underline, no hairline divider); the brand mark moves to the side menu's top band; every control is a **round grey 44**; the search is the wide grey pill (44, 240–360, "Search Social" on Social); Ask has no visible label; the avatar is 44. §2 — the side menu is a **full-height 240 / 80** column with the brand mark in its 80 top band; rows are 56 pills at 17 / 500 with 24 glyphs; current = the accent wash, the filled glyph and the label in accent-ink; no eyebrow; Create is an ordinary row (no accent tile); the collapse control sits at the foot. §3 — the phone switch is the grey workspace pill (15 / 600 name); the avatar 44; pads 16 / 12; hits 4 apart. §4 — the dock is 56 with no hairline; the current dest is the filled glyph in accent (no ink dot); Create is a 44 circle. §5 — the changed tokens; Assumptions 2 and 7; G1–G5 and Measured. Keeps: the keyboard model, one current row per path, Home's no-cookie rule, Departure 1 (Explore has no desktop side menu), and Departure 4 (dark muted).  
**Keeps:** every workspace lane, entitlement, and keyboard rule of the unified lock (Home is a real segment that writes no cookie; Staff last, staff only; one Tab stop; arrows move); Ask 24Frame AI sparkle Sporty Blue; search on Social and Education only; the phone switch behind the grid button; icons-only dock; the shell gutters 32 / 32 ([`shell-desktop-horizontal-gutter-lock-v2.md`](shell-desktop-horizontal-gutter-lock-v2.md)).

---

## Founder direction (verbatim, 2026-10-04)

Standard:

> A fresh, media-oriented, immersive social media experience for the film community.

Picked:

> "Feed, Explore from D-Screening Room", "Profile from F-Reel", E's "Following/For you" text tabs, a reels row every few posts, and "the mobile menu icons not having words, just icons."

Asked:

> D's header and side menu differ from today's: workspace names as plain words with an underline (no grey pill), and menu rows without icon tiles. The header and menu are shared, so this changes Home, Aggregation, Social and Education together. Adopt it?

Answered **"Yes, everywhere (Recommended)"** — option text:

> Quieter, smaller chrome in every workspace; fixes the oversized menu and the empty boxed panel. Its own PR first.

Still in force: brand typography (Geist; ladder 13 / 15 / 17 / 20 / 28 / 56; body 420, title 480) and colours (`src/app/tokens.css`); light default, dark available; Ask 24Frame AI sparkle stays Sporty Blue (founder pick); search on Social and Education only; Home is a real switcher segment that writes no workspace cookie; the phone workspace switch stays behind the grid button; the phone dock shows icons only.

| Question | Pick | Meaning |
|----------|------|---------|
| Shell | **"Yes, everywhere (Recommended)"** | D's header and side menu in every workspace. This lock and its PR are the shell, first |
| Phone menu | **"the mobile menu icons not having words, just icons"** | The dock stays icon-only with accessible names |
| Feed / Explore / Profile | **D · Screening room** / **F · Reel** | Later PRs. Not this lock |

---

## 1) Desktop header (`md+`), every workspace

| Token | Lock |
|-------|------|
| Height | **52** (`--header-height`). Every layout that reads the token follows (rail top, sticky News, Ask gate) |
| Surface | The page canvas (`--bg`, 85% glass), the same as the side menu, with one hairline under it. Light is unchanged (white); dark reads as one surface |
| Leading | Existing brand mark, unchanged → 8 → **1×18 hairline** (`--border`) → 4 → the workspace lanes. Row gap 8 |
| Lanes | **Home · Aggregation · Social · Education · Staff** (Staff last, staff only). Plain words, **13px**, side pad 10, full height of the bar. Idle **500**, quiet ink. Current **600**, ink, **2px ink underline** on the header's bottom edge (inset shadow, no height), `aria-current="page"`. No track, no thumb, no grey pill |
| Keyboard | Unchanged: one Tab stop (the lit lane, or Home when none is lit); arrows move; `role="tablist"` / `tab` |
| Explore Exit | After the lanes, 8 + 8 out: **34** tall, radius 10, `--surface-muted`, pad 9 / 12, 14 X, "Exit" 13 / 500 ink, gap 6. Below `lg` the compact X-only chip (34 box; accessible name stays **Exit**) and the header search icon steps out — unchanged rule, new size. The Explore bar is the opaque page canvas over the dark stage |
| Trailing | **[search] · Ask 24Frame AI · bell · avatar**, 8 apart; the avatar 4 further out |
| Search | Social and Education only. From `xl`: **232×34** muted field, radius 10, 13px, 16 glyph, gap 8, pad 12, placeholder and glyph ink-2 (the existing form, input, action, and voice mic). Below `xl`: the 34 icon box (unchanged behaviour) |
| Ask | From `xl`: **34** hairline pill, radius 10, pad 10 / 12, gap 6, 16 accent sparkle, "Ask 24Frame AI" 13 / 500 ink. Below `xl`: the 34 icon box, 18 sparkle |
| Bell | 34 box, radius 10, 18 glyph, ink-2 |
| Avatar | 28 (`--header-avatar-size`) |
| Labels | Never clip, from 768 up, for members and GC staff, light and dark |

## 2) Desktop side menu, every workspace

| Token | Lock |
|-------|------|
| Column | Flush left under the header, full height, page canvas, **one hairline on its right**. No card, no inset, no radius. Width `--sidebar-width` **200**; collapsed `--sidebar-width-collapsed` **64** |
| Pad | 12 / 10 (expanded); 12 / 0 (collapsed) |
| Top row | Workspace eyebrow (13 / 500 / 0.06em / uppercase, quiet ink) and the **28×28** collapse control (radius 6, quiet ink) |
| Rows | **36** tall, pad 10, gap 10, radius 10, 13px. Glyph **18** in a **22** slot. Idle **500**, ink-2, Phosphor Regular. Current: `--surface-muted` fill, **600**, ink, Phosphor Bold (the board's stroke 2). No icon tiles, no accent tile, no accent wash |
| Create (Social) | The menu's only accent: **22×22** radius-6 `--accent` tile, 14 Bold plus in `--accent-contrast`. Label like any row |
| One current | Exactly one current row per path (`houseRailActiveIndex`, the dock's test) |
| Collapsed | Expand control **40×32** radius 10, a **24×1** hairline, then **40×40** icon links; the current one muted. Create a **26×26** accent tile. The control stays in the same top-row slot in both states, so keyboard focus stays on it when it toggles |
| Home | Its own rows, unchanged: **Home · Industry news** |
| Settings | Shares the column; keeps its own rows (wash + accent-ink) and no collapse |
| Explore | Desktop Explore keeps no side menu in this PR. The board's collapsed rail on Explore (§3.3) lands with the Explore PR, not here (Departure 1) |

## 3) Phone top bar (`max-md`), every workspace

| Token | Lock |
|-------|------|
| Height | **60** (`--header-height`) |
| Leading | Emblem (the existing mark) in a **44** tall link (the board's wordmark box; its width stays the mark's own), 8, then the **grid button**: 44 tall, pad 8, radius 10, 16 filled grid glyph, gap 6, and **the current workspace's name** at 13 / 500, ink. Every workspace shows its own name: Home, Aggregation, Social, Education, Staff. Where no lane is lit (Settings, Activity, Help, Co-Productions) the button is the grid alone. Accessible name: "<name>, Workspaces" |
| Trailing | search (Social only; Education keeps its row under the bar) · Ask (accent sparkle) · bell · account. Every target **44**; hits abut; glyphs **20**; the account holds a **30** avatar |
| Pads | 16 lead · 8 trail (the board's 20 lead does not fit Social at 320) |
| Explore | No top bar; full-bleed, unchanged |

## 4) Phone dock, every workspace

| Token | Lock |
|-------|------|
| Face | Icons only, accessible names. Pill and size unchanged (`h-12`, `3rem`) |
| Float | **16** off the bottom, as on the board (`bottom:16`): `max(16px, safe-area)`, was 12. The clearance (`--house-phone-dock-clearance`) carries the same float, so the 16 gap above the pill holds |
| Targets | Each target fills the pill's **46** row, so every tap clears 44. **Five equal slots**, as on the board (each `flex:1`, no pad on any slot, Create's included) |
| Idle | 24 glyph, Phosphor Regular, quiet ink |
| Current | Ink glyph, Phosphor **Bold** (the board's stroke 2), and a **4px ink dot** 3 above the target's bottom, centred. The glyph stays centred. No chip, no accent |
| Create (Social) | The dock's only accent: **40** `--accent` circle, 20 Bold plus in `--accent-contrast`. Never the dot. Its existing ring on `/social/create` and `/social/live` stays |

## 5) Tokens and dark mode

| Board key | Token |
|-----------|-------|
| page | `--bg` |
| muted | `--surface-muted` |
| line | `--border` (`border-hairline`, `bg-hairline`) |
| ink | `--text` (`text-ink`; underline `var(--text)`) |
| ink2 | `--text-secondary` (`text-ink-2`) |
| ink3 | `text-ink-3 dark:text-ink-2` (`HOUSE_SHELL_QUIET_INK_CLASS`): the board's dark ink3 is `--text-secondary` |
| acc / onAcc | `--accent` / `--accent-contrast` |
| dock / dockLine / dockSh | `--surface` / `--border` / `--elevation-float` (unchanged) |

New tokens: `--header-desktop-control-size: 34px`. Changed: `--header-height` 88 → **52** (phone 64 → **60**), `--sidebar-width` 256 → **200**, `--sidebar-width-collapsed` 60 → **64**, phone `--header-avatar-size` 28 → **30**. Every colour above flips under `.dark`.

---

## Assumptions (stated, reversible)

1. The desktop shell gutters stay 32 / 32 (the gutter lock). The board's 20 / 16 header pad is not adopted.
2. The Ask label and the search field still appear from `xl` (1280), as today; the board's 1180 frame shows them because it is a mockup.
3. The Explore compact Exit and the search step-out below `lg` stay (founder decision "Keep, stack as built").
4. Lanes keep `role="tablist"` / `tab` / `aria-selected` for the existing keyboard model and add `aria-current="page"`.
5. The board's 18 stroke 1.7 / 2 glyphs are Phosphor Regular / Bold (the house icon package).
6. Collapse labels stay "Collapse sidebar" / "Expand sidebar" (copy unchanged).
7. The phone grid button pads 8 with a 16 glyph (the board: 10 and 15), so the named button, Search, Ask, bell, and account fit at 320 with no overlap. Its accessible name keeps the existing copy, "<name>, Workspaces" (the board's "Switch workspace" would be new copy, a founder checkpoint).
8. The Activity page's settings gear reuses the header hit (`HOUSE_THEME_TOGGLE_CLASS`), so on desktop it follows the header to the 34 box.
9. Home's container thresholds are unchanged. With the 200 rail, the Home frame reaches 960 at a 1224 viewport (was 1280), so Home is one column from 768 to 1223 with the rail open; collapsed (64), two columns from 1088 (was 1084) — `src/lib/HOME-width-lock.md`.

## Departures from the board (recorded, not adopted in this PR)

Each is reversible. None changes a founder pick; each keeps today's build where the board differs.

1. **Explore desktop rail.** The board puts the 64 collapsed rail on Explore (§3.3). Desktop Explore keeps no side menu here: page faces are later PRs, and the Explore lock ([`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md) §A) keeps the surface dest-rail off the stage. The rail lands with the Explore PR.
2. **Header pad.** The board's 20 / 16 header pad is not adopted; the shell gutters stay 32 / 32 (Assumption 1).
3. **Phone lead pad.** 16, not the board's 20 (§3 Pads): at 320 Social's named grid button sits 3.9 before Search with 16, so the board's 20 would overlap it.
4. **Dark muted.** The board's dark muted is #1e2126; the build's `--surface-muted` in dark is #25292f, one ramp stop lighter, on the current menu row, the search field, the Exit chip, and the account circle. Light matches (#f4f4f6). No existing token is #f4f4f6 in light and #1e2126 in dark, and changing dark `--surface-muted` reaches every muted surface in the product, so it stays a founder call.

## Explicit OUT

- Any change to the brand mark  
- A grey pill, track, or thumb behind the lanes; icon tiles or an accent tile on menu rows (Create excepted)  
- Accent anywhere in the dock except Create; accent on the current dest  
- Search on Home, Aggregation, or Staff  
- Visible dock labels; resizing the dock (the clearance moves only with the float, 12 → 16)  
- Feed, Explore, and Profile page faces (later PRs)  
- New hex outside `tokens.css`

---

## Gates

**G1.** Desktop header 52: brand mark, `data-app-header-divider` (1×18 hairline), lanes `home`, `aggregation`, `social`, `education`, `staff` last when entitled; at most one `aria-current="page"` lane: exactly one on workspace routes (Home, Aggregation, Social, Education, Staff), none on Settings, Activity, Help, and Co-Productions; the lit lane carries the 2px ink underline on the bar's bottom edge; idle 500 quiet ink, current 600 ink; one Tab stop.  
**G2.** Trailing: search (Social and Education) · Ask · bell · avatar, 34 controls, 8 apart; search field 232×34 from `xl`; Ask label from `xl`.  
**G3.** Side menu: column 200 / 64 with a right hairline and no card; top row eyebrow + 28 collapse; rows 36 / 13px / 22 slot / 18 glyph; current muted + 600 + Bold; no tiles; Social Create the only accent (22 / 26 tile); one current row per path; Enter or Space on the collapse control keeps focus on it.  
**G4.** Phone bar 60: emblem (a 44 tall link), grid button with the workspace name (none where no lane is lit), search (Social) · Ask · bell · account, all ≥ 44, no overflow at 320.  
**G5.** Every dock: the pill 16 off the bottom; five equal slots (Social); targets 46 tall and ≥ 44 wide; current ink Bold glyph with a 4px ink dot; idle quiet ink; Create the only accent, no dot.  
**G6.** Tokens only; no hex in code outside `tokens.css`.

---

## Measured (Chromium, Geist, compiled CSS from `pnpm build`, light and dark)

- **Header**, 768 → 1440 in 4px steps (169 widths) on Home, Industry news, Aggregation, Social, Profile, Create/live, Education, Explore, Settings, and Co-Productions for members and GC staff, plus Staff and Manage courses for GC staff (22 pages), light and dark: no header overflow, no clipped lane, no overlapping controls, nothing outside the viewport, height 52, at most one current lane, its 2px underline on the bar's bottom edge; lanes 13px (idle 500, current 600); trailing controls 34 tall and the avatar 28; the Ask label (95 wide, never clipped) and the 232×34 search field (Social, Education, Explore) only from 1280. Tightest gap between the lead and the trailing controls: GC staff on Explore at 768 (80px), GC staff on Social and Education at 768 (87–88px); members 130px or more. Explore's Exit: a 34×34 X-only box from 768 to 1023, a 64×34 labelled chip from 1024, radius 10, 16 after the lanes.  
- **Side menu**, 1280, expanded and collapsed, every workspace (Home, Industry news, Aggregation, Social, Profile, Create/live, Education, Manage courses, Staff; members and GC staff), light and dark: column 200 / 64 at x 0, from the header's bottom edge to the viewport bottom, 1px right hairline, no radius, no sideways overflow; rows 36 tall at 13px (500 idle, 600 current), 18 glyph in a 22 slot, one current row; collapse 28×28 in the eyebrow's row; collapsed rows 40×40, expand 40×32, the 24×1 rule; Social's Create the only accent (22 tile; 26 collapsed). Settings sits in the same 200 column with its own rows and no collapse (768 and 1280). Keyboard (Aggregation, Social, Education, Staff): Enter or Space on the collapse control, three times, keeps focus on the same button ("Expand sidebar" ↔ "Collapse sidebar").  
- **Phone**, 320 / 360 / 390, every workspace, light and dark: bar 60, no overflow; the grid button names the workspace (Home, Aggregation, Social, Education, Staff; the grid alone on Settings and Co-Productions); every bar target 44×44 (tightest: Social at 320, 3.9px between the named button and Search); the emblem link 44 tall (33.2 wide) with the mark centred. Dock pill 16 off the bottom and 16 from each side; the lead scroll pads 80 (48 pill + 16 float + 16 gap). Dock targets 46 tall, 45–340 wide; Social's five slots equal (54 at 320, 68 at 390, glyph centres 68 apart); one current dest with a 4px ink dot 3px above the target's bottom and the glyph centred; Create a 40 accent circle with a 20 glyph and no dot. Explore phone stays headerless with the dock.  
- **Home frame** (the Home frame and layout classes inside the shell, compiled CSS): rail open, one column at 1223 (frame 959) and two at 1224 (960); collapsed, one column at 1087 and two at 1088. Lanes: one lit on Home, Aggregation, Social (Explore included), Education, and Staff; none on Settings and Co-Productions.

## Verify-on-ship

1. 768, 1024, 1280, 1440, light and dark, every workspace: lanes unclipped; the underline under the right lane; the search field and Ask label from 1280.  
2. Side menu: eyebrow + collapse in one row; one current row; collapse to 64 and back from the keyboard (focus stays on the control); Social Create the only blue.  
3. Phone 320 and 390: the grid button names the workspace; the emblem, search · Ask · bell · account all 44 tall; the dock 16 off the bottom with five equal slots on Social; the dock's current dest is an ink glyph with a dot; Create the only blue.  
4. Keyboard: Tab reaches the lanes on Settings (Home); arrows move.

---

## Repo citation

`docs/design-locks/shell-screening-chrome-lock-v1.md`
