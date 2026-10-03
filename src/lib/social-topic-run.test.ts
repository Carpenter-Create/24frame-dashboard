import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social-topic-tagger", () => ({
  tagSocialPostTopic: vi.fn(),
  cleanupSocialPostTopicTracks: vi.fn(),
}));

import { cleanupSocialPostTopicTracks, tagSocialPostTopic } from "@/lib/social-topic-tagger";
import type { Database } from "@/lib/supabase/database.types";

import {
  runSocialTopicBatch,
  runSocialTopicDrain,
  SOCIAL_TOPIC_CANDIDATE_PAGE,
  SOCIAL_TOPIC_DRAIN_PAGE,
  SOCIAL_TOPIC_MAX_PER_AUTHOR,
  SOCIAL_TOPIC_POST_DEADLINE_MS,
} from "./social-topic-run";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const CLIENT = {} as Anthropic;
const SINCE = "2026-09-26T12:00:00.000Z";
const MIN_AGE_EDGE = "2026-10-03T11:58:00.000Z";
const EMPTY = { data: [], error: null };
const NO_STRAYS = { strayChecked: 0, strayTracksDeleted: 0, strayErrors: 0 };

type Result = { data: unknown[] | null; error: { message: string } | null };

function post(id: string, author = `author-${id}`, createdAt = "2026-10-03T11:00:00.000Z") {
  return { id, author_id: author, body: "caption", media: [], created_at: createdAt, edited_at: null };
}

/** Each from() builds one query; its limit() resolves the next queued result (then empty). */
function fakeAdmin(...results: Result[]) {
  const queries: unknown[][][] = [];
  const from = vi.fn(() => {
    const calls: unknown[][] = [];
    queries.push(calls);
    const result = results.shift() ?? EMPTY;
    const query: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of ["select", "is", "eq", "neq", "or", "lte", "lt", "not", "contains", "order", "limit"]) {
      query[name] = (...args) => {
        calls.push([name, ...args]);
        return name === "limit" ? Promise.resolve(result) : query;
      };
    }
    return query;
  });
  return { queries, from, admin: { from } as unknown as SupabaseClient<Database> };
}

beforeEach(() => {
  vi.mocked(tagSocialPostTopic).mockReset();
  vi.mocked(cleanupSocialPostTopicTracks).mockReset().mockResolvedValue({ deleted: 0, pending: false });
});

