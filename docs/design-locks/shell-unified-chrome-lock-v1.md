# [GC][24Frame] LOCK — One shell across workspaces: header switcher, side menu, phone dock v1

**Date:** 2026-10-04 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-04, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** Desktop header order and workspace switcher · desktop side menu (dest rail) on every workspace · phone waffle tile order · phone dock active state on every workspace · Social phone dock Create · Ask 24Frame AI sparkle colour · Social "Home" → "Feed" label.  
**Entity:** Global Content / 24Frame only  
**Mockup:** canvas https://claude.ai/artifact/5pzjARNyFwvLXxcY5qUh4k — boards **A · Stage** (desktop 1180 + phone 390) and **One shell · every workspace** (Home · Aggregation · Social · Education). Mockup colors are brand tokens in code: white canvas = `--bg` / `--surface`, panel = `--surface-muted`, hairline = `--border`, ink / ink-2 / ink-3, Sporty Blue = `--accent`, accent wash. The mockup's "24" tile is a placeholder: the brand mark stays the existing mark.  
**Supersedes:**
- [`shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`](shell-desktop-top-nav-slider-waffle-phone-lock-v1.md) §1 (placement, inventory, face, single-lane word), §2 dock tab labels, the "dock tab set" OUT bullet, G1 placement, G3, G4, and Verify-on-ship 1–3. Its §3 Explore stage and labeled Exit, G2, and G5–G7 stay; the Explore header row is now brand mark · switcher · Exit.
- [`shell-workspace-waffle-layer-lock-v1.md`](shell-workspace-waffle-layer-lock-v1.md) §3 workspace order and the §4 / G4 dock tab names. Layer 1 vs Layer 2, entitlement, and the phone waffle stay.
- Home IA v2 "no dest rail on /home" (Adam 2026-09-18; `src/lib/HOME-width-lock.md`). Home now has its own rail.

