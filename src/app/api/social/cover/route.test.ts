import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-social-media", () => ({ readSocialMediaObject: vi.fn() }));

import { readSocialMediaObject } from "@/lib/s3-social-media";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

import { GET } from "./route";

const UID = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const KEY = `posts/${UID}/${OBJECT}.jpg`;

function profileClient(coverKey: string | null) {
  return {
    from(table: string) {
      if (table !== "profiles") throw new Error(table);
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: { cover_key: coverKey }, error: null }),
              };
            },
          };
        },
      };
    },
  };
}

function recordingClient(row: Record<string, string | null>) {
  const selects: string[] = [];
  const eqs: Array<[string, unknown]> = [];
  const client = {
    from(table: string) {
      if (table !== "profiles") throw new Error(table);
      return {
        select(columns: string) {
          selects.push(columns);
          return {
            eq(column: string, value: unknown) {
              eqs.push([column, value]);
              return {
                maybeSingle: async () => {
                  const data: Record<string, string | null> = {};
                  for (const column of columns.split(",").map((c) => c.trim())) data[column] = row[column] ?? null;
                  return { data, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, selects, eqs };
}

describe("GET /api/social/cover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is 401 without a session and does not read the object", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await GET(new Request("http://local/api/social/cover"));
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(createClient).not.toHaveBeenCalled();
    expect(readSocialMediaObject).not.toHaveBeenCalled();
  });

  it("is 404 when the owner has no cover", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(createClient).mockResolvedValue(profileClient(null) as never);
    const res = await GET(new Request("http://local/api/social/cover"));
    expect(res.status).toBe(404);
    expect(readSocialMediaObject).not.toHaveBeenCalled();
  });

  it("is 400 for a cover key the caller does not own", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(createClient).mockResolvedValue(profileClient(`posts/${OTHER}/${OBJECT}.jpg`) as never);
    const res = await GET(new Request("http://local/api/social/cover"));
    expect(res.status).toBe(400);
    expect(readSocialMediaObject).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied key and reads only the owner cover", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const res = await GET(new Request(`http://local/api/social/cover?key=${encodeURIComponent(`posts/${OTHER}/${OBJECT}.jpg`)}`));
    expect(res.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
    expect(readSocialMediaObject).not.toHaveBeenCalled();
  });

  it("streams the owner's cover bytes with no redirect", async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    vi.mocked(createClient).mockResolvedValue(profileClient(KEY) as never);
    vi.mocked(readSocialMediaObject).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/jpeg",
    });
    const res = await GET(new Request("http://local/api/social/cover"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Location")).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(readSocialMediaObject).toHaveBeenCalledWith(KEY);
    const src = readFileSync("src/app/api/social/cover/route.ts", "utf8");
    expect(src).toContain("readSocialMediaObject");
    expect(src).not.toContain("redirect");
    expect(src).not.toContain("signedSocialMediaUrl");
    expect(src).toContain('select("cover_key")');
  });

  it("?source=1 streams only the owner's kept original, read from the owner's own row", async () => {
    const source = `posts/${UID}/44444444-4444-4444-8444-444444444444.png`;
    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const { client, selects, eqs } = recordingClient({ cover_key: KEY, cover_source_key: source });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(readSocialMediaObject).mockResolvedValue({
      bytes: new Uint8Array([9, 8, 7]),
      contentType: "image/png",
    });
    const res = await GET(new Request("http://local/api/social/cover?source=1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Location")).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]));
    expect(selects).toEqual(["cover_source_key"]);
    expect(eqs).toEqual([["id", UID]]);
    expect(readSocialMediaObject).toHaveBeenCalledWith(source);
    expect(readSocialMediaObject).not.toHaveBeenCalledWith(KEY);

    // Without ?source=1 the same row streams the cropped cover.
    vi.mocked(readSocialMediaObject).mockClear();
    const plain = recordingClient({ cover_key: KEY, cover_source_key: source });
    vi.mocked(createClient).mockResolvedValue(plain.client as never);
    expect((await GET(new Request("http://local/api/social/cover"))).status).toBe(200);
    expect(plain.selects).toEqual(["cover_key"]);
    expect(readSocialMediaObject).toHaveBeenCalledWith(KEY);
  });

  it("?source=1 is owner-only: 401 without a session, 404 without an original, 400 for a foreign or client key", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    expect((await GET(new Request("http://local/api/social/cover?source=1"))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();

    vi.mocked(getAuthUser).mockResolvedValue({ id: UID, email: "ada@example.com" });
    const legacy = recordingClient({ cover_key: KEY, cover_source_key: null });
    vi.mocked(createClient).mockResolvedValue(legacy.client as never);
    expect((await GET(new Request("http://local/api/social/cover?source=1"))).status).toBe(404);

    const foreign = recordingClient({ cover_key: KEY, cover_source_key: `posts/${OTHER}/${OBJECT}.jpg` });
    vi.mocked(createClient).mockResolvedValue(foreign.client as never);
    expect((await GET(new Request("http://local/api/social/cover?source=1"))).status).toBe(400);

    vi.mocked(createClient).mockClear();
    const keyed = await GET(
      new Request(`http://local/api/social/cover?source=1&key=${encodeURIComponent(`posts/${OTHER}/${OBJECT}.jpg`)}`),
    );
    expect(keyed.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
    expect(readSocialMediaObject).not.toHaveBeenCalled();
  });

  it("is session-gated like other app routes and is not name-blocked", () => {
    const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
    const matcher = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).not.toContain("/api/social/cover");
    expect(matcher).not.toContain("/api/social/cover");
    expect(middleware).toContain("if (!user && !isPublic)");
  });
});
