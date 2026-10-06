# [GC][24Frame] LOCK — Social Feed cards: white canvas, soft grey cards, every post and module in its own card, stories at the top, lighter ink v1

**Date:** 2026-10-06 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-06, in chat: Direction B, "B." — recorded from the founder-authorized task brief) · three side defaults open for the founder on preview (below)  
**Scope:** Everywhere `SocialPostCard` renders (the Feed in both lanes, the optimistic post right after Post, Profile activity, a member's posts, a group, the permalink) and the Feed's modules (the stories, the composer, the Reels row, the For you lane, the rail's course card and Suggested people, the empty panel, the skeletons). The shell's ink ladder (the header workspace thumb, the pill-slider labels, the side-menu labels, the header search input) changes in every workspace.  
**Entity:** Global Content / 24Frame only  
**Source:** Social audit 2 (the founder's state, screenshots 27 and 28, reproduced on the production build) and the Direction B prototype (`proto-B`), reviewed and finished on the real components.  
**Code name:** the source files call this the **cards lock** (`SOCIAL_FEED_CARD_*`, `SOCIAL_CARD_FILL_CLASS`, `SOCIAL_IN_CARD_FILL_CLASS`).  
**Supersedes (in part):** [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) — §7 "the media is the card" (a photo with no card or frame at radius 24; a video on the near-black screen under a topic · "Video" band; the credit row under the media; the caption aligned to the name; the text post's 20 / 480 body; the wall 24 / 48), G9, G10, G11, G13, G14, Assumptions 7 and 9; the stack air 24 · 24 · 24 · 16; the slider's 17 / 600 labels with ink idle (§1, G1); the topics' ink idle and 600 current (§2, G2); the bare story rail, the bare composer row, the bare Reels row and the rail's bare people (§3–§6, G3, G5–G7 in part) · [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) — §1 the ink header thumb and the 17 / 600 slider labels, the 17 / 420 search input; §2 the 17 / 500 side-menu labels (G2, G4 in part).  
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
| Rail (xl) | The "For you" heading on the canvas; the latest course as one card (the card fill, title **15 / 600**); Suggested people as one card (subhead **17 / 480**, the person **15 / 500**, Follow **15 / 500** on the in-card fill) |
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

The permalink is one card in the Feed's **600** column (`SOCIAL_POST_PAGE_CLASS`; side default, below), its comments inside the card.

## Tokens

No new token and no new hex. `--screen` (the register lock's one new token) is no longer drawn by a feed post; it stays in `tokens.css`, unchanged, until the founder settles Direction B.

## Open founder choices (side defaults; change on preview)

1. **Card grey strength.** The card is `--surface-muted` (1.10:1 on white). If it reads faint on the founder's display, a slightly darker card grey is a founder choice and a one-line change (`SOCIAL_CARD_FILL_CLASS`). Not changed now.
2. **4:5 crop.** Tall photos (beyond 4:5) and vertical video draw 4:5 in the feed, the whole frame one tap away in the theatre.
3. **Post page width.** The permalink's card is capped to the 600 Feed column.
4. **Media unavailable line.** The wording of the one line a media-only post shows when none of its media can draw ("Media unavailable", after the Messages "Post unavailable" / "Story unavailable"). Copy is a founder checkpoint; the words are one string in `src/lib/social.ts`.

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
10. The "Media unavailable" line shows only when the post had media, none of it can draw, and the words are empty. A captioned post whose media all dropped stays a plain text card (its words are its content).

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

## Verify-on-ship

1. 390, 1280 and 1440, light and dark: the founder's state (Create story alone, a landscape and a vertical video) and a rich Feed: every post kind on its own card, stories first.
2. The story rail with only Create story and with several stories, in both lanes.
3. Profile activity and the permalink (comments inside the card).
4. The header in every workspace at 768, 1024, 1280 and 1440: the wash thumb, 15 / 500 labels, nothing clipped.
5. No horizontal overflow; no ellipsis on phone; every target ≥ 44; the skeleton matches the live layout.

## Measured (headless Chromium, the production build's CSS)

Fixtures rendered from the real shell and Social components, styled by the build's own stylesheet:

- **Cards (C1, C8).** Light: card `rgb(244, 244, 246)` on `rgb(255, 255, 255)`, in-card rounds `rgb(255, 255, 255)`. Dark: card `rgb(30, 33, 38)` on `rgb(15, 15, 15)`, rounds `rgb(37, 41, 47)`. Radius 24 at 1280 / 1440, 0 at 390; no border, no shadow. At 390 every card is x 0, width 390, 8 between; at 1280 / 1440, 600 wide, 16 between.
- **Stories (C2).** The stories card is the first module under the slider in Following and For you, with Create story alone and with four stories.
- **Media (C4).** Inset 8 / 8 at radius 16 on desktop; 0 / 0, radius 0 at 390. Frames: 16:9 video 1.778, 3:4 and 9:16 video 0.8, 4:5 photo 0.8, square 1, swipe 1.5. Play disc: the band at 72%, 56 desktop, 48 phone. No screen, no "Video". The unusable legacy video draws as a text card.
- **Media unavailable (C5).** The caption-less legacy video: header 56, then "Media unavailable" (15 / 420, 34 tall, at the words' 16 line), then the actions. The card is 150 tall at 1440 and 146 at 390; the captioned one is 154 and 146, so the two cards share one rhythm. Contrast on the card: `rgb(61, 68, 80)` on `rgb(244, 244, 246)` 8.93:1; dark `rgb(167, 173, 180)` on `rgb(30, 33, 38)` 7.13:1. No overflow and no ellipsis at 320 or 390. Before this line the card was the header and the actions alone (116 / 112).
- **Post page (C3).** The permalink card is 600 wide on desktop with its comments inside; Profile's "You commented" sits inside its card.
- **Ink (C7).** The header thumb is the wash with accent-ink labels at 15 / 500 in every workspace at 1024 / 1280 / 1440, light and dark; at 768 the header shows the workspace pill. Ink-filled elements per screen: 1 on the Feed (the Following thumb), 0 on Home, Aggregation, Education, Staff, Profile, Messages and the permalink.
- **Phone and parity (C8, C9).** No horizontal overflow and no ellipsis at 320 / 390 / 768 / 1024 / 1280 / 1440. The skeleton's slider, stories, composer, topics, wall, first card and its header sit at the live x / y / width at 390, 1280 and 1440; the first media sits one caption lower live (the skeleton draws no caption).
- **Outside this lock, unchanged from `origin/main`** (the same sizes on the BEFORE build): the permalink Back link (24 tall), the comment Post button (40), the swipe dots (24, below md), Profile's photo and cover edit buttons and activity tabs (40), the compact Follow (40), and Profile's activity pill server paint.

---

## Repo citation

`docs/design-locks/social-feed-cards-lock-v1.md` · classes in `src/lib/social-chrome.ts` (the cards block at the top and "Cards · posts"), `src/lib/house-shell.ts` (`HOUSE_PILL_SLIDER_*`, `HOUSE_DEST_RAIL_ROW_CLASS`), `src/lib/workspace-switcher.ts` (the wash thumb), `src/lib/house-lead-chrome.ts` (the search input), `src/lib/courses.ts` (`COURSE_FEATURE_*`); logic in `src/lib/social-home.ts` (`socialHomeStoryRailHasTiles`), `src/lib/social-media-display.ts` (`socialFeedVideoFrame`, `socialPostUsableMedia`, `socialPostMediaAllDropped`), `src/lib/social.ts` (`SOCIAL.post.mediaUnavailable`), `src/lib/social-feed-reels.ts` (`socialRowItemUnderFade`); components `social-post-card.tsx`, `social-post-media.tsx`, `social-stories-rail.tsx`, `social-home-composer.tsx`, `social-home-topics.tsx`, `social-for-you.tsx`, `social-comment-thread.tsx`, `social-activity-history.tsx`, `social-skeletons.tsx`, `social-icon.tsx`; the page `src/app/(app)/social/page.tsx` and the permalink `src/app/(app)/social/p/[postId]/page.tsx`; the play disc in `src/app/globals.css`.
