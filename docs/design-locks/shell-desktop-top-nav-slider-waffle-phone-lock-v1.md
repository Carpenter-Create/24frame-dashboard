# [GC][24Frame] LOCK — Desktop top nav slider; waffle phone/tablet only v1

**Date:** 2026-09-29 (CT)  
**Status:** **LOCKED** (Adam / CoS) · **Explore desktop header + Exit** amend 2026-09-29 · Design Own→READY · CoS seeds `docs/design-locks/` · DRAFT stays draft until founder undraft  
**Scope:** Host split for **Layer 1 workspace chrome**, plus the desktop Explore header and Exit.  
**Entity:** Global Content / 24Frame only  
**Amends:** [`shell-workspace-waffle-layer-lock-v1.md`](shell-workspace-waffle-layer-lock-v1.md) for **where** the waffle lives. That lock’s Layer 1 tile inventory, entitlement gating, and Social Layer 2 dock stay.  
**Restores:** the desktop sliding workspace row #699 removed from the header (`presentation="pills"` / `data-app-header-workspace-desktop`).  
**Does not restore:** the labeled workspace pill (`tone="pill"` / `data-app-header-workspace-pill`).  
**House split:** `md` (768). Below `md` is the phone/tablet shell. `md` and up is desktop. Same breakpoint as the floating dock (`md:hidden`) and the pre-#699 slider (`hidden md:contents`).

---

## One lock

**One Layer 1 inventory. Two chrome faces.**

| Host | Chrome |
|------|--------|
| Desktop (`md+`) | Horizontal **sliding** workspace row in the header. **No waffle.** |
| Phone + tablet (`max-md`, house phone shell) | **Waffle** in the header utility cluster. **No** top slider. Floating bottom dock stays Layer 2. |

Slider and waffle list the same lanes, in the same order, with the same entitlement gate: **Social · Education · Aggregation** (if entitled) **· Staff** (if entitled). Hide a lane the org/user lacks. No dead tiles.

---

## 1) Desktop — sliding Layer 1 row

| Token | Lock |
|-------|------|
| Face | Prior segmented track: one muted bar, sliding accent thumb, full workspace words |
| Inventory | Layer 1 only. Same order as the waffle tiles |
| Placement | Header trailing cluster, **before** Ask · bell · avatar. Slot `data-app-header-workspace-desktop`. Class `hidden md:contents` |
| Waffle | **Hidden** (`md:hidden` on the waffle host) |
| Forbidden in the slider | Social Layer 2 (Home / Explore / Create / Messages / Profile) · Home · Co-Productions · a labeled name+chevron pill |
| Single entitled lane | Static workspace word. No fake tablist. No chevron pill |
| Entitlement | Unchanged. Staff only when `isGcStaff` |

The slider is not a second header row and not the phone lead.

---

## 2) Phone + tablet — waffle stays

| Token | Lock |
|-------|------|
| Control | Icon-only waffle (9-dot). Accessible name **Workspaces** |
| Placement | Utility cluster: **search · optional · bell · waffle · avatar** |
| Host | `max-md` only. Wrapper `data-app-header-workspace-waffle` is `md:hidden` |
| Panel | Existing phone sheet of Layer 1 tiles. Current tile marked |
| Top slider | **Absent** (desktop host is `hidden` below `md`) |
| Dock | Lock A floating dock stays. Social tabs stay **Home · Explore · Create · Messages · Profile** |
| Workspaces in the dock | **FORBIDDEN** |

Do not move primary workspace tabs to the top of the phone.

---

## 3) Desktop Explore — header above the media

Phone Explore stays immersive. This section is **desktop `md+` only**.

| Token | Lock |
|-------|------|
| Route | `/social/explore` |
| Header | House header **above** the media. Logo + the sliding Layer 1 row from §1. Not a viewport trap |
| Stage | Media fills the column **under** the header (`md:absolute md:inset-0` on the scroll column). It does not use unprefixed `fixed inset-0` |
| Exit | Labeled **Exit** (`SOCIAL.explore.exit`). Desktop header only. Href is Social home (`/social`). A same-origin referrer whose path is not Explore uses history instead |
| Waffle | Hidden. Same `md:hidden` host as §1 |
| Phone | Header host is `hidden` below `md`. Stage stays `max-md:fixed max-md:inset-0`. Floating dock Lock A stays. No Exit on the phone face. No top slider |
| Dest rail | Stays out |
| Discovery search | Stays overlay chrome on the media. It does not replace this header |

---

## 4) Explicit OUT / no invent

- Do **not** put workspaces in the Social dock  
- Do **not** put Social Layer 2 tabs in the desktop slider  
- Do **not** put the slider on the phone  
- Do **not** show the waffle on desktop  
- Do **not** restore the labeled Social / workspace pill  
- Do **not** change entitlement rules, the avatar menu, or the dock tab set  
- Do **not** invent a third workspace menu  
- Do **not** leave desktop Explore as a viewport-fixed stage with no header above the media  
- Do **not** put Exit, the slider, or the waffle on phone Explore  

---

## Gates

**G1.** Desktop markup hosts the sliding row (`data-workspace-switcher-presentation="pills"`) inside `hidden md:contents`.  
**G2.** Waffle host is `md:hidden`. Desktop does not show the 9-dot control.  
**G3.** Slider labels equal waffle tiles: Social · Education · Aggregation · Staff when entitled. No Home, Explore, Create, Messages, Profile, or Co-Productions.  
**G4.** Phone dock tab set is unchanged. Workspaces are not dock items.  
**G5.** No labeled pill host (`data-app-header-workspace-pill` / `tone="pill"`).  
**G6.** Desktop Explore markup includes the house header (`data-house-lead-chrome`) inside `hidden md:contents`, before the stage, with labeled Exit to `/social`.  
**G7.** Explore frame is `max-md:fixed max-md:inset-0` and `md:absolute md:inset-0`. Phone dock still mounts. Dest rail stays absent.

---

## Verify-on-ship

1. Desktop Social: header shows the sliding workspace row; waffle is not in the utility cluster.  
2. Desktop row switches Social · Education · Aggregation (Staff only when entitled). Dock tabs are not in that row.  
3. Phone: waffle between bell and avatar; no workspace slider in the header; Social dock is Home / Explore / Create / Messages / Profile.  
4. Org lacking Aggregation or Staff: that lane is absent on both faces.  
5. Desktop Explore: logo and the sliding row sit above the media. Exit leaves for the prior in-app route, or Social home. Waffle is not in that header.  
6. Phone Explore: no header, no Exit, no top slider. Media is viewport-fixed. The floating dock remains.

---

## Repo citation

`docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`  
Amends `docs/design-locks/shell-workspace-waffle-layer-lock-v1.md`.
