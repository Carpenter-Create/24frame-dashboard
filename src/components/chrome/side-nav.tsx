"use client";

import { HouseLink } from "./house-link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SocialCreateSheet } from "@/components/social/social-create-sheet";
import { Plus } from "@phosphor-icons/react";
import { isSocialCreateDest, STAFF_RAIL_EYEBROW, type NavItem } from "@/lib/nav";
import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_COLLAPSED_RULE_CLASS,
  HOUSE_DEST_RAIL_CREATE_GLYPH_CLASS,
  HOUSE_DEST_RAIL_CREATE_GLYPH_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_CREATE_TILE_CLASS,
  HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_LABEL_CLASS,
  HOUSE_DEST_RAIL_NAV_CLASS,
  HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_TOP_ROW_CLASS,
  HOUSE_DEST_RAIL_TOP_ROW_COLLAPSED_CLASS,
} from "@/lib/house-shell";
import { houseRailActiveIndex, houseRailModel } from "@/lib/house-rail";
import { cn } from "@/lib/cn";
import { clampWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";
import {
  SocialNavPendingProbe,
  useSocialNavPending,
} from "@/components/social/use-social-nav-pending";
import { NavGlyph } from "./nav-glyph";

// Side menu — the Access rail (dest rail), same pattern on every
// workspace — Home · Aggregation · Social · Education · Staff. Screening chrome (Adam
// 2026-10-04, "Yes, everywhere";
// docs/design-locks/shell-screening-chrome-lock-v1.md). Top row: the
// workspace eyebrow and the collapse control. Rows: [22 glyph slot +
// 13px label], no icon tiles. Idle ink-2 / 500; current muted row,
// ink / 600, Bold glyph. Social's Create is the only accent: a small
// accent tile with a plus. One current row per path
// (houseRailActiveIndex — the dock's test). Collapsed: the expand
// control, a 24 hairline, then 40 icon links (labels hidden; title
// tooltips). Glyphs are the Figma 75:5 rail family (house Phosphor).
// Header mark is BrandLogo (24Frame), not a C. Open count lives on the
// header bell.
export function SideNav({
  isGcStaff = false,
  collapsed = false,
  workspace: requestedWorkspace = "aggregation",
  homeOwned = false,
  collapseControl,
}: {
  isGcStaff?: boolean;
  collapsed?: boolean;
  workspace?: WorkspaceMode;
  /** /home and /home/news: Home's own dests (Home · Industry news). */
  homeOwned?: boolean;
  /** RailCollapse, placed in the top row (expanded) or atop the column (collapsed). */
  collapseControl?: React.ReactNode;
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
    const create = social && isSocialCreateDest(item);
    const rowClass = cn(
      collapsed ? HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS : HOUSE_DEST_RAIL_ROW_CLASS,
      active ? HOUSE_DEST_RAIL_ACTIVE_CLASS : HOUSE_DEST_RAIL_IDLE_CLASS,
    );
    const glyph = create ? (
      <span
        data-side-nav-icon=""
        data-side-nav-create-tile=""
        data-side-nav-icon-active={active ? "" : undefined}
        className={collapsed ? HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS : HOUSE_DEST_RAIL_CREATE_TILE_CLASS}
      >
        <Plus
          aria-hidden
          weight="bold"
          className={collapsed ? HOUSE_DEST_RAIL_CREATE_GLYPH_COLLAPSED_CLASS : HOUSE_DEST_RAIL_CREATE_GLYPH_CLASS}
        />
      </span>
    ) : collapsed ? (
      <span data-side-nav-icon="" data-side-nav-icon-active={active ? "" : undefined} className="contents">
        <NavGlyph item={item} active={active} />
      </span>
    ) : (
      <span
        data-side-nav-icon=""
        data-side-nav-icon-active={active ? "" : undefined}
        className={HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS}
      >
        <NavGlyph item={item} active={active} />
      </span>
    );
    const label = !collapsed ? (
      <span data-side-nav-label="" className={HOUSE_DEST_RAIL_LABEL_CLASS}>
        {item.label}
      </span>
    ) : null;
    if (create) {
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
      className={collapsed ? HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS : HOUSE_DEST_RAIL_NAV_CLASS}
      data-side-nav=""
      data-side-nav-collapsed={collapsed ? "" : undefined}
      aria-label={eyebrow}
    >
      {/* One top row in both states: the same div, with the collapse
          control in the same slot, so React reuses its button across
          the toggle and keyboard focus stays on it. Collapsed drops
          only the eyebrow; the 24×1 rule follows the row. */}
      <div
        data-side-nav-top=""
        className={collapsed ? HOUSE_DEST_RAIL_TOP_ROW_COLLAPSED_CLASS : HOUSE_DEST_RAIL_TOP_ROW_CLASS}
      >
        {collapsed ? null : (
          <span data-side-nav-eyebrow="" className={HOUSE_DEST_RAIL_EYEBROW_CLASS}>
            {eyebrow}
          </span>
        )}
        {collapseControl}
      </div>
      {collapsed ? (
        <span aria-hidden="true" data-side-nav-rule="" className={HOUSE_DEST_RAIL_COLLAPSED_RULE_CLASS} />
      ) : null}
      {items.map((item, index) => row(item, index))}
      {staffItems.length > 0 ? (
        <>
          <div
            aria-hidden="true"
            className={collapsed ? HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS : HOUSE_DEST_RAIL_DIVIDER_CLASS}
          />
          {!collapsed ? (
            <span data-side-nav-section-eyebrow="" className={HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS}>
              {STAFF_RAIL_EYEBROW}
            </span>
          ) : null}
          {staffItems.map((item, index) => row(item, items.length + index))}
        </>
      ) : null}
    </nav>
  );
}
