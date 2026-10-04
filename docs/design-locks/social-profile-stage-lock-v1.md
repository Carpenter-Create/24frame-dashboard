# [GC][24Frame] LOCK — Social profile · A · Stage v1

**Date:** 2026-10-04 (CT)  
**Status:** **APPROVED** (founder picks, 2026-10-03/04, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** The profile on `/social/profile` (owner) and `/social/u/[handle]` (visitor): hero, face under it, section tabs, the skeleton, the save-hop and loading overlay, and the cover editor. One identity component for owner and visitor. Tab panel contents are unchanged. The shell (header, side menu, phone dock) is [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) and is not restyled here.  
**Entity:** Global Content / 24Frame only  
**Mockup:** board **A · Stage** (desktop 1180 + phone 390) on the canvas cited by [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md). Mockup colours are brand tokens in code (light default, dark available): `--bg` / `--surface`, `--surface-muted`, `--border`, ink / ink-2 / ink-3, `--accent`, `--accent-wash`, `--band` / `--band-ink`. The mockup's black scrim and white name are `--band` and `--band-ink`.  
**Supersedes:**
- [`social-profile-header-linkedin-lock-v1.md`](social-profile-header-linkedin-lock-v1.md) header geometry: the 4:1 band, the 1784×446 crop, the desktop card, the clamped avatar and its half overlap, the edge-to-edge flush phone head (its decision 2, **"Edge to edge, flush"** — the founder picked the Stage mockup, which shows an inset card), "visitors with no cover get no band", the name at t-heading 20/500 below the cover, and the stats → bio → roles → links → actions order. Its gates G1–G7.
- The LinkedIn lock's amendment of [`shell-desktop-header-content-inset-lock-v1.md`](shell-desktop-header-content-inset-lock-v1.md) (phone row, Profile only: the flush `-16` pull). The phone hero now pulls 4 (`max-md:-mx-1 max-md:-mt-1`) so it sits 12 from the screen. Desktop G3 (no page `md:pt` / `md:mt`) is untouched.
- On the profile face only: the one-row roles chip rail (`src/lib/social-profile-roles.ts`, "phone scrolls sideways") and the shared `h-8` chip measure for roles (`SOCIAL_CHIP_HIT_CLASS`); the icon-only Share circle; the underlined tab strip.

**Keeps (from the LinkedIn lock):** its editor and storage rules — WYSIWYG focus model, the kept original and its framing, Reposition through the owner-only route with the server-trusted source key, the compare-and-swap on the cover the editor opened, Remove clearing cover, original and framing together, arrow keys and Escape, the held keys while Save runs, the in-flow preview so the focus ring shows (its decision 3, G9, G10). No SQL change: `profiles.cover_crop` fractions carry no aspect.

---

## Founder words (verbatim, 2026-10-03/04)

> I need it significantly more in this energy. Very modern and very tech.

> I'm happy to reimagine the visual experience while maintaining a sense of familiarity and non-confusion.

> I don't want the same layout – I want fresh and not outdated

> Links are given far too much attention. I'm not trying to encourage users to leave the platform. External user profile links should be found, but not the center of attention.

> keep our brand typography and colors too

> default is light mode but users can go to dark mode

## Founder picks

| Question | Pick | Meaning |
|----------|------|---------|
| Layout | **"A · Stage"** | A rounded hero card carries the cover, the avatar, the name and the handle; everything else sits under it on the page |
| Cover frame | **"Frame once, phone area shown"** | Members drag once in the wide desktop frame. The editor outlines the part phones will show, like YouTube banners |

---

## One rule

One frame: the desktop hero is **16:7** at every desktop width, the editor's drag surface is that same 16:7 frame, and the saved crop is a **2400×1050** JPEG of exactly what was framed. Phones show the centred **phone-safe region** of that crop in a 61:55 card; the editor outlines that region with the same function (`coverPhoneSafeRegion` in `src/lib/social-profile-cover-frame.ts`), so outline == phone render. The cover layer is its own frame box at the top of the card (`absolute inset-x-0 top-0` with the card's aspect), never the card's content height, so the photo always shows exactly as framed, even on a card that a very long name has made taller.

## Desktop (`md+`)

