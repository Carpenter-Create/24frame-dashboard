import { beforeEach, describe, expect, it, vi } from "vitest";

const profileRead = vi.hoisted(() => ({
  current: {
    data: { avatar_key: null as string | null } as { avatar_key: string | null } | null,
    error: null as { message: string } | null,
  },
}));

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => profileRead.current,
        }),
      }),
    }),
  })),
}));
vi.mock("@/lib/s3-avatars", () => ({ signedAvatarUrl: vi.fn() }));

import { getAuthUser } from "@/lib/supabase/auth";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { GET } from "./route";

const UID = "11111111-1111-4111-8111-111111111111";

describe("GET /api/social/avatar/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileRead.current = { data: { avatar_key: null }, error: null };
  });

  it("is 401 without a session and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET(new Request("http://local/api/social/avatar/" + UID), {
      params: Promise.resolve({ userId: UID }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).not.toHaveBeenCalled();
  });

  it("is 400 for a non-uuid and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const res = await GET(new Request("http://local/api/social/avatar/nope"), {
      params: Promise.resolve({ userId: "nope" }),
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).not.toHaveBeenCalled();
  });

  it("302s a freshly signed GET for an authenticated reader", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedAvatarUrl).mockResolvedValue("https://s3.example/signed-avatar");
    const res = await GET(new Request("http://local/api/social/avatar/" + UID), {
      params: Promise.resolve({ userId: UID }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://s3.example/signed-avatar");
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(signedAvatarUrl).toHaveBeenCalledWith(UID, null);
  });

  it("is 404 when the profile row is not visible and does not sign the canonical object", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    profileRead.current = { data: null, error: null };
    const res = await GET(new Request("http://local/api/social/avatar/" + UID), {
      params: Promise.resolve({ userId: UID }),
    });
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).not.toHaveBeenCalled();
  });

  it("is 404 when the profile pointer cannot be read and does not sign the original", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    profileRead.current = { data: { avatar_key: null }, error: { message: "permission denied" } };
    const res = await GET(new Request("http://local/api/social/avatar/" + UID), {
      params: Promise.resolve({ userId: UID }),
    });
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).not.toHaveBeenCalled();
  });
});
