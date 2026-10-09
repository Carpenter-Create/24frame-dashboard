import { socialVideoKeyDigest } from "@/lib/social-music-scan";
import { socialVideoDurationExceedsCap } from "@/lib/social-mux";

// Founder-run re-ingest of S3 video onto Mux. Dry-run is the default.
// Expired stories are skipped. A missing source becomes Unfinished.
// A thrown parent stays eligible for the next execute. Nothing here deletes an S3 object.

export type SocialReingestSurface = "post" | "story" | "welcome";

export type SocialReingestCandidate = {
  surface: SocialReingestSurface;
  parentId: string;
  authorId: string;
  key: string;
  expired: boolean;
  /** Mux asset already created on an earlier pass. Null when this is the S3 digest row. */
  assetId: string | null;
  playbackId: string | null;
  /** The parent no longer stores this S3 key. Retire the placeholder; do not create an asset. */
  sourceGone?: boolean;
};

export type SocialReingestAsset = {
  playbackId: string | null;
  duration: number | null;
  status: string;
};

export type SocialReingestSettled = {
  candidate: SocialReingestCandidate;
  assetId: string;
  playbackId: string;
  uploadId: string;
};

export type SocialReingestDeps = {
  head: (key: string) => Promise<boolean>;
  presign: (key: string) => Promise<string>;
  createAsset: (url: string) => Promise<{ assetId: string }>;
  loadAsset: (assetId: string) => Promise<SocialReingestAsset>;
  deleteAsset: (assetId: string) => Promise<void>;
  bind: (input: { authorId: string; uploadId: string; assetId: string; playbackId: string }) => Promise<void>;
  /** One write for every S3 video on the parent. A half-updated post trips the Mux trigger. */
  saveParent: (
    parent: { surface: SocialReingestSurface; parentId: string; authorId: string },
    settled: readonly SocialReingestSettled[],
  ) => Promise<void>;
  /** The S3 placeholder must not stay Unfinished after the Mux parent is bound. */
  retirePlaceholder: (candidate: SocialReingestCandidate) => Promise<void>;
  saveInProgress: (candidate: SocialReingestCandidate, assetId: string) => Promise<void>;
  markUnfinished: (candidate: SocialReingestCandidate, error: string) => Promise<void>;
  alreadyUnfinished: (candidate: SocialReingestCandidate) => Promise<boolean>;
  log?: (message: string) => void;
};

export type SocialReingestReport = {
  dryRun: boolean;
  candidates: number;
  skippedExpired: number;
  bound: number;
  unfinished: number;
  preparing: number;
};

function empty(dryRun: boolean): SocialReingestReport {
  return { dryRun, candidates: 0, skippedExpired: 0, bound: 0, unfinished: 0, preparing: 0 };
}

function parentKey(candidate: SocialReingestCandidate): string {
  return `${candidate.surface}:${candidate.parentId}`;
}

/** Count first. Writes only when execute is true. One parent failure does not stop the next. */
export async function reingestSocialS3Videos(input: {
  execute: boolean;
  candidates: readonly SocialReingestCandidate[];
  deps: SocialReingestDeps;
}): Promise<SocialReingestReport> {
  const report = empty(!input.execute);
  const groups: SocialReingestCandidate[][] = [];
  const index = new Map<string, number>();
  for (const candidate of input.candidates) {
    const key = parentKey(candidate);
    const found = index.get(key);
    if (found === undefined) {
      index.set(key, groups.length);
      groups.push([candidate]);
    } else {
      groups[found]?.push(candidate);
    }
  }
  for (const group of groups) {
    try {
      await reingestParent(group, input.execute, input.deps, report);
    } catch (error) {
      const message = error instanceof Error ? error.message : "reingest_failed";
      const parent = group[0];
      (input.deps.log ?? console.error)(
        `social s3 reingest parent ${parent?.surface ?? "unknown"} ${parent?.parentId ?? ""} failed: ${message}`,
      );
      report.unfinished += 1;
    }
  }
  return report;
}

async function reingestParent(
  group: readonly SocialReingestCandidate[],
  execute: boolean,
  deps: SocialReingestDeps,
  report: SocialReingestReport,
): Promise<void> {
  const actionable: SocialReingestCandidate[] = [];
  let live = 0;
  let sourceGone = 0;
  for (const candidate of group) {
    if (candidate.surface === "story" && candidate.expired) {
      report.skippedExpired += 1;
      continue;
    }
    live += 1;
    if (candidate.sourceGone) {
      sourceGone += 1;
      continue;
    }
    if (candidate.playbackId) continue;
    report.candidates += 1;
    actionable.push(candidate);
  }
  if (live > 0 && sourceGone === live) {
    if (!execute) return;
    const parent = group.find((candidate) => candidate.sourceGone) ?? group[0];
    if (parent) await deps.retirePlaceholder(parent);
    return;
  }
  if (!execute || actionable.length === 0) return;
  if (await deps.alreadyUnfinished(actionable[0]!)) return;

  const settled: SocialReingestSettled[] = [];
  let preparing = false;
  for (const candidate of actionable) {
    const outcome = await prepareCandidate(candidate, deps, report);
    if (outcome === "preparing") {
      preparing = true;
      continue;
    }
    if (outcome === "unfinished") return;
    settled.push(outcome);
  }
  if (preparing || settled.length !== actionable.length) return;
  const parent = actionable[0]!;
  await deps.saveParent(
    { surface: parent.surface, parentId: parent.parentId, authorId: parent.authorId },
    settled,
  );
  await deps.retirePlaceholder(parent);
  report.bound += settled.length;
}

