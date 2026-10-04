# [GC][24Frame] LOCK — Social profile header · LinkedIn proportions v1

**Date:** 2026-10-04 (CT)  
**Status:** **APPROVED** (founder, 2026-10-04) · **Header geometry SUPERSEDED** by [`social-profile-stage-lock-v1.md`](social-profile-stage-lock-v1.md) (founder pick "A · Stage", 2026-10-04)  
**Scope:** Profile head on `/social/profile` and `/social/u/[handle]`, plus its skeleton, save-hop and loading overlay, and the cover editor.  

> **Superseded in part.** The Stage lock replaces this lock's header geometry: the 4:1 band (One rule, Desktop, Phone, States), the 1784×446 output, the desktop card, the clamped avatar and its half overlap, decision 2 ("Edge to edge, flush" — the founder picked the Stage mockup, which shows an inset card), the visitor no-band rule, the name at t-heading below the cover, the stack order, and gates G1–G7. **Still in force:** decision 3 (keep the original) and the Editor rules on focus, pan, keys, the in-flow preview and focus ring, the kept original, Reposition, the compare-and-swap on the opened cover, Remove, the Zoom rules and the removed public note, and gates G8–G11 — now applied to the 16:7 frame with the phone-safe outline described in the Stage lock. In that frame the zoom numbers are the Stage lock's: window `min(iw, (16/7)·ih) / z`, upscale cap against the 2400 output, so the 1784 and 4:1 figures below are this lock's history.

**Entity:** Global Content / 24Frame only  
**Supersedes:**
- "Lock A" display sizes in `src/lib/social-profile-cover.ts` (phone 112, desktop 224, avatar 80, lip 40).
- "Design lock v1 — X profile" head geometry in `src/lib/social-chrome.ts` (80 disc, 2px ring).

**Keeps:**
- Lock A master 1784×446 (LinkedIn header SoT, Adam 2026-09-21).
- The X-profile stack order: cover, avatar, name and handle, counts, bio, roles, links, actions, mutuals.
- Name t-heading 20/500.
- Visitors with no cover get no band.
- Never truncate.

**Amends:** [`shell-desktop-header-content-inset-lock-v1.md`](shell-desktop-header-content-inset-lock-v1.md), phone row, Profile only (decision 2). The identity root cancels the 16px phone frame top with `max-md:-mt-[var(--space-4)]`. Desktop G3 (no page `md:pt` / `md:mt`) is untouched.  
**Cites:**
- [`social-mobile-full-bleed-lock-v1.md`](social-mobile-full-bleed-lock-v1.md) — phone media meets the viewport; text stays inset.
- [`24frame-visual-register-rich-calm-lock-v1.md`](24frame-visual-register-rich-calm-lock-v1.md) — hairlines, no shadows, no blank plates.

---

## Founder decisions (2026-10-04)

| # | Question | Answer |
|---|----------|--------|
| 1 | LinkedIn proportions for the profile head | **Approve as described.** 4:1 cover at every width. Desktop card with `--radius-lg`, hairline and surface like the For You rail. Avatar `clamp(96px,19cqw,152px)` desktop and `clamp(88px,25cqw,112px)` phone, 4px ring, half overlap. A pencil circle replaces the labelled pill; the label stays as the accessible name and the title. |
| 2 | Phone placement | **(a) Edge to edge and flush under the top bar.** Text sits 16px from the screen edge. |
| 3 | Reposition | **Keep the original.** Store the uncropped original and its framing. Reposition reopens the original at the saved framing. Covers saved before the original was kept open the file picker from Reposition, the same as Choose cover photo. |

---

## One rule

One 4:1 cover: band = editor frame = crop = stored file = display, at every width. The desktop header is a card; the phone header is edge to edge. One avatar-size variable drives both the avatar and its overlap.

## Desktop (md+)

