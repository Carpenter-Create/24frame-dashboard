import { SocialForYouRail } from "@/components/social/social-for-you";
import { latestDiscoverableCourse, loadDiscoverableCourses } from "@/lib/courses";
import { loadSuggestedPeople } from "@/lib/social-feed";
import { signedAvatarUrls } from "@/lib/social-edge";
import { loadCachedFolloweeIds } from "@/lib/social-hot-reads";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import type { SocialSession } from "@/lib/social-session";

// One For You data path for Home, Explore, Messages, and Profile.
// Cover signing stays at the
// caller: education S3 is node-only, and the public profile route is edge.
// Omit the signer and CourseCard paints its plate.
type SignCourseCovers = (
  courses: readonly { id: string; cover_key: string | null }[],
) => Promise<Map<string, string>>;

export async function SocialDesktopForYouSlot({
  session,
  signCourseCovers,
  layout = "rail",
}: {
  session: SocialSession;
  signCourseCovers?: SignCourseCovers;
  /** "aside": the Feed's borderless D aside. Other routes keep the rail. */
  layout?: "rail" | "aside";
}) {
  const { ctx, supabase } = session;
  const [profile, followees] = await Promise.all([
    ensureOwnSocialProfile(supabase, ctx.user),
    loadCachedFolloweeIds(supabase, ctx.user.id),
  ]);
  const interest = { topics: profile?.topics ?? [], crafts: profile?.crafts ?? [] };
  const [suggested, catalog] = await Promise.all([
    loadSuggestedPeople(supabase, [ctx.user.id, ...followees.ids], interest),
    loadDiscoverableCourses(supabase),
  ]);
  const latestCourse = catalog.failed ? null : latestDiscoverableCourse(catalog.courses, interest);
  const [faces, courseCovers] = await Promise.all([
    suggested.length > 0
      ? Promise.resolve(signedAvatarUrls(suggested.map((person) => person.id)))
      : Promise.resolve(new Map<string, string | null>()),
    latestCourse && signCourseCovers
      ? signCourseCovers([latestCourse])
      : Promise.resolve(new Map<string, string>()),
  ]);
  return (
    <SocialForYouRail
      layout={layout}
      people={suggested}
      faces={faces}
      latestCourse={latestCourse}
      latestCourseCoverUrl={latestCourse ? (courseCovers.get(latestCourse.id) ?? null) : null}
    />
  );
}
