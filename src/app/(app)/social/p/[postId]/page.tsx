import { SocialPostOpenPage } from "@/components/social/social-post-open-page";

export default async function SocialPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <SocialPostOpenPage postId={decodeURIComponent(postId)} dismiss="home" />;
}
