import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EDUCATION_ADMIN, EDUCATION_ENCODE_LABELS } from "@/lib/education";

// --accent read from tokens.css, so this guard follows the pending GC accent checkpoint.
const ACCENT = readFileSync("src/app/tokens.css", "utf8").match(/--accent:\s*(#[0-9a-fA-F]{6});/)?.[1];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("./actions", () => ({
  createEducationCourse: vi.fn(),
  createEducationLesson: vi.fn(),
  createEducationModule: vi.fn(),
  refreshEducationLessonEncode: vi.fn(),
  startEducationLessonEncode: vi.fn(),
  updateEducationCourse: vi.fn(),
  updateEducationLesson: vi.fn(),
  uploadEducationCover: vi.fn(),
  uploadEducationLessonCover: vi.fn(),
}));

import {
  EditCourseForm,
  EditLessonModal,
  LessonAdminForm,
  NewCourseModal,
  NewLessonModal,
} from "./education-forms";

describe("course slug lock", () => {
  it("does not render an editable slug control on New course or Edit course", () => {
    const src = readFileSync("src/app/(app)/(operator)/education/manage/education-forms.tsx", "utf8");
    const actions = readFileSync("src/app/(app)/(operator)/education/manage/actions.ts", "utf8");
    expect(src).not.toMatch(/name=["']slug["']/);
    expect(src).not.toContain("<Input name=\"slug\"");
    expect(src).not.toContain('form.get("slug")');
    expect(actions).not.toMatch(/slug: z\.string/);
    expect(actions).toContain("allocateUniqueCourseSlug(admin, parsed.data.title)");

    const createHtml = renderToStaticMarkup(
      <NewCourseModal open onClose={() => undefined} instructors={[]} />,
    );
    expect(createHtml).toContain("data-education-new-course");
    expect(createHtml).not.toMatch(/name=["']slug["']/);
    expect(createHtml).not.toContain(EDUCATION_ADMIN.slugHint);

    const editHtml = renderToStaticMarkup(
      <EditCourseForm
        courseId="22222222-2222-4222-8222-222222222222"
        title="Orientation"
        description=""
        catalogCode="EDU-0001"
        status="draft"
        isFlagshipFree
        priceCents={null}
        instructorId={null}
        instructors={[]}
      />,
    );
    expect(editHtml).toContain("data-education-edit");
    expect(editHtml).toContain(EDUCATION_ADMIN.catalogCode);
    expect(editHtml).toContain("EDU-0001");
    expect(editHtml).not.toMatch(/name=["']slug["']/);
    expect(editHtml).not.toContain(EDUCATION_ADMIN.slugHint);
    expect(editHtml).not.toContain("welcome-to-24frame");
  });
});

describe("New lesson modal miss list A v1.1", () => {
  it("renders Passion-house fields without Sequence or a free-taste toggle", () => {
    const html = renderToStaticMarkup(
      <NewLessonModal
        open
        onClose={() => undefined}
        courseId="22222222-2222-4222-8222-222222222222"
        modules={[{ id: "m1", course_id: "c1", title: "Orientation", position: 1 }]}
      />,
    );
    expect(html).toContain("data-education-new-lesson");
    expect(html).toContain("data-education-cover-dropzone");
    expect(html).toContain('data-education-lesson-type="lesson"');
    expect(html).toContain(EDUCATION_ADMIN.lessonTypeLesson);
    expect(html).toContain("0/80");
    expect(html).toContain("0/200");
    expect(html).toContain(EDUCATION_ADMIN.duration);
    expect(html).toContain('name="durationMinutes"');
    expect(html).toContain(EDUCATION_ADMIN.modulePlacement);
    expect(html).toContain(EDUCATION_ADMIN.cancel);
    expect(html).toContain(EDUCATION_ADMIN.addLesson);
    expect(html).toContain("bg-accent");
    expect(html).not.toContain("Sequence");
    expect(html).not.toContain("freePreview");
    expect(html).not.toMatch(/free.?taste|Free preview/i);
    expect(html).not.toMatch(/#e91e63|#d500f9|#ff00ff|magenta/i);
    expect(ACCENT).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(html.toLowerCase()).not.toContain(String(ACCENT).slice(1).toLowerCase());
  });
});

describe("instructor picker P0", () => {
  it("links instructor_id and does not create-as-you-type", () => {
    const src = readFileSync("src/app/(app)/(operator)/education/manage/education-forms.tsx", "utf8");
    expect(src).toContain('name="instructorId"');
    expect(src).not.toContain('name="instructorName"');
    expect(src).not.toContain("instructorName");
    expect(src).toContain("EDUCATION_ADMIN.instructorHint");

    const html = renderToStaticMarkup(
      <NewCourseModal
        open
        onClose={() => undefined}
        instructors={[{ id: "11111111-1111-4111-8111-111111111111", name: "Ada", bio: null, created_at: "" }]}
      />,
    );
    expect(html).toContain("data-education-instructor-picker");
    expect(html).toContain("Ada");
    expect(html).not.toContain('name="instructorName"');
    expect(html).not.toContain("Creates an instructor");
  });
});

describe("Edit lesson modal", () => {
  it("uses the Passion-house lesson modal, not an inline megapage form", () => {
    const html = renderToStaticMarkup(
      <EditLessonModal
        open
        onClose={() => undefined}
        courseId="22222222-2222-4222-8222-222222222222"
        modules={[{ id: "m1", course_id: "c1", title: "Orientation", position: 1 }]}
        lesson={{
          id: "l1",
          moduleId: "m1",
          title: "Opening",
          summary: "",
          durationSeconds: 600,
        }}
      />,
    );
    expect(html).toContain("data-education-edit-lesson-form");
    expect(html).toContain(EDUCATION_ADMIN.editLesson);
    expect(html).toContain('data-education-lesson-type="lesson"');
    expect(html).toContain(EDUCATION_ADMIN.cancel);
    expect(html).toContain(EDUCATION_ADMIN.save);
    expect(html).not.toContain("Sequence");
    expect(html).not.toMatch(/free.?taste/i);
  });
});

describe("LessonAdminForm encode status", () => {
  it("shows submit_failed with the encode error and keeps Start encode enabled", () => {
    const html = renderToStaticMarkup(
      createElement(LessonAdminForm, {
        courseId: "11111111-1111-4111-8111-111111111111",
        lessonId: "22222222-2222-4222-8222-222222222222",
        title: "CoS smoke",
        summary: "",
        durationSeconds: null,
        encodeLabel: EDUCATION_ENCODE_LABELS.submit_failed,
        encodeError: "/outputGroups/0/outputs/0: nameModifier is a required property",
        canStartEncode: true,
      }),
    );

    expect(html).toContain(EDUCATION_ENCODE_LABELS.submit_failed);
    expect(html).toContain("nameModifier is a required property");
    expect(html).toContain("data-education-encode-error");
    expect(html).not.toContain(EDUCATION_ADMIN.encodeNone);
    expect(html).toContain(EDUCATION_ADMIN.startEncode);
  });

  it("does not claim there is no source when source is present and status is empty", () => {
    const html = renderToStaticMarkup(
      createElement(LessonAdminForm, {
        courseId: "11111111-1111-4111-8111-111111111111",
        lessonId: "22222222-2222-4222-8222-222222222222",
        title: "CoS smoke",
        summary: "",
        durationSeconds: null,
        encodeLabel: EDUCATION_ADMIN.encodeSourceReady,
        encodeError: null,
        canStartEncode: true,
      }),
    );

    expect(html).toContain(EDUCATION_ADMIN.encodeSourceReady);
    expect(html).not.toContain(EDUCATION_ADMIN.encodeNone);
  });

  it("gates Start encode on canStartEncode, not source presence alone", () => {
    const src = readFileSync("src/app/(app)/(operator)/education/manage/education-forms.tsx", "utf8");
    expect(src).toContain("disabled={saving || !canStartEncode}");
    expect(src).not.toContain("disabled={saving || !hasSource}");
  });
});
