# Known divergences & deferred obligations

Per-installation ledger of where this codebase departs from the house skills / target state,
each with the concrete **trigger** that should force the fix. A tracked gap is a decision; an
untracked one is a latent bug. (Referenced by the rls-data-layer, supabase-conventions,
frontend-conventions, and testing-conventions skills.)

## Design / UI

### D1 — UI primitives are net-new, authored from GC tokens
`globalcontent-web` has **no** reusable primitives (not shadcn; no Button/Input/Card/Label — only
marketing components + 5 layout helpers). Its portable asset is `tokens.css` (already ported).
So `src/components/ui/{button,input,label,card,inline-notice}.tsx` were authored fresh, wired to GC
tokens (`--radius*`, accent/ink/hairline utilities, `.t-*` type, the global accent focus ring) —
deliberately **not** copying `globalcontent-web`'s hardcoded geometry (`rounded-full`, `px-[18px]`,
hand-copied `rgba` shadows). These are now *the* canonical dashboard primitives.
**Trigger to revisit:** when watershedportal's shell/data-table land (see D2), they conform to these.

### D2 — Porting watershedportal's shell/data-table: take proportions, replace vocabulary
Founder directive: keep the **composition**, drop the **brand**.
- **KEEP (the proportions/layout):** sidebar width, header height, content max-width, spacing/
  density scale, table row rhythm, page air, general sense of proportion.
- **REPLACE (the vocabulary), re-expressed in GC tokens:** `--watershed-*` token names, the type
  scale, `@font-face 'Watershed Display'`, focus blue `#0071E3`, elevation, and any `watershed.*` /
  `brand` Tailwind color utilities. Also hardcoded radii/px geometry → GC `--radius*` / `--space-*`.
- **If a watershedportal spacing/proportion value is genuinely good and GC's token scale has no
  equivalent:** surface it as a **gap in GC's tokens to fill** — add the token to `tokens.css` (a
  founder-visible design change) — do **not** keep a Watershed variable to preserve it.
- Recolor ≠ port. Swapping the hex behind a Watershed var leaves its naming/geometry/weights intact.
**Trigger:** the dashboard-shell / data-table port task.

