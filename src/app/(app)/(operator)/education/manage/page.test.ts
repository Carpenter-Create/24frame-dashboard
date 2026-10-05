import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EDUCATION_ADMIN, EDUCATION_HREF, EDUCATION_MANAGE_HREF } from "@/lib/education";
import { EDUCATION_MANAGE_NAV, GC_NAV } from "@/lib/nav";

import GcEducationPage from "./page";

describe("GcEducationPage", () => {
  it("keeps Manage courses chrome and no faux Home destination", () => {
    const html = renderToStaticMarkup(GcEducationPage());
    expect(html).toContain("data-education-index");
    expect(html).toContain(EDUCATION_ADMIN.title);
    expect(html).toContain(EDUCATION_ADMIN.title);
    expect(html).toContain(EDUCATION_ADMIN.selectCourse);
    expect(html).not.toContain("data-education-home");
    expect(html).not.toContain("Welcome");
    expect(html).not.toContain("New & For You");
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("/gc/education");
    expect(html).not.toContain("MasterClass");
    expect(html).not.toContain("Sequence");
  });
});

describe("education admin lock", () => {
  it("lives under the operator gc_staff layout, not GC_NAV", () => {
    expect(EDUCATION_MANAGE_HREF).toBe("/education/manage");
    expect(EDUCATION_MANAGE_NAV.map((item) => item.href)).toContain(EDUCATION_MANAGE_HREF);
    expect(GC_NAV.map((item) => item.href)).not.toContain(EDUCATION_HREF);
    expect(GC_NAV.map((item) => item.href)).not.toContain("/gc/education");
    const layout = readFileSync("src/app/(app)/(operator)/education/manage/layout.tsx", "utf8");
    const rail = readFileSync("src/app/(app)/(operator)/education/manage/education-course-rail.tsx", "utf8");
    const actions = readFileSync("src/app/(app)/(operator)/education/manage/actions.ts", "utf8");
    expect(layout).toContain("EducationStaffShell");
    expect(layout).toContain("createAdminClient");
    expect(layout).toContain('export const dynamic = "force-dynamic"');
    expect(rail).toContain("NewCourseButton");
    expect(rail).toContain("data-education-course-name");
    expect(rail).not.toMatch(/Welcome|New & For You|\bHome\b/);
    expect(actions).toContain("createAdminClient");
    expect(actions).toContain("gc_staff");
    expect(actions).not.toContain('from "@/lib/s3"');
    expect(actions).not.toContain('from "@/lib/s3-social-media"');
    expect(actions).not.toContain('from "@/lib/mediaconvert"');
    expect(readFileSync("src/app/(app)/(operator)/layout.tsx", "utf8")).toContain("gc_staff");
  });
});
