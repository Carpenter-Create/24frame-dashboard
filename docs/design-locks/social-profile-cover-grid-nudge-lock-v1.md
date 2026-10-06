# [GC][24Frame] LOCK — Social profile cover editor · thirds grid + nudge pad v1

**Date:** 2026-10-06 (CT)  
**Status:** Adam product ask, 2026-10-06. Stage confirmed and the grid + nudge build authorized in chat ("Stage confirmed — build grid and nudge pad first. leave AI option off for now."). **Draft until founder PASS** on the open checkpoints below (copy is one).  
**Amends:** [`social-profile-stage-lock-v1.md`](social-profile-stage-lock-v1.md), cover editor only. Its Editor section gains the grid and the pad. Two of its OUT lines narrow: the editor copy now includes the pad's label and button names, and the grid paints over the photo along with the phone outline. Controls still never paint over the photo.  
**Entity:** Global Content / 24Frame only

---

## Founder words (verbatim, 2026-10-06)

> Grid lines while repositioning: light rule overlay (rule-of-thirds or quiet 3×3) over the cover crop only; vanish on Cancel/Save. Must not fight the photo (low-contrast white/black at ~20–30% opacity).

> Nudge: tiny discrete steps (arrow pad and/or keyboard arrows) so users can fine-tune without dragging. One tap ≈ a few pixels of focal offset; hold-repeat OK. Clamp to existing crop bounds (no empty letterbox). Phone: large enough hit targets; no truncate; stack vertically if needed (house gospel).

> Stage confirmed — build grid and nudge pad first. leave AI option off for now.

**Reference (Adam, 2026-10-06):** a LinkedIn mobile crop screen. It shows an even 3×3 grid over the crop only, visible for the whole edit. Its small steps are − / + on zoom; it has no position arrows.

## Grid

| Item | Lock |
|---|---|
| Shape | Rule of thirds over the whole 16:7 frame: vertical lines at 1/3 and 2/3 of the width, horizontal lines at 1/3 and 2/3 of the height. Not over the phone-safe region only, and not over the image box. |
| Space | Frame space, like the Phone view outline: `COVER_GRID_COLUMNS` / `COVER_GRID_ROWS` in `src/lib/social-profile-cover-frame.ts`, placed once at module scope through `coverRegionStyle`. No zoom or focus input, so the lines stay put while the image moves. |
| Line | 1px `--band-ink` at 30% (border) beside a 1px `--band` hairline at 20% (outline), so each line reads on bright and dark photos. Tokens only. No dimming, fills or shadows. |
| Build | Two boxes in the surface's one grid cell, in flow and never positioned, `pointer-events-none`: the middle column band (`border-x`) and the middle row band (`border-y`). The outline on the frame's own edges falls outside the cell and is clipped. The focus ring keeps painting (G10 carried). |
| Order | Preview → grid → Phone view outline, so the outline and its label sit on top. |
| When | Only while the editor is open, from the first frame, including while the original decodes. Gone on Cancel, Save, Escape and a hidden screen (it lives inside the editor surface). |

## Nudge pad

| Item | Lock |
|---|---|
| Place | The owner trail under the hero, between Zoom and Cancel / Save. Never over the photo. |
| Shape | Visible label **"Nudge"**, then one row of four 44 circles: ← ↑ ↓ → (`caret-left`, `caret-up`, `caret-down`, `caret-right`, 20). Hairline border on `--surface`, `--ink` glyph. The row wraps under the label rather than truncate; at 320 it fits on one line. |
| Names | Each button carries its name as `aria-label` and `title`: **"Move image left"**, **"Move image up"**, **"Move image down"**, **"Move image right"** (`SOCIAL.profile.coverNudgeLabels`). The group is labelled by the visible "Nudge". |
| Step | One tap is exactly its arrow key's step: 8 band px (`COVER_KEY_NUDGE_PX`), measured on the drag surface. An arrow moves the image that way, as a drag or arrow key does. Applied through `changeFocus`, so a drag held on the surface re-anchors at it. |
| Hold | One step on press, then a repeat after 350 ms every 70 ms (`COVER_NUDGE_REPEAT_DELAY_MS`, `COVER_NUDGE_REPEAT_MS`). Release, cancel or leaving the button stops it. It also stops when the image reaches that edge, Save starts or the editor closes. |
| Clamp | `moveCoverFocus` clamps to the original, so no nudge leaves an empty edge. An arrow disables at its edge, and on an axis with no slack at this zoom (`coverNudgeBlocked`, the crop view's slack as the drag hint uses). |
| Disabled | While Save runs, before the original decodes, and per arrow at its edge. Disabled at 60%. |
| Keyboard | Enter / Space on a button: one step (a click with no press before it). A click that follows a pointer press does not step again. The arrow keys on the drag surface are unchanged (8, Shift × 4, OS key repeat). |

## OUT

- AI framing suggestion (founder: off for now).
- − / + zoom buttons beside the slider (offered, not picked).
- Rotate, aspect ratio, a full-screen crop sheet, a zoom readout.
- A grid on the idle hero or outside the frame; dimming outside any line.
- Controls painted over the photo.
- New crop aspect, zoom range or upscale cap; Settings; SQL or RLS.

## Gates

- **N1:** the grid's lines sit at thirds of the 16:7 frame and are frame space (unit: regions and their margins at every editor width).
- **N2:** the grid boxes are in the surface, after the preview and before the outline, in flow, unpositioned, `pointer-events-none`, token colours only, and nowhere outside the editor surface.
- **N3:** a pad step equals its arrow key's step; each arrow moves the preview its way.
- **N4:** `coverNudgeBlocked` blocks an arrow at its edge and on an axis with no slack. A held nudge from the centre reaches the edge for 6 images × 9 widths × 2 zooms × 4 directions, and the saved framing stays inside the original.
- **N5:** the pad sits between Zoom and Cancel / Save, buttons are 44 circles, and the row wraps rather than truncates.
- **N6:** a click after a press never steps twice; a hold stops on release, at the edge, on Save and on close.
- **N7 (Chromium):** the grid lines land at thirds of the frame; the pad's targets are 44×44 with no sideways scroll at 320 and 390; a tap moves the preview; a held arrow repeats and stops at the edge with the arrow disabled; Cancel removes the grid and the pad.
- **N8:** no new eslint warnings.

## Founder checkpoints left open

- **Copy:** "Nudge" and "Move image left / up / down / right". "image" matches the editor hint ("Drag or use arrow keys to reposition image").
- **Grid line:** the paired light 30% rule + dark 20% hairline (built). LinkedIn draws one light line at about 40–50% white, which disappears on a bright photo.
- **Step size:** 8 band px, the arrow key's step (built). 4 is the finer option; it would change the arrow keys too, or split the two.
- **− / + zoom buttons:** not built.
