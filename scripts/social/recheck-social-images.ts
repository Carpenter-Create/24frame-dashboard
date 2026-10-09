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
 * An avatar that will not decode is cleared so the default face shows. The
 * canonical object is moved to avatars/{id}/quarantine/{objectId}. That
 * prefix is never signed. Rollback copies it back to avatars/{id}/avatar.
 * One page is read, rechecked, and dropped before the next page.
 * Do not run this against production from CI. Adam runs it after the SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts --execute
 */
import { randomUUID } from "node:crypto";

import { AVATAR_CLEARED, avatarObjectKey, avatarRecheckObjectKey, isAvatarRecheckKey } from "@/lib/account-avatar";
import { headAvatarRecheck, putAvatarRecheckObject, quarantineAvatarObject, readAvatarObject } from "@/lib/s3-avatars";
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

export { recheckWantsExecute };

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

async function loadAvatarPage(afterId: string | null): Promise<{ id: string; avatar_key: string }[]> {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, avatar_key")
    .not("avatar_key", "is", null)
    .neq("avatar_key", AVATAR_CLEARED)
    .order(SOCIAL_IMAGE_RECHECK_ORDER);
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query.limit(SOCIAL_IMAGE_RECHECK_PAGE);
  assertOk(error, "avatar profile read");
  const rows: { id: string; avatar_key: string }[] = [];
  for (const row of data ?? []) {
    if (row.avatar_key) rows.push({ id: row.id, avatar_key: row.avatar_key });
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
              const { data, error } = await admin
                .from(table)
                .update({ media: next })
                .eq("id", item.parentId)
                .eq("media", current as never)
                .select("id");
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
    report.hiddenPosts.push(...page.hiddenPosts);
    report.hiddenStories.push(...page.hiddenStories);
    report.clearedAvatars.push(...page.clearedAvatars);
    report.skippedParents.push(...page.skippedParents);
    report.orphanedKeys.push(...page.orphanedKeys);
    report.legacyS3Video += page.legacyS3Video;
  }

  const avatars = await recheckParentPages({
    execute,
    pageSize: SOCIAL_IMAGE_RECHECK_PAGE,
    loadParents: (afterId) => loadAvatarPage(afterId),
    recheck: async (parents) => {
      const items: SocialImageRecheckItem[] = [];
      const avatarKeyByParent = new Map<string, string>();
      for (const profile of parents) {
        avatarKeyByParent.set(profile.id, profile.avatar_key);
        let canonical = "";
        try {
          canonical = avatarObjectKey(profile.id);
        } catch {
          logs.push(`avatar ${profile.id} key is not a profile id`);
          continue;
        }
        const key = isAvatarRecheckKey(profile.avatar_key, profile.id) ? profile.avatar_key : canonical;
        if (profile.avatar_key !== canonical && profile.avatar_key !== key) {
          logs.push(`avatar ${profile.id} key does not match the profile object`);
          continue;
        }
        const marked = await headAvatarRecheck(key);
        if (marked?.reencoded) {
          items.push({
            surface: "avatar",
            parentId: profile.id,
            key,
            original: new Uint8Array(),
            contentType: "image/jpeg",
            alreadyReencoded: true,
          });
          continue;
        }
        if (profile.avatar_key !== canonical) {
          logs.push(`avatar ${profile.id} key does not match the profile object`);
          continue;
        }
        try {
          const object = await readAvatarObject(profile.id);
          if (!object || object.bytes.byteLength === 0) {
            items.push({
              surface: "avatar",
              parentId: profile.id,
              key: canonical,
              original: new Uint8Array(),
              contentType: "image/jpeg",
              readError: "read_empty",
            });
            continue;
          }
          items.push({
            surface: "avatar",
            parentId: profile.id,
            key: canonical,
            original: object.bytes,
            contentType: object.contentType ?? "image/jpeg",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "read_failed";
          items.push({
            surface: "avatar",
            parentId: profile.id,
            key: canonical,
            original: new Uint8Array(),
            contentType: "image/jpeg",
            readError: message,
          });
        }
      }
      return runSocialImageRecheck({
        execute,
        items,
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
            });
            if (nextKey === item.key) throw new Error("Avatar recheck must not overwrite the original");
            const { data, error } = await admin
              .from("profiles")
              .update({ avatar_key: nextKey })
              .eq("id", item.parentId)
              .eq("avatar_key", readKey ?? "")
              .select("id");
            assertOk(error, "point avatar at rechecked image");
            if (!data || data.length === 0) return { skipped: true, orphanKey: nextKey };
          } catch (error) {
            const failure = error instanceof Error ? error : new Error("recheck_failed");
            throw Object.assign(failure, { orphanKey: nextKey });
          }
        },
        hide: async () => {
          throw new Error("avatar recheck does not hide a post");
        },
        clearAvatar: async (parentId) => {
          const readKey = avatarKeyByParent.get(parentId);
          const { data, error } = await admin
            .from("profiles")
            .update({ avatar_key: AVATAR_CLEARED })
            .eq("id", parentId)
            .eq("avatar_key", readKey ?? "")
            .select("id");
          assertOk(error, "clear avatar");
          if (!data || data.length === 0) return { skipped: true };
          const quarantineKey = await quarantineAvatarObject(parentId, randomUUID());
          logs.push(`avatar ${parentId} quarantined ${quarantineKey}`);
        },
      });
    },
  });
  report.skip += avatars.skip;
  report.store += avatars.store;
  report.hide += avatars.hide;
  report.reported += avatars.reported;
  report.unfinished += avatars.unfinished;
  report.hiddenPosts.push(...avatars.hiddenPosts);
  report.hiddenStories.push(...avatars.hiddenStories);
  report.clearedAvatars.push(...avatars.clearedAvatars);
  report.skippedParents.push(...avatars.skippedParents);
  report.orphanedKeys.push(...avatars.orphanedKeys);
  report.legacyS3Video += avatars.legacyS3Video;

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
