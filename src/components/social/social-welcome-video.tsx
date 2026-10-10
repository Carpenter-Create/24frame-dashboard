import { InlineNotice } from "@/components/ui/inline-notice";
import { SOCIAL, type SocialMusicNotice } from "@/lib/social";
import { SOCIAL_WELCOME_VIDEO_CLASS } from "@/lib/social-chrome";

// Presence only. The profile column has no Mux playback id, so the band
// is an empty face. It does not take a media URL. The owner may see a
// locked notice while the welcome video is held.
export function SocialWelcomeVideo({
  present,
  notice = null,
}: {
  present: boolean;
  notice?: SocialMusicNotice | null;
}) {
  if (!present) return null;
  return (
    <section data-social-welcome-video="" className={SOCIAL_WELCOME_VIDEO_CLASS}>
      <div data-social-video-closed="" className="aspect-video w-full bg-surface-muted" />
      {notice ? (
        <InlineNotice data-social-welcome-music="" className="mt-3 whitespace-normal break-words">
          {SOCIAL.music[notice]}
        </InlineNotice>
      ) : null}
    </section>
  );
}
