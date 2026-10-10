/**
 * Remove gc-hold from every face profiles.avatar_key names.
 * Dry-run is the default. Pass --execute to delete the tag and confirm it is gone.
 * Immediately before each clear, read that profile's avatar_key again.
 * A key that read no longer names, or a read that errors, is a skipped clear. The tag stays.
 * A tag read that fails is unverified. The tag stays.
 * Do not run this against production from CI. Adam runs it after the avatar SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/unhold-live-avatars.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/unhold-live-avatars.ts --execute
 */
import { AVATAR_CLEARED, avatarPointerNamesKey } from "@/lib/account-avatar";
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

/**
 * Page profiles by id. A non-null avatar_key is checked.
 * `cleared` is not an object. Any gc-hold value on a real key is held.
 * --execute reads profiles.avatar_key again immediately before the clear.
 * A pointer that no longer names the key, or a read that fails, increments skippedClears and leaves the tag.
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
      if (row.avatar_key == null) continue;
      report.checked += 1;
      if (row.avatar_key === AVATAR_CLEARED) continue;
      let tags: { Key?: string; Value?: string }[];
      try {
        tags = await input.readTags(row.avatar_key);
      } catch {
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
      if (!avatarPointerNamesKey(row.id, pointer, row.avatar_key)) {
        report.skippedClears += 1;
        continue;
      }
      try {
        await input.clearTag(row.avatar_key);
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
