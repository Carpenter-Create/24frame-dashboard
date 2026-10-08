# [GC][24Frame] LOCK — Social Go live camera chrome v1

**Date:** 2026-10-01
**Status:** **LOCKED** · Adam PASS
**Surface:** `/social/live` camera face
**Amended 2026-10-08:** §Desktop frame, §Review and §Posted clip below (Adam, in chat). The camera face above is unchanged.

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
| Default | **Full**: the camera's own frame, as the device opens it. The stage takes the camera's aspect (from the stream), as wide as fits (92vw, 1280, or 90dvh at that aspect), the whole image shown (contain). What you see is what records |
| Switch | **Full · Reel**, a two-segment pill centred above the record button, on the camera's band wash; the current segment band-ink. Desktop only (`md+`), before recording only (hidden while recording and in review). A radio group named "Camera frame" |
| Reel | The 9:16 studio stage (420 × 746). The recording is the same 9:16 centre cut, drawn into a canvas and recorded (the camera's audio rides along), so the clip is the frame that was shown. No upscale: a 720p camera records 404 × 720 |
| Phone | Unchanged: the full-screen stage records the phone's own (portrait) frame. No switch |
| Copy | "Full", "Reel", "Camera frame" (new, founder to confirm) |

## Review (Adam, 2026-10-08)

> I don't like the caption box, record again button, and post video/posting button. I'd like the caption box to be more of a clear experience like IG, record again and post video both to use an icon, and "posting" to show a blue progress bar.

| Token | Lock |
|-------|------|
| Clip | Loops on its own under the caption, no native control bar; a tap pauses or plays. Sound where the browser allows, muted where it holds sound back |
| Caption | On the clip, not in a box: band-ink 17 / 500 type on a band wash that fades up from the bottom (85% → 45% → 0), placeholder band-ink at 70%. The dictate mic stays, tinted band-ink |
| Record again | A round 56 on the band wash, the 20 bold counter-clockwise arrow; the accessible name "Record again" |
| Post | A round 56 accent circle, the 20 bold up arrow; the accessible name "Post video" ("Posting…" while posting) |
| Posting | A blue (accent) progress bar across the panel above the two buttons: the upload's bytes, from a sliver to full. Both buttons and the caption are inert while posting |

## Posted clip (Adam, 2026-10-08)

> when the video posts, the video does not show until the page is refreshed.

Mux is still preparing a just-uploaded clip, so its player has nothing to draw. The poster's own feed card plays the clip from the device (the optimistic post's local file) until the next load brings the server card. Every post path gets this (the write composer too). Go live posts as the one Social author, the shell's identity ([`social-desktop-create-composer-lock-v1.md`](social-desktop-create-composer-lock-v1.md)), not "You".

