"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { HouseLink } from "./house-link";
import { X } from "@phosphor-icons/react";

import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";

import { accountPhotoSrc } from "@/lib/account-avatar";
import { cn } from "@/lib/cn";
import {
  APP_SHEET_HAIRLINE_CLASS,
  APP_SHEET_HEAD_CLASS,
  APP_SHEET_SURFACE_CLASS,
  CLOSE_44_CLASS,
  HOUSE_EMPTY_CLASS,
  IDENTITY_AVATAR_CLASS,
  IDENTITY_BLOCK_CLASS,
  IDENTITY_EMAIL_CLASS,
  IDENTITY_NAME_CLASS,
  IDENTITY_WHO_CLASS,
  SHEET_GROUP_CLASS,
  SHEET_GROUP_INSET_CLASS,
  SHEET_GROUP_INSET_ITEM_CLASS,
  SHEET_GROUP_INSET_RULE_CLASS,
  SHEET_GROUP_ITEM_CLASS,
  SHEET_GROUP_LABEL_CLASS,
  TEXT_ACTION_CLASS,
} from "@/lib/house-sheet";

// 543:562 Close/44 — live muted 44 circle. Glyph only: Phosphor X Bold 16.
export function Close44({
  label,
  className,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(CLOSE_44_CLASS, className)}
    >
      <X className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
    </button>
  );
}

// 543:563 Text action — 13 Regular Sporty Blue.
export function TextAction({
  href,
  children,
  className,
  ...props
}: ComponentProps<typeof HouseLink>) {
  return (
    <HouseLink href={href} className={cn(TEXT_ACTION_CLASS, className)} {...props}>
      {children}
    </HouseLink>
  );
}

// House empty — the same 15 Regular line as other empties. No icon, no card.
export function HouseEmpty({ children }: { children: ReactNode }) {
  return (
    <p data-house-empty="" className={HOUSE_EMPTY_CLASS}>
      {children}
    </p>
  );
}

// Face bytes, or the existing initial. onError drops a failed img so chrome
// never shows a broken circle. The layout passes ACCOUNT_PHOTO_HREF so the
// route re-signs; a 5-minute S3 GET is not held in the client shell.
export function IdentityPhoto({
  avatarInitial,
  photoUrl,
}: {
  avatarInitial: string;
  photoUrl?: string | null;
}) {
  const face = accountPhotoSrc(photoUrl);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = Boolean(face && brokenSrc === face);

  if (!face || broken) return avatarInitial;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin face route; handler signs a short-lived GET
    <img
      src={face}
      alt=""
      className="size-full object-cover"
      fetchPriority="high"
      decoding="async"
      onError={() => setBrokenSrc(face)}
    />
  );
}

// House identity circle — the one face disk. Header chrome, account
// sheet, and Team person rows consume this. Do not fork a lookalike.
export function IdentityAvatar({
  avatarInitial,
  photoUrl,
  className,
}: {
  avatarInitial: string;
  photoUrl?: string | null;
  className?: string;
}) {
  const face = accountPhotoSrc(photoUrl);
  return (
    <div
      data-identity-avatar=""
      data-identity-photo={face ? "" : undefined}
      className={cn(IDENTITY_AVATAR_CLASS, face ? "overflow-hidden" : null, className)}
    >
      <IdentityPhoto avatarInitial={avatarInitial} photoUrl={photoUrl} />
    </div>
  );
}

// 543:565 Identity block — 48 circle, name 15 Regular ink, email 13 tertiary.
// Always render name and email. Real values only — no dashes, no pill well.
export function IdentityBlock({
  avatarInitial,
  photoUrl,
  name,
  email,
  className,
}: {
  avatarInitial: string;
  photoUrl?: string | null;
  name: string;
  email: string;
  className?: string;
}) {
  return (
    <div data-identity-block="" className={cn(IDENTITY_BLOCK_CLASS, className)}>
      <IdentityAvatar avatarInitial={avatarInitial} photoUrl={photoUrl} />
      <div data-identity-who="" className={IDENTITY_WHO_CLASS}>
        <p data-identity-name="" className={IDENTITY_NAME_CLASS}>
          {name}
        </p>
        <p data-identity-email="" className={IDENTITY_EMAIL_CLASS}>
          {email}
        </p>
      </div>
    </div>
  );
}

// 543:570 Group — eyebrow then rows. inset opts into the grouped card:
// hairline between rows, no eyebrow gap. Account phone + desktop share it.
export function SheetGroup({
  label,
  children,
  className,
  inset = false,
  groupId,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  inset?: boolean;
  groupId?: string;
}) {
  const rows = Children.toArray(children).filter((child) => isValidElement(child));
  return (
    <div
      data-sheet-group=""
      data-sheet-group-id={groupId}
      data-sheet-group-inset={inset ? "" : undefined}
      className={cn(inset ? SHEET_GROUP_INSET_CLASS : SHEET_GROUP_CLASS, className)}
    >
      {label ? (
        <p data-sheet-group-label="" className={SHEET_GROUP_LABEL_CLASS}>
          {label}
        </p>
      ) : null}
      {inset
        ? rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 ? (
                <AppSheetHairline
                  data-sheet-group-rule=""
                  className={SHEET_GROUP_INSET_RULE_CLASS}
                />
              ) : null}
              {row}
            </Fragment>
          ))
        : children}
    </div>
  );
}

export function SheetGroupItem({
  href,
  onClick,
  children,
  item,
  pressed,
  label,
  inset = false,
  className,
}: {
  href?: string | null;
  onClick?: () => void;
  children: ReactNode;
  item?: string;
  pressed?: boolean;
  label?: string;
  inset?: boolean;
  className?: string;
}) {
  const base = inset ? SHEET_GROUP_INSET_ITEM_CLASS : SHEET_GROUP_ITEM_CLASS;
  const itemClass = className ? cn(base, className) : base;
  if (href) {
    return (
      <HouseLink
        href={href}
        onClick={onClick}
        data-sheet-group-item={item}
        className={itemClass}
        aria-label={label}
      >
        {children}
      </HouseLink>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        data-sheet-group-item={item}
        className={itemClass}
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return (
    <p data-sheet-group-item={item} className={itemClass}>
      {children}
    </p>
  );
}

// 543:576 App sheet chrome — same sheet as nav, different body.
export function AppSheetSurface({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn(APP_SHEET_SURFACE_CLASS, className)} {...props} />;
}

export function AppSheetHead({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn(APP_SHEET_HEAD_CLASS, className)} {...props} />;
}

export function AppSheetHairline({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn(APP_SHEET_HAIRLINE_CLASS, className)} {...props} />;
}
