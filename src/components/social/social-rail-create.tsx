"use client";

import { cloneElement, useCallback, useId, useState, type MouseEvent, type ReactElement } from "react";

import { SocialWriteComposeSheet } from "@/components/social/social-write-compose-sheet";
import { SOCIAL } from "@/lib/social";

// Desktop Create (docs/design-locks/social-desktop-create-composer-lock-v1.md,
// Adam 2026-10-08, "Open the composer"): the side menu's Create row opens
// the composer window straight away, the same one the Feed's "Share
// something" opens. Media and Go live are in its tool row. No chooser.
// The phone dock's + still fans Media · Write · Go live (social-create-fan).

type CreateTrigger = ReactElement<
  {
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    "aria-haspopup"?: "dialog";
    "aria-expanded"?: boolean;
    "aria-controls"?: string;
  } & Record<string, unknown>
>;

export function SocialRailCreate({
  trigger,
  authorName,
  authorPhotoUrl = null,
}: {
  trigger: CreateTrigger;
  /** The account's name from the shell; "You" when unknown (the Create page's fallback). */
  authorName?: string | null;
  authorPhotoUrl?: string | null;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      {cloneElement(trigger, {
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-controls": open ? titleId : undefined,
        onClick: (event: MouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          setOpen(true);
        },
      })}
      <SocialWriteComposeSheet
        open={open}
        onClose={close}
        titleId={titleId}
        authorName={authorName || SOCIAL.home.you}
        authorPhotoUrl={authorPhotoUrl}
      />
    </>
  );
}
