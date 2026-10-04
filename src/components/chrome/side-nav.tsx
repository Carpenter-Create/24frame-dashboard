"use client";

import { HouseLink } from "./house-link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SocialCreateSheet } from "@/components/social/social-create-sheet";
import { isSocialCreateDest, STAFF_RAIL_EYEBROW, type NavItem } from "@/lib/nav";
import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_TILE_CLASS,
  HOUSE_DEST_RAIL_TILE_IDLE_CLASS,
  HOUSE_RAIL_ITEM_CLASS,
  HOUSE_RAIL_LABEL_CLASS,
  HOUSE_RAIL_TITLE_CLASS,
} from "@/lib/house-shell";
import { houseRailActiveIndex, houseRailModel } from "@/lib/house-rail";
import { cn } from "@/lib/cn";
import { clampWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";
import {
  SocialNavPendingProbe,
  useSocialNavPending,
} from "@/components/social/use-social-nav-pending";
import { NavGlyph } from "./nav-glyph";

// Access rail (dest rail), same pattern on every workspace — Home · Aggregation ·
// Social · Education · Staff (Adam 2026-10-04,
// docs/design-locks/shell-unified-chrome-lock-v1.md). Workspace
// eyebrow (hidden when collapsed), then rows of [28 icon tile +
// label]. Uses house --text-base / t-body labels and a
// 16px Phosphor Bold idle / Fill active glyph (75:5 / 61:2) in the
// tile. Idle: muted tile, ink-2. Active: muted row, ink label,
// accent tile. One active row per path
// (houseRailActiveIndex — the dock's test). Header mark is BrandLogo
// (24Frame), not a C. Collapsed mode is icon-only (labels hidden;
// title tooltips). Open count lives on the header bell.
export function SideNav({
  isGcStaff = false,
  collapsed = false,
  workspace: requestedWorkspace = "aggregation",
  homeOwned = false,
}: {
  isGcStaff?: boolean;
  collapsed?: boolean;
  workspace?: WorkspaceMode;
  /** /home and /home/news: Home's own dests (Home · Industry news). */
  homeOwned?: boolean;
}) {
  const workspace = clampWorkspaceMode(requestedWorkspace, isGcStaff);
  const social = workspace === "social";
  const { activePath, markPending, pendingHref } = useSocialNavPending();
  const model = houseRailModel({ isGcStaff, workspace, homeOwned });
  const activeIndex = houseRailActiveIndex(activePath, model, workspace);

  const router = useRouter();
  const warmed = useRef<Set<string>>(new Set());
  const warm = (href: string) => {
    if (social || warmed.current.has(href)) return;
    warmed.current.add(href);
    router.prefetch(href);
  };

  const row = (item: NavItem, index: number, badge: React.ReactNode = null) => {
    const active = index === activeIndex;
    const rowClass = cn(
      HOUSE_RAIL_ITEM_CLASS,
      collapsed ? "justify-center px-0 py-1" : "gap-3 py-1 pl-2 pr-3",
      active ? HOUSE_DEST_RAIL_ACTIVE_CLASS : HOUSE_DEST_RAIL_IDLE_CLASS,
    );
    const glyph = (
      <span
        data-side-nav-icon=""
        data-side-nav-icon-active={active ? "" : undefined}
        className={cn(
          HOUSE_DEST_RAIL_TILE_CLASS,
          active ? HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS : HOUSE_DEST_RAIL_TILE_IDLE_CLASS,
        )}
      >
        <NavGlyph item={item} active={active} />
      </span>
    );
    const label = !collapsed ? (
      <span className={HOUSE_RAIL_LABEL_CLASS}>{item.label}</span>
    ) : null;
    if (social && isSocialCreateDest(item)) {
      return (
        <SocialCreateSheet
          key={item.href}
          trigger={
            <button
              type="button"
              title={collapsed ? item.label : undefined}
              aria-label={item.ariaLabel ?? item.label}
              aria-current={active ? "page" : undefined}
              data-social-create-sheet="dest"
              className={rowClass}
            >
              {glyph}
              {label}
            </button>
          }
        />
      );
    }
    return (
      <HouseLink
        key={item.href}
        href={item.href}
        // Aggregation: VIEWPORT prefetch off, HOVER prefetch on. The sidebar
        // renders on every page, so viewport prefetch fired a full uncached
        // render of EVERY destination on EVERY navigation — ~400 invocations
        // in one short session. Hovering warms the one destination you are
        // about to click. Deduped per href so re-hovering does not re-fire.
        // Social: VIEWPORT prefetch on. Desktop rail is the same five
        // SOCIAL_NAV dests plus local loading.tsx — not the Aggregation
        // dashboard skeleton. Create opens the equal-tile sheet.
        prefetch={social}
        onMouseEnter={social ? undefined : () => warm(item.href)}
        onFocus={social ? undefined : () => warm(item.href)}
        onClick={(event) => markPending(item.href, event)}
        title={collapsed ? item.label : undefined}
        aria-label={item.ariaLabel ?? (collapsed ? item.label : undefined)}
        aria-current={active ? "page" : undefined}
        data-social-rail-pending={social && pendingHref === item.href ? "" : undefined}
        className={rowClass}
      >
        <SocialNavPendingProbe href={item.href} onPending={markPending} />
        {glyph}
        {label}
        {badge}
      </HouseLink>
    );
  };

  const { items, staffItems, eyebrow } = model;

  return (
    <nav
      className={cn("flex flex-col gap-1", collapsed ? "px-1" : "px-2")}
      data-side-nav=""
      aria-label={eyebrow}
    >
      {!collapsed ? (
        <span data-side-nav-eyebrow="" className={HOUSE_RAIL_TITLE_CLASS}>
          {eyebrow}
        </span>
      ) : null}
      {items.map((item, index) => row(item, index))}
      {staffItems.length > 0 ? (
        <>
          <div className="mx-1 my-2 border-t border-hairline" />
          {!collapsed ? (
            <span className={HOUSE_RAIL_TITLE_CLASS}>{STAFF_RAIL_EYEBROW}</span>
          ) : null}
          {staffItems.map((item, index) => row(item, items.length + index))}
        </>
      ) : null}
    </nav>
  );
}