| Item | Lock |
|---|---|
| Hero | Rounded card, `aspect-[16/7]` at every desktop width, `--radius-xl` (24, new token), `--band` fill, `overflow-clip`. Width = the centre column: 720 at 1440, 644 at 1280, 544 at 1180, 388 at 1024, 464 at 768 with the rail open. |
| Cover | `object-cover` layer under the identity, in its own 16:7 box at the top of the card. A broken load shows the band. |
| Scrim | From `--band`: 12 of photo above the avatar, then the avatar row eases from `band/75` at the avatar's foot to clear at the top of that gap on a smoothstep curve (stops 75 / 67 / 49 / 26 / 8 / 0 %), so there is no edge where it meets the name; the name and handle sit on a solid `band/75`. |
| Avatar | 80, 3px `--band-ink` ring, bottom-left with the name (padding 28), from the large step (below). A live-story ring sits straight outside the ring. |
| Name | House hero size: `--text-hero` 56, title weight 480, `--tracking-display`, leading 1, `--band-ink`, from the large step; house title 28 below it. Wraps; never truncates. |
| Handle | 15 (13 below the large step), `--band-ink` at 84%. |
| Edit cover (owner) | Glass pill 16 from the top-right: `--surface` at 86%, 16px backdrop blur, hairline; pencil 15 + the existing label ("Edit cover photo" / "Add cover photo"). 36 tall, 44 hit. Opens the existing menu and editor. Sits on the stage, outside the hero's clip, so the menu can drop past a short hero. |
| Face, two columns | From `md` once the identity is 35rem wide (1280, 1440): left — headline (`--text-lg`, 480), tagline (`--text-sm`, ink-2), stats inline (15, tabular value in ink 600, label ink-2, followers and following stay links), quiet links row; right — action pills. Roles chips across the bottom. |
| Face, one column | Narrower desktop columns (768 with the rail open, 1024 and 1180 beside For You): same items in the phone order (intro, actions, stats, mutuals, roles, links), pills hug their labels, so the intro is never squeezed beside the pills. |
| Actions | Owner: **Edit profile** accent pill 44; **Share profile** hairline secondary pill 44. Visitor: the existing **Follow** (accent) / **Following** (hairline) and **Share profile** in the same pills. |
| Roles | Chips 36, `--surface-muted`, label 13/500, A→Z, wrap, never +N. Plain chips: the codebase maps no icons to roles, so none are invented. |
| Links | Quiet row, never a panel or list: a website is its host as 13 text beside a 14 globe; socials are 32 icon-only hits in ink-3, named by platform. |
| Tabs | Pills Activity · Highlights · Credits · Interests (Interests hidden for a visitor when the member has none). Active: `--accent-wash` fill, accent text 600, `aria-current="page"`. Idle ink-2 500. No underline. 36 tall, 6 apart, 24 under the face. |

## Phone (`<md`)

| Item | Lock |
|---|---|
| Hero | Card inset 12 from the screen edges (top too), radius 24, `aspect-[61/55]` (mockup 366×330 at 390). Renders the same saved crop with `object-cover`, centred: the phone-safe region. The 61:55 card is for portrait phones only: from **30rem** of viewport (landscape phones, small tablets) the card is the 16:7 frame (`min-[30rem]:aspect-[16/7]`), so it is never taller than a landscape screen (740×400: 716×313, not 716×646). It shows more than the phone-safe region there, so the outline stays a lower bound. |
| Overlay | Avatar 64 (3px ring), name at `--text-title` 28 (house title, wraps, never truncates), handle 13, padding 20. |
| Edit cover (owner) | The same glass control as a 36 pencil circle 12 from the corner, label `sr-only`, 44 hit. |
| Face | 16 from the screen: headline 17/480, tagline 15 ink-2; actions row (Edit profile / Follow `flex-1` accent 44, Share profile `flex-1` secondary); stats strip (`--surface-muted`, radius 16, three cells with hairline dividers, value 20/480 tabular over a 13 label); mutuals; role chips 32 that wrap; quiet links row (44 hits, the touch floor). |
| Tabs | One full-width segmented row on a muted track; equal segments 44 tall with no side padding, labels centred. Each label is its own shrinkable span (`min-w-0 break-words hyphens-auto`), so a label wider than its segment ("Highlights" below about 340) wraps inside it, never past it; never a sideways scroll. |

## Hero overlay steps

One `hero` container query on the stage, three steps. The name keeps house sizes only (28 and 56):

