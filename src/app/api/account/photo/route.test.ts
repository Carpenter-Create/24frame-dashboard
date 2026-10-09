import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { avatar_key: null }, error: null }),
        }),
      }),
    }),
  })),
}));
vi.mock("@/lib/s3-avatars", () => ({ signedAvatarUrl: vi.fn() }));

import { getAuthUser } from "@/lib/supabase/auth";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { ACCOUNT_PHOTO_HREF } from "@/lib/account-avatar";
import { GET } from "./route";

const UID = "11111111-1111-4111-8111-111111111111";

describe("GET /api/account/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is 401 without a session and does not sign", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).not.toHaveBeenCalled();
  });

  it("is 404 when the session face is empty", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedAvatarUrl).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).toHaveBeenCalledWith(UID, null);
  });

  it("302s to a freshly signed GET for the session user, never org_id", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(signedAvatarUrl).mockResolvedValue("https://s3.example/signed-avatar");
    const res = await GET();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://s3.example/signed-avatar");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(signedAvatarUrl).toHaveBeenCalledWith(UID, null);
    expect(signedAvatarUrl).toHaveBeenCalledTimes(1);

    const src = readFileSync("src/app/api/account/photo/route.ts", "utf8");
    expect(src).toContain("signedAvatarUrl(user.id, data?.avatar_key)");
    expect(src).not.toContain("activeOrg");
    expect(src).not.toContain("org_id");
    expect(src).not.toContain("putAvatarObject");
    expect(src).not.toContain("S3_BUCKET");
    expect(ACCOUNT_PHOTO_HREF).toBe("/api/account/photo");
  });
});
