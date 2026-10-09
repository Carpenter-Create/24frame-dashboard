# [GC][24Frame] LOCK — Deliver: the window over Licensing Status v1

**Date:** 2026-10-09
**Status:** **LOCKED** (Adam, 2026-10-09, "approved, use the defaults")
**Scope:** Staff Licensing Status (`/staff/gc/deliveries`): delivering ticked titles to a channel. Covers the host, the faces, grouping, set-aside titles, the batched commit, outcomes, the paint-in, the address, and who may deliver.
**Entity:** Global Content / 24Frame only
**Follows:**
- [`house-overlay-dual-host-v1.md`](house-overlay-dual-host-v1.md): the object-edit job, and "No overlay over an empty page" (OUT, :45).
- [`social-profile-edit-window-lock-v1.md`](social-profile-edit-window-lock-v1.md): the house window shell.
- [`aggregation-title-details-window-lock-v1.md`](aggregation-title-details-window-lock-v1.md): the full sheet on a phone, and the hand-over from an old address.

**Supersedes:**
- The routed full-screen "Option B" takeover at `/staff/gc/deliveries/deliver` (`fixed inset-0` over `bg-surface-muted`, with an 840 card). Until now it was recorded only in code (`lib/deliver-stepper.ts` and `deliver/page.test.ts`). It drew over an empty page: the list behind it was another route and was not there. The route stays, as a gated hand-over.
- The footer (Continue / "← Back").
- The "1 Channel · 2 Rights · 3 Territory · 4 Done" caption.
- The "24Frame" wordmark line.
- The phone-only question "Which channel?".
- The full-page success screen.

---

## Founder direction (verbatim)

Build authorization, relayed to this build on 2026-10-09. The window audit's recommendation was "the window over Licensing status (steps as faces, ticked rows visible behind, new sub-rows painting in on Done), with grouping when the selection is large".

> 7) yes.

Answer to the open questions on 2026-10-09:

> approved, use the defaults

### Decisions (each plan question, with its default as the decision)

| Question | Decision |
|----------|----------|
| When some titles go through and others fail, keep the ones that went through, name each failure, and leave the failed titles ticked for a retry? | Yes. A part that saved stays saved, each failure is named ("{title} · {reason}"), failed titles stay ticked, and a retry never duplicates. |
| Approve the five lines changed or added since the first copy: "isn't ready to deliver and is left out" (each name with its status), "Not ready to deliver.", "{c} of {t} deliveries created", "Delivery already exists.", "{n} selected titles could not be found and are left out." | Approved as written. They replace "not approved" (live titles are labelled Approved) and "delivered" (a delivery status that new deliveries do not have yet). |
| On the result face, keep the result in the header ("Delivery created", "{n} deliveries created" or "{c} of {t} deliveries created") or show "Done" there and the result in the body? | The result stays in the header. On a narrow phone it wraps and is never truncated. |
| Should a separate SQL change make `create_delivery` refuse soft-deleted titles? | Yes, as its own small founder-approved migration PR. This PR touches no SQL (see Follow-up). |

The plan's other defaults are built as written:
- grouping from 6 titles;
- live titles set aside, with the RPC unchanged;
- the 4-segment track kept, with no caption and no wordmark;
- the paint-in fade;
- no ticks without operate;
- the copy listed below.

**Founder actions:** run "Verify on ship" 1 to 3 at both widths, then merge (reserved gate). Nothing else.

---

## 1) Desktop — the window

The house window shell (`components/chrome/house-window`) over the dimmed Licensing Status. The ticked rows stay visible behind it. There is no route change and no skeleton.

| Token | Lock |
|-------|------|
| Geometry | The 600 window (`HOUSE_DIALOG_WINDOW_CLASS`). It holds the height it opens at on Channel, up to 80vh. Taller faces (long grouped name lists) scroll inside it. |
| Header | ✕ · "Channel" · Continue on Channel. ‹ · "Rights" or "Territory" · Continue on the faces after it. The last Territory face reads "Deliver · N" (N = the deliverable titles). On the result: ✕ · the result line · Done. |
| Motion | A face slides in from the right; Back slides the previous face in from the left. 220ms; none under reduced motion. |
| Esc | The nearest layer closes first: an open Select, then the ask (Keep editing), then a face (Back), then the window. A double Esc never discards. |
| Keys | ⌘/Ctrl+Enter runs the header's action, and it re-checks the face first. Tab stays inside the window. |

## 2) Phone — the same window as the full sheet