**Superseded in part 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) (Adam, "Yes, everywhere"): the desktop switcher is plain text lanes with an ink underline (no muted track, no raised thumb, no grey pill); the header is 52 with 34 controls and a 232×34 search field; the side menu is a 200 / 64 column with a hairline right edge and no card, rows without icon tiles (current = muted row, 600, ink), Social Create the only accent; the phone grid button names the current workspace; every dock marks the current dest with an ink glyph and a 4px ink dot (no accent). That supersedes §1 Switcher face, Labels pad, the 240 pill and 44 circle sizes in Search / Ask, and the 44 compact Exit; §2 Row, Idle, Active, Collapsed; §3 Workspace switch face and Active dest, every dock (accent mark); G4 tile rows; the accent mark in G6; and Measured. It also moves Home's one-column range with the rail open from 768–1279 to **768–1223** (the 200 rail; amended in place below). Lanes, entitlement, Home segment, keyboard, search scope, Ask sparkle accent, Feed rename, and Home's rail stay.  
**Amends:** [`social-home-activity-feed-lock-v1.md`](social-home-activity-feed-lock-v1.md) (page title) · [`social-create-fan-lock-v1.md`](social-create-fan-lock-v1.md) (dock + face) · [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) §3 (Ask label from xl) · [`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md) (header row; Exit and header search from `md` to `lg`, §1) · [`social-dms-inbox-ig-lock-v1.md`](social-dms-inbox-ig-lock-v1.md) and [`dm-thread-immersive-real-estate-lock-v1.md`](dm-thread-immersive-real-estate-lock-v1.md) (dock tab names).

---

## Founder direction (verbatim, 2026-10-04)

> be mindful that the header nav, and likely the side menu nav need to be consistent across all workspaces ... we want users to easily and quickly be able to toggle from one workspace to another (home, aggregation, social, education)

> keep our brand typography and colors too

> default is light mode but users can go to dark mode

Picked from options:

| Question | Pick | Meaning |
|----------|------|---------|
| Phone switch | **"Behind the grid button"** | Keep today's phone waffle. No always-visible phone switcher |
| Two Homes | **"Rename to Feed"** | Social's own Home destination becomes **Feed**. Route stays `/social` |
| Order | **"Shell first"** | This lock and its PR are the shell |
| Profile layout | **"A · Stage"** | Separate PR. This lock does not touch the profile header |

---

## 1) Desktop header (`md+`), every workspace

**Superseded in part (2026-10-04):** switcher face, label pad, and control sizes — see [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1.

| Token | Lock |
|-------|------|
| Leading | Existing brand mark, unchanged (wordmark `md+`, links to the workspace home). The brand slot never shrinks from `md` (`md:shrink-0`), so nothing paints over the wordmark. Then the workspace switcher. Desktop Explore adds its Exit after the switcher |
| Switcher order | **Home · Aggregation · Social · Education · Staff**. Staff only when `isGcStaff`, last. A lane the user lacks is hidden |
| Home segment | A real segment. Goes to `/home`. Writes **no** workspace cookie. Thumb lit on `/home` and `/home/news` |
| Switcher face | Muted track (`bg-surface-muted`, `--space-1` inset). Raised surface thumb (`bg-surface`, `--elevation`) with an **ink** label. Idle labels ink-2. Dark: same muted track; the thumb lifts one ramp stop (`bg-hairline`). Switcher-only variant: every other SegmentedTrack keeps the accent thumb |
| Labels | Full words. Never truncated or clipped. Segment side pad `--space-2` below `lg`, `--space-4` from `lg` |
| Keyboard | One Tab stop, always: the lit segment, or **Home** when no lane is lit (Settings, Activity, Help, Co-Productions). Arrow keys move between segments |
| Trailing | **[search] · Ask 24Frame AI · bell · avatar**. Waffle hidden `md+` |
| Search | Social and Education only. Home, Aggregation, and Staff get **no** search. The 240 pill from `xl`; the icon form below `xl`. Social's icon opens Search (people intent), the same as phone. Education has no search page, so its desktop icon opens the same quiet course/video field in a small panel under the icon. Phone Education keeps the under-nav row |
| Ask | Visible **Ask 24Frame AI** label in a hairline pill from `xl`. Icon-only 44 circle below `xl` and on phone. The sparkle is accent (`text-accent`) in the pill, in the circle, and on phone; the label stays ink. Bell and search keep their idle ink (founder decision 2) |
| Education search panel | Escape closes it and returns focus to the icon. An outside press closes it and leaves focus where the press put it |
| Explore, `md` to `lg` | Lanes + Exit + search · Ask · bell · avatar need ~852px for GC staff. Below `lg` the Exit chip keeps its fill and X only (44 circle; the accessible name stays **Exit**), and the header search icon steps out (Explore's discover search sits on the media). From `lg` the labeled Exit and the search icon return. Accepted as built (founder decision 3) |

## 2) Desktop side menu (dest rail), every workspace

**Superseded in part (2026-10-04):** rows, idle, active, and collapsed — no icon tiles; see [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §2.

| Token | Lock |
|-------|------|
| Eyebrow | Workspace name (`workspaceModeLabel`; **Home** on Home), house rail title. Hidden when collapsed |
| Row | **[28 icon tile + label]**. 16px Phosphor glyph inside the tile (Bold idle, Fill active) |
| Idle | Tile `bg-surface-muted`, ink-2 glyph. Label ink-2 |
| Active | Row `bg-surface-muted`, ink label. Tile `bg-accent text-accent-contrast` |
| One active | Exactly one active row per path. Same active test as the phone dock; the first match wins |
| Home | Rail built only from Home's existing dests: **Home · Industry news**. Never invent a destination |
| Home content | Home sits behind the rail, so its grids follow the Home frame (a size container), not the viewport: main + 22rem News from a **960** frame; Education covers 2-up from **592**, 3-up from **960**. Below 960, News stacks after the AI module, as on phone. With the rail open that is one column from 768 to 1223 (**amended 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md): the 200 rail; 768 to 1279 with the 256 rail), accepted as built (founder decision 3) |
| Social | Same rows and the same inner pad as every rail. No Social-only icon family |
| Collapsed | Icon-only. The 28 tile fits the 60 slot (nav `--space-1` side pad) |
| Settings, Education course rail | Keep their current active styling: `--accent-wash` row, label in `--accent-ink` (`HOUSE_RAIL_ACTIVE_CLASS`). Founder pick "Deeper blue text" (Adam, 2026-10-04): 4.62:1 light (Sporty Blue was 4.07:1), 6.17:1 dark; see [`social-profile-stage-lock-v1.md`](social-profile-stage-lock-v1.md) Accessibility |
| Co-Productions, Help, Activity | Still no rail |

## 3) Phone

**Superseded in part (2026-10-04):** the grid button now names the current workspace, and the current dest in every dock is an ink glyph with an ink dot, not accent — see [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §3–§4.

| Token | Lock |
|-------|------|
| Workspace switch | Waffle behind the grid button, unchanged. No phone slider |
| Waffle tiles | **Aggregation · Social · Education · Staff** (Staff when entitled): the desktop lane order. The Home exit stays at the sheet top |
| Social dock Create | Accent circle (`bg-accent text-accent-contrast`, 40) **inside** the existing pill. Not raised, not a satellite FAB. On its own route (`/social/create`, `/social/live`) it takes a 2px accent ring 1px off the circle (box-shadow, no size change). The fan and its surface circles are unchanged. Create is Social-only |
| Active dest, every dock | Home, Aggregation, Social, Education, Staff: accent ink on the glyph plus a 4px accent mark under it, inside the 40 row. No chip in any dock. The mark is the non-colour cue (accent vs ink-2 alone is ~2:1 light, ~1:1 dark — WCAG 1.4.1). One dock primitive; no per-workspace active style (founder decision 1) |
| Other docks | Home, Aggregation, Education, Staff have no Create. Their own dests only |
| Dock labels | Icon-only with accessible names. No visible labels; phone never truncates |
| Size | Pill `h-12`, row `h-10`, clearance `3rem` — unchanged |

## 4) Social "Home" → "Feed"

| Token | Lock |
|-------|------|
| Dock and rail label | **Feed** (`SOCIAL_NAV`). Route stays `/social` |
| Glyph | Phosphor **Rows** (two stacked rows) |
| Page title | **Feed** (`SOCIAL.home.title`, screen-reader h1) |
| Back link | **Go to Feed** |
| Home workspace | Keeps **Home**: switcher segment, waffle exit, Home dock, Home page |

## 5) Theme and brand

Light is the default; dark stays available from the avatar Theme drill. Brand typography (Geist, house type ladder) and Sporty Blue stay. Code uses design tokens only, never hex.

---

## Explicit OUT

- A "24" tile, or any change to the brand mark  
- Search on Home, Aggregation, or Staff  
- An always-visible phone switcher; workspaces in the dock  
- Visible dock labels; resizing the dock or its clearance  
- Rail destinations Home does not already have  
- Profile header changes (the "A · Stage" PR)  

---

## Gates

**G1.** Desktop leading: brand mark, then `data-app-header-workspace-desktop` with segments `home`, `aggregation`, `social`, `education`, plus `staff` last when entitled.  
**G2.** The Home segment hops to `/home`, writes no cookie, and is selected on `/home` and `/home/news`.  
**G3.** Trailing order: search (Social and Education only) · Ask · bell · avatar. Ask label hidden below `xl`. Search pill only from `xl`. Desktop Explore below `lg`: compact Exit, no header search icon. The switcher always has one Tab stop.  
**G4.** Rail: eyebrow and tile rows on Home, Aggregation, Social, Education, and Staff. One active row per path.  
**G5.** Waffle tiles: `aggregation`, `social`, `education`, plus `staff` when entitled.  
**G6.** Every dock: active accent ink + mark, no chip. Social dock: Create circle `bg-accent text-accent-contrast` (ring when active); Feed label. No Create on the other docks. Ask sparkle `text-accent` on phone and desktop; bell and search on their idle ink.  
**G7.** No hex in code. No profile-header edits.  
**G8.** Home grids switch on the Home frame container (`@min-[37rem]`, `@min-[60rem]`), never on viewport `sm:` / `lg:`.

---

## Measured (Chromium, Geist, compiled CSS, light and dark)

- **Header**, 768–1440 in 4px steps, on Home, Aggregation, Social, Education, Staff, Settings, and Explore, members and GC staff: no lane clipped, nothing over the wordmark, no header overflow. Tightest: GC staff on Social and Education at 768 (24px between the switcher and the trailing icons); GC staff on Explore at 768 (28px between Exit and Ask).  
- **Home, rail open** (frame / layout / Education cover width): 768 → 448, one column, 1-up 416 · 1024 → 704, one column, 2-up 330 · 1279 → 959, one column, 2-up 458 · 1280 → 960, main 592 + News, 3-up 179 · 1440 → 1120, main 752, 3-up 232. **Rail collapsed:** two columns from 1084. Phone unchanged (2-up from 640). The 179 floor is the old rail-free floor at 1024. **Amended 2026-10-04** ([`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md), the 200 / 64 rail): one column from 768 to 1223 with the rail open, two columns from 1224; collapsed, two columns from 1088.

