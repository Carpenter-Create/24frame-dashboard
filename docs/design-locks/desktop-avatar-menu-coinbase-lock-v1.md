# [GC][24Frame] LOCK — Desktop avatar account menu (Coinbase grammar) v1

**Date:** 2026-09-22 (CT)  
**Status:** **LOCKED** (Adam craft ask) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Scope:** **Desktop avatar → account MenuSurface face only**  
**Related:** `house-overlay-dual-host-lock-v1.md` (desktop host = MenuSurface) · `mobile-menu-family-tree-lock-v1.md` (phone Family **A** unchanged) · PR **#648** menu hard-gate (desktop face must match **this** lock, not SheetGroup cards)
**Amended 2026-10-08:** [`staff-account-menu-lock-v1.md`](staff-account-menu-lock-v1.md) (Adam). GC staff get a **Staff** row first, above Settings: a flat row with the 20 Tray glyph, `/staff/queue`. Members never get it. The phone sheet (Family A) gains a Staff inset card first, in the same grammar. The Coinbase face is otherwise unchanged.  

## One lock

| Host | Face |
|------|------|
| **Phone** | Family **A** — AppSheet + inset **SheetGroup** cards. **Do not change.** |
| **Desktop** | **MenuSurface** + **Coinbase account-menu grammar** + **keep Sporty Blue top bar** on the panel |

Phone sheet grammar on desktop (large stacked avatar + inset grouped cards) is **FORBIDDEN** under dual-host.

---

## Desktop geometry (concrete)

### Panel (`MenuSurface` account face)

| Token | Lock |
|-------|------|
| Width | **280** |
| Radius | **12** |
| Surface | `#FFFFFF` |
| Edge | Hairline `#ECEDF0` 1px · **no** drop shadow |
| **Sporty Blue top bar** | **`#1769FF` · height 4** · full panel width · flush to top inside the 12 radius clip · **KEEP** (24Frame distinctive — do not remove to “match Coinbase chrome”) |
| Anchor | Trailing under header avatar trigger |
| Max height | Content-hug (no tall empty panel) |

### Identity head (horizontal — Coinbase)

| Token | Lock |
|-------|------|
| Layout | **Row:** avatar **left** · name + email (+ optional link) **right** — **not** stacked/centered |
| Avatar | **40** diameter circle |
| Avatar → text gap | **12** |
| Name | `t-lg` / 1.0625rem · ink `#14171A` · medium · one line (ellipsis only if overflow; prefer full name) |
| Email | `sm` / 0.8125rem · secondary `#5E646E` · one line |
| Optional manage link | Under email · `sm` · Sporty Blue `#1769FF` · label **Manage account** → Profile (or omit if product maps Profile only via Settings — prefer **include**) |
| Head pad | **16** all sides (below the 4px blue bar) |
| Head → body | Hairline `#ECEDF0` full width |

### Body rows (flat — not inset cards)

| Token | Lock |
|-------|------|
| Row min height | **44** |
| Horizontal pad | **16** |
| Icon | Phosphor outline **20** · leading · ink `#14171A` (destructive row uses danger color) |
| Icon → label gap | **12** |
| Label | Body 0.9375rem · ink |
| Hover / focus wash | Full-bleed row · muted `#F4F4F6` · **no** inset card radius |
| Dividers between rows | **None** (flat list). Optional single hairline only before destructive if needed for air — prefer **no** mid-list hairlines |
| Chevrons | **None** on Settings · Get Help · Log out. Theme is the drill exception: stored value + CaretRight. See [`theme-chrome-avatar-only-lock-v1.md`](theme-chrome-avatar-only-lock-v1.md). Not a trailing toggle |
| Inset muted cards / SheetGroup | **Forbidden** on desktop |

### Row inventory (24Frame desktop — same jobs, new grammar)

1. **Settings** — icon gear · navigates Settings  
2. **Theme** — icon moon/sun · stored value + chevron · drills to `/settings/theme` (same picker as Preferences). Not a trailing toggle. Not a SheetGroup card  
3. **Get Help** — icon question/life-preserver  
4. **Log out** — destructive: icon + label in **danger red** (Coinbase Sign out). **Not** Sporty Blue text on a tinted card  

Version string (`v0.x.x`) optional footer: `sm` secondary · pad **12** bottom · not a card.

### Copy note

Prefer **Log out** (existing 24Frame) or **Sign out** (Coinbase) — pick **Log out** for continuity; styling is destructive either way.

---

## Explicit OUT

- Do **not** change phone Family A AppSheet / SheetGroup SoT  
- Do **not** apply Coinbase flat rows to the phone sheet  
- Do **not** remove the **4px Sporty Blue top bar**  
- Do **not** invent a third menu family (still Family A job → desktop MenuSurface face)  
- Do **not** keep large stacked avatar + inset cards on desktop  
- Do **not** style Log out as Sporty Blue card (desktop)  
- Design does **not** open a PR  

## Gates

**G1.** Desktop avatar menu = MenuSurface 280 · radius 12 · blue top bar 4 · horizontal identity 40.  
**G2.** Body = flat icon rows height 44 — **zero** SheetGroup / inset cards.  
**G3.** Log out = destructive red flat row.  
**G4.** Phone AccountSheet still matches Family A (inset groups) after this ships.  
**G5.** #648 / menu hard-gate desktop face cites this lock (or successor path under `docs/design-locks/`).

## Verify-on-ship

1. Mac desktop: open avatar menu — horizontal identity, flat rows, blue 4px top bar present.  
2. Mac desktop: no inset grey cards; no large centered avatar stack.  
3. Mac phone: Account sheet unchanged (inset groups).  
4. Hard-refresh Social + Aggregation headers — same desktop face.

## Evidence

- 24Frame fail (stacked + inset cards): `/workspace/24frame-agg-ux/desktop-avatar-menu-24frame-fail.png`  
- Coinbase grammar ref: `/workspace/24frame-agg-ux/desktop-avatar-menu-coinbase-ref.png`

## Repo citation

CoS seeds: `docs/design-locks/desktop-avatar-menu-coinbase-lock-v1.md`
