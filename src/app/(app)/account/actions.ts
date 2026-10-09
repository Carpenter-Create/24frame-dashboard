"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  ACCOUNT_PROFILE,
  COMPANY_PROFILE,
  accountNameSchema,
  companySaveSchema,
} from "@/lib/account-profile";
import {
  AVATAR_CLEARED,
  AVATAR_MAX_BYTES,
  isAvatarContentType,
  replacedAvatarObjectKeys,
} from "@/lib/account-avatar";
import {
  deleteAvatarObject,
  deleteReplacedAvatarObjects,
  releaseAvatarHoldTag,
  storeAvatarReplacement,
} from "@/lib/s3-avatars";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";

// Display name only. Email is auth.users — changing the login email is an
// auth gate and is not done here. user_metadata.display_name already exists
// (createOrg mirrors the org name into it).
export async function saveAccountName(name: unknown): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ctx = await getOrgContext();
  if (!ctx) return { error: ACCOUNT_PROFILE.signedOut };

  const parsed = accountNameSchema.safeParse(name);
  if (!parsed.success) return { error: ACCOUNT_PROFILE.invalidName };

  const { error } = await supabase.auth.updateUser({
    data: { display_name: parsed.data },
  });
  if (error) return { error: error.message || ACCOUNT_PROFILE.saveFailed };

  // updateUser writes user_metadata but leaves the access-token JWT as a
  // snapshot. getAuthUser reads display_name from getClaims(), so
  // /settings/profile and the account-sheet Identity stay empty until
  // this refresh.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return { error: refreshError.message || ACCOUNT_PROFILE.saveFailed };

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/settings/profile/name");
  revalidatePath("/");
  return {};
}

async function reportAvatarOrphan(keys: readonly string[], cause: unknown): Promise<void> {
  const failure = cause instanceof Error ? cause : new Error("avatar replace orphan");
  const reported = Object.assign(failure, { orphanKeys: [...keys] });
  console.error("avatar replace orphan", reported.orphanKeys, reported.message);
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(reported);
}

async function reportNewerAvatarKept(readKey: string | null): Promise<void> {
  const reported = new Error("newer face was kept");
  console.error("avatar remove kept newer face", readKey, reported.message);
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(reported);
}

// Photo bytes go to a new private object. The pointer moves only after that
// object is confirmed. The previous canonical object, this member's previous
// recheck object, and this member's quarantine copies are deleted after the
// swap. A failure before the swap deletes nothing. Email is not touched.
export async function uploadAccountPhoto(formData: FormData): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: ACCOUNT_PROFILE.signedOut };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: ACCOUNT_PROFILE.photoMissing };
  }
  if (!isAvatarContentType(file.type)) return { error: ACCOUNT_PROFILE.photoType };
  if (file.size > AVATAR_MAX_BYTES) return { error: ACCOUNT_PROFILE.photoTooLarge };

  try {
    const body = new Uint8Array(await file.arrayBuffer());
    const supabase = await createClient();
    const previous = await supabase.from("profiles").select("avatar_key").eq("id", ctx.user.id).maybeSingle();
    if (previous.error || !previous.data) return { error: previous.error?.message || ACCOUNT_PROFILE.photoFailed };
    const previousKey = previous.data.avatar_key;
    let stored: { key: string; etag: string };
    try {
      stored = await storeAvatarReplacement({
        userId: ctx.user.id,
        objectId: randomUUID(),
        body,
        contentType: file.type,
      });
    } catch (e) {
      if (e instanceof Error && e.message === "Unsupported avatar content type") {
        return { error: ACCOUNT_PROFILE.photoType };
      }
      return { error: e instanceof Error && e.message ? e.message : ACCOUNT_PROFILE.photoFailed };
    }
    const admin = createAdminClient();
    const update = admin.from("profiles").update({ avatar_key: stored.key }).eq("id", ctx.user.id);
    const filtered = previousKey == null ? update.is("avatar_key", null) : update.eq("avatar_key", previousKey);
    const { data, error } = await filtered.select("id");
    if (error || !data || data.length === 0) {
      await reportAvatarOrphan([stored.key], error ?? new Error("avatar_key changed before replace"));
      return { error: error?.message || ACCOUNT_PROFILE.photoFailed };
    }
    try {
      await releaseAvatarHoldTag(ctx.user.id, stored.key);
    } catch (e) {
      await reportAvatarOrphan([stored.key], e);
    }
    try {
      await deleteReplacedAvatarObjects(ctx.user.id, previousKey, stored.key);
    } catch (e) {
      await reportAvatarOrphan(replacedAvatarObjectKeys(ctx.user.id, previousKey, stored.key), e);
    }
  } catch (e) {
    return { error: e instanceof Error && e.message ? e.message : ACCOUNT_PROFILE.photoFailed };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/social");
  revalidatePath("/social/profile");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return {};
}

