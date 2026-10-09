# [GC][24Frame] LOCK — Social feed photo scale + tap immersive v1

**Date:** 2026-09-25 (CT)  
**Status:** **LOCKED** · Design Own→READY cite-only · Adam call 2026-09-25 · Design no PR · CoS routes Dev  
**Amended (founder 2026-10-05, H · Posts):** the feed still's min(70vh, 560) cap and its 4:5 / 16:9 buckets are retired on the post: the photo fills the column at its true shape, held between 1.91:1 and 4:5, radius 24 (edge to edge on phone). Tap-to-immersive and the immersive itself stay as locked here. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) §7.  
**Repo:** `docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md`  
**Box:** `/workspace/24frame-agg-ux/social-feed-photo-scale-immersive-lock-v1.md`  
**FAIL:** `/workspace/24frame-agg-ux/social-feed-photo-massive-caption-hard-adam-fail-2026-09-25.png` (feed photo massive · caption hard to find) · `/workspace/24frame-agg-ux/social-feed-photo-below-fold-adam-fail-2026-09-25.png` (actions/caption below fold)  
**IG grammar ref:** `/workspace/24frame-agg-ux/social-feed-photo-ig-caption-ref-2026-09-25.png` (photo sized so caption + actions read under media — **not** IG brand)  
**FB immersive grammar ref:** `/workspace/24frame-agg-ux/social-feed-photo-fb-immersive-sidebar-ref-2026-09-25.png` (tap → immersive media + caption/actions available — **not** FB brand clone / forced desktop sidebar)  
**Standing:** Immersive Social · Media Immersion · launch-great · rich-calm v1.4 · quiet redundant-chrome · spacing **8 / 16 / 24 / 48** · **no** drop shadows  
**Keeps:** `social-mobile-full-bleed-lock-v1.md` / full-bleed (width flush) · `social-home-post-actions-align-lock-v1.md` (40/24/gap-8 — **do not** reopen) · `social-post-share-sheet-ig-lock-v1.md` (Share sheet) · `social-video-mux-only-lock-v1.md`

---

## One lock

**Feed photo is capped so caption + actions stay findable under the media (IG feed proportion). Tap photo → fullscreen immersive; caption + Like / Comment / Share live at the bottom (FB immersive grammar on house light/dark stage).**

---

## A) Feed face (idle — not immersive)

| Token | Lock (one SoT) |
|-------|----------------|
| Width | **Keep** full-bleed: phone viewport L/R **0** · desktop feed-column edges (cite full-bleed) |
| Max height | **`min(70vh, 560)`** — hard cap on feed media box (photo **and** video face) |
| Fit | `object-fit: cover` inside capped box · centered · no letterbox grey bars on feed face |
| Portrait still | Tall stills crop to the cap — **does not** grow past **560** / **70vh** |
| Landscape | Width fill · height follows aspect **until** cap |
| Tap | Entire media face is hit → open immersive (§B) · cursor pointer · `aria-label` View photo / View video |
| Below media (same post) | Actions row → likes meta → caption — all **inset H 16** · must sit **immediately under** capped media (not pushed a viewport away). Current text+media stack: [`social-feed-text-media-caption-below-lock-v1.md`](social-feed-text-media-caption-below-lock-v1.md). [`social-feed-text-media-caption-above-lock-v1.md`](social-feed-text-media-caption-above-lock-v1.md) is superseded. |
| Caption feed | Username bold + caption `t-body` · visible without hunting under a massive face |
| Actions | Cite post-actions align — hit **40** · glyph **24** · gap **8** · idle `text-ink-2` |
| Video | Same cap `min(70vh, 560)`. In-feed frame is source width and height (`social-home-post-separation-lock-v1.md`). Not a 16:9 slot. When the cap binds, the frame narrows. It does not grow past the cap |

**FAIL:** Uncapped portrait that eats the fold so caption/actions are hard to find or below the fold (`*-massive-*` · `*-below-fold-*`).  
**PASS:** First fold shows media **and** a readable path to caption/actions (IG proportion · house tokens).

---

## B) Tap → fullscreen immersive

| Token | Lock (one SoT) |
|-------|----------------|
| Open | Tap feed media → one immersive overlay (phone + desktop) |
| Stage | Near-black **`#0A0A0B`** full viewport · media centered · **0** Social shell / tab dock on top |
| Media | `object-fit: contain` · max **100vw × 100vh** · true immersive presence (Media Immersion / rich-calm) |
| Close | **X** top-leading · hit **44×44** · glyph **22** light ink · first tap dismisses → return feed scroll position |
| Bottom dock | Safe-area pad · scrim gradient up from black (~40% → 0 over **120**) for type legibility — **no** drop shadow cards |
| Caption | At **bottom** above actions · `t-body` light · username medium · max **3** lines then truncate + more — house Geist |
| Actions | Like · Comment · Share — **same** geometry as feed (40/24/gap-8) · light ink on dark · liked = Sporty Blue |
| Comment | Opens the comments window (desktop) or the comment sheet (phone) for this post (cite Share lock: Comment ≠ Share). Amended 2026-10-09, [`social-comments-window-lock-v1.md`](social-comments-window-lock-v1.md) |
| Share | Opens existing Share sheet lock |
| Desktop | Same fullscreen immersive (not a required FB right-rail clone). Optional trailing caption column **OUT** v1 — bottom caption+actions is the one SoT |
| Desktop media vs dock (amended 2026-10-08) | Adam, in chat, on a video playing back: "on desktop, the icons are covering the player options at the bottom". On desktop (`md+`) the stage stacks: the media fills the stage above the dock, and the dock (caption, Like / Comment / Share) sits under it on the stage black, so the player bar (play, time, volume, PiP, fullscreen) is never under the dock. The phone is unchanged: the media full-bleed, the dock over its bottom on the scrim |
| Motion | Open fade **180ms** · **no** bounce |

**Stacking:** The stage portals to `document.body` at **`z-[45]`**. The comment thread mounts at the stage's root (host **`z-50`**), so it paints above the stage ✕ (z-30) and the dock (z-20); keys it handles are marked handled, so the stage leaves them alone (amended 2026-10-09, [`social-comments-window-lock-v1.md`](social-comments-window-lock-v1.md)). The Share sheet stays the existing body portal at **`z-[60]`**, above the stage. Do not raise the stage over either sheet.

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Uncapped feed media / “always full original height” | Adam massive FAIL |
| Soft keep both uncapped + capped | One SoT — cap |
| IG / FB brand chrome invent | Grammar only |
| Reopening action gap/hit sizes | Cite align lock |
| Replacing full-bleed width with gutters | Width bleed stays · height caps |
| Desktop-only FB sidebar as required host | Bottom caption+actions one SoT |
| Write-compose / Stories / #681 | Separate |
| Design PR | CoS seeds · Dev ships |

---

## Must-fix

1. Feed media max-height **`min(70vh, 560)`** · cover · full-bleed width kept.  
2. Caption + actions readable under media (not lost under massive face).  
3. Tap media → fullscreen immersive contain.  
4. Immersive bottom: caption + Like / Comment / Share.  
5. X dismisses · Share/Comment cite existing locks.

---

## Done-when

1. Adam glance: feed photo smaller · caption findable vs IG ref proportion.  
2. Tap → immersive · caption bottom · like/comment/share work.  
3. Tip cites this lock · Design no PR · CoS CLEAR.

**Ship:** Design Own→READY · CoS routes Dev.
