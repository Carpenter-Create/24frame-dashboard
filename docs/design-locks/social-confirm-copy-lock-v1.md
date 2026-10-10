# [GC][24Frame] LOCK — Social confirm copy v1 (delete post)

**Date:** 2026-09-28 (CT)  
**Status:** Delete-post confirm **LOCKED** (CoS CLEAR · Adam). Sibling confirms wait Design Own→READY. PR stays **DRAFT**. Tip-gated dual later.  
**Amended:** 2026-10-09 by [`social-post-caption-window-lock-v1.md`](social-post-caption-window-lock-v1.md) (Adam, "approved, use the defaults").  
**Repo citation:** `docs/design-locks/social-confirm-copy-lock-v1.md`  
**Register:** Familiar Social verbs · Coinbase-precise · quiet helpers  
**Scope:** String swaps on the existing owner post delete `Dialog` only. No new confirm chrome, sheet geometry, or information architecture. Edit caption moved to the house window; this lock now covers the delete Dialog only.  
**Out of scope:** Autoplay · For You | Following · Landscape-Reel · undraft / merge · inventing sibling strings

---

## One lock

The author delete confirm on an existing post uses Adam’s Remove / Keep copy. The overflow menu item stays **Delete**. Edit caption is the house window over the post: ✕ Close · Done, no Cancel; leaving with changes asks Keep editing · Discard (Edit profile's approved ask, not new confirm chrome).

Nearby `SOCIAL` strings use a straight apostrophe (`youSentStory` and the other `@handle's` lines). The body matches that mark.

---

## Copy table — delete post

| Surface | Lock |
|---------|------|
| Overflow menu (`SOCIAL.post.delete`) | **Delete** (unchanged) |
| Dialog title (`SOCIAL.post.deleteTitle`) | **Remove this post?** |
| Dialog body (`SOCIAL.post.deleteBody`) | **It'll come off your profile and the feed. Comments and likes go with it.** |
| Primary danger (`SOCIAL.post.deleteConfirm`) | **Remove** |
| Secondary (`SOCIAL.post.deleteKeep`) | **Keep** — delete Dialog only |
| Edit caption | No secondary (the caption window; `SOCIAL.post.editCancel` retired) |
| Failure (`SOCIAL.post.deleteFailed`) | **Could not remove that post.** |

Host stays `src/components/social/social-post-owner.tsx` (`Dialog`, `size="sm"`). SoT stays `src/lib/social.ts`.

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
| New confirm UI, sheet geometry, dual-host chrome | Tip-gated dual later (the caption window's ask is the house window shell's; write compose is unchanged) |
| Renaming the overflow menu to Remove | Dialog is the confirm surface |
| Edit caption Cancel → Keep | Superseded: Edit caption has no Cancel; Keep stays delete-only |

---

## Done-when

1. Delete Dialog title, body, **Remove**, and **Keep** match the table.  
2. Edit caption is the caption window (no Cancel).  
3. Overflow menu still says **Delete**.  
4. `deleteFailed` says **Could not remove that post.**  
5. Sibling confirms are unchanged.
