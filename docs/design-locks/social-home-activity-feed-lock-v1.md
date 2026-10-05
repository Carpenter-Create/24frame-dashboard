# [GC][24Frame] LOCK — Social Home activity feed + empty state v1

**Date:** 2026-09-23 (CT)  
**Status:** **LOCKED** (Adam product signal 2026-09-23 · prod shots `/social/stories` empty + Create story modal) · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS routes Dev  
**Amended (Adam 2026-10-04, G · Feed):** stack order is now tabs → topics → stories → composer → wall (`lock_tabs_topics_stories_composer_wall`, [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md)), and the wall carries a Reels rail after every 3 posts ([`social-feed-reel-rail-lock-v1.md`](social-feed-reel-rail-lock-v1.md)). Purpose, URLs and the empty state stay.  
**Amended again (founder 2026-10-05, H · Feed):** the stack is now slider → stories → composer → topics → wall (`lock_slider_stories_composer_topics_wall`); the Reels row stays after every 3 posts. Purpose, URLs and the empty state stay. See [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md).  
**Prompt copy superseded** by [`social-home-composer-share-copy-lock-v1.md`](social-home-composer-share-copy-lock-v1.md) — the live Home composer prompt and empty primary CTA are **Share something**. Purpose, stack, and URLs in this lock stay.  
**Scope:** Social **Home purpose**, **canonical URL**, **Home rail mapping**, **page empty-state copy/CTAs**, and **Stories rail vs feed** relationship. Not full feed-card craft.  
**Evidence:** Adam prod — sidebar **Home** selected while URL is `/social/stories`; page empty is stories-only (“No stories yet…” + Create a story). Second shot: `/social/stories/new` Create a story (Video only).  
**House:** Coinbase register · never-patch · phone never truncate · spacing 8 / 16 / 24 / 48  
**Cites:** `SOCIAL_ROUTES.home` = `/social` · `SOCIAL_HOME_STACK_ORDER` (topics → composer → stories → wall) · Stories create stays `/social/stories/new`

## One lock

**Social Home is the live activity feed** — posts, stories, and other follow-visible user activity in one Home surface. It is **not** a Stories-only page.

**Canonical Home URL = `/social`.**  
Do **not** invent `/social/home`. Do **not** treat `/social/stories` as Home.

---

## Purpose

| Token | Lock |
|-------|------|
| Job | Live feed of **all** follow-visible user activity on Social |
| Page title | **Feed** (`SOCIAL.home.title`) — was Home; renamed by [`shell-unified-chrome-lock-v1.md`](shell-unified-chrome-lock-v1.md) (Adam 2026-10-04). Route stays `/social` |
| Subtitle | Activity feed framing — e.g. **Activity from people you follow.** (replace “Posts from people you follow…” / any Stories-only subtitle on this page) |
| Not | A Stories index, Stories empty, or Create-story landing dressed as Home |

Feed **card** layout, media chrome, and ranking algorithms are **out** of this lock except as needed to stop Stories-only empty from owning the page.

---

## Canonical URLs (one answer)

| Surface | Path | Notes |
|---------|------|-------|
| **Home (activity feed)** | **`/social`** | `SOCIAL_ROUTES.home`. Optional lane query `?lane=following` \| `?lane=for-you` only — still Home |
| Stories create | `/social/stories/new` | Modal / sheet — Video only (existing Stories create) |
| Story viewer | `/social/stories/[id]` | Individual story |
| Bare `/social/stories` | **Permanent redirect → `/social`** | Stops the IA lie; Stories are a **rail on Home**, not a twin Home URL |
| Forbidden | `/social/home` | Never invent a third Home path |

Update any Home land / dock / checklist that currently opens `/social/stories` as Home to open **`/social`**.

---

## Home rail (dest-rail)

| Token | Lock |
|-------|------|
| Home `href` | **`/social`** only |
| Home **active** | Path is `/social` (exact) or `/social` + Home lane query — **never** because path is `/social/stories` or `/social/stories/*` |
| Re-select Home | From Stories create/viewer (or any non-Home Social route), tapping Home navigates to `/social` and clears the stuck-active fail |
| Stories | **Not** a top-level Social rail row for Home. Stories live as the **in-page rail** on Home (see stack). Do not add a Stories dest that steals Home |

