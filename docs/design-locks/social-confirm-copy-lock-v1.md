# [GC][24Frame] LOCK — Social confirm copy v1 (delete post)

**Date:** 2026-09-28 (CT)  
**Status:** Delete-post confirm **LOCKED** (CoS CLEAR · Adam). Sibling confirms wait Design Own→READY. PR stays **DRAFT**. Tip-gated dual later.  
**Amended:** 2026-10-09 by [`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md) (Adam, "approved, use the defaults").  
**Amended:** 2026-10-09 by [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md) (Adam, "approved, do it after Edit caption merges. make both better than it is."): the menu says **Remove**, the body is new, and the confirm is the house ask with no ✕.  
**Repo citation:** `docs/design-locks/social-confirm-copy-lock-v1.md`  
**Register:** Familiar Social verbs · Coinbase-precise · quiet helpers  
**Scope:** The owner post Remove confirm's strings and the ⋯'s Remove item. Its chrome is the house ask in the confirm hosts ([`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md)). Edit caption is the house window ([`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md)).  
**Out of scope:** Autoplay · For You | Following · Landscape-Reel · undraft / merge · inventing sibling strings

---

## One lock

The author's Remove confirm on an existing post uses Adam’s Remove / Keep copy. The overflow menu item is **Remove**, the same verb and string as the confirm (superseded 2026-10-09 by [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md); it was Delete). Edit caption is the house window over the post: ✕ Close · Done, no Cancel; leaving with changes asks Keep editing · Discard (Edit profile's approved ask, not new confirm chrome).

Nearby `SOCIAL` strings use a straight apostrophe (`youSentStory` and the other `@handle's` lines). The body matches that mark.

---

## Copy table — remove post

| Surface | Lock |
|---------|------|
| Overflow menu (`SOCIAL.post.deleteConfirm`, one string with the confirm) | **Remove** (was Delete; `SOCIAL.post.delete` retired) |
| Overflow menu, edit (`SOCIAL.post.editTitle`) | **Edit caption** (was Edit; `SOCIAL.post.edit` retired) |
| Confirm title (`SOCIAL.post.deleteTitle`) | **Remove this post?** |
| Confirm body (`SOCIAL.post.deleteBody`) | **It comes off 24Frame, with its comments and likes. You can't undo this.** (was "It'll come off your profile and the feed. Comments and likes go with it.") |
| Action (`SOCIAL.post.deleteConfirm`) | **Remove**, the ask's outlined pill in the house danger ink |
| Keep (`SOCIAL.post.deleteKeep`) | **Keep**, first and focused; the Remove confirm only |
| Edit caption | No secondary (the caption window; `SOCIAL.post.editCancel` retired) |
| Failure (`SOCIAL.post.deleteFailed`) | **Could not remove that post.** |

Host: `src/components/social/social-post-owner.tsx` with `social-post-owner-sheet.tsx` (the house ask in HouseDialog's confirm width on desktop; the AppSheet card on a phone). SoT stays `src/lib/social.ts`.

---

## Waiting — Design Own→READY

Do not invent these strings in this tip. No confirm `Dialog` exists for them in the tree today. Closest surfaces, left unchanged:

| Sibling | Closest path | What exists |
|---------|--------------|-------------|
| Unfollow | `src/components/social/social-engagement.tsx` | Follow toggle. Toast after a follow persist. No unfollow confirm Dialog. |
| Leave group | `src/components/social/social-group-forms.tsx` (`SocialJoinGroupButton`) · `SOCIAL.groups` | Join only. No leave confirm Dialog. |
| Discard draft | `src/components/social/social-create-compose.tsx` · `leaveSocialWriteCompose` | Write compose leaves without a discard Dialog. (The caption window's ask is the house window shell's; write compose is unchanged.) |
| Report | — | No report confirm Dialog under `src/components/social`. |

---

## Explicit OUT

| OUT | Why |
|-----|-----|
| Unfollow / leave group / discard draft / report copy | Design owns those rows (the caption window's ask is the house window shell's; write compose is unchanged) |
| New confirm UI, sheet geometry, dual-host chrome | Tip-gated dual later (the caption window's ask is the house window shell's; write compose is unchanged) (superseded 2026-10-09 for the Remove confirm only: the house ask, [`social-post-owner-menu-lock-v1.md`](social-post-owner-menu-lock-v1.md); sibling confirms still wait) |
| Renaming the overflow menu to Remove | ~~Dialog is the confirm surface~~ Superseded 2026-10-09: the menu says Remove (Adam) |
| Edit caption Cancel → Keep | Superseded: Edit caption has no Cancel; Keep belongs to the Remove confirm only |

---

## Done-when

1. The Remove confirm's title, body, **Keep** and **Remove** match the table.  
2. Edit caption is the caption window (no Cancel).  
3. Overflow menu says **Remove**, never Delete.  
4. `deleteFailed` says **Could not remove that post.**  
5. Sibling confirms are unchanged.
