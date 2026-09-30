# [GC][24Frame] LOCK — Social Home spine density / real-estate v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam signal 2026-09-24 — Home bare vs FB · after #680 · **Adam confirm: judge density mobile-first** · CoS Own→READY) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Repo citation:** `docs/design-locks/social-home-spine-density-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-home-spine-density-lock-v1.md`  
**FB structure ref (spine only, not chrome clone):** `/workspace/24frame-agg-ux/create-story-ref-fb-home-rail.png`  
**Phone Home shot:** fold in when Adam sends — box path under `/workspace/24frame-agg-ux/` · amend this lock, do not wait on desktop  
**North star (cite, do not reinvent):** Familiar verbs · Coinbase-precise · Directed attention · **Rich media spine** · Quiet helpers · **Never bare, never loud** · Interesting = **media in the spine**, not chrome density · **Not** FB-overstimulating  
**Doctrine:** Media Immersion — IG-excellent media presence; flat thin pasted cards = FAIL; soft never ships  
**Stack (unchanged):** Topics → composer → Stories → Feed · Create dock remains · `SOCIAL_HOME_STACK_ORDER`  
**Cites:** `social-home-activity-feed-lock-v1.md` (purpose/URL) · `social-home-composer-share-copy-lock-v1.md` (prompt string) · house spacing **8 / 16 / 24 / 48** · never-patch · phone never-truncate · dual-host  
**Out of scope:** Inventing FB left/right side-rail noise · Meta Live/Photo/Feeling icon strip on Home · undraft unrelated PRs · Groups product · Stories viewer · Create-story stage redesign · waiting on desktop to ship phone densify

---

## Host primacy (Adam 2026-09-24)

**Judge density on mobile first.** Phone geometry is the **SoT**. Desktop follows the **same spine** after phone feels full — do **not** block the lock or Dev CLEAR on desktop polish.

| Rule | Lock |
|------|------|
| Glance bar | Phone Home fold feels **full** (composer stage + bigger Stories + bleed media) before desktop is graded |
| Desktop | Same tokens / same order · scale into 720 center — not a second invent pass |
| Shot amend | If Adam sends a phone Home shot, fold into this lock path the same day |

---

## One lock

Social Home’s center spine must **spend real estate on media and create presence** — composer is a **share stage**, Stories rail is a **bigger tighter media strip**, feed **media owns column width**, stack stays Topics→composer→Stories→wall but **denser**. Keep Coinbase-quiet. Do **not** fill emptiness with louder UI or side rails.

---

## CoS / Adam greenlit checklist (ship all four)

1. **Composer** = share stage (**Share something** + weight), not a thin form row  
2. **Stories rail** = bigger cards, tighter horizontal rhythm  
3. **Feed** = media owns column width · kill soft gutters (Media Immersion)  
4. **Vertical packing** = same order, denser stack · never-bare / never-loud · no FB side-rail noise  

---

## Why it reads bare (diagnosis)

| Layer | Today (craft debt) | FB spine (structure intent) | Bare miss |
|-------|--------------------|-----------------------------|-----------|
| **Composer** | Airy transparent row (`SOCIAL_COMPOSER_CLASS` h-20 · no surface stage) | White create **card** + pill field claims vertical attention | Create entry feels like a faint label, not a stage |
| **Stories** | Tall cards exist (~108×192) but sit small vs column + sparse optical weight | Larger full-bleed story cards, tight gap, media-first rail | Rail under-reads as “chrome row” not media |
| **Feed media** | `SOCIAL_FEED_ROW_CLASS` pads **16** on all sides → media inset inside the column | Media **edge-to-edge** in the post column | Media Immersion FAIL — picture pasted in a padded card |
| **Stack air** | Section gaps that leave empty fold | Tighter vertical packing of the same order | Page feels empty before feed media arrives |

Interesting stays in the **spine media**, not by adding FB Contacts / Shortcuts / Sponsored.

---

## A) Composer = share stage

Keep: one press opens Create sheet · Create dock stays · no second chooser strip · prompt from share-copy lock.

