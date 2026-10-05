import Link from "next/link";

import { CourseCover } from "@/components/courses/course-cover";
import {
  COURSE_FEATURE_CARD_CLASS,
  COURSE_FEATURE_COVER_CLASS,
  COURSE_FEATURE_META_CLASS,
  COURSE_FEATURE_TEXT_CLASS,
  COURSE_FEATURE_TITLE_CLASS,
  COURSE_GLANCE_PROGRESS_CAPTION_CLASS,
  COURSE_GLANCE_PROGRESS_FILL_CLASS,
  COURSE_GLANCE_PROGRESS_TRACK_CLASS,
  COURSE_GLANCE_TITLE_CLASS,
  courseGlancePlateClass,
  courseGlanceProgressLabel,
  courseGlanceProgressPercent,
  courseHomeCoverTone,
  type CourseCardDensity,
  type CourseRow,
} from "@/lib/courses";
import { educationCourseHref } from "@/lib/education";

// Discover: 16:9 cover + title + quiet lesson meta.
// Home glance: signed photo + below-cover title + progress.
// Plate/orb + in-plate title only when no signed cover.
// Feature (Social Feed For you rail): one soft grey card — cover, the
// label, then the title. Plate without the in-plate title.
// One primitive — density, not a twin. No Social engagement chrome.

export function CourseCard({
  course,
  coverUrl,
  metaLabel,
  density = "discover",
  progressPercent,
  coverLoading,
}: {
  course: CourseRow;
  coverUrl?: string | null;
  metaLabel?: string | null;
  density?: CourseCardDensity;
  progressPercent?: number | null;
  coverLoading?: "eager" | "lazy";
}) {
  const home = density === "home";
  const feature = density === "feature";
  const tone = home || feature ? courseHomeCoverTone(coverUrl) : "photo";
  const plate = tone === "plate";
  const percent = courseGlanceProgressPercent(progressPercent);
  const progressLabel = courseGlanceProgressLabel(percent);

  return (
    <li data-course-card={course.slug} data-course-card-density={density}>
      <Link
        href={educationCourseHref(course.slug)}
        className={
          feature
            ? COURSE_FEATURE_CARD_CLASS
            : home
              ? "flex flex-col gap-[var(--space-2)]"
              : "flex flex-col gap-[var(--space-3)]"
        }
      >
        <CourseCover
          title={course.title}
          src={coverUrl}
          tone={tone}
          loading={coverLoading}
          plateClass={plate ? courseGlancePlateClass(course.id) : undefined}
          className={feature ? COURSE_FEATURE_COVER_CLASS : undefined}
        >
          {plate && !feature ? (
            <span data-course-cover-title="" className={COURSE_GLANCE_TITLE_CLASS}>
              {course.title}
            </span>
          ) : null}
        </CourseCover>
        {feature ? (
          <span className={COURSE_FEATURE_TEXT_CLASS}>
            {metaLabel ? (
              <span data-course-card-meta="" className={COURSE_FEATURE_META_CLASS}>
                {metaLabel}
              </span>
            ) : null}
            <span className={COURSE_FEATURE_TITLE_CLASS}>{course.title}</span>
          </span>
        ) : home ? (
          <div data-course-progress="" className="flex flex-col gap-[var(--space-2)]">
            {!plate ? (
              <span className="t-body font-medium text-ink">{course.title}</span>
            ) : null}
            <div
              data-course-progress-track=""
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={progressLabel}
              className={COURSE_GLANCE_PROGRESS_TRACK_CLASS}
            >
              <div
                data-course-progress-fill=""
                className={COURSE_GLANCE_PROGRESS_FILL_CLASS}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span data-course-progress-caption="" className={COURSE_GLANCE_PROGRESS_CAPTION_CLASS}>
              {progressLabel}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--space-2)]">
            <span className="t-body font-medium text-ink">{course.title}</span>
            {metaLabel ? (
              <span data-course-card-meta="" className="t-body-sm text-ink-3">
                {metaLabel}
              </span>
            ) : null}
          </div>
        )}
      </Link>
    </li>
  );
}
