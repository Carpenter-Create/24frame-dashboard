import { SocialPostOpenPage } from "@/components/social/social-post-open-page";

// Soft-nav from a Social route. The feed stays mounted underneath.
// docs/design-locks/social-post-comment-open-lock-v1.md
export default async function SocialPostModalPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <SocialPostOpenPage postId={decodeURIComponent(postId)} dismiss="back" />;
}
