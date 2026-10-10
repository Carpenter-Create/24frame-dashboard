import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Deliver's two staff actions. Local fakes: a chainable query builder and .rpc().
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { DELIVER_RPC_MESSAGES } from "@/lib/deliver-stepper";
import { GC_DELIVERIES_HREF } from "@/lib/gc-deliveries";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { deliverTitles, loadDeliverChoices } from "./deliver-actions";

const VENDOR = "33333333-3333-4333-8333-333333333333";
const USER = "44444444-4444-4444-8444-444444444444";

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function grantId(n: number): string {
  return `11111111-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function item(n: number, territory = "US") {
  return { titleId: id(n), grantId: grantId(n), territory };
}

type Read = { table: string; method: string; args: unknown[] };
type Seen = { reads: Read[]; rpc: { name: string; args: Record<string, unknown> }[] };
type Answer = { data?: unknown; error?: { code?: string; message: string } | null };
type Rows = Record<string, unknown>[];

function fake({
  gcCan = { data: true, error: null } as Answer,
  create = (() => ({ data: "d-new", error: null })) as (args: Record<string, unknown>) => Answer,
  titles = [] as Rows,
  grants = [] as Rows | ((chunk: string[]) => Rows),
  deliveries = [] as Rows,
  errors = {} as Partial<Record<"titles" | "rights_grants" | "deliveries", { code: string; message: string }>>,
} = {}): Seen {
  const seen: Seen = { reads: [], rpc: [] };
  const client = {
    from: vi.fn((table: "titles" | "rights_grants" | "deliveries") => {
      let chunk: string[] = [];
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "in", "order", "range"]) {
        builder[method] = vi.fn((...args: unknown[]) => {
          seen.reads.push({ table, method, args });
          if (method === "in") chunk = args[1] as string[];
          return builder;
        });
      }
      builder.then = (resolve: (value: unknown) => unknown) => {
        const error = errors[table];
        if (error) return resolve({ data: null, error });
        if (table === "titles") return resolve({ data: titles.filter((row) => chunk.includes(row.id as string)), error: null });
        if (table === "rights_grants") {
          const rows = typeof grants === "function" ? grants(chunk) : grants.filter((row) => chunk.includes(row.title_id as string));
          return resolve({ data: rows, error: null });
        }
        return resolve({ data: deliveries, error: null });
      };
      return builder;
    }),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      seen.rpc.push({ name, args });
      if (name === "gc_can") return { data: gcCan.data ?? null, error: gcCan.error ?? null };
      if (name === "create_delivery") {
        const answer = create(args);
        return { data: answer.data ?? null, error: answer.error ?? null };
      }
      return { data: null, error: null };
    }),
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return seen;
}

function staff(overrides: Record<string, unknown> = {}) {
  return { user: { id: USER }, rows: [], isGcStaff: true, aggregationViewAs: null, ...overrides };
}

const creates = (seen: Seen) => seen.rpc.filter((call) => call.name === "create_delivery");
const NONE = { created: [], existing: [], failed: [] };

beforeEach(() => {
  vi.mocked(getOrgContext).mockResolvedValue(staff() as never);
  vi.mocked(revalidatePath).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** The LAST `create or replace function public.create_delivery` across every
 *  migration (sorted), from its header to the end of its body. */
function lastCreateDeliveryBody(dir = "supabase/migrations"): string {
  const header = /create\s+or\s+replace\s+function\s+public\.create_delivery\s*\(/gi;
  let last = "";
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    for (const match of sql.matchAll(header)) {
      const rest = sql.slice(match.index);
      const open = rest.indexOf("$function$") >= 0 ? "$function$" : "$$";
      const start = rest.indexOf(open);
      const end = rest.indexOf(open, start + open.length);
      last = rest.slice(0, end + open.length);
    }
  }
  return last;
}

describe("create_delivery's RAISE texts are pinned to its last definition", () => {
  it("matches every prefix the failure mapping reads", () => {
    const body = lastCreateDeliveryBody();
    expect(body.length).toBeGreaterThan(0);
    for (const [prefix] of DELIVER_RPC_MESSAGES) {
      expect(body, prefix).toContain(`raise exception '${prefix}`);
    }
    // The browser never names an org: the insert takes it from the title row.
    expect(body).toContain("select org_id, work_id, status into v_org, v_work, v_status");
    expect(body).toContain("values (v_org, p_title_id, p_vendor_id, p_grant_id, v_terr, auth.uid())");
  });
});

