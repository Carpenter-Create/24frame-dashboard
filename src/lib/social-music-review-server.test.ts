import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadMusicReviewQueue } from "@/lib/social-music-review-server";

const USER = "11111111-1111-4111-8111-111111111111";

function staffClient(isStaff: boolean) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: isStaff ? { user_id: USER } : null, error: null })),
  };
  return { from: vi.fn(() => query) };
}

function reviewQuery(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async () => result),
  };
  return query;
}

describe("loadMusicReviewQueue", () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockReset();
    vi.mocked(createClient).mockReset();
    vi.mocked(createAdminClient).mockReset();
  });

  it("refuses a caller who is not staff before reading scans", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: USER } as never);
    vi.mocked(createClient).mockResolvedValue(staffClient(false) as never);
    await expect(loadMusicReviewQueue()).rejects.toThrow(/staff/);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("leaves a superseded scan off the unfinished list", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: USER } as never);
    vi.mocked(createClient).mockResolvedValue(staffClient(true) as never);
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() =>
        reviewQuery({
          data: [
            {
              id: "scan-old",
              surface: "welcome",
              author_id: USER,
              status: "pending",
              last_error: "superseded",
              vendor_title: null,
              vendor_artist: null,
              vendor_score: null,
              asset_id: "asset12345678",
              created_at: "2026-10-08T00:00:00.000Z",
            },
          ],
          error: null,
        }),
      ),
    } as never);
    await expect(loadMusicReviewQueue()).resolves.toEqual([]);
  });

  it("surfaces a database error instead of an empty queue", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: USER } as never);
    vi.mocked(createClient).mockResolvedValue(staffClient(true) as never);
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => reviewQuery({ data: null, error: { message: "permission denied" } })),
    } as never);
    await expect(loadMusicReviewQueue()).rejects.toThrow(/could not be loaded/);
  });
});
