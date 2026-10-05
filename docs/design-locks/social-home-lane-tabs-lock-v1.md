# [GC][24Frame] LOCK — Social Feed · G · tabs, topic words, stack v1

**Date:** 2026-10-04 (CT)  
**Status:** **APPROVED** (founder picks, Adam, 2026-10-04, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Superseded in part (founder 2026-10-05, H · Feed):** Following / For you is the primary pill slider (muted track, ink thumb, 44 segments at 17 / 600), the topics are secondary chips (the current one the accent wash with accent-ink type), the story tiles are the locked 112×200 story cards again with the name on the picture, the composer is a 44 row with a grey pill and round grey Photo and Camera, the grid is 600 / 48 / 296 with a "For you" heading over a soft grey course card, and the stack is slider → stories → composer → topics → wall. The hook, the URLs, the topic slate and its behaviour, the keyboard rule and the cold slot stay. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Scope:** The Feed at `/social`: the Following / For you tabs, the topic row, the story tiles, the composer bar, the right-hand aside, the column grid, the stack order, the skeleton and cold slot. Not the post card face, not the role line, not the shell (header, side menu, phone dock) — those are separate PRs. The Reels rail in the post wall is [`social-feed-reel-rail-lock-v1.md`](social-feed-reel-rail-lock-v1.md).  
**Entity:** Global Content / 24Frame only  
**Board:** **G · Combined · Feed** (`CombinedFeed.dc.html`, desktop 1180×1960 + phone 390×844 "Feed top" + phone "Scrolled to Reels"), from **D · Screening room** with **E · Contact sheet**'s tabs. Board colours map to existing tokens (light default, dark available): page `--bg`, muted `--surface-muted`, line `--border`, ink / ink-2 / ink-3. The board's dark ink3 (`#a7adb4`) is the house dark ink-2; quiet labels use `text-ink-3 dark:text-ink-2` (house dark ink-3 is 3.9:1 on the dark page). No new colour token.  
**Supersedes:**
- [`social-home-density-craft-sequel-lock-v1.md`](social-home-density-craft-sequel-lock-v1.md) **M4 / G3** (Following and For you as filled lane chips leading the Topics rail; "standalone underline strip = FAIL"). M3 and M7 stay.
- `SOCIAL_HOME_STACK_LOCK` **lock_topics_composer_stories_wall** (Topics → composer → Stories → wall) in [`social-home-activity-feed-lock-v1.md`](social-home-activity-feed-lock-v1.md) and [`social-home-spine-density-lock-v1.1.md`](social-home-spine-density-lock-v1.1.md). Purpose, URLs and the empty state in those locks stay.
- The Feed composer face of [`social-home-composer-fb-row-sheet-lock-v1.6.md`](social-home-composer-fb-row-sheet-lock-v1.6.md) (white band, hairlines, 32 icon hits). Prompt copy, the write sheet, icon-only Photo then Camera stay.
- Topic pills: the 32 accent-filled chip of [`social-home-spine-density-lock-v1.1.md`](social-home-spine-density-lock-v1.1.md) §C, [`social-home-topics-strip-center-lock-v1.md`](social-home-topics-strip-center-lock-v1.md) and [`social-home-topics-vertical-center-lock-v1.md`](social-home-topics-vertical-center-lock-v1.md).
- Feed story cards: 136×240 / 144×256 (spine v1.1), the FB-style create plate and accent plus of [`stories-home-rail-fb-card-lock-v1.md`](stories-home-rail-fb-card-lock-v1.md), the top-left avatar ring and "no name" of [`stories-home-rail-card-identity-lock-v1.md`](stories-home-rail-card-identity-lock-v1.md), and the phone Stories→feed hairline of [`social-home-stories-feed-hairline-lock-v1.md`](social-home-stories-feed-hairline-lock-v1.md). The `/social/stories` surface is unchanged.
- For the Feed only: the shared 720 centre + 32 + 300 For You row (Adam 2026-09-22, `SOCIAL_DESKTOP_MEASURE`; "Shared center 720" in [`social-home-spine-density-lock-v1.md`](social-home-spine-density-lock-v1.md)) and the bordered For You card. Profile, Messages and Create keep that row and card; the shell gutters of [`shell-desktop-horizontal-gutter-lock-v2.md`](shell-desktop-horizontal-gutter-lock-v2.md) are unchanged.
- In part, for the Feed only: the accent punch of [`24frame-visual-register-rich-calm-lock-v1.md`](24frame-visual-register-rich-calm-lock-v1.md) (Sporty Blue on unseen rings, Create + and primary CTAs), its Stories rail row and its 8 / 16 / 24 / 48 air. On the Feed the unseen ring and the story badge are ink, Follow is a hairline button, and the air is the board's. Media vitality, no drop shadows and listed motion stay.
- The phone row and **G2** of [`shell-desktop-header-content-inset-lock-v1.md`](shell-desktop-header-content-inset-lock-v1.md): the tabs lead the Feed and pull 12 on phone (4 under the top bar), and the topic row takes no pull. The desktop 8 inset stands.

---

## Founder words (verbatim, Adam, 2026-10-04)

> A fresh, media-oriented, immersive social media experience for the film community.

> I think I like 1) Feed, Explore from D-Screening Room. 2) Profile from F-Reel. I do also like the "Following/For you" text tabs on E-Contact sheet. I also like the idea of the main feed showing a few posts (up and down page in feed) and then breaking it up with reels that you horizontally scroll through or vertically continue to scroll through other posts (breaking up the feed every few posts). Lastly, I also like the mobile menu icons not having words, just icons.

