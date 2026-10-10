/**
 * Remove gc-hold from every face profiles.avatar_key names.
 * Dry-run is the default. Pass --execute to delete the tag and confirm it is gone.
 * Immediately before each clear, read that profile's avatar_key again.
 * A null avatar_key is the legacy canonical face. Check avatars/{id}/avatar.
 * A 404 on that key is no avatar. Clear it only when the fresh read is still null.
 * A key is cleared only when avatarKeyOwner(key) is that row's id. Any other key is a skipped clear.
 * A key that read no longer names, a pointer that changed, or a read that errors, is a skipped clear. The tag stays.
 * Unhold is not scheduled yet. Scheduling --execute well under 30 days is a required follow-up before real users depend on it.
 * A tag read that fails is unverified. The tag stays.
 * Do not run this against production from CI. Adam runs it after the avatar SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/unhold-live-avatars.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/unhold-live-avatars.ts --execute
 */
import { AVATAR_CLEARED, avatarKeyOwner, avatarObjectKey, avatarPointerNamesKey } from "@/lib/account-avatar";
import { clearAvatarHoldTag, readAvatarObjectTags } from "@/lib/s3-avatars";
import { SOCIAL_IMAGE_RECHECK_PAGE } from "@/lib/social-image-reencode";
import { createAdminClient } from "@/lib/supabase/admin";

export function unholdWantsExecute(argv: readonly string[]): boolean {
  return argv.includes("--execute");
}

export type UnholdLiveAvatarsReport = {
  dryRun: boolean;
  pages: number;
  checked: number;
  held: number;
  cleared: number;
  skippedClears: number;
  unverified: number;
};

type UnholdRow = { id: string; avatar_key: string | null };

function holdTagRemains(tags: readonly { Key?: string; Value?: string }[]): boolean {
  return tags.some((tag) => tag.Key === "gc-hold");
}

/** GetObjectTagging on a missing canonical key is NoSuchKey or NotFound, HTTP 404. */
function canonicalObjectMissing(error: unknown): boolean {
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

function legacyCanonicalKey(profileId: string): string | null {
  try {
    return avatarObjectKey(profileId);
  } catch {
    return null;
  }
}

/**
 * Page profiles by id. A non-null avatar_key is checked.
 * A null avatar_key checks the canonical key. A 404 there is no avatar.
 * `cleared` is not an object. Any gc-hold value on a real key is held.
 * --execute reads profiles.avatar_key again immediately before the clear.
 * A null row is cleared only when that read is still null.
 * A key whose owner is not this row is skipped and counted. The tag stays.
 * A pointer that no longer names the key, a pointer that changed, or a read that fails, increments skippedClears and leaves the tag.
 * A clear counts only when the follow-up tag read has no gc-hold.
 */
export async function unholdLiveAvatars(input: {
  execute: boolean;
  pageSize: number;
  loadPage: (afterId: string | null, limit: number) => Promise<UnholdRow[]>;
  readTags: (key: string) => Promise<{ Key?: string; Value?: string }[]>;
  readPointer: (profileId: string) => Promise<string | null>;
  clearTag: (key: string) => Promise<void>;
}): Promise<UnholdLiveAvatarsReport> {
  const report: UnholdLiveAvatarsReport = {
    dryRun: !input.execute,
    pages: 0,
    checked: 0,
    held: 0,
    cleared: 0,
    skippedClears: 0,
    unverified: 0,
  };
  let afterId: string | null = null;
  for (;;) {
    const rows = await input.loadPage(afterId, input.pageSize);
    report.pages += 1;
    for (const row of rows) {
      const legacyNull = row.avatar_key == null;
      const key = legacyNull ? legacyCanonicalKey(row.id) : row.avatar_key;
      if (key == null) continue;
      report.checked += 1;
      if (!legacyNull && key === AVATAR_CLEARED) continue;
      if (avatarKeyOwner(key) !== row.id) {
        report.skippedClears += 1;
        continue;
      }
      let tags: { Key?: string; Value?: string }[];
      try {
        tags = await input.readTags(key);
      } catch (error) {
        if (legacyNull && canonicalObjectMissing(error)) continue;
        report.unverified += 1;
        continue;
      }
      if (!holdTagRemains(tags)) continue;
      report.held += 1;
      if (!input.execute) continue;
      let pointer: string | null;
      try {
        pointer = await input.readPointer(row.id);
      } catch {
        report.skippedClears += 1;
        continue;
      }
      if (legacyNull ? pointer !== null : !avatarPointerNamesKey(row.id, pointer, key)) {
        report.skippedClears += 1;
        continue;
      }
      try {
        await input.clearTag(key);
        report.cleared += 1;
      } catch {
        report.unverified += 1;
      }
    }
    if (rows.length < input.pageSize) break;
    const cursor = rows[rows.length - 1]?.id;
    if (!cursor || cursor === afterId) break;
    afterId = cursor;
  }
  return report;
}

async function loadUnholdPage(afterId: string | null, limit: number): Promise<UnholdRow[]> {
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, avatar_key").order("id");
  if (afterId) query = query.gt("id", afterId);
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, avatar_key: row.avatar_key }));
}

async function readProfilePointer(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const row = await admin.from("profiles").select("avatar_key").eq("id", profileId).maybeSingle();
  if (row.error || !row.data) throw row.error ?? new Error("avatar pointer was not read");
  return row.data.avatar_key;
}

export async function runUnholdLiveAvatars(execute: boolean): Promise<UnholdLiveAvatarsReport> {
  return unholdLiveAvatars({
    execute,
    pageSize: SOCIAL_IMAGE_RECHECK_PAGE,
    loadPage: loadUnholdPage,
    readTags: (key) => readAvatarObjectTags(key),
    readPointer: readProfilePointer,
    clearTag: (key) => clearAvatarHoldTag(key),
  });
}

const invokedDirectly =
  process.argv[1]?.endsWith("unhold-live-avatars.ts") || process.argv[1]?.endsWith("unhold-live-avatars.js");
if (invokedDirectly) {
  const execute = unholdWantsExecute(process.argv);
  runUnholdLiveAvatars(execute)
    .then((report) => {
      console.log(JSON.stringify({ msg: "unhold live avatars", ...report }));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "unhold failed");
      process.exitCode = 1;
    });
}
