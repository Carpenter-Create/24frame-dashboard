"use client";

import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  countMenuSurfaceItems,
  MENU_SURFACE_ACCENT_CLASS,
  MENU_SURFACE_ACCENT_CLIP_CLASS,
  MENU_SURFACE_ITEM_CLASS,
  MENU_SURFACE_ITEM_DANGER_CLASS,
  MENU_SURFACE_SEPARATOR_CLASS,
  menuSurfaceContentClass,
  menuSurfaceDensityForCount,
  type MenuSurfaceDensity,
} from "@/lib/menu-surface";

// Optional Identity half-bar. Same chrome on the desktop dropdown and the
// mobile account sheet. OFF unless the instance passes accent.
export function MenuSurfaceAccent() {
  return (
    <div aria-hidden className={MENU_SURFACE_ACCENT_CLIP_CLASS}>
      <div data-menu-surface-accent="" className={MENU_SURFACE_ACCENT_CLASS} />
    </div>
  );
}

function densityFromChildren(
  children: ReactNode,
  density?: MenuSurfaceDensity,
): MenuSurfaceDensity {
  if (density) return density;
  const items = Children.toArray(children).filter((child) => isValidElement(child));
  return menuSurfaceDensityForCount(countMenuSurfaceItems(items));
}

export function MenuSurfaceContent({
  className,
  accent = false,
  density,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuContent> & {
  accent?: boolean;
  density?: MenuSurfaceDensity;
}) {
  const resolved = densityFromChildren(children, density);
  return (
    <DropdownMenuContent
      {...props}
      data-menu-surface-density={resolved}
      className={cn(
        menuSurfaceContentClass(resolved),
        accent && "relative",
        className,
      )}
    >
      {accent ? <MenuSurfaceAccent /> : null}
      {children}
    </DropdownMenuContent>
  );
}

export function MenuSurfaceItem({
  danger = false,
  className,
  ...props
}: ComponentProps<typeof DropdownMenuItem> & { danger?: boolean }) {
  return (
    <DropdownMenuItem
      className={cn(
        MENU_SURFACE_ITEM_CLASS,
        danger && MENU_SURFACE_ITEM_DANGER_CLASS,
        className,
      )}
      {...props}
    />
  );
}

/** One choice of several (a radio row): the same row as MenuSurfaceItem. */
export function MenuSurfaceRadioItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuRadioItem>) {
  return <DropdownMenuRadioItem className={cn(MENU_SURFACE_ITEM_CLASS, className)} {...props} />;
}

export function MenuSurfaceSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuSeparator>) {
  return (
    <DropdownMenuSeparator
      data-menu-surface-separator=""
      className={cn(MENU_SURFACE_SEPARATOR_CLASS, className)}
      {...props}
    />
  );
}

// Thread ··· instances the same surface. Items differ; chrome does not.
// Half-bar stays forced OFF — Identity only.
export function ThreadPopoverContent(
  props: ComponentProps<typeof MenuSurfaceContent>,
) {
  return <MenuSurfaceContent data-thread-popover="" {...props} accent={false} />;
}

export function ThreadPopoverItem({
  danger = false,
  ...props
}: ComponentProps<typeof MenuSurfaceItem>) {
  return (
    <MenuSurfaceItem
      data-thread-popover-item={danger ? "delete" : ""}
      danger={danger}
      {...props}
    />
  );
}

export function ThreadPopoverSeparator(
  props: ComponentProps<typeof MenuSurfaceSeparator>,
) {
  return <MenuSurfaceSeparator data-thread-popover-hairline="" {...props} />;
}
