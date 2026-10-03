import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social-topic-tagger", () => ({
  tagSocialPostTopic: vi.fn(),
}));

import { tagSocialPostTopic } from "@/lib/social-topic-tagger";
import type { Database } from "@/lib/supabase/database.types";

import {
  runSocialTopicBatch,
  SOCIAL_TOPIC_CANDIDATE_PAGE,
  SOCIAL_TOPIC_MAX_PER_AUTHOR,
  SOCIAL_TOPIC_POST_DEADLINE_MS,
} from "./social-topic-run";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const CLIENT = {} as Anthropic;
const SINCE = "2026-09-26T12:00:00.000Z";
const MIN_AGE_EDGE = "2026-10-03T11:58:00.000Z";
const EMPTY = { data: [], error: null };

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
    for (const name of ["select", "is", "eq", "or", "lte", "lt", "not", "order", "limit"]) {
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

  it("defers the rest once the time budget is spent", async () => {
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

describe("PostgREST filters as the real client builds them", () => {
  it("sends a quoted window, then leaves a capped author out of the next page", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const flooder = "11111111-1111-4111-8111-111111111111";
    const flood = Array.from({ length: SOCIAL_TOPIC_CANDIDATE_PAGE }, (_, index) =>
      post(`f${index}`, flooder, new Date(Date.parse("2026-10-03T11:50:00.000Z") - index * 1000).toISOString()),
    );
    const pages: unknown[][] = [flood];
    const urls: string[] = [];
    const client = createClient<Database>("https://db.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (async (input: RequestInfo | URL) => {
          urls.push(String(input));
          return new Response(JSON.stringify(pages.shift() ?? []), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }) as typeof fetch,
      },
    });
    vi.mocked(tagSocialPostTopic).mockResolvedValue("tagged");

    await runSocialTopicBatch({ admin: client, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 60_000 });

    expect(urls).toHaveLength(2);
    const [first, second] = urls.map((url) => new URL(url).searchParams);
    expect(first?.get("or")).toBe(`(created_at.gte."${SINCE}",edited_at.gte."${SINCE}")`);
    expect(first?.get("created_at")).toBe(`lte.${MIN_AGE_EDGE}`);
    expect(first?.has("author_id")).toBe(false);
    expect(second?.get("or")).toBe(`(created_at.gte."${SINCE}",edited_at.gte."${SINCE}")`);
    expect(second?.get("created_at")).toBe(`lt.${flood[flood.length - 1]!.created_at}`);
    expect(second?.get("author_id")).toBe(`not.in.(${flooder})`);
  });
});
