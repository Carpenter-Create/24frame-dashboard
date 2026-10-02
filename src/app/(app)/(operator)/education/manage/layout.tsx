import { redirect } from "next/navigation";

import { loadEducationAdminCourses, loadEducationInstructors } from "@/lib/education-admin";
import { isEducationStaff } from "@/lib/education-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import { EducationStaffShell } from "./education-shell";

export const dynamic = "force-dynamic";

export default async function EducationLayout({ children }: { children: React.ReactNode }) {
  // The (operator) layout's gate does not stop this segment rendering.
  // Check before the service-role reads below.
  if (!(await isEducationStaff())) redirect("/");
  const admin = createAdminClient();
  const [{ courses, failed }, instructors] = await Promise.all([
    loadEducationAdminCourses(admin),
    loadEducationInstructors(admin),
  ]);
  return (
    <EducationStaffShell courses={failed ? [] : courses} instructors={instructors}>
      {children}
    </EducationStaffShell>
  );
}
