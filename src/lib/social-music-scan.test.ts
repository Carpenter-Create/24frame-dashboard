import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { socialVideoDurationExceedsCap } from "@/lib/social-mux";
import { SOCIAL_GO_LIVE_MAX_MS } from "@/lib/social-go-live";

import {
  MUSIC_SCAN_BACKOFF_MS,
  MUSIC_SCAN_MAX_ATTEMPTS,
  decideMusicScan,
  loadOwnMusicNotices,
  musicNoticeFromScans,
  musicScanBackoff,
  musicScanConfig,
  musicScanLatencyLine,
  musicStaffPriority,
  omitHeldPosts,
  combineMusicWindowResults,
  musicScanWindows,
  planMusicScanCoverage,
  MUSIC_SCAN_COVERED_SECONDS,
  MUSIC_SCAN_MAX_WINDOWS,
  socialVideoKeyDigest,
  muxItemReleasedToOthers,
  socialMuxPlaybackMusicReleased,
  socialMusicParentStillHasScan,
  socialParentVisibleToOthers,
  socialVideoVisibleToOthers,
  socialVideoVisibleToViewer,
  type SocialMusicScanRef,
  type SocialMuxMediaRef,
  type MusicIdentifyResult,
  type MusicScanDecision,
} from "@/lib/social-music-scan";

const MATCH = (score: number): MusicIdentifyResult => ({
  kind: "match",
  code: 0,
  score,
  title: "Fixture Track",
  artist: "Fixture Artist",
  album: null,
  acrid: null,
  isrc: null,
  label: null,
});

describe("decideMusicScan", () => {
  const rows: { name: string; result: MusicIdentifyResult; decision: MusicScanDecision }[] = [
    { name: "24 passes", result: MATCH(24), decision: "allow" },
    { name: "25 blocks", result: MATCH(25), decision: "block" },
    { name: "69 blocks", result: MATCH(69), decision: "block" },
    { name: "100 blocks", result: MATCH(100), decision: "block" },
    { name: "no match passes", result: { kind: "no_match", code: 1001 }, decision: "allow" },
    {
      name: "vendor error retries",
      result: { kind: "error", code: "timeout", retryable: true },
      decision: "retry",
    },
    {
      name: "NaN score retries",
      result: {
        kind: "match",
        code: 0,
        score: Number.NaN,
        title: null,
        artist: null,
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      },
      decision: "retry",
    },
  ];

  it.each(rows)("$name", ({ result, decision }) => {
    expect(decideMusicScan({ result })).toBe(decision);
  });

  it("reads the block line from config and never lets the confident line pass a clip", () => {
    expect(musicScanConfig.blockScore).toBe(25);
    expect(musicScanConfig.confidentScore).toBe(70);
    expect(decideMusicScan({ result: MATCH(70) })).toBe("block");
    expect(decideMusicScan({ result: MATCH(25), config: { blockScore: 25 } })).toBe("block");
    expect(decideMusicScan({ result: MATCH(24), config: { blockScore: 25 } })).toBe("allow");
    expect(musicStaffPriority(100)).toBe("confident");
    expect(musicStaffPriority(25)).toBe("spot_check");
    expect(decideMusicScan({ result: MATCH(69) })).toBe("block");
  });
});

