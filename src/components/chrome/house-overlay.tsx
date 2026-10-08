"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { Close44 } from "@/components/chrome/house";
import { cn } from "@/lib/cn";
import {
  APP_SHEET_FULL_HOST_CLASS,
  APP_SHEET_LOCK_HOST_CLASS,
  APP_SHEET_LOCK_SURFACE_CLASS,
  HOUSE_DIALOG_CONFIRM_CLASS,
  HOUSE_DIALOG_FORM_CLASS,
  HOUSE_DIALOG_HOST_CLASS,
  HOUSE_DIALOG_PANEL_CLASS,
  HOUSE_DRAWER_HOST_CLASS,
  HOUSE_DRAWER_PANEL_CLASS,
  HOUSE_OVERLAY_SCRIM_CLASS,
} from "@/lib/house-overlay";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

/** The host right now, for event and effect code that runs before the
 *  first client render settles (`useHouseDesktop` reads false until then). */
export function isHouseDesktop(): boolean {
  return typeof window !== "undefined" && desktopSnapshot();
}

/** Client-opened overlays. The first client render already knows the host. */
export function useHouseDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
}

export function HouseOverlayHead({
  title,
  titleId,
  closeLabel,
  onClose,
}: {
  title: string;
  titleId?: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-[var(--space-4)]">
      <h2 id={titleId} className="min-w-0 flex-1 t-body font-medium text-ink">
        {title}
      </h2>
      <Close44 label={closeLabel} onClick={onClose} />
    </div>
  );
}

export function AppSheetFrame({
  span = "card",
  label,
  titleId,
  children,
  className,
}: {
  span?: "card" | "full";
  label?: string;
  titleId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-house-overlay-host="app-sheet"
      data-app-sheet-span={span}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={titleId}
      className={cn(span === "full" ? APP_SHEET_FULL_HOST_CLASS : APP_SHEET_LOCK_HOST_CLASS, className)}
    >
      {children}
    </div>
  );
}

export function AppSheetCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(APP_SHEET_LOCK_SURFACE_CLASS, "relative z-10", className)}>{children}</div>;
}

export function HouseDialogFrame({
  size = "form",
  label,
  titleId,
  onClose,
  closeLabel = "Close",
  panelClassName,
  children,
}: {
  size?: "confirm" | "form";
  label?: string;
  titleId?: string;
  onClose?: () => void;
  closeLabel?: string;
  /** An instance's own panel geometry, merged over the house panel. */
  panelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div data-house-overlay-host="house-dialog" className={HOUSE_DIALOG_HOST_CLASS}>
      {onClose ? <HouseScrim label={closeLabel} onClose={onClose} /> : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={titleId}
        className={cn(
          "relative z-10",
          HOUSE_DIALOG_PANEL_CLASS,
          size === "confirm" ? HOUSE_DIALOG_CONFIRM_CLASS : HOUSE_DIALOG_FORM_CLASS,
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function HouseDrawerFrame({
  label,
  titleId,
  onClose,
  closeLabel,
  children,
}: {
  label?: string;
  titleId?: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <div data-house-overlay-host="house-drawer" className={HOUSE_DRAWER_HOST_CLASS}>
      <button type="button" aria-label={closeLabel} className={HOUSE_OVERLAY_SCRIM_CLASS} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={titleId}
        className={HOUSE_DRAWER_PANEL_CLASS}
      >
        {children}
      </aside>
    </div>
  );
}

export function HouseScrim({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  return (
    <button type="button" aria-label={label} className={`${HOUSE_OVERLAY_SCRIM_CLASS} app-sheet-scrim-fade`} onClick={onClose} />
  );
}
