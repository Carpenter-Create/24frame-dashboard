import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { SOCIAL } from "@/lib/social";
import SocialCoursesPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: false,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.order = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result, error: null }).then(resolve);
  return c;
}

function stubClient(
  courses: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cover_key: string | null;
    is_flagship_free: boolean;
    created_at: string;
  }[] = [],
  failed = false,
  extras: {
    modules?: { id: string; course_id: string }[];
    lessons?: { id: string; module_id: string; duration_seconds: number | null }[];
  } = {},
) {
  const from = vi.fn((table: string) => {
    if (table === "courses") {
      if (failed) {
        const c: Record<string, unknown> = {};
        const self = () => c;
        c.select = vi.fn(self);
        c.eq = vi.fn(self);
        c.in = vi.fn(self);
        c.order = vi.fn(self);
        c.range = vi.fn(async () => ({ data: null, error: { message: "failed" } }));
        return c;
      }
      return chain(courses);
    }
    if (table === "modules") return chain(extras.modules ?? []);
    if (table === "lessons") return chain(extras.lessons ?? []);
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);
  return { from };
}

describe("Social courses list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders placeholder courses for a signed-in user", async () => {
    const { from } = stubClient(
      [
        {
          id: "c1",
          slug: "welcome-to-24frame",
          title: "Welcome to 24Frame",
          description: "Orientation for 24Frame Education.",
          cover_key: null,
          is_flagship_free: true,
          created_at: "2026-09-12T14:00:00.000Z",
        },
      ],
      false,
      {
        modules: [{ id: "m1", course_id: "c1" }],
        lessons: [{ id: "l1", module_id: "m1", duration_seconds: 120 }],
      },
    );
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = renderToStaticMarkup(await SocialCoursesPage());
    expect(from).toHaveBeenCalledWith("courses");
    expect(from).not.toHaveBeenCalledWith("titles");
    expect(html).toContain("data-social-courses");
    expect(SOCIAL.courses.title).toBe("Education");
    expect(html).toContain(SOCIAL.courses.title);
    expect(html).toContain("24Frame");
    expect(html).not.toContain("Courses");
    expect(html).not.toContain("Social+Education");
    expect(html).toContain("Welcome to 24Frame");
    expect(html).toContain("/education/welcome-to-24frame");
    expect(html).toContain("data-course-grid");
    expect(html).toContain("data-course-card");
    expect(html).toContain("data-course-cover");
    expect(html).toContain("aspect-video");
    expect(html).toContain("data-course-card-meta");
    expect(html).toContain("1 lesson");
    expect(html).toContain("2m");
    expect(html).not.toContain("text-3xl");
    expect(html).not.toContain("New &amp; For You");
    expect(html).not.toContain("New & For You");
    expect(html).not.toContain("Resume");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("LOCKED");
    expect(html).not.toContain("Globee");
    expect(html).not.toContain(ASK_FRAME_AI.headline);
    expect(html).not.toContain("—");
    expect(html).not.toContain("courses/new");
    expect(html).not.toContain("My learning");
  });

  it("shows the empty state when there are no courses", async () => {
    stubClient([]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = renderToStaticMarkup(await SocialCoursesPage());
    expect(html).toContain("data-house-empty");
    expect(html).toContain(SOCIAL.courses.empty);
    expect(html).not.toContain("data-course-card");
  });

  it("shows house error and Retry when the list fails", async () => {
    stubClient([], true);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = renderToStaticMarkup(await SocialCoursesPage());
    expect(html).toContain("data-course-error");
    expect(html).toContain(SOCIAL.courses.error);
    expect(html).toContain(SOCIAL.courses.retry);
    expect(html).toContain("data-course-retry");
    expect(html).not.toContain("data-course-card");
  });

  it("sends an unauthenticated visitor to login", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(SocialCoursesPage()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("course list lock", () => {
  it("does not add a create form or steal /messages", () => {
    const page = readFileSync("src/app/(app)/education/page.tsx", "utf8");
    expect(page).not.toContain('"/messages"');
    expect(page).not.toContain("createSocialCourse");
    expect(page).not.toContain("SocialAvatar");
    expect(page).not.toContain("My learning");
    expect(page).not.toContain("Welcome /");
    expect(page).not.toContain("New & For You");
    expect(page).not.toContain("Manage courses");
    expect(page).not.toMatch(/Buy|checkout|Stripe/i);
    expect(readFileSync("src/app/(app)/education/loading.tsx", "utf8")).toContain(
      "CourseDiscoverSkeleton",
    );
    expect(readFileSync("src/app/(app)/education/error.tsx", "utf8")).toContain(
      "data-course-retry",
    );
    expect(existsSync("src/app/(app)/aggregation/messages/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/aggregation/messages/ask-ai-legacy-intercept.tsx")).toBe(
      false,
    );
  });
});
