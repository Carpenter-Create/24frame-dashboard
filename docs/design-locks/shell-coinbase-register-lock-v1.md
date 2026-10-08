# [GC][24Frame] LOCK — Shell in the Coinbase register: pill slider, round grey controls, brand mark in the side menu, filled accent current v1

**Date:** 2026-10-05 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-05, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Superseded in part (founder 2026-10-06, cards lock):** lighter ink in every workspace ("feels like thick ink everywhere"). The header switcher's thumb is the accent wash with accent-ink labels, not ink, so a screen keeps at most one ink element (on Social, the Feed's Following / For you thumb); the slider labels are 15 / 500 with ink-2 idle; the side-menu labels are 15 / 500; the header search input is 15 / 420. Geometry, motion, keyboard and every other value here stay. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md).  
**Superseded in part (founder 2026-10-07, cards lock §8 Header height):** "Header height locked: 56 (match Facebook), shell-wide." Then, on phone: "Phone header → 56 same as desktop." The header is **56** in every workspace on desktop and phone, not 80 / 60 (`--header-height`, one value), and the side menu's top band, the header's height, is 56 with it. Every control, pad, width and gate here otherwise stays. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md) §8.  
**Superseded in part (founder 2026-10-08):** [`staff-account-menu-lock-v1.md`](staff-account-menu-lock-v1.md). Staff left the switcher for the account menu, so the slider is **Home · Aggregation · Social · Education** for GC staff too (Assumption 1's 477-wide GC staff slider is void; members' 404 holds) and the Keeps line's "Staff last, staff only" is void.  
**Scope:** The shared shell only, in every workspace (Home, Aggregation, Social, Education, Staff): desktop header, desktop side menu (expanded and collapsed), phone top bar, phone dock. Settings keeps its own rail rows (it gains the brand band); the Education course rail is untouched. No page bodies: the Feed and posts are [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md); Explore content, Profile, and Messages are later PRs.  
**Entity:** Global Content / 24Frame only  
**Source:** The approved H boards `CoinbaseFeed.dc.html` (the shell on every board: `CoinbaseExplore`, `CoinbaseProfile`, `CoinbaseMessages`) and the H spec §1 tokens, §2 shell, §3.1 pill slider, §3.3 buttons, §3.6 dots and counts, §4 icons, §7, §8. The boards' hexes are translated to the existing tokens in `src/app/tokens.css`; no new hex. The boards' "24Frame" / "24" text marks are placeholders: the brand mark is the existing `BrandLogo`.  
**Code name:** the shell source files may not name the reference brand (house rule, `src/lib/house-shell.test.ts`), so the code calls this the **H register** and cites "the shell register lock v1".  
**Supersedes (in part):** [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1 (the 52 header, the hairline divider, the text lanes with an ink underline, the 34 controls, the 232×34 field, the xl Ask pill and its label, the 28 avatar), §2 (the 200 / 64 column under the header, the workspace eyebrow, the top-row collapse, 36 rows at 13px, the muted current row at 600 with Bold glyphs, the accent Create tile, the 24×1 rule), §3 (the grid button face, the 30 avatar, the 8 trail pad, hits that abut), §4 (the 46 row, the ink Bold glyph with a 4px ink dot, the 40 Create), §5 changed tokens, Assumptions 2 and 7, and G1–G5 · [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) Home one-column range (amended in place to 768–1263) · [`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md) the header row and the Exit chip (amended in place) · `src/lib/HOME-width-lock.md` (the 240 rail, amended in place).  
**Keeps:** every workspace lane, entitlement, and keyboard rule (Home is a real segment that writes no workspace cookie; Staff last, staff only; one Tab stop; arrows move; `role="tablist"` / `tab` / `aria-selected` plus `aria-current="page"`); one current side-menu row per path (`houseRailActiveIndex`); keyboard focus stays on the collapse control across the toggle; search on Social and Education only; the Ask sparkle in Sporty Blue; icons-only dock; the phone workspace switch behind one control that opens the sheet; Explore with no side menu (the screening lock's Departure 1); light default, dark available; dark `--surface-muted` stays #25292f (an open departure).

---

## Founder direction (verbatim, 2026-10-05)

On the Coinbase home screenshot:

> we must remain in this register.

> I want the Coinbase register, but the modernize idea of social media experience through its layout and media-immersive experience.

> we're not too far off already, just improve what we have to do what we're trying to do.

Approving the H boards:

> I like the designs. Let's use them. 1) that's fine, but use default text "Search Social" 2) yes 3) ok 4) yes. 5) sure

Still in force: Geist; the ladder 13 / 15 / 17 / 20 / 28 / 56; body 420, title 480, medium 500, semibold 600; tokens only (hex only in `src/app/tokens.css`); light default and dark; nothing truncated on phone; copy in `src/lib`; logic and classes in `src/lib`; one component per pattern; no status colours (unread is a blue dot, never a red badge); no drop shadows except the phone dock's float.

| # | Question | Pick | Where it lands |
|---|----------|------|----------------|
| 1 | Ask 24Frame AI becomes a round grey button with the blue sparkle; its label stays as the accessible name and the tooltip. The header search pill's placeholder on Social? | **"that's fine, but use default text "Search Social""** | This lock §1 (Ask; Search) |
| 2 | The brand mark moves from the header to the top band of the side menu (the real `BrandLogo`, unchanged)? | **"yes"** | This lock §2 (top band) |
| 3 | Explore uses one search field, the header's? | **"ok"** | Explore content PR — not this lock |
| 4 | Messages bubbles: mine light blue, theirs light grey? | **"yes"** | Messages PR — not this lock |
| 5 | "For you" stays both as the slider option and as the right column heading? | **"sure"** | [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) |

---

## 1) Desktop header (`md+`), every workspace

| Token | Lock |
|-------|------|
| Height | *(Superseded by the cards lock §8: 56.)* **80** (`--header-height`), the page canvas (`--bg`, 85% glass), **one hairline under it**. It starts at the side menu's right edge (`md:ml-[var(--sidebar-width)]`) and never crosses the full-height side menu |
| Pads | Lead **24** after the side menu's edge (the board); end **32** (the shell gutter, so the avatar's ink lines up with the page's right edge). Where the page has no side menu, the bar carries the brand mark and takes the **32 / 32** pair, so the mark's ink sits at 32 as it does in the side menu |
| Brand | Not in the bar beside a side menu (it is in the side menu's top band, §2). Where the page has no side menu (Co-Productions, Help, Activity, the story stages, Explore) the bar leads with the brand mark |
| Switcher, `lg+` | *(Thumb and labels superseded by the cards lock: the accent-wash thumb with accent-ink, labels 15 / 500, ink-2 idle.)* The **primary pill slider**: Home · Aggregation · Social · Education · Staff (Staff last, staff only). The house `SegmentedTrack`: a `--surface-muted` track, radius full, **no inset**; the selected segment is an **ink thumb** (`--text`) that slides **220 ms ease-out**; segments **44** tall, pad **16**, labels **17 / 600**, ink idle and the page colour (`--bg`) on the thumb (the label ink snaps with the thumb's index). `aria-current="page"` on the lit segment. Where no segment is lit (Settings, Activity, Help, Co-Productions) the thumb is hidden and Home owns the one Tab stop. Before the thumb is measured (the server paint, until hydration) the lit segment carries the ink itself (`data-segmented-pending`), so its page-colour label never paints white on grey |
| Switcher, `md` to `lg` | The **grey workspace pill** (§3), which opens the workspace popover. The slider (477 wide for GC staff) does not fit beside the 240 side menu and the trailing controls below 1024 (Assumption 1) |
| Trailing | **[search] · Ask · bell · avatar**, **8** apart, at least **24** after the switcher (the bar's gap). The trailing cluster gives way first (the search pill shrinks to 240); the switcher never shrinks |
| Search | *(Input superseded by the cards lock: 15 / 420.)* Social and Education only. From `xl`: the **wide grey pill** — **44** tall, radius full, `--surface-muted`, pad 16, a **20** glyph in ink-2, gap 12, input **17 / 420** ink, placeholder ink-2; it flexes `0 1 360px` with a **240** floor. Placeholder on Social: **"Search Social"** (founder decision 1); Education keeps "Search courses and videos". Below `xl`: the **round grey 44** search icon (Social links to Search; Education opens the field in a hairline panel, no shadow). Same form, input, action, and voice mic |
| Ask | A **round grey 44** (`--surface-muted`) with the **20** accent sparkle (the house AI mark, stroke register). **No visible label at any width**: "Ask 24Frame AI" is the accessible name and the tooltip (`title`) (founder decision 1). Hover and open step the fill to the hairline grey |
| Bell | A **round grey 44** with a **20** ink bell. Unread: a **10 accent dot with a 2px page ring** (14 box) 6 in from the circle's top-right. Never a count badge, never red. Accessible name **"Notifications, new"** while anything is unread |
| Avatar | The **44** photo (`--header-avatar-size`), 8 out like every control |
| Round grey 44 | One class for every header control: `--surface-muted` fill, ink glyph, radius full; hover, `aria-pressed`, and `aria-expanded` step to the hairline grey (`--border`) |
| Explore | After the switcher, 16 out: **Exit**, a grey pill **44**, radius full, pad 16 / 20, a **20** X, gap 8, "Exit" **17 / 600** ink. Below `lg` the X-only 44 circle (the accessible name stays "Exit"). Explore's header search shows only as the `xl` pill (no icon form on Explore), so the mark, the slider, and Exit fit from `lg` for GC staff |

## 2) Desktop side menu, every workspace

| Token | Lock |
|-------|------|
| Column | Flush left, **the full viewport height** (top 0), the page canvas, **one hairline on its right**. No card, no radius. Width `--sidebar-width` **240**; collapsed `--sidebar-width-collapsed` **80** |
| Top band | *(Height superseded by the cards lock §8: 56, the header's height.)* **80** (the header's height), no hairline under it: the **real `BrandLogo`**, unchanged, its ink at **32**, vertically centred, linking to the workspace home (founder decision 2). Collapsed: the emblem (the same Asset 8 geometry as the phone lead), centred — the 93-wide wordmark does not fit in 80 |
| Rows | *(Labels superseded by the cards lock: 15 / 500.)* From 8 under the band: pad 0 **16**, rows **56** tall (they grow if a label wraps; nothing is cut), **8** apart, radius full, pad **16**, gap **16**, a **24** glyph slot, label **17 / 500** |
| Idle | No fill; Phosphor **Regular** glyph and label in ink. Hover: the muted wash |
| Current | The **accent wash** (`--accent-wash`) with the **filled** glyph (Phosphor **Fill**) and the label in **accent-ink**; **the weight stays 500** (the boards: "same weight") |
| Create (Social) | An **ordinary row**: the plus-in-a-rounded-square glyph (`PlusSquare`), no tile, no accent |
| Eyebrow | **None** — the header slider names the workspace; the nav keeps the workspace as its accessible name. Staff rows keep the hairline and the "Team" section eyebrow |
| Messages unread | An **8 accent dot** at the row's right end; the accessible name is "Messages, N unread" (the count lives there, never on screen) |
| Collapse | At the **foot**: a quiet **44** round transparent button with a **20** « in ink-2, 24 in and 24 up; collapsed, the same button (») centred at the foot. One `<button>` in one slot in both states, so keyboard focus stays on it |
| Collapsed | **56** circle links, centred, 8 apart; the current circle washed with the filled accent-ink glyph; `title` tooltips; the Messages dot at the circle's top-right |
| One current | Exactly one current row per path (`houseRailActiveIndex`, the dock's test) |
| Settings | Shares the column and the brand band; keeps its own rows (wash + accent-ink) and no collapse |
| Explore | No side menu on desktop Explore (unchanged; the board's collapsed rail lands with the Explore PR). The bar carries the brand mark |

## 3) Phone top bar (`max-md`), every workspace

| Token | Lock |
|-------|------|
| Height | *(Superseded by the cards lock §8: 56, the same as desktop.)* **60** (`--header-height`), the page, one hairline under it. Pads **16** lead / **12** trail |
| Leading | The emblem (the existing mark) in a **44 × 44** link (the hit reaches 11 into the 16 lead gutter, so the 33-wide mark keeps its place; phone targets ≥ 44), **8**, then the **grey workspace pill**: **44**, radius full, `--surface-muted`, pad 12 / 16, an **18** filled grid, gap **8**, the current workspace's name **15 / 600** ink. Accessible name "<name>, Workspaces". It opens the workspace sheet (phone) or popover (`md` to `lg`) |
| Narrow | Below **360** the name steps out (it stays in the accessible name) and the pill is a 44 circle, so the bar fits at 320. Where no workspace is lit (Settings, Activity, Help, Co-Productions) the pill is the 44 circle |
| Trailing | **4** apart: round grey 44 **search** (Social only; Education keeps its row under the bar), round grey 44 **Ask** (accent sparkle), round grey 44 **bell** (the dot), the **44** avatar photo |
| Explore | No top bar; full-bleed (unchanged) |

## 4) Phone dock, every workspace

| Token | Lock |
|-------|------|
| Pill | **56** (`h-14`), radius full, **16** from each side and from the bottom (`max(16px, safe-area)`), `--surface`, **no hairline**, the soft float (`--elevation-float`, the product's only UI shadow) |
| Slots | Icons only, accessible names. Five equal slots on Social (each `flex:1`, no pad); every target fills the 56 row |
| Idle | A **24** Phosphor Regular glyph in the quiet ink |
| Current | The **filled glyph painted accent**. No dot, no chip. It is the phone form of the side menu's current row (blue and filled); the filled shape carries the state without colour (WCAG 1.4.1) |
| Create (Social) | A **44 accent circle** with a **22** Bold plus in `--accent-contrast` — an action, not a place. Its ring on `/social/create` and `/social/live` stays |
| Messages unread | An **8 accent dot with a 2px ring in the dock's surface** (12 box) at the glyph's top-right; the accessible name is "Messages, N unread" |
| Clearance | `--house-phone-dock-clearance: calc(3.5rem + max(16px, env(safe-area-inset-bottom)) + var(--space-4))` — the 56 pill, the float, and the house 16 above it |

## 5) Tokens and dark mode

| Board key | Token |
|-----------|-------|
| page | `--bg` |
| muted | `--surface-muted` |
| line | `--border` (`border-hairline`, `bg-hairline`) |
| ink / ink2 | `--text` / `--text-secondary` |
| ink3 | `text-ink-3 dark:text-ink-2` (`HOUSE_SHELL_QUIET_INK_CLASS`) |
| acc / onAcc | `--accent` / `--accent-contrast` |
| wash / accInk | `--accent-wash` / `--accent-ink` |
| thumb / onThumb | `--text` / `--bg` |
| dock / dockSh | `--surface` / `--elevation-float` |

No new token and no new hex. Changed: `--header-height` 52 → **80** (phone 60 unchanged; *56 on desktop and phone since the cards lock §8*), `--header-avatar-size` 28 / 30 → **44 / 44**, `--header-desktop-control-size` 34 → **44**, `--sidebar-width` 200 → **240**, `--sidebar-width-collapsed` 64 → **80**, `--house-phone-dock-clearance` 3rem → **3.5rem** pill. Every colour flips under `.dark`.

## 6) Data: the Messages dot

The shell's chrome loads the caller's DM inbox once per layout (`get_dm_inbox`, the same source as Home's Social module) without awaiting it, and sums the unread counts (`overviewSocialUnreadTotal`). The side menu and the dock paint at 0 and add the dot when the count resolves; a failure is 0 (no dot). No SQL, no new RPC, no new table.

---

## Assumptions (stated, reversible)

1. **`md` to `lg` keeps the grey workspace pill.** The slider is 477 wide for GC staff (404 for members) at 17 / 600; beside the 240 side menu and the trailing controls it needs about 1000 (1004 with the Social search icon), so it shows from `lg` (1024). Below `lg` the phone's grey pill (with the popover) leads.
2. **The header's end pad stays 32** (the gutter lock), not the board's 24, so the avatar's ink lines up with the page's right edge.
3. **Pages without a side menu** (Co-Productions, Help, Activity, the story stages, Explore) put the brand mark at the head of the bar with the 32 / 32 pair, so the mark is never lost on desktop.
4. **The collapsed band shows the emblem.** `BrandLogo` is unchanged; the band uses an emblem-only export of the same Asset 8 geometry, because the 93-wide wordmark does not fit an 80 column.
5. **The current side-menu label keeps weight 500.** The boards and the spec say "same weight"; the computed task brief said 600 — reversible in one class (`HOUSE_DEST_RAIL_ACTIVE_CLASS`) if the founder prefers 600.
6. **Icons are the house Phosphor family:** Regular idle, **Fill** current (the boards' filled glyphs); Create's row is `PlusSquare`; the dock's Create is `Plus` Bold.
7. **Search keeps its icon form below `xl`** (the board shows the pill at 1280; between 1024 and 1279 the pill does not fit beside the slider for GC staff), and Explore shows no search icon (its own discover search sits on the media until the Explore PR moves to one search).
8. **The workspace pill's name steps out below 360** (the spec says "at 320"): at 360, Social's bar is 355 wide (16 + 33 emblem + 8 + 98 pill + 4 × 44 + 3 × 4 + 12).
9. **The bell's accessible name is "Notifications, new"** while anything is unread (the board); the count is not shown.
10. **The Messages dot counts the inbox's rooms** (`SOCIAL_DM_INBOX_LIMIT`), as Home does, and refreshes with the layout (a full load or `router.refresh()`), not live.
11. **Hover on round grey controls** steps the fill to the hairline grey (`--border`): the boards specify no hover.
12. **Dark `--surface-muted` stays #25292f** (the board says #1e2126; the screening lock's Departure 4 and the H spec's Assumption 7).

## Explicit OUT

- Any change to `BrandLogo` or the mark's assets
- A count badge, a red badge, or a status colour on any unread mark
- A shadow anywhere except the phone dock's float
- A visible "Ask 24Frame AI" label in the header
- The workspace eyebrow in the side menu; a tile or an accent fill on a side-menu row
- Search on Home, Aggregation, or Staff
- Explore content (the stage, the panel, the single search), Profile, Messages (later PRs)
- New hex outside `tokens.css`

---

## Gates

**G1.** Desktop header 80 with one hairline, starting at the side menu's edge; lead pad 24 (32 with the brand mark where there is no side menu), end pad 32; no hairline divider. *(Height superseded by the cards lock §8: 56.)*  
**G2.** `lg+`: the pill slider is the house `SegmentedTrack` — muted track, no inset, ink thumb sliding 220 ms ease-out, 44 segments at 17 / 600; at most one `aria-current="page"` segment (one on workspace routes, none on Settings, Activity, Help, Co-Productions); one Tab stop; arrows move; Home writes no cookie. `md` to `lg`: the grey workspace pill. *(Thumb and labels superseded by the cards lock: the accent wash with accent-ink, 15 / 500.)*  
**G3.** Trailing: search (Social and Education) · Ask · bell · avatar, 8 apart; every control a 44 circle (round grey; the avatar a 44 photo); the search pill 44 and 240–360 from `xl` with "Search Social" on Social; Ask has no visible label, its name is the aria-label and the tooltip; the bell's unread is an accent dot, never a count.  
**G4.** Side menu: full height, 240 / 80, one right hairline, no card; the real `BrandLogo` in the 80 top band (the emblem when collapsed); 56 rows, 24 glyphs, 17 / 500 labels, 8 apart; current = the accent wash, the filled glyph and the label in accent-ink; no tiles, no eyebrow; Create an ordinary row; the collapse control at the foot, focus kept across the toggle; one current row per path; the Messages unread dot. *(Labels superseded by the cards lock: 15 / 500. The top band's height superseded by the cards lock §8: 56.)*  
**G5.** Phone bar 60: the emblem (44 tall), the grey workspace pill (44, the name at 15 / 600, the name out below 360), then search (Social) · Ask · bell · avatar, all 44, 4 apart; pads 16 / 12. *(Height superseded by the cards lock §8: 56.)*  
**G6.** Every dock: 56, no hairline, the soft float, 16 off the bottom and the sides; the current dest the filled glyph in accent (no dot, no chip); idle Regular in the quiet ink; Social's Create a 44 accent circle; the Messages unread dot.  
**G7.** Tokens only; no hex in code outside `tokens.css`; the shell source files do not name the reference brand.

## Measured (Geist in Chromium, the variable font)

- Slider labels at 17 / 600: Home 46.7, Aggregation 99.0, Social 49.8, Education 80.1, Staff 41.0 → the slider is **476.6** wide for GC staff and **403.6** for members (16 pads).
- Header fit with the 240 side menu: GC staff on Social need 996.6 at `lg` with the search icon (fits 1024); at 1280 the search pill computes to 327 (≥ 240). Explore (no side menu, the brand mark 93.2, the slider, Exit 94.6, no search icon) needs 980 at `lg`.
- Pill names at 15 / 600: Home 41.2, Aggregation 87.3, Social 44.0, Education 70.7, Staff 36.2 → at 360, Social's bar is 355.2 and Aggregation's 350.5; at 320 with the name out, Social's is 301.
- Side-menu labels at 17 / 500 fit the 136 row width: Manage courses 129.4, Licensing status 128.3, Recent activity 117.7, Industry news 110.6.
- Full-page verification (every workspace, 320 → 1440, light and dark): **pending** — see Verify-on-ship.

## Verify-on-ship

1. 768, 1024, 1280, 1440, light and dark, every workspace: the grey pill below 1024 and the slider from 1024, unclipped; the thumb on the right segment and sliding on click; the search pill from 1280 with "Search Social" on Social.  
2. Side menu: the brand mark in the top band at x 32; one current row (wash, filled glyph, accent-ink label); collapse to 80 and back from the keyboard at the foot (focus stays on the control); the emblem in the collapsed band.  
3. Phone 320, 360, 390: the grey pill names the workspace from 360 and is a circle below; search · Ask · bell · avatar all 44, 4 apart; the dock 56 with no hairline, the current glyph filled and blue; Create a 44 blue circle.  
4. Unread: the bell's dot (no count); the Messages dot in the side menu and the dock after a DM arrives and the page reloads.  
5. Keyboard: Tab reaches the slider on Settings (Home); arrows move.

---

## Repo citation

`docs/design-locks/shell-coinbase-register-lock-v1.md`
