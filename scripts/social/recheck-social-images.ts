/**
 * Recheck published Social images and avatars.
 * Dry-run is the default. Pass --execute to write each re-encoded image to a
 * new key and point the post, story, or avatar at it. The original object
 * stays in the private bucket and is not overwritten, so the run can be
 * reversed from the new object's gc-previous-key metadata.
 * A post or story whose image will not decode is set to hidden.
 * A read error or a store error is unfinished: reported, not hidden, and
 * retried on the next run. The next run loads status = active, so a hidden
 * post is not retried and a store error must not hide.
 * A 404 or NoSuchKey on the canonical avatar key is no avatar. It is
 * counted as no_object and skipped. It is not unfinished.
 * A HeadObject error on a recheck key uses that same split. 404 or
 * NoSuchKey is no_object. Any other head error is unfinished and retried.
 * It is not skipped.
 * An avatar that will not decode is cleared so the default face shows. The
 * canonical object is moved to avatars/{id}/quarantine/{objectId}. That
 * prefix is never signed. Rollback is the CLI in
 * docs/infra/social-music-detect.md: the copy replaces tags, and the
 * pointer is set only after gc-hold is gone.
 * One page is read, rechecked, and dropped before the next page.
 * Do not run this against production from CI. Adam runs it after the SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts --execute
 */
import { randomUUID } from "node:crypto";

import {
  AVATAR_CLEARED,
  avatarObjectKey,
  avatarRecheckObjectKey,
  isAvatarRecheckKey,
} from "@/lib/account-avatar";
import { avatarSwapFailureDecision } from "@/lib/avatar-swap-rollback";
import {
  applyAvatarHoldTag,
  headAvatarRecheck,
  putAvatarRecheckObject,
  quarantineAvatarObject,
  readAvatarObject,
  releaseAvatarHoldTag,
} from "@/lib/s3-avatars";
import { headSocialImageRecheck, putRecheckedSocialImage, readSocialMediaObject } from "@/lib/s3-social-media";
import {
  pointSocialMediaAtRecheckedImage,
  blankSocialImageRecheckReport,
  recheckParentPages,
  recheckedSocialImageKey,
  recheckWantsExecute,
  runSocialImageRecheck,
  SOCIAL_IMAGE_RECHECK_ORDER,
  SOCIAL_IMAGE_RECHECK_PAGE,
  socialPostHasLegacyS3Video,
  type SocialImageRecheckItem,
  type SocialImageRecheckReport,
} from "@/lib/social-image-reencode";
import { createAdminClient } from "@/lib/supabase/admin";
import { runUnholdLiveAvatars } from "./unhold-live-avatars";

export { recheckWantsExecute };

/**
 * PostgREST serializes a filter as `eq.${value}`. An object becomes
 * `[object Object]` and the write is 22P02. A JSON string matches jsonb.
 */
export function socialMediaEqualityFilter(current: unknown): string {
  return JSON.stringify(current);
}