describe("runSocialTopicBatch", () => {
  it("selects untagged top-level active posts created or edited in the window, newest first", async () => {
    const db = fakeAdmin(EMPTY);

    await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 1000 });

    expect(db.from).toHaveBeenCalledWith("posts");
    expect(db.queries[0]).toEqual([
      ["select", "id, author_id, body, media, created_at, edited_at"],
      ["is", "category", null],
      ["is", "category_tagged_at", null],
      ["is", "group_id", null],
      ["eq", "status", "active"],
      ["or", `created_at.gte."${SINCE}",edited_at.gte."${SINCE}"`],
      ["lte", "created_at", MIN_AGE_EDGE],
      ["order", "created_at", { ascending: false }],
      ["limit", SOCIAL_TOPIC_CANDIDATE_PAGE],
    ]);
  });

  it("tags each post and counts every outcome, continuing past a failure", async () => {
    const db = fakeAdmin({ data: ["a", "b", "c", "d", "e"].map((id) => post(id)), error: null });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(tagSocialPostTopic)
      .mockResolvedValueOnce("tagged")
      .mockRejectedValueOnce(new Error("model down"))
      .mockResolvedValueOnce("declined")
      .mockResolvedValueOnce("wait")
      .mockResolvedValueOnce("raced");

    const summary = await runSocialTopicBatch({
      admin: db.admin,
      client: CLIENT,
      now: NOW,
      batchSize: 40,
      budgetMs: 60_000,
    });

    expect(summary).toEqual({
      selected: 5,
      tagged: 1,
      declined: 1,
      wait: 1,
      raced: 1,
      error: 1,
      deferred: 0,
      ...NO_STRAYS,
    });
    expect(vi.mocked(tagSocialPostTopic).mock.calls.map(([args]) => args.post.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(vi.mocked(tagSocialPostTopic).mock.calls[0]?.[0]).toMatchObject({ client: CLIENT, now: NOW });
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('"postId":"b"'));
    errorLog.mockRestore();
  });

  it(`takes at most ${SOCIAL_TOPIC_MAX_PER_AUTHOR} posts per author, and pages past a flooding author`, async () => {
    // A full first page from one author, then other authors' older posts.
    const flood = Array.from({ length: SOCIAL_TOPIC_CANDIDATE_PAGE }, (_, index) =>
      post(`f${index}`, "flooder", new Date(Date.parse("2026-10-03T11:50:00.000Z") - index * 1000).toISOString()),
    );
    const last = flood[flood.length - 1]!.created_at;
    const db = fakeAdmin(
      { data: flood, error: null },
      { data: [post("a", "alice", "2026-10-02T09:00:00.000Z"), post("b", "bob", "2026-10-01T09:00:00.000Z")], error: null },
    );
    vi.mocked(tagSocialPostTopic).mockResolvedValue("tagged");

    const summary = await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 60_000 });

    expect(vi.mocked(tagSocialPostTopic).mock.calls.map(([args]) => args.post.id)).toEqual(["f0", "f1", "f2", "a", "b"]);
    expect(summary.selected).toBe(5);
    // The second page starts strictly before the first page's oldest row
    // and leaves the capped author out.
    expect(db.queries[1]).toEqual(
      expect.arrayContaining([
        ["lt", "created_at", last],
        ["not", "author_id", "in", "(flooder)"],
      ]),
    );
    expect(db.queries[1]).not.toContainEqual(["lte", "created_at", MIN_AGE_EDGE]);
  });

  it("stops at the batch size", async () => {
    const db = fakeAdmin({ data: ["a", "b", "c", "d"].map((id) => post(id)), error: null });
    vi.mocked(tagSocialPostTopic).mockResolvedValue("tagged");

    const summary = await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 2, budgetMs: 60_000 });

    expect(summary.selected).toBe(2);
    expect(vi.mocked(tagSocialPostTopic).mock.calls.map(([args]) => args.post.id)).toEqual(["a", "b"]);
  });

  it("defers the rest once the time budget is spent, and skips stray cleanup", async () => {
    const db = fakeAdmin({ data: ["a", "b", "c"].map((id) => post(id)), error: null });
    let time = 0;
    vi.mocked(tagSocialPostTopic).mockImplementation(async () => {
      time += 600;
      return "tagged";
    });

    const summary = await runSocialTopicBatch({
      admin: db.admin,
      client: CLIENT,
      now: NOW,
      batchSize: 40,
      budgetMs: 1000,
      clock: () => time,
    });

    expect(summary).toMatchObject({ selected: 3, tagged: 2, deferred: 1 });
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(cleanupSocialPostTopicTracks).not.toHaveBeenCalled();
  });

  it("then deletes leftover caption tracks on removed or hidden video posts", async () => {
    const removed = { id: "gone", author_id: "alice", media: [{ provider: "mux" }] };
    const db = fakeAdmin(EMPTY, { data: [removed], error: null });
    vi.mocked(cleanupSocialPostTopicTracks).mockResolvedValue({ deleted: 2, pending: false });

    const summary = await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 60_000 });

    expect(db.queries[1]).toEqual([
      ["select", "id, author_id, media"],
      ["is", "category_tagged_at", null],
      ["is", "group_id", null],
      ["neq", "status", "active"],
      ["contains", "media", '[{"provider":"mux"}]'],
      ["or", `created_at.gte."${SINCE}",edited_at.gte."${SINCE}"`],
      ["order", "created_at", { ascending: false }],
      ["limit", 20],
    ]);
    expect(vi.mocked(cleanupSocialPostTopicTracks).mock.calls[0]?.[0]).toMatchObject({ post: removed, now: NOW });
    expect(summary).toMatchObject({ strayChecked: 1, strayTracksDeleted: 2, strayErrors: 0 });
    expect(tagSocialPostTopic).not.toHaveBeenCalled();
  });

  it("counts a failed stray cleanup apart from tagging errors", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = fakeAdmin(EMPTY, { data: [{ id: "gone", author_id: "alice", media: [] }], error: null });
    vi.mocked(cleanupSocialPostTopicTracks).mockRejectedValue(new Error("Mux track delete failed (503)"));

    const summary = await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 60_000 });

    expect(summary).toMatchObject({ error: 0, strayChecked: 1, strayErrors: 1, strayTracksDeleted: 0 });
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("social topic stray cleanup failed"));

    const failing = fakeAdmin(EMPTY, { data: null, error: { message: "timeout" } });
    expect(
      await runSocialTopicBatch({ admin: failing.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 60_000 }),
    ).toMatchObject({ error: 0, strayChecked: 0, strayErrors: 1 });
    errorLog.mockRestore();
  });

  it("gives up on a post that runs past its deadline and moves on", async () => {
    vi.useFakeTimers();
    try {
      const db = fakeAdmin({ data: ["slow", "next"].map((id) => post(id)), error: null });
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      // The slow post fails only after the run has moved on: that late
      // rejection must stay handled (vitest fails on an unhandled one).
      vi.mocked(tagSocialPostTopic)
        .mockImplementationOnce(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error("late failure")), 8_000)),
        )
        .mockResolvedValueOnce("tagged");

      const run = runSocialTopicBatch({
        admin: db.admin,
        client: CLIENT,
        now: NOW,
        batchSize: 40,
        budgetMs: 60_000,
        postDeadlineMs: 5_000,
      });
      await vi.advanceTimersByTimeAsync(4_999);
      expect(tagSocialPostTopic).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect(await run).toMatchObject({ selected: 2, tagged: 1, error: 1 });
      expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("post timed out after 5000 ms"));
      // The slow post's own signal is aborted, so its work stops; the next post gets a fresh one.
      const [slow, next] = vi.mocked(tagSocialPostTopic).mock.calls.map(([args]) => args.signal);
      expect(slow?.aborted).toBe(true);
      expect(String(slow?.reason)).toContain("post timed out after 5000 ms");
      expect(next?.aborted).toBe(false);
      // The slow post's late rejection fires here, after the run returned.
      await vi.advanceTimersByTimeAsync(10_000);
      expect(vi.getTimerCount()).toBe(0);
      errorLog.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows each post 90 seconds by default", () => {
    expect(SOCIAL_TOPIC_POST_DEADLINE_MS).toBe(90_000);
  });

  it("throws when the select fails", async () => {
    const db = fakeAdmin({ data: null, error: { message: "permission denied" } });
    await expect(
      runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 1000 }),
    ).rejects.toThrow("Topic select failed: permission denied");
    expect(tagSocialPostTopic).not.toHaveBeenCalled();
  });
});

