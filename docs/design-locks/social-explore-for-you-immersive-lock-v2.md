# [GC][24Frame] LOCK — Explore For You immersive v2

**Date:** 2026-09-26 (CT)  
**Status:** **LOCKED** · Adam LOCK Explore v2 2026-09-26 · **video-only** fold 2026-09-26 · **Stories-class full-bleed** amend 2026-09-26 · **mute control** amend 2026-09-26 · **mute persistence** amend 2026-09-28 (Adam CLEAR · B2 unmute leak) · **desktop header + Exit** amend 2026-09-29 (Adam LOCK AMEND) · **desktop portrait player** amend 2026-09-29 (Adam LOCK) · Design Own→READY · Design no PR · CoS CLEAR Dev after READY  
**Repo:** `docs/design-locks/social-explore-for-you-immersive-lock-v2.md`  
**Box:** `/workspace/24frame-agg-ux/social-explore-for-you-immersive-lock-v2.md`  
**Supersedes:** `social-explore-discovery-lock-v1.md` (IG grid) · **#693 DRAFT wrong shape** — do not invent on grid; ship from this v2  
**Superseded in part 2026-10-04** by [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) (Adam, "Yes, everywhere"): the desktop header row is the brand mark, a hairline, and the workspace lanes as plain words with an ink underline — no sliding row, no track, no thumb (§A Social shell, §A2 Column). The Exit is a muted **34** chip (radius 10, 14 X, "Exit" 13 / 500 ink), not a filled 44 chip; from `md` to `lg` its X-only form is a 34 box (§A2 Exit). The stage, the portrait player, phone Explore, and every other rule here stay.  
**Standing:** Immersive Social · **Media Immersion Doctrine** (Adam, house-wide) — media immersion only, never a thin or cheap card on a website page · soft / flat / pasted / framed card = **FAIL before glance** · launch-great · rich-calm v1.4 · quiet redundant-chrome · spacing **8 / 16 / 24 / 48** · **no** drop shadows · Geist · Sporty Blue `#1769FF` · mobile never-truncate  
**Scope:** `/social` **Explore** only  
**Cites:** `social-video-mux-only-lock-v1.md` · `social-home-post-actions-align-lock-v1.md` (40/24/gap-8) · `stories-viewer-mute-control-lock-v1.md` (mute **behavior**) · `social-post-share-sheet-ig-lock-v1.md` · photo-scale immersive stage tokens (dark stage / scrim) for chrome grammar only — **not** Home feed post face navigation

---

## One lock

**Explore default = TikTok-style vertical immersive For You. Full-screen video-only discovery · vertical swipe · people / keywords / hashtags discovery. Stay in immersive media forever on open — NEVER navigate to Home feed post face. No photos in the vertical For You feed (Adam LOCK 2026-09-26).**

---

## A) For You host

