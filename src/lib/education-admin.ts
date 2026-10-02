import type { createAdminClient } from "@/lib/supabase/admin";
import { UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";
import { COURSE_MEMBER_SELECT, outlineForDisplay } from "@/lib/courses";
import type { CourseDetail, CourseLessonRow, CourseModuleRow, CourseRow } from "@/lib/courses";

// Staff-only outline. Uses the service-role client after a gc_staff check:
// isEducationStaff in the manage layout and course page, and
// requireEducationStaff in the actions. Course RLS stays free of is_gc_staff.

type AdminClient = ReturnType<typeof createAdminClient>;

export type InstructorRow = {
  id: string;
  name: string;
  bio: string | null;
  created_at: string;
};

export type EducationAdminCourseRow = CourseRow & {
  instructor_name: string | null;
};

const ADMIN_COURSE_SELECT = `${COURSE_MEMBER_SELECT}, instructors(name)`;

function asCourseRow(
  row: CourseRow & { instructors?: { name: string } | { name: string }[] | null },
): EducationAdminCourseRow {
  const instructor = Array.isArray(row.instructors) ? row.instructors[0] : row.instructors;
  return {
    ...row,
    instructor_name: instructor?.name ?? null,
  };
}

export async function loadEducationAdminCourses(
  admin: AdminClient,
): Promise<{ courses: EducationAdminCourseRow[]; failed: boolean }> {
  const { data, error } = await admin
    .from("courses")
    .select(ADMIN_COURSE_SELECT)
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  if (error) return { courses: [], failed: true };
  return {
    courses: (data ?? []).map((row) => asCourseRow(row as never)),
    failed: false,
  };
}

export async function loadEducationInstructors(admin: AdminClient): Promise<InstructorRow[]> {
  const { data } = await admin
    .from("instructors")
    .select("id, name, bio, created_at")
    .order("name", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  return (data ?? []) as InstructorRow[];
}

export async function loadEducationAdminDetail(
  admin: AdminClient,
  slug: string,
): Promise<CourseDetail & { instructors: InstructorRow[] }> {
  const { data: course, error } = await admin
    .from("courses")
    .select(ADMIN_COURSE_SELECT)
    .eq("slug", decodeURIComponent(slug))
    .maybeSingle();

  const instructors = await loadEducationInstructors(admin);

  if (error) {
    return { course: null, hasAccess: true, modules: [], instructors, failed: true };
  }
  if (!course) {
    return { course: null, hasAccess: true, modules: [], instructors, failed: false };
  }

  const courseRow = asCourseRow(course as never);

  const { data: moduleRows, error: moduleError } = await admin
    .from("modules")
    .select("id, course_id, title, position")
    .eq("course_id", courseRow.id)
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));

  if (moduleError) {
    return { course: courseRow, hasAccess: true, modules: [], instructors, failed: true };
  }

  const modules = (moduleRows ?? []) as CourseModuleRow[];
  const moduleIds = modules.map((module) => module.id);
  if (moduleIds.length === 0) {
    return { course: courseRow, hasAccess: true, modules: [], instructors, failed: false };
  }

  const { data: lessonRows, error: lessonError } = await admin
    .from("lessons")
    .select(
      "id, module_id, title, position, duration_seconds, free_preview, summary, cover_key, lesson_type, education_video_id, source_key, hls_key, encode_status, encode_error",
    )
    .in("module_id", moduleIds)
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));

  if (lessonError) {
    return { course: courseRow, hasAccess: true, modules: [], instructors, failed: true };
  }

  return {
    course: courseRow,
    hasAccess: true,
    modules: outlineForDisplay(modules, (lessonRows ?? []) as CourseLessonRow[], true),
    instructors,
    failed: false,
  };
}
