# [GC][24Frame] LOCK: Social music block copy v1 (Phase 0)

**Date:** 2026-10-08 (CT) · **Amend A1:** 2026-10-08 (CT), four Phase 0 keys added  
**Status:** **LOCKED** · Design Own→READY · Design does **not** open a PR · CoS seeds `docs/design-locks/` · CoS CLEARs Dev on #790  
**Repo citation:** `docs/design-locks/social-music-block-copy-lock-v1.md`  
**Box draft:** `/workspace/24frame-agg-ux/social-music-block-copy-lock-v1.md`  
**PR context (no Design ship):** https://github.com/Carpenter-Create/24frame-dashboard/pull/790 tip `533ce260`  
**Standing:** Launch-great · Immersive Social · rich-calm · calm non-anxiety voice · mobile never-truncate · no em dashes in body copy  
**Adam bar:** No music on 24Frame until Content ID is sorted. Phase 0 fingerprint match ≥25 blocks. User sees a **generic** line only. **No** song title. **No** legal claims.

---

## One lock

Author-only music notices stay **generic and short**. Staff Music review may show vendor title/artist for ops. End-user copy never names a recording, artist, score, or clearance outcome.

---

## A) End-user copy (`SOCIAL.music` in `src/lib/social.ts`)

Shown only to the **author** on their own post card / story (existing `InlineNotice` / story line hosts). Never on other people's surfaces.

| Key | Lock |
|-----|------|
| `SOCIAL.music.pending` | **This video is not visible to others yet.** |
| `SOCIAL.music.blocked` | **This video can't be shared because it includes music.** |

**Voice:** calm · precise · warm · established. Straight apostrophe (`can't`). One sentence. No song title · no artist · no score · no “copyright” / “Content ID” / “illegal” / “appeal” invent.

**Why blocked wording:** “shared” matches Social visibility (author may still see their own held video). “includes music” states the gate without claiming ownership or infringement.

**FAIL:** Naming a match. Soft hedging piles. Long legal tone. Inventing a second CTA on this tip.

### A1) Amend: Phase 0 keys (Adam locks: no music; 8 minute cap on posts, stories and Go live; welcome videos on Mux with the same scan; older videos held until scanned)

Same hosts, same author-only rule, same voice. Notice text only. No new buttons.

| Key | Lock |
|-----|------|
| `SOCIAL.music.tooLong` | **Videos can be up to 8 minutes.** |
| `SOCIAL.music.welcomePending` | **This welcome video is not visible to others yet.** |
| `SOCIAL.music.legacyHeld` | **This video is not visible to others until it's checked.** |
| `SOCIAL.music.malformed` | **This video can't be checked. Try uploading it again.** |

**Why:**
- `tooLong` states the limit, which is the next step. One key covers post, story and Go live, so no "trim" or "choose another" (neither fits a live). Do not split keys in this tip.
- `welcomePending` keeps the Dev line. It mirrors `pending`.
- `legacyHeld` joins the "not visible to others" family so owners read held, pending and welcome the same way. Drops "held", which reads as staff language.
- `malformed` adds one plain next step in text. No retry button invent.

**FAIL:** "Content ID", "copyright", "violation" or score in any of these. Ellipsis or truncation on phone (stack). Curly apostrophes in code strings.

---

## B) Staff Music review chrome (`SOCIAL_MUSIC_REVIEW` in `src/lib/social-music-review.ts` · nav in `src/lib/nav.ts`)

Ops list only. Listing a row does **not** release the video. Vendor fields stay on this surface.

| Key | Lock |
|-----|------|
| Nav + page title | **Music review** |
| `subtitle` | **Social videos held after a music check.** |
| `empty` | **No videos are waiting.** |
| `blocked` (trailing) | **Blocked** |
| `unfinished` (trailing) | **Unfinished** |
| `post` | **Social post** |
| `story` | **Social story** |
| `matchFallback` | **Music match** |
| `unfinishedDetail` | **The check did not finish. The video stays hidden.** |

Row name stays `Social post · {author}` / `Social story · {author}` when a name exists. Secondary may append vendor title/artist + score + asset id for staff only.

**FAIL:** Surfacing vendor title/artist on Social end-user chrome. Inventing release / allowlist / appeal UI in this tip.

---

## Out of scope

- Fingerprint vendor choice · threshold math · Lambda / Mux wiring  
- Allowlist / Content ID Phase 2  
- New confirm sheets or toast invent  
- Changing notice chrome geometry (hosts stay as #790)

---

## Ship cite for Dev

1. Replace placeholder `SOCIAL.music.blocked` with the locked string above. Keep `pending` as locked (already matches).  
1a. Set `tooLong`, `welcomePending`, `legacyHeld`, `malformed` to table A1.  
2. Align `SOCIAL_MUSIC_REVIEW` + Staff nav label to table B (`matchFallback` → **Music match**; `subtitle` drop “commercial-”).  
3. Cite `docs/design-locks/social-music-block-copy-lock-v1.md` before undraft.
