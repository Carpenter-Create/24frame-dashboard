# [GC][24Frame] LOCK — Social Feed · Reels rail v1

**Date:** 2026-10-04 (CT)  
**Status:** **APPROVED** (founder pick, Adam, 2026-10-04, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** A "Reels" row of vertical-video stills inside the Feed's post wall, and Explore opening at one reel (`/social/explore?v=<post uuid>`). Not the post card face, not the shell. The Feed head (tabs, topics, stories, composer, aside) is [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Entity:** Global Content / 24Frame only  
**Board:** **G · Combined · Feed** (`CombinedFeed.dc.html`) §5, desktop rail after post 3 and phone "Scrolled to Reels". Board colours map to tokens: tile fill and scrim `--band`, text on media `--band-ink`, line `--border`, page `--bg`, quiet label `text-ink-3 dark:text-ink-2`.  
**Amends:**
- [`social-home-activity-feed-lock-v1.md`](social-home-activity-feed-lock-v1.md): the wall now carries a Reels rail after every 3 posts.
- [`social-home-following-mux-active-gate-lock-v1.md`](social-home-following-mux-active-gate-lock-v1.md): rail tiles are stills; they never join the band order and never mount a player. One player at a time still holds.
- [`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md): For You accepts `?v=` as its start item (below). Everything else in Explore v2 stays.

---

## Founder words (verbatim, Adam, 2026-10-04)

> I also like the idea of the main feed showing a few posts (up and down page in feed) and then breaking it up with reels that you horizontally scroll through or vertically continue to scroll through other posts (breaking up the feed every few posts).

Question asked: "after every 3 posts, vertical videos from For you, swipe sideways (arrows on desktop), page keeps scrolling down, tapping opens Explore at that reel. It shows in both Following and For you."

Answer: **"As drawn (Recommended)"** — option text: "Every 3 posts, both tabs, labelled 'Reels', tap opens Explore and Exit returns to the same spot."

## Placement and source

| Item | Lock |
|---|---|
| Cadence | One rail after every **3** posts (after posts 3, 6, 9 …), wherever the post wall renders, in either lane. A wall that ends on post 3 still gets the rail after it. Today the For you lane paints Suggested people, not a post wall, so the rail shows in Following; it follows the wall into For you with no change here. Older wall pages: **open** (below) |
| Source | The **For you** Explore list: the same RLS-bound loader (`loadExploreMedia`) and ranking as Explore, Mux video only, in Explore order. No new SQL, no new query shape |
| Vertical | A video whose recorded frame is taller than wide. A video with no recorded frame stays in (Explore's For You is the vertical stream and older posts carry no frame). Landscape and square are out |
| Rail size | 6 tiles. Each later rail continues where the last stopped; no repeats. A reel that is already a post in the wall is dropped |
| Skip | Fewer than **2** reels left: that rail and every later one are skipped. No empty state |
| Pure plan | `socialFeedReelPlan` in `src/lib/social-feed-reels.ts` (tested). Group feeds pass no reels and get no rail |

## Open for the founder

**Older posts and repeats.** Not decided by the brief, so not locked here. "Older posts" loads the next wall page as a new address (`/social?after=<cursor>`), and that page reads the For you list again from the top, so its rails repeat the first page's reels in the same order. (One full wall page of 50 posts can use the whole list of 20 in rails of 6, 6, 6 and 2.) The options: keep it (each wall page starts the reel list again), or carry the reel position through the "Older posts" link so later pages continue without repeats, which leaves later pages with no rail once the list is used up. Shipped behaviour until the founder decides: each wall page starts the list again.

## Desktop (`md+`)

`<section aria-label="Reels">`, 32 above and below in the feed gutter. Head 30 tall: the "Reels" eyebrow (13 / 500 / 0.06em / uppercase, quiet ink) and two 30×30 arrow buttons (radius 10, hairline, page fill, 14 chevrons): **Previous reels** (`aria-disabled` and 40% at the start) and **Next reels** (`aria-disabled` at the end). Arrows move the rail by **two tiles (384px)** with smooth scrolling. Tiles **180×320** (9:16), gap 12, inside the 620 column: 3 tiles and a 44 peek. Tiles are links, in tab order. The track pads 5 above and below (taken back in margin, so the tiles still start 12 under the head) so a tile's keyboard focus ring (2px, 3 offset) draws whole, not as two side bars.

## Phone (`<md`)

The rail meets the viewport. Eyebrow padded 16 on a 16 label row, no arrows (tiles start 28 under the rail top). Track pad 16, gap 8, `scroll-snap-type: x mandatory`, `scroll-padding-left: 16`, tiles snap to start. Tiles **160×284**: 2 tiles and a 38 peek at 390. Vertical pans pass through to the page (`touch-action: pan-x pan-y`); sideways overscroll is contained. 28 above and below.

## Tile

| Item | Lock |
|---|---|
| Still | The Mux thumbnail (`SocialStoryMuxThumb`, signed or public). **No player, no video**. Stills are held until the rail is within 600px of the viewport, then minted |
| Fill | `--band` before the still paints, radius 10, an edge vignette (radial, black 45% at the rim) |
| Bottom band | `--band` scrim at 94% / 78% / 0, pad 48 12 12 (phone 40 10 10) |
| Author | 24 portrait with a 1.5px `--band-ink` ring at 70%, name 13 / 600 `--band-ink`; wraps, never truncated |
| Caption | The post's first line, whole, 13 / 1.35 `--band-ink`, 6 under the name. It wraps; it is **never cut with an ellipsis** or clipped. A first line over 100 characters does not fit a phone tile whole, so the tile shows the name only; the line stays in the tile's accessible name and in Explore |
| Accessible name | "{Name}, {first line}. Opens in Explore" |
| Duration chip | **Out for now.** The board draws a duration; Social posts store no video duration, so none is shown rather than invented. Adding it needs the Mux asset duration stored with the post at publish (a separate change); posts already published would need a backfill, a production data change the founder runs |
| Accent | None |

## Explore at a reel (`?v=`)

| Item | Lock |
|---|---|
| Link | Each tile is `/social/explore?v=<post uuid>` (`exploreForYouHref({ v })`) |
| Parse | `v` must be a UUID (lower-cased); anything else is ignored. Only the default For You stream reads it; a `q`, `tag` or `person` stream ignores it |
| Load | `loadExploreVideoPost`: the same RLS-bound video-post read as For You (`status = active`, no group, Mux video) narrowed by `id`. Missing, removed, group or non-video: ignored, For You as usual |
| Order | That reel first, then the For You page with it removed (`pinExploreForYouHit`). Playback warming, mute and swipe are unchanged |
| Screen | `v` is an Explore screen query in the house shell, so a new `v` is a Next navigation and the stream re-keys |
| Exit | Desktop Exit takes **Back** when this Explore address was opened by a feed reel in this tab (as it already does for a same-origin referrer). Back lands on the Feed, where the house shell restores its scroll; the rail returns to the same sideways spot. On phone (no Exit chip) the system Back does the same |

## Gates

**G1.** Rail after every 3 posts in the post wall; 6 tiles; continues without repeats; skipped under 2.  
**G2.** Source is the For you Explore loader; vertical only; no new SQL.  
**G3.** Desktop 180×320, gap 12, 3 + peek in 620; arrows page 384 smoothly, Previous off at start, Next off at end; tiles are links.  
**G4.** Phone full-bleed, 160×284, snap, no arrows, vertical pans pass through.  
**G5.** Stills only; no player in the rail; thumbnails wait for the rail to near the viewport.  
**G6.** No ellipsis anywhere on a tile; zero accent.  
**G7.** `?v=` pins a valid video first and dedupes it; anything else is ignored. Exit returns to the same spot.

**FAIL:** a video playing in the rail · a minted thumbnail for a rail far off screen · an ellipsis or clipped caption · a reel repeated across the rails of one wall page (older wall pages: open, above) · an invented duration.

## Repo citation

`docs/design-locks/social-feed-reel-rail-lock-v1.md` · code: `src/lib/social-feed-reels.ts` (plan, tiles, caption, edges, return note), `src/components/social/social-feed-reel-rail.tsx`, `social-optimistic-feed.tsx`, `src/app/(app)/social/page.tsx`, `src/lib/social-explore-for-you.ts` (`?v=`), `src/lib/social-feed.ts` (`loadExploreVideoPost`), `src/app/(app)/social/explore/page.tsx`, `src/components/social/social-explore-exit.tsx`; classes in `src/lib/social-chrome.ts`; copy in `SOCIAL.reels`.
