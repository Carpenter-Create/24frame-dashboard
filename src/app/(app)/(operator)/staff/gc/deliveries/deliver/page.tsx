import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { deliverHandOverHref, parseDeliverTitleIds } from "@/lib/deliver-stepper";
import { GC_DELIVERIES_HREF } from "@/lib/gc-deliveries";

// The old Deliver address (docs/design-locks/staff-licensing-deliver-window-lock-v1.md):
// a hand-over only. Staff with operate go to the window over Licensing Status
// with these titles (?deliver=<ids>, at both widths); everyone else lands on
// the list. It checks gc_can itself: the layout's staff check renders
// alongside the page, so the page cannot rely on it.
export default async function DeliverHandOverPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const sp = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const titleIds = parseDeliverTitleIds(sp.titles);
  if (titleIds.length === 0) redirect(GC_DELIVERIES_HREF);

  const user = await getAuthUser();
  if (!user) redirect(GC_DELIVERIES_HREF);
  const supabase = await createClient();
  const { data: canOperate, error } = await supabase.rpc("gc_can", {
    p_uid: user.id,
    p_capability: "operate",
  });
  if (error || canOperate !== true) redirect(GC_DELIVERIES_HREF);

  redirect(deliverHandOverHref(titleIds));
}
