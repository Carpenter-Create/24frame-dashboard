import Link from "next/link";

import { HouseEmpty, TextAction } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { SocialJoinGroupButton } from "@/components/social/social-group-forms";
import { SOCIAL, SOCIAL_ROUTES, socialGroupHref } from "@/lib/social";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";
import { requireSocialSession } from "@/lib/social-session";

export default async function SocialGroupsPage() {
  const { ctx, supabase } = await requireSocialSession();
  const profile = await ensureOwnSocialProfile(supabase, ctx.user);
  const [canCreateRes, groupsRes, membershipsRes] = await Promise.all([
    profile
      ? supabase.rpc("has_capability", { p_user: ctx.user.id, p_cap: "create_group" })
      : Promise.resolve({ data: false as boolean | null }),
    supabase
      .from("groups")
      .select("id, slug, name, description, visibility, member_count")
      .order("name")
      .range(...rangeFor(UNPAGINATED_MAX)),
    profile
      ? supabase.from("group_members").select("group_id").eq("user_id", ctx.user.id)
      : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  const { data: canCreate } = canCreateRes;
  const { data: groups } = groupsRes;
  const { data: memberships } = membershipsRes;

  const mine = new Set((memberships ?? []).map((row) => row.group_id));
  const all = groups ?? [];
  const myGroups = all.filter((group) => mine.has(group.id));
  const publicGroups = all.filter((group) => group.visibility === "public" && !mine.has(group.id));

  return (
    <div data-social-groups="">
      <PageHeader
        title={SOCIAL.groups.title}
        subtitle={SOCIAL.groups.subtitle}
        actions={
          canCreate === true ? (
            <TextAction href={SOCIAL_ROUTES.groupsNew}>{SOCIAL.groups.create}</TextAction>
          ) : null
        }
      />
      {all.length === 0 ? <HouseEmpty>{SOCIAL.groups.empty}</HouseEmpty> : null}
      {myGroups.length > 0 ? (
        <section className="mb-[var(--space-8)]">
          <h2 className="t-label text-ink-3">{SOCIAL.groups.mine}</h2>
          <ul className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
            {myGroups.map((group) => (
              <li key={group.id}>
                <Link href={socialGroupHref(group.slug)} className="t-body font-medium text-ink">
                  {group.name}
                </Link>
                <p className="t-body-sm text-ink-3">
                  {group.member_count} {SOCIAL.groups.members}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {publicGroups.length > 0 ? (
        <section>
          <h2 className="t-label text-ink-3">{SOCIAL.groups.public}</h2>
          <ul className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
            {publicGroups.map((group) => (
              <li key={group.id} className="flex items-start justify-between gap-[var(--space-4)]">
                <div>
                  <Link href={socialGroupHref(group.slug)} className="t-body font-medium text-ink">
                    {group.name}
                  </Link>
                  {group.description ? (
                    <p className="t-body-sm text-ink-3">{group.description}</p>
                  ) : null}
                </div>
                {profile ? (
                  <SocialJoinGroupButton groupId={group.id} groupSlug={group.slug} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