describe("Deliver actions: the gate first, then the input", () => {
  const malformedDeliver: [string, unknown][] = [
    ["a non-uuid title", { vendorId: VENDOR, items: [{ ...item(1), titleId: "nope" }] }],
    ["a non-uuid vendor", { vendorId: "nope", items: [item(1)] }],
    ["a lowercase territory", { vendorId: VENDOR, items: [item(1, "us")] }],
    ["no items", { vendorId: VENDOR, items: [] }],
    ["26 items", { vendorId: VENDOR, items: Array.from({ length: 26 }, (_, i) => item(i + 1)) }],
    ["a title twice", { vendorId: VENDOR, items: [item(1), { ...item(1), grantId: grantId(2) }] }],
    ["not an object", "nope"],
  ];
  const malformedLoad: [string, unknown][] = [
    ["no ids", { titleIds: [] }],
    ["501 ids", { titleIds: Array.from({ length: 501 }, (_, i) => id(i + 1)) }],
    ["a non-uuid id", { titleIds: ["nope"] }],
  ];

  it("refuses a signed-out caller with malformed input before any rpc or read", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null);
    const seen = fake();
    expect(await deliverTitles("nope")).toEqual({ ...NONE, stop: "not_authenticated" });
    expect(await loadDeliverChoices({ titleIds: [] })).toEqual({ ok: false, reason: "not_authenticated" });
    expect(seen.rpc).toEqual([]);
    expect(seen.reads).toEqual([]);
  });

  const refusals: [string, () => void][] = [
    ["gc_can false", () => undefined],
    ["gc_can error", () => undefined],
    ["non-staff", () => vi.mocked(getOrgContext).mockResolvedValue(staff({ isGcStaff: false }) as never)],
    ["view-as", () => vi.mocked(getOrgContext).mockResolvedValue(staff({ aggregationViewAs: { orgId: id(9) } }) as never)],
  ];
  for (const [name, arrange] of refusals) {
    it(`refuses ${name} as not authorized, with gc_can the only rpc`, async () => {
      arrange();
      const gcCan: Answer =
        name === "gc_can false"
          ? { data: false, error: null }
          : name === "gc_can error"
            ? { data: null, error: { code: "XX000", message: "boom" } }
            : { data: true, error: null };
      const seen = fake({ gcCan });
      expect(await deliverTitles({ vendorId: VENDOR, items: [item(1)] })).toEqual({ ...NONE, stop: "not_authorized" });
      expect(await loadDeliverChoices({ titleIds: [id(1)] })).toEqual({ ok: false, reason: "not_authorized" });
      expect(seen.rpc.every((call) => call.name === "gc_can")).toBe(true);
      if (name === "non-staff" || name === "view-as") expect(seen.rpc).toEqual([]);
      else expect(seen.rpc).toEqual([
        { name: "gc_can", args: { p_uid: USER, p_capability: "operate" } },
        { name: "gc_can", args: { p_uid: USER, p_capability: "operate" } },
      ]);
      expect(seen.reads).toEqual([]);
    });
  }

  for (const [name, input] of malformedDeliver) {
    it(`refuses ${name} after the gate, with no create_delivery and no read`, async () => {
      const seen = fake();
      expect(await deliverTitles(input)).toEqual({ ...NONE, stop: "invalid" });
      expect(seen.rpc.map((call) => call.name)).toEqual(["gc_can"]);
      expect(seen.reads).toEqual([]);
    });
  }

  for (const [name, input] of malformedLoad) {
    it(`refuses a load with ${name} after the gate, with no read`, async () => {
      const seen = fake();
      expect(await loadDeliverChoices(input)).toEqual({ ok: false, reason: "invalid" });
      expect(seen.rpc.map((call) => call.name)).toEqual(["gc_can"]);
      expect(seen.reads).toEqual([]);
    });
  }
});

