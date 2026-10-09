import type { SocialMediaItem } from "@/lib/social-media";
import type { SocialUploadProgress } from "@/lib/social-media-upload";
import { SOCIAL } from "@/lib/social";

// The welcome video from the 24Frame camera (social-profile-edit-window-lock-v1
// §4): upload the clip to the posts lane, then save it as the profile's
// welcome video. Never a post. Every way this can fail comes back as a
// result, never a throw, so the camera always gets its controls back.

export type SocialWelcomeClipOutcome =
  | { ok: true }
  | { ok: false; error: string; aborted?: boolean };

export async function saveSocialWelcomeClip({
  file,
  upload,
  save,
  signal,
  onProgress,
}: {
  file: File;
  upload: (
    file: File,
    options: { signal?: AbortSignal; onProgress?: (progress: SocialUploadProgress) => void },
  ) => Promise<{ item?: SocialMediaItem; error?: string; aborted?: boolean }>;
  save: (form: FormData) => Promise<{ error?: string }>;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<SocialWelcomeClipOutcome> {
  let uploaded: { item?: SocialMediaItem; error?: string; aborted?: boolean };
  try {
    uploaded = await upload(file, {
      signal,
      onProgress: (progress) => {
        if (progress.percent != null) onProgress?.(progress.percent);
      },
    });
  } catch {
    return { ok: false, error: SOCIAL.home.uploadFailed };
  }
  if (uploaded.aborted || signal?.aborted) return { ok: false, error: SOCIAL.home.uploadFailed, aborted: true };
  if (uploaded.error || !uploaded.item) return { ok: false, error: uploaded.error ?? SOCIAL.home.uploadFailed };

  const form = new FormData();
  form.set("media", JSON.stringify([uploaded.item]));
  let result: { error?: string };
  try {
    result = await save(form);
  } catch {
    // A dropped connection, a server error, or an action from before a
    // deploy: the save did not answer.
    return { ok: false, error: SOCIAL.home.uploadFailed };
  }
  if (result?.error) return { ok: false, error: result.error };
  return { ok: true };
}
