/**
 * Delete avatar objects that no profile pointer names.
 * Dry-run is the default. Pass --execute to delete.
 * Immediately before each delete, read profiles.avatar_key for the key's owner.
 * A key the pointer names, a key that is not an avatar path, and a key whose
 * pointer read fails are not deleted.
 * A delete that throws still prints the keys already classified, then exits 1.
 * Do not run this against production from CI. Adam runs it.
 * Do not delete orphans by hand.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/delete-avatar-orphans.ts <key> [<key>...]
 *   pnpm exec tsx --conditions=react-server scripts/social/delete-avatar-orphans.ts --execute <key> [<key>...]
 */
import { avatarKeyOwner, avatarPointerNamesKey } from "@/lib/account-avatar";
import { deleteUnreferencedAvatarObject } from "@/lib/s3-avatars";
import { createAdminClient } from "@/lib/supabase/admin";

export function deleteOrphansWantsExecute(argv: readonly string[]): boolean {
  return argv.includes("--execute");
}

/** Positional avatar keys. Flags are not keys. */
export function avatarOrphanKeysFromArgv(argv: readonly string[]): string[] {
  return argv.filter((arg) => arg !== "--execute" && !arg.startsWith("-") && arg.includes("/"));
}

export type DeleteAvatarOrphansReport = {
  dryRun: boolean;
  deleted: string[];
  pending: string[];
  liveKeys: string[];
  unverifiedKeys: string[];
};

/**
 * Re-read the owner's pointer immediately before deciding to delete.
 * Dry-run lists pending keys and does not call deleteKey.
 */
export async function deleteAvatarOrphans(input: {
  execute: boolean;
  keys: readonly string[];
  readPointer: (userId: string) => Promise<string | null>;
  deleteKey: (key: string) => Promise<void>;
}): Promise<DeleteAvatarOrphansReport> {
  const report: DeleteAvatarOrphansReport = {
    dryRun: !input.execute,
    deleted: [],
    pending: [],
    liveKeys: [],
    unverifiedKeys: [],
  };
  for (const key of input.keys) {
    const owner = avatarKeyOwner(key);
    if (!owner) {
      report.unverifiedKeys.push(key);
      continue;
    }
    let pointer: string | null;
    try {
      pointer = await input.readPointer(owner);
    } catch {
      report.unverifiedKeys.push(key);
      continue;
    }
    if (avatarPointerNamesKey(owner, pointer, key)) {
      report.liveKeys.push(key);
      continue;
    }
    if (!input.execute) {
      report.pending.push(key);
      continue;
    }
    try {
      await input.deleteKey(key);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("delete orphans failed");
      throw Object.assign(failure, { report });
    }
    report.deleted.push(key);
  }
  return report;
}

export async function printDeleteAvatarOrphansResult(
  execute: boolean,
  keys: readonly string[],
  deps?: {
    readPointer?: (userId: string) => Promise<string | null>;
    deleteKey?: (key: string) => Promise<void>;
    log?: (line: string) => void;
    fail?: (line: string) => void;
  },
): Promise<void> {
  const log = deps?.log ?? ((line: string) => console.log(line));
  const fail = deps?.fail ?? ((line: string) => console.error(line));
  try {
    const report = await deleteAvatarOrphans({
      execute,
      keys,
      readPointer: deps?.readPointer ?? readProfilePointer,
      deleteKey: deps?.deleteKey ?? ((key: string) => deleteUnreferencedAvatarObject(key)),
    });
    log(JSON.stringify({ msg: "delete avatar orphans", ...report }));
  } catch (error) {
    const partial =
      error && typeof error === "object" && "report" in error
        ? (error as { report?: DeleteAvatarOrphansReport }).report
        : undefined;
    if (partial) log(JSON.stringify({ msg: "delete avatar orphans", ...partial }));
    fail(error instanceof Error ? error.message : "delete orphans failed");
    process.exitCode = 1;
  }
}

async function readProfilePointer(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const row = await admin.from("profiles").select("avatar_key").eq("id", userId).maybeSingle();
  if (row.error || !row.data) throw row.error ?? new Error("avatar pointer was not read");
  return row.data.avatar_key;
}

export async function runDeleteAvatarOrphans(execute: boolean, keys: readonly string[]): Promise<DeleteAvatarOrphansReport> {
  return deleteAvatarOrphans({
    execute,
    keys,
    readPointer: readProfilePointer,
    deleteKey: (key) => deleteUnreferencedAvatarObject(key),
  });
}

const invokedDirectly =
  process.argv[1]?.endsWith("delete-avatar-orphans.ts") || process.argv[1]?.endsWith("delete-avatar-orphans.js");
if (invokedDirectly) {
  const execute = deleteOrphansWantsExecute(process.argv);
  const keys = avatarOrphanKeysFromArgv(process.argv.slice(2));
  void printDeleteAvatarOrphansResult(execute, keys);
}
