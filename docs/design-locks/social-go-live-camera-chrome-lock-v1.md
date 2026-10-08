# [GC][24Frame] LOCK — Social Go live camera chrome v1

**Date:** 2026-10-01
**Status:** **LOCKED** · Adam PASS
**Surface:** `/social/live` camera face
**Amended 2026-10-08:** §Desktop frame (twice more: Full fills the window; then the shapes, 16:9 · 9:16), §Review and §Posted clip below (Adam, in chat). The camera face above is unchanged.

## One lock

The Go live camera has no duration hint over the viewfinder. Header, flip, record, and exit stay.

## Concrete

| Control | Lock |
|---------|------|
| Header | Go live |
| Exit | Leading X. Returns to the opener |
| Flip | Trailing camera flip. Preview only |
| Record | Centered record control. Starts and stops the clip |
| Overlay | No “Record up to 10 minutes, then post as a video.” No other bottom hint |

The 10:00 recording cap stays in the recorder. It is not painted on the camera face.

## Explicit OUT

A bottom caption over the live viewfinder · renaming Go live · moving or removing the record button, flip, or X

---

## Desktop frame (Adam, 2026-10-08)

> on computer, when I select to "go live," it opens a reel-sized camera. is it possible to open the camera, but default to the normal view that opens on the device (full width on computer) but provide a simple option/switch to do reel sized camera (on computer)?

Before this, the desktop stage was the 9:16 studio pane, but the clip recorded the camera's whole (landscape) frame: what was framed was not what posted.

| Token | Lock |
|-------|------|
| Default | **16:9** (amended twice below) |
| Switch | Two segments, **16:9 · 9:16** (amended below), a pill centred above the record button, on the camera's band wash; the current segment band-ink. Desktop only (`md+`), before recording only (hidden while recording and in review) |
| Reel | **9:16** (amended below). The recording is the 9:16 centre cut, drawn into a canvas and recorded (the camera's audio rides along), so the clip is the frame that was shown. No upscale: a 1080p camera records 606 × 1080 |
| Phone | Unchanged: the full-screen stage records the phone's own (portrait) frame. No switch |

**Amended 2026-10-08 (Full fills the window).** Adam, in chat, on the first Full (a card at the camera's aspect, centred on the dark page):

> shouldn't full camera on computer be full screen like zoom or something??

| Token | Lock |
|-------|------|
| Full stage | The whole window (the phone's full-screen stage at window size): no card, edge, radius, or dark page around it. The camera covers it; where the window and the camera differ in shape, the preview trims the overflow, as a video call does |
| Chrome | Unchanged and floating on the camera: X, "Go live", flip on top; the switch and record button at the bottom |
| Recording | The camera's whole frame (a 16:9 webcam records 16:9). The preview's trim is never cut from the clip |
| Review | The clip fills the window the same way |
| Not | The browser's own full-screen mode (the tab and the menu bar stay) |

**Amended 2026-10-08 (the shapes, by name).** Adam, in chat:

> instead of the language "Full" and "Reel" – use the aspect ratio

> It needs to be standard youtube video/landscape video dimensions

> and then vertical reel dimensions

> the camera should be that, look like that, and the aspect ratio options should say the aspect ratio instead of words

Before this, Full showed the window's shape (16:10 on most laptops) and recorded the camera's (640 × 480, 4:3, on a webcam a browser opens with no size asked); Reel was 420 wide at any height, so a short window showed it near square.

| Token | Lock |
|-------|------|
| Switch | **16:9 · 9:16**, the ratios, no words. The radio group is named "Aspect ratio" |
| 16:9 stage | Exactly 16:9, as large as the window allows (`min(100vw, 100dvh × 16/9)` wide), centred on the band, edge to edge on the long side: no edge or radius. Chrome floats on it as before |
| 9:16 stage | Exactly 9:16 at the studio's height (746, 90dvh cap), its width following; the studio's radius 16 and band-ink 20% edge |
| Camera | A computer asks for 16:9 HD (1920 × 1080, ideal: the nearest mode the camera has). The phone asks for nothing, as before |
| Recording | Always the switch's shape. A 16:9 camera records as it is (1080p: 1920 × 1080, the standard landscape upload); a camera of any other shape is cut to the centre 16:9 (4:3 640 × 480 → 640 × 360). 9:16 is the centre cut as before (1080p: 606 × 1080). No upscale |
| Preview = clip | Each stage covers with the camera; its shape is the clip's, so the frame shown is the frame recorded |
| Copy | "16:9", "9:16", "Aspect ratio" (replacing "Full", "Reel", "Camera frame") |

## Review (Adam, 2026-10-08)

> I don't like the caption box, record again button, and post video/posting button. I'd like the caption box to be more of a clear experience like IG, record again and post video both to use an icon, and "posting" to show a blue progress bar.

| Token | Lock |
|-------|------|
| Clip | Loops on its own under the caption, no native control bar; a tap pauses or plays. Sound where the browser allows, muted where it holds sound back |
| Caption | On the clip, not in a box: band-ink 17 / 500 type on a band wash that fades up from the bottom (85% → 45% → 0), placeholder band-ink at 70%. The dictate mic stays, tinted band-ink |
| Record again | A round 56 on the band wash, the 20 bold counter-clockwise arrow; the accessible name "Record again" |
| Post | A round 56 accent circle, the 20 bold up arrow; the accessible name "Post video" ("Posting…" while posting) |
| Posting | A blue (accent) progress bar across the panel above the two buttons: the upload's bytes, from a sliver to full. Both buttons and the caption are inert while posting: the dictate mic steps away, and the post carries the caption as it stood at Post |

## Posted clip (Adam, 2026-10-08)

> when the video posts, the video does not show until the page is refreshed.

Mux is still preparing a just-uploaded clip, so its player has nothing to draw. The poster's own feed card plays the clip from the device (the optimistic post's local file) until the next load brings the server card. Every post path gets this (the write composer too). Go live posts as the one Social author, the shell's identity ([`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md)), not "You".

