import { socialVideoDurationExceedsCap } from "@/lib/social-mux";

// Founder-run re-ingest of S3 video onto Mux. Dry-run is the default.
// Expired stories are skipped. A missing source becomes Unfinished.
// Nothing here deletes an S3 object.

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
};

export type SocialReingestAsset = {
  playbackId: string | null;
  duration: number | null;
  status: string;
};

export type SocialReingestDeps = {
  head: (key: string) => Promise<boolean>;
  presign: (key: string) => Promise<string>;
  createAsset: (url: string) => Promise<{ assetId: string }>;
  loadAsset: (assetId: string) => Promise<SocialReingestAsset>;
  deleteAsset: (assetId: string) => Promise<void>;
  bind: (input: { authorId: string; uploadId: string; assetId: string; playbackId: string }) => Promise<void>;
  saveParent: (
    candidate: SocialReingestCandidate,
    ids: { assetId: string; playbackId: string; uploadId: string },
  ) => Promise<void>;
  /** The S3 placeholder must not stay Unfinished after the Mux parent is bound. */
  retirePlaceholder: (candidate: SocialReingestCandidate) => Promise<void>;
  saveInProgress: (candidate: SocialReingestCandidate, assetId: string) => Promise<void>;
  markUnfinished: (candidate: SocialReingestCandidate, error: string) => Promise<void>;
  alreadyUnfinished: (candidate: SocialReingestCandidate) => Promise<boolean>;
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

/** Count first. Writes only when execute is true. */
export async function reingestSocialS3Videos(input: {
  execute: boolean;
  candidates: readonly SocialReingestCandidate[];
  deps: SocialReingestDeps;
}): Promise<SocialReingestReport> {
  const report = empty(!input.execute);
  for (const candidate of input.candidates) {
    if (candidate.surface === "story" && candidate.expired) {
      report.skippedExpired += 1;
      continue;
    }
    if (candidate.playbackId) continue;
    report.candidates += 1;
    if (!input.execute) continue;
    if (await input.deps.alreadyUnfinished(candidate)) continue;
    if (candidate.assetId) {
      await settleAsset(candidate, candidate.assetId, input.deps, report);
      continue;
    }
    const present = await input.deps.head(candidate.key).catch(() => false);
    if (!present) {
      await input.deps.markUnfinished(candidate, "s3_source_missing");
      report.unfinished += 1;
      continue;
    }
    const url = await input.deps.presign(candidate.key);
    const created = await input.deps.createAsset(url);
    await input.deps.saveInProgress(candidate, created.assetId);
    await settleAsset(candidate, created.assetId, input.deps, report);
  }
  return report;
}

async function settleAsset(
  candidate: SocialReingestCandidate,
  assetId: string,
  deps: SocialReingestDeps,
  report: SocialReingestReport,
): Promise<void> {
  const asset = await deps.loadAsset(assetId);
  const playbackId = asset.playbackId;
  if (!playbackId || asset.status !== "ready") {
    report.preparing += 1;
    return;
  }
  if (socialVideoDurationExceedsCap(asset.duration)) {
    await deps.deleteAsset(assetId);
    await deps.markUnfinished(candidate, "welcome_too_long");
    report.unfinished += 1;
    return;
  }
  if (typeof asset.duration !== "number" || !Number.isFinite(asset.duration) || asset.duration <= 0) {
    report.preparing += 1;
    return;
  }
  await deps.bind({
    authorId: candidate.authorId,
    uploadId: assetId,
    assetId,
    playbackId,
  });
  await deps.saveParent(candidate, { assetId, playbackId, uploadId: assetId });
  await deps.retirePlaceholder(candidate);
  report.bound += 1;
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
