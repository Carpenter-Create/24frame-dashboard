import { socialCreateHref, type SocialCreateKind } from "@/lib/social";
import { planSocialComposeAttach } from "@/lib/social-compose-video";
import { socialMediaKindFor, type SocialMediaKind } from "@/lib/social-media";

// Adam lock 2026-09-20 — Create Media is one mixed-library intent.
// Media tile opens the camera roll immediately (`image/*,video/*`).
// Adam 2026-09-28 — after pick, one screen: preview, caption, Post.
// The empty "Video" + Next card is not a step. Photo and Video are not tiles.

export const SOCIAL_CREATE_MEDIA_ACCEPT = "image/*,video/*";
// Home composer Camera. Still capture into the same Create media review.
// Not a second uploader and not a second viewfinder.
export const SOCIAL_CREATE_CAMERA_ACCEPT = "image/*";
export const SOCIAL_CREATE_MEDIA_STEP_PARAM = "step";
export const SOCIAL_CREATE_MEDIA_STEPS = ["pick", "review", "caption"] as const;
export type SocialCreateMediaStep = (typeof SOCIAL_CREATE_MEDIA_STEPS)[number];

export function parseSocialCreateMediaStep(
  raw: string | string[] | undefined | null,
): SocialCreateMediaStep {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Older links used step=review for the empty label card. That card is gone.
  if (value === "review" || value === "caption") return "caption";
  return "pick";
}

export function socialCreateMediaHref(step?: Exclude<SocialCreateMediaStep, "pick">): string {
  const base = socialCreateHref("media");
  return step ? `${base}&${SOCIAL_CREATE_MEDIA_STEP_PARAM}=${step}` : base;
}

export function socialCreateKindFromMediaFile(
  file: Pick<File, "type">,
): Extract<SocialCreateKind, "media"> | null {
  return socialMediaKindFor(file.type) ? "media" : null;
}

export function socialCreateKindFromMediaFiles(
  files: ArrayLike<Pick<File, "type">>,
): Extract<SocialCreateKind, "media"> | null {
  const first = files[0];
  return first ? socialCreateKindFromMediaFile(first) : null;
}

export function socialCreateMediaStepAfterPick(
  files: ArrayLike<unknown>,
  requested: SocialCreateMediaStep | null | undefined,
): SocialCreateMediaStep {
  if (files.length === 0) return "pick";
  // A picked file skips the empty card even when the URL still says pick or review.
  switch (requested) {
    case "pick":
    case "review":
    case "caption":
    case null:
    case undefined:
      return "caption";
    default: {
      const unreachable: never = requested;
      return unreachable;
    }
  }
}

export function socialCreateMediaLocalId(
  file: { name: string; size: number; lastModified: number },
  index: number,
): string {
  return `${index}:${file.size}:${file.lastModified}:${file.name}`;
}

export function socialCreateMediaPreviewUrl(file: File): string {
  const create = globalThis.URL?.createObjectURL;
  if (typeof create !== "function") return "";
  return create(file);
}

export type SocialCreateMediaRow = {
  index: number;
  localId: string;
  file: File;
  kind: SocialMediaKind;
};

/** Files the single create screen can preview. The first rejection wins. */
export function socialCreateMediaRows(files: ArrayLike<File>): {
  rows: SocialCreateMediaRow[];
  error: string;
} {
  const rows: SocialCreateMediaRow[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const raw = files[index];
    if (!raw) continue;
    const plan = planSocialComposeAttach(raw);
    if (!plan.ok) return { rows, error: plan.error };
    rows.push({
      index,
      localId: socialCreateMediaLocalId(plan.file, index),
      file: plan.file,
      kind: plan.kind,
    });
  }
  return { rows, error: "" };
}