describe("runSocialTopicDrain", () => {
  const video = (id: string, createdAt = "2026-10-03T11:00:00.000Z") => ({
    id,
    author_id: `author-${id}`,
    media: [{ provider: "mux" }],
    created_at: createdAt,
  });

  it("checks untagged video posts in the window, active or not, and never tags", async () => {
    const db = fakeAdmin({ data: [video("a"), video("b")], error: null });
    vi.mocked(cleanupSocialPostTopicTracks)
      .mockResolvedValueOnce({ deleted: 1, pending: false })
      .mockResolvedValueOnce({ deleted: 0, pending: true });

    const summary = await runSocialTopicDrain({ admin: db.admin, now: NOW, budgetMs: 60_000 });

    expect(db.queries[0]).toEqual([
      ["select", "id, author_id, media, created_at"],
      ["is", "category", null],
      ["is", "category_tagged_at", null],
      ["is", "group_id", null],
      ["contains", "media", '[{"provider":"mux"}]'],
      ["or", `created_at.gte."${SINCE}",edited_at.gte."${SINCE}"`],
      ["order", "created_at", { ascending: false }],
      ["limit", SOCIAL_TOPIC_DRAIN_PAGE],
    ]);
    // No status filter: active posts are drained too.
    expect(db.queries[0]?.some(([name]) => name === "eq" || name === "neq")).toBe(false);
    expect(vi.mocked(cleanupSocialPostTopicTracks).mock.calls[0]?.[0]).toMatchObject({ post: video("a"), now: NOW });
    expect(vi.mocked(cleanupSocialPostTopicTracks).mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
    expect(summary).toEqual({ checked: 2, tracksDeleted: 1, pending: 1, errors: 0, complete: true });
    expect(tagSocialPostTopic).not.toHaveBeenCalled();
  });

  it("pages through the whole window, older than the last row each time", async () => {
    const full = Array.from({ length: SOCIAL_TOPIC_DRAIN_PAGE }, (_, i) =>
      video(`p${i}`, new Date(Date.parse("2026-10-03T11:00:00.000Z") - i * 1000).toISOString()),
    );
    const last = full[full.length - 1]!.created_at;
    const db = fakeAdmin({ data: full, error: null }, { data: [video("old", "2026-09-30T00:00:00.000Z")], error: null });

    const summary = await runSocialTopicDrain({ admin: db.admin, now: NOW, budgetMs: 60_000 });

    expect(db.queries).toHaveLength(2);
    expect(db.queries[0]?.some(([name]) => name === "lt")).toBe(false);
    expect(db.queries[1]).toContainEqual(["lt", "created_at", last]);
    expect(summary).toMatchObject({ checked: SOCIAL_TOPIC_DRAIN_PAGE + 1, complete: true });
  });

  it("stops at the time budget and reports the scan incomplete", async () => {
    const db = fakeAdmin({ data: [video("a"), video("b"), video("c")], error: null });
    let now = 0;
    vi.mocked(cleanupSocialPostTopicTracks).mockImplementation(async () => {
      now += 40_000;
      return { deleted: 0, pending: false };
    });

    const summary = await runSocialTopicDrain({ admin: db.admin, now: NOW, budgetMs: 60_000, clock: () => now });

    expect(summary).toEqual({ checked: 2, tracksDeleted: 0, pending: 0, errors: 0, complete: false });
  });

  it("counts a failed check and carries on; a failed select throws", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = fakeAdmin({ data: [video("a"), video("b")], error: null });
    vi.mocked(cleanupSocialPostTopicTracks)
      .mockRejectedValueOnce(new Error("Mux asset lookup failed (503)"))
      .mockResolvedValueOnce({ deleted: 1, pending: false });

    expect(await runSocialTopicDrain({ admin: db.admin, now: NOW, budgetMs: 60_000 })).toEqual({
      checked: 2, tracksDeleted: 1, pending: 0, errors: 1, complete: true,
    });
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("social topic drain post failed"));

    const failing = fakeAdmin({ data: null, error: { message: "timeout" } });
    await expect(runSocialTopicDrain({ admin: failing.admin, now: NOW, budgetMs: 60_000 })).rejects.toThrow(
      "Topic drain select failed: timeout",
    );
    errorLog.mockRestore();
  });
});

describe("PostgREST filters as the real client builds them", () => {
  it("sends a jsonb containment filter for Mux posts and a quoted window", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const urls: string[] = [];
    const client = createClient("https://db.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (async (input: RequestInfo | URL) => {
          urls.push(String(input));
          return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
        }) as typeof fetch,
      },
    });
    const { SOCIAL_TOPIC_MUX_MEDIA_FILTER } = await import("./social-topic-run");

    await client
      .from("posts")
      .select("id")
      .contains("media", SOCIAL_TOPIC_MUX_MEDIA_FILTER)
      .or(`created_at.gte."${SINCE}",edited_at.gte."${SINCE}"`)
      .not("author_id", "in", "(11111111-1111-4111-8111-111111111111)");

    const params = new URL(urls[0]!).searchParams;
    expect(params.get("media")).toBe('cs.[{"provider":"mux"}]');
    expect(params.get("or")).toBe(`(created_at.gte."${SINCE}",edited_at.gte."${SINCE}")`);
    expect(params.get("author_id")).toBe("not.in.(11111111-1111-4111-8111-111111111111)");
  });
});
