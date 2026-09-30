"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { SocialIcon } from "@/components/social/social-icon";
import { SOCIAL, SOCIAL_ROUTES, exploreExitUsesPriorRoute } from "@/lib/social";
import { SOCIAL_EXPLORE_EXIT_CLASS } from "@/lib/social-chrome";

// Desktop Explore Exit. The href is Social home. A same-origin
// referrer that is not Explore itself uses history instead.
export function SocialExploreExit() {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (exploreExitUsesPriorRoute(document.referrer, window.location.origin)) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={SOCIAL_ROUTES.home}
      data-social-explore-exit=""
      className={SOCIAL_EXPLORE_EXIT_CLASS}
      onClick={onClick}
    >
      <span aria-hidden="true" className="inline-flex">
        <SocialIcon name="x" size={16} />
      </span>
      {SOCIAL.explore.exit}
    </Link>
  );
}
