import { HouseEmpty } from "@/components/chrome/house";
import { PageHeader } from "@/components/ui/page-header";
import { SocialGroupCreateForm } from "@/components/social/social-group-forms";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { requireSocialSession } from "@/lib/social-session";

export default async function SocialGroupNewPage() {
  const { ctx, supabase } = await requireSocialSession();
  const profile = await ensureOwnSocialProfile(supabase, ctx.user);
  const { data: canCreate } = profile
    ? await supabase.rpc("has_capability", { p_user: ctx.user.id, p_cap: "create_group" })
    : { data: false };

  return (
    <div data-social-group-new="">
      <PageHeader
        title={SOCIAL.groupNew.title}
        backLink={{ href: SOCIAL_ROUTES.groups, label: SOCIAL.groups.title }}
      />
      {canCreate === true ? (
        <SocialGroupCreateForm />
      ) : (
        <div data-social-group-forbidden="">
          <HouseEmpty>{SOCIAL.groups.forbidden}</HouseEmpty>
        </div>
      )}
    </div>
  );
}