Still in force: Geist ladder 13/15/17/20/28/56, body 420 / title 480, tokens only, light default + dark, one accent element per screen (the feed content carries **zero** accent), nothing truncated on phone, no invented features or copy beyond what the boards draw. The phone menu's icons-only pick is already met by the shell ([`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) §3); this PR does not touch the dock.

## Stack (one column, phone and desktop)

`lock_tabs_topics_stories_composer_wall`: **tabs → topic words → story tiles → composer bar → wall**. Same JSX on both devices. Air between blocks (board): phone 4 · 4 · 8 · 16 · 16; desktop 8 · 18 · 18 · 22 (tabs sit on the shared header inset).

## Following / For you (E tabs)

| Item | Lock |
|---|---|
| Host | `nav aria-label="Feed scope"`, its own row above the topics, phone and desktop. Row 44, gap 24. Phone pulls 12 so it sits 4 under the top bar |
| Label | 20 / 480 / -0.02em (`--text-lg`, title weight, `tracking-tight`). Copy reuses `SOCIAL.home.followingTab` / `forYouTab` |
| Current | Ink, `aria-current="page"`, a 2px ink underline (bottom border inside the 44 box) |
| Idle | Quiet ink (`text-ink-3 dark:text-ink-2`), a transparent 2px border so labels share a baseline |
| State | Same `useSocialHomeLive` hook and `socialHomeAxisHref` URLs as the lane chips it replaces (Following omits `lane`, For you is `?lane=for-you`, the topic is kept). The tab selects in the click; the cold slot pushes the RSC. No extra round trip |

## Topic words (D)

| Item | Lock |
|---|---|
| Order | **All**, then the 15 locked topics A→Z (`SOCIAL_CATEGORY_LABELS`). Unchanged slate |
| Face | Plain words, 13px. Current: 600 ink over a 2px ink underline in a 30 mark, `aria-current="true"`. Idle: 500 ink-2. **No pill, no fill, no accent** |
| Phone | The row meets the viewport and scrolls sideways. Items 44 tall, pad 12, group pad 4 ("All" on the 16 gutter, min 44 wide). Labels never truncate |
| Desktop | Items 30 tall, pad 11, gap 2, row pulled 11 so "All" sits under "Following" |
| Fade | A page-colour fade over the trailing edge (phone 120, desktop 76) carries **More topics** (phone 44 hit; desktop 30, radius 10, hairline, page fill) that scrolls the row on. Fade and button leave at the end of the row, so nothing looks cut off |
| Keyboard | The row's inline-end scroll padding equals the fade width (phone 120, desktop 76), so a word reached with Tab scrolls clear of the fade and More topics. Chromium scrolls a focused word only when it sits outside the track, so a word whole inside the track but under the fade would stay there: on keyboard focus (`:focus-visible`) the row scrolls that word clear of its scroll padding (`socialRowFocusShift`). A mouse press never moves the row. The row pads 5 above and below (taken back in margin, row height unchanged) so the focus ring (2px, 3 offset) draws whole |
| Behaviour | Tapping the current topic returns to All (as before). `role="group" aria-label="Topics"` |
| Empty wall | No second "All": the empty Following wall shows the empty state only. The topic row above already marks the current topic |

