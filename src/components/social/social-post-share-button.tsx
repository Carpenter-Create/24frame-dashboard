"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

import { SocialIcon } from "@/components/social/social-icon";
import { cn } from "@/lib/cn";
import {
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_ROUND_GLYPH,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_POST_ACTION } from "@/lib/social-icons";
import { SOCIAL } from "@/lib/social";
import { POST_SHARE_TOAST_MS } from "@/lib/social-post-share";

const SocialPostShareSheet = dynamic(() =>
  import("./social-post-share-sheet").then((mod) => mod.SocialPostShareSheet),
);

export function SocialPostShareSentToast() {
  const node = (
    <div
      data-social-post-share-toast=""
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
    >
      <p
        data-social-post-share-sent=""
        role="status"
        aria-live="polite"
        className="rounded-[8px] bg-[#181818] px-4 py-2 t-body-sm font-medium text-white shadow-none"
      >
        {SOCIAL.post.sent}
      </p>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
}

export function SocialPostShareButton({
  postId,
  tone = "canvas",
  round = false,
}: {
  postId: string;
  tone?: "canvas" | "stage";
  /** The feed post card's round Share. */
  round?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return undefined;
    const id = window.setTimeout(() => setSent(false), POST_SHARE_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [sent]);

  return (
    <>
      <button
        type="button"
        data-social-post-share=""
        aria-label={SOCIAL.post.share}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          round
            ? SOCIAL_POST_ROUND_CLASS
            : cn(SOCIAL_POST_ACTION_HIT_CLASS, tone === "stage" && "text-band-ink")
        }
        onClick={() => setOpen(true)}
      >
        <SocialIcon
          name="paper-plane-tilt"
          size={round ? SOCIAL_POST_ROUND_GLYPH : SOCIAL_ICON_SIZE_POST_ACTION}
          weight={tone === "stage" ? "bold" : undefined}
        />
      </button>
      {open ? (
        <SocialPostShareSheet
          postId={postId}
          open
          onClose={() => setOpen(false)}
          onSent={() => setSent(true)}
        />
      ) : null}
      {sent ? <SocialPostShareSentToast /> : null}
    </>
  );
}
