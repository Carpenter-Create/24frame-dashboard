/**
 * Recheck published Social images and avatars.
 * Dry-run is the default. Pass --execute to store the re-encoded bytes.
 * A post or story whose image will not decode is set to hidden.
 * A read error is unfinished: reported, not hidden, and retried on the next run.
 * An avatar that will not decode is reported and left in place.
 * Do not run this against production from CI. Adam runs it after the SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/recheck-social-images.ts --execute
 */
import { avatarObjectKey } from "@/lib/account-avatar";
import {
  overwritePublishedSocialImage,
  readSocialMediaObject,
} from "@/lib/s3-social-media";
import { readAvatarObject, replaceAvatarObject } from "@/lib/s3-avatars";
import { runSocialImageRecheck, type SocialImageRecheckItem } from "@/lib/social-image-reencode";
import { createAdminClient } from "@/lib/supabase/admin";

const execute = process.argv.includes("--execute");
const PAGE = 200;

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

async function loadParents(table: "posts" | "stories"): Promise<{ id: string; media: unknown }[]> {
  const admin = createAdminClient();
  const rows: { id: string; media: unknown }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from(table)
      .select("id, media")
      .eq("status", "active")
      .range(from, from + PAGE - 1);
    assertOk(error, `${table} read`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function loadAvatarProfiles(): Promise<{ id: string; avatar_key: string }[]> {
  const admin = createAdminClient();
  const rows: { id: string; avatar_key: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, avatar_key")
      .not("avatar_key", "is", null)
      .range(from, from + PAGE - 1);
    assertOk(error, "avatar profile read");
    for (const row of data ?? []) {
      if (row.avatar_key) rows.push({ id: row.id, avatar_key: row.avatar_key });
    }
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function main(): Promise<void> {
  const admin = createAdminClient();
  const items: SocialImageRecheckItem[] = [];
  const logs: string[] = [];
  for (const surface of ["post", "story"] as const) {
    const table = surface === "post" ? "posts" : "stories";
    const parents = await loadParents(table);
    for (const parent of parents) {
      for (const image of imageKeys(parent.media)) {
        try {
          const object = await readSocialMediaObject(image.key);
          if (!object || object.bytes.byteLength === 0) {
            items.push({
              surface,
              parentId: parent.id,
              key: image.key,
              original: new Uint8Array(),
              contentType: image.contentType,
              readError: "read_empty",
            });
            continue;
          }
          items.push({
            surface,
            parentId: parent.id,
            key: image.key,
            original: object.bytes,
            contentType: object.contentType ?? image.contentType,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "read_failed";
          items.push({
            surface,
            parentId: parent.id,
            key: image.key,
            original: new Uint8Array(),
            contentType: image.contentType,
            readError: message,
          });
        }
      }
    }
  }
  for (const profile of await loadAvatarProfiles()) {
    let expected = "";
    try {
      expected = avatarObjectKey(profile.id);
    } catch {
      logs.push(`avatar ${profile.id} key is not a profile id`);
      continue;
    }
    if (profile.avatar_key !== expected) {
      logs.push(`avatar ${profile.id} key does not match the profile object`);
      continue;
    }
    try {
      const object = await readAvatarObject(profile.id);
      if (!object || object.bytes.byteLength === 0) {
        items.push({
          surface: "avatar",
          parentId: profile.id,
          key: expected,
          original: new Uint8Array(),
          contentType: "image/jpeg",
          readError: "read_empty",
        });
        continue;
      }
      items.push({
        surface: "avatar",
        parentId: profile.id,
        key: expected,
        original: object.bytes,
        contentType: object.contentType ?? "image/jpeg",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "read_failed";
      items.push({
        surface: "avatar",
        parentId: profile.id,
        key: expected,
        original: new Uint8Array(),
        contentType: "image/jpeg",
        readError: message,
      });
    }
  }

  const hidden = new Set<string>();
  const report = await runSocialImageRecheck({
    execute,
    items,
    report: (line) => {
      logs.push(line);
    },
    store: async (item, bytes) => {
      if (item.surface === "avatar") {
        await replaceAvatarObject(item.parentId, bytes, item.contentType);
        return;
      }
      await overwritePublishedSocialImage({ key: item.key, body: bytes, contentType: item.contentType });
    },
    hide: async (parent) => {
      const key = `${parent.surface}:${parent.parentId}`;
      if (hidden.has(key)) return;
      hidden.add(key);
      const table = parent.surface === "post" ? "posts" : "stories";
      const { error } = await admin.from(table).update({ status: "hidden" }).eq("id", parent.parentId).eq("status", "active");
      assertOk(error, "hide parent");
    },
  });
  console.log(JSON.stringify({ msg: "social image recheck", ...report, notes: logs }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "recheck failed");
  process.exitCode = 1;
});
