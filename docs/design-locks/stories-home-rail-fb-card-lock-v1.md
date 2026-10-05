# [GC][24Frame] LOCK — Stories home rail · FB card grammar v1

**Date:** 2026-09-23 (CT)  
**Status:** **LOCKED** (Adam seed via CoS — Facebook Stories home rail grammar; 24Frame Coinbase-calm register · **not** FB pixel/brand clone) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Superseded on the Feed (Adam 2026-10-04, G · Feed):** Feed stories are D's 56×100 tiles with the first name under them, an ink unseen ring and an ink "Your story" badge (no accent, no create plate). The `/social/stories` surface is unchanged. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Restored on the Feed (founder 2026-10-05, H · Feed):** the Feed shows this lock's cards again — 112×200 / 108×192, gap 8, the accent ring on unseen, the name on the picture, Create story with the accent plus on the seam — with no card border, a muted (not white) create plate, and a name that wraps rather than truncates. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Scope:** Social Home (and Social surfaces that reuse the **home tall** stories rail) — rail layout + **card preview** craft only. Not create-story studio (see `create-story-photo-video-fb-layout-lock-v1.5.md`). Not playback viewer chrome.  
**House register:** Geist · Sporty Blue `#1769FF` · Coinbase-calm · spacing **8 / 16 / 24 / 48** · **no drop shadows** · ink `#14171A` · muted `#F4F4F6` · hairline `#ECEDF0` · surface `#FFFFFF`  
**Cites:** Adam Facebook Stories home rail screenshot (CoS thread) · current tall rail sizes in `social-chrome` (normalize to this lock) · media URL dependency (Dev / CF trusted keys)

---

**Craft bar (Adam gospel 2026-09-23, standing exclusive):** Facebook / Instagram grade only — **never** soft-grade. No “ship thin then polish.” Own→READY means full structure + geometry in this lock.


## One lock

Horizontal Stories rail of **tall ≈9:16 rounded cards**. Each story card shows **full-bleed story media cover** on the card face (not a grey disc, not blank muted forever when media exists). **Top-left** author avatar with ring (**unseen = Sporty Blue**). **Bottom** truncated name on a **dark → transparent** gradient. **First** card = **Create story** (profile photo as background + Sporty Blue **+** + “Create story”). **Uniform** horizontal gap.

Structure = Facebook Stories home rail. Paint = 24Frame only.

---

## Rail

| Token | Lock |
|-------|------|
| Axis | Horizontal scroll; `overflow-x` auto; no wrap |
| Gap | **8** between every card (Create → story → story). Uniform. No 4 / 12 cousins. |
| Padding | Rail trailing peek **16** (last card not flush-clipped awkwardly). Leading aligns to Social home content inset (shell gutter locks apply). |
| Order | **1.** Create story (if `canCreate`) · **2…n** author story cards (unseen first optional — product sort; craft does not invent sort) |
| Empty (zero stories, can create) | Create card alone — still tall FB create grammar |
| Forbidden | Circle-only IG tray · name labels **under** the card · unequal gaps · inventing secondary tray chrome |

---

## Story card geometry (shipped sizes)

≈9:16 tall rounded rect. One size pair:

| | Phone | Desktop (md+) |
|--|-------|----------------|
| Width | **108** | **112** |
| Height | **192** | **200** |
| Radius | `--radius-lg` (house surface radius) | same |
| Border | **1** hairline `#ECEDF0` on card chrome edge only — **not** a full-card unseen ring | same |
| Overflow | `hidden` | same |

Aspect check: 108/192 = 112/200 = **0.5625** = **9:16**. Do not drift to square or 3:4.

---

## Story card layers (z bottom → top)

### 1. Media cover (required craft)

| Token | Lock |
|-------|------|
| Fill | `absolute inset-0` · `object-fit: cover` · center |
| Source | **Story poster / cover / first-frame thumb** for that author’s latest (or rail) story — **not** the author’s profile photo as the card fill |
| Loading / no URL yet | `bg-surface-muted` `#F4F4F6` only as **temporary** empty — never a grey **circle** face; never leave muted when a working cover URL exists |
| Video stories | Still image poster/thumb on the rail (not autoplay in-rail for v1) |

**Dependency (Dev):** Cover URL must resolve (same object / trusted CloudFront path as playback). Design craft assumes a working `cover`/`poster` URL once Dev unblocks. Coordinate thumb source with Dev; do not invent a second CDN.

### 2. Bottom name gradient

