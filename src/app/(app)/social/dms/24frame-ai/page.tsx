import { SocialFrameAiThread } from "@/components/social/social-frame-ai-thread";
import { loadSocialFrameAiThread } from "@/app/(app)/aggregation/messages/ask-globee-actions";
import { loadSocialFrameAiShare } from "@/lib/social-frame-ai-share";
import { readSocialFrameAiShareSearch } from "@/lib/social-frame-ai";
import { requireSocialSession } from "@/lib/social-session";

// DM-shaped 24Frame AI thread. A distinct path so the house shell cannot
// treat the open as the Messages list. Brain is Ask 24Frame AI.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

export default async function SocialFrameAiPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([
    requireSocialSession(),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const shareQuery = readSocialFrameAiShareSearch(sp);
  const [thread, share] = await Promise.all([
    loadSocialFrameAiThread(),
    loadSocialFrameAiShare(session.supabase, shareQuery),
  ]);

  return (
    <SocialFrameAiThread
      ready={thread.ready}
      conversationId={thread.conversationId}
      messages={thread.messages}
      share={share}
    />
  );
}
