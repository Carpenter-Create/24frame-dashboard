# [GC][24Frame] LOCK — Social profile cover editor · thirds grid, arrow pad, zoom − / + v1

**Date:** 2026-10-06 (CT)  
**Status:** Adam product ask, 2026-10-06. Stage confirmed and the build authorized in chat ("Stage confirmed — build grid and nudge pad first. leave AI option off for now."), then reshaped to the LinkedIn crop screen ("make it like this") with icon-only steps ("don't say the word "nudge." the icons should speak for themselves"). **Draft until founder PASS** on the open checkpoints below.  
**Amends:** [`social-profile-stage-lock-v1.md`](social-profile-stage-lock-v1.md), cover editor only. Its Editor section gains the grid, the arrow pad and the zoom row's − / + and readout. Two of its OUT lines narrow: the editor copy adds the readout and the step buttons' accessible names (no new visible words), and the grid paints over the photo along with the phone outline. Controls still never paint over the photo.  
**Entity:** Global Content / 24Frame only

---

## Founder words (verbatim, 2026-10-06)

> Grid lines while repositioning: light rule overlay (rule-of-thirds or quiet 3×3) over the cover crop only; vanish on Cancel/Save. Must not fight the photo (low-contrast white/black at ~20–30% opacity).

> Nudge: tiny discrete steps (arrow pad and/or keyboard arrows) so users can fine-tune without dragging. One tap ≈ a few pixels of focal offset; hold-repeat OK. Clamp to existing crop bounds (no empty letterbox). Phone: large enough hit targets; no truncate; stack vertically if needed (house gospel).

> Stage confirmed — build grid and nudge pad first. leave AI option off for now.

> make it like this

> and don't say the word "nudge." the icons should speak for themselves

**Reference (Adam, 2026-10-06):** two LinkedIn mobile crop screens. Each shows an even 3×3 grid of single light lines over the crop only, visible for the whole edit, and a zoom row of − / ruler / + with a "1.5x" readout. The photo outside the crop shows dimmed; that part is not carried (see OUT).

## Grid

| Item | Lock |
|---|---|
| Shape | Rule of thirds over the whole 16:7 frame: vertical lines at 1/3 and 2/3 of the width, horizontal lines at 1/3 and 2/3 of the height. Not over the phone-safe region only, and not over the image box. |
| Space | Frame space, like the Phone view outline: `COVER_GRID_COLUMNS` / `COVER_GRID_ROWS` in `src/lib/social-profile-cover-frame.ts`, placed once at module scope through `coverRegionStyle`. No zoom or focus input, so the lines stay put while the image moves. |
| Line | One 1px `--band-ink` line at 60%, as the LinkedIn grid draws it. Tokens only. No dark pair, dimming, fills or shadows. This supersedes the brief's "~20–30%" (founder: "make it like this"). |
| Build | Two boxes in the surface's one grid cell, in flow and never positioned, `pointer-events-none`: the middle column band (`border-x`) and the middle row band (`border-y`). The focus ring keeps painting (G10 carried). |
| Order | Preview → grid → Phone view outline, so the outline and its label sit on top. |
| When | Only while the editor is open, from the first frame, including while the original decodes. Gone on Cancel, Save, Escape and a hidden screen (it lives inside the editor surface). |

## Zoom row

| Item | Lock |
|---|---|
| Order | "Zoom" (visible label, carried), the readout, then **−** slider **+**. |
| Readout | One decimal and a multiplication sign: **"1.5×"** (`SOCIAL.profile.coverZoomValue`, `coverZoomText`). Tabular figures in ink. Visual only (`aria-hidden`); the range speaks the same text as `aria-valuetext`. |
| − / + | Icon-only step buttons (`minus`, `plus`), the same 44 circles as the arrow pad. One tap is the - / + key's step (`COVER_ZOOM_KEY_STEP`, 0.1, centre held). Hold repeats like the arrows. − disables at zoom 1, + at this original's max (both disabled for an original too small to zoom). |
| Label | The range is labelled by the visible "Zoom" through `aria-labelledby`. The row is not a `<label>`, because it holds three controls. |
| Phone | The controls keep at least 14rem. On a narrow phone (320) they wrap under "Zoom 1.0×" instead of squeezing the slider; from 390 they share one line. Desktop: the slider is 240 wide. |

## Arrow pad

