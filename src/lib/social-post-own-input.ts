import "server-only";

import { z } from "zod";

import { normalizeGroupSlug, SOCIAL } from "@/lib/social";
import { SOCIAL_POST_CAPTION_RAW_MAX } from "@/lib/social-post-own";

// The own-post request (caption edit and soft-delete), checked before
// anything else on the server: before ownProfile (which can insert a
// profile row) and before any read. Built the way the follow route builds
// its input: a missing field is "", never null. group_slug only names a
// page to revalidate, so an invalid one is dropped, never refused.
// docs/design-locks/social-post-caption-window-lock-v1.md §6

const targetSchema = z.object({
  post_id: z.string().trim().uuid(),
});

const captionSchema = targetSchema.extend({
  body: z.string().max(SOCIAL_POST_CAPTION_RAW_MAX),
});

export type SocialPostOwnTarget = {
  postId: string;
  /** A valid group slug, or null (no group page to revalidate). */
  groupSlug: string | null;
};

export type SocialPostCaptionInput = SocialPostOwnTarget & {
  /** Untrimmed; postCaptionWrite trims and holds it to POST_BODY_MAX. */
  rawBody: string;
};

function field(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

function groupSlugOf(form: FormData): string | null {
  return normalizeGroupSlug(field(form, "group_slug"));
}

export function readSocialPostOwnTarget(form: FormData): SocialPostOwnTarget | { error: string } {
  const parsed = targetSchema.safeParse({ post_id: field(form, "post_id") });
  if (!parsed.success) return { error: SOCIAL.post.missing };
  return { postId: parsed.data.post_id, groupSlug: groupSlugOf(form) };
}

export function readSocialPostCaptionInput(form: FormData): SocialPostCaptionInput | { error: string } {
  const parsed = captionSchema.safeParse({
    post_id: field(form, "post_id"),
    body: field(form, "body"),
  });
  if (!parsed.success) {
    // A bad id is reported first: there is no post to talk about.
    const badId = parsed.error.issues.some((issue) => issue.path[0] === "post_id");
    return { error: badId ? SOCIAL.post.missing : SOCIAL.post.editTooLong };
  }
  return { postId: parsed.data.post_id, groupSlug: groupSlugOf(form), rawBody: parsed.data.body };
}
