"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { SocialIcon } from "@/components/social/social-icon";
import { cn } from "@/lib/cn";
import {
  HOUSE_HEADER_EXIT_COMPACT_CLASS,
  HOUSE_HEADER_EXIT_LABEL_CLASS,
} from "@/lib/house-lead-chrome";
import { SOCIAL, SOCIAL_ROUTES, exploreExitUsesPriorRoute } from "@/lib/social";
import { SOCIAL_EXPLORE_EXIT_CLASS } from "@/lib/social-chrome";
import { socialFeedReelOpenedExplore } from "@/lib/social-feed-reels";

// Desktop Explore Exit. The href is Social home. A same-origin
// referrer that is not Explore itself uses history instead. So does an
// Explore address a feed Reels tile opened in this tab: Back lands on the
// feed, where the house shell restores its scroll (same spot).
// md to lg the chip shows only its X; "Exit" stays the accessible
// name (shell-unified-chrome-lock-v1 header width budget).
export function SocialExploreExit() {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    const here = `${window.location.pathname}${window.location.search}`;
    if (
      exploreExitUsesPriorRoute(document.referrer, window.location.origin) ||
      socialFeedReelOpenedExplore(here)
    ) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={SOCIAL_ROUTES.home}
      data-social-explore-exit=""
      className={cn(SOCIAL_EXPLORE_EXIT_CLASS, HOUSE_HEADER_EXIT_COMPACT_CLASS)}
      onClick={onClick}
    >
      <span aria-hidden="true" className="inline-flex">
        <SocialIcon name="x" size={16} />
      </span>
      <span className={HOUSE_HEADER_EXIT_LABEL_CLASS}>{SOCIAL.explore.exit}</span>
    </Link>
  );
}
