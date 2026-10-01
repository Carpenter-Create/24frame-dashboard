# [GC][24Frame] LOCK — Social post Share sheet (IG-like) v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam: share icon does nothing · must work like IG · CoS Own→READY) · Design no PR  
**Repo:** `docs/design-locks/social-post-share-sheet-ig-lock-v1.md`  
**Box:** `/workspace/24frame-agg-ux/social-post-share-sheet-ig-lock-v1.md`  
**Refs:** `/workspace/24frame-agg-ux/ig-send-refs/02-share-sheet-grid.png` · `04-select-message-send.png` · `06-dm-story-card.png` (grammar)  
**Cite:** Immersive Social · launch-great · Coinbase calm (not parody) · Media Immersion  
**Related:** `stories-send-dm-craft-lock-v1.md` (Stories Send — separate entry) · `social-frame-ai-pin-lock-v1.md` (first grid cell opens 24Frame AI; not a recipient) · `dm-thread-message-format-lock-v1.md` · `dm-thread-immersive-real-estate-lock-v1.md` · `dm-compose-immersive-ia-lock-v1.md` · `house-overlay-dual-host-lock-v1.md` · `social-home-post-actions-align-lock-v1.md` (icon row only — **do not** reopen spacing)  
**Out:** #681 spacing · Design PR · invent repost cycle · Groups product

---

## One lock

Tap **Share** on feed/post actions → one **IG-like bottom sheet**: search people · suggested grid · **multi-select** with check · optional message · primary **Send** → lands in DM as a **post share card**. Secondary: **Copy link** · **Share to…** (system). Calm house paint (Sporty Blue checks/CTA only).

**Comment (separate surface):** Tap **Comment** on the same action row opens the **post comment thread** (not dead · not the Share sheet). Share lock does not own comment chrome.

---

## Open

| Token | Lock |
|-------|------|
| Trigger | Paper-plane / Share on post action row |
| Dead icon | **FAIL** |
| Host phone | Bottom sheet · top radius **16** · max **90vh** · scrim ink @ **40%** · **no** drop shadow |
| Host desktop | **One** centered/docked overlay · **same** sheet grammar (not a second pattern · not MenuSurface-only list) |
| Sheet fill | Near-black **`#181818`** (IG send family · match Stories Send calm dark) |
| Pad | H **16** · body scrolls |

---

## People · select · Send

| Token | Lock |
|-------|------|
| Search | Pill height **40** · placeholder **Search** |
| Create group | **OUT** v1 (no Groups invent) |
| Suggested | **3-col** grid · avatar **56** · name under · gap **16** |
| Select | **Multi-select** · Sporty Blue `#1769FF` check **20** on avatar · tap toggles · no further select past **16** |
| Message | Optional · pill **Write a message…** · height **40** · appears when ≥1 selected (same sheet morph · no second modal) |
| Send | Full-width pill height **48** · Sporty Blue · **Send** · enabled when ≥1 recipient · empty message OK |
| Success | Dismiss sheet · calm **Sent** confirmation (centered brief) · open/stay per existing DM routes — no invent |

---

## DM post share card

| Token | Lock |
|-------|------|
| What lands | DM to each selected recipient: **post share card** = media thumb/frame + author + caption snip |
| Video | Mux-only card / open (`social-video-mux-only-lock-v1.md`) |
| Bubble / thread | Follow `dm-thread-message-format-lock-v1.md` · immersive real-estate locks — side alignment · not centered soft share |
| Optional message | Above/with card as normal DM text if user wrote one |
| Group post | Recipient without the group row grant: **refuse that peer**. No message, no media keys, no Mux playback id. `can_access_group_content` must be true. Adam confirmed 2026-09-25. |

---

## Secondary row (v1 in / out)

| Action | v1 |
|--------|-----|
| **Copy link** | **IN** — copies post permalink · brief Copied confirm |
| **Share to…** | **IN** — OS / system share sheet |
| **Add to story** | **OUT** (repost cycle invent) |
| WhatsApp / Messages / Facebook branded rows | **OUT** (system **Share to…** covers external) |

---

## Explicit OUT

Dead Share · Comment opening Share · Add to story · branded WhatsApp row · Groups create · group-post card to a non-member · second modal after select · #681 gap reopen · Design PR

## Done-when

1. Share opens sheet · multi-select → Send → DM post card.  
2. Copy link · Share to… work.  
3. Comment opens comment thread (separate).  
4. No Design PR.

**Ship:** Design Own→READY · CoS → Dev · HOLD invent else.