| Item | Lock |
|---|---|
| Card | `md:rounded-[var(--radius-lg)] md:border md:border-hairline md:bg-surface md:overflow-hidden` on the identity root (same treatment as the For You rail and welcome-video cards). Width = centre column: 720 / 644 / 544 / 388 (1024) / 464-719 (md, rail expanded) / up to about 915 (md, rail collapsed). |
| Cover | `aspect-[4/1]`, full card width; top corners clipped by the card. 718×179.5 at 720. |
| Avatar | `clamp(96px,19cqw,152px)`: 136 at 720 (18.9%), 96 floor at 388 and 464, 152 cap. 4px `--surface` ring; left 24. |
| Overlap | `-mt-[calc(var(--social-profile-avatar)/2)]`, exactly half. |
| Edit cover | 36px pencil circle, 44px hit, 12px from the top-right. Accessible name and title use the existing copy. |
| Name | t-heading 20/500 (unchanged). |
| Card bottom | 24 (`md:pb-[var(--space-6)]`). Visitor with no cover: avatar 24/24 from the card corner. |

## Phone (<md)

| Item | Lock |
|---|---|
| Header | `SOCIAL_MOBILE_BLEED_CLASS`; flush under the header (decision 2); no border, radius or fill. |
| Cover | 4:1 edge to edge (390×97.5). |
| Avatar | `clamp(88px,25cqw,112px)`: 97.5 at 390 (25%), 88 floor, 112 cap. 4px `--bg` ring; left 16; half overlap. |
| Text and actions | 16 from the screen edge; the primary action stretches; Share circle 44; wrap, never truncate. |
| Tab panels | Content under the head (the Interests chips) adds no phone inset, so it lines up with the head text and the tabs at 16. Desktop keeps the 24 inset. |

## Editor

- Focus = zoom plus position fractions in `src/lib/social-profile-cover-frame.ts`, shared by preview, crop and stored framing. Zoom 1 is cover-fit; zoom z shows a source window `min(iw, 4·ih) / z` wide, placed by the fractions in the slack. Slack of 0.5px or less counts as zero.
- Pan stops at the image edge. Preview at full opacity on the `--band` token.
- Arrow keys move 8px (Shift = 32); `+` / `=` zoom in and `-` zooms out by 0.1 (Shift = 0.4); Escape cancels; focus returns to the edit circle. While Save runs, Escape, the arrows and the zoom keys do nothing and the Zoom slider is disabled, the same as the disabled Cancel. Zoom keys with Ctrl, Cmd or Alt stay the browser's page zoom.
- The drag surface shows a 2px `--accent` focus ring inset on the band. The preview image sits in flow inside the surface, never positioned, so the ring paints over it. The surface clips the zoomed image to the band.
- The hint, the Zoom slider, Cancel/Save and errors sit below the band, right of the avatar, in the head trail. Nothing paints over the image except the avatar.
- No "Your cover photo is public." note. Founder (2026-10-04): "remove the 'your cover photo is public' copy. that's obvious."
- **Zoom (2026-10-04).** Founder report on the #760 preview: "there is no way to drag and reposition." Cause: the editor had no zoom, and his cover is a banner already at 4:1 (a 1584×396 LinkedIn banner), so at cover-fit there is no slack and nothing can move. Reposition on that legacy cover opens the picker, he picks the banner, and the editor showed Cancel/Save over an image that could not move. Decision (orchestrator, under the founder's standing ask "the way Meta or LinkedIn would do it"): LinkedIn-style zoom.
  - Range 1 to 3, capped so the saved crop's source window is never narrower than half the 1784 output (no worse than 2× upscaling), floored to the 0.01 slider step. A 1584×396 banner zooms to 1.77; a 1784×446 file to 2; originals narrower than 892px at cover-fit cannot zoom (the slider is disabled).
  - Controls: a labelled "Zoom" range slider (44px tall) in the trail above Cancel/Save; `+` / `=` and `-` on the drag surface; Ctrl/Cmd + wheel and trackpad pinch on the drag surface (the page neither scrolls nor zooms); two-finger pinch on touch. A zoom change keeps the visible centre fixed, then clamps to the image. Drag works on any axis with slack at the current zoom.
  - Hint: "Drag or use arrow keys to reposition image" when the photo can move; "Zoom in to reposition image" when it cannot until zoomed; none when it can neither move nor zoom. The drag surface's accessible name is the hint; with no hint (the original still decoding, or a photo that can neither move nor zoom) it is "Edit cover photo", never a drag instruction.
  - A zoom (wheel, keys, slider) or arrow nudge made while a pointer is held re-anchors the drag or pinch at the new framing, so the next pointer move carries on from it instead of undoing it.
  - What you see is what saves: the preview box is the drawn image of the crop frame (`coverPreviewBox` from `coverCropFrame`) in band percentages, so the on-screen window and `cropRectFile` use the same numbers at every width. Layout matches to Chromium's 1/64px unit; the browser may round where it paints the image by under half a CSS pixel, and the saved file is the exact window. The stored framing stays `{x, y, w, h}` fractions; reopen reads the zoom back from `w` and restores the same view (a framing saved before zoom reads as zoom 1). Output stays 1784×446.
  - Out: straighten, rotate, filters.
