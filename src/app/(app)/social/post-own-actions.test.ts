import { readFileSync } from "node:fs";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SOCIAL } from "@/lib/social";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteSocialPost, updateSocialPostCaption } from "./light-actions";

const POST_ID = "33333333-3333-4333-8333-333333333333";
const RLS_TEXT = 'new row violates row-level security policy for table "posts"';

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/social-hot-cache", () => ({
  bustSocialFeedHotCache: vi.fn(async () => {}),
  bustSocialFollowHotCache: vi.fn(async () => {}),
  withSocialHotCache: vi.fn(async (_key: string, load: () => Promise<unknown>) => load()),
  socialHotSet: vi.fn(async () => {}),
  socialHotGet: vi.fn(async () => null),
  socialHotDel: vi.fn(async () => {}),
}));

const profile = {
  id: "u1",
  handle: "ada",
  display_name: "Ada",
  status: "active",
  bio: null,
};

function mockClient(post: {
  id: string;
  author_id: string;
  body: string | null;
  media: unknown;
  status: string;
} | null, saved: { id: string } | null = { id: POST_ID }, updateError: { code: string; message: string } | null = null) {
  const updates: { table: string; row: unknown }[] = [];
  const reads: string[] = [];
  const from = vi.fn((table: string) => {
    reads.push(table);
    let writing = false;
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.update = vi.fn((row: unknown) => {
      updates.push({ table, row });
      writing = true;
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => {
      if (table === "profiles") return { data: profile, error: null };
      if (writing) return updateError ? { data: null, error: updateError } : { data: saved, error: null };
      return { data: post, error: null };
    });
    return chain;
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { updates, reads };
}

describe("own-post server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue({ id: "u1", email: "ada@example.com" });
  });

  it("saves the author caption and does not send media", async () => {
    const { updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [{ kind: "image", key: "posts/u1/a.jpg" }],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "  revised  ");
    expect(await updateSocialPostCaption(form)).toEqual({});
    expect(updates).toEqual([
      {
        table: "posts",
        row: { body: "revised" },
      },
    ]);
    expect(updates[0]?.row).not.toHaveProperty("edited_at");
    expect(updates[0]?.row).not.toHaveProperty("media");
    expect(updates[0]?.row).not.toHaveProperty("status");
  });

  it("refuses a non-author before any update", async () => {
    const { updates } = mockClient({
      id: POST_ID,
      author_id: "u2",
      body: "hello",
      media: [],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "stolen");
    expect(await updateSocialPostCaption(form)).toEqual({ error: SOCIAL.post.notAuthor });
    expect(await deleteSocialPost(form)).toEqual({ error: SOCIAL.post.notAuthor });
    expect(updates).toEqual([]);
  });

  it("soft-deletes the author post as removed and does not hard-delete", async () => {
    const { updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    expect(await deleteSocialPost(form)).toEqual({});
    expect(updates).toEqual([{ table: "posts", row: { status: "removed" } }]);
    const src = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    const remove = src.slice(src.indexOf("export async function deleteSocialPost"));
    expect(remove).toContain('from("posts")');
    expect(remove).not.toContain(".delete(");
    expect(remove).not.toContain('from("stories")');
  });

  it("refuses an empty caption when the post has no media", async () => {
    const { updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "   ");
    expect(await updateSocialPostCaption(form)).toEqual({ error: SOCIAL.home.emptyPost });
    expect(updates).toEqual([]);
  });

  // The request is checked before anything else: before ownProfile (which
  // can insert a profile row) and before any read
  // (social-post-caption-window-lock-v1 §6).
  it("refuses a malformed post id before any read or profile insert", async () => {
    const { reads, updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [],
      status: "active",
    });
    for (const bad of ["p1", "", "../posts", `${POST_ID}x`]) {
      const form = new FormData();
      form.set("post_id", bad);
      form.set("body", "revised");
      expect(await updateSocialPostCaption(form)).toEqual({ error: SOCIAL.post.missing });
    }
    const missing = new FormData();
    missing.set("body", "revised");
    expect(await updateSocialPostCaption(missing)).toEqual({ error: SOCIAL.post.missing });
    expect(reads).toEqual([]);
    expect(updates).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
    // Delete takes the same check.
    const bad = new FormData();
    bad.set("post_id", "p1");
    expect(await deleteSocialPost(bad)).toEqual({ error: SOCIAL.post.missing });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("refuses an over-cap body before any read or write", async () => {
    const { reads, updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "x".repeat(4001));
    expect(await updateSocialPostCaption(form)).toEqual({ error: SOCIAL.post.editTooLong });
    expect(reads).toEqual([]);
    expect(updates).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("never sends database text to the browser; it is logged on the server", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockClient(
      { id: POST_ID, author_id: "u1", body: "hello", media: [], status: "active" },
      null,
      { code: "42501", message: RLS_TEXT },
    );
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "revised");
    const caption = await updateSocialPostCaption(form);
    expect(caption).toEqual({ error: SOCIAL.post.editFailed });
    expect(JSON.stringify(caption)).not.toContain("row-level security");
    expect(logged).toHaveBeenCalledWith("[social-post-own] caption update failed", "42501", RLS_TEXT);

    const remove = await deleteSocialPost(form);
    expect(remove).toEqual({ error: SOCIAL.post.deleteFailed });
    expect(JSON.stringify(remove)).not.toContain("row-level security");
    expect(logged).toHaveBeenCalledWith("[social-post-own] post remove failed", "42501", RLS_TEXT);
    logged.mockRestore();
  });

  it("saves with an invalid group slug and revalidates only valid pages", async () => {
    const { updates } = mockClient({
      id: POST_ID,
      author_id: "u1",
      body: "hello",
      media: [],
      status: "active",
    });
    const form = new FormData();
    form.set("post_id", POST_ID);
    form.set("body", "revised");
    form.set("group_slug", "../../admin?x=1");
    expect(await updateSocialPostCaption(form)).toEqual({});
    expect(updates).toEqual([{ table: "posts", row: { body: "revised" } }]);
    const paths = vi.mocked(revalidatePath).mock.calls.map((call) => String(call[0]));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.some((path) => path.includes("admin"))).toBe(false);
    expect(paths.some((path) => path.includes("/groups/"))).toBe(false);

    vi.mocked(revalidatePath).mockClear();
    form.set("group_slug", "film-club");
    form.set("body", "revised again");
    expect(await updateSocialPostCaption(form)).toEqual({});
    expect(vi.mocked(revalidatePath).mock.calls.map((call) => String(call[0]))).toContain(
      "/social/groups/film-club",
    );
  });
});