## Story tiles (D)

| Item | Lock |
|---|---|
| Tile | 56×100, radius 10, in a 70 item, the **first name** under it at 13px (wraps and hyphenates, never truncated; the link's name is the full name) |
| Unseen | 2px page gap + 1.5px ink ring (`ring` + `ring-offset`). Name in ink |
| Seen | Hairline ring. Name in ink-2 |
| Your story | First. The member's photo fills the tile, a 22 ink badge with a page plus (no accent), "Your story" under it; accessible name "Your story, create a story" |
| Rail | Phone: meets the viewport, pad 12, gap 2. Desktop: gap 6. Scrolls sideways. No rule under it |
| Covers | `SocialStoryRailCover` unchanged: the first two signed covers warm on the server, later ones mint on intersection ([`stories-home-rail-mint-on-visible-lock-v1.md`](stories-home-rail-mint-on-visible-lock-v1.md) stays) |

## Composer bar (D)

52 tall, radius 16, `--surface-muted`, no rule. Desktop: pad 0 6 0 10, gap 10, avatar 32, prompt 15px ink-2, Photo then Camera 36 with 18 glyphs. Phone: inset 12 from the viewport, pad 0 4 0 10, gap 6, avatar 30, Photo and Camera 44 with 20 glyphs. "Share something", the write sheet, and the pickers are unchanged.

## Grid and aside (desktop)

| Item | Lock |
|---|---|
| Grid | Feed column **620**, gap **40**, aside **244** (pair 904), end-aligned at `lg` like the Social row. Below `lg` the aside is hidden and the column fills. `/social` only |
| Aside | **No bordered card.** No "For you" eyebrow: the page's For you tab already says it (the board draws the eyebrow; dropped to avoid the duplicate). Latest course first under its existing label "Latest course", a hairline, then "Suggested people"; labels are eyebrows (13 / 500 / 0.06em / uppercase, quiet ink). **Follow** is the board's hairline 30 button (radius 10, page fill, ink 13/500) — no accent fill on the Feed. Same data path (`SocialDesktopForYouSlot`), shown in the Following lane as before |

## Skeleton and cold slot

`SocialHomeCenterSkeleton` uses the live row classes in the live order (tabs row, topic row, story tiles with a name line, composer bar, wall), and the aside skeleton is the same borderless 244 column, so nothing moves when the center mounts (measured in Chromium against the production CSS, phone and desktop). The skeleton reserves one name line under the story tiles: a first name wider than the 70 item wraps to a second line rather than being cut, which moves the rows below it by that line. The cold slot still keeps the mounted Feed up during a lane or topic hop.

## Gates

**G1.** Tabs are their own row above the topics on phone and desktop; current = ink + 2px ink underline + `aria-current="page"`; idle quiet ink; hit 44; same hook and URLs as before.  
**G2.** Topic row: All first, then the 15 topics A→Z; plain words, ink underline, zero accent, no pill; scrolls; never truncates; fade + More topics at the trailing edge, gone at the end.  
**G3.** Stack is tabs → topics → stories → composer → wall (`lock_tabs_topics_stories_composer_wall`).  
**G4.** Story tiles 56×100 with names under; ink unseen ring; ink create badge; no accent.  
**G5.** Composer bar 52, radius 16, muted, no rule; Photo / Camera 44 phone, 36 desktop.  
**G6.** Feed grid 620 / 40 / 244; aside borderless, no duplicate "For you" eyebrow.  
**G7.** Skeleton rows use the live classes in the live order.

**FAIL:** lane chips back in the topic row · an accent-filled topic · a truncated topic label on phone · the For you eyebrow over the aside while the tab reads For you · a bordered aside card on the Feed.

## Repo citation

`docs/design-locks/social-home-lane-tabs-lock-v1.md` · code: `src/components/social/social-home-lane-tabs.tsx`, `social-home-topics.tsx`, `social-stories-rail.tsx` (`HomeStoryTiles`), `social-home-composer.tsx`, `social-for-you.tsx` (`aside`), `social-skeletons.tsx`; classes in `src/lib/social-chrome.ts` (G · Feed block); copy in `src/lib/social.ts`; stack in `src/lib/social-home.ts`.
