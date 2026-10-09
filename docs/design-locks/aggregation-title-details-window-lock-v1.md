# [GC][24Frame] LOCK — Title metadata: the window over the title page v1

**Date:** 2026-10-09
**Status:** **DRAFT FOR FOUNDER APPROVAL.** The pull request stays a draft until Adam approves this lock.
**Scope:** Aggregation title detail: editing a title's metadata and release info. Covers the host, the one draft, the one save, leaving with changes, and who may edit.
**Entity:** Global Content / 24Frame only
**Follows:** [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md) (the house window) and [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md) (the object-edit job).
**Supersedes:**
- The `/metadata` form page for operators. The route stays and hands over to the window.
- The inline Release editor on the title page.

---

## Founder direction (verbatim)

Asked to build the window audit's recommendations:

> make sure we do your recommendations above, resolve any flaw or security issues, and let me know if you still need me to answer anything that I may have missed.

Answers given on 2026-10-09:

| Question | Answer |
|----------|--------|
| Window title | "Metadata (Recommended)" |
| Row summary | "4 of 6 complete (Recommended)" |
| Limits | "Add these limits (Recommended)": text 200, synopsis 4,000, runtime 1–1,000, year 1888 to next year + 5, lists of up to 50 |
| The ask | "Reuse Edit's, name rows (Recommended)" |
| Error lines | "Specific line (Recommended)" |
| Partial save | "Stay open on Release (Recommended)" |
| Original release date | "Yes, app check now (Recommended)": it must be in the past |

---

## 1) Desktop — the window

The house window shell (`components/chrome/house-window`) over the title page. There is no route change and no skeleton, and the page behind stays as it is.

| Token | Lock |
|-------|------|
| Geometry | The 600 window (`HOUSE_DIALOG_WINDOW_CLASS`). It holds the height it opens at, up to 80vh. |
| Header | ✕ (index) or ‹ (face) · title · Done. |
| Title | "Metadata" on the index; on a face, its name. |
| Index | One card of four rows: Required, Recommended and Optional each read "{filled} of {total} complete". Release reads "New release" or "Re-release · {date}". |
| Faces | Required, Recommended and Optional hold their fields from the registry (`lib/metadata`). Release holds New release / Re-release, the original date (re-release only), and the release date read-only ("Set by 24Frame"). |
| Motion | A face slides in from the right; Back slides the index in from the left. 220ms; none under reduced motion. |
| Choices | Genre, language, country and rating use the house Select. Keys: ↓ ↑ Home End, typing jumps to a label, Enter or Space picks, Esc closes back to the field. |
| Esc | The nearest layer closes first: an open Select, then the ask (Keep editing), then a face (Back), then the window. A double Esc never discards. |
| Keys | ⌘/Ctrl+Enter is Done. Tab stays inside the window. |

## 2) Phone — the same window as the full sheet

The same header, index and faces fill the full AppSheet (`APP_SHEET_FULL_HOST_CLASS`) over the title page. They sit clear of the status bar and the home indicator. There is no separate route. A resize swaps the host and keeps the draft.

## 3) One draft, one Done

- The draft is taken from the page once each time the window opens. A refresh underneath (an upload finishing, a save) never resets it.
- Done checks first. On a problem, Done goes to that face, focuses the field, and shows its line under it. Nothing is sent.
- With nothing changed, Done closes.
- Otherwise Done waits for the server: the body is inert, and ✕, Esc, the scrim and Back wait too. It sends only the changed fields, plus Release when it changed.
- On success the window closes, the page behind shows the saved values, and focus returns to what opened the window.
- **Partial save** (Adam: "Stay open on Release"): when metadata saves and Release fails, metadata stays saved. The window stays open on Release with its error, and the ask then names only Release.
- Leaving with changes asks inside the window (§4). Reloading or closing the tab raises the browser's own prompt.

## 4) Leaving with changes

The same ask as Edit profile. On desktop it is a strip at the window's foot: Discard, then Keep editing (focused). On a phone it is the AppSheet card: Keep editing first (focused), then Discard, stacked full width.

## 5) Address

- `?edit` opens the index; `?edit=required|recommended|optional|release` opens that face. An unknown face opens the index.
- The window writes its own history entry with the browser's own call, so Next keeps `?edit` as its address. Browser Back closes it, asking first when there are changes.
- An address that arrives with `?edit` (a new tab, or the `/metadata` hand-over) opens the window at both widths.
- Entry points: the Metadata card's Edit; the "Complete the 6 required metadata fields" notice ("Edit metadata" opens Required); Release's Edit (opens Release).
- `/metadata` sends operators to `?edit` on the title page. Others keep its read-only list.

## 6) Who

- Operators only (account owner or delivery ops in the title's org). Everyone else keeps View.
- Under view-as, the window is not on the page and the save refuses.
- The save action takes nothing from the browser that decides who may write:
  - the title is read under row security, and never a deleted one;
  - its org comes from that row;
  - Release and the field names are checked before anything is written;
  - only the changed fields are merged onto the stored record;
  - database text is logged on the server, and the browser gets "Could not save.".

## 7) Not

- No route hop, and no inline Release editor.
- No title rename here.
- The release date is never editable here (it is GC's).
- No duplicate editors for one field.

## Copy

**Existing, reused:** "Metadata", "Required", "Recommended", "Optional", "Release", the field labels, "New release", "Re-release", "Original release date", "Release date", "Set by 24Frame", "Comma-separated", "Edit", "View", "Edit metadata", "{filled} of {total} complete", "Close", "Back", "Done", "Discard changes?", "Keep editing", "Discard", "Not authorized.", "Could not save.", and "Original release date is required for a re-release."

**New, approved by Adam on 2026-10-09:**
- the ask's line "{rows} isn't saved." / "{rows} aren't saved.", naming the rows (Edit profile's pattern);
- the error lines "Enter whole minutes, 1 to 1,000.", "Enter a year from 1888 to {max}.", "Up to 4,000 characters.", "Up to 200 characters.", "Up to 50 entries.", "Choose one from the list.";
- "Choose a date in the past."

**New, for approval with this lock:** Release's row summary "Re-release · {date}".

## Gates

- `title-details.test.ts` (lib): face parsing, the change diff (only changed fields, a cleared one as null), rows for the ask, the check order and lines, the row counts.
- `metadata.test.ts` and `releases.test.ts`: the limits, and the original date in the past (today anywhere counts).
- `house-form-select.test.ts`: arrow, Home and End steps, and type-ahead.
- `title-details-actions.test.ts`:
  - a malformed request, a signed-out caller and view-as are refused with no write;
  - a deleted or another org's title, and a non-operator, are refused;
  - the org comes from the row;
  - Release is checked first;
  - only changed fields are merged;
  - no database text reaches the browser;
  - a partial save is reported.
- `title-details-window.test.tsx`: both hosts, the header, rows, faces, unique ids, the entry points, one save path, and that the old form and actions are gone.

## Verify on ship

1. Computer: Edit on the Metadata card opens the 600 window over the title page, with no route change.
2. Required → clear Genre → Done: the window goes to Required with focus on Genre. Fill all six → Done: the notice behind turns into Submit.
3. Runtime 0 → Done: "Enter whole minutes, 1 to 1,000." under Runtime.
4. Release → Re-release → a date in the future → Done: "Choose a date in the past."
5. Change Cast, then Esc: the ask names Recommended. Esc again keeps editing; Discard closes with nothing saved.
6. Open from a new tab with `?edit=required`, and from `/metadata`: the window opens at both widths.
7. Phone: the same window fills the sheet. A resize keeps the draft.
8. A viewer, and staff under view-as, see View and no window.