describe("social video visibility", () => {
  it("shows a video with no scan and hides pending or blocked from other people", () => {
    expect(socialVideoVisibleToOthers([])).toBe(true);
    expect(socialVideoVisibleToOthers([{ status: "allowed" }])).toBe(true);
    expect(socialVideoVisibleToOthers([{ status: "pending" }])).toBe(false);
    expect(socialVideoVisibleToOthers([{ status: "blocked" }])).toBe(false);
    expect(socialVideoVisibleToOthers([{ status: "allowed" }, { status: "pending" }])).toBe(false);
  });

  it("lets the author see their own pending or blocked video", () => {
    const scans = [{ status: "pending" as const }, { status: "blocked" as const }];
    expect(socialVideoVisibleToViewer({ viewerId: "author", authorId: "author", scans })).toBe(true);
    expect(socialVideoVisibleToViewer({ viewerId: "other", authorId: "author", scans })).toBe(false);
    expect(socialVideoVisibleToViewer({ viewerId: "", authorId: "author", scans })).toBe(false);
  });

  it("prefers a blocked notice over pending", () => {
    expect(musicNoticeFromScans([{ status: "pending" }, { status: "blocked" }])).toBe("blocked");
    expect(musicNoticeFromScans([{ status: "pending" }, { status: "allowed" }])).toBe("pending");
    expect(musicNoticeFromScans([{ status: "allowed" }])).toBeNull();
    expect(
      musicNoticeFromScans([
        { status: "pending", attemptCount: MUSIC_SCAN_MAX_ATTEMPTS, nextAttemptAt: null },
      ]),
    ).toBe("malformed");
    expect(
      musicNoticeFromScans([{ status: "pending", attemptCount: 2, nextAttemptAt: "2026-10-08T18:00:30.000Z" }]),
    ).toBe("pending");
    expect(
      musicNoticeFromScans([
        { status: "blocked" },
        { status: "pending", attemptCount: MUSIC_SCAN_MAX_ATTEMPTS, nextAttemptAt: null },
      ]),
    ).toBe("blocked");
    expect(
      musicNoticeFromScans([
        { status: "pending", lastError: "superseded" },
        { status: "allowed" },
      ]),
    ).toBeNull();
    expect(musicNoticeFromScans([{ status: "pending", lastError: "superseded" }])).toBeNull();
    expect(musicNoticeFromScans([{ status: "pending", lastError: "s3_video_needs_mux" }])).toBe("legacyHeld");
    expect(musicNoticeFromScans([{ status: "pending", lastError: "s3_video_needs_mux" }], "welcome")).toBe(
      "welcomePending",
    );
    expect(musicNoticeFromScans([{ status: "pending" }], "welcome")).toBe("welcomePending");
    expect(musicNoticeFromScans([{ status: "pending", lastError: "mux_id_malformed" }])).toBe("malformed");
    expect(musicNoticeFromScans([{ status: "pending", attemptCount: 0, nextAttemptAt: null }])).toBe("pending");
    expect(musicNoticeFromScans([{ status: "blocked" }], "welcome")).toBe("blocked");
  });

  it("maps the server notice and does not select last_error", async () => {
    const source = readFileSync("src/lib/social-music-scan.ts", "utf8");
    const body = source.slice(source.indexOf("export async function loadOwnMusicNotices"));
    expect(body).not.toContain("last_error");
    expect(body).not.toContain("next_attempt_at");
    const supabase = {
      rpc: async (name: string, args: { p_post_ids: string[]; p_story_ids: string[] }) => {
        expect(name).toBe("social_music_author_notices");
        expect(args.p_post_ids).toEqual(["post-1", "post-2"]);
        expect(args.p_story_ids).toEqual(["story-1"]);
        return {
          data: [
            { post_id: "post-1", story_id: null, notice: "blocked" },
            { post_id: "post-2", story_id: null, notice: "malformed" },
            { post_id: null, story_id: "story-1", notice: "pending" },
            { post_id: "post-1", story_id: null, notice: "allowed" },
            { post_id: null, story_id: null, notice: "welcomePending" },
            { post_id: null, story_id: null, notice: "legacyHeld" },
          ],
          error: null,
        };
      },
    };
    const maps = await loadOwnMusicNotices(supabase as never, "author-1", {
      postIds: ["post-1", "post-2"],
      storyIds: ["story-1"],
    });
    expect(maps.posts.get("post-1")).toBe("blocked");
    expect(maps.posts.get("post-2")).toBe("malformed");
    expect(maps.stories.get("story-1")).toBe("pending");
    expect(maps.welcome).toBe("legacyHeld");
  });

  it("skips a welcome or media row that no longer stores the scanned pair", () => {
    const scan = { surface: "welcome" as const, assetId: "asset12345678", playbackId: "play12345678" };
    expect(socialMusicParentStillHasScan(scan, null)).toBe(false);
    expect(
      socialMusicParentStillHasScan(scan, { welcomeAssetId: "asset12345678", welcomePlaybackId: "playOTHER0001" }),
    ).toBe(false);
    expect(
      socialMusicParentStillHasScan(scan, { welcomeAssetId: "asset12345678", welcomePlaybackId: "play12345678" }),
    ).toBe(true);
    expect(
      socialMusicParentStillHasScan(
        { surface: "post", assetId: "asset12345678", playbackId: "play12345678" },
        { media: [{ provider: "mux", assetId: "assetOTHER0001", playbackId: "play12345678" }] },
      ),
    ).toBe(false);
    expect(
      socialMusicParentStillHasScan(
        { surface: "post", assetId: "asset12345678", playbackId: "play12345678" },
        { media: [{ provider: "mux", assetId: "asset12345678", playbackId: "play12345678" }] },
      ),
    ).toBe(true);
  });
});

