import { beforeEach, describe, expect, it, vi } from "vitest";

// saveTitleDetails: the title's Metadata window's one save. Local fakes, as
// actions.test.ts does: a chainable query builder and .rpc().
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/s3-title-purge", () => ({ purgeDeletedTitleStorage: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase/auth";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { titleClientPath } from "@/lib/title-public-id";
import { saveTitleDetails, submitTitle } from "./actions";

const ORG = "11111111-1111-4111-8111-111111111111";
const TITLE = "22222222-2222-4222-8222-222222222222";
const CATALOG = "24F-000123";

const STORED = {
  synopsis: "A film.",
  runtime_minutes: 96,
  release_year: 2024,
  genre: "drama",
  primary_language: "en",
  country_of_origin: "US",
  director: "Jo",
};

type Fake = {
  filters: unknown[][];
  rpc: { name: string; args: Record<string, unknown> }[];
};

function fake({
  title = { id: TITLE, org_id: ORG, catalog_id: CATALOG, release_type: "new_release", original_release_date: null },
  stored = STORED as Record<string, unknown> | null,
  rpcErrors = {} as Record<string, { message: string }>,
  readError = null as { message: string } | null,
}: {
  title?: Record<string, unknown> | null;
  stored?: Record<string, unknown> | null;
  rpcErrors?: Record<string, { message: string }>;
  readError?: { message: string } | null;
} = {}): Fake {
  const seen: Fake = { filters: [], rpc: [] };
  const client = {
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is"]) {
        builder[method] = vi.fn((...args: unknown[]) => {
          seen.filters.push([table, method, ...args]);
          return builder;
        });
      }
      builder.maybeSingle = vi.fn(async () => {
        if (table === "titles") return { data: title };
        if (table === "title_metadata") return readError ? { data: null, error: readError } : { data: stored ? { data: stored } : null };
        return { data: null };
      });
      return builder;
    }),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      seen.rpc.push({ name, args });
      return { error: rpcErrors[name] ?? null };
    }),
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return seen;
}

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    rows: [{ role: "account_owner", organizations: { id: ORG } }],
    activeOrg: { id: ORG },
    activeRole: "account_owner",
    aggregationViewAs: null,
    isGcStaff: false,
    ...overrides,
  };
}

const NEW_RELEASE = { releaseType: "new_release", originalReleaseDate: null };

