# [GC][24Frame] LOCK — Title metadata: the window over the title page v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "approved") · Design Own→READY
**Amended 2026-10-09:** (Adam, "4) yes, please."; questions "approved, use the defaults") the save sends only the changed fields; the database merges them under a lock on the title, checks the whole record and refreshes findings in one transaction (`merge_title_metadata`, founder-applied with the title findings migration). Submit reads the stored record as the app does, and what the database refuses reaches the browser only as an approved line. A Cast or Keywords entry over 200 characters reads the existing approved "Up to 200 characters." (it read "Up to 50 entries." before; Bugbot on #801); more than 50 entries still reads "Up to 50 entries.". No UI change.
**Amended 2026-10-10:** (Adam, "Yes, in #799 (Recommended)") `delete_title`'s staff gate is `gc_can(auth.uid(), 'operate')`, founder-applied with the title findings migration: GC legal and accountant staff are refused "Not authorized to delete this title", and Title actions offers staff Delete only to a GC role that can operate. No new copy.
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
| This lock, with Release's "Re-release · {date}" | "approved" |

### Amendment 2026-10-09: the atomic save

Authorization, verbatim:

> Adam, 2026-10-09: "4) yes, please." (draft the atomic metadata merge SQL, not applied)

The plan's questions were answered on 2026-10-09, verbatim: "approved, use the defaults". Each default below is the decision. The SQL stays a draft: the founder approves the exact SQL before applying it, and "use the defaults" applies no SQL.

| Question | Decision (the default) |
|----------|------------------------|
| What does Adam need to do? | Nothing until the PR is ready. Then, in order: (1) approve the exact SQL added to the title findings migration (`merge_title_metadata`, `normalize_stored_title_metadata`, the title lock in `set_title_metadata` and `submit_title`, and `submit_title`'s org check at that lock and normalized read); (2) apply that migration to production once, as one transaction, in a quiet window (it already carries the findings and checks work, so the merge rides along); (3) once it has committed, run `select public.finish_title_findings_repair();` as `postgres`, in its own transaction, and run it again if it refuses because transactions are still open (Verify on ship, step 9); (4) run the read-only after-check, expecting 0 (step 10); (5) the preview checks (step 11); (6) merge. Apply in a quiet window: the pass holds each live title's lock until commit, and a concurrent `link_title_to_work_of` can deadlock with it; Postgres aborts one side, and if it aborts the migration, the migration rolls back whole and re-running it is safe. If the "merge_title_metadata not applied yet" log line still appears after the apply, run `notify pgrst, 'reload schema';`. |
| Does the app change ride in the findings SQL PR or its own stacked PR? | The same PR: one SQL review, one apply, one preview check, one merge. The app diff inherits that PR's reserved SQL gate. |
| A two-session (dblink) concurrency proof now? | No. A follow-up modeled on `screener_concurrency_test.sql`. This change proves the merge in one session and pins both locks on each function's source. |
| Should a Cast or Keywords entry over 200 characters say "Up to 200 characters per entry." (a new line) instead of today's "Up to 50 entries."? (Bugbot on the window's PR) | Not as a new line. The fix reuses the existing approved "Up to 200 characters.", so no new copy ships; "Up to 200 characters per entry." stays proposed until Adam approves that exact line. More than 50 entries, and any other list problem, keeps "Up to 50 entries.". |
| Fix the existing B3 `set_title_metadata` cases, which pass without verifying anything? | Not here. The new merge cases get a positive control and verify callbacks; the old cases get the same in a separate follow-up. |
| Revoke `set_title_metadata` and `reconcile_title_findings` from clients once the merge is live? | Yes, as a separate later draft for founder approval, after this is applied, deployed and verified. Not in this change: the old app and the fallback still need them. |
| Refuse archived titles in the merge, not just deleted ones? | No. Match `set_title_metadata`, which allows archived titles. |

### Amendment 2026-10-10: who on staff may delete a title

Authorization, verbatim. The question:

> "The #799 review found that any GC staff member can delete a title, including the read-only legal and accountant roles, and the delete purges the title's S3 files permanently. This is older than #799, but #799 replaces delete_title's text, so I can close it there with one line: v_staff := public.gc_can(auth.uid(), 'operate'); instead of public.is_gc_staff(auth.uid()). That's the gate every other GC write already uses. Owner and delivery-ops staff keep delete; legal and accountant get "Not authorized to delete this title". Should I put it in #799?"

> Adam, 2026-10-10: "Yes, in #799 (Recommended)", the option reading: "Add the one-line gate change plus pgTAP tests that legal and accountant are refused. You approve it with the rest of #799's SQL before applying. I'll also hide the Delete button from staff who can't use it."

| What | Decision |
|------|----------|
| The gate | `delete_title` (section 13 of the title findings migration) sets `v_staff := public.gc_can(auth.uid(), 'operate');`. Account owner and delivery operations staff take the staff branch as before. Legal and accountant staff take the member branch, where `member_can` defers to `gc_can` for GC staff, and are refused "Not authorized to delete this title" before anything is written. |
| The SQL | A draft: Adam approves it with the rest of the migration's SQL, then applies it. Nothing else about delete changes: its error order and `mark_deleted_title_prefix_purged` stay as they are. |
| Other GC writes | The question's "the gate every other GC write already uses" overstated it (review on #799). It is the gate this migration's other title writes put on GC staff, but `gc_set_title_status` and `mark_deleted_title_prefix_purged` still accept any GC staff (`is_gc_staff`). #799 changes neither; narrowing them is a separate founder decision. |
| The menu | Title actions offers staff Delete only when `gc_can(…, 'operate')` is true: the staff title page already reads it, and the Aggregation catalog and title page read it for staff. Archive and Restore are unchanged, and so is what a member who is not staff sees. No new copy. Title actions still offers Archive and Restore to GC legal and accountant staff, whom `archive_title` and `restore_title` refuse (review on #799); hiding them is a separate founder decision. |
| Tests | `supabase/tests/titles_delete_archive_test.sql` (pgTAP, CI): legal and accountant refused on a draft and on a live title, each left live; delivery operations and account owner staff still delete. `metadata-merge.test.ts` pins the gate on `delete_title`'s source; `titles-lifecycle.test.ts` and the page tests pin the menu. |

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
  - only the changed fields are sent, with no read first; the database merges them onto the stored record under a lock on the title, checks the whole record and refreshes the title's findings in the same transaction, so a failed refresh fails the save. Until that SQL is applied, the save reads, merges and sets as before, and only when the database reports `merge_title_metadata` itself missing. A field two people change at once keeps the last save, and a list (Cast, Keywords) is replaced whole. With a change, an untouched field the page refuses but the window shows as valid (Cast stored as "Ada, Bob") is sent as a repair with the stored value it expects; the database stores it only while that value is unchanged, so a save made since the window opened is never overwritten (review on #799). Done with no change sends nothing;
  - a value the database refuses is named with its field's approved line;
  - database text is logged on the server, and the browser gets "Could not save.".
- Submit leaves findings to the database (`submit_title` refreshes them from the stored record). `submit_title` refuses another org's title at the title lock, before it reads the record, and reads the record as the app does, so an older stored shape the window shows as complete never blocks a submit. Like the app's required count, it checks only the required fields' values (required blocks delivery, `docs/domain-spec.md` §12; Codex on #799): a recommended or optional value the checks refuse never blocks a submit, and the next save still names it. What it refuses reaches the browser only as an approved line: a stored required value the checks refuse as its field's line, a required field it finds empty as the "Complete the {total} required metadata fields…" notice, anything else as "Could not save."; database text is logged on the server.

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

**New, approved with this lock:** Release's row summary "Re-release · {date}".

**New with the atomic save amendment:** none. An entry over 200 characters reuses "Up to 200 characters.".

**Reused by the amendment on Submit:** a field's approved line, "Complete the {total} required metadata fields to submit this title for review." and "Could not save."

## Gates

- `title-details.test.ts` (lib): face parsing, the change diff (only changed fields, a cleared one as null), rows for the ask, the check order and lines (an over-long list entry vs too many entries), the row counts.
- `metadata.test.ts` and `releases.test.ts`: the limits, the list-entry line ("Up to 200 characters." for an entry over 200 vs "Up to 50 entries."), and the original date in the past (today anywhere counts).
- `metadata-merge.test.ts`: the merge helpers (which errors fall back, which field a refusal names), SQL pins scoped to each function's own body (signature, gate, both locks, grants; the same title lock in `set_title_metadata` and `submit_title`, and before the findings refresh in every function that calls it, `reconcile_title_findings` included; `submit_title` refusing another org's title at that lock, reading the record normalized and checking only the required tier), the registry, limits and lists (genre, rating, language and country equal the app's) in `check_title_metadata` and the normalize helper, the hand-typed `database.types.ts` entry, and the normalize fixtures shared with pgTAP.
- `supabase/tests/title_metadata_merge_test.sql` (pgTAP, CI): merge, clear and first-save semantics, one audit row per real write and none for a no-op, normalize parity, refusals, findings, a deleted title, cross-org and spoofed org, the role matrix, the lock pins (`reconcile_title_findings` included), a stored country outside the list named on the next save and corrected in it, and submit (a complete record in an older shape submits and is not rewritten, a refused Director never blocks it, a refused required value still does, another org's title is refused before its record is read).
- `supabase/tests/titles_delete_archive_test.sql` (pgTAP, CI): `delete_title` refuses GC legal and accountant staff ("Not authorized to delete this title", the title left live) and still deletes for delivery operations and account owner staff.
- `titles-lifecycle.test.ts`, the staff title page test and the catalog page test: staff Delete only with a GC role that can operate.
- B3 (CI): a CONTROL that A's own merge lands, then the merge on B's title, spoofed and clear-only, each verified against a service-role re-read.
- `house-form-select.test.ts`: arrow, Home and End steps, and type-ahead.
- `title-details-actions.test.ts`:
  - a malformed request, a signed-out caller and view-as are refused with no write;
  - a deleted or another org's title, and a non-operator, are refused;
  - the org comes from the row;
  - Release is checked first;
  - only changed fields are sent and nothing is read first; the fallback runs only when the database reports `merge_title_metadata` missing; any other failure never falls back; a value the database refuses is named with its approved line;
  - no database text reaches the browser;
  - a partial save is reported;
  - submit makes one call and leaves findings to the database;
  - what submit_title refuses reaches the browser only as an approved line.
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
9. After the founder applies the SQL in a quiet window and it has committed: as `postgres`, in its own transaction, `select public.finish_title_findings_repair();`. It waits for every transaction that began before it, then re-derives every live title's findings, and returns how many titles it refreshed. If it refuses because transactions are still open, run it again: a refused call writes nothing. Once a pass has run, another pass in the same UTC year over records and findings unchanged since then changes no finding's status, code or message (it re-stamps `derived_at` and appends one audit row per open finding). A pass can still change findings over an unchanged record: a reconcile still on the old body can write findings between passes (why the final pass drains first), and the release-year limit moves on 1 January.
10. The read-only after-check (expect 0), as `postgres`: every live title's open validator findings are the findings its stored record derives, read as the window reads it: the same codes, each with the same severity and message.

    ```sql
    select count(*) as titles_out_of_step
      from public.titles t
     where t.deleted_at is null
       and (select coalesce(array_agg(f.code || '|' || f.severity::text || '|' || f.message order by f.code), '{}'::text[])
              from public.findings f
             where f.entity_type = 'title' and f.entity_id = t.id
               and f.source = 'validator' and f.status = 'open')
        <> (select coalesce(array_agg((d->>'code') || '|' || (d->>'severity') || '|' || (d->>'message') order by d->>'code'), '{}'::text[])
              from jsonb_array_elements(public.title_metadata_findings(public.normalize_stored_title_metadata(
                coalesce((select m.data from public.title_metadata m where m.title_id = t.id), '{}'::jsonb)))) d);
    ```

11. The preview checks (a read-only check first: `select has_function_privilege('authenticated', 'public.merge_title_metadata(uuid, uuid, jsonb, text[], jsonb)', 'EXECUTE');` is true): on the PR preview, open one title's Metadata window in two tabs, change Cast in one and Director in the other, Done in both, reload: both are kept. The preview's logs show no "merge_title_metadata not applied yet" line for those saves. This proves the merge path is live and nothing regressed; atomicity itself rests on the locks, which the tests pin. Then merge.
