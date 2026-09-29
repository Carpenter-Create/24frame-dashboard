# [GC][24Frame] LOCK — Shell craft: waffle workspace switch + Social Layer 2 dock v1

**Date:** 2026-09-28 (CT)  
**Status:** **LOCKED** (Adam CLEAR 2026-09-28 · CoS craft ask) · Design Own→READY · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS CLEARs Dev DRAFT  
**Scope:** House **header workspace control** + **Social Layer 2 dock** IA only. Universal header utility grammar.  
**Entity:** Global Content / 24Frame only  
**House:** Coinbase register · Geist · Sporty Blue `#1769FF` · spacing 8/16/24/48 · hairline · **no** drop shadows · Launch-great · quiet redundant-chrome  
**Supersedes:** `workspace-switcher-sliding-pill-miss-list-v1.md` · `workspace-desktop-sliding-pill-miss-list-v1.md` (sliding-pill / labeled workspace control in header)  
**Related:** `desktop-avatar-menu-coinbase-lock-v1.md` (avatar MenuSurface — unchanged) · `dashboard-coinbase-shell-miss-list-v1.md` (quiet utilities SoT) · Coinbase shell shots `/workspace/24frame-agg-ux/coinbase-shell-sot/`  
**No invent** beyond Adam voice in this brief.

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
- Do **not** restore sliding-pill workspace names in the header  
- Do **not** invent Layer 3 chrome, new dock tabs, or waffle tile destinations beyond Adam list  
- Do **not** change entitlement rules  
- Do **not** restyle avatar menu beyond existing Coinbase avatar lock  
- Design does **not** open a PR  

---

## Gates

**G1.** Header has **no** Social pill / labeled workspace dropdown / sliding-pill names.  
**G2.** Waffle sits in utility cluster: **search · optional · bell · waffle · avatar**; optical size matches peers.  
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