beforeEach(() => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: "user" } as never);
  vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  vi.mocked(revalidatePath).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("saveTitleDetails (the title's Metadata window)", () => {
  it("refuses a malformed request before reading anything", async () => {
    const seen = fake();
    for (const input of [
      null,
      { titleId: "not-a-uuid", metadata: {}, release: null },
      { titleId: TITLE, metadata: {}, release: { releaseType: "premiere", originalReleaseDate: null } },
      { titleId: TITLE, metadata: [], release: null },
    ]) {
      expect(await saveTitleDetails(input)).toMatchObject({ ok: false, part: "access", error: "Could not save." });
    }
    expect(seen.filters).toEqual([]);
    expect(seen.rpc).toEqual([]);
  });

  it("refuses signed-out callers and view-as, without a write", async () => {
    const seen = fake();
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      ok: false,
      error: "Not authenticated.",
    });
    vi.mocked(getOrgContext).mockResolvedValueOnce(
      ctx({ aggregationViewAs: { orgId: ORG }, isGcStaff: true }) as never,
    );
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      ok: false,
      error: "Not authorized.",
    });
    // Refused before the title is even read.
    expect(seen.filters).toEqual([]);
    expect(seen.rpc).toEqual([]);
  });

  it("reads the title under row security, never deleted, and takes its org from the row", async () => {
    const missing = fake({ title: null });
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      ok: false,
      error: "Not authorized.",
    });
    expect(missing.filters).toContainEqual(["titles", "is", "deleted_at", null]);
    expect(missing.rpc).toEqual([]);

    const seen = fake();
    await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null, orgId: "evil" });
    expect(seen.rpc[0]).toMatchObject({ name: "set_title_metadata", args: { p_org_id: ORG, p_title_id: TITLE } });
  });

  it("lets only the title org's operators write", async () => {
    const seen = fake();
    vi.mocked(getOrgContext).mockResolvedValueOnce(
      ctx({ rows: [{ role: "viewer", organizations: { id: ORG } }], activeRole: "viewer" }) as never,
    );
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      ok: false,
      error: "Not authorized.",
    });
    vi.mocked(getOrgContext).mockResolvedValueOnce(
      ctx({ rows: [], activeOrg: { id: "another" }, activeRole: "account_owner" }) as never,
    );
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      ok: false,
      error: "Not authorized.",
    });
    expect(seen.rpc).toEqual([]);
  });

  it("checks Release and the field names before anything is written", async () => {
    const seen = fake();
    expect(
      await saveTitleDetails({
        titleId: TITLE,
        metadata: { director: "X" },
        release: { releaseType: "re_release", originalReleaseDate: null },
      }),
    ).toEqual({
      ok: false,
      part: "release",
      field: "original_release_date",
      error: "Original release date is required for a re-release.",
      metadataSaved: false,
    });
    expect(
      await saveTitleDetails({ titleId: TITLE, metadata: { budget: 1 }, release: null }),
    ).toMatchObject({ ok: false, error: "Could not save." });
    expect(seen.rpc).toEqual([]);
  });

  it("merges only the changed fields onto the stored record", async () => {
    const seen = fake();
    expect(
      await saveTitleDetails({ titleId: TITLE, metadata: { runtime_minutes: 100, director: null }, release: null }),
    ).toEqual({ ok: true });
    const rest = Object.fromEntries(Object.entries(STORED).filter(([key]) => key !== "director"));
    expect(seen.rpc[0]).toEqual({
      name: "set_title_metadata",
      args: { p_org_id: ORG, p_title_id: TITLE, p_data: { ...rest, runtime_minutes: 100 } },
    });
    expect(seen.rpc[1].name).toBe("reconcile_title_findings");
    expect(seen.rpc).toHaveLength(2);
    expect(revalidatePath).toHaveBeenCalledWith(titleClientPath(CATALOG));
  });

  it("names the field a value breaks, with its approved line, and writes nothing", async () => {
    const seen = fake();
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { runtime_minutes: 0 }, release: null })).toEqual({
      ok: false,
      part: "metadata",
      field: "runtime_minutes",
      error: "Enter whole minutes, 1 to 1,000.",
      metadataSaved: false,
    });
    // A stored value from before the lists were checked is named too.
    const legacy = fake({ stored: { ...STORED, genre: "Drama" } });
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toMatchObject({
      field: "genre",
      error: "Choose one from the list.",
    });
    expect(seen.rpc).toEqual([]);
    expect(legacy.rpc).toEqual([]);
  });

  it("saves Release alone without touching metadata, and only when it differs", async () => {
    const same = fake();
    expect(await saveTitleDetails({ titleId: TITLE, metadata: {}, release: NEW_RELEASE })).toEqual({ ok: true });
    expect(same.rpc).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();

    const seen = fake();
    expect(
      await saveTitleDetails({
        titleId: TITLE,
        metadata: {},
        release: { releaseType: "re_release", originalReleaseDate: "2001-02-03" },
      }),
    ).toEqual({ ok: true });
    expect(seen.rpc).toEqual([
      {
        name: "set_title_release_info",
        args: {
          p_org_id: ORG,
          p_title_id: TITLE,
          p_release_type: "re_release",
          p_original_release_date: "2001-02-03",
        },
      },
    ]);
  });

  it("never lets database text reach the browser", async () => {
    const seen = fake({ rpcErrors: { set_title_metadata: { message: 'relation "x" violates policy p_secret' } } });
    const result = await saveTitleDetails({
      titleId: TITLE,
      metadata: { director: "X" },
      release: { releaseType: "re_release", originalReleaseDate: "2001-02-03" },
    });
    expect(result).toEqual({ ok: false, part: "metadata", field: null, error: "Could not save.", metadataSaved: false });
    expect(JSON.stringify(result)).not.toContain("p_secret");
    // Metadata failed: Release is not attempted.
    expect(seen.rpc.map((call) => call.name)).toEqual(["set_title_metadata"]);
  });

  it("reports metadata as saved when Release then fails", async () => {
    const seen = fake({ rpcErrors: { set_title_release_info: { message: "boom" } } });
    expect(
      await saveTitleDetails({
        titleId: TITLE,
        metadata: { director: "X" },
        release: { releaseType: "re_release", originalReleaseDate: "2001-02-03" },
      }),
    ).toEqual({ ok: false, part: "release", field: null, error: "Could not save.", metadataSaved: true });
    expect(seen.rpc.map((call) => call.name)).toEqual([
      "set_title_metadata",
      "reconcile_title_findings",
      "set_title_release_info",
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(titleClientPath(CATALOG));
  });

  it("never takes a failed read of the stored record for an empty one", async () => {
    const seen = fake({ readError: { message: "statement timeout" } });
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { director: "X" }, release: null })).toEqual({
      ok: false,
      part: "metadata",
      field: null,
      error: "Could not save.",
      metadataSaved: false,
    });
    // Nothing is written, so no field is dropped.
    expect(seen.rpc).toEqual([]);
  });

  it("reads the stored record as the window does, so stored empties never block a save", async () => {
    const seen = fake({
      stored: { ...STORED, synopsis: "", runtime_minutes: "96", cast: ["", "Ada"], director: null, keywords: [] },
    });
    expect(await saveTitleDetails({ titleId: TITLE, metadata: { rating: "PG" }, release: null })).toEqual({ ok: true });
    const { synopsis: _s, director: _d, ...rest } = STORED;
    void _s;
    void _d;
    expect(seen.rpc[0].args.p_data).toEqual({ ...rest, runtime_minutes: 96, cast: ["Ada"], rating: "PG" });
  });

});

describe("submitTitle (Codex on #801)", () => {
  it("submits only with every required field filled with an accepted value", async () => {
    const invalid = fake({ stored: { ...STORED, runtime_minutes: 0 } });
    expect(await submitTitle(ORG, TITLE)).toEqual({
      error: "Complete the 6 required metadata fields to submit this title for review.",
    });
    expect(invalid.rpc).toEqual([]);

    const missing = fake({ stored: { synopsis: "A film." } });
    expect((await submitTitle(ORG, TITLE)).error).toContain("required metadata fields");
    expect(missing.rpc).toEqual([]);

    const unread = fake({ readError: { message: "timeout" } });
    expect(await submitTitle(ORG, TITLE)).toEqual({ error: "Could not save." });
    expect(unread.rpc).toEqual([]);

    const ok = fake();
    expect(await submitTitle(ORG, TITLE)).toEqual({});
    expect(ok.rpc[0]).toEqual({ name: "submit_title", args: { p_org_id: ORG, p_title_id: TITLE } });
  });
});
