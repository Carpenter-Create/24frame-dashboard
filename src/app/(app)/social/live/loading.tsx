import { SOCIAL_STORY_STUDIO_CLASS } from "@/lib/social-chrome";

// Instant camera shell. Not the write-compose page and not the create skeleton.
export default function Loading() {
  return (
    <div
      data-house-rsc-fallback=""
      data-social-go-live-page=""
      className={SOCIAL_STORY_STUDIO_CLASS}
    />
  );
}
