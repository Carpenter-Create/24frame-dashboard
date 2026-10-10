# [GC][24Frame] LOCK — Social Feed in the Coinbase register: pill slider, topic chips, story cards, grey composer, Reels row, For you rail, posts v1

**Date:** 2026-10-05 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-05, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Amended 2026-10-08:** [`shell-phone-workspace-band-lock-v1.md`](shell-phone-workspace-band-lock-v1.md) (Adam, "remove the arrow and let the rows slide"). On phone the topic row has no 96 fade and no More topics, and no chip hides; it slides, and a chip cut at the edge is the scroll cue. Desktop is unchanged.  
**Superseded in part (founder 2026-10-06, cards lock):** every post and every Feed module sits on one soft grey card on the white canvas (Direction B, "B."). §7 "the media is the card" is reversed: the post is a card with the header on top (40 avatar, name 15 / 600, meta "2h · Group"), the words (15 / 420, desktop 17), the media inset 8 at radius 16 (phone edge to edge), the round actions at the bottom; a video has no screen, no band and no "Video" (4:5 to 2.39:1); the credit row under the media, the caption aligned to the name, the text post's 20 / 480 body and the wall 24 / 48 are out (G9, G10, G11, G13, G14; Assumptions 7 and 9). The stories, the composer, the Reels row and the rail's people are cards; stories stay at the top in both lanes; the stack air is 16 · 8/16 · 16 · 8/16; the slider labels are 15 / 500 with ink-2 idle; the topics are ink-2 idle and 500 current. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md).  
**Superseded in part (founder 2026-10-07, cards lock §8, Feed placement):** "the identical placement with the identical width as the Facebook feed." The Feed column is **680** (not 600), centred on the viewport with the side menu open or collapsed and never under it; the For you rail keeps its trailing edge on the shell gutter and shows when the Feed container fits the 1024 pair (not from xl), the column moving left just enough to keep 48; the slider and the rail's heading start **16** under the desktop header (not 24). §6's grid, Assumptions 1 and 2, G7's grid, the stack note's 24 and Verify-on-ship 1 and 4 are out; the 600 column in §2 and §5 is the 680 column. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md).  
**Superseded in part (founder 2026-10-08, no Feed slider):** "on social, remove the "Following" and "For You" above the feed." · "only the slider." · "leave the right side of the page "For You" as is". The Following / For you pill slider is gone from the Feed (§1 and G1 are out; the slider component, its classes, its persist key and its two labels with it). The stack is **stories → composer → topics → wall** (`lock_stories_composer_topics_wall`; G3 and the stack note), and the stories card leads the column: its 16 top margin under the slider went with the slider, so it starts **16** under the phone bar and the desktop header, where the slider did (the cards lock §8 rule). The skeleton has no slider pill (Assumption 6 is out). Everything else stays: the lane itself (`?lane=for-you`, `useSocialHomeLive`, `socialHomeAxisHref`, the cold slot, the topic links keeping the lane), the topic chips, and §6's For you rail with its "For you" heading, as it is (decision 5 keeps the rail heading; the slider option is out).  
**Scope:** The Feed at `/social`: the Following / For you switch, the topic row, the story cards, the composer, the Reels row's face, the For you rail, the column grid, the stack order, the skeleton. The posts (H §5.1) are §7 of this lock, and their face holds everywhere `SocialPostCard` renders (the Feed, Profile activity, a member's posts, the permalink). Not the shell (header, side menu, phone bar, dock): that is [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md). Not Explore content, Profile, or Messages (later PRs).  
**Entity:** Global Content / 24Frame only  
**Source:** The approved H board **`CoinbaseFeed.dc.html`** (desktop 1280 + phone 390 "Feed top" + phone "Scrolled to Reels") and the H spec §1 tokens, §3.1 pill slider, §3.2 secondary chip, §3.3 buttons, §3.4 card, §3.5 list row, §5.1 posts, §5.2 stories, §5.3 composer, §5.4 Reels row, §5.5 For you rail, §7, §8 (posts: the board's posts 1–3 and the 4:5 video). The board's hexes map to existing tokens in `src/app/tokens.css`; one token is new: `--screen`, the near-black a feed video plays on (§7; both themes, commented).  
**Code name:** the Feed source files call this the **H register** (house rule: source files do not name the reference brand).  
**Supersedes (in part):** [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md) — the E text tabs with an ink underline, the topic words over an ink underline (no pill, no fill, no accent), D's 56×100 story tiles with the name under them and the ink badge, the 52 composer bar, the 620 / 40 / 244 grid, the borderless aside with eyebrows and a hairline and no "For you" heading, the stack `lock_tabs_topics_stories_composer_wall` and its air, and gates G1–G7 (the hook, the URLs, the topic slate and its behaviour, the keyboard rule, and the cold slot stay) · [`social-feed-reel-rail-lock-v1.md`](social-feed-reel-rail-lock-v1.md) — the 30 head with the 13px uppercase "Reels" eyebrow, the hairline 30 arrows, the radius-10 tiles, the desktop gap 12 and the 384 page (cadence, source, rail size, skip rule, stills only, no invented duration, and Explore at a reel stay) · [`stories-home-rail-fb-card-lock-v1.md`](stories-home-rail-fb-card-lock-v1.md) — its G "superseded on the Feed" note is reversed: the Feed shows this lock's cards again, with the deltas in §3 · [`stories-home-rail-card-identity-lock-v1.md`](stories-home-rail-card-identity-lock-v1.md) — "no bottom name on user story cards": the H board puts the name on the picture · [`shell-desktop-header-content-inset-lock-v1.md`](shell-desktop-header-content-inset-lock-v1.md) — G's phone pull of 12 on the Feed's first row (`max-md:-mt-3`) · G's amendments recorded in other locks: [`social-home-activity-feed-lock-v1.md`](social-home-activity-feed-lock-v1.md) (the G stack), [`social-home-spine-density-lock-v1.1.md`](social-home-spine-density-lock-v1.1.md) (G's tiles, words and per-block air on the Feed) and [`social-home-composer-fb-row-sheet-lock-v1.6.md`](social-home-composer-fb-row-sheet-lock-v1.6.md) (G's composer bar as the Feed face) · [`24frame-visual-register-rich-calm-lock-v1.md`](24frame-visual-register-rich-calm-lock-v1.md) — G's Feed-only amendment (the feed carries zero accent; the unseen ring and the story badge ink; a hairline Follow; G's air): the unseen ring and the Create story plus are accent again, Follow is the grey pill, and the air is the H board's 8 / 16 / 24 / 48 · **the post face (H · Posts, §7):** [`social-home-post-separation-lock-v1.md`](social-home-post-separation-lock-v1.md) — Option A (every post a muted radius-16 card; the in-card 16 inset; pb 24 under the time; the gutter 24 at every width): a media post is no card, a text post is the soft grey card at radius 24, the wall is 24 / 48 · [`social-feed-under-post-time-lock-v1.md`](social-feed-under-post-time-lock-v1.md) — the time as the last line under the caption: it sits in the credit row after the name · [`social-feed-text-media-caption-below-lock-v1.md`](social-feed-text-media-caption-below-lock-v1.md) — the order author → media → actions → likes → caption → comments → time: media → credit row (name, time, actions) → caption; the likes line and the comments trail become counts beside the rounds · [`social-home-post-actions-align-lock-v1.md`](social-home-post-actions-align-lock-v1.md) — on the feed post only, the bare 40 hits with 24 ink-2 glyphs: round grey 40 / 44 with 20 ink glyphs (the immersive and Explore rails keep the bare hits) · [`social-home-craft-wave-1-lock-v1.md`](social-home-craft-wave-1-lock-v1.md) — the post rhythm (the 16 inset inside the card, the optical pull, the likes / caption / time stack) · [`social-feed-photo-scale-immersive-lock-v1.md`](social-feed-photo-scale-immersive-lock-v1.md) — the feed still's min(70vh, 560) cap and its 4:5 / 16:9 buckets: the photo fills the column at its true shape, 1.91:1 to 4:5 (tap-to-immersive stays).  
**Keeps:** `nav aria-label="Feed scope"`; `useSocialHomeLive` and `socialHomeAxisHref` (Following omits `lane`, For you is `?lane=for-you`, the topic is kept); the topic slate (All, then the 15 topics A→Z) and tapping the current topic returns to All; `role="group" aria-label="Topics"`; the keyboard scroll-padding rule and `socialRowFocusShift`; the 5 px focus-ring pad on sideways tracks; `SocialStoryRailCover` and its mint-on-visible; "Share something", the write sheet and the pickers; the Reels data, cadence, skip rule and `?v=` deep link; the cold slot that keeps the mounted Feed up during a lane or topic hop; `SocialDesktopForYouSlot` as the rail's one data path; light default, dark available. Posts: tap-to-immersive, the Following Mux band (one player), the comments thread, who liked, the share sheet, the owner's Edit caption and Remove with the live caption ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md)), optimistic likes and comments, the swipe carousel, the `data-social-post*` hooks.

