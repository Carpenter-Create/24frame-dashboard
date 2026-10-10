# 24Frame Social music scan worker

AWS Lambda (container image) that fingerprints new Social Mux video and
blocks a music match at the configured score (default 25). Decision is
allow or block. No mute. No allowlist. Vendor is ACRCloud identify behind
`MusicFingerprintAdapter`. `metadata.custom_files` is ignored.

- EventBridge rule `24frame-social-music-scan`, `rate(1 minute)` → this
  handler. Created disabled. Reserved concurrency 1. Asynchronous retries
  0: the row's `next_attempt_at` is the retry.
- No Mux webhook exists in this repo. The worker polls `social_music_scans`
  where `status = pending` and the asset is ready, then reads the Mux
  audio-only static rendition (`audio.m4a`).
- `{"dryRun": true}` checks the database, Mux, and ACRCloud with generated
  silence. It does not decide a real upload.
- Images are tagged with the git commit (`--build-arg GIT_SHA`).

Entry: `workers/social-music/handler.ts` → `runSocialMusicBatch` in
`src/lib/social-music-run.ts`.

**After merge, the founder must apply the migration, rebuild the image,
and create the function.** Merge ≠ live. Founder-executed setup:
[`docs/infra/social-music-detect.md`](../../docs/infra/social-music-detect.md).
Do not create AWS from CI.
