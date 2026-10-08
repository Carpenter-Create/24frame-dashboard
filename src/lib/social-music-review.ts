import type { StaffDirectoryRowModel } from "@/lib/staff-directory";

// Staff spot-check list. Listing a row here does not change its status
// and does not release the video. Vendor titles stay on this surface.
// End-user copy is SOCIAL.music and does not name a recording.

export const SOCIAL_MUSIC_REVIEW = {
  title: "Music review",
  subtitle: "Social videos held after a commercial-music check.",
  empty: "No videos are waiting.",
  blocked: "Blocked",
  unfinished: "Unfinished",
  post: "Social post",
  story: "Social story",
  matchFallback: "Commercial match",
  unfinishedDetail: "The check did not finish. The video stays hidden.",
} as const;

export const SOCIAL_MUSIC_REVIEW_HREF = "/staff/music";

export type MusicReviewScan = {
  id: string;
  surface: "post" | "story";
  authorName: string | null;
  status: "blocked" | "pending";
  vendorTitle: string | null;
  vendorArtist: string | null;
  vendorScore: number | null;
  assetId: string;
};

function reviewName(scan: MusicReviewScan): string {
  const label = scan.surface === "story" ? SOCIAL_MUSIC_REVIEW.story : SOCIAL_MUSIC_REVIEW.post;
  const author = scan.authorName?.trim();
  return author ? `${label} · ${author}` : label;
}

function reviewSecondary(scan: MusicReviewScan): string {
  if (scan.status === "pending") {
    return `${SOCIAL_MUSIC_REVIEW.unfinishedDetail} ${scan.assetId}`;
  }
  const recording = [scan.vendorTitle, scan.vendorArtist].filter(Boolean).join(" — ");
  const score = scan.vendorScore == null ? null : `score ${scan.vendorScore}`;
  return [recording || SOCIAL_MUSIC_REVIEW.matchFallback, score, scan.assetId].filter(Boolean).join(" · ");
}

/** Staff directory rows. Phone stacks via the shared directory row. No end-user route. */
export function musicReviewDirectoryRows(scans: readonly MusicReviewScan[]): StaffDirectoryRowModel[] {
  return scans.map((scan) => ({
    id: scan.id,
    name: reviewName(scan),
    secondary: reviewSecondary(scan),
    trailing: scan.status === "blocked" ? SOCIAL_MUSIC_REVIEW.blocked : SOCIAL_MUSIC_REVIEW.unfinished,
  }));
}
