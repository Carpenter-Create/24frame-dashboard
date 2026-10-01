"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useState,
  type MouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { Close44 } from "@/components/chrome/house";
import { useHouseDesktop } from "@/components/chrome/house-overlay";
import { SocialCreateMediaTile } from "@/components/social/social-create-media";
import { SocialIcon } from "@/components/social/social-icon";
import {
  SOCIAL_CREATE_SHEET_DESKTOP_HOST_CLASS,
  SOCIAL_CREATE_SHEET_DESKTOP_SURFACE_CLASS,
  SOCIAL_CREATE_SHEET_HEAD_CLASS,
  SOCIAL_CREATE_SHEET_HOST_CLASS,
  SOCIAL_CREATE_SHEET_PRESENTATION,
  SOCIAL_CREATE_SHEET_SCRIM_CLASS,
  SOCIAL_CREATE_SHEET_SURFACE_CLASS,
  SOCIAL_CREATE_SHEET_TITLE_CLASS,
  SOCIAL_CREATE_TILE_CLASS,
  SOCIAL_CREATE_TILE_ICON_CLASS,
  SOCIAL_CREATE_TILE_LABEL_CLASS,
  SOCIAL_CREATE_TILE_WELL_CLASS,
  SOCIAL_CREATE_TILES,
  SOCIAL_CREATE_TILES_CLASS,
  type SocialCreateTileId,
} from "@/lib/social-create-sheet";
import { SOCIAL_ICON_SIZE_CREATE_TILE } from "@/lib/social-icons";
import { rememberSocialGoLiveOpener } from "@/lib/social-go-live-nav";
import { SOCIAL } from "@/lib/social";

type CreateTriggerProps = {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  "aria-haspopup"?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
};

type CreateTrigger = ReactElement<CreateTriggerProps & Record<string, unknown>>;

export function SocialCreateTile({
  tile,
  onPick,
}: {
  tile: (typeof SOCIAL_CREATE_TILES)[number];
  onPick?: () => void;
}) {
  if (tile.id === "media") {
    return <SocialCreateMediaTile tile={tile} />;
  }

  return (
    <Link
      href={tile.href}
      data-social-create-tile={tile.id}
      className={SOCIAL_CREATE_TILE_CLASS}
      onClick={() => {
        if (tile.id === "live") {
          rememberSocialGoLiveOpener(`${window.location.pathname}${window.location.search}`);
        }
        onPick?.();
      }}
    >
      <span data-social-create-tile-well="" className={SOCIAL_CREATE_TILE_WELL_CLASS}>
        <SocialIcon
          name={tile.icon}
          size={SOCIAL_ICON_SIZE_CREATE_TILE}
          className={SOCIAL_CREATE_TILE_ICON_CLASS}
        />
      </span>
      <span className={SOCIAL_CREATE_TILE_LABEL_CLASS}>{tile.label}</span>
    </Link>
  );
}

export function SocialCreateTiles({
  onPick,
}: {
  onPick?: (id: SocialCreateTileId) => void;
}) {
  return (
    <div data-social-create-tiles="" className={SOCIAL_CREATE_TILES_CLASS}>
      {SOCIAL_CREATE_TILES.map((tile) => (
        <SocialCreateTile
          key={tile.id}
          tile={tile}
          onPick={onPick ? () => onPick(tile.id) : undefined}
        />
      ))}
    </div>
  );
}

export function SocialCreateSheet({
  trigger,
  defaultOpen = false,
}: {
  trigger: CreateTrigger;
  defaultOpen?: boolean;
}) {
  const titleId = useId();
  const desktop = useHouseDesktop();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  const triggerNode = cloneElement(trigger, {
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? titleId : undefined,
    onClick: (event) => {
      trigger.props.onClick?.(event);
      setOpen(true);
    },
  });

  const head = (
    <div className={SOCIAL_CREATE_SHEET_HEAD_CLASS}>
      <Close44 label={SOCIAL.create.close} onClick={close} />
      <h2 id={titleId} className={SOCIAL_CREATE_SHEET_TITLE_CLASS}>
        {SOCIAL.create.title}
      </h2>
      <span className="size-[44px] shrink-0" aria-hidden />
    </div>
  );
  const tiles = <SocialCreateTiles onPick={close} />;
  const sheet = open ? (
    desktop ? (
      <div
        data-social-create-sheet=""
        data-social-create-sheet-presentation={SOCIAL_CREATE_SHEET_PRESENTATION}
        data-house-overlay-host="house-dialog"
        className={SOCIAL_CREATE_SHEET_DESKTOP_HOST_CLASS}
      >
        <button
          type="button"
          aria-label={SOCIAL.create.close}
          className={SOCIAL_CREATE_SHEET_SCRIM_CLASS}
          onClick={close}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={SOCIAL_CREATE_SHEET_DESKTOP_SURFACE_CLASS}
        >
          {head}
          {tiles}
        </div>
      </div>
    ) : (
      <div
        data-social-create-sheet=""
        data-social-create-sheet-presentation={SOCIAL_CREATE_SHEET_PRESENTATION}
        data-house-overlay-host="app-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={SOCIAL_CREATE_SHEET_HOST_CLASS}
      >
        <button
          type="button"
          aria-label={SOCIAL.create.close}
          className={SOCIAL_CREATE_SHEET_SCRIM_CLASS}
          onClick={close}
        />
        <div className={SOCIAL_CREATE_SHEET_SURFACE_CLASS}>
          {head}
          {tiles}
        </div>
      </div>
    )
  ) : null;

  return (
    <>
      {triggerNode}
      {sheet && typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet}
    </>
  );
}
