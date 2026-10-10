# [GC][24Frame] LOCK — Phone workspace band v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Amended v1.1:** 2026-10-08 (Adam, in chat) — §5, the sheet rides over the band: scroll down folds the band under the bar with the dock; scroll up or pull the bar down brings both back; a grab handle on the bar. Supersedes Departure 1 and the Explicit OUT drag handle.  
**Amended v1.2:** 2026-10-08 (Adam, "just build it") — [`shell-phone-nav-motion-lock-v1.md`](shell-phone-nav-motion-lock-v1.md): §1 Current's page colour is a sliding thumb (it slides to the tapped pill and settles; the glyph fills as it lands), and the fold is `overflow-clip`.  
**Amended v1.3:** 2026-10-08 (Adam, in chat: "the bar doesn't feel like it works very fluidly or naturally") — §5 rewritten: the bar slides over the band 1:1 with the scroll and the finger, over a page that scrolls under the chrome; the band no longer folds.  
**Amended v1.4:** 2026-10-09 (Adam, from an iPhone Safari recording and a bot review of it; picks "Fix bugs, keep sheet", "Match bar at rest", "Keep slide, stop jumps") — §5 keeps the model and fixes what broke it: the chrome takes no vertical pan (a drag never scrolls the document, bounces the white page, or starts Safari's pull-to-refresh), the covered strip is the page's, the page position is clamped at both ends, a lost finger-up still settles, and the status-bar tap ignores a finger's scroll. At rest the dock lands the way the bar did. §1 the row reopens where it was left.  
**Amended v1.5:** 2026-10-09 (Adam, on the phone chrome scroll review: "after you are done. fix and change everything that you recommend. make sure we have the greatest quality perfectly built for the long-haul. do not cut corners or compromise anything.") — §5 keeps the model, its look and its timings, and makes every rest land. Rest is the page scroller's `scrollend` where the browser fires it (Safari 26.2 and later) and 120ms without a scroll event only where it does not, never both; one settle per rest. Near the top the page and the bar settle together, written in the same frame, over 180ms. A scroll or a drag during a settle carries on from where the bar is. Every settle ends open or covered with the dock landed, and the dock's hide starts in the same frame as the bar. The tracker runs only below `md`.  
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

### v1.4 (verbatim, 2026-10-09)

On a screen recording of Social Home in iPhone Safari (the top rows pushed up and pulled down):

> Notice at the end of the video how messy the user experience is with the top menu section (the row with the logo, etc. that I push up or pull down)

> file was too big to upload, so I had grok bot review. here is its review

The review saw the rows drift apart, rest partway, the band's sideways position jump, a white band open under Safari's bar, Safari's pull-to-refresh reload the page, and the dock move out of step. It asked for one header unit that snaps, no cut pill, and the sheet look dropped. Traced in the code, the drift, the white band and the refresh came from a vertical drag on the chrome scrolling the document; the rest from a lost finger-up, a remount resetting the row, and the dock's separate rule. Asked which way (2026-10-09), Adam picked:

> Fix bugs, keep sheet (Recommended)

> Match bar at rest (Recommended)

> Keep slide, stop jumps (Recommended)

### v1.5 (verbatim, 2026-10-09)

Given in reply to the phone chrome scroll review (verdict "build with changes"):

> after you are done. fix and change everything that you recommend. make sure we have the greatest quality perfectly built for the long-haul. do not cut corners or compromise anything.

It approves the review's Step 1 and the two sign-offs it listed. **Approved by it:** rest becomes `scrollend` where it is fired, with the 120ms timer only below (§5 Settle; the change to this lock's definition of rest). The band pill's press lets go when a drag locks vertical (nav motion lock v1.1); that sign-off is built in its own change (v1.6), not in v1.5. The 56 to 48 band trim and any reverse threshold above 4 stay out. The compositor-driven slide waits for a recording that shows the bar still stepping.

Named for the founder, built under this approval (each reversible, inside "fix and change everything that you recommend"):