| Step | Hero width | Avatar | Name | Handle | Padding (side, bottom) | Avatar → name |
|---|---|---|---|---|---|---|
| Tight (desktop only) | below **28rem** (the 388 column at 1024–1083 beside For You) | 48 | 28 | 13 | 16 | 8 |
| Compact (phone sizes) | 28rem up to 40rem; every phone | 64 | 28 | 13 | 20 | 12 |
| Large | from **40rem** (944–1023 with the rail, 1264+ beside For You) | 80 | 56 | 15 | 28 | 16 |

Every step keeps at least **12** of photo above the avatar and holds a **two-line name inside 16:7** at the narrowest hero it serves: tight 167.5 of 169.75 at 388; compact 191.5 of 196 at 448; large 276.6 of 280 at 640. The earlier single 35rem step let a two-line 56 name grow the card at 560–604 (1196–1245 beside For You, 864–909 with the rail) and a two-line 28 name at 388 push the avatar to the card's top edge. Numbers: `SOCIAL_PROFILE_STAGE_HERO` and `socialProfileHeroOverlayPx` in `src/lib/social-profile-cover.ts`; literal classes in `src/lib/social-chrome.ts` (tests compare them and check the fit).

**Never truncate:** the hero is `overflow-clip`, not a scroll container, so a name too long for the frame grows the card instead of being cut. That happens only at three or more lines: roughly 50+ characters at 1024 (a 48-character name holds two lines there), roughly 40+ at the large step (the same 48-character name is three lines at 1280; the 14–31-character names checked hold two), and five lines on a 320 phone (an 80-character name). The cover keeps its own 16:7 (or 61:55) box at the top, so the framed photo never re-crops; the extra height below it is the `--band` fill under the solid scrim. Skeleton and save-hop cannot know the name, so for those names the hero settles taller when the face mounts.

## Data (no new fields)

- The bio's first line is the **headline**; any further lines are the **tagline**, soft newlines kept. A one-line bio is a headline alone (`socialProfileIntro`, `src/lib/social-profile-intro.ts`).
- The owner's empty-bio hint ("Your public face. Edit anytime.") shows as the muted tagline.
- Mutuals ("Followed by …") keep their faces and copy, after the stats.
- Followers and following stay links to the follows page.

## Editor — frame once, phone area shown

- The drag surface is the 16:7 frame over the hero at every width; on phone the card turns 16:7 while the editor is open. The identity overlay and scrim step aside, so the photo shows alone at full opacity on `--band`.
- A clear outline of the phone-safe region: centred, full height, 48.52% of the frame width (61:55 ÷ 16:7), a dashed `--band-ink` line with a `--band` hairline, labelled **"Phone view"** (`SOCIAL.profile.coverPhoneView`). Its box is set inline from `coverPhoneSafeRegion()` through `coverRegionStyle()`, as margins (percentage margins resolve against the frame's width on both axes, so the top margin is y × 7/16; today's region has y = 0). Nothing outside it is dimmed: desktop shows the whole frame.
- The preview and the outline share one grid cell, in flow, never positioned, so the surface's inset focus ring paints over both (G10 carried).
- Crop view 320×140; output 2400×1050 JPEG q0.92 with high-quality smoothing; byte cap = the posts stills lane cap, 10 MB (a worst-case 2400×1050 JPEG is far under it).
- Hint, public note, Cancel / Save and errors sit in the owner trail under the hero, never over the image. The owner's inline avatar crop opens in the same trail, not over the cover.
- Existing 4:1 covers render with `object-cover` in the new frame (the sides crop). Reposition reframes them when an original is stored: the 16:7 window reopens centred on the stored window's centre, clamped to the image. A cover saved before originals were kept still opens the file picker.

## States

- Cover set: photo under the scrim. Broken load: the band.
- No cover (owner or visitor): the `--band` fill, so the name stays legible. Owner adds "Add cover photo".
- Skeleton, save-hop and loading overlay: the same stage, hero, head and face classes inside the same layout row with the For You placeholder; the hero box is identical for names up to two lines (checked at 390, 1024 and 1440). The skeleton's links row starts on the column edge (`ml-0`): it paints whole hit boxes, so the real row's 6 pull would put it outside the column.

## Accessibility