CoS may already have a Dev P0 on nav stuck-active; this lock is the **IA SoT** that Home maps to `/social`, not `/social/stories`.

---

## Home column stack (IA)

Keep one Home column (cite `SOCIAL_HOME_STACK_LOCK` / `SOCIAL_HOME_STACK_ORDER`), with wall = **activity feed**:

1. **Topics** (chip rail — no section label per existing Adam note)  
2. **Composer** (“Share something” — phone + desktop; no gray liner strip)  
3. **Stories row** — horizontal rail **on** Home (Your story + followees’ stories)  
4. **Activity feed (wall)** — live activity items (not Stories-only empty as the page body)

Stories create CTA opens `/social/stories/new`. It does **not** redefine the page.

---

## Empty states

### A. Page empty — activity feed has no items (Home body)

Use **activity** copy. Do **not** ship Stories empty as the page.

| Role | Lock |
|------|------|
| Title | **No activity yet** |
| Hint | **Posts, stories, and updates from people you follow show up here.** |
| Primary CTA | **Share something** → focuses Home composer (or `/social/create` media/text if composer cannot focus) |
| Secondary CTA | **Create a story** → `/social/stories/new` |
| Optional quiet | **Find people** → people search (`socialSearchHref`) when follow graph is empty |
| Layout | Coinbase quiet empty: title `t-heading` · hint `t-body-sm` ink-3 · CTAs gap **16** · full strings wrap on phone (**never truncate**) |
| Forbidden | Page title/hint/CTA set = `SOCIAL.stories.emptyRail` / stories `emptyHint` / only Create a story |

### B. Stories rail empty — rail has no stories (Home still `/social`)

Rail-local only (compact, inside the Stories row):

| Role | Lock |
|------|------|
| Affordance | **Your story** / **Create a story** → `/social/stories/new` |
| Optional quiet | Stories empty hint may stay **rail-scoped** — never replaces the page empty (A) |
| Forbidden | Expanding the Stories rail empty into a full-page Stories empty while URL claims Home |

### C. Create story face

Unchanged product face: `/social/stories/new` · Video only · existing Stories create copy. Not redesigned in this lock.

---

## Ranked miss list (Adam prod)

| Rank | Miss | Fix |
|------|------|-----|
| **P0** | Home selected @ `/social/stories` with Stories-only empty | Home = `/social` activity feed; bare stories index redirects to Home |
| **P0** | Page empty = “No stories yet…” + only Create a story | Page empty = activity copy + Share something primary + Create a story secondary |
| **P0** | Home rail stuck / cannot re-select while on stories path | Home `href` + active = `/social` only; stories paths never wash Home |
| **P1** | Home subtitle / purpose still “posts only” or “stories only” | Subtitle + wall = activity feed |
| **P2** | Invent `/social/home` or a second Home layout | Forbidden — one `/social` |

---

## Explicit OUT

- Do **not** invent full activity-card geometry in this lock  
- Do **not** redesign Create story beyond keeping it off Home’s page purpose  
- Do **not** add Stories as a competing Home URL  
- Do **not** blank the page with no empty state (old `/social` blank fail)  
- Design does **not** open a PR  

## Gates

**G1.** Home purpose = live activity feed (not Stories-only).  
**G2.** Canonical Home URL = `/social`; no `/social/home`.  
**G3.** Home rail `href` + active state = `/social` only; `/social/stories*` never marks Home active.  
**G4.** Bare `/social/stories` permanently redirects to `/social`; create/viewer stay under `/social/stories/…`.  
**G5.** Page empty = “No activity yet” + activity hint + Share something primary + Create a story secondary (phone wraps, no truncate).  
**G6.** Stories row remains an on-Home rail; its empty does not replace the page empty.  
**G7.** Design no PR — CoS routes Dev to this lock (nav P0 may land first; empty/URL must still match G1–G6).

## Repo citation

CoS seeds: `docs/design-locks/social-home-activity-feed-lock-v1.md`  
Box draft: `/workspace/24frame-agg-ux/social-home-activity-feed-lock-v1.md`

## Amends

- Prod fail where Home land or empty is Stories-owned at `/social/stories`  
- `SOCIAL.home` subtitle / empty strings when they still read posts-only or are overridden by Stories empty on the Home page  
- Any nav SoT that sets Home `href` to `/social/stories`