- The same header, faces and ask fill the full AppSheet (`APP_SHEET_FULL_HOST_CLASS`), clear of the status bar and the home indicator. A resize keeps the draft.
- Cards are full width. The house Select opens inside the sheet, never as a second sheet.
- Names wrap and are never truncated.
- Rows visible behind the window: a computer only.

## 3) Steps as faces (linear)

- The order is locked: Channel (the index) → every Rights face → every Territory face → the result.
- Each face has the 4-segment track (filled 1, 2, 3, 4), the question, the hint, and the choices: cards, or the house Select (`components/ui/select`) above 16 territories.
- The result face is the window's closing face: ✕, Esc and Done close it. Back never returns to a submitted face.

## 4) Large selections

- Fewer than 6 deliverable titles: one Rights face and one Territory face per title ("{title} · {i} of {n}").
- 6 or more: titles with an identical set of grant choices share one face ("{n} titles · {i} of {g}"), with every name stacked under the hint. One pick applies to the whole group. A title holding two grants of one shape stays on its own face.
- Up to 500 titles. Above that, the over-cap line shows and nothing loads.
- Grants that differ only by exclusivity or window read the same label (pre-existing). In a group such titles stay apart by construction.

## 5) Set aside on Channel (they stay ticked)

- Not ready to deliver: any status other than `in_delivery` (including live), each name with its status ("North Star · Approved").
- No grant active now.
- Not found: a count (deleted, or out of reach).

## 6) One commit, in batches

- "Deliver · N" waits for the server. The body and header are inert, and ✕, Esc, the scrim and Back wait too.
- Batches of 25 go one after another. A progress line reads "{c} of {t} deliveries created".
- The run stops on sign-out, lost permission, an inactive channel, or a request that failed outright. The rest are not sent.
- All created: "Delivery created" (with "ID · {id}") or "{n} deliveries created", with ✓.
- Otherwise: "{c} of {t} deliveries created", with "{title} · {reason}" lines stacked under it.
- "Delivery already exists." counts as done.
- Download metadata sheet covers the created and existing titles. "Returns to Licensing Status".
- Nothing went through: the window stays on the last face with the reasons, and the draft is kept.
- A part that saved stays saved. A retry never duplicates: each batch first reads this channel's existing deliveries, and the unique key catches a race.

## 7) Closing and paint-in

- Delivered titles un-tick as the window closes. Failed, unsent and set-aside titles stay ticked.
- Focus returns to Deliver, or to the delivered title's tick when the bar has gone.
- After Back lands, the list refreshes. The new channel sub-rows fade in (220ms; none under reduced motion), and the first is scrolled into view. Delivered titles sort to the top.

## 8) Leaving with changes

- The house ask names the steps ("Channel and Rights aren't saved."): a strip at the window's foot on a computer, the AppSheet card on a phone.
- The browser's own prompt guards a reload.

## 9) Address

- A bare `?deliver` is the window's own history entry. Browser Back closes it, asking first when there are changes. No face and no ids are in the address.
- `/staff/gc/deliveries/deliver?titles=…` hands operate staff to `?deliver=<ids>`. The list ticks the ids it shows, and the window opens at both widths with the ids dropped from the address. Everyone else lands on the list.
- A reload, an account without operate, or an empty list strips `?deliver` and opens nothing.

## 10) Who

- GC staff with operate only (`gc_can(operate)`, literally true). Others see no ticks and no Deliver. Hiding is a hint only.
- Both actions run the gate first (context, staff, view-as, `gc_can(operate)`, failing closed), then zod.
- The browser sends only the channel and, per title, the title, grant and territory. It sends no org: `create_delivery` takes it from the title row and re-checks everything.
- Database text never reaches the browser: it is logged on the server, and the window shows the approved lines.

## 11) Not

- No takeover and no routed overlay. No overlay over an empty page.
- No footer actions. No HousePageSelect inside the window. No dialog over a dialog.
- No per-face history entries. No Option A wizard chrome. No unbatched 500-item commit.

## Copy

**Existing, reused:**
- the step labels "Channel", "Rights", "Territory" and "Done";
- the questions "Which channel for these titles?", "Which rights grant?" and "Which territory?";
- the hints "1 title selected · one channel per delivery" / "{n} titles selected · one channel per delivery", and "{title} · {i} of {n}" (the title alone when there is one);
- the actions "Continue", "Deliver · {n}", "Creating…" (moved out of the component), "Done" and "Download metadata sheet";
- "Preparing…" and "Export failed." (moved out of the component);
- "Delivery created", "ID · {id}" and "Returns to Licensing Status";
- "No active channels.", "Select at least one title to deliver." and "Select territory" (moved out of the component);
- the grant labels "{rights} · {territory}" (e.g. "AVOD · Worldwide"), and the GC status labels beside set-aside names (e.g. "Approved", "Needs review");
- the house window's "Close", "Back", "Discard changes?", "{rows} isn't saved." / "{rows} aren't saved.", "Keep editing", "Discard", "Not authenticated.", "Not authorized." and "Could not save." (duplicated by value from the Metadata window; a test pins the equality);
- the ✓ glyph (moved out of the component).