async function prepareCandidate(
  candidate: SocialReingestCandidate,
  deps: SocialReingestDeps,
  report: SocialReingestReport,
): Promise<SocialReingestSettled | "preparing" | "unfinished"> {
  if (candidate.assetId) return settleAsset(candidate, candidate.assetId, deps, report);
  const present = await deps.head(candidate.key).catch(() => false);
  if (!present) {
    await deps.markUnfinished(candidate, "s3_source_missing");
    report.unfinished += 1;
    return "unfinished";
  }
  const url = await deps.presign(candidate.key);
  const created = await deps.createAsset(url);
  await deps.saveInProgress(candidate, created.assetId);
  return settleAsset(candidate, created.assetId, deps, report);
}

async function settleAsset(
  candidate: SocialReingestCandidate,
  assetId: string,
  deps: SocialReingestDeps,
  report: SocialReingestReport,
): Promise<SocialReingestSettled | "preparing" | "unfinished"> {
  const asset = await deps.loadAsset(assetId);
  const playbackId = asset.playbackId;
  if (!playbackId || asset.status !== "ready") {
    report.preparing += 1;
    return "preparing";
  }
  if (socialVideoDurationExceedsCap(asset.duration)) {
    await deps.deleteAsset(assetId);
    await deps.markUnfinished(candidate, "welcome_too_long");
    report.unfinished += 1;
    return "unfinished";
  }
  if (typeof asset.duration !== "number" || !Number.isFinite(asset.duration) || asset.duration <= 0) {
    report.preparing += 1;
    return "preparing";
  }
  await deps.bind({
    authorId: candidate.authorId,
    uploadId: assetId,
    assetId,
    playbackId,
  });
  return { candidate, assetId, playbackId, uploadId: assetId };
}

/** The scan row's own key. The first video on the post is not reused for the next row. */
export function socialReingestKeyForDigest(media: readonly unknown[], digest: string): string | null {
  for (const entry of media) {
    const key = socialReingestVideoKey(entry);
    if (key && socialVideoKeyDigest(key) === digest) return key;
  }
  return null;
}

/** Every settled S3 video becomes Mux in the same array, so one update is complete. */
export function socialReingestMediaWithMux(
  media: readonly unknown[],
  settled: readonly SocialReingestSettled[],
): unknown[] {
  const byKey = new Map(settled.map((row) => [row.candidate.key, row]));
  return media.map((entry) => {
    const key = socialReingestVideoKey(entry);
    const ids = key ? byKey.get(key) : undefined;
    if (!ids || !entry || typeof entry !== "object") return entry;
    return {
      ...(entry as Record<string, unknown>),
      kind: "video",
      provider: "mux",
      assetId: ids.assetId,
      playbackId: ids.playbackId,
      uploadId: ids.uploadId,
    };
  });
}

export type SqlQueryable = {
  query<T extends Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
};

/** Select-then-write. The partial unique index does not support ON CONFLICT (profile_id, playback_id). */
export async function rememberWelcomeReingestAsset(
  db: SqlQueryable,
  input: { profileId: string; authorId: string; assetId: string },
): Promise<void> {
  const digest = input.profileId.replace(/-/g, "").slice(0, 32);
  const found = await db.query<{ id: string }>(
    `select id::text as id
     from public.social_music_scans
     where profile_id = $1::uuid and playback_id = $2
     limit 1`,
    [input.profileId, digest],
  );
  if (found.rows[0]) {
    await db.query(
      `update public.social_music_scans
       set upload_id = $2, last_error = 'welcome_reingest_preparing'
       where id = $1::uuid`,
      [found.rows[0].id, input.assetId],
    );
    return;
  }
  await db.query(
    `insert into public.social_music_scans (
       surface, profile_id, author_id, asset_id, playback_id, upload_id, status, next_attempt_at, last_error
     ) values (
       'welcome', $1::uuid, $2::uuid, $3, $3, $4, 'pending', null, 'welcome_reingest_preparing'
     )`,
    [input.profileId, input.authorId, digest, input.assetId],
  );
}

export async function welcomeReingestAssetId(db: SqlQueryable, profileId: string): Promise<string | null> {
  const found = await db.query<{ upload_id: string | null }>(
    `select upload_id
     from public.social_music_scans
     where profile_id = $1::uuid
       and last_error = 'welcome_reingest_preparing'
       and upload_id is not null
     limit 1`,
    [profileId],
  );
  const uploadId = found.rows[0]?.upload_id;
  return typeof uploadId === "string" && uploadId.length > 0 ? uploadId : null;
}

/** Leave the S3 digest row out of Music review. Nothing is deleted. */
export async function retireS3MusicPlaceholder(
  db: SqlQueryable,
  input: { surface: SocialReingestSurface; parentId: string },
): Promise<void> {
  const column = input.surface === "post" ? "post_id" : input.surface === "story" ? "story_id" : "profile_id";
  await db.query(
    `update public.social_music_scans
     set next_attempt_at = null, last_error = 'superseded'
     where ${column} = $1::uuid
       and last_error in ('s3_video_needs_mux', 'welcome_reingest_preparing')`,
    [input.parentId],
  );
}

/** A non-Mux video item, including one marked video only by content type. */
export function socialReingestVideoKey(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as { kind?: string; key?: string; provider?: string; contentType?: string };
  if (row.provider === "mux" || typeof row.key !== "string" || row.key.length === 0) return null;
  const contentType = (row.contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (row.kind === "video" || contentType.startsWith("video/")) return row.key;
  return null;
}