| Token | Lock (one SoT) |
|-------|----------------|
| Default | Explore opens **For You** vertical immersive stream |
| Stage | **Phone:** Media IS the canvas · full-bleed edge-to-edge **`object-fit: cover`** · near-black **`#0A0A0B`** · **Media Immersion** (not a grid, not a paper card, not a framed letterbox). **Desktop `md+`:** that same stage fills the column under the header. The player inside it is the centered portrait frame in §A2, not a cover-fill of the wide column |
| Fit | **Phone:** Active item **`object-fit: cover`** · fills the viewport stage. **Desktop `md+`:** **`object-fit: contain`** inside the §A2 portrait player |
| Swipe | Vertical snap · one item per viewport · next/prev For You |
| Video | Mux-only play surface · autoplay when active · pause when off-screen · cite Mux-only |
| First visual | **First frame** of the clip (Adam) · public Mux thumbnail `time=0` · signed thumbnail time is the JWT claim `time` `0` · not Mux's default mid-clip still |
| Media kinds | **Video only** in For You / discovery streams · **photos OUT** of vertical Explore feed |
| Social shell | **Phone:** Social header **OUT** · stage is viewport-fixed · tab dock may overlay the bottom of the media. **Desktop `md+`:** house header (logo + Layer 1 sliding workspace row; **superseded 2026-10-04:** brand mark, a hairline, and the workspace lanes — [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1) sits **above** the media. Stage fills that column. The player is §A2. Labeled **Exit** is a header chip, not a bare text link. It leaves Explore (prior in-app route, or Social home). Header search stays. Waffle stays hidden. **Both:** **surface dest-rail card OUT** · chrome overlays only (actions / caption / discover) · **0** white page well · **0** Home-feed post chrome |
| Fail | Soft grid of thumbs · FB mosaic · dumping user onto Home post unit · photo tiles in For You |

**FAIL:** IG Explore grid as primary (#693 / v1) · photos in vertical Explore.  
**PASS:** Full-screen vertical **video** · app immersion · swipe For You. Phone stays cover. Desktop shows the whole vertical inside a portrait frame.

---

## A2) Desktop player (`md+`) — portrait frame

**Amend 2026-09-29.** Phone rows in §A stay. This section does not move the phone stage, phone `object-fit`, the phone dock, or phone header visibility.

| Token | Lock (one SoT) |
|-------|----------------|
| Column | The stage still sits **below** the house header. Header stays: logo, Layer 1 slider (Home · Aggregation · Social · Education per [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md)), Exit (**superseded 2026-10-04:** brand mark, a hairline, the workspace lanes, then the muted 34 Exit — [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1). Not a fullscreen trap. Do not hide the header on desktop |
| Player | Centered **9:16** box in that column. Height fits the column. Width is `9/16` of that height, capped by the column width. Black gutters left and right are the stage **`#0A0A0B`**. No new color token |
| Vertical | The whole portrait picture is visible. **`object-fit: contain`** inside the player. Cover-cropping a vertical into the wide column is **FAIL** |
| Landscape | Stays landscape **inside** the player. Black bars above and below, same stage color. Do not stretch. Do not crop the landscape into the portrait frame |
| Caption | Sits on the portrait box. Phone caption geometry stays |
| Rail | Trailing rail stays. Phone dock clearance stays |
| Exit | Label **Exit** (`SOCIAL.explore.exit`). A filled header chip (44 hit) (**superseded 2026-10-04:** a muted 34 chip, radius 10, 14 X, "Exit" 13 / 500 ink; the `md` to `lg` X-only form is a 34 box — [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §1), with an X, not a bare text link beside search. Href is Social home (`/social`). A same-origin referrer whose path is not Explore uses history. No open redirect. Header search stays. **Amended 2026-10-04** ([`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) §1, header width): from `md` to `lg` the chip shows only its X (accessible name stays Exit) and the header search icon steps out; from `lg` both return |
| Phone | Do not apply this box, this contain fit, or Exit below `md` |

---

## B) Chrome on the immersive face (stay in media)

| Token | Lock (one SoT) |
|-------|----------------|
| Open / tap | **Stay in immersive** · deepen chrome or play/pause · **NEVER** route to Home feed post face / caption-above feed unit |
| Actions | Mute · Like · Comment · Share — geometry cite post-actions (40/24/gap-8) · TikTok-class **trailing** rail on the media · liked = Sporty Blue · light ink on dark |
| Caption / meta | Bottom-leading on media · scrim (~40%→0 over **120**) · username + caption · house Geist · never-truncate by stacking (mobile gospel) |
| Comment | Sheet / thread **over** immersive · dismiss returns to same For You item · does **not** leave Explore for Home |
| Share | Existing Share sheet lock · over immersive |
| Author | Tap avatar/name → profile (allowed leave) · media open itself does **not** become Home feed |

---

## B2) Mute — top of the trailing rail

**Behavior cite:** `docs/design-locks/stories-viewer-mute-control-lock-v1.md` (control presence / icons / force-mute — **not** Explore item-change mute reset).  
**Amend 2026-09-28:** Adam CLEAR — Explore mute **session sticky** after unmute (B2 unmute leak). Stories lock “reset on item change” does **not** override this Explore preference.  
**Placement is Explore, not Stories.** The control lives on the For You trailing rail (`data-social-explore-mute`), above Like. It does **not** move into the Stories header, and it is not a second speaker family.

| Token | Lock (one SoT) |
|-------|----------------|
| Default | Autoplay **muted** |
| Placement | **Top of the trailing action rail**, above Like |
| Host | `data-social-explore-mute` |
| Labels | `SOCIAL.explore.mute` / `SOCIAL.explore.unmute` · words **Mute** / **Unmute** · not the Stories string keys |
| Icons | Phosphor **speaker-slash** (muted) / **speaker-high** (sound) · size **20** |
| Hit | **40×40** · reuse the Stories mute hit and the post-action hit (`size-10`) |
| Gap | Rail gap stays **8** · do not redesign the column to insert this control |
| Presence | Visible and tappable for the **whole** active video item, muted or unmuted |
| Empty `audioTracks` | Do **not** treat empty or missing `audioTracks` as no-audio · do **not** hide the control |
| Item change / **mute persistence** | **Session sticky** preference on the Explore For You host: once the user turns audio **ON** (unmute), **stay unmuted** for **subsequent** Explore videos until they turn audio **OFF**. Do **not** reset to muted on every item change when preference is ON. Cold session / first paint still **default muted** (autoplay). Durable cookie/localStorage **not** required unless a house mute SoT already persists — session sticky is enough. Control stays mounted. |
| B2 unmute leak (FAIL) | Unmute on clip A → swipe to clip B → audio OFF again / user must unmute every clip = **FAIL** |
| Unmute | Tap passes sound through to the player · the clip is heard when it has audio · sets session preference **ON** |
| Mute (user) | Tap sets session preference **OFF** · subsequent clips start muted until user unmutes again |
| Force-mute | Unmuted autoplay blocked (`NotAllowedError`) → force muted **for that play attempt** and keep playing if muted play is allowed · control remains the tappable slash · **do not** clear the session unmuted preference unless the user taps Mute |
| Media tap | Play / pause only · **not** mute |

---

## C) Discovery (people / keywords / hashtags)

| Token | Lock (one SoT) |
|-------|----------------|
| Entry | Search / discover is overlay chrome on the media · inset from safe edges · quiet · **not** a persistent white slab |
| Results | People · keywords · hashtags — selecting one filters or starts a **vertical immersive** stream of matching **video** |
| Shape | Results stay **immersive video** (same For You host) · **not** a Home feed list · **not** the superseded IG grid as primary · **no** photo results in this stream |
| Clear | Returns to default For You |

---

## D) Photos — LOCKED OUT of vertical Explore

**Adam LOCK 2026-09-26:** Explore v2 For You / discovery vertical feed = **video-only**. **No photos** intercalated in the vertical stream.

| Token | Lock |
|-------|------|
| For You | Video only · Mux |
| Discovery streams | Video only (people / keywords / hashtags filters) |
| Photos | Stay on Home / Profile / Create — **not** Explore vertical |
| Rejected | Photo intercalation · still grids · photo tiles in For You |

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| IG-class discovery grid as Explore primary | Superseded · #693 wrong shape |
| Navigate open → Home feed post face | Adam: stay in immersive media |
| Caption-above Home stack inside Explore open | Home grammar for Home · Explore = vertical immersive |
| FB collage / mosaic | Out |
| Inventing on grid while v2 ships | Do not · supersede via this lock |
| Photos in vertical For You / discovery | Adam LOCK video-only |
| Phone framed letterbox | Phone media is the canvas · cover, edge to edge. Desktop landscape letterbox inside the portrait player is §A2 |
| Persistent search slab | Discover chrome overlays the media |
| Social header on phone For You | Phone stays immersive · headerless · dock overlays the media |
| Desktop For You with no header above the media, or no Exit | Adam 2026-09-29 · desktop is not a viewport trap |
| Desktop cover-crop of a vertical into the wide column | §A2 · portrait frame · contain |
| Desktop landscape stretched or cropped into the portrait player | §A2 · letterbox inside the player |
| Bare text Exit | Exit is a tappable chip. Label stays Exit |
| Exit, slider, or waffle on phone Explore | Phone face stays immersive |
| White page well | The page canvas is the media, not paper around a card |
| Surface dest-rail card on For You | A rounded surface card on the video is a website card · Media Immersion FAIL |
| Soft / flat / pasted / framed card | Media Immersion Doctrine · FAIL before glance |
| Design PR | CoS seeds · Dev ships after CLEAR |
| Media-tap mute | Media tap is play / pause · mute is the rail control |
| New speaker family / dock | Reuse Phosphor speaker-slash / speaker-high on the existing rail |
| Volume slider | Out |
| Rail geometry redesign | Insert mute above Like · hit 40 · gap 8 stays · do not redraw the column |
| Reset mute on every item when user unmuted | B2 unmute leak · Adam CLEAR 2026-09-28 — session sticky ON until user mutes |

---

## Must-fix

1. Explore default = vertical full-screen For You · vertical swipe.  
2. Open/tap stays in immersive media — never Home feed post face.  
3. Discovery (people / keywords / hashtags) stays immersive **video** stream.  
4. Mux-only video. Phone Media Immersion cover stage. Desktop portrait player contains the picture (§A2).  
5. Vertical Explore = **video-only** · photos OUT (§D).  
6. v1 grid / #693 superseded.  
7. Media is the canvas. Phone For You keeps the header out, the stage viewport-fixed, and `object-fit: cover`. Desktop For You puts the house header above the media, a centered portrait player in that column, and a labeled Exit chip. The surface dest-rail card is out. Search overlays the media. Header search stays. Tab dock may overlay the bottom on phone. Phone has no framed letterbox. No white page well. Soft / flat / pasted / framed card fails before glance.  
8. Mute sits at the **top** of the trailing rail, above Like. It stays visible and tappable for the whole active video. Autoplay starts muted on cold session. Empty `audioTracks` do not remove it. Once user unmutes, **session sticky** — stay unmuted across subsequent Explore videos until user mutes. §B2.

---

## Done-when

1. Tip cites this v2 lock · Adam glance: TikTok-class video For You · not grid · no photos in stream.  
2. Design Own→READY · CoS CLEAR Dev · #693 reshaped or replaced to this lock.  
3. Active For You video shows mute above Like. Tap toggles. Unmute hears audio when the clip has audio. The control does not flash off. Cold session starts muted. Unmute then swipe → next clips stay unmuted until user mutes (no per-clip unmute tax).  
4. Desktop `md+`: a vertical plays inside a centered portrait frame with black gutters. A landscape letterboxes inside that frame. Exit is a chip labeled Exit. Phone Explore is unchanged.

**Ship:** Design Own→READY · CoS routes Dev.
