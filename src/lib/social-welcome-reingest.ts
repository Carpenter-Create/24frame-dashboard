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
  report.bound += 1;
}