---

## Founder direction (verbatim, 2026-10-05)

On the Coinbase home screenshot:

> we must remain in this register.

> I want the Coinbase register, but the modernize idea of social media experience through its layout and media-immersive experience.

> we're not too far off already, just improve what we have to do what we're trying to do.

Approving the H boards:

> I like the designs. Let's use them. 1) that's fine, but use default text "Search Social" 2) yes 3) ok 4) yes. 5) sure

| # | Question | Pick | Where it lands |
|---|----------|------|----------------|
| 5 | "For you" stays both as the slider option and as the right column heading? | **"sure"** | This lock §1 (the slider) and §6 (the rail heading) |

Decisions 1 and 2 are the shell's ([`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md)); 3 is Explore content and 4 is Messages (later PRs).

Still in force: Geist; the ladder 13 / 15 / 17 / 20 / 28 / 56; body 420, title 480, medium 500, semibold 600; tokens only (hex only in `src/app/tokens.css`); light default and dark; nothing truncated on phone; copy in `src/lib`; logic and classes in `src/lib`; one component per pattern; no status colours; no drop shadows except the phone dock's float.

---

## Stack (one column, phone and desktop)

`lock_slider_stories_composer_topics_wall`: **slider → story cards → composer → topic chips → wall**, as the board draws it (the topics sit over the wall they filter). Same JSX on both devices. Air: **24 · 24 · 24 · 16** (superseded by the cards lock: 16 · 8 / 16 · 16 · 8 / 16, the stories and the composer each a card) (`SOCIAL_HOME_STACK_LOCK`, `SOCIAL_HOME_STACK_ORDER`). The slider sits **16** under the phone top bar (the frame's 16; no pull) and **24** under the desktop header (the shared 8 inset plus the grid's 16) (superseded by the cards lock §8: **16** under the desktop header, the shared 8 inset plus the row's 8).

## 1) Following / For you — the primary pill slider (H §3.1)

| Item | Lock |
|---|---|
| Component | The house `SegmentedTrack` with the shared primary pill slider classes (`HOUSE_PILL_SLIDER_*`): the same track, thumb, motion and labels as the header's workspace slider. One pattern, one component |
| Host | `nav aria-label="Feed scope"`, its own row, left-aligned, phone and desktop. The track hugs its labels (about 221 wide) |
| Track | `--surface-muted`, radius full, **no inset** (the thumb is the full track height) |
| Segment | A link, **44** tall, pad **20**, label **17 / 600**; ink idle, the page colour on the thumb |
| Thumb | Ink (`--text`), slides **220 ms ease-out**; the label ink snaps with the thumb's index. Before the thumb is measured (the server paint) the lit segment carries the ink itself, so "Following" never paints white on grey |
| Current | `aria-current="page"` on the lit segment (Following on `/social`, For you on `?lane=for-you`) |
| State | Same hook and URLs as before. The segment selects in the click (the owned href moves the thumb and the label ink at once); the cold slot pushes the RSC. Persist key `social-feed-scope` (the house remount flight) |
| Copy | `SOCIAL.home.followingTab` / `forYouTab`. "For you" stays the slider option (founder decision 5) |

## 2) Topics — secondary chips (H §3.2)

| Item | Lock |
|---|---|
| Order | **All**, then the 15 locked topics A→Z (`SOCIAL_CATEGORY_LABELS`). Unchanged slate |
| Idle | No fill, **15 / 500 ink** |
| Current | The accent wash (`--accent-wash`) with **accent-ink 15 / 600** (`--accent-ink`, 4.62:1 on the wash), `aria-current="true"`. Never `--accent` type on the wash (4.07:1) |
| Desktop | Chips **40** tall, pad **16**, gap **4**, inside the 600 column ("All" on the column edge) *(the column superseded by the cards lock §8: 680)* |
| Phone | A **44** hit holding a **36** pill (pad 14), gap 4; the row meets the viewport and pads 16. Labels never truncate |
| Fade | A **96** page-colour fade over the trailing edge holds the round grey **More topics** (desktop **40**, phone **44**, 16 in on phone; a 20 chevron) that scrolls the row on. Fade and button leave at the end of the row |
| Keyboard | The track's inline-end scroll padding equals the fade width (**96**), so a chip reached with Tab scrolls clear of the fade (`socialRowFocusShift` on `:focus-visible`). The track pads 5 above and below (taken back in margin) so the focus ring draws whole |
| Behaviour | Tapping the current topic returns to All. `role="group" aria-label="Topics"` |

## 3) Story cards (H §5.2; the stories card lock's geometry)

| Item | Lock |
|---|---|
| Card | **112×200** desktop / **108×192** phone (about 9:16), radius **16**, gap **8**, **no border** (H: no borders on cards) |
| Cover | `SocialStoryRailCover`, full bleed (unchanged, mint-on-visible stays) |
| Avatar | Top-left 8: **36** (phone **32**) in a **2px** ring with a 2px inner pad — **accent** when unseen, hairline when seen |
| Name | On the picture: "Elena R." (`socialStoryCardName`: first name and last initial) in a **48** band scrim (`--band` at 72% → 0), **13 / 500** band-ink, inset 8. It wraps; it is never cut (the card lock's "truncate" yields to the house rule) |
| Create story | First. The member's photo in the upper **120**; the muted plate under it (no hairline); "Create story" **15 / 500** ink, centred, 12 from the bottom; a **40** (phone **36**) accent circle with the plus in accent-contrast, ringed 3 in muted, on the seam (centre at 120) |
| Rail | Phone: meets the viewport, pads 16, scrolls sideways. Desktop: inside the column. The track pads 5 above and below so a card's focus ring draws whole |
| Names | Create: "Your story, create a story". Author: "{full name} story" (`SOCIAL.stories.cardLabel`), e.g. "Elena Ruiz story" |

## 4) Composer (H §5.3)

One **44** row, no bar: the **44** avatar, **12**, the grey **"Share something"** pill (flex, `--surface-muted`, radius full, 44, **17 / 420** ink-2, pad 16), then **8** (phone **4**) a round grey **44** Photo, **8** (4) a round grey **44** Camera (20 ink glyphs; hover steps the grey to the hairline grey). The avatar and the pill are one button that opens the write sheet; Photo and Camera open the pickers. Below **360** the avatar steps out (as the phone bar's workspace name does; the bar keeps the member's photo), so "Share something" stays one line in its 44 pill at 320 and both pickers stay. Copy, sheet and pickers unchanged.

## 5) Reels row (H §5.4; data and cadence in the reel rail lock)

| Item | Lock |
|---|---|
| Head | **44** tall: "Reels" as an `<h2>` **20 / 480 / -0.02em**, ink, normal case |
| Arrows | Desktop only: round grey **44** Previous and Next, **8** apart, 20 chevrons; Previous at 40% (`aria-disabled`) at the start, Next at the end. They page by two tiles: **376** (2 × (180 + 8)) |
| Tiles | 9:16, desktop **180×320**, phone **160×284**, radius **16**, gap **8**; **16** under the head (phone 12). Desktop: clipped at the 600 column (3 tiles and a peek) *(the column superseded by the cards lock §8: 680, still 3 tiles and a peek)*. Phone: meets the viewport, pads 16, snaps; no arrows |
| Tile face | Unchanged: the still with the edge vignette, the band scrim, the 24 portrait with its ring, the name 13 / 600, the first line 13 / 1.35 (whole or not at all) |
| Air | Desktop **48** above and below (the wall's 48 gutter, §7; the row adds none); phone 28 (4 plus the 24 gutter) |
| Duration chip | **Still out**: posts store no video duration, so none is shown rather than invented (reel rail lock) |

## 6) For you rail and grid (H §5.5, desktop)

> **Superseded in part (founder 2026-10-07, cards lock §8):** the Grid row. The Feed column is 680, centred on the viewport with the side menu open or collapsed and never under it; the rail (296, 48 at least) keeps its trailing edge on the shell gutter and shows when the Feed container fits 1024 (680 + 48 + 296), not from xl; the pair is no longer end-aligned. The heading, the course, the people and the data below stand. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md).

| Item | Lock |
|---|---|
| Grid | Feed column **600**, gap **48**, rail **296** (pair **944**), end-aligned on the shell gutter. The rail shows from **xl** (Assumption 1); below xl it is `display:none` and the column keeps its 600 cap from md. `/social` only |
| Heading | **"For you"** `<h2>` **20 / 480**, 44 tall, level with the slider (founder decision 5: **"sure"**). The rail's accessible name is "For you". No heading when the rail has nothing to show |
| Course | 16 under the heading: the latest course as **one soft grey card** that is one link (`CourseCard` density `feature`): `--surface-muted`, radius **24**, pad **16**, no border, no shadow; the 16:9 cover at radius **16**; 16; "Latest course · Education" **13 / 500** ink-2; 4; the title **17 / 600** ink. No signed cover: the glance plate (never a blank on the grey card) |
| People | 24, "Suggested people" **17 / 600**; 12; rows **56** (pad 12, gap 12, radius 24 for a hover fill): the **40** avatar, the name 17 / 600, the second line 15 ink-2, and **Follow** as the small secondary: a grey **36** pill, **15 / 600** ink, pad 16. No accent fill, no hairline |
| Data | `SocialDesktopForYouSlot` (unchanged), shown in the Following lane as before. The rows keep the member's handle and name (no invented role line: the main-role picker ships later) |

## 7) Posts (H §5.1) — H · Posts

> **Superseded (founder 2026-10-06, cards lock):** "the media is the card" and the credit row under the media are reversed. Every post kind is one soft grey card with the header on top, the words, the media inset 8 at radius 16 and the actions at the bottom; no screen and no band on a video. The table below is the H record. See [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md).

> **Amended (comments window, 2026-10-09):** on desktop, Comment opens the comments window over the page; the phone keeps its sheet. See [`social-comments-window-lock-v1.md`](social-comments-window-lock-v1.md).

> **Amended (owner menu, 2026-10-09; Adam, "approved, do it after Edit caption merges. make both better than it is."):** the ⋯ reads Edit caption · Remove; a phone opens the house AppSheet of rows. See [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md).

**The media is the card.** A grey card around the media read cheap (a grey frame, square media corners inside a round card, smaller media), so the media carries the large radius and fills the column; the register lands around it: round grey actions, a quiet credit, and a soft grey card for text-only posts. One face everywhere `SocialPostCard` renders (the Feed in both lanes, Profile activity, a member's posts, the permalink). **Role eyebrow:** the founder chose "Members choose one; no line until they do" — the main-role picker ships later, so posts render **no** role line now and keep a clean slot for it (the name stack, above the name).

| Item | Lock |
|---|---|
| Kinds | **photo** (one still, or two or more items in one swipe frame), **video** (one video), **text** (no media): `socialPostKind`, `data-social-post-kind` |
| Photo | Fills the column at its **true shape**, held between **1.91:1** and **4:5** (beyond either, it crops to the limit: object-cover). Radius **24** from md; on phone it meets the viewport at radius 0. **No card, no frame, no border.** The stored width and height draw first; once the still loads, its natural size is the shape (`socialPostPhotoAspect`). No stored shape: 4:5 (16:9 with a landscape hint) until it loads. No height cap: the 560 still cap is retired |
| Chips on the photo | The **topic** top-left and the counter **"1 / 3"** top-right: **28** tall, pad 10, radius full, `--band` at 72%, **13 / 500** band-ink, inset 16. Labels only: a tap reaches the photo. The live region still reads "1 of 3". The topic is the post's stored category on the slate; none, no chip |
| Swipe | Two or more items: one frame at the first still's true shape; every slide fills it. The dots (on the band at 72%, both themes) are **drawn from md**: a desktop pointer has no swipe, so they show there as buttons. **Below md** the board draws none (the "1 / 3" chip reads the place and a finger swipes, so no 24 dot is drawn as a phone target), but the dots **stay buttons in the accessibility tree**: visually hidden (`sr-only`) until one has keyboard focus, then the row shows on the band (`max-md:not-focus-within:sr-only`, never `display: none`). A keyboard, switch or screen-reader user on a phone still changes slides (the slides off screen are `aria-hidden`; the live region reads "2 of 3") |
| Video | The **screen**: `--screen` (**#0f0f0f** light / **#000000** dark — the one new token), radius **24** from md, phone meets the viewport. A **44** band on top: the topic left, **"Video"** right, 13 / 500 band-ink at 72% (about 9.6:1), inset 16. Under it the existing frame at the video's shape (its min(70vh, 560px) cap; a tall video narrows and is pillarboxed on the screen) with the existing player and controls. The one-player gate (the Following Mux band), the poster, signed thumbs and tap-to-immersive are unchanged |
| Credit row | **16** under the media (phone **12**), 44 tall: the **40** avatar — a circle the photo fills; initials (15 / 600 ink-2) on muted only when there is no photo (inside the text card, on the card's onMuted: the page white; `--surface-muted` in dark) —, 12, the name **17 / 600** ink (the avatar and the name are one 44 link to the member), 8, the time **15** ink-3 (ink-2 in dark and on the grey card), tabular, a 44 permalink hit that starts at the text. A group follows as "· Group", 15 ink-2, a 44 hit |
| Role line | **None** until members choose a main role ("Members choose one; no line until they do") |
| Actions | **Round grey 40** (phone **44**): Like (liked: the filled heart in the accent), Comment, Share; **8** apart; glyph **20** ink; muted on the page; on the grey card the board's **onMuted**, lighter than the card in both themes (light: the page white on the `--surface-muted` card; dark: `--surface-muted` on the `--surface` card, see Tokens). **Counts beside**, 15 / 500 ink-2, tabular, none at zero: the like count is its own button ("4 likes") that opens who liked; the comment count sits inside the Comment button ("Comment, 2 comments"). Desktop: right of the credit row. Phone: their own row under the caption, aligned to the name (**52** = the 40 avatar + 12) on a media post, to the body on a text post |
| ⋯ | The owner's menu (Edit caption, Remove): a quiet **40** (phone **44**) clear hit, glyph 20 ink-2, at the header's end. Others see none: posts have no report action today, and none is invented. Desktop: the thread ··· popover; phone: the house AppSheet card of rows. Edit caption opens the caption window (social-post-caption-window-lock-v1); Remove asks first (social-post-owner-menu-lock-v1) |
| Caption | **8** under the credit row, aligned to the name (52): desktop **17 / 420** ink-2, line 1.5; phone **15 / 1.45**. The words alone (the name is just above; no handle prefix). Wraps; **never clamped**. Plain text, as drawn: the permalink is the time's 44 hit, so the words are no sub-44 phone target |
| Text-only | The soft grey card: `--surface-muted` (dark: `--surface`, the board's dark muted **#1e2126**), radius **24**, pad **24** (phone **16**), no border, no shadow. The credit row inside, its rounds on the onMuted (light the page white, dark `--surface-muted` **#25292f**), lighter than the card; 12, the body at **20 / 480** ink, -0.02em, line 1.4, the card's width |
| Wall | **24** between posts on phone, **48** from md (`SOCIAL_FEED_GUTTER_CLASS`); the Reels row takes the same gutter |
| Out | The likes line under the actions; the "N comments" trail; the under-post time line; the muted Option A card around a media post; the author row over the media; the bare 40 hits with 24 glyphs on the feed post; the caption's handle prefix |
| Skeleton | `SocialPostWallSkeleton` (the Feed and Profile): the live classes — the media block at the frame's default 4:5, the credit row (a 40 circle, a name bar), three round actions |

## Skeleton and cold slot

`SocialHomeCenterSkeleton` uses the live classes in the live order (the slider's 44 track, the story cards, the composer row, the topic chips, the wall — `SocialPostWallSkeleton`, §7); the rail skeleton is the same 296 column with the heading row, the card box, the section and two 56 rows. The cold slot still keeps the mounted Feed up during a lane or topic hop, so the slider's thumb slides in place.

---

## Tokens

| Board key | Token |
|-----------|-------|
| page | `--bg` |
| muted | `--surface-muted` (the text post card in dark: `--surface`, below) |
| line | `--border` (`border-hairline`) |
| ink / ink2 | `--text` / `--text-secondary` |
| ink3 | `text-ink-3 dark:text-ink-2` (`SOCIAL_FEED_QUIET_INK_CLASS`) |
| acc / onAcc | `--accent` / `--accent-contrast` |
| wash / accInk | `--accent-wash` / `--accent-ink` |
| thumb / onThumb | `--text` / `--bg` |
| nameScrim | `--band` at 72% → 0 |
| scrim (Reels) | `--band` at 94% / 78% / 0 (unchanged) |
| stInk | `--band-ink` |
| stInk2 (the screen band) | `--band-ink` at 72% |
| chipBg (chips on media) | `--band` at 72% |
| screen (a video's frame) | `--screen` — **new**: `#0f0f0f` light, `#000000` dark (`src/app/tokens.css`, commented; `bg-screen`) |
| onMuted (a round, or the empty avatar, on the grey card) | `--surface` in light; `--surface-muted` in dark (`dark:bg-surface-muted`) |

**The grey card in dark.** The board draws dark muted **#1e2126** and onMuted **#25292f**; the build's dark `--surface-muted` is **#25292f** (H §8.7, an open departure that stays for every other muted fill). With the light mapping the dark rounds (`--surface`, #1e2126) would sit **darker** than the card (#25292f) — the board's layering inverted. So on the text post only, dark swaps the pair: the card is `--surface` (#1e2126) and its rounds and empty avatar `--surface-muted` (#25292f), the board's exact values in existing tokens, lighter than the card by 1.11:1 (light: 1.10:1). The card lifts 1.19:1 off the #0f0f0f page (the board's lift; the other dark muted fills lift 1.31:1). The time on the card stays ink-2 (7.1:1). The rounds' hover (`--border`, #2a2f34) still reads lighter. Off the card nothing remaps. Reversible: three class strings in `src/lib/social-chrome.ts`.

One new token, `--screen` (§7): `--band` (#1b1f23) reads as charcoal grey around a picture, and no existing token is near-black in both themes. No other new hex. Every colour flips under `.dark`. Radii: `--radius-lg` (16) for tiles and covers, `--radius-xl` (24) for the course card, rows, photos, the video screen and the text post card, full for every pill and circle.

## Assumptions (stated, reversible)

1. *(Superseded by the cards lock §8: the rail shows when the Feed container fits 1024, beside a 680 column.)* **The rail shows from xl (1280), not lg.** Beside the 240 side menu and the shell gutters, the 944 pair fits from 1248; at lg the column would shrink to about 392. Below xl the column keeps its 600 cap. One class each (`SOCIAL_FEED_LAYOUT_CLASS`, `SOCIAL_FEED_ASIDE_CLASS`).
2. *(Superseded by the cards lock §8: the column is centred on the viewport; only the rail keeps the shell gutter.)* **The pair stays end-aligned** on the shell gutter (the Social row's rule; the avatar's line), not centred as on the board; at 1280 the column starts 64 after the side menu, the board's 48 plus the 16 frame pad.
3. **The topics move below the composer**, as the board draws them (slider → stories → composer → topics → wall); G had them under the tabs.
4. **The story card's name wraps** rather than truncating (the card lock said truncate; the house rule is nothing truncated on phone).
5. **The suggested-people rows keep the handle and the name** (the board draws a role line; there is no main role yet).
6. **The skeleton's slider is one 221-wide pill**; the real track's width follows its labels.
7. *(Superseded by the cards lock: the ⋯ sits at the header's end.)* **Posts: the ⋯ stays at the credit row's end on phone for every kind** (the board moves it into a video's screen band on phone): one place for the owner's menu.
8. **Posts: the like count is its own button** that opens who liked, beside the round heart (the board draws one "Like, 4 likes" button), so the likers list stays one tap away. The names read "Like" / "Unlike" and "4 likes".
9. *(Superseded by the cards lock: no screen and no band.)* **Posts: every video gets the screen band** (topic left, "Video" right); the board draws chips over its 4:5 video instead. The video keeps its existing cap and player controls (the board's bottom control band is not drawn).
10. **Posts: counts hide at zero** (the board draws non-zero counts only); phone actions stay 8 apart, as the board draws them.
11. **Posts: Profile and permalink posts show the topic too**, from the same stored category, so the face is one face everywhere.
12. **Posts: the swipe's dots are drawn from md only** (Adam's 2026-09-25 carousel lock had dots at every width; the H board draws none). Below md they stay in the accessibility tree, visually hidden until one has keyboard focus, so a phone's keyboard, switch or screen reader can still change slides. The caption is no longer a link to the permalink; the time is.
13. **Posts: on the text card, dark swaps the grey pair** (the card `--surface`, its rounds and empty avatar `--surface-muted`) so the rounds sit lighter than the card as the board draws them; every other dark muted fill keeps `--surface-muted` (H §8.7). See Tokens.

## Explicit OUT

- An underline tab or an underlined topic on the Feed
- `--accent` type on the wash; a filled accent topic chip
- A border or a shadow on any card, chip, pill or tile
- A truncated topic, story name or Reels line
- A duration chip on a Reels tile (no stored duration)
- A role line on suggested people or on posts before the member chooses one
- A card or frame around a photo; the likes line, the comments trail or the under-post time line on a post; a clamped caption
- A report or other non-owner item in the post ⋯ (none exists; none is invented)
- Explore content, Profile, Messages (later PRs)
- New hex outside `tokens.css`; a second new token

---

## Gates

**G1.** Following / For you is the house `SegmentedTrack` with the shared pill slider (muted track, no inset, ink thumb sliding 220 ms ease-out, 44 segments at 17 / 600, pad 20), in `nav aria-label="Feed scope"`, left-aligned; `aria-current="page"` on the lit lane; same hook and URLs. *(Labels superseded by the cards lock: 15 / 500, ink-2 idle; the ink thumb stays.)*  
**G2.** Topics: All first, then the 15 topics A→Z; idle 15 / 500 ink with no fill; current the accent wash with accent-ink 15 / 600 and `aria-current="true"`; 40 desktop, a 36 pill in a 44 hit on phone; a 96 fade with the round grey More topics; the scroll padding equals the fade. *(Weights superseded by the cards lock: ink-2 idle, 500 current; a chip under the fade hides.)*  
**G3.** Stack is slider → stories → composer → topics → wall (`lock_slider_stories_composer_topics_wall`), air 24 · 24 · 24 · 16. *(Air superseded by the cards lock; the slider 16 under the desktop header, cards lock §8.)*  
**G4.** Story cards 112×200 / 108×192, radius 16, gap 8, no border; the accent ring when unseen; the name on the picture; Create story with the accent plus on the seam.  
**G5.** Composer: 44 avatar, the grey "Share something" pill, round grey 44 Photo and Camera. *(Superseded in part by the cards lock: the composer is a card; the pill and rounds on the in-card fill.)*  
**G6.** Reels: a 20 / 480 "Reels" heading; round grey 44 arrows (desktop); tiles 180×320 / 160×284, radius 16, gap 8; the 376 page. *(Superseded in part by the cards lock: the row is a card; the arrows on the in-card fill.)*  
**G7.** Grid 600 / 48 / 296; the "For you" heading; the course as one soft grey card (radius 24); 56 rows with the grey 36 Follow; no hairline. *(Superseded in part by the cards lock: the course title 15 / 600; the people a card, Follow 15 / 500 on the in-card fill. Grid superseded by the cards lock §8: 680 / 48 / 296, the column centred on the viewport, the rail when the container fits 1024.)*  
**G8.** Skeleton rows use the live classes in the live order.  
**G9.** Photo posts: the column at the true shape (1.91:1 … 4:5), radius 24 (phone 0, meeting the viewport), no card or frame; the topic chip and the "1 / 3" chip on the photo (28, the band at 72%); the swipe's dots drawn from md and, below md, buttons in the accessibility tree that show on keyboard focus (never `display: none`). *(Superseded by the cards lock: the photo sits inside the post card, inset 8 at radius 16; phone edge to edge.)*  
**G10.** Video posts: the screen (`--screen`, radius 24) with the 44 band (topic left, "Video" right); the existing frame, player, Mux band and tap-to-immersive unchanged. *(Superseded by the cards lock: no screen, no band, no "Video".)*  
**G11.** The credit row under the media (16; phone 12): the 40 circle avatar, the name 17 / 600, the time 15 quiet ink; no role line. *(Superseded by the cards lock: the header sits on top of the card.)*  
**G12.** Round grey 40 (phone 44) Like · Comment · Share, glyph 20, 8 apart, counts beside (none at zero); the like count opens who liked; Comment is named with its count; the owner's quiet ⋯.  
**G13.** The caption 17 / 420 ink-2 (phone 15 / 1.45), aligned to the name, never clamped; text-only posts the soft grey card (radius 24, pad 24 / 16) with the body at 20 / 480; its rounds and empty avatar lighter than the card in light and dark (light `--surface` on `--surface-muted`, dark `--surface-muted` on `--surface`). *(Superseded by the cards lock: one words style, 15 / 420, desktop 17; every post a card.)*  
**G14.** The wall 24 / 48; one wall skeleton with the live post classes. *(Superseded by the cards lock: 8 / 16 between cards.)*

**FAIL:** an underline on the Feed switch or topics · lane chips in the topic row · a bordered or shadowed card · accent text on the wash · a truncated label · an invented duration or role line · a framed photo · a likes line, a comments trail or an under-post time · a clamped caption.

## Verify-on-ship

1. 390, 768, 1024, 1280, 1440, light and dark: the slider leads the Feed (16 under the phone bar, 24 under the header *(16 since the cards lock §8)*); the thumb slides between Following and For you with no flicker; the topics' current chip is the wash.
2. Story cards at 112×200 (108×192 on phone), the name on the picture, the accent ring on unseen; Create story's plus on the seam.
3. The Reels row's heading, arrows (desktop), 16 radius and 8 gap; the arrows page by two tiles.
4. *(Superseded by the cards lock §8: the rail when the Feed container fits 1024; the column 680, centred.)* From 1280: the For you rail at 296 with its heading level with the slider; below 1280 the column alone at 600.
5. Keyboard: Tab through the topics; a chip under the fade scrolls clear. At 390, Tab into a swipe post: the dots show on the band with the focus ring; Enter moves the slide and the chip reads "2 / 3"; Tab out and they hide.
6. Posts at 390 and 1280, light and dark: a photo at its shape (radius 24 on desktop, edge to edge on phone) with its chips; a video on the screen with its band; a text post's grey card; the credit row and the round actions (beside on desktop, under the caption on phone); no ellipsis; phone hits 44.
7. Posts behave: tap the media → the immersive; Like toggles and the count opens who liked; Comment opens the thread (desktop: the comments window); Share opens the sheet; the owner's ⋯ edits the caption and removes; one Following video plays at a time.

---

## Repo citation

`docs/design-locks/social-feed-register-lock-v1.md` · code: `src/components/social/social-home-lane-tabs.tsx` (slider), `social-home-topics.tsx`, `social-stories-rail.tsx` (`HomeStoryCards`), `social-home-composer.tsx`, `social-feed-reel-rail.tsx`, `social-for-you.tsx` (the rail), `social-skeletons.tsx` (`SocialPostWallSkeleton`), `src/components/courses/course-card.tsx` (`feature`); posts: `social-post-card.tsx`, `social-post-media.tsx`, `social-feed-carousel.tsx`, `social-engagement.tsx` (the round heart, the count), `social-comment-trigger.tsx`, `social-post-share-button.tsx`, `social-post-owner.tsx`, `social-avatar.tsx` (`post`); classes in `src/lib/social-chrome.ts` (H · Feed block, H · Posts), `src/lib/house-shell.ts` (`HOUSE_PILL_SLIDER_*`), `src/lib/courses.ts` (`COURSE_FEATURE_*`); the photo shape in `src/lib/social-media-display.ts` (`socialPostPhotoAspect`); the topic in `src/lib/social-following-wall.ts` and `src/lib/social-author-post-card.ts`; the token in `src/app/tokens.css` (`--screen`); copy in `src/lib/social.ts`; stack in `src/lib/social-home.ts`; the Reels page in `src/lib/social-feed-reels.ts`.
