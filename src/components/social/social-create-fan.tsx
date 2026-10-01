"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Broadcast, Image, PencilSimple, type Icon } from "@phosphor-icons/react";

import { useSocialCreateMediaPick } from "@/components/social/social-create-media";
import { HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT } from "@/lib/house-phone-shell";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_CREATE_TILES } from "@/lib/social-create-sheet";
import {
  SOCIAL_CREATE_FAN_ANCHOR_CLASS,
  SOCIAL_CREATE_FAN_CIRCLE_CLASS,
  SOCIAL_CREATE_FAN_DISMISS_MS,
  SOCIAL_CREATE_FAN_ICON_CLASS,
  SOCIAL_CREATE_FAN_ITEM_CLASS,
  SOCIAL_CREATE_FAN_LABEL_CLASS,
  SOCIAL_CREATE_FAN_MENU_CLASS,
  SOCIAL_CREATE_FAN_PLUS_CLASS,
  SOCIAL_CREATE_FAN_SCRIM_CLASS,
  SOCIAL_CREATE_FAN_STAGGER_MS,
  socialCreateFanPoints,
} from "@/lib/social-create-fan";
import { cn } from "@/lib/cn";

const FAN_ICONS = {
  image: Image,
  "pencil-simple": PencilSimple,
  broadcast: Broadcast,
} satisfies Record<(typeof SOCIAL_CREATE_TILES)[number]["icon"], Icon>;

type FanTriggerProps = {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  children?: ReactNode;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: string | boolean;
  "aria-controls"?: string;
};

type FanTrigger = ReactElement<FanTriggerProps & Record<string, unknown>>;

export function SocialCreateFan({
  trigger,
  hidden = false,
  defaultOpen = false,
}: {
  trigger: FanTrigger;
  hidden?: boolean;
  defaultOpen?: boolean;
}) {
  const menuId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [present, setPresent] = useState(defaultOpen);
  const [closing, setClosing] = useState(false);
  const { openPicker, input } = useSocialCreateMediaPick();
  const points = socialCreateFanPoints();
  const [seenHidden, setSeenHidden] = useState(hidden);
  if (hidden !== seenHidden) {
    setSeenHidden(hidden);
    if (hidden) {
      setOpen(false);
      setPresent(false);
      setClosing(false);
    }
  }

  useEffect(() => {
    if (!present || open || closing || hidden) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [closing, hidden, open, present]);

  useEffect(() => {
    if (open || !present) return undefined;
    const id = window.setTimeout(() => {
      setPresent(false);
      setClosing(false);
    }, SOCIAL_CREATE_FAN_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [open, present]);

  useEffect(() => {
    if (!present) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setClosing(true);
      setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      setClosing(true);
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [present]);

  function openFan() {
    setClosing(false);
    setPresent(true);
  }

  function closeFan() {
    setClosing(true);
    setOpen(false);
  }

  const triggerNode = cloneElement(trigger, {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: (event) => {
      trigger.props.onClick?.(event);
      if (open) closeFan();
      else openFan();
    },
    children: (
      <span
        data-social-create-fan-plus=""
        data-open={open ? "" : undefined}
        className={SOCIAL_CREATE_FAN_PLUS_CLASS}
      >
        {trigger.props.children}
      </span>
    ),
  });

  const menu = (
    <div
      id={menuId}
      role="menu"
      aria-hidden={open ? undefined : true}
      aria-label={SOCIAL.create.title}
      data-social-create-fan=""
      data-social-create-fan-open={open ? "" : undefined}
      className={SOCIAL_CREATE_FAN_MENU_CLASS}
    >
      {SOCIAL_CREATE_TILES.map((tile, index) => {
        const point = points[index];
        const Icon = FAN_ICONS[tile.icon];
        const delay = SOCIAL_CREATE_FAN_STAGGER_MS[index] ?? 0;
        const style = {
          "--social-create-fan-x": `${point?.x ?? 0}px`,
          "--social-create-fan-y": `${point?.y ?? 0}px`,
          "--social-create-fan-delay": `${delay}ms`,
        } as CSSProperties;
        const body = (
          <>
            <span data-social-create-fan-circle="" className={SOCIAL_CREATE_FAN_CIRCLE_CLASS}>
              <Icon
                className={SOCIAL_CREATE_FAN_ICON_CLASS}
                weight={HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT}
                aria-hidden
              />
            </span>
            <span data-social-create-fan-label="" className={SOCIAL_CREATE_FAN_LABEL_CLASS}>
              {tile.label}
            </span>
          </>
        );
        if (tile.id === "media") {
          return (
            <Link
              key={tile.id}
              href={tile.href}
              role="menuitem"
              data-social-create-fan-item={tile.id}
              data-open={open ? "" : undefined}
              style={style}
              className={SOCIAL_CREATE_FAN_ITEM_CLASS}
              onClick={(event) => {
                event.preventDefault();
                openPicker();
                closeFan();
              }}
            >
              {body}
            </Link>
          );
        }
        return (
          <Link
            key={tile.id}
            href={tile.href}
            role="menuitem"
            data-social-create-fan-item={tile.id}
            data-open={open ? "" : undefined}
            style={style}
            className={SOCIAL_CREATE_FAN_ITEM_CLASS}
            onClick={closeFan}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );

  const scrim = (
    <button
      type="button"
      aria-label={SOCIAL.create.close}
      data-social-create-fan-scrim=""
      className={SOCIAL_CREATE_FAN_SCRIM_CLASS}
      onClick={closeFan}
    />
  );

  return (
    <>
      <span
        ref={anchorRef}
        data-social-create-fan-anchor=""
        className={cn(SOCIAL_CREATE_FAN_ANCHOR_CLASS, open && "z-10")}
      >
        {triggerNode}
        {present ? menu : null}
        {input}
      </span>
      {present
        ? typeof document !== "undefined"
          ? createPortal(scrim, document.body)
          : scrim
        : null}
    </>
  );
}
