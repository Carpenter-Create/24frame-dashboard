# [GC][24Frame] LOCK — Phone workspace band v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Amended v1.1:** 2026-10-08 (Adam, in chat) — §5, the sheet rides over the band: scroll down folds the band under the bar with the dock; scroll up or pull the bar down brings both back; a grab handle on the bar. Supersedes Departure 1 and the Explicit OUT drag handle.  
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

**v1.1 (2026-10-08),** on a second screenshot (a sheet with a grab handle at its top edge, over a coloured band):

> can we add that thing so the user can push the page up to cover the top navigation section, or pull it back down? am I misreading what's in this image?

> leave that off for now. merge 781

> also I've decided...let's do this now.

Recommendation adopted: scroll down, the sheet rides up and covers the band as the dock hides; scroll up, or pull the handle down, and the band comes back with the dock; the small grey handle on the bar is the cue.

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
| Shape | 24 top radius (`--radius-xl`); the stack behind it is the band's blue, so the corners show it. The grab handle at its top edge (§5) |
| Fill | The opaque page colour (`--bg`), not the glass, so no blue shows through. The Education search row under it is opaque too |
| Leading | The emblem only (founder: "use emblem on mobile"). The grey workspace pill is gone on phone |
| Trailing | Unchanged: search (Social) · Ask · bell · avatar |
| Height | 64 on phone: an 8 strip that holds the grab handle, then the 56 row (`--header-height`). md+ stays 56 |

## 3) Feed topic row (phone)

The row slides like the band: no fade, no More topics, and no chip hides (`SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS` and the fade are `md:` only; the track's end scroll padding is `md:` only). Desktop keeps the 96 fade, More topics, and the hide-under-fade rule.

## 4) Phone never-truncate — the founder's exception

The band row and the Feed topic row may draw a pill cut at the screen edge: the cut is the scroll cue. No other phone surface changes; labels inside a pill never truncate.

## 5) The sheet rides over the band (v1.1)

| Token | Lock |
|-------|------|
| Fold | Scroll the page down and the band's 56 row folds to 0 under the bar (200ms, ease-out; instant under reduced motion). The row stays pinned to the top, so the bar reads as sliding over the pills. The safe-area pad stays. Folded, the blue shows only in the bar's top corners |
| Together | One tracker for the band and the dock (`house-phone-chrome`, owned by the phone shell): the same scroll that hides the dock folds the band; the same scroll up brings both back. The top of the page always shows both |
| Pull | A mostly vertical drag of 24 or more that starts on the lead stack (band, bar, or the Education search row): down brings the band and dock back, up folds them. Works on any page, short ones included. Sideways slides of the band row never fold it |
| Handle | 36 × 4, radius full, the tertiary ink at 40%, centred 4 below the bar's top edge, in the bar's 8 phone strip. Decorative (`aria-hidden`); the drag is the control, so no target smaller than 44 is added |
| Short pages | A scroll folds the band only when the page can still scroll more than two rows (112) after the fold (the fold adds a row, so more than 168 open). Otherwise the dock hides alone and the band stays, so the page never jumps between folded and open |
| Settle | For 280ms after the band folds or opens, scroll events only re-base the tracker: the fold's own clamp near the bottom of a page is not a scroll up |
| Access | The folded band stays in the accessibility tree. Keyboard focus into it opens it |
| Status-bar tap | While the tap bridge holds the window at 1, html's scroll anchoring is off (`house-lead-scroll-to-top`): otherwise the fold's layout shift pulls the window to 0 in Chromium (Android), which reads as a tap and sends the page to the top |
| Reset | Every navigation starts open |

---

## Departures

1. ~~**The band stays pinned with the bar.**~~ Superseded by §5 (v1.1, Adam 2026-10-08: "let's do this now"). The band folds its row instead of the page scrolling under the header (the header stays outside `[data-house-lead-scroll]`); §5's short-page rule and settle keep the page from jumping.
2. **Safari's status bar strip is Safari's.** In a Safari tab the page cannot paint behind the status bar; the band starts at the page's top edge. Without `viewport-fit=cover` the safe-area pad is 0. No `theme-color` is set in this lock; check the tint on a device.
3. **`md` to `lg` keeps the grey workspace pill and its popover** (tablets), unchanged.

## Explicit OUT

- An arrow, a fade, or a "More" control on the phone band or the phone topic row
- `--accent` (or any light blue) as the band's fill in dark mode
- A Staff pill
- A tappable handle target smaller than 44 (the pull is a drag on the lead stack)
- Folding the band on scroll where the page could not scroll after the fold
- Changes to desktop, the docks, or the side menu

---

## Gates

**G1.** Phone: `data-workspace-band` is the lead stack's first child, before `data-house-lead-chrome`; `md:hidden`; `bg-workspace-band`; `pt-[env(safe-area-inset-top)]`.  
**G2.** Pills `home`, `aggregation`, `social`, `education`, each an icon and its word; at most one `aria-current="page"`, on the route's workspace; none on `/settings` or `/staff/*`.  
**G3.** `--workspace-band` is `#1769ff`; `.dark` does not redefine it; `.dark` maps `--workspace-band-pill-ink` to white.  
**G4.** The row is `overflow-x-auto`; the band has no fade and no button.  
**G5.** Phone bar: `max-md:rounded-t-[var(--radius-xl)] max-md:bg-bg`; the grey pill host is `hidden md:block lg:hidden`.  
**G6.** Topic row: the fade is `max-md:hidden`; the cut class and the end scroll padding are `md:` only.  
**G7.** The band row sits in `data-workspace-band-fold`: `h-14` open, `h-0` folded, `overflow-hidden`, `transition-[height] duration-200`, `motion-reduce:transition-none`; folded adds `data-workspace-band-tucked`.  
**G8.** One tracker: the phone shell provides `HousePhoneChromeContext`; the dock's hidden state and the band's fold both read it; no other scroll listener hides the dock.  
**G9.** The bar's first child is `data-house-lead-grip` (`aria-hidden`, `md:hidden`, 36 × 4); the phone bar is 64 with an 8 top strip.  
**G10.** A scroll folds the band only with more than 112 of travel left after the fold (more than 168 open); a 24 vertical drag on `[data-house-lead-stack]` opens (down) or folds (up).

## Verify-on-ship

1. Phone 390, light and dark, on Home, Aggregation, Social, and Education: the blue band at the very top, the current pill in the page colour, the bar's rounded corners on the blue.
2. Swipe the band: Education slides into view; no arrow appears.
3. Feed: the topic row slides with no arrow; a chip shows cut at the edge.
4. Settings and a Staff page: no pill lit.
5. Desktop and tablet (`md` to `lg`): unchanged.
6. (v1.1) Scroll down a long page: the bar slides over the band as the dock hides. Scroll up a little: both return. At the top: both shown.
7. (v1.1) With the band folded, drag the bar down: the band returns. Drag it up: it folds. On a short page the band stays while you scroll.
8. (v1.1) Scroll to the very bottom of a long page: no flicker between folded and open.