describe("deliverTitles", () => {
  it("calls create_delivery with exactly the four keys, never an org, and revalidates once created", async () => {
    let n = 0;
    const seen = fake({ create: () => ({ data: `d-${(n += 1)}` }) });
    const result = await deliverTitles({ vendorId: VENDOR, items: [item(1), item(2, "CA")], orgId: id(77) });
    expect(result).toEqual({
      created: [
        { titleId: id(1), deliveryId: "d-1" },
        { titleId: id(2), deliveryId: "d-2" },
      ],
      existing: [],
      failed: [],
      stop: null,
    });
    expect(creates(seen).map((call) => call.args)).toEqual([
      { p_title_id: id(1), p_vendor_id: VENDOR, p_grant_id: grantId(1), p_territory: "US" },
      { p_title_id: id(2), p_vendor_id: VENDOR, p_grant_id: grantId(2), p_territory: "CA" },
    ]);
    for (const call of creates(seen)) expect(Object.keys(call.args).sort()).toEqual(["p_grant_id", "p_territory", "p_title_id", "p_vendor_id"]);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith(GC_DELIVERIES_HREF);
  });

  it("pre-reads this channel's deliveries: an exact match is existing and never sent", async () => {
    const seen = fake({
      deliveries: [
        { id: "d-old", title_id: id(1), territory: "US", grant_id: grantId(1) },
        // Same title, another territory: not a match.
        { id: "d-other", title_id: id(2), territory: "GB", grant_id: grantId(2) },
      ],
    });
    const result = await deliverTitles({ vendorId: VENDOR, items: [item(1), item(2)] });
    expect(result.existing).toEqual([{ titleId: id(1), deliveryId: "d-old" }]);
    expect(result.created).toEqual([{ titleId: id(2), deliveryId: "d-new" }]);
    expect(creates(seen).map((call) => call.args.p_title_id)).toEqual([id(2)]);
    const pre = seen.reads.filter((read) => read.table === "deliveries");
    expect(pre).toContainEqual({ table: "deliveries", method: "eq", args: ["vendor_id", VENDOR] });
    expect(pre).toContainEqual({ table: "deliveries", method: "in", args: ["title_id", [id(1), id(2)]] });
    expect(pre).toContainEqual({ table: "deliveries", method: "range", args: [0, UNPAGINATED_MAX] });
  });

  it("falls back to the RPC when the pre-read fails, and reads the unique key as existing", async () => {
    const seen = fake({
      errors: { deliveries: { code: "XX000", message: "pre-read exploded" } },
      create: (args) =>
        args.p_title_id === id(1)
          ? { error: { code: "23505", message: 'duplicate key value violates unique constraint "deliveries_title_id_key"' } }
          : { data: "d-2" },
    });
    const result = await deliverTitles({ vendorId: VENDOR, items: [item(1), item(2)] });
    expect(creates(seen)).toHaveLength(2);
    expect(result.existing).toEqual([{ titleId: id(1), deliveryId: null }]);
    expect(result.created).toEqual([{ titleId: id(2), deliveryId: "d-2" }]);
    expect(JSON.stringify(result)).not.toMatch(/duplicate key|violates|exploded/);
  });

  it("names a grant or conflict failure per title and keeps going", async () => {
    const seen = fake({
      create: (args) =>
        args.p_title_id === id(1)
          ? { error: { code: "P0001", message: `No active grant on this title covers US (${grantId(1)})` } }
          : args.p_title_id === id(2)
            ? { error: { code: "P0001", message: "Blocked: another client holds a conflicting exclusive claim on this work for avod in US" } }
            : args.p_title_id === id(3)
              ? { error: { code: "P0001", message: 'Chain of title: "x" has not been approved for delivery (status: live)' } }
              : { data: "d-4" },
    });
    const result = await deliverTitles({ vendorId: VENDOR, items: [item(1), item(2), item(3), item(4)] });
    expect(result).toEqual({
      created: [{ titleId: id(4), deliveryId: "d-4" }],
      existing: [],
      failed: [
        { titleId: id(1), reason: "no_cover" },
        { titleId: id(2), reason: "conflict" },
        { titleId: id(3), reason: "not_ready" },
      ],
      stop: null,
    });
    expect(creates(seen)).toHaveLength(4);
    expect(JSON.stringify(result)).not.toMatch(/duplicate key|Chain of title|Blocked:|violates/);
  });

  for (const [message, reason] of [
    ["Not authorized", "not_authorized"],
    ["Vendor not found or inactive", "vendor_inactive"],
  ] as const) {
    it(`stops on "${message}": the rest are not sent`, async () => {
      const seen = fake({
        create: (args) => (args.p_title_id === id(2) ? { error: { code: "P0001", message } } : { data: "d-1" }),
      });
      const result = await deliverTitles({ vendorId: VENDOR, items: [item(1), item(2), item(3)] });
      expect(result).toEqual({
        created: [{ titleId: id(1), deliveryId: "d-1" }],
        existing: [],
        failed: [],
        stop: reason,
      });
      expect(creates(seen).map((call) => call.args.p_title_id)).toEqual([id(1), id(2)]);
    });
  }

  it("does not revalidate when nothing was created", async () => {
    fake({ create: () => ({ error: { code: "P0001", message: "No active grant on this title covers US" } }) });
    const result = await deliverTitles({ vendorId: VENDOR, items: [item(1)] });
    expect(result.failed).toEqual([{ titleId: id(1), reason: "no_cover" }]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("loadDeliverChoices", () => {
  it("reads titles and grants in chunks of 50, never a deleted title, only current grants", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => id(i + 1));
    const seen = fake({
      titles: ids.map((value, i) => ({ id: value, title: `Title ${i + 1}`, status: "in_delivery" })),
    });
    const result = await loadDeliverChoices({ titleIds: ids });
    expect(result.ok).toBe(true);
    const ins = (table: string) => seen.reads.filter((read) => read.table === table && read.method === "in");
    expect(ins("titles")).toHaveLength(3);
    expect(ins("rights_grants")).toHaveLength(3);
    for (const read of [...ins("titles"), ...ins("rights_grants")]) {
      expect((read.args[1] as string[]).length).toBeLessThanOrEqual(50);
    }
    expect(seen.reads).toContainEqual({ table: "titles", method: "is", args: ["deleted_at", null] });
    expect(seen.reads).toContainEqual({ table: "rights_grants", method: "is", args: ["effective_to", null] });
    expect(seen.reads).toContainEqual({ table: "rights_grants", method: "range", args: [0, UNPAGINATED_MAX] });
  });

  it("returns titles in selection order with the ids it did not find", async () => {
    fake({
      titles: [
        { id: id(1), title: "North Star", status: "in_delivery" },
        { id: id(3), title: "Harbor", status: "live" },
      ],
      grants: [{ id: grantId(1), title_id: id(1), rights_type: "avod", territory_mode: "world", territories: [] }],
    });
    const result = await loadDeliverChoices({ titleIds: [id(3), id(2), id(1)] });
    expect(result).toEqual({
      ok: true,
      titles: [
        { id: id(3), title: "Harbor", status: "live" },
        { id: id(1), title: "North Star", status: "in_delivery" },
      ],
      notFound: [id(2)],
      grants: [{ id: grantId(1), title_id: id(1), rights_type: "avod", territory_mode: "world", territories: [] }],
    });
  });

  for (const table of ["titles", "rights_grants"] as const) {
    it(`refuses as load_failed when a ${table} chunk fails, with no database text`, async () => {
      fake({ errors: { [table]: { code: "XX000", message: "relation exploded" } } });
      const result = await loadDeliverChoices({ titleIds: [id(1)] });
      expect(result).toEqual({ ok: false, reason: "load_failed" });
      expect(JSON.stringify(result)).not.toContain("exploded");
    });
  }

  it("refuses as load_too_many when a grant chunk passes its probe", async () => {
    fake({
      titles: [{ id: id(1), title: "North Star", status: "in_delivery" }],
      grants: () =>
        Array.from({ length: UNPAGINATED_MAX + 1 }, (_, i) => ({
          id: `g-${i}`,
          title_id: id(1),
          rights_type: "avod",
          territory_mode: "world",
          territories: [],
        })),
    });
    expect(await loadDeliverChoices({ titleIds: [id(1)] })).toEqual({ ok: false, reason: "load_too_many" });
  });
});
