import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social-topic-tagger", () => ({ tagSocialPostTopic: vi.fn() }));

import { tagSocialPostTopic } from "@/lib/social-topic-tagger";
import type { Database } from "@/lib/supabase/database.types";

import { runSocialTopicBatch } from "./social-topic-run";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const CLIENT = {} as Anthropic;

function post(id: string) {
  return { id, author_id: "author", body: "caption", media: [], created_at: "2026-10-03T11:00:00.000Z" };
}

function fakeAdmin(result: { data: unknown[] | null; error: { message: string } | null }) {
  const calls: unknown[][] = [];
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const name of ["select", "is", "eq", "gte", "lte", "order", "limit"]) {
    query[name] = (...args) => {
      calls.push([name, ...args]);
      return name === "limit" ? Promise.resolve(result) : query;
    };
  }
  const from = vi.fn(() => query);
  return { calls, from, admin: { from } as unknown as SupabaseClient<Database> };
}

beforeEach(() => {
  vi.mocked(tagSocialPostTopic).mockReset();
});

describe("runSocialTopicBatch", () => {
  it("selects recent untagged top-level active posts, newest first", async () => {
    const db = fakeAdmin({ data: [], error: null });

    await runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 1000 });

    expect(db.from).toHaveBeenCalledWith("posts");
    expect(db.calls).toEqual([
      ["select", "id, author_id, body, media, created_at"],
      ["is", "category", null],
      ["is", "category_tagged_at", null],
      ["is", "group_id", null],
      ["eq", "status", "active"],
      ["gte", "created_at", "2026-09-26T12:00:00.000Z"],
      ["lte", "created_at", "2026-10-03T11:58:00.000Z"],
      ["order", "created_at", { ascending: false }],
      ["limit", 40],
    ]);
  });

  it("tags each post and counts every outcome, continuing past a failure", async () => {
    const db = fakeAdmin({ data: ["a", "b", "c", "d", "e"].map(post), error: null });
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

    expect(summary).toEqual({ selected: 5, tagged: 1, declined: 1, wait: 1, raced: 1, error: 1, deferred: 0 });
    expect(vi.mocked(tagSocialPostTopic).mock.calls.map(([args]) => args.post.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(vi.mocked(tagSocialPostTopic).mock.calls[0]?.[0]).toMatchObject({ client: CLIENT, now: NOW });
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('"postId":"b"'));
    errorLog.mockRestore();
  });

  it("defers the rest once the time budget is spent", async () => {
    const db = fakeAdmin({ data: ["a", "b", "c"].map(post), error: null });
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
  });

  it("throws when the select fails", async () => {
    const db = fakeAdmin({ data: null, error: { message: "permission denied" } });
    await expect(
      runSocialTopicBatch({ admin: db.admin, client: CLIENT, now: NOW, batchSize: 40, budgetMs: 1000 }),
    ).rejects.toThrow("Topic select failed: permission denied");
    expect(tagSocialPostTopic).not.toHaveBeenCalled();
  });
});