describe("music scan timing", () => {
  it("backs off and then holds after the attempt cap", () => {
    const now = new Date("2026-10-08T18:00:00.000Z");
    expect(musicScanBackoff(1, now)?.toISOString()).toBe("2026-10-08T18:00:30.000Z");
    expect(musicScanBackoff(2, now)?.getTime()).toBe(now.getTime() + MUSIC_SCAN_BACKOFF_MS[1]);
    expect(musicScanBackoff(MUSIC_SCAN_MAX_ATTEMPTS, now)).toBeNull();
  });

  it("records mux-ready to decision", () => {
    const line = musicScanLatencyLine({
      scanId: "scan-1",
      decision: "block",
      muxReadyAt: "2026-10-08T18:00:00.000Z",
      scanStartedAt: "2026-10-08T18:00:02.000Z",
      decidedAt: "2026-10-08T18:00:05.000Z",
    });
    expect(line.msg).toBe("social music scan");
    expect(line.mux_ready_to_decision_ms).toBe(5000);
    expect(JSON.stringify(line)).not.toContain("title");
  });
});

describe("reused Mux asset release", () => {
  const media = (): SocialMuxMediaRef[] => [
    {
      kind: "video",
      provider: "mux",
      assetId: "asset12345678",
      playbackId: "play12345678",
    },
  ];
  const scan = (status: "pending" | "blocked" | "allowed"): SocialMusicScanRef => ({
    assetId: "asset12345678",
    playbackId: "play12345678",
    status,
  });

  it("hides a second post that reuses a pending asset", () => {
    expect(socialParentVisibleToOthers(media(), [scan("pending")])).toBe(false);
  });

  it("hides a second post that reuses a blocked asset", () => {
    expect(socialParentVisibleToOthers(media(), [scan("blocked")])).toBe(false);
  });

  it("hides a story that reuses a post asset while that scan is pending", () => {
    expect(socialParentVisibleToOthers(media(), [scan("pending")])).toBe(false);
  });

  it("shows a parent that reuses an allowed asset", () => {
    expect(socialParentVisibleToOthers(media(), [scan("allowed")])).toBe(true);
  });

  it("hides a Mux video that has no scan, a short asset id, or only a different asset's block", () => {
    expect(socialParentVisibleToOthers(media(), [])).toBe(false);
    expect(muxItemReleasedToOthers({ kind: "video", provider: "mux", assetId: "short", playbackId: "play12345678" }, [])).toBe(
      false,
    );
    expect(
      muxItemReleasedToOthers(
        { kind: "video", provider: "mux", playbackId: "play12345678" },
        [scan("allowed")],
      ),
    ).toBe(false);
    expect(
      socialParentVisibleToOthers(
        [{ kind: "video", provider: "mux", assetId: "otherasset1", playbackId: "otherplay1" }],
        [scan("blocked")],
      ),
    ).toBe(false);
    expect(socialParentVisibleToOthers([{ kind: "image" }], [])).toBe(true);
    const key = "posts/author/clip.mp4";
    const digest = socialVideoKeyDigest(key);
    expect(socialParentVisibleToOthers([{ kind: "video", key }], [])).toBe(false);
    expect(
      socialParentVisibleToOthers([{ kind: "video", key }], [{ assetId: digest, playbackId: digest, status: "pending" }]),
    ).toBe(false);
    expect(
      socialParentVisibleToOthers([{ kind: "video", key }], [{ assetId: digest, playbackId: digest, status: "allowed" }]),
    ).toBe(true);
  });

  it("mints per playback id: a block denies and a pending row on another parent does not", () => {
    const parent = { id: "post-1", surface: "post" as const };
    const other = { id: "post-2", surface: "post" as const };
    const row = (
      status: "pending" | "blocked" | "allowed",
      postId = "post-1",
    ) => ({
      playbackId: "play12345678",
      status,
      postId,
      storyId: null,
    });
    expect(socialMuxPlaybackMusicReleased("play12345678", [parent], [])).toBe(false);
    expect(socialMuxPlaybackMusicReleased("play12345678", [parent], [row("pending")])).toBe(false);
    expect(socialMuxPlaybackMusicReleased("play12345678", [parent], [row("blocked")])).toBe(false);
    expect(socialMuxPlaybackMusicReleased("play12345678", [parent], [row("allowed")])).toBe(true);
    expect(socialMuxPlaybackMusicReleased("play12345678", [parent], [row("allowed"), row("blocked", "post-2")])).toBe(
      false,
    );
    expect(
      socialMuxPlaybackMusicReleased("play12345678", [parent], [row("allowed"), row("pending", "post-2")]),
    ).toBe(true);
    expect(socialMuxPlaybackMusicReleased("play12345678", [other], [row("allowed"), row("pending", "post-2")])).toBe(
      false,
    );
  });
});

