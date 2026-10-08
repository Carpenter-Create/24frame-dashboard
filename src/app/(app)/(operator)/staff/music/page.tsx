import { redirect } from "next/navigation";

import { StaffDirectoryList } from "@/components/staff/staff-directory-list";
import { PageHeader } from "@/components/ui/page-header";
import { directoryCountLabel, STAFF_DIRECTORY_EMPTY_CLASS } from "@/lib/staff-directory";
import { musicReviewDirectoryRows, SOCIAL_MUSIC_REVIEW } from "@/lib/social-music-review";
import { isMusicReviewStaff, loadMusicReviewQueue } from "@/lib/social-music-review-server";

export default async function MusicReviewPage() {
  if (!(await isMusicReviewStaff())) redirect("/");
  const scans = await loadMusicReviewQueue();
  const rows = musicReviewDirectoryRows(scans);
  return (
    <>
      <PageHeader title={SOCIAL_MUSIC_REVIEW.title} subtitle={SOCIAL_MUSIC_REVIEW.subtitle} />
      <StaffDirectoryList
        rows={rows}
        countLabel={directoryCountLabel(rows.length, "video", "videos")}
        empty={<p className={STAFF_DIRECTORY_EMPTY_CLASS}>{SOCIAL_MUSIC_REVIEW.empty}</p>}
      />
    </>
  );
}
