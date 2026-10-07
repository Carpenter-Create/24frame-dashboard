# [GC][24Frame] LOCK — Create story photo + video (FB stage) v1.5

**Date:** 2026-09-23 (CT)  
**Status:** **LOCKED** (Adam product · liberty v1.1 · camera A v1.2 · both Upload+Take v1.3 · rect viewfinder v1.4 · **Adam LOCKED scope ~6:08 PM CT — full Stories-camera grammar from IG reference shot**) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS re-routes Dev (#664 or follow-up)  
**Supersedes:** `create-story-photo-video-fb-layout-lock-v1.4.md` — expands Take/Record from viewfinder-only to **Stories-camera chrome grammar** (structure + geometry). v1.3 media paths and v1.4 OUT face-circle / IN rect full-bleed **retained**.  
**Scope:** Entry stage + Upload/Take paths + live Take/Record **camera face** (phone-first).  
**House register:** Geist · Sporty Blue `#1769FF` · Coinbase-calm · spacing **8 / 16 / 24 / 48** · **no drop shadows** · ink on camera face uses white / `#FAFAFB` over live feed (not IG brand colors, glyphs, or wordmarks)  
**Cites:** Adam IG Stories camera reference (CoS thread) · v1.3 · v1.4 · `#664` preview reject (face circle)

## One lock

1. **Stage** — Full-page FB-structure create at `/social/stories/new`: **Your story** rail + exactly two kind cards (photo · video). **No text story.**  
2. **Paths** — For photo **and** video: **Upload** (file pick) **and** **Take/Record** (live camera). Not upload-only. Not camera-only.  
3. **Camera face** — When Take or Record opens, replace the secondary face with an **Instagram-structure Stories camera**: rectangular **full-bleed** live viewfinder + chrome grammar below. **24Frame register only** — structure and geometry lock; **not** a pixel / brand clone of Instagram.

## Entry + URL

| Token | Lock |
|-------|------|
| URL | **`/social/stories/new`** |
| Close (stage) | → **`/social`** |
| Close (camera X) | → back to that kind’s secondary face (Upload + Take), **not** hard-exit to `/social` unless stage X |
| Forbidden | Small Dialog entry · third create URL |

Stage chrome / card geometry / liberty: same as v1.1–v1.4, except the fit below.

## Fit: tablet and short phone (founder 2026-10-07)

v1.1's desktop geometry (the ~320 rail beside two cards ~220 to ~280 wide, 24 apart, with the stage's 16 each side) needs 816 at the cards' floor, so from 768 to 935 the page scrolled sideways (168 at 768, 116 at 820, 36 at 900). On a 360 × 740 phone a 70vh floor on the stage (not in this lock) ran the page 10 past the window. Asked with a 768 compare sheet of three fits (A: the cards shrink below 220; B: the rail on top below 1024; C: the rail 240 below 1024), the founder chose:

> C: rail 240

| Item | Lock |
|---|---|
| Rail | **240** from 768 to 1023, **320** from 1024. Still the left **Your story** rail beside the stage (the v1.1 structure, hard lock) |
| Cards | Side by side from 768. Each shrinks from 280 toward its **220** floor when the stage is narrower than the pair: **236** at 768, **252** at 800, **262** at 820, **280** from 900. Height 420 and the 24 between them unchanged; both labels stay on one line |
| Stage | Fills what the rail leaves and may narrow below the cards' row, so the cards shrink instead of the page scrolling sideways. The pair is centred safely: if it ever cannot fit (a smaller browser text size moves the breakpoints, which are in rem, while the rail and the cards are in px), the row starts at the stage's edge and scrolls rather than covering the rail |
| Phone | The stage has no viewport floor: it fills the height under the stacked rail (**508** at 360 × 740, 612 at 390 × 844 as before), and the two stacked cards keep their 200 minimum. Where the rail and the two cards are taller than the window (320 × 640, 360 × 640: 40), the page scrolls, as before |
| From 1024 | Unchanged: the rail 320, the cards 280 × 420 |