- Besides `scrollend` and a drag's release, the near-top glide also starts from the 600ms watchdog and from a quiet lift; without them those rests would never settle (a tap that stops a fling gets no `scrollend`).
- Each rest is confirmed by one frame with no scroll (two after an event), up to about 16ms on the 120ms path.
- The tracker runs below `md` only, which removes v1.3's unintended desktop near-top snap.

Not amended here (each needs its own sign-off): `--house-phone-sheet-y` moving off the shell (G8 "on the shell"); the dock's 200ms against the bar's 180ms; a near-top open that moves only the bar; any reverse threshold above 4; the 56 to 48 trim; the compositor-driven slide (it changes G8's "translate by it"); turning scroll anchoring off on `main`.

---

## 1) The band (phone)

| Token | Lock |
|-------|------|
| Place | The first thing on the phone page, above the bar, in every workspace that has the bar. Immersive surfaces that hide the bar (Explore, DM thread, Story viewer, write compose) have no band |
| Fill | **Sporty Blue in both themes**: `--workspace-band` `#1769ff`, never `--accent` (dark `--accent` is the light blue, not a brand colour) |
| Top | Flush: the status bar's safe area pads it (`env(safe-area-inset-top)`), so the pills sit right under the status bar, as in the screenshot. No other gap |
| Row | 56 tall, 16 side pads, gap 4. Slides sideways (`overflow-x-auto`, no scrollbar). **No arrow, no fade**; a pill cut at the screen edge is the scroll cue |
| Where it was left | (v1.4) The row reopens where it was slid: a remount (the header's data arriving, back from Explore or a story) never resets it to the start. Revealing the current pill moves the row only when that pill is off screen, and stops at the 16 pad |
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

## 5) The sheet rides over the band (v1.1; v1.3 motion)

v1.3 founder note (verbatim): "either way, the bar doesn't feel like it works very fluidly or naturally". The v1.1 build folded the band's height on a timer once a scroll crossed a threshold, which resized the page under the finger, and then ignored scrolls for a beat. v1.3 makes the bar move with the finger instead.

| Token | Lock |
|-------|------|
| Model | On phone the chrome (band, bar, Education search row) floats over the top of the page scroller, out of flow; the page starts under it (a spacer as tall as the chrome) and scrolls under it. Nothing changes size while the page scrolls. Page scroll stays on `main` (G9) |
| With the scroll | Scroll down and the bar slides up over the band by exactly as far as the page scrolls, up to the band's 56; scroll up and it slides back the same way, anywhere on the page. Half a scroll is half a cover. No easing while it tracks |
| Settle | When the scroll rests between open and covered, with no finger down, the bar settles the way it was moving: covered if the page was going down, open if up. (v1.5) The way turns only once a reverse reaches 3, so finger jitter and the lift never turn it; the cover itself still follows every pixel. **Rest** is the page scroller's `scrollend` where the browser fires it (Safari 26.2 and later; 600ms without one stands in if it never comes), or 120ms without a scroll event where it does not, never both; the next frame without a scroll confirms it, and a rest settles once. A finger lifting after a touch that moved nothing, or after `scrollend` already came, is a rest too. Deeper down only the bar eases, 180ms. Near the top (below) the page and the bar move together, written in the same frame, over exactly 180ms, started only from such a rest or from a drag's release; on the 120ms path the browser's own smooth scroll moves the page and the bar follows it. A drag's release settles at once only if the page took no other scroll during the touch; otherwise it waits for the rest. A touch, the status-bar tap, or a scroll the settle did not make stops it. A scroll or a drag during any settle carries on from where the bar is on screen, with no jump. Every settle ends with the bar open or covered and the dock landed: a settle cut short finishes at once, and near the top the page moves with it, so no gap opens |
| Drag | A vertical drag that starts on the band, the bar, or the Education search row moves the bar under the finger (it reads as vertical after 6 of travel, more up/down than sideways), and settles the same way on release. Sideways slides of the band row never move it |
| Top | The top of the page always shows the band |
| Near the top | Within the first 56 of scroll, a settle or a drag scrolls the page by the change in cover (not to a fixed position), so the bar and the content move together and no gap opens between them. Deeper down the content is already under the bar, so only the bar moves |
| Dock | While the page moves, keeps its own hide-on-scroll rule from the same scroll (hides on 8 down, returns on 8 up). (v1.4) At rest it lands the way the bar did: hidden under a covered band, back with an open one, after a settle, a drag, or `open` alike. (v1.5) The hide starts in the same frame as the bar's move: the tracker marks the shell and the dock hides from that mark. Hidden from assistive tech and out of the tab order follow with the state a moment later. Its look and its 200ms stay |
| Touch | (v1.4) The band, its row, the bar, the Education search row and the dock take sideways pans and pinch only (`touch-action: pan-x pinch-zoom`). A vertical drag on them is the bar's (the tracker's), never a scroll of the document: both rows never move as one, no white page bounces under Safari's bar, and no pull-to-refresh starts from the chrome |
| Covered strip | (v1.4) The stack lets taps through where it draws nothing: the strip the covered bar leaves is the page's to tap and scroll |
| Ends | (v1.4) The page position the bar and the dock follow is clamped to the page (0 to its range): the rubber band at the top or the bottom moves neither |
| Pull-to-refresh | (v1.4) None. The page scroller contains its overscroll; html and body have `overscroll-behavior-y: none`; the chrome takes no vertical pan. Safari's pull-to-refresh never starts and the page never reloads under the finger. There is no in-app pull-to-refresh |
| Finger up | (v1.4) A touch whose element is removed mid-gesture (the header's data arriving, a skeleton giving way) still ends: the tracker listens on the touched element too, so the bar always settles |
| Corners | A 24 Sporty Blue strip rides just under the bar's top edge, so the rounded corners show blue at rest and while the bar slides |
| Handle | 36 × 4, radius full, the tertiary ink at 40%, centred 4 below the bar's top edge, in the bar's 8 phone strip. Decorative (`aria-hidden`); the drag is the control, so no target smaller than 44 is added |
| Under the chrome | Sticky rows inside a page and scroll-into-view stop at the chrome's visible bottom (`--house-phone-chrome-visible`), not under it |
| Access | The covered band stays in the accessibility tree. Keyboard focus into it brings the bar back |
| Status-bar tap | While the tap bridge holds the window at 1, html's scroll anchoring is off (`house-lead-scroll-to-top`), so no layout shift can read as a status-bar tap. (v1.4) A window at 0 while a finger is on the page, or within 400ms of the last lift, came from the finger, not the status bar: the bridge puts the window back without moving the page. (v1.5) The tap stops a running settle before its smooth scroll starts, so a settle never writes over it |
| Reset | Every navigation starts open. (v1.5) The tracker stops in the same commit as the new route, before it paints, so a settle never writes into the next page |
| Width | (v1.5) The tracker runs only below `md` (Tailwind's `max-md`, `not all and (min-width: 48rem)`): at `md` and up nothing tracks, settles or hides. (v1.3 also settled a desktop page near the top; that was never in scope) |

---

## Departures

1. ~~**The band stays pinned with the bar.**~~ Superseded by §5 (v1.1, Adam 2026-10-08: "let's do this now"; v1.3 motion). On phone the chrome floats over the page scroller and the bar slides over the band with the scroll; page scroll stays on `main`.
2. **Safari's status bar strip is Safari's.** In a Safari tab the page cannot paint behind the status bar; the band starts at the page's top edge. Without `viewport-fit=cover` the safe-area pad is 0. No `theme-color` is set in this lock; check the tint on a device.
3. **`md` to `lg` keeps the grey workspace pill and its popover** (tablets), unchanged.

## Explicit OUT

- An arrow, a fade, or a "More" control on the phone band or the phone topic row
- `--accent` (or any light blue) as the band's fill in dark mode
- A Staff pill
- A tappable handle target smaller than 44 (the pull is a drag on the lead stack)
- Resizing the page scroller while the page scrolls; easing the bar while it tracks the scroll or the finger
- Changes to desktop, the docks' look, or the side menu (v1.5: the dock's hide is driven from a mark on the shell; same look, same 200ms)

---

## Gates

**G1.** Phone: `data-workspace-band` is the lead stack's first child, before `data-house-lead-chrome`; `md:hidden`; `bg-workspace-band`; `pt-[env(safe-area-inset-top)]`.  
**G2.** Pills `home`, `aggregation`, `social`, `education`, each an icon and its word; at most one `aria-current="page"`, on the route's workspace; none on `/settings` or `/staff/*`.  
**G3.** `--workspace-band` is `#1769ff`; `.dark` does not redefine it; `.dark` maps `--workspace-band-pill-ink` to white.  
**G4.** The row is `overflow-x-auto`; the band has no fade and no button.  
**G5.** Phone bar: `max-md:rounded-t-[var(--radius-xl)] max-md:bg-bg`; the grey pill host is `hidden md:block lg:hidden`.  
**G6.** Topic row: the fade is `max-md:hidden`; the cut class and the end scroll padding are `md:` only.  
**G7.** Phone: the lead stack is `max-md:absolute` over `main`; `main`'s first child is `data-house-phone-chrome-spacer` (`md:hidden`, the chrome's height); the band never changes height.  
**G8.** One tracker: the phone shell provides `HousePhoneChromeContext` and the band's half, `HousePhoneBandContext` (`bandTucked`, `open`; v1.5, so a dock flip never re-renders the band). The tracker (`house-phone-chrome-runtime`, bound in `house-phone-chrome-state`) writes `--house-phone-sheet-y` (the cover, 0–56) on the shell each scroll; the bar, the corner strip, and the Education search row translate by it; no other scroll listener hides the dock.  
**G9.** The bar's first child is `data-house-lead-grip` (`aria-hidden`, `md:hidden`, 36 × 4); the phone bar is 64 with an 8 top strip.  
**G10.** The cover follows the scroll 1:1, clamped 0–56, 0 at the top; it settles only at rest (G14), the way it was moving (a reverse counts from 3). Deeper down the bar eases 180ms; near the top the page and the bar glide 180ms together (on the 120ms path, the browser's smooth scroll). A vertical drag on `[data-house-lead-stack]` moves it 1:1; near the top both scroll the page by the change in cover.  
**G11.** (v1.4) The band, its row, the bar, the Education search row and the dock carry `touch-pan-x touch-pinch-zoom`; the stack is `max-md:pointer-events-none` and what it draws is `max-md:pointer-events-auto`; html and body have `overscroll-behavior-y: none`.  
**G12.** (v1.4) At rest the dock lands with the bar (`housePhoneDockAtRest`): covered hides it, open shows it; the page position is clamped to the page (`housePhoneSheetPageY`); the tracker listens for the finger's moves and lift on the touched element (v1.5: moves too); the bridge ignores a 0 a finger made.  
**G13.** (v1.4) The band's track remembers its rail (`rememberRail`): the rail's position is restored before the current pill is revealed.  
**G14.** (v1.5) Rest and settle (`house-phone-chrome-runtime`).
- Rest is `scrollend` when `'onscrollend' in` the page scroller, with a 600ms watchdog; otherwise the 120ms timer; never both. A frame with no scroll confirms it (two after an event), and it settles once.
- Near the top the settle is the glide: `scrollTop` and the cover in one animation frame, on `HOUSE_PHONE_SHEET_EASE` (`cubic-bezier(0,0,0.2,1)`, the deep settle's curve), for 180ms from its first frame. It starts only from a proven rest, or from a drag released with no other scroll during the touch. A touch, the status-bar signal (`HOUSE_LEAD_SCROLL_TO_TOP_EVENT`), or a scroll more than 1 from what it wrote stops it.
- On the 120ms path the browser's smooth scroll is used, landed 120ms after its last scroll event.
- Every settle ends in `land()`: open or covered, the dock landed, never another page settle.
- End checks use 0.5 (`HOUSE_PHONE_SHEET_TOLERANCE_PX`). The way turns on a 3 reverse (`HOUSE_PHONE_SHEET_REVERSE_PX`), reset when a drag starts and never applied to the cover.
- Touch moves apply once per animation frame, flushed before the release.
- A finger counted down for 10s with no touch event is lifted.

**G15.** (v1.5) Dock: `data-house-phone-dock-hidden` on the shell, written in the handler that writes the cover. The dock always carries `HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS` (`in-data-house-phone-dock-hidden:pointer-events-none in-data-house-phone-dock-hidden:translate-y-full`). `aria-hidden`, `tabIndex` and the Create fan follow React state. Every navigation clears the mark in the new route's commit.  
**G16.** (v1.5) Width: the tracker runs only while `HOUSE_PHONE_CHROME_MEDIA` (`not all and (min-width: 48rem)`) matches; off it nothing is bound and the chrome reads open.

## Verify-on-ship

1. Phone 390, light and dark, on Home, Aggregation, Social, and Education: the blue band at the very top, the current pill in the page colour, the bar's rounded corners on the blue.
2. Swipe the band: Education slides into view; no arrow appears.
3. Feed: the topic row slides with no arrow; a chip shows cut at the edge.
4. Settings and a Staff page: no pill lit.
5. Desktop and tablet (`md` to `lg`): unchanged.
6. (v1.3) Scroll down slowly: the bar follows the finger over the band, pixel for pixel. Stop halfway and let go: it settles the way you were going. Scroll up anywhere: the bar slides back with the finger.
7. (v1.3) Drag the bar down and up: it moves under the finger; release and it settles. Slide the band's pills sideways: the bar stays.
8. (v1.3) Dashboard and Reports tables: the sticky header row stops under the bar, not behind it.
9. (v1.4) iPhone Safari (and WebKit at 390 × 844 and 430 × 932): deep in the feed, pull the bar down: the page stays where it was, no reload, no white band, the two rows never move as one.
10. (v1.4) Drag the band, the bar and the dock up and down: only the bar moves (dock: nothing). At the top, pull down on the band: no spinner, no reload.
11. (v1.4) Cover the band, then tap a post in the strip just under the bar: the post takes it.
12. (v1.4) Slide the band to Education, open a story or Explore, come back: the row is where it was. Every other return: no jump.
13. (v1.4) Scroll a little and stop, slow and fast, and jitter: the bar rests only open or covered, and the dock with it. Bounce at the bottom of the feed: neither moves.
14. (v1.5) Near the top, scroll about 20 and let go: the page and the bar glide to covered together, with no seam in any frame, the dock with them. From covered, scroll up to about 30 and let go: both glide open.
15. (v1.5) Fling near the top and let it coast: nothing settles until the page stops, and the fling is never cut short.
16. (v1.5) Deep in the feed, let go mid-cover, then scroll again within 180ms: the bar carries on from where it is.
17. (v1.5) Thirty quick stop-start scrolls, near the top and deep, slow and fast: the bar always rests open or covered, and the dock with it.
18. (v1.5) During a settle near the top, tap the status bar: the page goes to the top, the bar opens, nothing fights.
19. (v1.5) Tap the feed to stop a fling, then lift: the bar settles.
20. (v1.5) Reduce Motion: every settle is instant. Low Power Mode: near the top the page and the bar still move together.
21. (v1.5) Desktop and iPad (`md` and up): a scroll that stops near the top stays where it stopped.
22. (v1.5) Navigate while the dock is hidden: the new page opens with the bar open and the dock shown.
