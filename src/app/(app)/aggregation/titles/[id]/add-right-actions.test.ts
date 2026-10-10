import { beforeEach, describe, expect, it, vi } from "vitest";

// addRights: the title's Add right window's one write (a permanent grant).
// Local fakes, as title-details-actions.test.ts does: a chainable query
// builder recording every filter and range, .rpc(), and rights_grants
// answering a thenable { data, error }.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/s3-title-purge", () => ({ purgeDeletedTitleStorage: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/supabase/auth";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { TITLES_HREF, titleClientPath, titleOpsPath } from "@/lib/title-public-id";
import { addRights } from "./actions";

const ORG = "11111111-1111-4111-8111-111111111111";
const TITLE = "22222222-2222-4222-8222-222222222222";
const CATALOG = "24F-000123";

type Grant = {
  rights_type: string;
  territory_mode: string;
  territories: string[];
  exclusive: boolean;
  window_end?: string | null;
};

type Fake = {
  filters: unknown[][];
  rpc: { name: string; args: Record<string, unknown> }[];
};

function fake({
  title = { id: TITLE, org_id: ORG, catalog_id: CATALOG } as Record<string, unknown> | null,
  grants = [] as Grant[],
  grantsError = null as { message: string } | null,
  rpcError = null as { message: string } | null,
} = {}): Fake {
  const seen: Fake = { filters: [], rpc: [] };
  const client = {
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "range"]) {
        builder[method] = vi.fn((...args: unknown[]) => {
          seen.filters.push([table, method, ...args]);
          return builder;
        });
      }
      builder.maybeSingle = vi.fn(async () => (table === "titles" ? { data: title } : { data: null }));
      // A list read resolves when awaited.
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve(
          table === "rights_grants"
            ? grantsError
              ? { data: null, error: grantsError }
              : { data: grants, error: null }
            : { data: [], error: null },
        );
      return builder;
    }),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      seen.rpc.push({ name, args });
      return { data: rpcError ? null : ["grant-id"], error: rpcError };
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

const REQUEST = {
  titleId: TITLE,
  rightsType: "svod",
  mode: "include",
  countryCodes: ["IE", "GB"],
  exclusive: false,
};

