import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  MUSIC_SCAN_BACKOFF_MS,
  MUSIC_SCAN_MAX_ATTEMPTS,
  decideMusicScan,
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

  it("mints per playback id: pending elsewhere does not deny, any block does", () => {
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
      { startSeconds: 24, endSeconds: 30 },
    ]);
    expect(musicScanWindows(24.0004)).toEqual([
      { startSeconds: 0, endSeconds: 12 },
      { startSeconds: 12, endSeconds: 24 },
    ]);
    expect(planMusicScanCoverage(0.0004)).toEqual({ kind: "unknown" });
    expect(musicScanWindows(400)).toHaveLength(Math.ceil(400 / 12));
    expect(planMusicScanCoverage(MUSIC_SCAN_COVERED_SECONDS + 1)).toEqual({ kind: "over_cap" });
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
    expect(sql).not.toMatch(/grant select \([\s\S]*vendor_title/);
  });
});