type MediaWriter = {
  from: (table: "posts" | "stories") => {
    update: (values: { media: unknown }) => {
      eq: (
        column: "id",
        value: string,
      ) => {
        eq: (
          column: "media",
          value: string,
        ) => {
          select: (columns: "id") => PromiseLike<{
            data: { id: string }[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
};

/** Conditional repoint. The media filter is the JSON text of the value that was read. */
export async function pointParentAtRecheckedMedia(
  admin: MediaWriter,
  table: "posts" | "stories",
  parentId: string,
  current: unknown,
  next: unknown,
): Promise<{ data: { id: string }[] | null; error: { message: string } | null }> {
  return await admin
    .from(table)
    .update({ media: next })
    .eq("id", parentId)
    .eq("media", socialMediaEqualityFilter(current))
    .select("id");
}

type AvatarPointerQuery = {
  eq: (column: "avatar_key", value: string) => AvatarPointerQuery;
  is: (column: "avatar_key", value: null) => AvatarPointerQuery;
  select: (columns: "id") => PromiseLike<{
    data: { id: string }[] | null;
    error: { message: string; code?: string } | null;
  }>;
};

type AvatarPointerWriter = {
  from: (table: "profiles") => {
    update: (values: { avatar_key: string }) => {
      eq: (column: "id", value: string) => AvatarPointerQuery;
    };
  };
};

/** NULL was read with is(null). A string was read with eq of that string. */
export async function writeAvatarPointer(
  admin: AvatarPointerWriter,
  parentId: string,
  readKey: string | null,
  nextKey: string,
): Promise<{ data: { id: string }[] | null; error: { message: string; code?: string } | null }> {
  const update = admin.from("profiles").update({ avatar_key: nextKey }).eq("id", parentId);
  const filtered = readKey === null ? update.is("avatar_key", null) : update.eq("avatar_key", readKey);
  return await filtered.select("id");
}

type AvatarKeyRead = {
  data: { avatar_key: string | null } | null;
  error: { message: string } | null;
};

type ProfileAvatarKeyReader = {
  from(table: "profiles"): {
    select(columns: "avatar_key"): {
      eq(column: "id", value: string): { maybeSingle(): PromiseLike<AvatarKeyRead> };
    };
  };
};

async function readProfileAvatarKey(admin: AvatarPointerWriter, userId: string): Promise<string | null> {
  const reader = admin as unknown as ProfileAvatarKeyReader;
  const row = await reader.from("profiles").select("avatar_key").eq("id", userId).maybeSingle();
  if (row.error || !row.data) throw row.error ?? new Error("avatar pointer was not read");
  return row.data.avatar_key;
}

/**
 * Release the hold, confirm it, then move the pointer.
 * A failed release throws and the pointer stays on the face that was read.
 * A failure after a successful release re-reads profiles.avatar_key.
 * gc-hold goes back on the new key only when the swap itself proves it did
 * not commit (zero rows, or a documented Postgres rollback SQLSTATE) and
 * that read shows the key is not live. A transport, timeout, or unknown
 * error leaves the key unfinished and untagged. The re-read is not proof.
 * A re-read that names the new key is success. The original object stays
 * so this run can be reversed. This path does not delete it.
 */
export async function commitRecheckedAvatar(
  admin: AvatarPointerWriter,
  parentId: string,
  readKey: string | null,
  nextKey: string,
  releaseHold: (userId: string, key: string) => Promise<void> = (userId, key) =>
    releaseAvatarHoldTag(userId, key, () => readProfileAvatarKey(admin, userId)),
  rehold: (userId: string, key: string) => Promise<void | "held" | "live"> = (userId, key) =>
    applyAvatarHoldTag(userId, key, () => readProfileAvatarKey(admin, userId)),
  readPointer: () => Promise<string | null> = () => readProfileAvatarKey(admin, parentId),
): Promise<{ skipped: true; orphanKey: string } | Record<string, never>> {
  await releaseHold(parentId, nextKey);
  const { data, error } = await writeAvatarPointer(admin, parentId, readKey, nextKey);
  if (!error && data && data.length > 0) return {};
  let live: string | null;
  try {
    live = await readPointer();
  } catch (readError) {
    const failure = readError instanceof Error ? readError : new Error("avatar pointer was not read");
    throw Object.assign(failure, { unverifiedKey: nextKey });
  }
  const decision = avatarSwapFailureDecision({ error, data, live, userId: parentId, key: nextKey });
  if (decision === "committed") {
    // The pointer already names this key, so the swap is the live face.
    return {};
  }
  if (decision === "rehold") {
    const held = await rehold(parentId, nextKey);
    if (held === "live") return {};
    assertOk(error, "point avatar at rechecked image");
    return { skipped: true, orphanKey: nextKey };
  }
  const unfinished = new Error(error?.message || "avatar swap did not prove a rollback");
  throw Object.assign(unfinished, { orphanKey: nextKey });
}

/** A store error keeps a classification it already has. Otherwise the pointer was not read, so the key is unverified. */
export function classifyRecheckFailure(error: unknown, nextKey: string): Error {
  const failure = error instanceof Error ? error : new Error("recheck_failed");
  const row = failure as Error & { orphanKey?: unknown; liveKey?: unknown; unverifiedKey?: unknown };
  if (typeof row.orphanKey === "string" || typeof row.liveKey === "string" || typeof row.unverifiedKey === "string") {
    return failure;
  }
  return Object.assign(failure, { unverifiedKey: nextKey });
}

/** Include a null pointer. Exclude a cleared pointer. */
export const AVATAR_RECHECK_PAGE_OR = `avatar_key.is.null,avatar_key.neq.${AVATAR_CLEARED}`;

/**
 * Null and the canonical key are read from avatars/{id}/avatar.
 * This member's recheck key is only skipped once it already carries gc-reencoded.
 * Anything else is not this member's face.
 */
export function avatarRecheckTarget(profile: {
  id: string;
  avatar_key: string | null;
}): { kind: "canonical"; key: string } | { kind: "recheck"; key: string } | { kind: "skip"; note: string } {
  let canonical = "";
  try {
    canonical = avatarObjectKey(profile.id);
  } catch {
    return { kind: "skip", note: "key is not a profile id" };
  }
  const stored = profile.avatar_key;
  if (stored != null && isAvatarRecheckKey(stored, profile.id)) {
    return { kind: "recheck", key: stored };
  }
  if (stored != null && stored !== canonical) {
    return { kind: "skip", note: "key does not match the profile object" };
  }
  return { kind: "canonical", key: canonical };
}

/**
 * GetObject on a missing canonical key is NoSuchKey, HTTP 404.
 * HeadObject on the same key is NotFound, HTTP 404. Either one means no face.
 * A 500, a timeout, or a network error is not this case.
 */
export function avatarCanonicalObjectMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const failure = error as {
    name?: unknown;
    Code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  if (failure.$metadata?.httpStatusCode === 404) return true;
  const name = typeof failure.name === "string" ? failure.name : "";
  const code = typeof failure.Code === "string" ? failure.Code : "";
  return name === "NoSuchKey" || code === "NoSuchKey" || name === "NotFound" || code === "NotFound";
}

/**
 * Head result for one avatar pointer.
 * A recheck key whose head fails for any reason other than 404/NoSuchKey
 * is unfinished. The next run tries it again. It is not a skip.
 */
export function planAvatarRecheckHead(
  profileId: string,
  target: { kind: "canonical" | "recheck"; key: string },
  marked: { reencoded: boolean } | null,
  error: unknown,
):
  | { kind: "unfinished"; item: SocialImageRecheckItem }
  | { kind: "no_object" }
  | { kind: "already"; item: SocialImageRecheckItem }
  | { kind: "skip"; note: string }
  | { kind: "read" } {
  if (error && target.kind === "recheck" && !avatarCanonicalObjectMissing(error)) {
    const message = error instanceof Error ? error.message : "head_failed";
    return {
      kind: "unfinished",
      item: {
        surface: "avatar",
        parentId: profileId,
        key: target.key,
        original: new Uint8Array(),
        contentType: "image/jpeg",
        readError: message,
      },
    };
  }
  if (target.kind === "recheck" && (error ? avatarCanonicalObjectMissing(error) : !marked)) {
    return { kind: "no_object" };
  }
  if (marked?.reencoded) {
    return {
      kind: "already",
      item: {
        surface: "avatar",
        parentId: profileId,
        key: target.key,
        original: new Uint8Array(),
        contentType: "image/jpeg",
        alreadyReencoded: true,
      },
    };
  }
  if (target.kind === "recheck") {
    return { kind: "skip", note: "key does not match the profile object" };
  }
  return { kind: "read" };
}

/** Classify every avatar on the page. The caller stores the pointers it read. */
export async function readAvatarRecheckPage(
  profiles: readonly { id: string; avatar_key: string | null }[],
  head: (key: string) => Promise<{ reencoded: boolean }>,
  read: (userId: string) => Promise<{ bytes: Uint8Array; contentType: string } | null>,
): Promise<{ items: SocialImageRecheckItem[]; noObject: number; notes: string[] }> {
  const items: SocialImageRecheckItem[] = [];
  const notes: string[] = [];
  let noObject = 0;
  for (const profile of profiles) {
    const target = avatarRecheckTarget(profile);
    if (target.kind === "skip") {
      notes.push(`avatar ${profile.id} ${target.note}`);
      continue;
    }
    let marked: { reencoded: boolean } | null = null;
    let headError: unknown = null;
    try {
      marked = await head(target.key);
    } catch (error) {
      headError = error;
    }
    const planned = planAvatarRecheckHead(profile.id, target, marked, headError);
    if (planned.kind === "unfinished" || planned.kind === "already") {
      items.push(planned.item);
      continue;
    }
    if (planned.kind === "no_object") {
      noObject += 1;
      notes.push(`avatar ${profile.id} no_object`);
      continue;
    }
    if (planned.kind === "skip") {
      notes.push(`avatar ${profile.id} ${planned.note}`);
      continue;
    }
    const outcome = await readCanonicalAvatarForRecheck(profile.id, target.key, read);
    if (outcome === "no_object") {
      noObject += 1;
      notes.push(`avatar ${profile.id} no_object`);
      continue;
    }
    items.push(outcome);
  }
  return { items, noObject, notes };
}

/** Read avatars/{id}/avatar. A missing object is "no_object". Any other failure is unfinished. */
export async function readCanonicalAvatarForRecheck(
  profileId: string,
  key: string,
  read: (userId: string) => Promise<{ bytes: Uint8Array; contentType: string } | null>,
): Promise<SocialImageRecheckItem | "no_object"> {
  try {
    const object = await read(profileId);
    if (!object || object.bytes.byteLength === 0) {
      return {
        surface: "avatar",
        parentId: profileId,
        key,
        original: new Uint8Array(),
        contentType: "image/jpeg",
        readError: "read_empty",
      };
    }
    return {
      surface: "avatar",
      parentId: profileId,
      key,
      original: object.bytes,
      contentType: object.contentType ?? "image/jpeg",
    };
  } catch (error) {
    if (avatarCanonicalObjectMissing(error)) return "no_object";
    const message = error instanceof Error ? error.message : "read_failed";
    return {
      surface: "avatar",
      parentId: profileId,
      key,
      original: new Uint8Array(),
      contentType: "image/jpeg",
      readError: message,
    };
  }
}

/** The flag this process will use. Dry-run unless the argv contains --execute. */
export const socialImageRecheckExecute = recheckWantsExecute(process.argv);

const execute = socialImageRecheckExecute;

function assertOk(error: { message: string } | null, label: string): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function imageKeys(media: unknown): { key: string; contentType: string }[] {
  if (!Array.isArray(media)) return [];
  const keys: { key: string; contentType: string }[] = [];
  for (const entry of media) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { kind?: string; key?: string; contentType?: string };
    if (row.kind !== "image" || typeof row.key !== "string" || row.key.length === 0) continue;
    const contentType = (row.contentType ?? "image/jpeg").split(";")[0]?.trim().toLowerCase() || "image/jpeg";
    keys.push({ key: row.key, contentType });
  }
  return keys;
}

async function loadParentPage(
  table: "posts" | "stories",
  afterId: string | null,
): Promise<{ id: string; media: unknown }[]> {
  const admin = createAdminClient();
  let query = admin
    .from(table)
    .select("id, media")
    .eq("status", "active")
    .order(SOCIAL_IMAGE_RECHECK_ORDER);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query.limit(SOCIAL_IMAGE_RECHECK_PAGE);
  assertOk(error, `${table} read`);
  return data ?? [];
}

async function loadAvatarPage(afterId: string | null): Promise<{ id: string; avatar_key: string | null }[]> {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, avatar_key")
    .or(AVATAR_RECHECK_PAGE_OR)
    .order(SOCIAL_IMAGE_RECHECK_ORDER);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query.limit(SOCIAL_IMAGE_RECHECK_PAGE);
  assertOk(error, "avatar profile read");
  const rows: { id: string; avatar_key: string | null }[] = [];
  for (const row of data ?? []) {
    if (row.avatar_key === AVATAR_CLEARED) continue;
    rows.push({ id: row.id, avatar_key: row.avatar_key });
  }
  return rows;
}

async function mediaItem(
  surface: "post" | "story",
  parentId: string,
  image: { key: string; contentType: string },
): Promise<SocialImageRecheckItem> {
  const marked = await headSocialImageRecheck(image.key);
  if (marked?.reencoded) {
    return {
      surface,
      parentId,
      key: image.key,
      original: new Uint8Array(),
      contentType: image.contentType,
      alreadyReencoded: true,
    };
  }
  try {
    const object = await readSocialMediaObject(image.key);
    if (!object || object.bytes.byteLength === 0) {
      return {
        surface,
        parentId,
        key: image.key,
        original: new Uint8Array(),
        contentType: image.contentType,
        readError: "read_empty",
      };
    }
    return {
      surface,
      parentId,
      key: image.key,
      original: object.bytes,
      contentType: object.contentType ?? image.contentType,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "read_failed";
    return {
      surface,
      parentId,
      key: image.key,
      original: new Uint8Array(),
      contentType: image.contentType,
      readError: message,
    };
  }
}

async function main(): Promise<void> {
  const admin = createAdminClient();
  const logs: string[] = [];
  const hidden = new Set<string>();
  const report: SocialImageRecheckReport = blankSocialImageRecheckReport(!execute);

  if (execute) {
    const unholdStart = await runUnholdLiveAvatars(true);
    logs.push(JSON.stringify({ msg: "unhold live avatars", when: "start", ...unholdStart }));
  }

  for (const surface of ["post", "story"] as const) {
    const table = surface === "post" ? "posts" : "stories";
    const page = await recheckParentPages({
      execute,
      pageSize: SOCIAL_IMAGE_RECHECK_PAGE,
      loadParents: (afterId) => loadParentPage(table, afterId),
      recheck: async (parents) => {
        const items: SocialImageRecheckItem[] = [];
        const mediaByParent = new Map<string, unknown>();
        const legacy = new Set<string>();
        for (const parent of parents) {
          if (surface === "post" && socialPostHasLegacyS3Video(parent.media)) {
            legacy.add(parent.id);
            logs.push(`post ${parent.id} legacy s3 video`);
            continue;
          }
          mediaByParent.set(parent.id, parent.media);
          for (const image of imageKeys(parent.media)) {
            items.push(await mediaItem(surface, parent.id, image));
          }
        }
        const page = await runSocialImageRecheck({
          execute,
          items,
          report: (line) => {
            logs.push(line);
          },
          store: async (item, bytes) => {
            const nextKey = recheckedSocialImageKey(item.key, item.contentType, randomUUID());
            const current = mediaByParent.get(item.parentId);
            try {
              await putRecheckedSocialImage({
                key: nextKey,
                previousKey: item.key,
                body: bytes,
                contentType: item.contentType,
              });
              const next = pointSocialMediaAtRecheckedImage(current, item.key, nextKey);
              const { data, error } = await pointParentAtRecheckedMedia(
                admin as never,
                table,
                item.parentId,
                current,
                next,
              );
              assertOk(error, "point media at rechecked image");
              if (!data || data.length === 0) {
                return { skipped: true, orphanKey: nextKey };
              }
              mediaByParent.set(item.parentId, next);
            } catch (error) {
              const failure = error instanceof Error ? error : new Error("recheck_failed");
              throw Object.assign(failure, { orphanKey: nextKey });
            }
          },
          hide: async (parent) => {
            const key = `${parent.surface}:${parent.parentId}`;
            if (hidden.has(key)) return;
            hidden.add(key);
            const hideTable = parent.surface === "post" ? "posts" : "stories";
            const { error } = await admin
              .from(hideTable)
              .update({ status: "hidden" })
              .eq("id", parent.parentId)
              .eq("status", "active");
            assertOk(error, "hide parent");
          },
        });
        page.legacyS3Video += legacy.size;
        return page;
      },
    });
    report.skip += page.skip;
    report.store += page.store;
    report.hide += page.hide;
    report.reported += page.reported;
    report.unfinished += page.unfinished;
    report.no_object += page.no_object;
    report.hiddenPosts.push(...page.hiddenPosts);
    report.hiddenStories.push(...page.hiddenStories);
    report.clearedAvatars.push(...page.clearedAvatars);
    report.skippedParents.push(...page.skippedParents);
    report.orphanedKeys.push(...page.orphanedKeys);
    report.liveKeys.push(...page.liveKeys);
    report.unverifiedKeys.push(...page.unverifiedKeys);
    report.legacyS3Video += page.legacyS3Video;
  }

  const avatars = await recheckParentPages({
    execute,
    pageSize: SOCIAL_IMAGE_RECHECK_PAGE,
    loadParents: (afterId) => loadAvatarPage(afterId),
    recheck: async (parents) => {
      const avatarKeyByParent = new Map<string, string | null>();
      for (const profile of parents) {
        const target = avatarRecheckTarget(profile);
        if (target.kind !== "skip") avatarKeyByParent.set(profile.id, profile.avatar_key);
      }
      const read = await readAvatarRecheckPage(parents, headAvatarRecheck, readAvatarObject);
      for (const note of read.notes) logs.push(note);
      const page = await runSocialImageRecheck({
        execute,
        items: read.items,
        report: (line) => {
          logs.push(line);
        },
        store: async (item, bytes) => {
          const objectId = randomUUID();
          const nextKey = avatarRecheckObjectKey(item.parentId, objectId);
          const readKey = avatarKeyByParent.get(item.parentId);
          try {
            await putAvatarRecheckObject({
              userId: item.parentId,
              objectId,
              body: bytes,
              contentType: item.contentType,
              previousKey: item.key,
              readPointer: () => readProfileAvatarKey(admin as never, item.parentId),
            });
            if (nextKey === item.key) throw new Error("Avatar recheck must not overwrite the original");
            if (readKey === undefined) throw new Error("avatar pointer was not read");
            return await commitRecheckedAvatar(admin as never, item.parentId, readKey, nextKey);
          } catch (error) {
            throw classifyRecheckFailure(error, nextKey);
          }
        },
        hide: async () => {
          throw new Error("avatar recheck does not hide a post");
        },
        clearAvatar: async (parentId) => {
          const readKey = avatarKeyByParent.get(parentId);
          if (readKey === undefined) throw new Error("avatar pointer was not read");
          const { data, error } = await writeAvatarPointer(admin as never, parentId, readKey, AVATAR_CLEARED);
          assertOk(error, "clear avatar");
          if (!data || data.length === 0) return { skipped: true };
          const quarantineKey = await quarantineAvatarObject(parentId, randomUUID(), async () => {
            const read = await admin.from("profiles").select("avatar_key").eq("id", parentId).maybeSingle();
            if (read.error || !read.data) throw read.error ?? new Error("avatar pointer was not read");
            return read.data.avatar_key;
          });
          logs.push(`avatar ${parentId} quarantined ${quarantineKey}`);
        },
      });
      page.no_object += read.noObject;
      return page;
    },
  });
  report.skip += avatars.skip;
  report.store += avatars.store;
  report.hide += avatars.hide;
  report.reported += avatars.reported;
  report.unfinished += avatars.unfinished;
  report.no_object += avatars.no_object;
  report.hiddenPosts.push(...avatars.hiddenPosts);
  report.hiddenStories.push(...avatars.hiddenStories);
  report.clearedAvatars.push(...avatars.clearedAvatars);
  report.skippedParents.push(...avatars.skippedParents);
  report.orphanedKeys.push(...avatars.orphanedKeys);
  report.liveKeys.push(...avatars.liveKeys);
  report.unverifiedKeys.push(...avatars.unverifiedKeys);
  report.legacyS3Video += avatars.legacyS3Video;

  if (execute) {
    const unholdEnd = await runUnholdLiveAvatars(true);
    logs.push(JSON.stringify({ msg: "unhold live avatars", when: "end", ...unholdEnd }));
  }

  console.log(JSON.stringify({ msg: "social image recheck", ...report, notes: logs }));
}

const invokedDirectly =
  process.argv[1]?.endsWith("recheck-social-images.ts") || process.argv[1]?.endsWith("recheck-social-images.js");
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "recheck failed");
    process.exitCode = 1;
  });
}
