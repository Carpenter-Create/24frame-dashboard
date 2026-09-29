# SPEED SoT escape-hatch inventory

Audit only. No cuts in the PR that added this file. Sibling agent
(`HOUSE SPEED SoT — Meta/IG taps`) owns the persistent client shell,
media-proxy helpers, Follow migrate, and feed Query+Redis. Do not
rewrite those surfaces from this inventory.

**Scope:** Carpenter-Create/24frame at `main` HEAD `51b7536f`
(Edit Profile v2 #614). Live-tree reads + `rg` on 2026-09-21.

**Founder override (same day):** inventory assumes a **persistent
client shell** — real client-owned React interaction that keeps
screens mounted. Not RSC-page cosmetics (`loading.tsx`, prefetch,
`staleTimes`, paint-before-RSC pending). Re-rank:

1. What forces a **full RSC remount** on dock / tab tap.
2. What **prevents** a Social (then app-wide) client shell from
   keeping screens mounted.
3. RSA / signing and `await` + `disabled={pending}` stay listed,
   **secondary** to shell-ownership blockers.

Granola search found no 24Frame SPEED / shell-ownership decisions
(technical brief only).

---

## Ranking

| Rank | Meaning | Action for sibling |
|------|---------|--------------------|
| **P0** | Dock / tab / workspace hop unmounts the current screen and remounts an RSC page | House hop must not swap `{children}` |
| **P1** | Screen state cannot survive a remount even if chrome stays | Client-owned registry / Query / keep-alive |
| **P2** | Costly once the shell owns the screen; still on the RSC request path today | Proxy / optimistic runner after P0–P1 |

Recommended action labels: `unify-to-shell` / `keep-as-proxy` /
`secondary-after-shell`. Hypothesis is labeled when inferred.

---

## Executive summary

Chrome already stays mounted. `AppShell` is a client island. The
`(app)` layout comment is explicit: destination `loading.tsx` files
own body skeletons; chrome does not tear down. That is **not** a
persistent screen shell.

Every Social dock dest, desktop rail dest, workspace-sheet option,
Home Following / For you tab, Topics chip, Profile tab, Follows tab,
and Activity pill is a raw `next/link`. There is **no house Link
wrapper**. `useHouseNavPending` paints the dest glyph before the RSC
page lands — cosmetics. The page slot is still `{children}` from the
App Router. Tapping Home after Explore unmounts Explore.

A Social client shell that keeps Home / Explore / Messages / Profile
mounted cannot land while those hops are file-route `Link`s. Query +
Redis already seed profile / counts / follow; they do not own the
feed or the screen tree. Public profile / Search / Explore already
emit same-origin proxy hrefs (`social-edge`). Social Home and own
Profile still RSA-sign faces and media on the RSC path.

No one-line dead RSA import was safe to delete without colliding
with the sibling. Inventory only.

---

## Already client-owned (not hatches)

These stay. Sibling should extend them, not replace chrome.

| Surface | Location | Why it is not a remount hatch |
|---------|----------|-------------------------------|
| `AppShell` + phone dock host | `src/components/chrome/app-shell.tsx` | Client; chrome persists across workspace hops |
| Social segment layout | `src/app/(app)/social/layout.tsx:10` | Stays mounted across `/social/*`; **still swaps page children** |
| Create dest = sheet | `house-phone-bottom-nav.tsx:147`, `side-nav.tsx:78` | Button, not `Link` — already client-owned |
| Ask-AI overlay | `src/components/chrome/ask-ai-overlay.tsx` | Client overlay; URL-bound but not a dock remount |
| Root `QueryProvider` | `src/app/layout.tsx:35` | One QueryClient for the app session |
| Optimistic like / comment / post | `src/lib/social-optimistic.ts` | Fetch persist; tests lock no `router.refresh()` |
| Same-origin media proxy (partial) | `src/lib/social-edge.ts` | Public profile, Search, Explore already emit `/api/social/*` hrefs |

---

## P0 — Dock / tab tap remounts the RSC page

These hops unmount the current screen. A persistent shell cannot
keep Home mounted while these stay `next/link` → App Router page.

### P0-1 — Phone dock dests are raw `Link`

- **Locations:** `src/components/chrome/house-phone-bottom-nav.tsx:171–186`
- **Evidence:** Every non-Create dest is `<Link href={item.href} prefetch onClick={markPending}>`. Create is the only button (`:147`).
- **Why (hypothesis):** House pending / prefetch SoT (`house-nav-pending.ts:3`) was built to paint dest ink before RSC, not to keep the previous screen.
- **Action:** `unify-to-shell` — dock tap selects a mounted screen.

### P0-2 — Desktop Social rail dests are raw `Link`

- **Locations:** `src/components/chrome/side-nav.tsx:99–123`
- **Evidence:** Viewport prefetch on for Social (`prefetch={social}` at `:111`). Aggregation is hover-only (`:102–106`) — still a `Link` remount, just less prefetch cost.
- **Action:** `unify-to-shell` for Social first; Aggregation after.

### P0-3 — Workspace sheet options are raw `Link`

- **Locations:** `src/components/chrome/workspace-switcher.tsx:326–342`
- **Evidence:** Unselected pills are `<Link href={pill.href} prefetch>` + `markPending`. Crossing Social ↔ Home ↔ Education ↔ Aggregation remounts the page slot (`app-shell.tsx:337–357`).
- **Action:** `unify-to-shell` when the shell goes app-wide. Social-only shell can leave workspace hops as route changes.

### P0-4 — Brand emblem is a workspace-home `Link`

- **Locations:** `src/components/chrome/house-lead-chrome.tsx:87–95`
- **Evidence:** `<Link href={workspaceHome(workspace)} prefetch={social ? true : undefined}>`. Tapping the mark from Explore remounts Social Home.
- **Action:** `unify-to-shell` — emblem should select the mounted Home screen inside Social.

### P0-5 — Social Home Following / For you tabs remount Home

- **Locations:** `src/components/social/social-home-tabs.tsx:11–38`
- **Evidence:** Two `Link`s to `socialHomeLaneHref(...)`. `SocialHomePage` reads `searchParams` (`social/page.tsx:59–63`) and **re-executes** `SocialHomeCenter` (`:110`). Lane flip is a new RSC tree, not a client tab.
- **Action:** `unify-to-shell` — first Social in-screen tab the shell must own.

### P0-6 — Topics chips remount Home

- **Locations:** `src/components/social/social-home-topics.tsx:28–37`
- **Evidence:** Each chip is `<Link href={socialHomeLensHref(label, active)}>`. Same `searchParams` → same `SocialHomeCenter` remount as P0-5.
- **Action:** `unify-to-shell`.

### P0-7 — Profile / Follows / Activity / Leaderboard tabs remount

- **Locations:**
  - Profile tabs: `src/components/social/social-profile-tabs.tsx:24–36`
  - Follows tabs: `src/components/social/social-follows-tabs.tsx:27–40`
  - Activity pills: `src/components/social/social-activity-pills.tsx:49–62` (`scroll={false}` only — still a `Link`)
  - Leaderboard windows: `src/app/(app)/social/leaderboard/page.tsx:38–49`
- **Evidence:** All write `?tab=` / `?activity=` / `?window=` and re-run the RSC page. Own Profile also `await`s `searchParams` then `ensureOwnSocialProfile` before Suspense (`social/profile/page.tsx:61–88`).
- **Action:** `unify-to-shell`.

### P0-8 — Settings rail + Home period presets remount

- **Locations:**
  - Settings rail: `src/components/chrome/settings-rail.tsx:37–49`
  - Settings drill rows: `src/components/settings/settings-drill.tsx:2` (raw `next/link`)
  - Period presets: `src/components/chrome/house-period-presets.tsx:54–57` (`router.push`) and `:73–79` (`Link`)
- **Evidence:** Settings hub is file routes. Home `?period=` is the comment’s own example of “Suspense remounts” (`house-period-presets.tsx:5`).
- **Action:** `unify-to-shell` after Social dests. Period can stay a query if the Home screen stays mounted and the module refetches.

### P0-9 — There is no house Link wrapper

- **Locations:** `rg 'from "next/link"'` — chrome dock / rail / lead / settings / Social tabs all import `next/link` directly. `TextAction` (`house.tsx:46–56`) is a styled `Link`, not a keep-alive hop.
- **Evidence:** No `HouseLink` / `AppLink` / `DockLink`. Pending SoT is `useLinkStatus` + optimistic href (`use-house-nav-pending.ts:3`, `:44`).
- **Action:** `unify-to-shell` — sibling owns the hop primitive. Do not add a cosmetic wrapper in this PR.

---

## P1 — Blockers to keeping screens mounted

Even if dock taps stop remounting, these force a new RSC tree or
throw away client state.

### P1-1 — App Router `{children}` is the screen owner

- **Locations:** `src/app/(app)/layout.tsx:31–37`; `src/components/chrome/app-shell.tsx:337`, `:339`, `:350`, `:357`
- **Evidence:** Layout is a server component that passes RSC children into the client shell. No `template.tsx`. No `key=` keep-alive registry. Social layout (`social/layout.tsx:10–12`) only wraps `{children}` in `SocialProfileSaveHop`.
- **Why:** File-route pages are the current screen SoT. A client shell has to take ownership of Home / Explore / Messages / Profile (then app-wide dests) and treat the URL as a selected dest, not as a remount key.
- **Action:** `unify-to-shell`.

### P1-2 — House pending / prefetch / staleTimes are RSC cosmetics

- **Locations:**
  - `src/lib/house-nav-pending.ts:3–5` — “Click paints the destination before the RSC page lands.”
  - `src/app/(app)/layout.tsx:15–17` — no `(app)/loading.tsx` so dest skeletons do not cover chrome
  - `next.config.ts:17–29` — `staleTimes.dynamic: 30` so a revisit inside 30s skips a **server refetch**. The React tree still remounts.
- **Evidence:** Dest `loading.tsx` files exist to unlock prefetch (`src/app/(app)/social/loading.tsx`). That is instant *feedback*, not a kept screen.
- **Action:** `keep-as-proxy` until the shell lands; then pending ink should track a mounted dest, not `useLinkStatus`.

### P1-3 — `router.refresh()` in client mutation handlers

Soft-refreshes the current RSC payload. On a persistent shell this
is a silent remount of whatever the file route still owns.

**Social / Settings / account (priority for Social shell):**

| File | Lines |
|------|-------|
| `src/app/(app)/account/account-profile-form.tsx` | 86, 193 |
| `src/components/settings/team-invite-form.tsx` | 137, 148 |
| `src/components/settings/legal-entity-editor.tsx` | 83 |
| `src/components/settings/company-name-editor.tsx` | 57 |
| `src/components/messages/ask-globee-thread.tsx` | 201, 400 |
| `src/components/chrome/messages-app-header.tsx` | 160, 191 |
| `src/components/activity/mark-done.tsx` | 26 |
| `src/components/courses/course-retry.tsx` | 15 |

**Aggregation (title + share + upload):**

| File | Lines |
|------|-------|
| `aggregation/titles/add-title-button.tsx` | 58 |
| `aggregation/titles/[id]/submit-button.tsx` | 25 |
| `aggregation/titles/[id]/metadata/metadata-form.tsx` | 75 |
| `aggregation/titles/[id]/release-info-form.tsx` | 64 |
| `aggregation/titles/[id]/asset-upload.tsx` | 136 |
| `aggregation/titles/[id]/title-lifecycle-controls.tsx` | 65 |
| `aggregation/titles/[id]/buyer-share-control.tsx` | 82, 91 |

**Education manage + Staff (secondary until shell is app-wide):**
`education-course-rail.tsx:45`, `education-overview.tsx:106/121/136`,
`education-forms.tsx` (258, 265, 380, 466, 507, 603, 612, 762, 768,
874, 890, 907), `vendor-form.tsx:61`, delivery / review / finance /
title-ops controls (see `rg router.refresh` under
`src/app/(app)/(operator)`).

Like / Follow / comment / profile-edit tests already **forbid**
`router.refresh()` (`social-optimistic.test.ts:257`,
`social-follow.test.ts:66`, `social-profile-edit.test.ts:185`).
Those surfaces are the pattern.

- **Action:** `unify-to-shell` — invalidate Query / local state, do not refresh the RSC tree.

### P1-4 — `revalidatePath` after server actions

Invalidates the RSC cache the shell is trying to stop depending on.
`next.config.ts:27–29` documents the coupling: 30s staleTimes is
only “safe” because actions revalidate and 14 components refresh.

**Social (sibling-adjacent — do not rewrite Follow here):**

| File | What it busts |
|------|----------------|
| `src/app/(app)/social/light-actions.ts:78–168` | Home, Profile, public profile, follows, post, group |
| `src/app/(app)/social/actions.ts` | Profile/edit (`:178–223`), post (`:353`), stories (`:383`), groups (`:443`), DMs (`:500–572`) |
| `src/app/(app)/account/actions.ts:39–112` | Settings + `/social` + `/` + layout |

**Aggregation / Education / Staff:**
`aggregation/messages/actions.ts:20`,
`ask-globee-actions.ts:237+`, `titles/actions.ts:33`,
`titles/[id]/actions.ts` (many), `metadata/actions.ts:47–49`,
`education/manage/actions.ts:47–51`, staff channel / delivery /
grant / title-ops actions. Isolation lock:
`src/lib/aggregation-revalidate.test.ts`.

- **Action:** `unify-to-shell` for Social writes first. Keep
  `revalidatePath` only for dests that remain RSC-owned.

### P1-5 — Query + Redis seed; pages still paint from RSC

- **Locations:** `src/components/social/social-query-bound.tsx:25–26`
  — “Pages still paint from the server payload (Redis → Supabase).”
- **Evidence:** `QueryProvider` is root-level (`app/layout.tsx:35`).
  `SocialQueryBound` registers profile / counts / follow with
  `initialData` and renders **nothing**. Social Home feed is still
  `SocialHomeCenter` RSC + `signedAvatarUrls` /
  `signedSocialMediaByPostId` (`social/page.tsx:149–161`).
- **Action:** `unify-to-shell` — feed Query (sibling) must become
  the paint path, or a remounted Home will keep RSA-signing.

### P1-6 — Follow still persists through a server action

- **Locations:** `src/components/social/social-engagement.tsx:167–180`
- **Evidence:** Optimistic `setOverride` then
  `await toggleSocialFollow(formData)` with `disabled={pending}`
  (`:202`). Tests **require** `disabled={pending}`
  (`social-follow.test.ts:70`). Sibling owns Follow migrate.
- **Why it blocks the shell:** a server action + `revalidatePath`
  (`light-actions.ts:78–87`) can still refresh Home / Profile under
  a mounted screen.
- **Action:** `unify-to-shell` (sibling). Listed so nothing is missed.

### P1-7 — GET forms remount Search / Explore

- **Locations:** `src/app/(app)/social/search/page.tsx:36`;
  `src/app/(app)/social/explore/page.tsx:37`
- **Evidence:** `<form method="get" action={...}>`. Submit is a
  navigation, not a client filter. Both pages are already `runtime
  = "edge"` and use `social-edge` proxies — still RSC screens.
- **Action:** `unify-to-shell`.

---

## P2 — Signing, await+disable, RSC waterfalls (secondary)

Keep these on the list. They are request-path cost **today**. After
a client shell owns the screen they become background work (or
proxy hits), not paint blockers.

### P2-1 — `signedAvatarUrls` / `signedSocialMediaByPostId` still on RSC pages

Definitions:

- `src/lib/s3-avatars.ts:108` `signedAvatarUrl`
- `src/lib/s3-avatars.ts:118` `signedAvatarUrls` — maps each id
  through `signedAvatarUrl` (Head + sign per face)
- `src/lib/s3-social-media.ts:118` `signedSocialMediaUrl`
- `src/lib/s3-social-media.ts:160` `signedSocialMediaByPostId`

**RSC pages still calling them (escape hatches vs `social-edge`):**

| File | Lines | Call |
|------|-------|------|
| `src/app/(app)/social/page.tsx` | 97, 152–153 | Home faces + post media |
| `src/app/(app)/social/profile/page.tsx` | 117–121, 156, 163 | Own face, cover, welcome, activity media |
| `src/app/(app)/social/profile/edit/page.tsx` | 15, 19 | Edit face + welcome |
| `src/app/(app)/social/groups/[slug]/page.tsx` | 56–57 | Group wall |
| `src/app/(app)/social/stories/page.tsx` | 55, 90 | Stories + For you |
| `src/app/(app)/social/stories/[id]/page.tsx` | 94, 96 | Story viewer |
| `src/app/(app)/social/dms/page.tsx` | 38 | Inbox faces |
| `src/app/(app)/social/dms/[id]/page.tsx` | 66 | Thread faces |
| `src/app/(app)/social/create/page.tsx` | 30, 67 | Composer + For you |
| `src/app/(app)/social/leaderboard/page.tsx` | 26 | Rank faces |
| `src/app/(app)/social/p/[postId]/page.tsx` | 46 | Author face (`signedSocialMediaItems` at 47) |
| `src/app/(app)/home/page.tsx` | 153 | Overview chat faces |
| `src/components/settings/profile-settings.tsx` | 33 | Settings face |
| `src/components/settings/organization-settings.tsx` | 61 | Team faces (after RPCs) |

**Already on proxy hrefs (keep; sibling extends):**

| File | Helper |
|------|--------|
| `src/app/(app)/social/u/[handle]/page.tsx:148,158,164` | `socialMediaProxiesByPostId` / `socialAvatarFaces` |
| `src/app/(app)/social/u/[handle]/follows/page.tsx:84` | `socialAvatarFaces` |
| `src/app/(app)/social/search/page.tsx:72,96` | `socialAvatarFaces` |
| `src/app/(app)/social/explore/page.tsx:102` | `socialMediaProxiesByPostId` |

**Intended proxy endpoints (RSA belongs here, not on the page):**

| File | Line |
|------|------|
| `src/app/api/social/avatar/[userId]/route.ts` | 38 `signedAvatarUrl` |
| `src/app/api/social/media/route.ts` | 31 `signedSocialMediaUrl` |
| `src/app/api/account/photo/route.ts` | 20 `signedAvatarUrl` |

Chrome already uses `ACCOUNT_PHOTO_HREF` so a 5-minute S3 URL is
never held in the client shell (`account-avatar.ts:16`,
`house.tsx:70`). That is the pattern for faces once Home stops
pre-signing.

- **Action:** `secondary-after-shell` / `keep-as-proxy` on the API
  routes. Sibling owns moving Home / own Profile onto `social-edge`.

### P2-2 — CloudFront RSA on the request path

Four isolated signers. None are dead. Do not delete.

| Signer | File | Request-path callers |
|--------|------|----------------------|
| Title / artwork | `src/lib/cloudfront.ts:22` `signAssetUrl` → `@aws-sdk/cloudfront-signer` `:35`, `:42` | `src/lib/asset-url.ts:34`; Aggregation admin dashboard `titleArtworkUrls` (`aggregation/dashboard/page.tsx:285`) |
| Social media | `src/lib/social-media-cloudfront.ts:29` `signSocialMediaCloudfrontUrl` `:40` | `signedSocialMediaUrl` (`s3-social-media.ts:122`) — every P2-1 RSC page that still signs media |
| Education HLS | `src/lib/education-cloudfront.ts:45` `signEducationCloudfrontUrl` `:53` | `s3-education.ts:144`; Education catalog / detail cover+playback |
| Finance | `src/lib/finance-cloudfront.ts:18` `signFinanceCloudfrontUrl` | `s3-finance.ts:90` — not Social dock |

S3 presign fallbacks (also request-path CPU when CF env is absent):
`s3-avatars.ts:87`, `s3-social-media.ts:91`, `s3.ts:127`,
`s3-education.ts:103`, `s3-finance.ts:81`.

`signedAvatarUrls` Head+signs **per user** (`s3-avatars.ts:123`).
On Social Home that runs after the feed query (P2-4).

- **Action:** `secondary-after-shell`. Title / Education / Finance
  RSA stay on those dests until the shell is app-wide.

### P2-3 — `await` + `disabled={pending}` mutation UI

Server-action (or async handler) that blocks the control. Follow is
P1-6 (sibling). The rest are secondary once the shell owns the
screen; they still freeze the tap **today**.

**Blocks paint / dest (Social + login):**

| File | Line | Pattern |
|------|------|---------|
| `src/components/social/social-engagement.tsx` | 202 | Follow — sibling |
| `src/components/social/social-profile-create-form.tsx` | 60 | Create-profile submit |
| `src/components/social/social-profile-edit.tsx` | 108 | Done while pending |
| `src/components/social/social-profile-avatar-sheet.tsx` | 108, 118, 129 | Library / camera / remove |
| `src/components/social/social-comment-thread.tsx` | 279 | Comment submit (`pending \|\| !body`) — optimistic apply already ran |
| `src/app/login/login-form.tsx` | 46 | Auth submit (keep) |

**Not a Social-shell blocker (Aggregation / portal / staff):**
`screener-source-control.tsx:54` (`useTransition`),
`mark-done.tsx:21`, `account-avatar-crop.tsx:106/109`,
`portal/[token]/title-page.tsx:223/230/271`,
`transcode-panel.tsx:154`.

Mobile: `apps/mobile/src/screens/sign-in-screen.tsx:81,105`.

- **Action:** `secondary-after-shell` except Follow (P1-6). Login
  pending stays.

### P2-4 — RSC waterfalls (above-fold)

Sequential `await A` then `await B` for first paint. Under a client
shell these become background fetches. Listed so the sibling does
not “fix” them as page cosmetics.

**Social Home** — `src/app/(app)/social/page.tsx`

1. `:59` session + `searchParams`
2. `:124` `loadHomeProfile` (profile + followees)
3. `:126` wall / stories / suggested (needs followees)
4. `:149` viewed / authors / **`signedAvatarUrls`** /
   **`signedSocialMediaByPostId`** / groups / liked (needs posts)

For-you slot (`:89–99`) repeats profile+followees, then suggested,
then signs faces. Same waterfall on Stories (`stories/page.tsx:39–55`
and `:81–90`) and Create For-you (`create/page.tsx:58–67`).

**Own Profile** — `src/app/(app)/social/profile/page.tsx`

1. `:61` session + `searchParams`
2. `:71` `ensureOwnSocialProfileResult` (gates the page)
3. `:104` ensure **again** inside `SocialProfileMain`
4. `:115` parallel sign + stories + counts
5. `:150` then `loadProfilesByIds` for comment parents
6. `:155` then media + liked + parent faces

**Public profile / Search / Explore** already use `social-edge`
(no RSA on the page) but still waterfalls: Explore
`ensureOwnSocialProfile` then `loadExploreMedia`
(`explore/page.tsx:62–63`); public profile `ensureOwn` then
`loadCachedSocialProfileByHandle` (`u/[handle]/page.tsx:85–87`).

**Group wall** — `groups/[slug]/page.tsx:23–61`: session → group
row → profile → membership → `can_self_join` → posts → faces/media
→ liked.

**Leaderboard** — `leaderboard/page.tsx:22–26`: session → board →
`signedAvatarUrls`.

**Aggregation dashboard** — `aggregation/dashboard/page.tsx`

1. `:123` `createClient`
2. `:124` `getOrgContext` (depends on client)
3. `:146` `cookies()`
4. `:155` titles + findings + deliveries (parallel — good)
5. `:203` admin: `loadRecipientDashboard` (money)
6. `:229` then `audit_log`
7. `:264` then `profiles` for actor names
8. `:285` then `titleArtworkUrls` (CloudFront RSA, P2-2)

Above-fold admin hero waits on 5–8.

**Education catalog** — `education/page.tsx:27–39`: session →
`loadDiscoverableCourses` → covers + meta + lesson titles.

**Education detail** — `education/[slug]/page.tsx:23–39`: session →
`loadCourseDetail` → playback + cover + instructor.

**Home overview** — `home/page.tsx:60` `getOrgContext` (blocks
greeting), then `:102` parallel modules, then `:129` money, then
`:148` DMs, then `:151` faces, then `:170` course covers.

- **Action:** `secondary-after-shell`. Do not parallelize these
  as a substitute for a mounted screen.

---

## Chrome / dock / rails — raw `next/link` census

No house Link. Every chrome hop below is a remount (P0) unless
noted.

| Surface | File | Import |
|---------|------|--------|
| Phone dock | `house-phone-bottom-nav.tsx:4` | `next/link` |
| Desktop rail | `side-nav.tsx:3` | `next/link` |
| Settings rail | `settings-rail.tsx:3` | `next/link` |
| Lead emblem | `house-lead-chrome.tsx:1` | `next/link` |
| Workspace sheet | `workspace-switcher.tsx:12` | `next/link` |
| Period presets | `house-period-presets.tsx:9` | `next/link` |
| Messages header | `messages-app-header.tsx:4` | `next/link` |
| Lead search | `house-lead-search.tsx:4` | `next/link` |
| Pending probe | `use-house-nav-pending.ts:3` | `useLinkStatus` from `next/link` |
| `TextAction` | `house.tsx:4` | styled `Link` |
| Settings drill | `settings-drill.tsx:2` | `next/link` |
| Social Home tabs | `social-home-tabs.tsx:1` | `next/link` |
| Topics | `social-home-topics.tsx:1` | `next/link` |
| Profile tabs | `social-profile-tabs.tsx:1` | `next/link` |
| Follows tabs | `social-follows-tabs.tsx:1` | `next/link` |
| Activity pills | `social-activity-pills.tsx:3` | `next/link` |

In-page Social `Link`s (cards, empty states, stories rail, search
sheet, create sheet rows) are dest **content** hops. They remount
the destination page today; a shell can treat those as push onto a
mounted stack. Lower urgency than dock / tab.

---

## Safe one-line deletes considered

None taken.

- All four CloudFront RSA modules have live callers.
- `signedAvatarUrls` / `signedSocialMediaByPostId` still run on
  Social Home and own Profile — sibling media-proxy work.
- Follow `disabled={pending}` is locked by test and owned by
  sibling migrate.
- Dead-import cleanup of those names would collide with the SoT PR.

---

## Suggested sibling order

1. Persistent Social shell: dock + rail + emblem hops select
   mounted Home / Explore / Messages / Profile. Create stays a sheet.
2. In-screen tabs (Following / For you, Topics, Profile tabs) become
   client state + Query, not `searchParams` remounts.
3. Follow migrate + feed Query+Redis so a kept Home does not
   `revalidatePath` / RSA-sign on return.
4. Move remaining P2-1 pages onto `social-edge` (Home, own Profile,
   DMs, Stories, Groups, Leaderboard, post detail).
5. App-wide shell: Settings rail, workspace sheet, Aggregation
   dashboard, Education catalog.

---

## Blind spots

- Sibling tree was not merged at inventory HEAD. Re-run `rg`
  against that PR before treating a P2-1 row as still live.
- No browser timing. Remount is structural (file-route `Link` +
  `{children}`), not a measured ms number.
- Production Redis / CloudFront env not probed. Missing Redis is a
  documented no-op (`social-hot-cache.ts`).
- `apps/mobile` is a separate navigator. Only the sign-in
  `disabled={pending}` rows are listed.