describe("music scan windows", () => {
  const match = (score: number): MusicIdentifyResult => MATCH(score);

  it("covers the whole clip up to the cap, and a block wins over an error", () => {
    expect(planMusicScanCoverage(null)).toEqual({ kind: "unknown" });
    expect(planMusicScanCoverage(0)).toEqual({ kind: "unknown" });
    expect(planMusicScanCoverage(Number.NaN)).toEqual({ kind: "unknown" });
    expect(musicScanWindows(30)).toEqual([
      { startSeconds: 0, endSeconds: 12 },
      { startSeconds: 12, endSeconds: 24 },
      { startSeconds: 18, endSeconds: 30 },
    ]);
    expect(musicScanWindows(12.3)).toEqual([
      { startSeconds: 0, endSeconds: 12 },
      { startSeconds: 0.3, endSeconds: 12.3 },
    ]);
    expect(musicScanWindows(12.0063)).toEqual([{ startSeconds: 0, endSeconds: 12.006 }]);
    const frame = 24 + 1 / 30;
    const framed = musicScanWindows(frame);
    expect(framed.at(-1)).toEqual({
      startSeconds: Math.round((frame - 12) * 1000) / 1000,
      endSeconds: Math.round(frame * 1000) / 1000,
    });
    expect(framed.some((window) => window.endSeconds - window.startSeconds < 1)).toBe(false);
    expect(musicScanWindows(400)).toHaveLength(34);
    expect(planMusicScanCoverage(MUSIC_SCAN_COVERED_SECONDS + 1)).toEqual({ kind: "unknown" });
    for (const seconds of [479.9, 480, 480.021, 480.4]) {
      expect(socialVideoDurationExceedsCap(seconds)).toBe(false);
      expect(planMusicScanCoverage(seconds).kind).toBe("cover");
    }
    expect(socialVideoDurationExceedsCap(480.6)).toBe(true);
    expect(planMusicScanCoverage(480.6)).toEqual({ kind: "unknown" });
    expect(socialVideoDurationExceedsCap(SOCIAL_GO_LIVE_MAX_MS / 1000)).toBe(false);
    expect(musicScanWindows(MUSIC_SCAN_COVERED_SECONDS)).toHaveLength(MUSIC_SCAN_MAX_WINDOWS);
    expect(decideMusicScan({ result: combineMusicWindowResults([match(10), match(40), match(24)]) })).toBe("block");
    expect(decideMusicScan({ result: combineMusicWindowResults([match(10), match(24)]) })).toBe("allow");
    expect(
      decideMusicScan({
        result: combineMusicWindowResults([match(100), { kind: "error", code: "timeout", retryable: true }]),
      }),
    ).toBe("block");
    expect(
      decideMusicScan({
        result: combineMusicWindowResults([match(10), { kind: "error", code: "timeout", retryable: true }]),
      }),
    ).toBe("retry");
    expect(combineMusicWindowResults([match(40), match(100)])).toMatchObject({ kind: "match", score: 100 });
    expect(
      decideMusicScan({
        result: combineMusicWindowResults([match(25), { kind: "error", code: "timeout", retryable: true }]),
      }),
    ).toBe("block");
    expect(combineMusicWindowResults([match(Number.NaN)])).toMatchObject({ kind: "error", code: "invalid_score" });
    expect(combineMusicWindowResults([match(Number.POSITIVE_INFINITY)])).toMatchObject({
      kind: "error",
      code: "invalid_score",
    });
    expect(
      decideMusicScan({
        result: combineMusicWindowResults([match(Number.NaN), { kind: "no_match", code: 1001 }]),
      }),
    ).toBe("retry");
  });
});

describe("omitHeldPosts", () => {
  it("drops the viewer's own held discovery hits", () => {
    const notices = new Map([["held", "pending" as const]]);
    expect(omitHeldPosts([{ id: "held" }, { id: "clear" }], notices).map((hit) => hit.id)).toEqual(["clear"]);
  });
});

