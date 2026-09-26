"use client";

import { useLinkStatus } from "next/link";
import { useCallback, useState } from "react";

import { useHouseClient, useHousePathname } from "./house-client-shell";

import {
  houseNavActivePath,
  houseNavIgnorePendingClick,
  houseNavPendingSettled,
  type HouseNavClickLike,
} from "@/lib/house-nav-pending";

// Instant chrome: click lights the dest / workspace before the RSC
// page resolves. useLinkStatus covers the in-flight Link; onClick
// covers the same tick. A settled pathname drops the optimistic href.

export function useHouseNavPending() {
  const house = useHouseClient();
  const pathname = useHousePathname();
  const location = house?.href ?? pathname;
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const markPending = useCallback((href: string, event?: HouseNavClickLike) => {
    if (event && houseNavIgnorePendingClick(event)) return;
    setPendingHref(href);
  }, []);

  const livePending =
    pendingHref && houseNavPendingSettled(location, pendingHref) ? null : pendingHref;

  return {
    activePath: houseNavActivePath(pathname, livePending),
    markPending,
    pendingHref: livePending,
  };
}

export function HouseNavPendingProbe({
  href,
  onPending,
}: {
  href: string;
  onPending: (href: string) => void;
}) {
  const { pending } = useLinkStatus();
  if (pending) onPending(href);
  return null;
}
