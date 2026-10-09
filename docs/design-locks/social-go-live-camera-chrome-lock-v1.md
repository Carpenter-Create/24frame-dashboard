# [GC][24Frame] LOCK — Social Go live camera chrome v1

**Date:** 2026-10-01
**Status:** **LOCKED** · Adam PASS
**Surface:** `/social/live` camera face
**Amended 2026-10-08:** §Desktop frame (twice more: Full fills the window; then the shapes, 16:9 · 9:16), §Review, §Posted clip and §Camera picker below (Adam, in chat). The camera face above is unchanged, except that on a computer the picker takes flip's place.

**Amended 2026-10-08 (create matches the fan):** [`social-create-match-fan-lock-v1.md`](social-create-match-fan-lock-v1.md) (Adam, "Match the fan"; the label, 2026-10-09: "Live / Not record", everywhere). The header reads "Live" (Adam, 2026-10-09, asked whether it should stay "Go live": first "Record", then "Actually / Live / Not record", everywhere). This supersedes "Header | Go live" and the OUT on renaming below.
## One lock

The Go live camera has no duration hint over the viewfinder. Header, flip, record, and exit stay.

## Concrete

| Control | Lock |
|---------|------|
| Header | Go live |
| Exit | Leading X. Returns to the opener |
| Flip | Trailing camera flip. Preview only. On a computer, the camera picker takes this place (§Camera picker) |
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
| Camera | A computer asks for 16:9 HD (1920 × 1080, ideal: the nearest mode the camera has); on 9:16, for up to 4K (amended below). The phone asks for nothing, as before |
| Recording | Always the switch's shape. A 16:9 camera records as it is (1080p: 1920 × 1080, the standard landscape upload); a camera of any other shape is cut to the centre 16:9 (4:3 640 × 480 → 640 × 360). 9:16 is the centre cut (1080p: 606 × 1080; 4K: 1080 × 1920, amended below). No upscale |
| Preview = clip | Each stage covers with the camera; its shape is the clip's, so the frame shown is the frame recorded |
| Copy | "16:9", "9:16", "Aspect ratio" (replacing "Full", "Reel", "Camera frame") |

**Amended 2026-10-08 (true full-HD vertical).** Asked whether 9:16 clips should be stretched to 1080 × 1920, the founder asked "what's the best product decision and professional thing?". The answer given: never stretch (it adds no detail and costs upload, storage and bandwidth); instead ask the camera for more and draw down. Then:

> build the upgrade

| Token | Lock |
|-------|------|
| Standard sizes | 16:9 records at most 1920 × 1080; 9:16 at most 1080 × 1920 |
| 9:16 camera | A computer asks for up to 4K (3840 × 2160) at 30 fps, ideal, since the 9:16 cut keeps only the camera's height. 16:9 keeps the HD ask |
| Drawn down, never up | When the centre cut has at least the standard's height, it is drawn at the standard size (4K → exactly 1080 × 1920; a 4K camera ignoring the 16:9 ask → 1920 × 1080). Otherwise the clip keeps the camera's own pixels (1080p → 606 × 1080; 1440p → 810 × 1440). High-quality scaling |
| Switching | A frame switch asks the camera again for that frame's size: the camera reopens through the one tracked open (the switch, picker, flip and record wait while it opens) |
| Phone | Unchanged: the phone's own vertical frame |

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

## Camera picker (Adam, 2026-10-08)

The founder's Mac camera read 1280 × 720 (its most): the app asks for 1920 × 1080, and a camera gives what it has. A sharper camera (an iPhone through Continuity Camera, a USB webcam) is the remedy, and the browser opens only its default. Proposed in chat: "add a small camera picker to Go live, listing the built-in camera, your iPhone and any external camera". Then:

> yes, build the camera picker

| Token | Lock |
|-------|------|
| Where | Computer (`md+`) only: the trailing control of the top bar, where flip sits on the phone (a computer has no back camera to flip to). The same round 40 band-ink 12% button, the 20 bold video-camera glyph, the accessible name "Camera". Phone unchanged: flip |
| Menu | The house menu (MenuSurface: radius 12, hairline, surface, 44 rows), right-aligned under the button. One row per camera, by the device's own name (as the browser reports it, without the USB id Chrome appends); "Camera 1", "Camera 2" if the browser gives no name. Names wrap, never truncate. The current camera carries the 20 check at the row's end (a radio group) |
| Current | The camera actually streaming, read from the open track, not the one asked for |
| When | Preview only, as flip: disabled while recording and in review, and until the browser lists the cameras (after camera access) |
| Choosing | Opens that camera at once, still asked for 16:9 HD. If it cannot open, the last camera returns (never the default) and it is not remembered |
| One open at a time | Every camera open (the first, the reopen after Record again, a pick, a flip) is the one pending open: Record waits on it, and the picker, flip, and record button are disabled until it settles. Only the latest open stays; any earlier one still opening is stopped |
| Remembered | On this browser only (local storage, by id and name). The next Go live opens it; found by name if the browser has issued new ids; if it is not here (an iPhone out of reach), the default camera opens, with no message |
| Live list | A camera that arrives (an iPhone in reach, a webcam plugged in) joins the list while the camera is open |
| Copy | Existing only: "Camera", the Feed composer's shipped camera label, names the button and the "Camera 1" fallback. Device names are the hardware's own, shown as the browser gives them; 24Frame names no vendor |