| Token | Phone SoT (desktop follows) |
|-------|------------------------------|
| Host | **Surface stage** — bg `#FFFFFF` · hairline `#ECEDF0` · radius **16** · pad **16** · full width of Home center |
| Row | Avatar **40** + prompt field · gap **16** · `items-center` |
| Prompt field | Muted pill · bg `#F4F4F6` · height **40** · radius **20** · pad H **16** · `t-body` · `text-ink-2` · **Share something** |
| Hit | Whole stage press → existing Create sheet |
| Forbidden | Transparent thin form row as the only Home create face · Meta multicolor Live/Photo/Feeling icon row · gray full-width liner under Topics |
| Height | Content **40** + pad **16**/**16** → stage ~**72** (8-scale) |

---

## B) Stories rail — bigger · tighter

Keep: FB-tall card grammar (media face + name lip · Create card with plus) · horizontal scroll · Home surface `data-social-stories-tall`.

| Token | Phone SoT | Desktop (follows phone) |
|-------|-----------|-------------------------|
| Card | **120 × 208** | **128 × 224** |
| Gap between cards | **8** | **8** |
| Rail pad | H **0** (align to column edge) · bottom **8** | Same |
| Media in card | Full-bleed cover · object-cover | Same |
| Create card | Same outer size as story cards | Same |
| Optical | ≥ **~3.5 cards** visible on ~390-wide before scroll | ≥ **~5 cards** in 720 center |

**Forbidden:** Shrinking below prior ~108×192 · gap **≥16** · circular-ring rail regression · Stories section title invent.

---

## C) Feed — media owns width (kill soft gutters)

Posts stay on the page canvas (no gray FB gutter slabs). Hairline between rows stays (`SOCIAL_FEED_GUTTER_CLASS`).

| Token | Phone SoT (desktop follows in 720) |
|-------|-------------------------------------|
| Author row / actions / caption / meta | Horizontal inset **16** · vertical rhythm **8** / **16** |
| **Media frame** | **Full width of Home center** — **no** 16px side inset on the media |
| Implementation intent | Split padding: chrome keeps `px-16`; media `w-full` / `px-0` (negative margin OK) |
| Radius | Phone: media side radius **0** (bleed) · Desktop: bleed inside 720, or **8** only if a true surface card returns |
| Aspect | Stills stay **4:5** / **16:9** via `socialMediaFrameClass` · never aspect-square. In-feed video uses real width and height (`social-home-post-separation-lock-v1.md`), not a 16:9 slot |
| Between posts | One hairline only · no muted py slabs |

**FAIL:** Visible empty gutters between media edge and column edge · soft postcard paste.

---

## D) Vertical packing

| Token | Lock |
|-------|------|
| Order | Topics → composer → Stories → wall (**unchanged**) |
| Section gap | **16** between Topics / composer / Stories / feed list — denser than sparse **24**/**48** fold air |
| Topics | Existing quiet chip rail — no density invent beyond keeping it quiet |
| Create dock | Remains |

---

## Dual-host

| | Phone (SoT) | Desktop |
|--|-------------|---------|
| Judgment | Density **PASS/FAIL here first** | Follow after phone feels full |
| Center | Full phone canvas width | Shared center **720** |
| Composer / Stories / feed | Sections A–C | Same grammar · do not invent a louder desktop |
| Side rails | **OUT** | Do **not** add FB Contacts/Sponsored/Shortcuts to fill bare · existing For You rail OK if already shipped |

---

## FAIL / OUT

| FAIL | Why |
|------|-----|
| Thin transparent composer row | Not a share stage |
| Stories cards small / gap-16 sparse | Under-reads media |
| Feed media inset inside padded row | Media Immersion FAIL |
| Holding Dev for desktop before phone densify | Violates mobile-first |
| Adding FB side-rail clutter | Never loud · out |
| Meta feeling/live icon strip on Home | Loud chrome |
| Changing stack order | Locked elsewhere |

---

## Done-when

1. **Phone** Home: composer = surface share stage + **Share something**.  
2. **Phone** Stories: locked card size + gap **8** · media-first.  
3. **Phone** feed media full-bleed · chrome keeps 16 inset.  
4. Stack order unchanged · section gap **16** · no side-rail invent.  
5. Adam phone glance: not bare · still Coinbase-quiet.  
6. Desktop follows same spine after phone PASS — not a blocker for CLEAR.

**Ship:** Design Own→READY · CoS CLEAR · one Dev PR citing this path (optionally paired with share-copy lock). Phone-first verify.