**Shell increment status (done):** ported the composition — fixed sidebar (210px), sticky header
(56px), content frame (max 1080px, inset 48px), nav row rhythm — into GC layout tokens in
`tokens.css`; built `chrome/{app-shell,side-nav,organization-switcher,user-menu}` rewired onto
`organizations`/`memberships` + active-org cookie; reconciled primitives (one Card composite, new
`ui/page-header`, themed `ui/dropdown-menu` on Radix). Correction: watershedportal is Next.js App
Router (not Vite/React-Router — the inventory's "Next 15.5" was right), so the chrome was a lift.
**Deferred (no consumer yet):** `platform-ui` StatCard/ListCard/Panel/SearchInput/Section,
GlobalSearchDialog, AccordionNav (GC nav is flat), sidebar collapse, and re-pointing the Dashboard
"attention" block at the real findings model (§19) — it's an honest placeholder until findings exist.
**Trigger:** each lands with the slice that needs it. (Mobile-responsive nav is NOT in this list —
it's committed scope, see D4.)

### D4 — Mobile-responsive shell/nav is committed scope, not a deferral
Self-serve signup is now the core strategy, and filmmakers sign up from phones — so the shell must
work on mobile (collapsible/drawer nav, responsive header, touch targets). This is **required scope**,
scheduled but not built in the shell chunk (which is desktop-first: a fixed 210px sidebar with no
mobile breakpoint yet). **Distinct from the spec's §23 "no mobile"**, which means no *native* app —
mobile *web responsiveness* is in scope and now central. Reconcile that §23 wording (native vs
responsive) in the upcoming spec work so the two don't read as contradictory.
**Trigger:** before self-serve signup ships to real users; earliest sensible slice for the responsive
pass.

### D3 — No status/danger color token (errors render on-system)
GC's `tokens.css` is "greyscale + one accent, no status colors by default." Form errors therefore
render as a restrained hairline notice differing by **ink weight**, not red (`InlineNotice`). A
dedicated `--danger`/status token (and whether errors may use red at all) is a **founder design
decision**, deferred.
**Trigger:** first surface where greyscale error affordance proves insufficient in testing, or the
brand accent/logo checkpoint is resolved.

## Payments

### PAY1 — Hosted Stripe Checkout rejected; embedded Payment Element on our domain
Decision: users never leave our domain for payment. Use the **Payment Element backed by the Checkout
Sessions API via `ui_mode: 'custom'`** (Stripe's recommended custom flow — payments.md; not hosted
redirect, not raw PaymentIntents), styled with the **Appearance API mapped to `tokens.css`** (no
hardcoded hex). Card fields stay in Stripe's iframe (keeps us PCI SAQ-A) — never build our own.
Accept the immovables: the Link legal line can't be removed; redirect-based methods return to **our**
confirmation page. **DB is unaffected** — it's still a Checkout Session, so `checkout.session.completed`
fires and `finalize_paid_signup` is unchanged. Rationale: the payment experience is part of the brand;
the dashboard is operating infrastructure, not a redirect to someone else's page.
**Trigger:** revisit only if Stripe deprecates `ui_mode: 'custom'`.

## Auth

### A1 — RESOLVED: Turnstile mount was an origin mismatch, not a code bug
Root cause: Next 16 serves its dev origin as `localhost:3000` and blocks cross-origin dev resources;
I was testing via `127.0.0.1:3000`, so client hydration was blocked and the client-only Turnstile
widget never mounted (`⚠ Blocked cross-origin request to Next.js dev resource … from "127.0.0.1"`
in the dev log). Via `localhost:3000` the widget mounts, the dev test key auto-passes, and the full
sign-up → magic-link → session → onboarding → RLS role-view flow completes (verified in-browser).
Fix: `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts` so both origins work in dev.
**Dev note:** local `otp_expiry` bumped to 86400s in `config.toml` so a magic link doesn't expire
during a gap. Supabase `site_url` stays `127.0.0.1:3000`; `emailRedirectTo` uses the live origin, so
signing in via `localhost` redirects correctly (both origins are in `additional_redirect_urls`).

## Backend typing

### B1 — (target already met) typed Database bindings
`src/lib/supabase/database.types.ts` is generated and the server/browser/middleware clients are
typed `<Database>`. Regenerate after every migration (`supabase gen types typescript --local`).

## Process / build order

### P1 — dashboard shell ported before contract_review (deliberate build-order deviation)
CLAUDE.md's build order runs auth → contract_review → …; the shell isn't listed as a discrete step.
It's being ported **before** contract_review because every later slice builds pages, and pages
without a shell each invent their own layout — the same "accidental second implementation" trap as
the UI primitives (D1), one level up. Scope of the deviation: shell + nav + the existing org-scoped
landing placed inside it. **No page content is built ahead of its slice.**
**Trigger:** revert to spec order once the shell exists; contract_review is the next feature slice.

## Assets

### AS1 — asset `content_hash` is the S3 ETag, not SHA-256
The asset-upload design specified per-part SHA-256 checksums (presigned with
`ChecksumSHA256`) verified by S3, stored as `content_hash`. In practice the
presigned-checksum flow is unreliable from the browser: S3 puts the checksum in
the URL query with `SignedHeaders=host` and rejects the part PUT (403 when the
client also sends the header; 400 with the query-only checksum + `UNSIGNED-PAYLOAD`).
Verified live against the real GC bucket. So the flow now uses **plain presigned
`UploadPart` (no checksum) and stores the S3 object ETag** (composite MD5, e.g.
`…-1`) as `content_hash` — S3-verified transfer integrity, but MD5-based and not a
clean whole-file hash. **Trigger to revisit:** when a true content hash matters
(dedupe, tamper-evidence, cross-system verification) — add a server-side or
post-upload SHA-256 (e.g. an S3 object-checksum on complete, or a worker), and
keep the ETag as the transfer check.

## Rights & territory

### R1 — RPC territory validation is format-level, not ISO-membership
`add_rights_grant` (migration `…000400`) normalizes, dedupes, and **format-validates**
territories against `^[A-Z]{2}$` at the DB layer, so a direct RPC caller can't persist
malformed codes. It does **not** yet validate membership in the real ISO 3166-1 set — a
valid-format-but-nonexistent code (e.g. `ZZ`) into the caller's *own* catalog is accepted.
Bounded and fails-closed: `can_deliver` exact-matches, so a bogus code never widens delivery
(`include ['ZZ']` delivers nowhere; `exclude ['ZZ']` excludes only itself). The full ISO
enumeration lives in `src/lib/territories.ts` and gates the server-action path today.
**Trigger to close:** the deliveries slice (bad territory data would surface as vendor-export
errors there) — add a `country_codes` reference table seeded from the ISO set + a membership
check in the RPC.

## Vendors / GC-admin

### V1 — vendor writes are RLS-gated direct writes, not mutation-RPCs
`vendors` is GC-global (no `org_id`) and gated entirely on `is_gc_staff`. Its create/edit path is a
**direct table write inside a server action** (`supabase.from("vendors").insert/update`, RLS-enforced),
not a SECURITY DEFINER RPC. Deliberate: GC-admin reference data with no tenant-isolation surface — an
RPC would only re-wrap `is_gc_staff` + insert with no security gain (the one cross-field rule is a
CHECK constraint). The mutations-as-RPC rule stays in force for all client/tenant writes.
**Trigger to revisit:** if a vendor write ever needs a cross-table invariant or server-derived state.

## Framework

### F1 — middleware.ts → proxy.ts (Next 16 deprecation), deferred
`next build` warns the `middleware` file convention is deprecated in favor of `proxy`. Current
`src/middleware.ts` works; renaming to `src/proxy.ts` (+ `proxy` export) is a mechanical follow-up,
deferred so it doesn't ride into an unrelated commit unverified.
**Trigger:** before the Next 16 minor that removes `middleware` support, or the next middleware edit.

## Avatars

### AV-UNHOLD — live-face unhold is not scheduled
Unhold is not scheduled yet. `scripts/social/unhold-live-avatars.ts --execute` must run well under 30 days before real users depend on the `gc-hold` tag. Scheduling that run is a required follow-up. This repository does not install that schedule. A null `avatar_key` is the canonical object `avatars/{id}/avatar`; a 404 on that key is no avatar. The clear runs only when a fresh read of `avatar_key` is still null.
**Trigger:** before real users depend on avatar hold expiry.

### Avatar hold — theoretical follow-ups
These stay on the backlog. They are not scheduled work in this change.
B2 is in `unhold-live-avatars.ts`: a key is cleared only when `avatarKeyOwner(key)` is that row's id, and every other row is a skipped clear.
B5 is in `delete-avatar-orphans.ts`: a delete that throws still prints the partial report, then the process exits 1.

- B1: a no-proof ("unfinished") swap key goes in orphanKeys (`actions.ts` unfinished branch; `recheck-social-images.ts` unfinished branch), although a late commit can make it live. `delete-avatar-orphans` re-reads first, so it is safe. After a late commit, the old face is unreported and untagged (a leak). Largely covered by REPORT1: that branch now reports both the new key and the replaced key under `unverifiedKeys`, never `orphanKeys`.
- B3: `delete-avatar-orphans` has a read-to-delete window (it needs a writer pointing at an orphan key).
- B4: the classifier trusts any JSON `code` in a non-2xx body from any HTTP layer. No known gateway emits a listed 5-character SQLSTATE. It could also require the PostgREST error shape.
- B6: unhold has a read-to-clear window. If the pointer moves away, the old key loses its hold (a leak, with no expiry).
- B7: a residual N-N window after the post-tag read (it needs a writer naming a fresh key after a proven rollback). The safety net is unhold at recheck start and end. There is no periodic schedule yet: REQUIRED before real users depend on it (run daily or weekly, well under 30 days).
- B8: a remove retry after an untagged-leftover error cannot reach a recheck leftover. It relies on the Sentry report plus `delete-avatar-orphans`.
