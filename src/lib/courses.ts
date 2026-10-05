import { SOCIAL } from "@/lib/social";
import { educationCourseHref, type CourseStatus } from "@/lib/education";
import type { createClient } from "@/lib/supabase/server";
import { UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";
import { socialCourseAffinityScore } from "@/lib/social-role-affinity";

// Course placeholders. Members browse and consume titles only.
// Company / admin / service / migration seed publish. No member write.

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_key: string | null;
  is_flagship_free: boolean;
  price_cents: number | null;
  catalog_code: string;
  status: CourseStatus;
  position: number;
  instructor_id: string | null;
  created_at: string;
};

export const COURSE_MEMBER_SELECT =
  "id, slug, title, description, cover_key, is_flagship_free, price_cents, catalog_code, status, position, instructor_id, created_at";

export const COURSE_COVER_ASPECT_CLASS = "aspect-video";

export const COURSE_CARD_DENSITIES = ["discover", "home", "feature"] as const;
export type CourseCardDensity = (typeof COURSE_CARD_DENSITIES)[number];

// Feature: the Social Feed's For you rail (H register §5.5; founder
// 2026-10-05, "I like the designs. Let's use them."). One soft grey card
// that is one link: --surface-muted, radius 24, pad 16, no border, no
// shadow; the 16:9 cover at radius 16 (no hairline); 16, then the label
// (13 / 500 ink-2), 4, the title (17 / 600 ink). No signed cover: the
// glance plate (so the cover never reads as a blank on the grey card),
// with the title under it, not in it.
export const COURSE_FEATURE_CARD_CLASS =
  "flex flex-col gap-4 rounded-[var(--radius-xl)] bg-surface-muted p-4";
export const COURSE_FEATURE_COVER_CLASS = "rounded-[var(--radius-lg)] border-0";
export const COURSE_FEATURE_TEXT_CLASS = "flex flex-col gap-1";
export const COURSE_FEATURE_META_CLASS =
  "text-[length:var(--text-xs)] leading-[18px] font-medium text-ink-2";
export const COURSE_FEATURE_TITLE_CLASS =
  "text-[length:var(--text-base)] leading-6 font-semibold text-ink";

// Home Education glance plates — empty-cover fallback only.
// Real signed covers use the same 16:9 photo path as discover.
// Cycle is deterministic from course id. Hex lives in tokens.css only.
export const COURSE_GLANCE_PLATE_CLASSES = [
  "bg-course-plate-1",
  "bg-course-plate-2",
  "bg-course-plate-3",
  "bg-course-plate-4",
  "bg-course-plate-5",
] as const;

export const COURSE_GLANCE_TITLE_CLASS =
  "absolute bottom-[var(--space-3)] left-[var(--space-3)] max-w-[calc(100%-var(--space-6))] text-[length:var(--text-xs)] leading-none text-accent-contrast";

export const COURSE_GLANCE_BAND_CLASS =
  "absolute inset-x-0 top-0 h-10 bg-accent-contrast/[0.08]";

export const COURSE_GLANCE_ORB_CLASS =
  "absolute right-[var(--space-4)] top-7 size-14 rounded-full bg-accent-contrast/10";

export const COURSE_GLANCE_PROGRESS_TRACK_CLASS =
  "h-1.5 w-full overflow-hidden rounded-full bg-hairline";

export const COURSE_GLANCE_PROGRESS_FILL_CLASS = "h-full rounded-full bg-accent";

export const COURSE_GLANCE_PROGRESS_CAPTION_CLASS = "t-body-sm text-ink-2";

export function courseGlancePlateIndex(courseId: string): number {
  let hash = 0;
  for (const ch of courseId) {
    hash = (hash + ch.charCodeAt(0)) % COURSE_GLANCE_PLATE_CLASSES.length;
  }
  return hash;
}

export function courseGlancePlateClass(
  courseId: string,
): (typeof COURSE_GLANCE_PLATE_CLASSES)[number] {
  return COURSE_GLANCE_PLATE_CLASSES[courseGlancePlateIndex(courseId)]!;
}

// Home density: photo when a signed cover exists. Plate/orb only
// when cover_key is missing or signing failed.
export function courseHomeCoverTone(coverUrl?: string | null): "photo" | "plate" {
  return coverUrl ? "photo" : "plate";
}