## Founder decisions (Adam, 2026-10-04, picked from options in chat)

The open founder checks are closed. None remain open on this lock.

| Check | Pick | Recorded decision |
|-------|------|-------------------|
| 1. Phone bars | **"Match everywhere"** | Every workspace's phone dock (Home, Aggregation, Education, Staff, and Social) uses the Social style: the active dest in accent ink with the 4px accent mark under its glyph, no chip. Social keeps its accent Create circle and the ring on its own routes; the other docks have no Create. Dock size and clearance unchanged. This pick also accepts the Social dock mark and Create ring (added so the active state is not colour alone; the mockup carried that cue with visible labels, which the no-resize rule rules out) |
| 2. AI sparkle | **"Blue, as in the mockup"** | The Ask 24Frame AI sparkle is accent (`text-accent`) in the header on desktop (labeled pill and icon circle) and on phone. Bell and search keep their idle ink. Amends the phone chrome ink lock (`HOUSE_PHONE_CHROME_IDLE_INK_CLASS`, `src/lib/house-phone-shell.ts`), which had kept Ask, bell, and search on one idle ink |
| 3. Narrow desktop | **"Keep, stack as built"** | No code change. Home stacks to one column from 768 to 1223 with the rail open (**amended 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md): the 200 rail; 768 to 1279 when picked, with the 256 rail) (News after the AI module, below a 960 frame). On desktop Explore below 1024 (`md` to `lg`) Exit is the compact X-only chip and the header search icon steps out (amends the Explore lock's "Label stays Exit" and "Header search stays" for 768–1023 only) |

## Verify-on-ship

1. 768, 1024, 1280, and 1440, light and dark, on Home, Aggregation, Social, Education, and Staff: no workspace label clipped; the thumb on the right segment.  
2. Home from any workspace lands on `/home`; the workspace cookie is unchanged.  
3. Rail: eyebrow, tile rows, one active row; the collapsed rail fits.  
4. Phone: waffle order; Social dock Create circle (ring on `/social/live`); accent ink + mark on the active dest in every dock, no chip anywhere; Feed label; Ask sparkle accent, bell and search idle ink.  
5. Keyboard: Tab reaches the switcher on Settings; Escape on the Education search panel returns focus to the icon.

---

## Repo citation

`docs/design-locks/shell-unified-chrome-lock-v1.md`
