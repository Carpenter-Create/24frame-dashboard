# Design locks

Design locks land in this directory before CoS undrafts a UI pull request.

## Rules

- One lock per file. The filename is the lock id.
- Cite the lock path in the pull request body: `docs/design-locks/….md`. A UI, visual, or information-architecture change cites the lock it follows.
- Phone never truncates. Prefer a vertical stack. House gospel 2026-09-19.
- Never-patch lookalikes. Do not restyle a near-match, fork a second host, or patch a cousin into the job. Extend the locked primitive, or stop.
- Craft lanes. One row unlock at a time. The order is [`house-dual-host-primitive-audit-v1.md`](house-dual-host-primitive-audit-v1.md). A pull request opens one row.

## Locks

- [`mobile-menu-family-tree-v1.md`](mobile-menu-family-tree-v1.md) — families A–D, OUT, parks
- [`house-dual-host-primitive-audit-v1.md`](house-dual-host-primitive-audit-v1.md) — primitive rows
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md) — overlay geometry
- [`preferences-settings-row-grammar-lock-v1.md`](preferences-settings-row-grammar-lock-v1.md) — Preferences block types (PrefDrillGroup vs PrefControlSection) and type steps
- [`preferences-settings-row-grammar-lock-v2.md`](preferences-settings-row-grammar-lock-v2.md) — Preferences row geometry. Supersedes v1 geometry only (row layout, chevron alignment, inter-row rhythm, column width). Block types and type steps from v1 stay.
- [`theme-sot-auto-lock-v1.md`](theme-sot-auto-lock-v1.md) — Theme Auto, one `gc-theme` store
- [`theme-chrome-avatar-only-lock-v1.md`](theme-chrome-avatar-only-lock-v1.md) — avatar Theme drill; header sun/moon removed
- [`preferences-drill-nested-slugs-lock-v1.md`](preferences-drill-nested-slugs-lock-v1.md) — Preferences drill URLs nest under `/settings/preferences/<drill>`
- [`social-home-activity-feed-lock-v1.md`](social-home-activity-feed-lock-v1.md) — Social Home is the live activity feed at `/social`
- [`social-feed-photo-scale-immersive-lock-v1.md`](social-feed-photo-scale-immersive-lock-v1.md) — Feed media cap `min(70vh, 560)` cover. Tap opens one fullscreen immersive with caption and actions at the bottom. Desktop right rail is out.
- [`social-explore-for-you-immersive-lock-v2.md`](social-explore-for-you-immersive-lock-v2.md) — Explore default is a vertical video For You. Stay in immersive media. Photos and the IG grid are out. Supersedes `social-explore-discovery-lock-v1.md`.
- [`social-feed-text-media-caption-above-lock-v1.md`](social-feed-text-media-caption-above-lock-v1.md) — Home/feed posts with both text and media: author, caption, media, actions, likes. Media face stays [`social-feed-photo-scale-immersive-lock-v1.md`](social-feed-photo-scale-immersive-lock-v1.md). Stories stay media-first.
- [`social-home-composer-share-copy-lock-v1.md`](social-home-composer-share-copy-lock-v1.md) — Home composer prompt and activity empty primary CTA are **Share something**
- [`share-something-text-write-direct-lock-v1.md`](share-something-text-write-direct-lock-v1.md) — Share something text opens write compose. No Create sheet hop. Write compose can attach media. Home Photo and Camera stay. + still opens the Create sheet
- [`write-compose-immersive-icons-lock-v1.md`](write-compose-immersive-icons-lock-v1.md) — Phone write compose is a full-viewport sheet. Social header and bottom dock hide while it is open. Attach is icon-only. X and Post stay
- [`write-compose-voice-first-immersive-lock-v1.md`](write-compose-voice-first-immersive-lock-v1.md) — Write compose is house-light. §0.4.2 kind=text is the iMessage path: caption on white, camera far-right opens the library, no mic. No gray plate. No Following chip. X leaves for Social home
- [`social-home-spine-density-lock-v1.md`](social-home-spine-density-lock-v1.md) — Phone-first Home spine v1. Superseded for density feel by v1.1 (Share something, bleed feed, and stack order stay)
- [`social-home-spine-density-lock-v1.1.md`](social-home-spine-density-lock-v1.1.md) — Launch-great Home spine. Stories 136×240, Topics chip 32, section gap 8, feed bleed. §A two-row composer superseded by the FB-row lock. Share something copy stays on the share-copy lock
- [`social-home-composer-fb-row-sheet-lock-v1.md`](social-home-composer-fb-row-sheet-lock-v1.md) — Home composer is one row: avatar 40, Share something, icon-only Photo then Camera. Supersedes spine density v1.1 §A. Tokens superseded by v1.1
- [`social-home-composer-fb-row-sheet-lock-v1.1.md`](social-home-composer-fb-row-sheet-lock-v1.1.md) — Same FB row. Photo and Camera are glyph 16, hit 32, flush. Field fill and border superseded by v1.2
- [`social-home-composer-fb-row-sheet-lock-v1.2.md`](social-home-composer-fb-row-sheet-lock-v1.2.md) — Share something has no drawn edge: transparent fill, no border, no shadow. Supersedes v1.1 field fill and border only. Icons stay v1.1. Stage height and host chrome superseded by v1.3
- [`social-home-composer-fb-row-sheet-lock-v1.3.md`](social-home-composer-fb-row-sheet-lock-v1.3.md) — Composer band 32 strip. Superseded for height and host chrome by v1.6
- [`social-home-composer-fb-row-sheet-lock-v1.4.md`](social-home-composer-fb-row-sheet-lock-v1.4.md) — Between-only Topics divider. Superseded for composer chrome by v1.6
- [`social-home-composer-fb-row-sheet-lock-v1.6.md`](social-home-composer-fb-row-sheet-lock-v1.6.md) — White compose band, pad Y 8, band 56, avatar and field 40. Hairline top and bottom only. No side stroke, no radius, no sibling divider. Field-air v1.2 and icons v1.1 stay
- [`social-home-topics-strip-center-lock-v1.md`](social-home-topics-strip-center-lock-v1.md) — Topics pills are centered between the header hairline and the composer top rule. Equal air above and below. Pill hit stays 32. Does not reopen composer v1.6
- [`social-home-topics-vertical-center-lock-v1.md`](social-home-topics-vertical-center-lock-v1.md) — Design cite for that center. Chip height 32. Equal air. Does not reopen composer v1.6
- [`social-mobile-full-bleed-lock-v1.md`](social-mobile-full-bleed-lock-v1.md) — Phone only: post media and horizontal grey dividers meet the viewport. Text, avatars, and actions stay inset. Desktop feed gutters stay
- [`social-home-post-actions-align-lock-v1.md`](social-home-post-actions-align-lock-v1.md) — Like, Comment, and Share are one triplet. Hit 40, glyph 24, gap 8, shared optical baseline. Idle ink is `text-ink-2`. Same component on phone and desktop
- [`social-home-stories-feed-hairline-lock-v1.md`](social-home-stories-feed-hairline-lock-v1.md) — Phone only: 1px `#ECEDF0` hairline under the Stories rail, viewport edges. Desktop out. Parent is the mobile full-bleed lock
- [`create-story-photo-video-fb-layout-lock-v1.5.md`](create-story-photo-video-fb-layout-lock-v1.5.md) — Create story stage at `/social/stories/new`. Photo and video each have Upload (file) and Take (live camera). Camera face is a rectangular full-bleed viewfinder plus Stories chrome (close, flash, shutter, gallery, flip, STORY). Supersedes v1.4.
- [`stories-upload-success-immersive-lock-v1.md`](stories-upload-success-immersive-lock-v1.md) — After a Story posts, one immersive studio confirm with the just-posted media. Kills the thin check card.
- [`stories-viewer-desktop-ig-carousel-lock-v1.md`](stories-viewer-desktop-ig-carousel-lock-v1.md) — Desktop story open is a full-viewport dark stage with a centered 9:16 card, dimmed neighbor cards, and chevrons. Phone is a full-bleed single card. Supersedes the light `max-w-[420px]` story page card.
- [`stories-viewer-ig-parity-lock-v1.md`](stories-viewer-ig-parity-lock-v1.md) — Viewer behavior on that stage: persistent host, photo 5s, video media-length, white 2px segments, auto-advance, hold, 220ms in-viewer morph. Does not reopen carousel geometry, the home rail, or create-story v1.5.
- [`stories-open-smooth-lock-v1.1.md`](stories-open-smooth-lock-v1.1.md) — Stories open, hop, and leave stay on the picture. Close X is 44×44, glyph 22, first tap to `/social`. Supersedes v1 paint-only open. Poster-hold and Mux-only stay.
- [`stories-viewer-ig-actions-lock-v1.md`](stories-viewer-ig-actions-lock-v1.md) — Viewer bottom actions: reply-to-author, heart like, send this story item via DM. Supersedes thumbs up/down. Not #664.
- [`stories-send-dm-craft-lock-v1.md`](stories-send-dm-craft-lock-v1.md) — Send-story DM craft v1.5: IG-dark share drawer, pause behind the sheet, centered Sent toast, live story card. Not #664. Heart stays on the actions lock.
- [`social-post-share-sheet-ig-lock-v1.md`](social-post-share-sheet-ig-lock-v1.md) — Post Share opens one IG-dark sheet: search, 3-column multi-select (stops at 16), optional message, Send into a DM post card. Copy link and system Share to… are in. Add to story, branded rows, and Create group are out. A group post is refused for a recipient who cannot view that group: no message, no media keys. Comment stays the comment thread. Does not reopen action-row spacing.
- [`dm-thread-message-format-lock-v1.md`](dm-thread-message-format-lock-v1.md) — DM thread is a chat: day and time cluster headers, mine right / theirs left, story-share groups side-aligned. Card geometry and share copy stay Send craft v1.5. Center activity log is out.
- [`dm-thread-header-density-lock-v1.md`](dm-thread-header-density-lock-v1.md) — DM thread peer chrome is one sticky row: back, avatar 32, display name only. Handle and the stacked name+handle hero are out. Companion to the message-format lock; does not reopen body or composer.
- [`dm-vs-group-membership-lock-v1.md`](dm-vs-group-membership-lock-v1.md) — v1.1. 1:1 stays two people. A multi-party DM starts only from a fresh Messages compose. Cap 16, shown as N/16. The action is Chat. Does not reopen header density or the composer.
- [`dm-thread-immersive-real-estate-lock-v1.md`](dm-thread-immersive-real-estate-lock-v1.md) — On a DM thread, hide the Social shell header and the phone tab dock. Peer row, message rhythm, and composer stay. Inbox keeps chrome. Supersedes the density lock’s host only.
- [`dm-compose-immersive-ia-lock-v1.md`](dm-compose-immersive-ia-lock-v1.md) — Split like IG. New message is 1:1 plus one Group chat entry. New group chat is a fresh multi-party DM, cap 16. Both compose routes hide the Social shell and phone dock. Group chat is a group DM, not group pages.
- [`dm-voice-note-lock-v1.md`](dm-voice-note-lock-v1.md) — DM thread composer only. Camera is always far-right (library/attach). Mic, when shipped, is an audio voice note left of the camera, not speech-to-text. Sticker stays out.
- [`stories-home-rail-fb-card-lock-v1.md`](stories-home-rail-fb-card-lock-v1.md) — Social Home tall story cards: story-media cover, top-left avatar ring, Create story split plate. Bottom name gradient superseded for user cards by the identity lock.
- [`stories-home-rail-card-identity-lock-v1.md`](stories-home-rail-card-identity-lock-v1.md) — Home user story cards: top-left avatar and ring only. No bottom name, handle, or name scrim. Create story label stays.
- [`24frame-visual-register-rich-calm-lock-v1.md`](24frame-visual-register-rich-calm-lock-v1.md) — Rich calm v1.4 only. Supersedes v1.3. Video and photo are peer-grade, full-bleed media. Paint on the viewer and home rail. Geometry closed. Create-story shutter stays v1.5.
- [`create-story-photo-video-fb-layout-lock-v1.4.md`](create-story-photo-video-fb-layout-lock-v1.4.md) — superseded by v1.5 for camera-face chrome. Rectangular full-bleed viewfinder retained.
- [`create-story-photo-video-fb-layout-lock-v1.3.md`](create-story-photo-video-fb-layout-lock-v1.3.md) — media-path grammar retained. Superseded by v1.4 for the live viewfinder.
- [`shell-desktop-horizontal-gutter-lock-v2.md`](shell-desktop-horizontal-gutter-lock-v2.md) — desktop shell L = R = 32. Supersedes v1.
- [`shell-desktop-horizontal-gutter-lock-v1.md`](shell-desktop-horizontal-gutter-lock-v1.md) — superseded by v2. #661 shipped 32 / 44.
