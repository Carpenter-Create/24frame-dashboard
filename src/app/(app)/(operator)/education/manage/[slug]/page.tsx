import { notFound, redirect } from "next/navigation";

import { HouseEmpty } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { loadEducationAdminDetail } from "@/lib/education-admin";
import {
  EDUCATION_ADMIN,
  EDUCATION_MANAGE_HREF,
  canStartEducationEncode,
} from "@/lib/education";
import { isEducationStaff } from "@/lib/education-staff";
import { signedEducationCoverUrl } from "@/lib/s3-education";
import { createAdminClient } from "@/lib/supabase/admin";

import { EducationCourseOverview } from "../education-overview";

export default async function GcEducationCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // The (operator) layout's gate does not stop this page rendering.
  // Check before the service-role read below.
  if (!(await isEducationStaff())) redirect("/");
  const { slug } = await params;
  const detail = await loadEducationAdminDetail(createAdminClient(), slug);

  if (detail.failed) {
    return (
      <div data-gc-education-error="">
        <PageHeader title={EDUCATION_ADMIN.title} backLink={{ href: EDUCATION_MANAGE_HREF, label: EDUCATION_ADMIN.title }} />
        <HouseEmpty>{EDUCATION_ADMIN.error}</HouseEmpty>
      </div>
    );
  }

  if (!detail.course) notFound();

  const course = detail.course;
  const coverUrl = course.cover_key ? await signedEducationCoverUrl(course.cover_key) : null;
  // Encode start stays gated on the staff page — isolation lock.
  void canStartEducationEncode;

  return (
    <EducationCourseOverview
      course={{
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description ?? "",
        catalogCode: course.catalog_code,
        status: course.status,
        isFlagshipFree: course.is_flagship_free,
        priceCents: course.price_cents,
        instructorId: course.instructor_id,
      }}
      modules={detail.modules}
      instructors={detail.instructors}
      coverUrl={coverUrl}
    />
  );
}