beforeEach(() => {
  vi.mocked(getAuthUser).mockResolvedValue({ id: "user" } as never);
  vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  vi.mocked(revalidatePath).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("addRights (the title's Add right window)", () => {
  it("refuses a malformed request before reading anything", async () => {
    const seen = fake();
    for (const input of [
      null,
      { ...REQUEST, titleId: "not-a-uuid" },
      { ...REQUEST, rightsType: "netflix" },
      { ...REQUEST, mode: "everywhere" },
      { ...REQUEST, exclusive: null },
      { ...REQUEST, countryCodes: ["USA"] },
      { ...REQUEST, countryCodes: Array.from({ length: 250 }, () => "US") },
    ]) {
      expect(await addRights(input)).toEqual({ ok: false, face: null, error: "Could not save.", onTitle: false });
    }
    expect(seen.filters).toEqual([]);
    expect(seen.rpc).toEqual([]);
  });

  it("refuses signed-out callers and view-as before any read", async () => {
    const seen = fake();
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);
    expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authenticated." });
    vi.mocked(getOrgContext).mockResolvedValueOnce(null as never);
    expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authenticated." });
    vi.mocked(getOrgContext).mockResolvedValueOnce(
      ctx({ aggregationViewAs: { orgId: ORG }, isGcStaff: true }) as never,
    );
    expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authorized." });
    expect(seen.filters).toEqual([]);
    expect(seen.rpc).toEqual([]);
  });

  it("reads the title under row security, never a deleted one", async () => {
    const seen = fake({ title: null });
    expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authorized." });
    expect(seen.filters).toContainEqual(["titles", "is", "deleted_at", null]);
    expect(seen.rpc).toEqual([]);
  });

  it("lets only the title org's operators add", async () => {
    const seen = fake();
    for (const role of ["viewer", "legal"]) {
      vi.mocked(getOrgContext).mockResolvedValueOnce(
        ctx({ rows: [{ role, organizations: { id: ORG } }], activeRole: role }) as never,
      );
      expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authorized." });
    }
    vi.mocked(getOrgContext).mockResolvedValueOnce(
      ctx({ rows: [], activeOrg: { id: "another" }, activeRole: "account_owner" }) as never,
    );
    expect(await addRights(REQUEST)).toMatchObject({ ok: false, error: "Not authorized." });
    expect(seen.rpc).toEqual([]);
  });

  it("takes the org from the title row, one right, server time and no window", async () => {
    const seen = fake();
    const result = await addRights({
      ...REQUEST,
      orgId: "evil",
      windowStart: "2000-01-01",
      p_effective_from: "2000-01-01",
    });
    expect(result).toEqual({ ok: true });
    expect(seen.rpc).toHaveLength(1);
    const { name, args } = seen.rpc[0]!;
    expect(name).toBe("add_rights_grant");
    expect(args).toMatchObject({
      p_org_id: ORG,
      p_title_id: TITLE,
      p_rights_types: ["svod"],
      p_mode: "include",
      p_territories: ["GB", "IE"],
      p_exclusive: false,
    });
    expect(typeof args.p_effective_from).toBe("string");
    expect(args.p_effective_from).not.toBe("2000-01-01");
    expect(new Date(args.p_effective_from as string).toISOString()).toBe(args.p_effective_from);
    expect(args).not.toHaveProperty("p_window_start");
    expect(args).not.toHaveProperty("p_window_end");
  });

  it("checks the territory before any write: at least one country, and real ones", async () => {
    let seen = fake();
    expect(await addRights({ ...REQUEST, countryCodes: [] })).toEqual({
      ok: false,
      face: "territory",
      error: "Choose at least one country.",
      onTitle: false,
    });
    expect(seen.rpc).toEqual([]);

    seen = fake();
    const result = await addRights({ ...REQUEST, countryCodes: ["XX"] });
    expect(result).toEqual({ ok: false, face: "territory", error: "Could not save.", onTitle: false });
    expect(JSON.stringify(result)).not.toContain("XX");
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).toContain("Unknown territory code: XX");
    expect(seen.rpc).toEqual([]);
  });

  it("sends no countries with Worldwide", async () => {
    const seen = fake();
    expect(await addRights({ ...REQUEST, mode: "world", countryCodes: ["GB"] })).toEqual({ ok: true });
    expect(seen.rpc[0]!.args).toMatchObject({ p_mode: "world", p_territories: [] });
  });

  it("adds nothing when the same right and territory set is already active, either exclusivity", async () => {
    for (const exclusive of [false, true]) {
      const seen = fake({
        grants: [{ rights_type: "svod", territory_mode: "include", territories: ["IE", "GB"], exclusive }],
      });
      vi.mocked(revalidatePath).mockClear();
      const result = await addRights(REQUEST);
      expect(result).toEqual({
        ok: false,
        face: "index",
        error: `SVOD · ${exclusive ? "Exclusive" : "Non-exclusive"} · Ireland, United Kingdom is already on this title.`,
        onTitle: true,
      });
      expect(seen.rpc).toEqual([]);
      // Active grants of this right and mode on this title, whatever their
      // window: the window is weighed in lib, never filtered out here.
      expect(seen.filters).toEqual(
        expect.arrayContaining([
          ["rights_grants", "eq", "title_id", TITLE],
          ["rights_grants", "eq", "rights_type", "svod"],
          ["rights_grants", "eq", "territory_mode", "include"],
          ["rights_grants", "is", "effective_to", null],
        ]),
      );
      expect(seen.filters).toContainEqual([
        "rights_grants",
        "select",
        "rights_type, territory_mode, territories, exclusive, window_end",
      ]);
      expect(
        seen.filters.some(([table, , column]) => table === "rights_grants" && /^window_/.test(String(column))),
      ).toBe(false);
      expect(seen.filters.some(([table, method]) => table === "rights_grants" && method === "range")).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith(titleClientPath(CATALOG));
    }

    // A narrower or different set is a new grant.
    const seen = fake({
      grants: [{ rights_type: "svod", territory_mode: "include", territories: ["GB"], exclusive: false }],
    });
    expect(await addRights(REQUEST)).toEqual({ ok: true });
    expect(seen.rpc).toHaveLength(1);
  });

  // Codex on #806: a grant with no window never goes over one with a window
  // that has not ended (current or still to come); an ended one frees the scope.
  it("adds nothing over a same-scope grant whose window has not ended", async () => {
    const day = 24 * 60 * 60 * 1000;
    for (const window_end of [new Date(Date.now() + day).toISOString(), new Date(Date.now() + 400 * day).toISOString()]) {
      const seen = fake({
        grants: [{ rights_type: "svod", territory_mode: "include", territories: ["GB", "IE"], exclusive: true, window_end }],
      });
      expect(await addRights(REQUEST)).toEqual({
        ok: false,
        face: "index",
        error: "SVOD · Exclusive · Ireland, United Kingdom is already on this title.",
        onTitle: true,
      });
      expect(seen.rpc).toEqual([]);
    }
    const ended = fake({
      grants: [
        {
          rights_type: "svod",
          territory_mode: "include",
          territories: ["GB", "IE"],
          exclusive: true,
          window_end: new Date(Date.now() - day).toISOString(),
        },
      ],
    });
    expect(await addRights(REQUEST)).toEqual({ ok: true });
    expect(ended.rpc).toHaveLength(1);
  });

  it("fails closed when the grants on the title cannot be read", async () => {
    const seen = fake({ grantsError: { message: "permission denied for table rights_grants" } });
    const result = await addRights(REQUEST);
    expect(result).toEqual({ ok: false, face: null, error: "Could not save.", onTitle: false });
    expect(JSON.stringify(result)).not.toContain("permission denied");
    expect(seen.rpc).toEqual([]);
  });

  it("never sends database text to the browser", async () => {
    for (const [message, line] of [
      ["Not authenticated", "Not authenticated."],
      ["Not authorized to set rights for this organization", "Not authorized."],
      ["Title does not belong to this organization", "Not authorized."],
      ['new row violates check constraint "rights_grants_check"', "Could not save."],
    ] as const) {
      fake({ rpcError: { message } });
      vi.mocked(console.error).mockClear();
      const result = await addRights(REQUEST);
      expect(result).toEqual({ ok: false, face: null, error: line, onTitle: false });
      // The line is the approved one, never the database's own words.
      if (message !== "Not authenticated") expect(JSON.stringify(result)).not.toContain(message);
      expect(vi.mocked(console.error).mock.calls.flat()).toContain(message);
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates the catalog path, the titles layout and the staff title page", async () => {
    fake();
    expect(await addRights(REQUEST)).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith(titleClientPath(CATALOG));
    expect(revalidatePath).toHaveBeenCalledWith(TITLES_HREF, "layout");
    expect(revalidatePath).toHaveBeenCalledWith(titleOpsPath(TITLE));
    expect(revalidatePath).not.toHaveBeenCalledWith(`${TITLES_HREF}/${TITLE}`);
  });
});
