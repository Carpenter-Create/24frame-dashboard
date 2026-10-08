# [GC][24Frame] LOCK — Phone nav motion v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** Phone (`max-md`) only: the workspace band's pills and every phone dock (Home, Aggregation, Social, Education, Staff). Desktop, the side menu, and the desktop slider are unchanged.  
**Entity:** Global Content / 24Frame only  
**Reference:** the founder's screen recording of a phone app's bottom tab bar. When a tab is tapped, a glass lens travels from the old tab to the new one, magnifying the icons it passes with a colour fringe at its edge, then settles into a soft grey pill behind the new tab; the new tab's icon turns from outline to filled.  
**Builds on:** [`shell-phone-workspace-band-lock-v1.md`](shell-phone-workspace-band-lock-v1.md) (the band) and [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) §4 (the dock).  
**Supersedes (in part):**
- [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) §4 Current and G6, "No dot, no chip": the current dest now sits on a soft pill that slides. No dot still holds.
- [`shell-phone-workspace-band-lock-v1.md`](shell-phone-workspace-band-lock-v1.md) §1 Current: the page colour is a sliding thumb, not the pill's own fill.

---

## Founder direction (verbatim, 2026-10-08)

> view this screen recording, specifically the icons when I select them to navigate. can we give 24frame some character like this? what is suitable for the 24frame brand?

The recommendation put to the founder (condensed from the chat):

> Copy the movement, not the glass. A sliding highlight: the current-item highlight slides to the item you tap, about 250ms, with a slight settle at the end. This works for both the band and the dock. A small press: the item shrinks slightly as you press it, and the icon turns solid as the highlight lands. No glass bubble, rainbow edge or magnifier. Motion is optional: users who turn off motion in their phone settings get no animation.

> Icon motion: do you want a tappable mock of the sliding-highlight version first, or should I just build it? — **"just build it"**

---

## 1) The sliding pill

| Token | Lock |
|-------|------|
| Mechanism | The house `SegmentedTrack` (the desktop slider's track): the pill is its thumb, measured from the current item, following the tap at once and the route after it. One component, so band, dock, and desktop slider move the same way |
| Motion | 260ms, `cubic-bezier(0.25, 1.2, 0.5, 1)`: it runs about 1% past the target and settles back (under 1px on an 80 hop) |
| Band | The thumb is the page colour (`bg-bg`), 36 tall, the pill's own width, behind the current pill's icon and word. Until it is placed (the server paint), the current face paints the colour itself, as the desktop slider does |
| Dock | The thumb spans the current dest's slot, 4 in from the dock's top and bottom (48 tall); the pill drawn is 64 wide, centred, `--surface-muted` on the dock surface. Create (Social) is an action, never current, and never carries the pill. A dock with no current dest shows no pill |
| Dock offscreen | The dock never scrolls to its current dest (it can sit below the screen while it hides) |
| Dock set | A new set of dests (a workspace switch) mounts a fresh track, so the pill measures the new slots even when the current index is unchanged |

## 2) Press and glyph

| Token | Lock |
|-------|------|
| Press | Under the finger the band pill's face eases to 96%, a dock glyph to 90% (150ms ease-out), and back on release |
| Glyph | Both weights are drawn, one on the other: Regular idle, Fill current. They crossfade over 100ms after a 150ms wait, so the glyph fills as the pill lands |
| Meaning | Unchanged: `aria-current="page"` on the route's item; the glyphs are decorative (`aria-hidden`); the dock keeps the accent ink on the current dest |

## 3) Reduced motion

The global reduced-motion rule (`tokens.css`) drops every transition to ~0: the pill jumps, the glyph swaps, the press does not ease.

---

## Explicit OUT

- Glass, blur or refraction on the pill; a colour fringe; magnifying the icons it passes
- A pill wider than the dest's slot, or on Create
- A bounce that visibly overshoots (more than ~1%)
- Motion on desktop chrome in this lock

---

## Gates

**G1.** `house-phone-nav-motion`: thumb 260ms on `cubic-bezier(0.25,1.2,0.5,1)`; glyph fade `duration-100 delay-150`; press 96% (band face) and 90% (dock glyph) under `group/nav`.  
**G2.** The band's pills are `data-segmented-item`s of a `SegmentedTrack` (`SEGMENTED_TRACK_PERSIST.workspaceBand`) whose thumb is `bg-bg h-9`; the current face paints `bg-bg` only `in-data-segmented-pending`.  
**G3.** Every dock's row is a `SegmentedTrack` (`SEGMENTED_TRACK_PERSIST.phoneDest`, `revealActive={false}`); its thumb is the 64 `--surface-muted` pill; `housePhoneDockThumbIndex` skips Create; the track is keyed by `housePhoneDockTrackKey` (its dest set).  
**G4.** Band and dock glyphs render through `HouseGlyphSwap`: two SVGs, the shown one (`opacity-100`) Fill on the current item and Regular elsewhere.  
**G5.** The band's fold is `overflow-clip`, so the track's scroll-into-view cannot move the row inside it.

## Verify-on-ship

1. Phone, light and dark: tap Aggregation then Education on the band; the white pill slides and settles, the glyph fills as it lands.
2. Every dock: tap between dests; the grey pill slides behind the new glyph; on Social, Create opens its fan and the pill stays.
3. Hold a pill or a dest: it eases down; release: it returns.
4. With Reduce Motion on: no slides, no fades.