Measured in headless Chromium (the real shell and create stage, the production build's CSS) at 320, 360, 390, 768, 800, 820, 900, 935, 1000, 1024, 1280, 1440 and 1920: no sideways scroll at any width, and no label clipped.

## Card set → secondary faces (hard) — from v1.3

**Stage (exactly two cards):**

| Order | Label | Opens |
|-------|-------|-------|
| 1 | **Create a photo story** | Photo secondary — **both** controls |
| 2 | **Create a video story** | Video secondary — **both** controls |

| Control | Behavior |
|---------|----------|
| **Take a photo** | Opens **camera face** (photo mode). Live `getUserMedia`. **Forbidden:** file picker under this label. |
| **Upload a photo** | OS / library file pick. Required. |
| **Take / Record a video** | Opens **camera face** (video mode). Live camera + mic. **Forbidden:** file picker under this label. |
| **Upload a video** | OS / library file pick. Required. |

Permission deny: house error on camera face; Upload remains on secondary face.

## Live viewfinder — from v1.4 (hard)

| Token | Lock |
|-------|------|
| Shape | Rectangular full-bleed live feed (cover) |
| OUT | Circular face guide · framing ring · oval mask · blue / Sporty Blue **progress arc around the subject** |
| Progress | Discrete chrome only (timer text, thin top/bottom bar, or shutter fill) — **never** a face-ring arc |
| Fill | Edge-to-edge in the camera face; letterbox only if forced → fill `#14171A` |

## Camera face chrome — Stories grammar (v1.5 ADD)

**Host:** Phone = full-screen push (safe-area respected). Desktop = same chrome grammar inside the create-stage **media pane** (full-bleed pane; do not invent a second product URL).

### Layout zones (phone-first, top → bottom)

| Zone | Geometry (lock) | Role |
|------|-----------------|------|
| **Top bar** | Height **48** content + safe-area top; horizontal inset **16** | Close · flash · settings |
| **Viewfinder** | Fills remaining between top bar and bottom stack; full bleed under chrome | Live camera |
| **Left tool rail** | Leading inset **16**; vertical stack centered on viewfinder mid-Y; item gap **16**; hit **44** | Embellishment tools (see IN/STUB/OUT) |
| **Bottom capture row** | Above mode rail; shutter optically centered; gallery leading · flip trailing; inset **16**; gap **24** | Shutter · gallery · flip |
| **Bottom mode rail** | Height **48**; labels body/sm; gap **24**; bottom safe-area | Mode labels |

Spacing scale only **8 / 16 / 24 / 48**. No drop shadows. Chrome glyphs: simple line icons, white / secondary on feed; active mode uses **Sporty Blue** underline or pill — not IG gradient rings as brand.

### Top bar — IN / STUB / OUT

| Control | v1 | Behavior |
|---------|----|----------|
| **X** (close) | **IN** | Dismiss camera face → kind secondary face (Upload + Take). |
| **Flash** | **IN** | Toggle torch / flash when device supports; if unsupported, hide control (do not show dead flash). |
| **Settings** (gear) | **OUT** | No music / advanced camera settings in v1. Do not draw. |

### Left tool rail — IN / STUB / OUT

Adam reference shows Aa · Boomerang · Layout · Effects (and cousins). **24Frame v1 ships no embellishment tools.**

| Control | v1 | Notes |
|---------|----|-------|
| **Aa** (text sticky) | **OUT** | Text-story kind already forbidden; overlay text deferred. Do not draw. |
| **Boomerang** | **OUT** | Do not draw. |
| **Layout** | **OUT** | Do not draw. |
| **Effects** / filters | **OUT** | Do not draw. |
| **Left rail column** | **OUT for v1** | Omit the rail entirely while every tool is OUT. When a future Adam lock sets a tool **IN**, place it on a leading rail at inset **16**, gap **16**, hit **44**. |

**Forbidden:** Drawing muted fake IG tools that no-op (looks broken). Omit ≠ stub-with-dead-hit.

### Bottom capture row — IN / STUB / OUT

| Control | v1 | Behavior |
|---------|----|----------|
| **Shutter** | **IN** | Center. Outer ring **72** diameter, stroke **4**, white; inner fill **56** white (photo) or **Sporty Blue** while recording (video). **Photo mode** (from photo story Take): **tap** captures still → review. **Video mode** (from video story Record): **tap or hold** starts/stops record per platform norm; show discrete timer; **no** face-circle progress. |
| **Gallery thumb** | **IN** | Leading. Last-roll thumb or house placeholder **48×48**, radius **8**. Tap → **Upload** file pick for that kind (same honest Upload path). |
| **Flip camera** | **IN** | Trailing. Toggle user / environment facing. Hide if only one camera. |

### Bottom mode rail — IN / STUB / OUT

Reference: **POST · STORY · REELS**. This surface is **Stories create only**.

| Label | v1 | Behavior |
|-------|----|----------|
| **STORY** | **IN** | Selected by default on camera face. Sporty Blue emphasis. Stays on this create-story camera. |
| **POST** | **OUT** | Do not navigate to feed composer. **Do not draw** for v1 (avoids dead mode). |
| **REELS** | **OUT** | Do not draw for v1. |

Rail shows a **single live mode label “STORY”** centered (or leading-group of one) so grammar reads as Stories camera without fake siblings. Future Adam lock may IN POST/REELS with real destinations.

## Phone vs desktop

| | Phone | Desktop |
|--|-------|---------|
| Camera host | Full-screen push | Full-bleed in create-stage media pane (shell may remain) |
| Chrome | Same zones + same IN/OUT map | Same; scale hits ≥ **44**; shutter **72** |
| Paths | Both Upload + Take | Both Upload + Take |
| Truncation | Never truncate labels | Never |

## Forbidden

- Text story card  
- Upload-only / camera-only product  
- Take/Record → file picker  
- Face circle / framing ring / progress arc on subject  
- Instagram brand (logo, glyph set, gradient brand rings as identity)  
- Dead STUB tools drawn as tappable no-ops (Aa / Boomerang / Layout / Effects / Settings / POST / REELS)  
- Design PR  
- Dev inventing chrome beyond this IN list before a later amend  

## Gates

**G1.** Entry `/social/stories/new`; stage close → `/social`.  
**G2.** Full create stage — no small centered entry modal.  
**G3.** Exactly two stage cards; zero text-story card.  
**G4–G7.** Both Upload + Take/Record for photo and video; labels match behavior; not upload-only; not camera-only.  
**G8.** Phone + desktop same path + camera grammar; never truncate.  
**G9.** 24Frame register (Geist · Sporty Blue · Coinbase-calm · no drop shadows · 8/16/24/48).  
**G10.** Rect full-bleed viewfinder — **no** face circle / ring / subject progress arc.  
**G11.** Record progress = discrete chrome only.  
**G12.** Camera face ships **IN** only: X · Flash (if supported) · Shutter · Gallery→Upload · Flip · STORY mode.  
**G13.** **OUT** (not drawn): Settings · Aa · Boomerang · Layout · Effects · POST · REELS · left rail while empty.  
**G14.** Gallery thumb opens Upload file pick (honest).  
**G15.** Camera X returns to kind secondary face.  
**G16.** Design no PR — CoS routes Dev to **v1.5**.  
**G17.** Fit (founder 2026-10-07): no sideways scroll from 320 to 1920; the rail 240 from 768 to 1023 and 320 from 1024; the cards side by side from 768 and never under 220; a 360 × 740 phone does not scroll past its two cards.

## Repo citation

CoS seeds: `docs/design-locks/create-story-photo-video-fb-layout-lock-v1.5.md`  
Box: `/workspace/24frame-agg-ux/create-story-photo-video-fb-layout-lock-v1.5.md`  
Prior: v1.4 superseded (viewfinder floor retained inside v1.5)