- Real links and buttons. The pills, tab pills and Edit cover keep their round shape on focus; Edit cover and the avatar badge add a `--band-ink` ring to the house accent outline, so focus shows on any photo.
- Phone targets ≥ 44 (pills, tabs, links, stats cells; the pencil and avatar badge through a 44 hit area).
- Name and handle keep ≥ 4.5:1 over the scrim on any photo in both themes. Measured in headless Chromium, worst pixel under the text: white cover — light 6.97:1 name / 5.50:1 handle, dark 6.64 / 5.26; black cover — light 17.25 / 12.32, dark 16.33 / 11.67; no cover — light 16.07 / 11.60, dark 15.25 / 11.02. The eased avatar-row ramp leaves these unchanged (re-measured; the text sits on the solid part).
- **Active tab label below 4.5:1 in light mode.** `--accent` on `--accent-wash` measures **4.07:1** for the 15/600 active label (dark mode 6.17:1). It is the mockup's pairing and the house rail's (`HOUSE_RAIL_ACTIVE_CLASS`), so it is a founder checkpoint (below), not changed here.

## OUT

- A 4:1 band, a fixed hero height, or `h-[…]` on the hero.
- Hex colours; a new accent; drop shadows.
- Links as a panel, a list, labelled chips or brand-coloured icons.
- Truncation, ellipsis, line clamps; sideways scrolling for roles or tabs on phone.
- Dimming outside the phone outline; a ghost preview; controls painted over the photo while framing.
- New user-facing copy beyond "Phone view".
- SQL or RLS changes.

## Gates

- **S1:** the hero class is `aspect-[61/55] min-[30rem]:aspect-[16/7]` (plus the editor's 16:7) with `--radius-xl`, `bg-band` and `overflow-clip`; the cover layer carries the same aspect classes at `inset-x-0 top-0`; `--radius-xl: 24px` exists in `tokens.css`.
- **S2:** crop output 2400×1050, view 320×140, cap = the posts lane cap.
- **S3:** `coverPhoneSafeRegion()` = the centred object-cover window of a 61:55 card over a 16:7 crop; the editor outline is placed from it.
- **S4:** the overlay step literals (`md:@max-[28rem]/hero:`, `@min-[40rem]/hero:`) match `SOCIAL_PROFILE_STAGE_HERO`, and each step's two-line overlay fits 16:7 at its narrowest hero (`socialProfileHeroOverlayPx`).
- **S5:** scrim from `--band` only; name and handle ≥ 4.5:1 on a white cover in both themes (Chromium).
- **S6:** skeleton, save-hop and real hero boxes match at phone and desktop widths (Chromium).
- **S7:** no truncation classes in the hero, face or tabs; an 80-character name grows the hero instead of clipping, and the cover keeps its frame box (Chromium); two-line names hold 16:7 at 768–1440 (Chromium: 768, 800, 880, 944, 1023, 1024, 1083, 1084, 1180, 1200, 1240, 1263, 1264, 1280, 1440).
- **S8:** phone targets ≥ 44 (Chromium).
- **S9:** no new eslint warnings.
- **S10 (carried G9/G10):** Reposition reads the stored original server-side and lands only on the cover it opened; the drag preview and outline stay unpositioned.

## Founder checkpoints left open

- **For You beside the profile.** The mockup shows no For You rail; this lock keeps the existing rail (not removing it is the smaller change). With it the hero is 544 wide at 1180 and 388 at 1024, so those widths use the 28 overlay step and the one-column face. Removing For You on the profile would give the mockup's full-width stage.
- **"Phone view"** outline label copy.
- **Phone link hits 44** (the touch floor) where the mockup draws 36.
- **Scrim strength.** `band/75` under the text is darker than the mockup's 0.7→0 fade so the name and handle stay ≥ 4.5:1 on any photo; on a bright photo the name sits on an even grey block. Only the ramp above it is eased (no edge at the avatar's foot).
- **Active tab contrast.** `--accent` on `--accent-wash` is 4.07:1 in light mode for the 15/600 label (AA asks 4.5:1). Options: a deeper accent text token for text on the wash (a colour decision), or accept the house pairing (it is the rail's too).
- **Singular stat labels.** One of a count now reads "1 post" / "1 follower" (the mockup shows "1 follower"); the words "post" and "follower" are new lib copy (`SOCIAL.profile.postStatOne`, `followerStatOne`). The follows page tab label (`socialFollowsTabLabel`) still says "1 followers"; it is outside this lock.
- **Long names.** Names of three or more lines grow the card (see Hero overlay steps). The alternative is a smaller name for long names on wide heroes (28 instead of 56), a typography call.
- **Tight step at 1024.** Beside For You the 388 hero uses a 48 avatar and 16 padding so a two-line name fits 16:7; removing For You on the profile would remove this step's main use.
- **Edit cover label** keeps the existing copy ("Edit cover photo" / "Add cover photo"); the mockup shows "Edit cover".
