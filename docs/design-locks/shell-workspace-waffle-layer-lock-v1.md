# [GC][24Frame] LOCK — Shell craft: waffle workspace switch + Social Layer 2 dock v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** (Adam CLEAR 2026-09-28 · CoS craft ask) · Design Own→READY · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS CLEARs Dev DRAFT  
**Scope:** House **header workspace control** + **Social Layer 2 dock** IA only. Universal header utility grammar.  
**Entity:** Global Content / 24Frame only  
**House:** Coinbase register · Geist · Sporty Blue `#1769FF` · spacing 8/16/24/48 · hairline · **no** drop shadows · Launch-great · quiet redundant-chrome  
**Supersedes:** `workspace-switcher-sliding-pill-miss-list-v1.md` · `workspace-desktop-sliding-pill-miss-list-v1.md` (sliding-pill / labeled workspace control in header)  
**Related:** `desktop-avatar-menu-coinbase-lock-v1.md` (avatar MenuSurface — unchanged) · `dashboard-coinbase-shell-miss-list-v1.md` (quiet utilities SoT) · Coinbase shell shots `/workspace/24frame-agg-ux/coinbase-shell-sot/`  
**No invent** beyond Adam voice in this brief.  
**Amended 2026-10-08:** [`staff-account-menu-lock-v1.md`](staff-account-menu-lock-v1.md) (Adam). No Staff tile: the Layer 1 tiles are **Aggregation · Social · Education** for everyone, and GC staff reach `/staff` from the account menu's Staff row. Supersedes §3 Workspaces "Staff (if entitled)".  
**Amended 2026-10-04 (screening chrome):** [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) (Adam, "Yes, everywhere"). The phone grid button sits right after the emblem and **names the current workspace** (13 / 500, ink) — supersedes "no workspace name in the header" and the trailing-cluster placement. It still opens the same Layer 1 tiles; no dropdown, no slider on the phone. Every dock marks the current dest with an ink glyph and an ink dot.  
**Amended 2026-10-04:** [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) (Adam). Waffle tile order is **Aggregation · Social · Education · Staff** (the desktop lane order). The Social dock's first tab is **Feed** (route `/social`), not Home. Dock Create is an accent circle inside the pill. Layer 1 vs Layer 2, entitlement, and the phone waffle stay.  
**Amended 2026-09-29:** [`shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`](shell-desktop-top-nav-slider-waffle-phone-lock-v1.md) splits the host. Waffle is **phone/tablet (`max-md`) only**. Desktop (`md+`) restores the Layer 1 sliding workspace row and hides the waffle. Desktop Explore uses that same header **above** the media, plus a labeled Exit. Phone Explore stays headerless. Layer 1 inventory, entitlement, and the Social Layer 2 dock in this lock stay.

---

## One lock

**Layer 1 = workspaces** (house destinations). Trigger = **Coinbase-style waffle (grid) icon** in the header utility cluster — **not** a Social pill, labeled dropdown, or sliding-pill of workspace names.

**Layer 2 = Social in-workspace nav** = existing **hide-on-scroll floating bottom dock** (Home / Explore / Create / Messages / Profile). Workspaces **never** live in the dock.

---

## 1) Kill Social pill / dropdown in header

| Token | Lock |
|-------|------|
| Social labeled pill | **OUT** of header |
| Social / workspace name dropdown in header | **OUT** |
| Sliding-pill row of workspace names in header | **OUT** (superseded) |
| Header density | **No** Social label · cut uneven optical scale vs search / bell / avatar |

Header no longer announces the current workspace with a named pill or menu trigger text.

---

## 2) Workspace switch = waffle icon (header utility cluster)

| Token | Lock |
|-------|------|
| Control | **Waffle / grid** icon button (Coinbase-class apps grid) |
| Placement | Header **utility cluster**, trailing: **search · optional · bell · waffle · avatar** |
| Optional slot | Existing house optional utility only (e.g. help / AI when already entitled in that chrome) — **do not** invent a new optional |
| Optical size | **Match** search / bell / avatar icon optical scale — quiet circular / soft hit · **not** a labeled pill · **not** larger than peers |
| Label on trigger | **None** (icon only; accessible name e.g. **Workspaces** / **Switch workspace**) |
| Active affordance | Same quiet utility grammar as bell — no Sporty Blue fill on the waffle itself unless house already tints open-state utilities that way |