- Output stays 1784×446 JPEG q0.92, downscaled with high-quality smoothing.
- Known variation: framing is identical at every width, but the avatar covers 38% of the band height on desktop cards ≥544 and 50-55% on phones and the 1024 card. Keep subjects out of the lower-left corner.
- Reposition (decision 3, keep the original): a new cover saves the cropped 1784×446 file **and** the uncropped original, plus the framing `{x, y, w, h}` as fractions of the original. Reposition reopens the original at the saved framing through the owner-only cover route; Save writes a new cropped file and new framing and keeps the stored original. Save also sends the cover version the editor opened, as a check only: if another tab or device changed the cover since, the server refuses the save with the existing crop error. The original is never signed for visitors. A cover saved before this lock has no original, so Reposition opens the file picker.

## States

- Owner with no cover: accent-wash 4:1 band plus the Add circle.
- Cover set: photo over surface-muted; a broken load shows the token fill.
- Visitor with no cover: no band; head pt 16 / 24.
- Save-hop and loading paint the owner band inside the same layout row as the real page.

## OUT

- Fixed band heights or any non-4:1 band.
- `md:-mt-[Npx]` literals.
- Drop shadows.
- Hex colours.
- A 24px type step.
- A dimmed or ghost preview.
- Controls or hint chips painted over the cover.
- A phone header inset from the viewport.
- New user-facing copy for the original photo.

## Gates

- **G1:** the band class is `aspect-[4/1]` with no `h-[` values.
- **G2:** the identity root has `@container` and both clamp variables.
- **G3:** the overlap is var-driven at half.
- **G4:** the preview-vs-crop check passes for 6 images × 9 widths × 4 positions × 5 zooms.
- **G5:** the avatar class has `border-4`, `border-bg md:border-surface`, and `md:ring-offset-[var(--surface)]`.
- **G6:** the hop and loading overlay render the owner band inside `SOCIAL_HOME_LAYOUT_CLASS` with the For You placeholder.
- **G7:** no truncation classes in the head or face.
- **G8:** no new eslint warnings.
- **G9:** Reposition with a stored original reads it server-side (never a client-sent key) and keeps it, and lands only on the cover the editor opened; Remove clears the cover, the original and the framing together.
- **G10:** the editor preview image has no positioned utility, so the drag surface's focus ring stays visible. Founder preview check: Tab to the drag surface at 390 and 1440 and see the ring.
- **G11:** an exact 4:1 banner (1584×396) cannot move at zoom 1 and can after zooming; zoom never exceeds 3 or 2× upscaling of the output; reopen restores the saved zoom and window. Founder preview check: Reposition the 1584×396 banner, zoom in, drag, Save, then Reposition again and see the same framing.
