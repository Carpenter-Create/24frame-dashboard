# [GC][24Frame] LOCK — Add right: the window over the title's rights v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "approved, use the defaults") · Design Own→READY
**Gate:** Reserved (legal: rights grants). Codex findings block merge; the founder alone merges.
**Scope:** Aggregation title detail: adding a rights grant to a title. Covers the host, the one draft, the review and the one add, leaving with changes, the address, and who may add.
**Entity:** Global Content / 24Frame only
**Follows:**
- [`aggregation-title-details-window-lock-v1.md`](aggregation-title-details-window-lock-v1.md) (the Metadata window over the same page);
- [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md) (the house window);
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md) (the object-edit job, amended with this lock);
- [`house-dual-host-primitive-audit-v1.md`](house-dual-host-primitive-audit-v1.md) row "Extend HousePageSelect" (PR 1 of 2, #802: `HousePageSelectOptions` with `inline`, `multiple` and an option `detail`).

**Supersedes:** The always-open Add right form at the top of the title page's Rights & territories card (`add-rights-form.tsx`, removed).

---

## Founder direction (verbatim)

Asked to build the window audit's recommendations (recommendation #4, Add a right):

> make sure we do your recommendations above, resolve any flaw or security issues, and let me know if you still need me to answer anything that I may have missed.

— Adam, 2026-10-09

The window's questions, answered on 2026-10-09:

> approved, use the defaults

On building this window after PR 1 and the Comments window's height change:

> ok, approved

Each question below was decided by "approved, use the defaults": the default is the decision.

| Question | Decision (the default) |
|----------|------------------------|
| 1. Who may add a right? AGENTS.md says rights grants are "GC/Owner-write"; the live `add_rights_grant` (`member_can` operate) and domain-spec §4 ("Rights/territory is Delivery Ops' job, by design") also allow delivery ops. | Keep today's gate: account owner and delivery ops of the title's org, enforced by the existing RPC. Any narrowing is a separate founder-approved RLS/RPC change. |
| 2. Should Add right appear at every title status, including takedown requested, taken down and archived? Neither the page nor the RPC checks status today. | Parity: every status, as today. A gate would go in the page and the action, and in the RPC as founder SQL. |
| 3. domain-spec §7/§9 prices a rights change after submission at $97. Adding a right is free today, and no code charges it. Charge or mention it? | No fee and no fee copy (parity). Billing is its own slice. |
| 4. Done adds only from the index: on a face, a complete draft returns to the index so all three summaries are in view, and a second Done adds. (Metadata saves from any face.) | Yes, for a permanent legal record: Done adds only from the index. |
| 5. The same right with the same territory set is already active: (a) with the same exclusivity, (b) with the opposite one (a second, contradictory permanent row; no correction path exists). | In both cases add nothing, keep the window open, and show "{grant} is already on this title." naming the existing grant. A grant covered by a broader one (US under Worldwide) is still allowed. |
| 6. Territory default: today's form pre-chooses Worldwide. No default instead, like Exclusivity? | Keep Worldwide pre-chosen (today), shown on the index review before Done. |
| 7. Window height: 80vh on a computer (the Comments window's `fill`), so the 249 countries and the 21 rights have room. | Yes, 80vh. |
| 8. Show each right's taxonomy description from `lib/rights.ts` under its label (e.g. SVOD, "Subscription streaming.")? Founder-supplied, never shown to users before. | Show them. |
| 9. The exclusivity explanation, reused verbatim, reads "Exclusive: only you may distribute this right in these territories. Non-exclusive: others may too." Legal-adjacent: is "only you" the right party? | Reuse it verbatim. Change it only with founder or legal wording. |
| 10. Approve the four new lines: "Choose at least one country.", "Search countries", "No countries match.", "{grant} is already on this title." | Approved as written. |
| 11. The dual-host lock defines a window as "one object edited over the page that shows it"; Add right adds one record to the list it shows. Amend the rule, and add two shell lines (Tab skips tabindex -1; a long-list window may open at 80vh)? | Approved with this lock (the amendment is in [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md)). |
| 12. One row per PR: ship the HousePageSelect list extension (PR 1) before the window (PR 2)? | Two PRs, PR 1 first. PR 1 merged as #802; this is PR 2. |
| 13. Window or holdback dates (the RPC accepts them; §9 says they exist) and continent shortcuts (§9, "world / continent / country") in v1? | Neither in v1. Three rows; grants keep null windows. Countries are grouped by continent with search; shortcuts come later with their own copy. |
| 14. Draft SQL follow-ups (not applied, their own PR, founder-applied): (a) a deleted-title guard in `add_rights_grant`; (b) an in-RPC same-scope check; (c) ignore or clamp `p_effective_from` for non-staff callers. | Draft all three for review after the window ships (Follow-ups, below). The window's action already covers (a) and (b) for the app path. |

---

## 1) Desktop — the window

The house window shell (`components/chrome/house-window`) over the title page. There is no route change and no skeleton, and the page behind stays as it is.

| Token | Lock |
|-------|------|
| Geometry | The 600 window (`HOUSE_DIALOG_WINDOW_CLASS`), filling 80vh (`fill`, `HOUSE_WINDOW_FRAME_FILL_CLASS`): it never takes a held height, so opening at a face looks the same as opening at the index. |
| Header | ✕ (index) or ‹ (face) · title · Done. |
| Title | "Add right" on the index; on a face, its name. |
| Index | One card of three rows with live summaries. Rights type: the right's label, or "—". Territory: "Worldwide"; the mode ("Only these countries" / "Worldwide except") while no country is chosen; otherwise the full line, every country by name, never capped or cut. Exclusivity: "Exclusive" / "Non-exclusive", or "—". The intro line sits under the card. |
| Rights type | One grouped list of the 21 rights in their 5 categories, each with its taxonomy description; one chosen. |
| Territory | Worldwide / Only these countries / Worldwide except. When not Worldwide: the full chosen line, a "Search countries" field that stays in view while the list scrolls, and the 249 countries grouped by continent with checks. A search ignores case and accents and also finds a code or common name ("uk" finds United Kingdom, "cote" finds Côte d'Ivoire). Each mode keeps its own picks: picks under Only these countries never become exclusions, and switching back loses nothing. |
| Exclusivity | Exclusive / Non-exclusive, nothing pre-chosen, with today's explanation. |
| Lists | HousePageSelect's own option list, inline (`HousePageSelectOptions`): ↓ ↑ Home End move, typing jumps to a label, Enter or Space picks, and Tab is one stop per list. Never a native select, a popover or a second select. |
| Motion | A face slides in from the right; Back slides the index in from the left. 220ms; none under reduced motion. |
| Esc | The shell's order: the ask (Keep editing), then a face (Back), then the window. A list is never a house menu, so Esc on a face goes Back. A double Esc never discards. |
| Keys | ⌘/Ctrl+Enter is Done. Tab stays inside the window and counts only real Tab stops (shell line, below). |
| Focus | Rights type lands on the chosen right, or the first. Territory and Exclusivity land on their first radio (the shell's first-field rule). |

## 2) Phone — the same window as the full sheet

The same header, index and faces fill the full AppSheet (`APP_SHEET_FULL_HOST_CLASS`) over the title page, clear of the status bar and the home indicator. There is no separate route. A resize swaps the host and keeps the draft. Radios stack; every line wraps; nothing is truncated.

## 3) One draft, one Done

- The draft starts empty on every open. It is never taken from the address.
- Done checks in face order (Rights type → Territory → Exclusivity). On a problem, Done goes to that face and shows its line above the list, so it is in view. Nothing is sent.
- On a face, a complete draft returns to the index: the review, with all three summaries in view. Nothing is sent.
- On the index, Done adds. It waits for the server: the window is inert, and ✕, Esc, the scrim and Back wait too. It sends one right, its territory and its exclusivity: no org and no window dates.
- Success: the grant is added, the window closes, the new row is first in the list behind, and focus returns to Add right.
- Never optimistic: a grant is permanent, so the row appears only once the database has it.
- If the same right and territory set is already active on the title (either exclusivity), nothing is added. The window stays open on the index with "{grant} is already on this title.", naming the grant in full, and the page refreshes when it closes.
- A request that fails outright (a dropped connection) shows "Could not save."; the page refreshes when the window closes, since what the server kept is unknown.

## 4) Leaving with changes

The same ask as Metadata and Edit profile, naming the changed rows ("Rights type and Exclusivity aren't saved."). Only effective changes count: countries held under a mode not chosen are not a change. On desktop it is a strip at the window's foot: Discard, then Keep editing (focused). On a phone it is the AppSheet card: Keep editing first (focused), then Discard, stacked full width. Reloading or closing the tab raises the browser's own prompt.

## 5) Address

- `?add-right` opens the index; `?add-right=type|territory|exclusivity` opens that face. An unknown face opens the index.
- The window writes its own history entry with the browser's own call, so browser Back closes it, asking first when there are changes.
- An address that arrives with `?add-right` (a new tab) opens the window at both widths, with an empty draft.
- One window per title-page address: with `?edit` and `?add-right`, only Metadata opens, and the page under it carries neither query. Closing either window strips both (`TITLE_PAGE_WINDOW_PARAMS`).

## 6) Who

- Operators only: account owner or delivery ops in the title's org (decision 1). Everyone else sees the grants with no control.
- Under view-as there is no control, and the action refuses.
- The action (`addRights`) takes nothing from the browser that decides who may write:
  - zod at the edge, from the lib vocabulary (pinned to the generated enums in tests); unknown keys (an org id, window dates, an effective date) are dropped;
  - view-as is refused before any read;
  - the title is read under row security, and never a deleted one; its org comes from that row;
  - only the title org's operators pass (parity with Metadata);
  - the right, territory and exclusivity are checked in face order, and territories resolve to real ISO codes;
  - the same right and territory set already active on the title adds nothing; that read fails closed;
  - the grant's time is the server's own;
  - database text is logged on the server; the browser gets "Not authenticated.", "Not authorized." or "Could not save.";
  - it revalidates the title's catalog path and its staff title page.
- The database stays the gate: `add_rights_grant` (SECURITY DEFINER, `member_can` operate, the title in the org), `rights_grants` row security, insert only (UPDATE and DELETE revoked), and the audit trigger. None of it changes here.
- Open authority conflict, flagged and unchanged: AGENTS.md says "GC/Owner-write"; the live RPC and domain-spec §4 also allow delivery ops. The database also admits custom roles with operate and GC staff, who see no control here (parity with Metadata).

## 7) Not

- No edit, contraction or removal of existing grants (§9: grants expand, never contract). The rows stay inline and read-only.
- No window or holdback dates in v1. No continent shortcuts in v1.
- No fee, and no fee copy.
- No exclusivity-conflict check at declaration: conflicts are computed at review (`same_work_conflicts`, a soft warning on the staff title page) and at delivery (`create_delivery`, a hard block). Another client's claim is never shown to a client.
- No native select, no comma-separated codes, no dialog over a dialog, no second select primitive.
- No SQL, migration or type regeneration in this change.

## Shell lines (amended into `house-overlay-dual-host-v1.md`)

- Tab and a face's first focus count only real Tab stops: an element with tabindex -1 is skipped (`houseWindowFocusables`).
- A window whose faces hold long lists may open at 80vh (`fill`; the Comments window's prop and class).

## Follow-ups (founder)

Draft SQL, not applied. Each goes in its own PR for founder review and is applied by the founder (`scripts/db/prod-migrate.sh --apply`):

1. `and t.deleted_at is null` in `add_rights_grant`'s title check, mirroring `create_asset` (20260917120100). The window's action already refuses deleted titles; a direct caller of the RPC does not yet.
2. An in-RPC same-scope check (or a unique index), so decision 5 holds for direct callers and for two tabs submitting in the same instant.
3. Ignore or clamp `p_effective_from` for non-staff callers (grant-event time, rule 8). The window sends server time; a direct caller can back-date.

Optional, test only: pgTAP cases in `supabase/tests/rights_grants_test.sql` (delivery ops and GC delivery ops may add, legal may not, a cross-org title and a non-member org are refused). Not in this change.

## Copy

**Existing, reused:** "Add right", "Rights type", "Territory", "Exclusivity", "Add one right at a time — each carries its own territory and exclusivity.", "Worldwide", "Only these countries", "Worldwide except", "Exclusive", "Non-exclusive" (moved to `EXCLUSIVITY_LABEL` in `lib/rights.ts`), "Exclusive: only you may distribute this right in these territories. Non-exclusive: others may too.", "Select a rights type.", "Choose exclusive or non-exclusive.", "No rights granted yet." (moved to `TITLE_DETAIL.rightsEmpty`), "Rights & territories", "—", "Close", "Back", "Done", "Discard changes?", "Keep editing", "Discard", the approved "{rows} isn't saved." / "{rows} aren't saved." with these row names, "Not authenticated.", "Not authorized.", "Could not save.", the rights categories, labels and descriptions (`lib/rights.ts`), and the country and continent names (`lib/territories.ts`).

**New, approved by Adam on 2026-10-09 ("approved, use the defaults"):**
- "Choose at least one country." — the Territory face's line when Only these countries or Worldwide except has no country. It replaces the developer text "Include/exclude requires at least one country" that reached users before.
- "Search countries" — the Territory face's search field (placeholder and accessible name).
- "No countries match." — the Territory face, when a search finds nothing.
- "{grant} is already on this title." — the index line when the same right and territory set is already active; {grant} is "{right} · {exclusivity} · {territory in full}", e.g. "SVOD · Exclusive · Ireland, United Kingdom".

## Notes from the build

- The line on a face sits above its list (under the Territory radios), not after it: the lists run to 21 and 249 rows, and the line must be in view when Done lands on the face.
- The "{grant}" line names countries in name order (the index review's full line), where the ledger row behind keeps `describeTerritory` (code order, four names then "+N", shared with the staff page and the deliver stepper).
- The Tab-trap change also skips one existing non-input tabindex -1 control: the avatar menu's dismiss scrim inside Edit profile. It was never meant to be a Tab stop.

## Gates

- `house-window.test.ts`: the selector pins hold; the trap counts only real Tab stops (not tabindex -1, an .sr-only input, or anything inert); closing strips a list of params and one param behaves as before; the fill class is 80vh.
- `house-page-select.test.tsx` (PR 1's guard): an inline list has a caller only now that the trap skips tabindex -1.
- `social-profile-edit-window.test.tsx`: Edit profile never fills; it still holds the height it opens at (the pin reads the shell's `fill` branch, as the Comments window's branch writes it).
- `title-details.test.ts`: Metadata's closed address strips `?add-right` too; both params are in `TITLE_PAGE_WINDOW_PARAMS`.
- `add-right.test.ts` (lib): the address, per-mode picks, effective changed rows and the ask's line, the check order and lines, the summaries (full, never "+N"), the type groups (21 in 5, with descriptions), the country search, the request (no org, no window), the same-scope match, the "{grant}" line, and the refusal mapper (never its input).
- `rights.test.ts`: the rights codes equal the database enum exactly once; every right has a label and description; the exclusivity labels.
- `territories.test.ts`: the modes equal the database enum; continents partition the 249 countries; the groups are in order and by name; the search; the full line; `resolveTerritories`; `describeTerritory` unchanged; `dashboard-register` still resolves territory references.
- `add-right-actions.test.ts`: a malformed request, a signed-out caller and view-as are refused with no read; a deleted or missing title, a viewer, legal and another org are refused; the org comes from the row, one right, server time, no window; the territory is checked first; Worldwide sends no countries; the same scope (either exclusivity, any order) adds nothing and names the grant; a failed read adds nothing; database text never reaches the browser; the catalog path, the layout and the staff title page are revalidated.
- `add-right-window.test.tsx`: both hosts, the 80vh frame, the header, rows and summaries, the faces (inline lists, one Tab stop, per-mode picks, the sticky search, no match, no pre-chosen exclusivity), unique ids, the entry, the one add path from the index only, the page wiring, and that the old form is gone.
- `house-overlay.test.ts` G4 and G5: the window draws `HouseWindowFrame`, never `HouseDrawerFrame`; the amended lock keeps its pinned lines.

## Verify on ship

1. Computer: Add right on the Rights card opens the 80vh window over the page, with no route change and the list visible behind the scrim.
2. Done on an empty draft → the Rights type face, with the chosen-or-first option focused and "Select a rights type.".
3. Pick SVOD → Territory → Only these countries → Done → "Choose at least one country.".
4. Search "cote" and "uk"; pick Côte d'Ivoire and United Kingdom. The search stays in view while scrolling. Switch to Worldwide except: nothing is checked. Switch back: both return.
5. Exclusivity has nothing chosen. Pick Non-exclusive → Done → the index shows all three summaries, with nothing sent yet.
6. Done on the index: the window waits, then closes. The new SVOD row is first behind with the right territory and exclusivity, the Rights count goes up, and focus is on Add right.
7. The same grant again, then the same grant as Exclusive: each time the window stays open with "{grant} is already on this title." naming the existing row, and no second row appears.
8. Change a row, then Esc: the ask names it. Esc again keeps editing. Discard closes with nothing added.
9. A new tab with `?add-right=territory` opens at Territory at both widths. `?edit&add-right` opens only Metadata, and closing it leaves no `?add-right` in the address.
10. Tab through the Rights type face: one stop in the list, wrapping to ✕.
11. Phone: the same window fills the sheet. A viewer, and staff under view-as, see no Add right.
