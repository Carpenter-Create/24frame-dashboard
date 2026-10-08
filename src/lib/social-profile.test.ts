import { describe, expect, it, vi } from "vitest";

import { profileInsertRow, SOCIAL, suggestedHandleSeed } from "@/lib/social";
import {
  SOCIAL_PROFILE_COLUMNS,
  ensureOwnSocialProfile,
  ensureOwnSocialProfileResult,
  nextHandleCandidate,
} from "./social-profile";

function profileRow(handle = "ada") {
  return {
    id: "u1",
    handle,
    display_name: "Ada Lovelace",
    status: "active",
    bio: null,
  };
}

function stubClient({
  existing = null,
  insertErrors = [],
}: {
  existing?: ReturnType<typeof profileRow> | null;
  insertErrors?: Array<{ message: string; code?: string } | null>;
} = {}) {
  const inserts: unknown[] = [];
  let insertIndex = 0;
  let seenAfterInsert = false;
  const from = vi.fn((table: string) => {
    expect(table).toBe("profiles");
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (existing) return { data: existing, error: null };
        if (seenAfterInsert) return { data: null, error: null };
        seenAfterInsert = inserts.length > 0;
        return { data: null, error: null };
      }),
      insert: vi.fn(async (row: unknown) => {
        inserts.push(row);
        const error = insertErrors[insertIndex] ?? null;
        insertIndex += 1;
        return { data: null, error };
      }),
    };
    return chain;
  });
  return { from, inserts, client: { from } as never };
}

describe("ensureOwnSocialProfile", () => {
  it("loads welcome video and crafts with the shared profile columns", () => {
    expect(SOCIAL_PROFILE_COLUMNS).toBe(
      "id, handle, display_name, status, bio, welcome_video_key, welcome_mux_asset_id, welcome_mux_playback_id, welcome_mux_upload_id, cover_key, crafts, topics, imdb_url, website_url",
    );
  });

  it("returns the existing self row and does not insert", async () => {
    const existing = profileRow();
    const { client, inserts, from } = stubClient({ existing });
    const row = await ensureOwnSocialProfile(client, {
      id: "u1",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
    expect(row).toEqual(existing);
    expect(inserts).toEqual([]);
    expect(from).toHaveBeenCalledWith("profiles");
  });

  it("inserts a self row with a unique bare handle and no invented birth date", async () => {
    const { client, inserts } = stubClient();
    const row = await ensureOwnSocialProfile(client, {
      id: "u1",
      email: "Ada.Carp@example.com",
      name: "Ada Carpenter",
    });
    expect(row).toMatchObject({
      id: "u1",
      handle: "adacarp",
      display_name: "Ada Carpenter",
      status: "active",
    });
    expect(inserts).toEqual([
      profileInsertRow({
        userId: "u1",
        handle: "adacarp",
        displayName: "Ada Carpenter",
      }),
    ]);
    expect(inserts[0]).not.toHaveProperty("birth_date");
    expect(inserts[0]).not.toHaveProperty("org_id");
  });

  it("never derives a display name from the email local-part", async () => {
    const { client, inserts } = stubClient();
    const row = await ensureOwnSocialProfile(client, {
      id: "u1",
      email: "acarpcreate@example.com",
      name: null,
    });
    expect(row?.display_name).toBe("");
    expect(row?.display_name).not.toBe(SOCIAL.profile.defaultDisplayName);
    expect(inserts[0]).toMatchObject({
      handle: "acarpcreate",
      display_name: "",
    });
    expect(inserts[0]).not.toMatchObject({ display_name: "Member" });
  });

  it("retries a collided handle and still only inserts for the session user", async () => {
    const { client, inserts } = stubClient({
      insertErrors: [{ message: "duplicate key", code: "23505" }, null],
    });
    const userId = "11111111-1111-4111-8111-111111111111";
    const row = await ensureOwnSocialProfile(client, {
      id: userId,
      email: "ada@example.com",
      name: "Ada",
    });
    expect(row?.id).toBe(userId);
    expect(row?.handle).toBe(nextHandleCandidate(suggestedHandleSeed("ada@example.com", userId), userId, 0));
    expect(inserts).toHaveLength(2);
    expect(inserts.every((item) => (item as { id: string }).id === userId)).toBe(true);
  });

  it("retries a non-unique insert once and then surfaces the error", async () => {
    const { client, inserts } = stubClient({
      insertErrors: [
        { message: "null value in column birth_date", code: "23502" },
        { message: "null value in column birth_date", code: "23502" },
      ],
    });
    const result = await ensureOwnSocialProfileResult(client, {
      id: "u1",
      email: "ada@example.com",
      name: "Ada",
    });
    expect(result.profile).toBeNull();
    expect(result.error).toBe("null value in column birth_date");
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).not.toHaveProperty("birth_date");
    expect(inserts[1]).not.toHaveProperty("birth_date");
    const silent = stubClient({
      insertErrors: [
        { message: "null value in column birth_date", code: "23502" },
        { message: "null value in column birth_date", code: "23502" },
      ],
    });
    expect(
      await ensureOwnSocialProfile(silent.client, {
        id: "u1",
        email: "ada@example.com",
        name: "Ada",
      }),
    ).toBeNull();
  });

  it("recovers when the non-unique retry succeeds without inventing a birth date", async () => {
    const { client, inserts } = stubClient({
      insertErrors: [{ message: "null value in column birth_date", code: "23502" }, null],
    });
    const result = await ensureOwnSocialProfileResult(client, {
      id: "u1",
      email: "ada@example.com",
      name: "Ada",
    });
    expect(result.profile).toMatchObject({ id: "u1", handle: "ada" });
    expect(result.error).toBeNull();
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).not.toHaveProperty("birth_date");
  });
});