| Token | Lock |
|-------|------|
| Band height | **48** from card bottom |
| Fill | Linear gradient **transparent →** `rgba(20, 23, 26, 0.72)` (ink `#14171A` @ 72%). **Not** a solid opaque bar. **Not** `bg-band` flat block. |
| Type | `t-label` · medium · **white** / `#FAFAFB` · single line · truncate |
| Label | First name + last initial + `.` (e.g. `Adam C.`) — existing `storyLabel` OK |
| Inset | Horizontal **8** |

### 3. Top-left avatar ring

| Token | Lock |
|-------|------|
| Position | Top **8** · Leading **8** |
| Outer | **32** diameter (`size-8`); desktop may **36** (`size-9`) |
| Ring | Border **2**. **Unseen** = Sporty Blue `#1769FF`. **Seen** = hairline `#ECEDF0` (or ink-muted grey — **not** green, **not** full-card blue outline). |
| Face | Author avatar photo or initials; inner padding **2** so ring reads |
| Forbidden | Unseen = thick blue **card** border · progress pie / green arc on the rail avatar |

---

## Create story card (first)

Facebook create grammar in 24Frame paint:

| Token | Lock |
|-------|------|
| Size | Same **108×192** / **112×200** as story cards |
| Background | **Profile photo** of current user, `object-fit: cover`, full card (or upper **≈60%** if using split — prefer **full-bleed profile** with bottom label scrim). If no photo: muted + initials centered upper. |
| Plus | Sporty Blue circle **36** (phone) / **40** (md) · white **+** glyph · horizontally centered · vertically sits on the lower third seam (~ **56%** from top) · **3** white/surface ring so it reads on photo |
| Label | **Create story** · `t-body-sm` medium · ink on **surface** bottom plate **height 72–80** **or** white text on dark scrim if full-bleed photo — pick **one**: FB-classic = **bottom surface plate** with ink label + plus overlapping the photo/plate seam. Lock **FB-classic split**: upper media/profile · lower **surface** `#FFFFFF` plate · plus overlapping seam · label centered in plate. |
| Plate height | **72** phone / **80** md (matches prior create plate rhythm on 8-scale) |
| Hit | Whole card → `/social/stories/new` |
| Forbidden | Grey circle-only create · plus without profile/muted upper · label under the card outside the card bounds |

---

## Phone vs desktop

Same grammar both. Desktop uses **112×200**; phone **108×192**. Never truncate names mid-glyph (CSS truncate OK). Never shrink cards below locked size to “fit more.”

---

## OUT / IN summary

**IN**
- Tall 9:16 rounded cards, gap **8**
- Full-bleed **story media** cover on story cards
- Top-left avatar · unseen ring Sporty Blue · seen hairline
- Bottom name on dark→transparent gradient
- Create = profile upper + surface plate + blue + + “Create story”
- Cover URL wired to story poster/thumb (Dev media path)

**OUT**
- Grey circle / blank disc as the card preview
- Author avatar used as the **card fill** instead of story media
- Solid opaque name bar (no gradient)
- Name caption **below** the card
- Full-card blue border as unseen state
- Green / pie progress on rail avatar
- Design PR / inventing new spacing tokens outside 8/16/24/48
- Pixel-clone Facebook chrome (glyphs, Meta brand, exact FB blue)

---

## Gates

**G1.** Cards **108×192** phone / **112×200** desktop; aspect **9:16**; radius `--radius-lg`.  
**G2.** Horizontal gap **8** uniform.  
**G3.** Story card media = story **cover/poster** full-bleed cover — not grey circle; not profile-as-fill.  
**G4.** Bottom name on **gradient** (transparent → ink 72%), white `t-label`, truncate.  
**G5.** Top-left avatar ring: unseen `#1769FF`, seen hairline; not full-card ring.  
**G6.** Create card: profile (or muted) upper + surface plate + Sporty Blue + + “Create story”; links `stories/new`.  
**G7.** Reads 24Frame (Geist · Sporty Blue · Coinbase-calm · no drop shadows).  
**G8.** Cover URL dependency called out — Dev owns working media; Design does not invent CDN.  
**G9.** Design no PR — CoS routes Dev.

## Repo citation

CoS seeds: `docs/design-locks/stories-home-rail-fb-card-lock-v1.md`  
Box: `/workspace/24frame-agg-ux/stories-home-rail-fb-card-lock-v1.md`  
Related: `create-story-photo-video-fb-layout-lock-v1.5.md` (create studio — separate)
