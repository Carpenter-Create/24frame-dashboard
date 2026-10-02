import "server-only";

import { cache } from "react";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

// Staff check for Education CMS reads that use the service-role client.
// The (operator) layout checks gc_staff too, but a layout does not stop
// its child segments from rendering into the RSC payload (Next 16 docs,
// "Layouts and auth checks"). Every service-role read checks here first.
// cache(): the manage layout and course page share one lookup per request.
export const isEducationStaff = cache(async (): Promise<boolean> => {
  const user = await getAuthUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("gc_staff")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(staff);
});
