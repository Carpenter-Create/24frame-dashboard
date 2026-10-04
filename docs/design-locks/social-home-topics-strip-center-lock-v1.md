# [GC][24Frame] LOCK — Social Home Topics strip center v1

**Date:** 2026-09-25
**Status:** **LOCKED** (Adam glance on tip `705672c3`: composer PASS. Nit: Topic pills sit closer to the bottom of the strip than the top.) · **Desktop header inset** amend 2026-09-29: desktop top air is the shared Social header inset. The phone pull stays.  
**Superseded (Adam 2026-10-04, G · Feed):** the topic pills are gone; the topic row is D plain words under E's tabs. See [`social-home-lane-tabs-lock-v1.md`](social-home-lane-tabs-lock-v1.md).  
**Repo citation:** `docs/design-locks/social-home-topics-strip-center-lock-v1.md`
**Does not reopen:** `docs/design-locks/social-home-composer-fb-row-sheet-lock-v1.6.md`

---

## One lock

Topic pills are vertically centered in the Topics section, between the header hairline and the composer top rule. The air above the pill row equals the air below it. Phone and desktop.

Pill hit stays 32. Pill copy stays. The row still scrolls sideways. It does not truncate.

## Measure

Phone: the social frame pads 16 above the stack. The spine gap under the pills is 8. The Topics host pulls up by that extra 8 on phone only (`max-md:-mt-[var(--space-2)]`). Both phone airs are 8.

Desktop: the shared header inset is 8 (`SOCIAL_DESKTOP_HEADER_INSET_CLASS`). The spine gap is 8. Topics do not pull. Home, Messages, Profile, and the For You rail share that inset. See [`shell-desktop-header-content-inset-lock-v1.md`](shell-desktop-header-content-inset-lock-v1.md).

## Explicit OUT

| OUT | Why |
|-----|-----|
| Composer v1.6 tokens | White band, pad Y 8, band 56, top and bottom hairline only, no side stroke, radius 0 |
| Pill size or copy | Not required for center |
| Sibling divider | Host borders are the chrome |
| Changing the frame's horizontal gutters | L/R stay the shell gutter lock |
| A second desktop top inset on Topics, Messages, or Profile | One shared class |