**New with this window, approved by Adam on 2026-10-09 ("approved, use the defaults"):**
- "{n} titles · {i} of {g}"
- "1 title has no active grant and is left out." / "{n} titles have no active grants and are left out."
- "Select up to 500 titles at a time."
- "Could not load these titles."
- "Too many grants to load at once. Select fewer titles."
- "{n} deliveries created"
- "{title} · {reason}" (also "{title} · {status}" for a title not ready)
- "This channel is no longer active."
- "No active grant covers this territory."
- "Another rights holder holds an exclusive claim on this work here."
- "Could not create this delivery."
- "1 title isn't ready to deliver and is left out." / "{n} titles aren't ready to deliver and are left out."
- "Not ready to deliver."
- "{created} of {total} deliveries created"
- "Delivery already exists."
- "1 selected title could not be found and is left out." / "{n} selected titles could not be found and are left out."

**Dropped:** "Which channel?", the progress caption, "← Back", "No active grants on this title.", and the wordmark.

## Gates

- `lib/deliver-stepper.test.ts`: the address, the plan (grouping, set-aside, active-now, over the cap, order), faces, items, batches, labels, result lines, the failure mapping, and the copy pins.
- `deliver-actions.test.ts`:
  - the gate runs before zod;
  - the refusals: signed out, non-staff, view-as, and gc_can false or failing;
  - the call shape: exactly four keys, no org;
  - the pre-read, the mapping and the stops;
  - revalidation only after a create;
  - chunked loads, with error and probe handling;
  - the RAISE texts pinned to the last `create_delivery` across `supabase/migrations`.
- `deliver-window.test.tsx`: both hosts, the Channel header, each face, and the source pins (phone sheet, held open while saving or exporting, the ⌘Enter re-check, the batch loop's try/catch/finally, no org, no takeover, no inline copy).
- `licensing-status-list.test.tsx`: no ticks without operate, the empty state, the paint-in row, and the window entry, close and focus pins.
- `page.test.ts` (Licensing): Deliver only on a literal true from `gc_can(operate)`.
- `deliver/page.test.ts`: the hand-over redirects.
- `house-overlay.test.ts` (G4, G5) and `aggregation-revalidate.test.ts`.
- No SQL in this PR; `supabase/tests/deliveries_test.sql` stays the authority.

## Rollback

Revert the one PR: the takeover, `createDeliveries` and the stepper come back. There is no migration, data or RLS to undo. Deliveries created through the window are ordinary audited rows and stay; nothing is deleted. Checkpoint: `main` at 553a53a.

## Reserved gate

This PR adds authorization code on a path that writes rights-bearing records. Codex findings block it, and Adam merges.

## Follow-up (founder SQL, not in this PR)

`create_delivery` does not check `titles.deleted_at`, and staff `delete_title` leaves the status as it is. A soft-deleted `in_delivery` title can therefore still be delivered by a direct RPC call. The window cannot offer one (row security hides it, and it is set aside as not found). The fix is a one-line predicate (`and deleted_at is null`) in its own founder-approved migration.

## Verify on ship

1. Computer: tick 3 → Deliver opens the 600 window over the list, with no route change. Channel → Rights per title → Territory → "Deliver · 3" → result → Done. Three sub-rows fade in, and focus is on a tick.
2. Esc on Rights goes Back. Pick a channel, then Esc on Channel: it asks; Esc again keeps editing. Browser Back on Rights with changes asks, and Keep editing stays.
3. Phone: the same window fills the sheet. Territory above 16 uses the house Select inside it.
4. Tick 12 titles with identical grants → one Rights face and one Territory face.
5. Tick a live title → named on Channel as not ready, with "Approved"; it stays ticked after closing.
6. `/staff/gc/deliveries/deliver?titles=…` opens the window with those ticks at both widths. As gc_legal or gc_accountant it lands on the list with no ticks.
7. A partial run (one title whose grant was revoked mid-flow) → "2 of 3 deliveries created" plus the reason. Retry → "Delivery already exists." for the others.
8. Reload on a bare `?deliver` → the list, with no window.