describe("social music scan migration", () => {
  const sql = readFileSync("supabase/migrations/20261008180000_social_music_scans.sql", "utf8");

  it("gates posts and stories on a released scan and keeps vendor fields off the author select", () => {
    expect(sql).toContain("social_video_released");
    expect(sql).toContain("create policy posts_select");
    expect(sql).toContain("create policy stories_select");
    expect(sql).toMatch(/posts_select[\s\S]*social_video_released\('post'/);
    expect(sql).toMatch(/stories_select[\s\S]*social_video_released\('story'/);
    expect(sql).toContain("author_id = (select auth.uid())");
    expect(sql).toContain("enqueue_social_music_scan");
    expect(sql).toContain("s.asset_id = mux.item->>'assetId'");
    expect(sql).toContain("s.playback_id = mux.item->>'playbackId'");
    expect(sql).toContain("s.post_id = p_id");
    expect(sql).toContain("s.story_id = p_id");
    expect(sql).toContain("private.social_video_released");
    expect(sql).toContain("social music scan requires a Mux asset id and playback id");
    expect(sql).toMatch(/^set lock_timeout = '3s';/m);
    expect(readFileSync("supabase/migrations/20261008180100_profiles_welcome_mux.sql", "utf8")).toMatch(
      /^set lock_timeout = '3s';/m,
    );
    const blockWins = sql.slice(
      sql.indexOf("function public.social_music_block_wins"),
      sql.indexOf("revoke all on function public.social_music_block_wins"),
    );
    expect(blockWins.indexOf("if new.status = 'pending'")).toBeGreaterThan(-1);
    expect(blockWins.indexOf("if new.status = 'pending'")).toBeLessThan(blockWins.indexOf("pg_advisory_xact_lock"));
    const notices = sql.slice(
      sql.indexOf("function public.social_music_author_notices"),
      sql.indexOf("revoke all on function public.social_music_author_notices"),
    );
    expect(notices).toContain("set search_path = ''");
    expect(notices).toContain("social music notices accept at most 500 ids");
    expect(notices).toContain("attempt_count >= 8");
    expect(notices).toContain("join public.profiles p on p.id = s.profile_id");
    expect(notices).toContain("s.asset_id = p.welcome_mux_asset_id");
    expect(notices).toContain("s.playback_id = p.welcome_mux_playback_id");
    expect(sql).toContain("revoke all on function public.touch_social_music_scan() from public, anon, authenticated, service_role");
    expect(sql).toContain("revoke all on function public.enqueue_social_music_scan() from public, anon, authenticated, service_role");
    expect(sql).toContain("revoke all on function public.social_music_block_wins() from public, anon, authenticated, service_role");
    expect(sql).toContain("on conflict do nothing");
    expect(sql).not.toContain("on conflict (asset_id)");
    expect(sql).not.toContain("grant execute on function public.social_video_released");
    expect(sql).toContain("revoke all on function private.social_video_released(text, uuid) from public, anon");
    expect(sql).toContain("s.playback_id = v_playback");
    expect(sql).toContain("social_mux_bindings");
    expect(sql).toContain("social mux video is not bound to this member");
    expect(sql).toContain("social video must be a Mux video");
    expect(sql).toContain("s3_video_needs_mux");
    expect(sql).toContain("mux_id_malformed");
    expect(sql).toContain("st.expires_at > now()");
    expect(sql).toContain("drop schema if exists private");
    const rollback = sql.slice(0, sql.indexOf("do $$ begin"));
    const restore = rollback.indexOf("create policy posts_select");
    const dropPrivate = rollback.indexOf("drop function if exists private.social_video_released");
    expect(restore).toBeGreaterThan(-1);
    expect(dropPrivate).toBeGreaterThan(restore);
    expect(rollback.indexOf("drop schema if exists private")).toBeGreaterThan(dropPrivate);
    expect(sql).not.toContain("is_gc_staff(");
    expect(sql).toContain("Staff review only");
    const authorGrant = sql.slice(
      sql.indexOf("grant select ("),
      sql.indexOf(") on public.social_music_scans to authenticated"),
    );
    expect(authorGrant).not.toContain("vendor_title");
    expect(authorGrant).not.toContain("last_error");
    expect(authorGrant).not.toContain("window_results");
  });
});
