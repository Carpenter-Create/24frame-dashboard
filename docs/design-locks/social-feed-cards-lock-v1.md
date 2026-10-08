# [GC][24Frame] LOCK — Social Feed cards: white canvas, soft grey cards, every post and module in its own card, stories at the top, lighter ink v1

**Date:** 2026-10-06 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-06, in chat: Direction B, "B." — recorded from the founder-authorized task brief) · §8 Feed placement (Adam, 2026-10-07, in chat — recorded from the founder-authorized task brief) · §8 Header height (Adam, 2026-10-07, in chat, desktop then phone — recorded from the founder-authorized task brief) · side defaults open for the founder on preview (below)  
**Amended 2026-10-08:** [`shell-phone-workspace-band-lock-v1.md`](shell-phone-workspace-band-lock-v1.md). The hide-under-fade rule (C6) is desktop only; the phone topic row slides with no fade.  
**Scope:** Everywhere `SocialPostCard` renders (the Feed in both lanes, the optimistic post right after Post, Profile activity, a member's posts, a group, the permalink) and the Feed's modules (the stories, the composer, the Reels row, the For you lane, the rail's course card and Suggested people, the empty panel, the skeletons). §8: the Feed column's width and placement, the For you rail's fit, the Feed's top under the header, the permalink column, and (Header height) the shell's header height in every workspace, desktop and phone. The shell's ink ladder (the header workspace thumb, the pill-slider labels, the side-menu labels, the header search input) changes in every workspace.  
**Entity:** Global Content / 24Frame only  
**Source:** Social audit 2 (the founder's state, screenshots 27 and 28, reproduced on the production build) and the Direction B prototype (`proto-B`), reviewed and finished on the real components.  
**Code name:** the source files call this the **cards lock** (`SOCIAL_FEED_CARD_*`, `SOCIAL_CARD_FILL_CLASS`, `SOCIAL_IN_CARD_FILL_CLASS`).  
**Supersedes (in part):** [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) — (§8, 2026-10-07) §6's grid (the 600 column, the 944 pair end-aligned on the shell gutter, the rail from xl), Assumptions 1 and 2, G7's grid, the slider 24 under the desktop header (the stack note, G3's note, Verify-on-ship 1 and 4) and the 600 column in §2 and §5; (2026-10-06) §7 "the media is the card" (a photo with no card or frame at radius 24; a video on the near-black screen under a topic · "Video" band; the credit row under the media; the caption aligned to the name; the text post's 20 / 480 body; the wall 24 / 48), G9, G10, G11, G13, G14, Assumptions 7 and 9; the stack air 24 · 24 · 24 · 16; the slider's 17 / 600 labels with ink idle (§1, G1); the topics' ink idle and 600 current (§2, G2); the bare story rail, the bare composer row, the bare Reels row and the rail's bare people (§3–§6, G3, G5–G7 in part) · [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) — §1 the ink header thumb and the 17 / 600 slider labels, the 17 / 420 search input; §2 the 17 / 500 side-menu labels (G2, G4 in part); (§8 Header height, 2026-10-07) §1 the 80 header (the Height row, G1), §2 the 80 top band (the Top band row, G4), §3 the phone bar's 60 (the Height row, G5), §5 `--header-height` 80 and phone 60 · [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) — (§8 Header height, 2026-10-07) §3 the phone bar's 60 (the Height row, G4, Measured).  
**Keeps:** the white page canvas (`--bg`, tokens.css: "white page canvas — not a grey wash"); the stack order slider → stories → composer → topics → wall (`lock_slider_stories_composer_topics_wall`); the Following / For you ink thumb (Social's one ink element); the topic slate, the keyboard rule and `socialRowFocusShift`; the story cards' 112×200 / 108×192 geometry, the name on the picture and the accent unseen ring; the Reels data, cadence and face; tap-to-immersive and the theatre; the Following Mux band (one player); the comments thread, who liked, the share sheet, the owner's Edit and Delete with the live caption; optimistic likes and comments; the swipe carousel and its "1 / 3" chip; the photo's true shape (1.91:1 to 4:5); the `data-social-post*` hooks; no role line until members choose one; tokens only.

---

## Founder direction (verbatim, 2026-10-06)

> But social still looks bad

> for example(s): 1) feels like thick ink everywhere, 2) text posts are randomly floating

> what I mean is....the text only posts in the feed are not in a distinguished section/surface.

On three reference screenshots (a feed with an ad card and a Reels row card, a feed with a video post card, a profile with a text post card and a photo post card):

> notice how every single facebook post type is clearly in its own surface?

After seeing prototypes A, B and C:

> Stories have to stay at the top of the feed

Asked: "Which looks like the highest quality expensive tech owned Social media platform? White background with gray cards or gray background with white cards?" — answered: white background with grey cards (the calm of the premium fintech registers) reads more premium; a grey page with white cards reads as a utility network. The pick:

> B.

Standing direction, still in force:

> A fresh, media-oriented, immersive social media experience for the film community.

> we must remain in this register.

> I want the Coinbase register, but the modernize idea of social media experience through its layout and media-immersive experience.

Still in force: Geist; the ladder 13 / 15 / 17 / 20 / 28 / 56; body 420, title 480, medium 500, semibold 600; tokens only; light default and dark; nothing truncated on phone; every phone target 44; copy, logic and classes in `src/lib`; one component per pattern.

## Founder direction (verbatim, 2026-10-07)

With two screenshots from the same Chrome window at 100% zoom (Facebook's home feed, and our `/social` preview):

> Measure and make sure our feed is in the identical placement with the identical width as the Facebook feed.

§8 records the measurements and the rule.

After #768 merged, deciding open choice 5 (the header height):

> Header height locked: 56 (match Facebook), shell-wide.

Then, on phone:

> Phone header → 56 same as desktop.

§8 Header height records both.

---

## 1) Canvas and cards (Direction B)

| Item | Lock |
|---|---|
| Canvas | White: `--bg`. Unchanged |
| Card fill | `SOCIAL_CARD_FILL_CLASS` — `--surface-muted` (#f4f4f6, 1.10:1 on white); dark `--surface` (#1e2126) on `--bg` (#0f0f0f), 1.19:1 |
| In-card fill | `SOCIAL_IN_CARD_FILL_CLASS` — a control inside a card flips to the page white (`--surface`); dark `--surface-muted` (#25292f), lighter than the dark card. Its edge twin `SOCIAL_IN_CARD_EDGE_CLASS` rings Create story's plus |
| Card | `SOCIAL_FEED_CARD_CLASS` (a column) on `SOCIAL_FEED_CARD_SURFACE_CLASS` (the face): radius **24**, **no edge, no shadow** |
| Phone | The card meets the viewport (radius 0) through `SOCIAL_MOBILE_BLEED_CLASS`, with **8** of white between cards; the text rows inside keep their 16 |
| Desktop | **16** between cards (`SOCIAL_FEED_GUTTER_CLASS` `gap-2 md:gap-4`) |
| One place | Every card and every in-card control composes these constants: a later tweak of the card grey or of the in-card fill is a one-line change in `src/lib/social-chrome.ts` |

## 2) Stack and the story rail rule

`lock_slider_stories_composer_topics_wall` stays: **slider → stories card → composer card → topic chips → the wall of cards**. Air: slider **16** stories, stories **8** (desktop **16**) composer, composer **16** topics, topics **8** (desktop **16**) wall. The slider and the topic chips sit on the canvas (they filter; they are not modules).

**Stories stay at the top of the Feed.** The story rail is the first item of the Feed stack, in its own card, drawn in **both lanes**, also when its one tile is the member's own **Create story** (`socialHomeStoryRailHasTiles`). No rule hides or moves a sparse rail, and the composer carries no story control. Only a rail with no tile at all (no profile to create with, no live story) has nothing to draw, and then no empty card is drawn (Assumption 1).

| Item | Lock |
|---|---|
| Stories card | `py-2`; the track runs to the card's edge and pads **8** (`px-2`), so the tiles sit 8 in, radius 16 inside 24 (concentric, as the media); a scrolled tile passes under the card's rounded clip. Height 216 (phone 208) |
| Tiles | The 112×200 / 108×192 cards, gap 8, on the in-card fill while a cover loads. Create story: the member's photo over the plate, "Create story" **13 / 500**, the 40 (phone 36) accent plus (Bold stroke) ringed 3 in the plate's fill |
| Composer card | Pad **16 / 12**; the 44 avatar, the "Share something" pill and the round 44 Photo and Camera on the in-card fill |

## 3) Post anatomy (every renderer)

| Item | Lock |
|---|---|
| Kinds | text, photo, swipe, landscape and vertical video, group, the optimistic post, Profile activity, the permalink: **every kind is one card** |
| Header | On top. 16 in, 12 down (desktop 16): the **40** avatar, 12, the name **15 / 600** ink, the meta **"2h · Group"** **13 / 420 ink-2** (one run: the time, an `aria-hidden` dot, the group link). Phone: name and meta share one 44 row (each a 44 hit, wrapping); from md the name stacks over the meta. The owner's ⋯ at the end (44 / desktop 40), its glyph on the 16 line |
| Words | 12 under the header: the caption and a text-only body share **one style**: **15 / 420** `--body`, line 1.45; desktop **17 / 1.5**. Never clamped |
| Media | 12 under the words: **inset 8 at radius 16** (16 + 8 = the card's 24); phone **edge to edge** at radius 0 |
| Actions | At the bottom: round **44** (desktop **40**) Like · Comment · Share on the in-card fill, a **20 Regular** glyph, **8** apart, counts beside **15 / 420** ink-2 (none at zero); the first round on the 16 line. 4 under the media (desktop 8), 8 to the card's end (desktop 12) |
| Comments | The permalink: the thread **inside the card** under the actions (a hairline, then pad 16): rows with the 32 face, the name 13 / 600 over the body 15 / 420, the time 13 ink-2, and the composer on the in-card fill. Profile activity's "You commented" line sits in the same place |

## 4) Media rules

| Item | Lock |
|---|---|
| Photo | The true shape, **1.91:1 to 4:5** (unchanged); the topic chip top-left; the swipe's "1 / 3" chip top-right |
| Video | **No screen, no band, no "Video" word.** The frame is the media block at the video's shape, **4:5 to 2.39:1**; a taller video (3:4, 9:16) draws **4:5**, the still and the player cover-cropped (side default, below); soft grey while the still loads. Tap opens the whole frame in the theatre |
| Play disc | A static disc on every video (the disc says "video"): **56** (phone **48**), `--band` at 72%, a 24 band-ink play glyph; it steps out once a player mounts, and the mounted player's paused centre control is drawn to the same values (`globals.css` `.social-feed-play-disc`, which no longer reads the undefined `--ink`) |
| Unusable media | `socialPostUsableMedia`, applied once in `SocialPostCard`: a video needs a Mux playback id, an image a url. A post left with none renders as a **text card** — never the bare black strip. If it also has no words (a media-only legacy post: `socialPostMediaAllDropped`), the words' place keeps one quiet line, **"Media unavailable"** (`SOCIAL.post.mediaUnavailable`, `SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS`: the words' box at **15 / 420 ink-2**), so the card is never a header and actions around nothing; an owner's later caption replaces it live |

## 5) Modules

| Item | Lock |
|---|---|
| Reels | One card: pad 12 top, 16 bottom; the head and the track pad 16; the track runs to the card's edge; the round 44 arrows on the in-card fill. Air: the wall's gutter |
| For you lane | Suggested people as one card (`SOCIAL_FOR_YOU_LANE_CARD_CLASS`) |
| Rail (when it fits, §8) | The "For you" heading on the canvas; the latest course as one card (the card fill, title **15 / 600**); Suggested people as one card (subhead **17 / 480**, the person **15 / 500**, Follow **15 / 500** on the in-card fill) |
| Empty panel | The card face (pad 24 / 48); house pills **44**, radius full, 15 / 500: one accent primary, the rest on the in-card fill; the hint ink-2 |
| Topics | On the canvas: idle **15 / 500 ink-2**, current the wash with accent-ink **15 / 500**. A chip whose end passes under the 96 fade **hides** until the row scrolls it clear (`socialRowItemUnderFade`); a keyboard still reaches it |
| Skeleton | `SocialHomeCenterSkeleton` and `SocialPostWallSkeleton` use the live card classes in the live order, the bars on the in-card fill. The Feed skeleton draws **the member's state**: the stories card (a member always has Create story) and the composer card. Assumption 9 covers the one state it cannot match |

## 6) Lighter ink (the ink ladder)

| Item | Lock |
|---|---|
| One ink element | **At most one ink fill per screen.** On Social it is the Following / For you thumb |
| Header thumb | Every workspace: the **accent wash** with **accent-ink** labels (`WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS`), not ink |
| Slider labels | **15 / 500**, idle **ink-2** (the header and the Feed) |
| Side menu | Labels **15 / 500** (rows stay 56) |
| Header search | Input **15 / 420** |
| Glyphs | `SocialIcon` draws **Regular** by default; **Bold** is opt-in on media and the dark stage (the immersive, Explore, the story viewer and studio, Go live) and on Create story's plus |
| Type | In a post only the name is 600; words, meta and counts 420; secondary text ink-2 |

## 7) Post page

The permalink is one card in the Feed's **680** column, centred as the Feed's (`SOCIAL_POST_PAGE_CLASS` inside `SOCIAL_POST_PAGE_LAYOUT_CLASS`; §8; side default, below), its comments inside the card.

## 8) Feed placement (founder 2026-10-07)

**Facebook, measured** (the founder's screenshot: 2000×1250 device px of a 1440 CSS-px viewport, 1.38889 device px per CSS px, calibrated from our known 600 column = 832 px and Facebook's composer = 944 px = 680): the top bar is **56** tall; the first card starts **16** under it (about 72 from the top); the feed column is x **380 to 1060**, width **680**, centred on the **viewport** (centre 720); the right column hugs the window's right edge.

**Ours before** (Chromium on the real components, 1440, side menu open): the header 80; the column x 464 to 1064, width 600 (centre 764, 44 right of the viewport's centre), because the 944 pair was pushed to the shell gutter (`xl:ml-auto`); the rail x 1112 to 1408; the slider 24 under the header. At 1920 the column was 944 to 1544 (Facebook's would be 620 to 1300).

| Item | Lock |
|---|---|
| Width | The Feed column is **680** (`SOCIAL_FEED_MEASURE.center`) whenever the frame has room; a narrower frame it fills (768: 480). Phone is unchanged: the full frame, cards edge to edge |
| Centre | Centred on the **viewport**, as Facebook's, with the side menu open (240) or collapsed (80). In CSS from the shell's own variables, not pixels: the column's lead space inside the frame's content box (the feed container, `100%`) is `(100% − 680 − var(--sidebar-width) − var(--chrome-gutter) + var(--shell-gutter-inline-end)) / 2`, **never below 0**, so the column never slides under the side menu (`SOCIAL_FEED_LEAD_CLASS`, a percentage margin on the column, which resolves against the container) |
| Rail | "For you" keeps its trailing edge on the shell gutter (the avatar's line; `ml-auto`), **296** wide, **48** at least from the column. It shows only when the feed container fits the pair: 680 + 48 + 296 = **1024** (`@container/feed`, `SOCIAL_FEED_PAIR_WIDTH`). Then the lead also stops at `100% − 1024`: when the centred column would leave less than 48, it keeps 680 and moves left just enough. Below 1024 the rail is `display:none` and the column stays centred |
| Lanes | The lead reads the container, not whether the rail is drawn, so the column (and the slider in it) does not move between Following and For you |
| Top | The slider and the rail's heading start **16** under the header (the shared 8 inset plus the row's `md:pt-2`), as Facebook's first card does under its bar. Was 24 |
| Post page | The permalink column follows the Feed: **680**, centred on the viewport by the Feed's own centring term, never below 0 (`SOCIAL_POST_PAGE_LEAD_CLASS`: the Feed's below-1024 rule, with no container query). It has no rail, so the Feed's move-left, which only keeps 48 to a drawn rail, does not apply: where the Feed shifts for its rail (a 1312 to 1431 viewport with the side menu open, 1152 to 1431 collapsed) the permalink stays centred; at every other width it sits on the Feed's column. Its top stays the shared inset (Back 8 under the header). Open choice 3, default "match the Feed" |
| Skeleton | `SocialHomeSkeleton` composes the same layout, column and rail classes, so it draws at the live positions (C9) |
| Out of scope | Explore, Profile and Messages keep the 1052 Social row (`SOCIAL_HOME_LAYOUT_CLASS`), unchanged |

**Expected and measured** (side menu open unless marked; x from the viewport's left; headless Chromium, the production build's CSS, the real shell and Feed components):

| Viewport | Column | Rail | Note |
|---|---|---|---|
| 1920 | 620 to 1300 | 1592 to 1888 | centred (Facebook's 620 to 1300) |
| 1680 | 500 to 1180 | 1352 to 1648 | centred |
| 1512 | 416 to 1096 | 1184 to 1480 | centred |
| 1440 | **380 to 1060** | 1112 to 1408 | centred, Facebook's exactly; the gap 52 |
| 1366 | 310 to 990 | 1038 to 1334 | 680 kept, 33 left of centre to keep the 48 |
| 1312 | 256 to 936 | 984 to 1280 | the container is exactly 1024: the rail fits, the column at the frame |
| 1280 | 300 to 980 | hidden | the container is 992: no rail, centred |
| 1024 | 256 to 936 | hidden | centring would go under the side menu: the column starts at the frame |
| 768 | 256 to 736 (480) | hidden | fills the frame |
| 1920, collapsed | 620 to 1300 | 1592 to 1888 | centred |
| 1440, collapsed | 380 to 1060 | 1112 to 1408 | centred |
| 1280, collapsed | 224 to 904 | 952 to 1248 | the rail fits: 76 left of centre to keep the 48 |
| 1152, collapsed | 96 to 776 | 824 to 1120 | the container is exactly 1024 |

From a 1432 viewport (either side menu) the rail fits beside the centred column, so the column is centred whenever the window is at least that wide.

**The permalink, expected and measured** (same method): on the Feed's column at 1920, 1680, 1512, 1440 (**380 to 1060**), 1280 (300 to 980), 1024 (256 to 936) and 768 (256 to 736), and at 1920 and 1440 collapsed. Where the Feed shifts for its rail, it stays centred: 1366, **343 to 1023** (the Feed 310 to 990); 1312, 316 to 996 (the Feed 256 to 936); 1280 collapsed, 300 to 980 (the Feed 224 to 904); 1152 collapsed, 236 to 916 (the Feed 96 to 776).

**Header height** (founder 2026-10-07, open choice 5: "Header height locked: 56 (match Facebook), shell-wide."; then, on phone: "Phone header → 56 same as desktop."). Our header was **80** in every workspace and the phone bar **60** (the shell register lock); Facebook's bar is **56**.

| Item | Lock |
|---|---|
| Height | The header is **56** on desktop and on phone, in every workspace and on every page the house shell draws (Home, Aggregation, Social, Education, Staff, Settings, Help, Activity, Co-Productions, the story studio, Explore's bar). One token, one value: `--header-height` 80 → **56** in `src/app/tokens.css`, and the phone block no longer overrides it (its 60 is gone). Its one hairline is the bar's bottom 1 |
| Phone | **56**, the same as desktop (was **60**, the shell register lock §3). Every phone target stays **44** and centred: the emblem link, the grey workspace pill, search (Social), Ask, the bell and the avatar; pads 16 / 12 and the 4 between hits are unchanged. Everything under the bar moves up **4** (the page, the Social frame, the Education search row, which is itself unchanged). The dock, the sheets, the Ask overlay, Explore, a Messages thread and compose, the story viewer and Write have no phone bar above them, so they do not move |
| Follows the token | Everything that hangs off the header reads `--header-height`, so it moves with it and nothing re-types the height: the bar itself (`HOUSE_LEAD_CHROME_CLASS` and its `min-height`), the side menu's top band, open and collapsed (`HOUSE_RAIL_BRAND_BAND_CLASS`, `HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS`), so the brand mark stays level with the bar; Home's sticky News rail's height (`OVERVIEW_AREA_NEWS_CLASS`, below); the Ask gate's minimum height (`AccessUpgradeGate`). Every other pane under the header (the lead scroller, Explore's stage, the story studio, the Social frame) fills the space below it, and the stages without the bar (a Messages thread and compose, the story viewer, Write) have no header to subtract; sheets and the Ask overlay sit over the whole viewport |
| News rail | Home's desktop News rail (`OVERVIEW_AREA_NEWS_CLASS`, from a 60rem Home frame) is sticky inside the lead scroller, which already starts under the header, so its top is one class, `@min-[60rem]:top-[var(--space-4)]`: pinned, it sits **16** under the bar (it was 72: the old top added the header a second time), and at rest it stays level with the first module (it was 40 below it). Its height counts from the viewport, so it keeps `100dvh − var(--header-height) − var(--space-8)`: 16 above it and 16 below it. Below the 60rem frame (phone, 768, 1024 with the side menu open) the rail stacks and is not sticky, unchanged. Founder 2026-10-07 (Founder decisions) |
| Controls | Unchanged and centred in the bar, desktop and phone: the round grey **44** search, Ask and bell, the **44** avatar, the slider's **44** segments, the grey workspace pill (**44**), the **44** search pill, Exit **44**, the brand link's **44** hit in the side menu's top band and in the phone bar (in the desktop bar, on a page with no side menu, the brand link is the **24** mark, centred, 15.5 above and below). In the 55 above the hairline a 44 control has **5.5** above and below |
| Feed | The slider stays **16** under the header, so at 1440 it starts **72** from the top, where Facebook's first card does. On phone it stays 16 under the bar: **72** from the top (was 76) |

## Tokens

No new token and no new hex. Changed (§8 Header height): `--header-height` 80 → **56**, one value on desktop and phone (the phone block's 60 override is removed). `--screen` (the register lock's one new token) is no longer drawn by a feed post; it stays in `tokens.css`, unchanged, until the founder settles Direction B.

## Founder decisions (2026-10-07)

Asked to decide the open choices 1–4 below and the queued chrome-constants tidy-up:

> 1 keep, 2 keep, 3 match, 4 keep, 5 run

Card grey stays `--surface-muted`; the 4:5 crop stays; the post page matches the Feed column (680, centred, §8); "Media unavailable" stays; the tidy-up ships as its own PR. The header height (5 below) stayed open until #768 merged; then:

> Header height locked: 56 (match Facebook), shell-wide.

Then, on phone:

> Phone header → 56 same as desktop.

The header is 56 in every workspace, desktop and phone (§8 Header height).

After #771 merged, on Home's News rail (its sticky top counted the header twice, found in that PR's review):

> Yes on the News-rail fix: one-class sticky offset so pinned sits ~16 under the header, not ~72.

The rail pins 16 under the header (§8 Header height, News rail).

## Open founder choices (1–5 decided 2026-10-07)

1. **Card grey strength.** The card is `--surface-muted` (1.10:1 on white). If it reads faint on the founder's display, a slightly darker card grey is a founder choice and a one-line change (`SOCIAL_CARD_FILL_CLASS`). Not changed now. **Decided: keep.**
2. **4:5 crop.** Tall photos (beyond 4:5) and vertical video draw 4:5 in the feed, the whole frame one tap away in the theatre. **Decided: keep.**
3. **Post page width.** The permalink's card is the Feed's 680 column, centred as the Feed's (§8; the default, "match the Feed"). It has no rail, so it does not take the Feed's move-left for the rail; between a 1312 and a 1431 viewport (1152 collapsed) the column therefore moves by up to 60 (140 collapsed) when a post opens from the Feed. Sharing the Feed's shift instead (no move, the post off centre there) is a two-constant change (`SOCIAL_POST_PAGE_CLASS` takes `SOCIAL_FEED_LEAD_CLASS`, its row the `@container/feed`). **Decided: match the Feed.**
4. **Media unavailable line.** The wording of the one line a media-only post shows when none of its media can draw ("Media unavailable", after the Messages "Post unavailable" / "Story unavailable"). Copy is a founder checkpoint; the words are one string in `src/lib/social.ts`. **Decided: keep.**
5. **Header height.** Facebook's bar is 56; ours was 80 in every workspace. The Feed matched Facebook's 16 under the bar, not its bar. Changing the header is a shell decision for the founder. **Decided: 56, shell-wide** ("Header height locked: 56 (match Facebook), shell-wide."; §8 Header height). Then the phone bar too: **56, the same as desktop** ("Phone header → 56 same as desktop."; it was 60).

## Assumptions (stated, reversible)

1. With no tile at all (no profile, no live story) the stories card is not drawn (no empty card). A member always has Create story, so the rail always shows for a member.
2. Phone header: the name and the meta share one 44 row (two stacked 44 rows would double the header).
3. The action row's first round sits on the card's 16 line (the prototype had 8 on phone, 12 on desktop).
4. Post cards do not clip their content (a like error can show below the heart); the stories and Reels cards clip their tracks at the rounded edge.
5. The framed For you rail on Profile, Messages and Create keeps its hairline panel and house modules (not a Feed module).
6. No sticky rails (the prototype made the rails sticky; not asked).
7. The unusable-media rule runs once in the card, not in each loader, so every renderer gets it.
8. Comment times are ink-2 in the sheet as well as in the card.
9. The Feed skeleton draws the member's state (§5). The one state it cannot match is **no profile**: `ensureOwnSocialProfile` returns none only when it cannot create the row (an insert error, or eight handle collisions). There the live page draws no composer and, unless a followee has a live story, no stories card, so the page moves up when it mounts. The fallback cannot know this state: the profile loads inside the suspended Feed center, the session carries no profile bit, and `loading.tsx` has no data. Waiting for the profile before the fallback would block the stream for every member to suit a failure path. The composer skeleton has behaved the same way since before this lock.
10. The "Media unavailable" line shows only when the post had media, none of it can draw, and the words are empty. A captioned post whose media all dropped stays a plain text card (its words are its content). Its owner can still clear that caption: the owner menu counts the stored media, as the server does, so the line comes back.
11. **The rail's fit is a step (§8).** At the container width where the rail appears (1024: a 1312 viewport with the side menu open, 1152 collapsed) the column moves from centred to the frame's start (60 with the side menu open, 140 collapsed), as the rule asks ("the feed keeps 680 and moves left just enough"); from a 1432 viewport it is centred with the rail.
12. **Centred on the window less its scrollbar (§8).** The column centres in the frame the shell's lead scroller gives it. With overlay scrollbars (the founder's screenshots) that is the viewport; with a classic scrollbar it is the viewport less the scrollbar.
13. **The feed container (§8).** `@container/feed` (`container-type: inline-size`) sits on the Feed row only (the permalink queries no container). It does not become the containing block of a fixed-position descendant (checked in Chromium 141: a fixed child stays on the viewport), so sheets and menus inside the Feed are unaffected.

## Explicit OUT

- A screen, a band or the word "Video" on a feed video
- An edge or a shadow on a card
- A second ink fill on a screen
- A story control in the composer; a rule that hides or moves a sparse story rail
- A cut chip drawn under the topics' fade
- New hex outside `tokens.css`; a new token

---

## Gates

**C1.** The canvas stays white; every post kind and every Feed module sits on `SOCIAL_FEED_CARD_CLASS` (or its face): the card fill and the in-card fill are one constant each; radius 24, no edge, no shadow; dark `--surface` on `--bg`.  
**C2.** Stories are the first module, in their own card, in both lanes, also with Create story alone; no story control in the composer; no sparse rule.  
**C3.** Post anatomy header → words → media → actions (→ comments): the 40 avatar, the name 15 / 600, the meta "2h · Group" 13 / 420 ink-2, the owner's ⋯ at the header's end; one words style.  
**C4.** Media inset 8 at radius 16 (phone edge to edge); a video draws no screen, no band and no "Video"; its frame is 4:5 … 2.39:1; the play disc and the player's centre control use tokens (no `--ink`).  
**C5.** `socialPostUsableMedia` drops media that cannot draw; a post left with none is a text card; with no words either, it keeps the one "Media unavailable" line (`socialPostMediaAllDropped`).  
**C6.** A topic chip whose end passes under the fade hides (`socialRowItemUnderFade`).  
**C7.** Lighter ink: the header thumb is the wash with accent-ink; one ink element per screen; slider and side-menu labels 15 / 500; `SocialIcon` Regular by default.  
**C8.** Phone: cards meet the viewport with 8 of white between; every target ≥ 44; nothing truncated.  
**C9.** The skeletons use the live card classes in the live order.  
**C10.** Tokens only: no new hex, no new token.  
**C11.** Feed placement (§8): the column is 680, centred on the viewport with the side menu open or collapsed and never under it; the rail at the shell gutter when the container fits 1024, the column keeping 680 and moving left just enough to keep 48, else hidden with the column centred; the slider and the rail's heading 16 under the header; the skeleton at the same placement; the permalink 680, centred the same way, with no move-left (it has no rail); phone unchanged.  
**C12.** Header height (§8): `--header-height` is 56 on desktop and phone, one declaration pinned once (`src/app/tokens.test.ts`) with no phone override; the bar, the side menu's top band (open and collapsed) and every full-height offset read the token, and a sticky offset inside the lead scroller does not add it (Home's News rail pins 16 under the bar, level with the first module at rest); no source re-types the height (nor a retired 80, 60 or 52) in a sticky, fixed, scroll-margin or viewport-height rule; every header control is centred in the bar and none clips; the Feed's slider 72 from the top at 1440; phone: the bar 56, every target ≥ 44, nothing clipped or truncated, the page 4 higher.

## Verify-on-ship

1. 390, 1280 and 1440, light and dark: the founder's state (Create story alone, a landscape and a vertical video) and a rich Feed: every post kind on its own card, stories first.
2. The story rail with only Create story and with several stories, in both lanes.
3. Profile activity and the permalink (comments inside the card).
4. The header in every workspace at 768, 1024, 1280 and 1440: the wash thumb, 15 / 500 labels, nothing clipped.
5. No horizontal overflow; no ellipsis on phone; every target ≥ 44; the skeleton matches the live layout.
6. §8 at 1024, 1280, 1366, 1440 and 1920, side menu open and collapsed: the column's x and width against the table; the rail's trailing edge on the avatar's line; the slider 16 under the header; Following and For you at the same x; the permalink at the Feed's x where the Feed is centred, and centred (not shifted) at 1366 and 1312 open, 1280 and 1152 collapsed.
7. §8 Header height at 768, 1024, 1280, 1440 and 1920 (1440 light and dark), every workspace and the collapsed side menu: the bar 56, every control centred and unclipped, the side menu's top band level with the bar, the Feed's slider 72 from the top at 1440, Messages, Explore, the story studio and the sheets with no gap or overflow at the bottom; Home's News rail at 1280, 1440 and 1920 level with the first module at rest and 16 under the bar when scrolled, its last row 16 above the window's bottom; phone 390 and 360, every workspace: the bar 56, every target ≥ 44, nothing clipped or truncated, the content 4 higher than before.

## Measured (headless Chromium, the production build's CSS)

Fixtures rendered from the real shell and Social components, styled by the build's own stylesheet:

- **Cards (C1, C8).** Light: card `rgb(244, 244, 246)` on `rgb(255, 255, 255)`, in-card rounds `rgb(255, 255, 255)`. Dark: card `rgb(30, 33, 38)` on `rgb(15, 15, 15)`, rounds `rgb(37, 41, 47)`. Radius 24 at 1280 / 1440, 0 at 390; no border, no shadow. At 390 every card is x 0, width 390, 8 between; at 1280 / 1440, 680 wide (the Feed column, centred on the viewport: §8), 16 between.
- **Stories (C2).** The stories card is the first module under the slider in Following and For you, with Create story alone and with four stories.
- **Media (C4).** Inset 8 / 8 at radius 16 on desktop; 0 / 0, radius 0 at 390. Frames: 16:9 video 1.778, 3:4 and 9:16 video 0.8, 4:5 photo 0.8, square 1, swipe 1.5. Play disc: the band at 72%, 56 desktop, 48 phone. No screen, no "Video". The unusable legacy video draws as a text card.
- **Media unavailable (C5).** The caption-less legacy video: header 56, then "Media unavailable" (15 / 420, 34 tall, at the words' 16 line), then the actions. The card is 150 tall at 1440 and 146 at 390; the captioned one is 154 and 146, so the two cards share one rhythm. Contrast on the card: `rgb(61, 68, 80)` on `rgb(244, 244, 246)` 8.93:1; dark `rgb(167, 173, 180)` on `rgb(30, 33, 38)` 7.13:1. No overflow and no ellipsis at 320 or 390. Before this line the card was the header and the actions alone (116 / 112).
- **Post page (C3).** The permalink card is 680 wide on desktop, centred as the Feed's column (§8), with its comments inside; Profile's "You commented" sits inside its card.
- **Ink (C7).** The header thumb is the wash with accent-ink labels at 15 / 500 in every workspace at 1024 / 1280 / 1440, light and dark; at 768 the header shows the workspace pill. Ink-filled elements per screen: 1 on the Feed (the Following thumb), 0 on Home, Aggregation, Education, Staff, Profile, Messages and the permalink.
- **Phone and parity (C8, C9).** No horizontal overflow and no ellipsis at 320 / 390 / 768 / 1024 / 1280 / 1440. The skeleton's slider, stories, composer, topics, wall, first card and its header sit at the live x / y / width at 390, 1280 and 1440; the first media sits one caption lower live (the skeleton draws no caption).
- **Header height (C12, §8).** The real shell on Home, Aggregation (member and staff), Social, Education, Staff, Settings, Co-Productions, Help, the side menu collapsed, Explore, the story studio and Messages; before = main at `2670eecc` (`--header-height` 80, phone 60), after = this build (one `--header-height: 56px`); the two stylesheets differ only in that token. At 768, 1024, 1280, 1440 and 1920 (1440 light and dark): the bar is **56** at y 0 (was 80); every header control (the slider's segments or the grey workspace pill, the search pill or icon, Ask, the bell, the avatar, Exit) is 44 tall with **5.5** above and below over the hairline (was 17.5), none clipped; where the bar carries the brand mark (Co-Productions, Help, Explore) the 24-tall mark has 15.5 / 15.5. The side menu runs the full height; its top band is 56 at y 0 with the brand link centred on the bar's middle (y 28); its rows move up 24. The lead scroller starts at 56 and ends at the viewport's bottom, and everything in its flow moves up exactly **24** (what a filling stage centres moves 12; Home's News rail 48 in that build, below); Explore's stage and the story studio fill 56 to the bottom; a Messages thread and compose (no bar), the story viewer, the sheets and the drawer cover the viewport, unchanged. The Feed's slider is **72** from the top at every desktop width (was 96), where Facebook's first card is at 1440. Home's News rail read top 72 and max-height 812 at 900 (`100dvh − 56 − 32`; its top is 16 since, below); the Ask gate's floor is 448 at 1440 × 600 (was 424). No page overflow either way.
- **Header height on phone (C12, §8).** 390 × 844 and 360 × 740, every workspace and Settings, Co-Productions, Help, Messages, the permalink, Profile, the story studio: the bar is **56** (was 60); every bar target is 44 or wider (the emblem link, the grey workspace pill, search, Ask, the bell, the avatar) with 5.5 above and below (was 7.5); everything under the bar is **4** higher (what the story studio centres, 2; the Feed's slider 72, was 76; the Education search row 56 to 125, its field 44); the dock, the sheets, the Ask overlay, Explore, a Messages thread and the story viewer do not move. No overflow and no ellipsis.
- **Home's News rail (C12, §8).** In the header build above it moved up 48 at rest (40 under the first module, was 64): its sticky top added the header inside a scroller that already starts under it. Fixed here: Home at 1280 × 900, 1440 × 900, 1920 × 1080 and 1440 × 600; before = main at `2a073503`, after = this build; the two stylesheets differ only in the rail's top rule. At rest the rail starts at y **88**, level with the first module (was 128, 40 below it). Scrolled 600, it pins at y **72**, **16** under the header (was 128, 72 under it). With a rail taller than the window it is 812 tall at 900 (992 at 1080, 512 at 600) and ends **16** above the window's bottom (it ran 40 past it, so its last 40 sat under the window's edge while pinned). At 1024 and 768 the rail stacks under the modules, static, the same before and after. No page overflow.
- **Seen, not changed here.** The story studio at 360 × 740 ran 10 past the viewport inside the scroller (was 14), and at 768 its frame was 168 wider than the scroller before and after; both are fixed since (the create-story lock v1.5, Fit).
- **Outside this lock, unchanged from `origin/main`** (the same sizes on the BEFORE build): the permalink Back link (24 tall), the comment Post button (40), the swipe dots (24, below md), Profile's photo and cover edit buttons and activity tabs (40), the compact Follow (40), and Profile's activity pill server paint.

---

## Repo citation

`docs/design-locks/social-feed-cards-lock-v1.md` · the header height in `src/app/tokens.css` (`--header-height`; §8 Header height) · classes in `src/lib/social-chrome.ts` (the cards block at the top and "Cards · posts"), `src/lib/house-shell.ts` (`HOUSE_PILL_SLIDER_*`, `HOUSE_DEST_RAIL_ROW_CLASS`), `src/lib/workspace-switcher.ts` (the wash thumb), `src/lib/house-lead-chrome.ts` (the search input), `src/lib/courses.ts` (`COURSE_FEATURE_*`); logic in `src/lib/social-home.ts` (`socialHomeStoryRailHasTiles`), `src/lib/social-media-display.ts` (`socialFeedVideoFrame`, `socialPostUsableMedia`, `socialPostMediaAllDropped`), `src/lib/social.ts` (`SOCIAL.post.mediaUnavailable`), `src/lib/social-feed-reels.ts` (`socialRowItemUnderFade`); components `social-post-card.tsx`, `social-post-media.tsx`, `social-stories-rail.tsx`, `social-home-composer.tsx`, `social-home-topics.tsx`, `social-for-you.tsx`, `social-comment-thread.tsx`, `social-activity-history.tsx`, `social-skeletons.tsx`, `social-icon.tsx`; the page `src/app/(app)/social/page.tsx` and the permalink `src/app/(app)/social/p/[postId]/page.tsx`; the play disc in `src/app/globals.css`.
