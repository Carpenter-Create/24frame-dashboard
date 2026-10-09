import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import DeliverHandOverPage from "./page";

const pageSrc = readFileSync(
  "src/app/(app)/(operator)/staff/gc/deliveries/deliver/page.tsx",
  "utf8",
);

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

function visit(titles?: string) {
  return DeliverHandOverPage({ searchParams: Promise.resolve(titles === undefined ? {} : { titles }) });
}

function stub(answer: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => answer);
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return rpc;
}

describe("the old Deliver route hands over to the window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue({ id: "staff-1", email: "ops@test.example" });
  });

  it("sends operate staff to ?deliver=<ids> on Licensing Status", async () => {
    const rpc = stub({ data: true, error: null });
    await expect(visit(`${A},${B},junk`)).rejects.toThrow(`REDIRECT:/staff/gc/deliveries?deliver=${A},${B}`);
    expect(rpc).toHaveBeenCalledWith("gc_can", { p_uid: "staff-1", p_capability: "operate" });
  });

  for (const [name, answer] of [
    ["false", { data: false, error: null }],
    ["an error", { data: true, error: { message: "boom" } }],
  ] as const) {
    it(`sends everyone else to the list when gc_can answers ${name}`, async () => {
      stub(answer);
      await expect(visit(`${A}`)).rejects.toThrow(/^REDIRECT:\/staff\/gc\/deliveries$/);
    });
  }

  it("sends a signed-out visitor to the list", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const rpc = stub({ data: true, error: null });
    await expect(visit(`${A}`)).rejects.toThrow(/^REDIRECT:\/staff\/gc\/deliveries$/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks nothing when there are no ids", async () => {
    await expect(visit()).rejects.toThrow(/^REDIRECT:\/staff\/gc\/deliveries$/);
    await expect(visit("junk")).rejects.toThrow(/^REDIRECT:\/staff\/gc\/deliveries$/);
    expect(createClient).not.toHaveBeenCalled();
    expect(getAuthUser).not.toHaveBeenCalled();
  });

  it("draws nothing and reads nothing beyond the gate", () => {
    expect(pageSrc).not.toContain("fixed inset-0");
    expect(pageSrc).not.toContain("bg-surface-muted");
    expect(pageSrc).not.toContain("DeliverStepper");
    expect(pageSrc).not.toContain("createDeliveries");
    expect(pageSrc).not.toContain(".from(");
    expect(pageSrc).not.toContain("NewDeliveryForm");
    expect(pageSrc).not.toContain("Option A");
  });
});
