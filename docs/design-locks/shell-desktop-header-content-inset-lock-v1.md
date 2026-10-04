# [GC][24Frame] LOCK — Desktop Social header → content inset v1

**Date:** 2026-09-29 (CT)  
**Status:** **LOCKED** (Adam / CoS) · Design Own→READY · CoS seeds `docs/design-locks/` · DRAFT stays draft until founder undraft  
**Amended in part (Adam 2026-10-04, G · Feed):** On the Feed the first row under the header is the Following / For you tabs, not the topic pills. Phone: the tabs pull 12 (`SOCIAL_HOME_LANE_TABS_CLASS`, `max-md:-mt-3`) so they sit 4 under the top bar, and the topic row takes no pull. **G2** now reads on the tabs class: the pull is `max-md` only, no desktop `-mt-`. `SOCIAL_HOME_TOPICS_CLASS` is gone. Desktop: the tabs sit on the shared 8 inset, and the one-inset rule stands. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Scope:** Desktop top air under the house header on Social pages that use the social frame.  
**Entity:** Global Content / 24Frame only  
**Amends:** [`social-home-topics-strip-center-lock-v1.md`](social-home-topics-strip-center-lock-v1.md) for the desktop Topics pull only. Phone equal-air stays.  
**Does not amend:** horizontal gutters ([`shell-desktop-horizontal-gutter-lock-v2.md`](shell-desktop-horizontal-gutter-lock-v2.md)). Explore stage geometry. Phone dock. Slider / waffle host split.

---

## One lock

**One shared desktop top inset** under the header for the Social main column **and** the For You rail. No page-local top margin or padding on Home, Messages, or Profile.

| Token | Lock |
|-------|------|
| Class | `SOCIAL_DESKTOP_HEADER_INSET_CLASS` = `md:pt-[var(--space-2)]` |
| Where | Composed into `SOCIAL_DESKTOP_FRAME_PAD_CLASS`. The frame wraps the column and the rail. |
| Measure | Home topic row sat **8px** under the header hairline. Profile cover, the Messages title box, and the For You rail box sat on the frame’s **16px**. Desktop unifies to the Home **8px** (`--space-2`). |
| Phone | Frame top stays `pt-4` (16). Topics keep `max-md:-mt-[var(--space-2)]` so phone air above the pills stays 8. |
| Bottom | Frame bottom stays `pb-4` (16). |
| Rail card | For You `p-4` stays. That pad is inside the card, not a second header inset. |

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Per-page `pt` / `mt` on Home, Messages, or Profile | Drift is what this lock closes |
| Padding `PageHeader` | Shared by Settings, News, and Education |
| Changing L/R gutters | Shell gutter lock v2 |
| Moving the For You label up by shrinking `p-4` | The shared edge is the rail box |
| Applying this inset to Explore | Explore fills the column under the header |

---

## Gates

**G1.** `SOCIAL_DESKTOP_FRAME_PAD_CLASS` contains `SOCIAL_DESKTOP_HEADER_INSET_CLASS` and does not use an unprefixed `py-4`.  
**G2.** `SOCIAL_HOME_TOPICS_CLASS` pulls only at `max-md`. Desktop does not keep `-mt-[var(--space-2)]`.  
**G3.** Home, Messages (`/social/dms`), and Profile pages do not set their own `md:pt-` or `md:mt-`.

---

## Repo citation

`docs/design-locks/shell-desktop-header-content-inset-lock-v1.md`
