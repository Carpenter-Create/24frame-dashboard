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
  socialVideoVisibleToOthers,
  socialVideoVisibleToViewer,
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
    expect(sql).not.toContain("is_gc_staff(");
    expect(sql).toContain("Staff review only");
    expect(sql).not.toMatch(/grant select \([\s\S]*vendor_title/);
  });

  it("holds a reused asset that has no scan row on the second post or story", () => {
    const start = sql.indexOf("create or replace function public.social_video_released");
    const end = sql.indexOf("revoke all on function public.social_video_released");
    const fn = sql.slice(start, end);
    expect(fn).toContain("s.asset_id = item->>'assetId'");
    expect(fn).toContain("s.playback_id = item->>'playbackId'");
    expect(fn).not.toMatch(/s\.post_id = p_id/);
    expect(fn).not.toMatch(/s\.story_id = p_id/);
    expect(sql).toContain("on conflict (asset_id) do nothing");
  });
});
