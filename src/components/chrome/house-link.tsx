"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

import { useHouseClient } from "./house-client-shell";

// One house nav primitive. Chrome, dock, rails, and Social tabs must use
// this — not raw next/link. Warm dests stay on the mounted tree; cold dests
// still go through Next for the first RSC paint.
// The caller's onClick runs first and may preventDefault to take the click
// over. Callers must not call navigateOwned too: this owns the hop.

export function HouseLink({
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const house = useHouseClient();
  return (
    <Link
      {...props}
      href={href}
      data-house-link=""
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (typeof href !== "string") return;
        if (house?.navigateOwned(href, event)) {
          event.preventDefault();
        }
      }}
    />
  );
}