| Item | Lock |
|---|---|
| Place | The owner trail under the hero, between the zoom row and Cancel / Save. Never over the photo. |
| Shape | Four icon-only 44 circles, right-aligned: ← ↑ ↓ → (`caret-left`, `caret-up`, `caret-down`, `caret-right`, 20). Hairline border on `--surface`, `--ink` glyph. **No visible label** (founder: the icons speak for themselves). Wraps instead of clipping. |
| Names | Each button carries its name as `aria-label` and `title` only: "Move image left", "Move image up", "Move image down", "Move image right"; − and + are "Zoom out" and "Zoom in" (`SOCIAL.profile.coverStepLabels`). No editor copy uses the word "nudge". |
| Step | One tap is exactly its arrow key's step: 8 band px (`COVER_KEY_NUDGE_PX`), measured on the drag surface. An arrow moves the image that way, as a drag or arrow key does. Every step button goes through `coverStepFocus` and `changeFocus`, so a drag held on the surface re-anchors at it. |
| Hold | One step on press, then a repeat after 350 ms every 70 ms (`COVER_STEP_REPEAT_DELAY_MS`, `COVER_STEP_REPEAT_MS`). Release, cancel or leaving the button stops it. It also stops when the button can do no more (`coverStepBlocked`), when Save starts, or when the editor closes. |
| Clamp | `moveCoverFocus` clamps to the original, so no step leaves an empty edge. An arrow disables at its edge, and on an axis with no slack at this zoom (`coverNudgeBlocked`, the crop view's slack as the drag hint uses). |
| Disabled | While Save runs, before the original decodes, and per button when it can do no more. Disabled at 60%. |
| Keyboard | Enter / Space on a button: one step (a click with no press before it). A click that follows a pointer press does not step again. The keys on the drag surface are unchanged (arrows 8, Shift × 4; + / - zoom; OS key repeat). |

## OUT

- AI framing suggestion (founder: off for now).
- The photo shown dimmed outside the crop, as LinkedIn does. The Stage editor frames in place on the hero card; there is no room outside the card to show it without covering the trail and the page. A full-screen crop sheet would be a new editor, and the Facebook in-place chrome is locked.
- Rotate, aspect ratio, a dark full-screen sheet, the ruler-style slider.
- Any visible word on the arrow pad; the word "nudge" in any editor copy.
- A grid on the idle hero or outside the frame; dimming outside any line.
- Controls painted over the photo.
- New crop aspect, zoom range or upscale cap; Settings (the shared avatar crop is untouched); SQL or RLS.

## Gates

- **N1:** the grid's lines sit at thirds of the 16:7 frame and are frame space (unit: regions and their margins at every editor width).
- **N2:** the grid boxes are in the surface, after the preview and before the outline, in flow, unpositioned, `pointer-events-none`, one `band-ink/60` line, and nowhere outside the editor surface.
- **N3:** an arrow step equals its arrow key's step and moves the preview its way; − / + equal the - / + keys' step.
- **N4:** `coverStepBlocked` blocks an arrow at its edge and on an axis with no slack, − at zoom 1 and + at the max, including after float sums of 0.1. A held arrow from the centre reaches the edge for 6 images × 9 widths × 2 zooms × 4 directions, and the saved framing stays inside the original.
- **N5:** the zoom row reads Zoom → readout → − → slider → +; the arrow pad sits between it and Cancel / Save with no visible words; buttons are 44 circles; both rows wrap instead of clipping.
- **N6:** a click after a press never steps twice; a hold stops on release, when blocked, on Save and on close.
- **N7 (Chromium):** grid lines at thirds; every step button 44×44 with no sideways scroll at 320 and 390; no visible "Nudge"; an arrow tap moves the preview 8; a held arrow repeats and stops at the edge; + steps 0.1 and the readout follows; − disables at 1.0×; Cancel removes the grid and the controls.
- **N8:** no new eslint warnings.

## Founder checkpoints left open

- **Copy:** the readout "1.5×" (LinkedIn writes "1.5x"), and the accessible names "Move image left / up / down / right", "Zoom out", "Zoom in". "image" matches the editor hint ("Drag or use arrow keys to reposition image").
- **Grid line:** single `band-ink` line at 60%, measured off the LinkedIn screen. It reads on dark and mid photos and fades on a bright sky, as LinkedIn's does.
- **Step size:** 8 band px for arrows, 0.1 for − / +, the keyboard's steps.
- **Avatar crop:** LinkedIn's screen is its profile-photo crop. The shared avatar crop (`AccountAvatarCrop`, also in Settings) is unchanged here; a grid and − / + there would be a separate lock.
