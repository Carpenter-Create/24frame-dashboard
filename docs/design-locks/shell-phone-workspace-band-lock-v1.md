# [GC][24Frame] LOCK — Phone workspace band v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** The phone shell (`max-md`) in every workspace: where the workspace switch lives (a band above the bar), the bar as a sheet over it, and the Feed's topic row on phone. Desktop and `md` to `lg` are unchanged.  
**Entity:** Global Content / 24Frame only  
**Reference:** the founder's screenshot of a phone app — a coloured top band of icon + word product tabs, under it a dark sheet with the logo row.  
**Mockup:** canvas https://claude.ai/artifact/8SaQn5Fc2YsDuiqTEo1SpR — the "Sporty Blue band" row (Feed and Aggregation, light and dark).  
**Builds on:** [`staff-account-menu-lock-v1.md`](staff-account-menu-lock-v1.md) (Staff is not a lane; the band has four pills for everyone).  
**Supersedes (in part):**
- [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) §3 Leading (the grey workspace pill on phone) and Keeps' "the phone workspace switch behind one control that opens the sheet". The grey pill and its popover stay from `md` to `lg`.
- [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) founder pick "Phone switch: Behind the grid button" and the Explicit OUT "An always-visible phone switcher".
- [`shell-workspace-waffle-layer-lock-v1.md`](shell-workspace-waffle-layer-lock-v1.md) the phone face of Layer 1 (the waffle sheet). Layer 1 is the band on phone; the Layer 2 docks are unchanged.
- [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §3, the phone grid button.
- [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) and [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md): the topic row's 96 fade, More topics, and the hide-under-fade rule are desktop-only.
- House gospel "phone never truncates" (2026-09-19): one founder exception, the two sliding rows below.

---

## Founder direction (verbatim, 2026-10-08)

> As it relates to 24Frame, I can imagine the following: 1) top section (blue on the screenshot) can be our workspaces (instead of how we do them now). 2) the dark part (under the blue on screenshot) can be our row with the logo, AI, search, notifications, and avatar.

> also, I'm okay with the workspace row scrolling like scrolling pills or whatever

> logo - use emblem on mobile

> and wouldn't icon with words look best, like the example I gave?

> Use the sport blue background on mobile. but, in dark mode, don't use the light blue since that is not a brand color.

> and which is best for the scrolling rows? I think remove the arrow and let the rows slide

> agree or no? · is arrow better? — answered: on phone, no arrow; desktop keeps the topic row's arrow (a mouse wheel does not scroll sideways).

> is it just your mock drawing or the app that has the big gap at the very top? it must be aligned like the screenshot I gave you.

> build the band next

---

## 1) The band (phone)

| Token | Lock |
|-------|------|
| Place | The first thing on the phone page, above the bar, in every workspace that has the bar. Immersive surfaces that hide the bar (Explore, DM thread, Story viewer, write compose) have no band |
| Fill | **Sporty Blue in both themes**: `--workspace-band` `#1769ff`, never `--accent` (dark `--accent` is the light blue, not a brand colour) |
| Top | Flush: the status bar's safe area pads it (`env(safe-area-inset-top)`), so the pills sit right under the status bar, as in the screenshot. No other gap |
| Row | 56 tall, 16 side pads, gap 4. Slides sideways (`overflow-x-auto`, no scrollbar). **No arrow, no fade**; a pill cut at the screen edge is the scroll cue |
| Pills | **Home · Aggregation · Social · Education** for everyone (Staff is the account menu's row). Icon + word: 18 Phosphor glyph (House, FilmStrip, Users, BookOpen), gap 6, 15 / 500. Face 36 tall, pad 14, radius full, inside a 44 hit |
| Idle | White glyph (Regular) and word on the blue (`--workspace-band-ink`, 4.67:1) |
| Current | The pill takes the page colour (`bg-bg`) with `--workspace-band-pill-ink`: accent-ink on white in light (5.29:1), white on `#0f0f0f` in dark. Filled glyph. `aria-current="page"`. One lit pill at most; none on Settings, Activity, Help, Co-Productions, or Staff |
| Hop | The slider's: Home goes to `/home` and writes no cookie; a lane writes the workspace cookie. Links (prefetch, long-press) |
| Focus | The house 2px keyboard ring, white on the blue, hugging the pill (drawn inside the 44 hit) |

## 2) The bar (phone) — a sheet over the band

| Token | Lock |
|-------|------|
| Shape | 24 top radius (`--radius-xl`); the stack behind it is the band's blue, so the corners show it. No drag handle |
| Fill | The opaque page colour (`--bg`), not the glass, so no blue shows through. The Education search row under it is opaque too |
| Leading | The emblem only (founder: "use emblem on mobile"). The grey workspace pill is gone on phone |
| Trailing | Unchanged: search (Social) · Ask · bell · avatar |
| Height | 56, the shared `--header-height` |

## 3) Feed topic row (phone)

The row slides like the band: no fade, no More topics, and no chip hides (`SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS` and the fade are `md:` only; the track's end scroll padding is `md:` only). Desktop keeps the 96 fade, More topics, and the hide-under-fade rule.

## 4) Phone never-truncate — the founder's exception

The band row and the Feed topic row may draw a pill cut at the screen edge: the cut is the scroll cue. No other phone surface changes; labels inside a pill never truncate.

---

## Departures

1. **The band stays pinned with the bar.** The mockup's scrolled boards show the page sliding up over the band. The phone header sits outside the page's scroller (`[data-house-lead-scroll]`), so that needs a change to the shell's scroll model; collapsing the band on scroll instead makes short pages jump at the bottom. Pinned now; the scroll behaviour is a follow-up.
2. **Safari's status bar strip is Safari's.** In a Safari tab the page cannot paint behind the status bar; the band starts at the page's top edge. Without `viewport-fit=cover` the safe-area pad is 0. No `theme-color` is set in this lock; check the tint on a device.
3. **`md` to `lg` keeps the grey workspace pill and its popover** (tablets), unchanged.

## Explicit OUT

- An arrow, a fade, or a "More" control on the phone band or the phone topic row
- `--accent` (or any light blue) as the band's fill in dark mode
- A Staff pill
- A drag handle on the bar
- Changes to desktop, the docks, or the side menu

---

## Gates

**G1.** Phone: `data-workspace-band` is the lead stack's first child, before `data-house-lead-chrome`; `md:hidden`; `bg-workspace-band`; `pt-[env(safe-area-inset-top)]`.  
**G2.** Pills `home`, `aggregation`, `social`, `education`, each an icon and its word; at most one `aria-current="page"`, on the route's workspace; none on `/settings` or `/staff/*`.  
**G3.** `--workspace-band` is `#1769ff`; `.dark` does not redefine it; `.dark` maps `--workspace-band-pill-ink` to white.  
**G4.** The row is `overflow-x-auto`; the band has no fade and no button.  
**G5.** Phone bar: `max-md:rounded-t-[var(--radius-xl)] max-md:bg-bg`; the grey pill host is `hidden md:block lg:hidden`.  
**G6.** Topic row: the fade is `max-md:hidden`; the cut class and the end scroll padding are `md:` only.

## Verify-on-ship

1. Phone 390, light and dark, on Home, Aggregation, Social, and Education: the blue band at the very top, the current pill in the page colour, the bar's rounded corners on the blue.
2. Swipe the band: Education slides into view; no arrow appears.
3. Feed: the topic row slides with no arrow; a chip shows cut at the edge.
4. Settings and a Staff page: no pill lit.
5. Desktop and tablet (`md` to `lg`): unchanged.