Cite Coinbase shell SoT: quiet circular utilities including **grid** beside bell / avatar (`coinbase-shell-sot/`).

---

## 3) Waffle panel = Layer 1 only

Open waffle → **panel / MenuSurface-class face** of **Layer 1 workspaces** (and entitled house accounts as needed). Not a Social destinations list.

| Token | Lock |
|-------|------|
| Contents | **Layer 1 workspaces only** — sectioned **tiles** |
| Workspaces | **Social** · **Education** · **Aggregation** (if entitled) · **Staff** (if entitled) |
| Account block | **Account / Settings / Help** as needed (same jobs as today — do not invent new destinations) |
| Current workspace | **Marked** (selected tile / check / quiet active wash — house grammar; one clear current) |
| Entitlement gating | **Unchanged** — hide tiles the org/user lacks; **no** dead tiles |
| Forbidden in panel | Social Layer 2 destinations (Home / Explore / Create / Messages / Profile) · inventing new workspaces · marketing copy slabs |

Desktop host may use MenuSurface (peer to avatar menu). Phone host may use existing overlay family for the same **tile IA** — dual-host face only; **same Layer 1 inventory**. Do not invent a third menu family.

---

## 4) Layer 2 — Social floating bottom dock (unchanged job)

| Token | Lock |
|-------|------|
| Surface | Social **hide-on-scroll floating bottom dock** |
| Tabs | **Home · Explore · Create · Messages · Profile** |
| Workspaces in dock | **FORBIDDEN** |
| Density | **Slim** dock |
| Icon optical scale | **Match** header utility icons (same quiet optical weight — cut uneven scale) |
| Behavior | Existing hide-on-scroll stays; do not regress immersive hide rules already locked (e.g. DM thread / Stories viewer / Explore full-bleed) |

Layer 2 is **in-Social** only. Switching Aggregation ↔ Social ↔ Education is **waffle only**.

---

## 5) Explicit OUT / no invent

- Do **not** put workspaces in the Social dock  
- Do **not** keep a Social (or any workspace) **labeled pill** in the header  
- Do **not** restore sliding-pill workspace names on the **phone** header. Desktop `md+` is amended by `shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`  
- Do **not** invent Layer 3 chrome, new dock tabs, or waffle tile destinations beyond Adam list  
- Do **not** change entitlement rules  
- Do **not** restyle avatar menu beyond existing Coinbase avatar lock  
- Design does **not** open a PR  

---

## Gates

Desktop host face is amended. G1–G2 below apply to the **phone/tablet** header. Desktop `md+` follows `shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`.

**G1.** Phone header has **no** Social pill / labeled workspace dropdown / sliding-pill names.  
**G2.** On phone/tablet, waffle sits in the utility cluster: **search · optional · bell · waffle · avatar**; optical size matches peers. Desktop hides the waffle.  
**G3.** Waffle panel = Layer 1 sectioned tiles; current marked; entitlement gating unchanged.  
**G4.** Social dock remains Layer 2 only (Home/Explore/Create/Messages/Profile); **no** workspaces in dock; slim; icon scale matches header.  
**G5.** No invent beyond this IA.

---

## Verify-on-ship

1. Mac desktop Social: header shows waffle (not Social pill); open → Layer 1 tiles; current Social marked.  
2. Switch to Aggregation / Education (when entitled) via waffle; dock does **not** list those workspaces.  
3. Social dock: five tabs only; slim; icons optically match header utilities.  
4. Org lacking Aggregation/Staff: those tiles absent (no dead tiles).  
5. Phone: same IA — waffle Layer 1; Social dock Layer 2; no workspace names stuffed into dock.

---

## Repo citation

CoS seeds: `docs/design-locks/shell-workspace-waffle-layer-lock-v1.md`  
Box craft: `/workspace/24frame-agg-ux/shell-workspace-waffle-layer-lock-v1.md`
