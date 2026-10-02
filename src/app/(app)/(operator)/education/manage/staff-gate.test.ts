import { beforeEach, describe, expect, it, vi } from "vitest";

// The (operator) layout's gc_staff check does not stop these segments from
// rendering, so the manage layout and course page must check before they
// create the service-role client.

const gate = vi.hoisted(() => ({
  staff: false,
  adminClients: 0,
}));

vi.mock("@/lib/education-staff", () => ({ isEducationStaff: async () => gate.staff }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    gate.adminClients += 1;
    return {};
  },
}));

vi.mock("@/lib/education-admin", () => ({
  loadEducationAdminCourses: async () => ({ courses: [], failed: false }),
  loadEducationInstructors: async () => [],
  loadEducationAdminDetail: async () => ({ failed: true }),
}));

vi.mock("@/lib/s3-education", () => ({ signedEducationCoverUrl: async () => null }));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
  usePathname: () => "/education/manage",
  useRouter: () => ({ push: () => undefined, refresh: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

import EducationLayout from "./layout";
import GcEducationCoursePage from "./[slug]/page";

const params = Promise.resolve({ slug: "orientation" });

beforeEach(() => {
  gate.staff = false;
  gate.adminClients = 0;
});

describe("Education manage staff gate", () => {
  it("bounces non-staff from the manage layout before any service-role read", async () => {
    await expect(EducationLayout({ children: null })).rejects.toThrow("redirect:/");
    expect(gate.adminClients).toBe(0);
  });

  it("bounces non-staff from a course page before any service-role read", async () => {
    await expect(GcEducationCoursePage({ params })).rejects.toThrow("redirect:/");
    expect(gate.adminClients).toBe(0);
  });

  it("lets staff through to the service-role loads", async () => {
    gate.staff = true;
    await expect(EducationLayout({ children: null })).resolves.toBeTruthy();
    await expect(GcEducationCoursePage({ params })).resolves.toBeTruthy();
    expect(gate.adminClients).toBe(2);
  });
});
