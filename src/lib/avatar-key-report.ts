// An orphan list is only keys a successful pointer read does not name.
// A key the pointer names is live. A key whose pointer read failed is unverified.
// Neither of those is an orphan.

import { avatarPointerNamesKey } from "@/lib/account-avatar";

export type AvatarKeyBuckets = {
  orphanKeys: string[];
  liveKeys: string[];
  unverifiedKeys: string[];
};

export function bucketAvatarKeys(
  userId: string,
  keys: readonly string[],
  read: { ok: true; pointer: string | null } | { ok: false },
): AvatarKeyBuckets {
  if (!read.ok) return { orphanKeys: [], liveKeys: [], unverifiedKeys: [...keys] };
  const orphanKeys: string[] = [];
  const liveKeys: string[] = [];
  for (const key of keys) {
    if (avatarPointerNamesKey(userId, read.pointer, key)) liveKeys.push(key);
    else orphanKeys.push(key);
  }
  return { orphanKeys, liveKeys, unverifiedKeys: [] };
}
