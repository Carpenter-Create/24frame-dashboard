import "server-only";

import { cache } from "react";

import { rangeFor, UNPAGINATED_MAX } from "@/lib/list-bounds";
import type { MusicReviewScan } from "@/lib/social-music-review";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REVIEW_COLUMNS =
  "id, surface, author_id, status, vendor_title, vendor_artist, vendor_score, asset_id, created_at";

type ReviewRow = {
  id: string;
  surface: "post" | "story";
  author_id: string;
  status: "pending" | "allowed" | "blocked";
  vendor_title: string | null;
  vendor_artist: string | null;
  vendor_score: number | string | null;
  asset_id: string;
  created_at: string;
};

function scoreOf(value: number | string | null): number | null {
  if (value == null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

// Same gc_staff check as Education CMS before any service-role read.
// The operator layout is not enough on its own (Next 16 layouts).
export const isMusicReviewStaff = cache(async (): Promise<boolean> => {
  const user = await getAuthUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data: staff } = await supabase.from("gc_staff").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(staff);
});

export async function loadMusicReviewQueue(): Promise<MusicReviewScan[]> {
  const admin = createAdminClient();
  const [blocked, held] = await Promise.all([
    admin
      .from("social_music_scans")
      .select(REVIEW_COLUMNS)
      .eq("status", "blocked")
      .order("created_at", { ascending: false })
      .range(...rangeFor(UNPAGINATED_MAX)),
    admin
      .from("social_music_scans")
      .select(REVIEW_COLUMNS)
      .eq("status", "pending")
      .is("next_attempt_at", null)
      .order("created_at", { ascending: false })
      .range(...rangeFor(UNPAGINATED_MAX)),
  ]);
  if (blocked.error || held.error) return [];
  const rows = [...((blocked.data ?? []) as ReviewRow[]), ...((held.data ?? []) as ReviewRow[])];
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  const { data: profiles } = authorIds.length
    ? await admin.from("profiles").select("id, handle, display_name").in("id", authorIds)
    : { data: [] as { id: string; handle: string | null; display_name: string | null }[] };
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name?.trim() || profile.handle || null]),
  );
  return rows.map((row) => ({
    id: row.id,
    surface: row.surface,
    authorName: names.get(row.author_id) ?? null,
    status: row.status === "blocked" ? "blocked" : "pending",
    vendorTitle: row.vendor_title,
    vendorArtist: row.vendor_artist,
    vendorScore: scoreOf(row.vendor_score),
    assetId: row.asset_id,
  }));
}
