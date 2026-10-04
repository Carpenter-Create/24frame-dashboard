# [GC][24Frame] LOCK — DM thread immersive real-estate v1

**Date:** 2026-09-24 (CT)  
**Status:** **LOCKED** (Adam LOCKED 2026-09-24 — hide Social shell header AND bottom dock in DM thread · restore on back/exit to inbox/list · IG Direct real estate) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Repo citation:** `docs/design-locks/dm-thread-immersive-real-estate-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/dm-thread-immersive-real-estate-lock-v1.md`  
**Adam FAIL (chrome tax · #678 preview):**  
`/workspace/24frame-agg-ux/dm-immerse-refs/01-ours-678-chrome-tax.png`  
**IG PASS (immersive thread):**  
`/workspace/24frame-agg-ux/dm-immerse-refs/02-ig-dm-immersive.png`  
**Doctrine:** **Media Immersion Doctrine** — story/media stay rich immersive; this pass is **chrome + rhythm**, not soft flat cards.  
**SoT for in-thread chrome:** this lock.  
**Keeps (do not reopen):** `dm-thread-message-format-lock-v1.md` (alignment · date/time · story card 168/9:16) · `dm-vs-group-membership-lock-v1.md` **v1.1** (cap 16 · DM copy) · Send v1.5 / #677 · #664  
**Supersedes (header host only):** `dm-thread-header-density-lock-v1.md` — label/geometry **kept**; host no longer sits under Social shell (see §B).  
**Out of scope:** membership invent · Groups product · inventing call/video trailing icons · soft Media Immersion FAIL · dark-mode invent (house light stays)

---

## One lock

On a **DM thread route (phone-first)**: **hide** Social product shell header **and** bottom tab dock. **Restore** both on back/exit to inbox/list. One slim peer header + message column + slim sticky composer. Messages get the viewport. IG Direct feel without copying IG dark/glow/call chrome.

---

## A) Chrome tax — hide while in thread (Adam LOCKED 2026-09-24)

Applies when route = `/social/dms/…` thread (1:1 or multi-party DM). Inbox list routes keep normal Social chrome.

| Token | Lock |
|-------|------|
| Social shell header | **HIDDEN** while in thread — 24 logo · Social switcher · search · AI · bell · avatar chrome **OUT** of thread viewport |
| Phone bottom tab dock | **HIDDEN** while in thread — Feed / Explore / Create / Messages / Profile **OUT** (Feed was Home) |
| Escape | Back in peer header returns to inbox/list (or prior Social route) · Social shell header **and** bottom dock **restore** on leave-thread |
| Browser chrome | Not ours (Safari) — ignore |
| Floating debug / list FAB | **OUT** of thread (FAIL shot noise on right edge) |
| Soft collapse animation | Optional ≤220ms · default instant hide OK |

**FAIL:** Shipping thread still under full Social shell + tab dock (ref 01).  
**PASS:** Thread fills phone between status safe-area and home-indicator; only peer header + composer as product chrome (ref 02 structure).

---

## B) Peer header — single row (reconcile density)

**Keep from density lock:** row **48** · back hit **40** · avatar **32** · gap **8** · **display name only** (1-line truncate) · handle **OUT** of header · stacked hero **OUT** · phone = desktop sizes.

| Token | Lock (supersede host) |
|-------|----------------------|
| Host | Sticky at **top of thread viewport** under safe-area · surface `#FFFFFF` · bottom hairline `#ECEDF0` · **not** nested under Social shell |
| Trailing | **OUT** invent — no video/call/flag icons this lock (IG has them; we do not invent) · existing overflow only if already shipping |
| Name + handle both | Still **OUT** (Adam density stands — IG’s second-line handle is **not** adopted) |

---

## C) Message vertical rhythm (phone-first)

House spacing scale **8 / 16 / 24 / 48**. Alignment + date/time stay message-format lock.

| Token | Lock |
|-------|------|
| Pad inline | **16** |
| Same-author consecutive bubbles/groups | Gap **8** |
| Other-author / role change | Gap **16** |
| Day / time cluster separator | Margin block **16** · centered secondary (format lock) |
| Story-share group internal | Gap **4** between system line and card is **OUT** of scale — use **8** (same-job tighten to scale) |
| Media | Keep **168 / 9:16** live card · Media Immersion · side-aligned — **not** thinner paste |

---

## D) Composer strip vs IG

| Token | Lock |
|-------|------|
| Host | Sticky to bottom **safe-area** · **no** tab dock beneath · surface `#FFFFFF` · top hairline `#ECEDF0` |
| Strip content height | **48** (field row) + pad **8** top/bottom → content **64** before safe-area inset |
| Field | Pill **Message…** · height **40** · radius **20** · muted `#F4F4F6` or hairline · flex grow |
| Send | Trailing compact Sporty Blue circular **40** with plane **or** inline send — **one** control · not full-width stacked Sporty block |
| Leading camera / mic / sticker row | **OUT** invent this lock (IG has them; do not add) |
| Focus | Stays on thread · keyboard lifts composer · no route-out |

Amends message-format §E host line: sticky above safe-area **without** phone tab.

---

## E) Desktop note

| Token | Lock |
|-------|------|
| Social top shell | **HIDDEN** on thread route (same as phone) |
| Tab dock | N/A |
| Column | Thread column max-width **680** centered in content · pad **16** |
| Header / rhythm / composer | **Same tokens** as phone (density principle) |
| Side nav / Aggregation chrome | Do not invent; if app shell requires a persistent desktop rail outside Social, leave it — **do not** reintroduce Social switcher/search/bell strip above the thread |

---

## Dev ship checklist (one line)

**Ship:** DM thread route hides Social shell + phone tab dock · sole top chrome = density peer row 48 (name only) · rhythm 8 same / 16 other · composer 48+8 sticky on safe-area without dock · desktop same hide + column 680 · keep format/membership/Send · Media Immersion on story cards · no call-icon invent.

---

## FAIL / PASS

**PASS:** Feels like IG Direct real estate — messages dominate; one slim header; slim composer; no product shell/tabs.  
**FAIL:** Shell + dock still eating half the phone (ref 01) · soft flat media · reopening membership · inventing IG call trailing · putting handle back in header.

---

## Keep closed

- `dm-thread-header-density-lock-v1.md` — label/geometry (host superseded here)  
- `dm-thread-message-format-lock-v1.md` — bubbles · date/time · cards  
- `dm-vs-group-membership-lock-v1.md` v1.1  
- `stories-send-dm-craft-lock-v1.md` v1.5  

---

## Label

**[Global Content][24Frame]** DM thread immersive real-estate v1 — hide shell+dock · IG feel chrome
