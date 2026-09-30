# [GC][24Frame] LOCK — Social post comment open v1

**Date:** 2026-09-30
**Status:** LOCKED for this slice. Comment on a post opens that post’s own URL.
**Scope:** Feed comment icon and the “N comments” trail. The post route `/social/p/[postId]`. Soft-nav intercept `@modal/(.)p/[postId]`. Not Explore For You (that comment stays the in-place thread). Not the Share sheet.

## One lock

Comment opens the post. The address bar is `/social/p/[postId]`. Soft navigation from a Social page keeps the previous page mounted and paints this surface in the `@modal` slot. Close returns to that page. A hard load of the same URL paints the same surface; close goes to Social home unless the referrer is already this origin.

Phone and desktop are different frames. A breakpoint does not turn the phone column into the desktop card.

## Route

| Token | Lock |
|-------|------|
| URL | `/social/p/[postId]` |
| Soft-nav | `src/app/(app)/social/@modal/(.)p/[postId]` |
| Hard load | `src/app/(app)/social/p/[postId]` |
| Empty slot | `@modal/default.tsx` renders nothing |
| Trigger | Comment icon and “N comments” are links to that URL. Accessible name is Comments. `scroll={false}`. Not an in-place sheet |
| Explore | `presentation="sheet"`. For You stays on the current item |
| Close | X, scrim (desktop), Escape. Nested Share or likes dialog consumes Escape first |

## Phone

Full viewport. Same URL. Surface fill. Column, top to bottom: close, author, media when the post has any, caption, like, comment focus, share, like count, comment list, composer. Media uses contain inside a bounded frame so the thread remains on screen. Nothing truncates. The thread scrolls. The composer stays at the bottom.

## Desktop media

Instagram split. Ink stage. Centered row, height `min(90dvh, 900px)`, width `min(96vw, 1080px)`. Picture on the leading side, contain, ink behind the letterbox. Thread rail on the trailing side, 340px, surface fill, hairline between. Close sits in the stage margin. Two or more media items use the feed carousel in the pane frame with contain, not the feed’s 70vh cover cap.

## Desktop text

Facebook card. Ink scrim at 40%. Centered surface card, width `min(92vw, 500px)`, max height 90dvh, radius 16, hairline, no shadow. Author, body, actions, comments, composer. Close sits in the card.

## Reuse

Comment list, composer, like, and share are the existing controls. This surface is not a HouseOverlay host. Do not restyle AppSheet or HouseDialog into this job.

## Out

Explore For You navigation. Share sheet grammar. Feed card order. A second comment route.
