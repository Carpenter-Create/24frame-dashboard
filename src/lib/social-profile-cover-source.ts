import type { createClient } from "@/lib/supabase/server";
import { type CoverFraming, parseCoverCrop } from "@/lib/social-profile-cover-frame";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Owner only: the stored framing of the cover's kept original, read in one
 * row with the cover_key it produced (the editor's compare-and-swap token;
 * the same key the cover's media URL already carries). Null when the cover
 * has no original (saved before the original was kept), so Reposition opens
 * the file picker. A framing implies an original (profiles CHECK
 * profiles_cover_source_pair); the original's key never leaves the server.
 * Not part of SOCIAL_PROFILE_COLUMNS: visitor reads never select it.
 */
export async function loadOwnSocialProfileCoverFraming(
  supabase: ServerClient,
  userId: string,
): Promise<CoverFraming | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("cover_key, cover_crop")
      .eq("id", userId)
      .maybeSingle();
    if (error || data?.cover_crop == null) return null;
    const coverKey = typeof data.cover_key === "string" ? data.cover_key : "";
    const crop = parseCoverCrop(data.cover_crop);
    if (!coverKey || !crop) return null;
    return { crop, coverKey };
  } catch {
    return null;
  }
}