export function courseGlanceProgressPercent(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function courseGlanceProgressLabel(percent: number): string {
  return `${courseGlanceProgressPercent(percent)}% ${SOCIAL.courses.progressComplete}`;
}

export type CourseModuleRow = {
  id: string;
  course_id: string;
  title: string;
  position: number;
};

export type CourseEncodeStatus =
  | "submitted"
  | "running"
  | "complete"
  | "failed"
  | "submit_failed";

export type CourseLessonRow = {
  id: string;
  module_id: string;
  title: string;
  position: number;
  duration_seconds: number | null;
  free_preview: boolean;
  summary: string | null;
  cover_key: string | null;
  lesson_type: string;
  education_video_id: string | null;
  source_key: string | null;
  hls_key: string | null;
  encode_status: CourseEncodeStatus | null;
  encode_error?: string | null;
  playbackUrl?: string | null;
};

export type CourseOutlineModule = CourseModuleRow & { lessons: CourseLessonRow[] };

export type CourseDetail = {
  course: CourseRow | null;
  hasAccess: boolean;
  modules: CourseOutlineModule[];
  failed: boolean;
};

export type CourseListResult = {
  courses: CourseRow[];
  failed: boolean;
};

export function courseHref(slug: string): string {
  return educationCourseHref(slug);
}

// Mirrors has_course_access while member_tier_rank is the Pack 1 stub (0).
// Do not invent an entitlements lookup or a buy path.
export function courseAccessGranted(
  isFlagshipFree: boolean,
  memberTierRank: number,
): boolean {
  return isFlagshipFree || memberTierRank >= 1;
}

export function visibleCourseLessons(
  lessons: CourseLessonRow[],
  hasAccess: boolean,
): CourseLessonRow[] {
  if (hasAccess) return lessons;
  return lessons.filter((lesson) => lesson.free_preview);
}

export function outlineForDisplay(
  modules: CourseModuleRow[],
  lessons: CourseLessonRow[],
  hasAccess: boolean,
): CourseOutlineModule[] {
  const visible = visibleCourseLessons(lessons, hasAccess);
  const grouped = modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((module) => ({
      ...module,
      lessons: visible
        .filter((lesson) => lesson.module_id === module.id)
        .sort((a, b) => a.position - b.position),
    }));
  if (hasAccess) return grouped;
  return grouped.filter((module) => module.lessons.length > 0);
}

export function firstOutlineLesson(
  modules: CourseOutlineModule[],
): CourseLessonRow | null {
  for (const courseModule of modules) {
    const lesson = courseModule.lessons[0];
    if (lesson) return lesson;
  }
  return null;
}

export function lessonInOutline(
  modules: CourseOutlineModule[],
  lessonId: string,
): CourseLessonRow | null {
  for (const courseModule of modules) {
    const lesson = courseModule.lessons.find((row) => row.id === lessonId);
    if (lesson) return lesson;
  }
  return null;
}

export function courseLessonDurationLabel(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder}s`;
  if (remainder === 0) return `${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

export type CourseDiscoverMeta = {
  lessonCount: number;
  durationSeconds: number | null;
};

export function courseOutlineMeta(
  lessons: Pick<CourseLessonRow, "duration_seconds">[],
): CourseDiscoverMeta {
  const durations = lessons
    .map((lesson) => lesson.duration_seconds)
    .filter((seconds): seconds is number => seconds != null && seconds > 0);
  return {
    lessonCount: lessons.length,
    durationSeconds: durations.length > 0 ? durations.reduce((sum, seconds) => sum + seconds, 0) : null,
  };
}

export function courseDiscoverMetaLabel(meta: CourseDiscoverMeta): string | null {
  const parts: string[] = [];
  if (meta.lessonCount === 1) parts.push(SOCIAL.courses.lessonOne);
  if (meta.lessonCount > 1) parts.push(`${meta.lessonCount} ${SOCIAL.courses.lessons}`);
  const duration = courseLessonDurationLabel(meta.durationSeconds);
  if (duration) parts.push(duration);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export async function loadDiscoverableCourseMeta(
  supabase: ServerClient,
  courses: CourseRow[],
): Promise<Map<string, CourseDiscoverMeta>> {
  const meta = new Map<string, CourseDiscoverMeta>();
  if (courses.length === 0) return meta;

  const { data: moduleRows, error: moduleError } = await supabase
    .from("modules")
    .select("id, course_id")
    .in("course_id", courses.map((course) => course.id))
    .range(...rangeFor(UNPAGINATED_MAX));
  if (moduleError || !moduleRows?.length) return meta;

  const modules = moduleRows as { id: string; course_id: string }[];
  const { data: lessonRows, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, duration_seconds")
    .in(
      "module_id",
      modules.map((module) => module.id),
    )
    .range(...rangeFor(UNPAGINATED_MAX));
  if (lessonError || !lessonRows) return meta;

  const lessonsByModule = new Map<string, Pick<CourseLessonRow, "duration_seconds">[]>();
  for (const lesson of lessonRows as {
    id: string;
    module_id: string;
    duration_seconds: number | null;
  }[]) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push({ duration_seconds: lesson.duration_seconds });
    lessonsByModule.set(lesson.module_id, list);
  }

  const lessonsByCourse = new Map<string, Pick<CourseLessonRow, "duration_seconds">[]>();
  for (const courseModule of modules) {
    const list = lessonsByCourse.get(courseModule.course_id) ?? [];
    list.push(...(lessonsByModule.get(courseModule.id) ?? []));
    lessonsByCourse.set(courseModule.course_id, list);
  }

  for (const course of courses) {
    const lessons = lessonsByCourse.get(course.id) ?? [];
    if (lessons.length > 0) meta.set(course.id, courseOutlineMeta(lessons));
  }
  return meta;
}

export async function loadCourseInstructorName(
  supabase: ServerClient,
  instructorId: string | null,
): Promise<string | null> {
  if (!instructorId) return null;
  const { data, error } = await supabase
    .from("instructors")
    .select("name")
    .eq("id", instructorId)
    .maybeSingle();
  if (error || !data) return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return name || null;
}

export async function loadDiscoverableLessonTitles(
  supabase: ServerClient,
  courses: CourseRow[],
): Promise<Map<string, string[]>> {
  const titles = new Map<string, string[]>();
  if (courses.length === 0) return titles;

  const { data: moduleRows, error: moduleError } = await supabase
    .from("modules")
    .select("id, course_id")
    .in("course_id", courses.map((course) => course.id))
    .range(...rangeFor(UNPAGINATED_MAX));
  if (moduleError || !moduleRows?.length) return titles;

  const modules = moduleRows as { id: string; course_id: string }[];
  const { data: lessonRows, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, title")
    .in(
      "module_id",
      modules.map((module) => module.id),
    )
    .range(...rangeFor(UNPAGINATED_MAX));
  if (lessonError || !lessonRows) return titles;

  const titlesByModule = new Map<string, string[]>();
  for (const lesson of lessonRows as { id: string; module_id: string; title: string }[]) {
    const list = titlesByModule.get(lesson.module_id) ?? [];
    if (lesson.title) list.push(lesson.title);
    titlesByModule.set(lesson.module_id, list);
  }

  for (const courseModule of modules) {
    const list = titles.get(courseModule.course_id) ?? [];
    list.push(...(titlesByModule.get(courseModule.id) ?? []));
    titles.set(courseModule.course_id, list);
  }
  return titles;
}

export async function loadDiscoverableCourses(
  supabase: ServerClient,
): Promise<CourseListResult> {
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_MEMBER_SELECT)
    .eq("status", "published")
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  if (error) return { courses: [], failed: true };
  return { courses: (data ?? []) as CourseRow[], failed: false };
}

function newerPublishedCourse(left: CourseRow, right: CourseRow): CourseRow {
  if (
    left.created_at > right.created_at ||
    (left.created_at === right.created_at && left.id > right.id)
  ) {
    return left;
  }
  return right;
}

/** Newest published course from the Education catalog. Same rows as loadDiscoverableCourses.
 * Topics are primary; Professions may soft-bias. Otherwise newest published. */
export function latestDiscoverableCourse(
  courses: readonly CourseRow[],
  viewer: { topics?: unknown; crafts?: unknown } | readonly string[] = [],
): CourseRow | null {
  const published = courses.filter((course) => course.status === "published");
  if (published.length === 0) return null;
  let best: CourseRow | null = null;
  let bestScore = -1;
  for (const course of published) {
    const score = socialCourseAffinityScore(course, viewer);
    if (
      !best ||
      score > bestScore ||
      (score === bestScore && newerPublishedCourse(best, course) === course)
    ) {
      best = course;
      bestScore = score;
    }
  }
  return best;
}

export async function loadCourseDetail(
  supabase: ServerClient,
  slug: string,
  userId: string,
): Promise<CourseDetail> {
  const { data: course, error } = await supabase
    .from("courses")
    .select(COURSE_MEMBER_SELECT)
    .eq("slug", decodeURIComponent(slug))
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return { course: null, hasAccess: false, modules: [], failed: true };
  }

  if (!course) {
    return { course: null, hasAccess: false, modules: [], failed: false };
  }

  const { data: access } = await supabase.rpc("has_course_access", {
    p_user: userId,
    p_course: course.id,
  });
  const hasAccess = access === true;

  const { data: moduleRows, error: moduleError } = await supabase
    .from("modules")
    .select("id, course_id, title, position")
    .eq("course_id", course.id)
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));

  if (moduleError) {
    return { course, hasAccess, modules: [], failed: true };
  }

  const modules = (moduleRows ?? []) as CourseModuleRow[];
  const moduleIds = modules.map((module) => module.id);
  if (moduleIds.length === 0) {
    return { course, hasAccess, modules: [], failed: false };
  }

  const { data: lessonRows, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, module_id, title, position, duration_seconds, free_preview, summary, cover_key, lesson_type, education_video_id, source_key, hls_key, encode_status",
    )
    .in("module_id", moduleIds)
    .order("position", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));

  if (lessonError) {
    return { course, hasAccess, modules: [], failed: true };
  }

  return {
    course,
    hasAccess,
    modules: outlineForDisplay(modules, (lessonRows ?? []) as CourseLessonRow[], hasAccess),
    failed: false,
  };
}
