import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  staffRow: null as { user_id: string } | null,
  queries: [] as string[],
}));

vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: async () => auth.user }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => ({
          maybeSingle: async () => {
            auth.queries.push(`${table}.${column}=${value}`);
            return { data: auth.staffRow };
          },
        }),
      }),
    }),
  }),
}));

import { isEducationStaff } from "./education-staff";

beforeEach(() => {
  auth.user = null;
  auth.staffRow = null;
  auth.queries = [];
});

describe("isEducationStaff", () => {
  it("is false with no signed-in user, without querying gc_staff", async () => {
    expect(await isEducationStaff()).toBe(false);
    expect(auth.queries).toEqual([]);
  });

  it("is false for a signed-in user with no gc_staff row", async () => {
    auth.user = { id: "member-1" };
    expect(await isEducationStaff()).toBe(false);
    expect(auth.queries).toEqual(["gc_staff.user_id=member-1"]);
  });

  it("is true for a gc_staff user", async () => {
    auth.user = { id: "staff-1" };
    auth.staffRow = { user_id: "staff-1" };
    expect(await isEducationStaff()).toBe(true);
    expect(auth.queries).toEqual(["gc_staff.user_id=staff-1"]);
  });
});