// Inverse of uploadAccountPhoto. The clear matches the avatar_key that was
// read. Only then are the canonical object, every object under
// avatars/{id}/recheck/, and this member's quarantine copies deleted.
// Zero rows means a newer face was kept: report it and delete nothing.
export async function removeAccountPhoto(): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: ACCOUNT_PROFILE.signedOut };

  try {
    const supabase = await createClient();
    const previous = await supabase.from("profiles").select("avatar_key").eq("id", ctx.user.id).maybeSingle();
    if (previous.error || !previous.data) return { error: previous.error?.message || ACCOUNT_PROFILE.photoRemoveFailed };
    const previousKey = previous.data.avatar_key;
    const admin = createAdminClient();
    const update = admin.from("profiles").update({ avatar_key: AVATAR_CLEARED }).eq("id", ctx.user.id);
    const filtered = previousKey == null ? update.is("avatar_key", null) : update.eq("avatar_key", previousKey);
    const { data, error } = await filtered.select("id");
    if (error) return { error: error.message || ACCOUNT_PROFILE.photoRemoveFailed };
    if (!data || data.length === 0) {
      await reportNewerAvatarKept(previousKey);
      return {};
    }
    try {
      await deleteAvatarObject(ctx.user.id, previousKey);
    } catch (e) {
      await reportAvatarOrphan(replacedAvatarObjectKeys(ctx.user.id, previousKey, AVATAR_CLEARED), e);
    }
  } catch (e) {
    return {
      error: e instanceof Error && e.message ? e.message : ACCOUNT_PROFILE.photoRemoveFailed,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/social");
  revalidatePath("/social/profile");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return {};
}

// organizations.name — existing column, existing organizations_update RLS
// (member_can manage_settings). Bind the write to the org the form rendered,
// not whichever cookie is active at submit.
export async function saveCompanyName(input: unknown): Promise<{ error?: string }> {
  const supabase = await createClient();
  const ctx = await getOrgContext();
  if (!ctx) return { error: COMPANY_PROFILE.signedOut };

  const parsed = companySaveSchema.safeParse(input);
  if (!parsed.success) {
    const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === "name");
    return {
      error:
        nameIssue?.code === "too_small" ? COMPANY_PROFILE.nameRequired : COMPANY_PROFILE.invalidName,
    };
  }

  const { data: canManage, error: canError } = await supabase.rpc("member_can", {
    p_uid: ctx.user.id,
    p_org: parsed.data.orgId,
    p_capability: "manage_settings",
  });
  if (canError || canManage !== true) return { error: COMPANY_PROFILE.forbidden };

  const { data, error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.orgId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message || COMPANY_PROFILE.saveFailed };
  if (!data) return { error: COMPANY_PROFILE.forbidden };

  revalidatePath("/settings");
  revalidatePath("/settings/organization");
  revalidatePath("/settings/organization/company");
  revalidatePath("/settings/profile");
  revalidatePath("/");
  return {};
}
