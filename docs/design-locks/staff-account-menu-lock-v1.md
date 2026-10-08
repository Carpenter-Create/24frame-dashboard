# [GC][24Frame] LOCK — Staff leaves the workspace switcher for the account menu v1

**Date:** 2026-10-08 (CT)  
**Status:** **LOCKED** (Adam, 2026-10-08, in chat — recorded from the founder-authorized task brief) · Design Own→READY  
**Scope:** Where GC staff reach `/staff`: the workspace switcher (desktop slider, `md` to `lg` popover, phone sheet) and the account menu (desktop MenuSurface, phone account sheet). No `/staff` page bodies, no Staff dock or side menu, no access rule.  
**Entity:** Global Content / 24Frame only  
**Mockup:** canvas https://claude.ai/artifact/8SaQn5Fc2YsDuiqTEo1SpR — board "Account menu · GC staff · Staff row" (Departure 1).  
**Supersedes (in part):**
- [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) §1 Switcher order ("Staff only when `isGcStaff`, last"), §3 Waffle tiles ("Staff when entitled"), G1's and G5's `staff`.
- [`shell-workspace-waffle-layer-lock-v1.md`](shell-workspace-waffle-layer-lock-v1.md) §3 Workspaces ("Staff (if entitled)").
- [`shell-desktop-top-nav-slider-waffle-phone-lock-v1.md`](shell-desktop-top-nav-slider-waffle-phone-lock-v1.md) the Staff lane in its inventory, G3, and Verify-on-ship 2.
- [`shell-screening-chrome-lock-v1.md`](shell-screening-chrome-lock-v1.md) §3, the grid button naming "Staff".
- [`shell-coinbase-register-lock-v1.md`](shell-coinbase-register-lock-v1.md) Keeps ("Staff last, staff only") and the GC staff slider width in Assumption 1.
- [`desktop-avatar-menu-coinbase-lock-v1.md`](desktop-avatar-menu-coinbase-lock-v1.md) the row list: GC staff get Staff first. Its Coinbase face is unchanged; the phone sheet stays Family A (one more inset card, the same grammar).

---

## Founder direction (verbatim, 2026-10-08)

Put to Adam: should Staff be a workspace item or a place reached from the avatar menu? The recommendation, as Adam quoted it back:

> I'd move Staff into the avatar menu instead of making it a workspace—it keeps clients from ever seeing it, fixes the four-item fit at 320px, and stays consistent between desktop and mobile.

> do that.

> ship the Staff move first

> the /staff option must not appear in the menu for non staff users.

> can we make that restriction (do not appear if user is not staff account)?

> do not appear and user cannot access

---

## 1) Workspace switcher, every face

| Token | Lock |
|-------|------|
| Lanes | **Home · Aggregation · Social · Education**, the same for members and GC staff. No Staff segment, tile, or prefetch |
| Gate | `WORKSPACE_WAFFLE_ORDER` leaves Staff out, so even a forged `"staff"` option never draws. `availableWorkspaceOptions()` takes no staff gate |
| Staff pages | Light no lane, as Settings and Activity do: the desktop slider's one Tab stop is Home; the phone grey pill is the grid alone (accessible name "Workspaces") |
| Cookie | Unchanged. A `staff` cookie already set still clamps on `isGcStaff`; no switcher hop writes it now |

## 2) Account menu — GC staff only

| Token | Lock |
|-------|------|
| Row | **Staff** (`WORKSPACE_STAFF_LABEL`, the existing copy) → `/staff/queue` (the existing Staff land) |
| Gate | The server's `gc_staff` answer (`getOrgContext` → `AppShellChrome.isGcStaff`), never a cookie or the client. **Off by default**: for a member, before the shell chrome resolves, and when it fails, there is no row |
| Desktop | First flat row under the head hairline, above Settings: the 20 Tray glyph (the old Staff tile's) and the label, on the shared row class. No chevron (Theme keeps the only one) |
| Phone | Its own inset card, first, above Settings + Theme: the shared inset row (label and chevron) |
| Members | No Staff row, card, or `/staff` link anywhere in either menu |

## 3) Access — unchanged, restated

Every `/staff/*` page lives under the `(operator)` route group. Its layout checks `gc_staff` on the server and redirects anyone else to `/` (covered by `src/app/(app)/(operator)/layout.test.ts`). The menu row is a door, not a grant; RLS stays the authorization layer.

---

## Departures

1. The mockup board draws leading icons on the phone sheet's rows. The live sheet has none (Settings, Theme, and Get Help are label and chevron), so the phone Staff row follows the live grammar. Desktop rows already carry a glyph, so the desktop Staff row does too.

## Explicit OUT

- Staff as a workspace lane, tile, segment, or prefetch
- A Staff row for members, or one driven by a cookie or anything the browser can set
- New copy: the label stays **Staff**
- Any change to the `/staff` pages, the Staff dock or side menu, or the `(operator)` gate
- The phone workspace band (its own lock, later)

---

## Gates

**G1.** Desktop slider: segments `home`, `aggregation`, `social`, `education` for members and GC staff; none lit on `/staff/*`.  
**G2.** Waffle (phone sheet, `md` to `lg` popover): tiles `aggregation`, `social`, `education`; never `staff`, even from a forged option; the pill names no workspace on `/staff/*`.  
**G3.** Desktop account menu: GC staff get `data-account-menu-row="staff"` first, `href="/staff/queue"`; members get none.  
**G4.** Phone account sheet: GC staff get the `data-sheet-group-id="staff"` card first; members get none.  
**G5.** The menu's `isGcStaff` comes from the shell chrome (server); it defaults to `false`.  
**G6.** `/staff/*` still redirects a non-staff user to `/`.

## Verify-on-ship

1. As a member, desktop and phone: the avatar menu has no Staff row. Visiting `/staff/queue` directly lands on `/`.
2. As GC staff, desktop and phone: the avatar menu shows Staff first and opens `/staff/queue`; there the switcher lights no lane.
3. Nobody sees a Staff tile or segment in the switcher.
