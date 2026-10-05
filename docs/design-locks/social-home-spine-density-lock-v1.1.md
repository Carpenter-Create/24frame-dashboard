# [GC][24Frame] LOCK — Social Home spine density launch-great v1.1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam bar — **not good enough** · launch-great ASAP · #681 phone glance · CoS Own→READY) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Superseded in part (Adam 2026-10-04, G · Feed):** on the Feed, the 136×240 story cards, the 32 Topics chip and the single 8 spine gap give way to D's 56×100 story tiles, plain topic words and per-block air; the stack is tabs → topics → stories → composer → wall. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Superseded in part (founder 2026-10-05, H · Feed):** on the Feed, the story cards are the stories card lock's 112×200 / 108×192 (not 136×240 / 144×256, not G's tiles), the topics are 40 / 36 secondary chips with the accent wash on the current one, and the stack is slider → stories → composer → topics → wall with 24 · 24 · 24 · 16 air. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Repo citation:** `docs/design-locks/social-home-spine-density-lock-v1.1.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-home-spine-density-lock-v1.1.md`  
**Adam glance (fold):** `/workspace/24frame-agg-ux/social-home-681-adam-glance.png`  
**Supersedes (density feel):** `social-home-spine-density-lock-v1.md` — lock-letter PASS on #681 (Share something · taller Stories · bleed feed) · **feel FAIL** vs FB-bare · this amend is **launch-great**, not good-enough polish  
**Keeps:** `social-home-composer-share-copy-lock-v1.md` (**Share something** — do **not** invent Write something) · stack order Topics → composer → Stories → wall · Create dock · phone SoT  
**Gospels (cite):** Media Immersion Doctrine — IG-excellent media; flat/pasted paper = FAIL · Immersive Social / Home north star — Familiar verbs · Coinbase-precise · Directed attention · **Rich media spine** · Quiet helpers · **Never bare, never loud** · Interesting = media in spine, not chrome density · **Not** FB-overstimulating  
**Out:** Soft polish · good-enough density · Dev guessing spacing · Meta multicolor Live/Feeling strip · FB side-rail invent · waiting on desktop

---

## One lock

Phone Home spine must read **launch-great immersive social** on first fold: composer is a **media share stage** (prompt + Photo/Camera), Stories claim **real media mass** even with one card, Topics are a **quiet thin helper**, section air collapses to **8**. Feed bleed from v1 **stays**.

---

## #681 glance misses → concrete fix

| Miss in shot | Lock (one number / one grammar) |
|--------------|----------------------------------|
| Composer = one muted pill, thin vs FB share stage | Two-row share stage: prompt row + **Photo · Camera** affordance row |
| One story → rail airy / empty chrome | Bigger cards **136×240** · rail vertical chrome **0/8** · gap **8** |
| Topic chips burn vertical real estate | Chip hit **32** · Topics section pad Y **0** · Topics→composer gap **8** |
| Paper UI + media pasted risk | Denser stack gap **8** · media-first Stories/composer · feed bleed kept · no louder chrome |

---

## A) Composer = media share stage (supersedes v1 thin stage)

Keep: **Share something** copy · whole prompt opens Create · Create dock stays.

| Token | Phone SoT |
|-------|-----------|
| Host | Surface `#FFFFFF` · hairline `#ECEDF0` · radius **16** · pad **16** · full center width |
| Row 1 | Avatar **40** + muted pill `#F4F4F6` height **40** · radius **20** · pad H **16** · gap **12** · **Share something** · `t-body` `text-ink-2` |
| Row 2 | Affordance row under Row 1 · gap **8** from Row 1 |
| Affordance | **Photo** · **Camera** only (two hits) · icon **20** + label `t-label` / **0.75rem** · ink-2 · hit height **40** · gap between hits **24** · horizontal align start under pill (indent past avatar = avatar+gap = **52**) |
| Press Photo | Open existing Create sheet on **Photo / library** face (or sheet default with photo intent) — **no** new upload product |
| Press Camera | Open Create on **Take / camera** face — **no** new camera product |
| Press prompt / avatar | Existing Create sheet (unchanged) |
| Stage height | ~**120** (16+40+8+40+16) |
| Forbidden | Single muted pill as only face · Meta Live/Feeling/multicolor strip · Go live / Feeling on this row · transparent airy row regression · **Write something** |

---

## B) Stories rail — media mass (even with one card)

| Token | Phone SoT | Desktop follows |
|-------|-----------|-----------------|
| Card | **136 × 240** | **144 × 256** |
| Gap | **8** | **8** |
| Rail pad | H **0** · top **0** · bottom **8** | Same |
| Media | Full-bleed cover | Same |
| Create card | Same outer size | Same |
| Sparse (≤2 cards) | Same card size — **do not** shrink or add empty placeholders to “fill” | Same |

**Forbidden:** Keep v1 **120×208** as good-enough · gap ≥16 · invent fake story cards · circular-ring regression.

---

## C) Topics — quiet thin helper

| Token | Phone SoT |
|-------|-----------|
| Chip height | **32** |
| Chip type | `t-body-sm` / selected Sporty Blue fill (existing selected grammar) |
| Section pad Y | **0** |
| Gap Topics → composer | **8** |
| Role | Quiet lens helper — **not** a hero band |

**Forbidden:** Taller chip bands · section title · moving Topics below feed without Adam lock · deleting Topics.

---

## D) Vertical packing + feed (keep bleed)

| Token | Lock |
|-------|------|
| Order | Topics → composer → Stories → wall (**unchanged**) |
| Section gaps | **8** between Topics / composer / Stories / feed (supersedes v1 **16**) |
| Feed media | **Full-bleed** center column — chrome keeps inset **16** (v1 C — **keep**) |
| Between posts | Hairline only |

---

## FAIL / PASS

| PASS | FAIL |
|------|------|
| Composer shows Photo · Camera under Share something · frosted/share stage weight | Still one muted pill only |
| Stories **136×240** · little empty chrome with one story | Airy thin rail / 120×208 “good enough” |
| Topics thin · fold reaches Stories/media fast | Fat topic band before content |
| Feels immersive social, not paper+paste | Soft polish / Dev-guessed spacing |
| Share something kept | Write something returns |

---

## Done-when (CoS → Dev · #681 follow-up)

1. Phone Home: composer = two-row stage · **Share something** + **Photo** · **Camera**.  
2. Phone Stories: **136×240** · gap **8** · rail pad top **0** / bottom **8**.  
3. Topics chip **32** · Topics→composer **8** · stack gaps **8**.  
4. Feed media bleed kept.  
5. Adam phone glance: **launch-great** — not bare, not loud paper.  
6. No Design PR · cite this lock only on the follow-up tip.

**Ship:** Design Own→READY · CoS CLEAR · Dev amend #681 (or follow-up PR) · Design HOLD invent else.
