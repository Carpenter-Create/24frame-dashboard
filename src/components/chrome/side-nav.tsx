"use client";

import { HouseLink } from "./house-link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SocialRailCreate } from "@/components/social/social-rail-create";
import {
  isSocialCreateDest,
  isSocialMessagesDest,
  SOCIAL_RAIL_CREATE_ICON,
  STAFF_RAIL_EYEBROW,
  type NavItem,
} from "@/lib/nav";
import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_LABEL_CLASS,
  HOUSE_DEST_RAIL_NAV_CLASS,
  HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS,
} from "@/lib/house-shell";
import { houseRailActiveIndex, houseRailModel } from "@/lib/house-rail";
import { cn } from "@/lib/cn";
import { socialMessagesNavLabel } from "@/lib/social";
import { clampWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";
import {
  SocialNavPendingProbe,
  useSocialNavPending,
} from "@/components/social/use-social-nav-pending";
import { NavGlyph } from "./nav-glyph";

// Side menu — the Access rail (dest rail), same pattern on every
// workspace — Home · Aggregation · Social · Education · Staff. H
// register (Adam 2026-10-05, "I like the designs. Let's use them.";
// the shell register lock v1 in docs/design-locks). The brand mark
// sits in the column's top band and the collapse control at its foot
// (AppShell), so this is the rows alone: 56 pills, a 24 glyph slot,
// 16, then the 17 / 500 label. Idle: Regular glyph and label in ink.
// Current: the accent wash, the FILLED glyph and the label in
// accent-ink, weight unchanged. No tiles, no accent Create (Social's
// Create is an ordinary PlusSquare row), no workspace eyebrow (the
// header slider names the workspace; the nav keeps it as its
// accessible name). One current row per path (houseRailActiveIndex —
// the dock's test). Messages carries an 8 accent unread dot; the count
// stays in the accessible name. Collapsed (80): 56 circle links,
// labels hidden (title tooltips). Glyphs are the Figma 75:5 rail family
// (house Phosphor).
export function SideNav({
  isGcStaff = false,
  collapsed = false,
  workspace: requestedWorkspace = "aggregation",
  homeOwned = false,
  messagesUnread = 0,
  composerName = null,
  composerPhotoUrl = null,
}: {
  isGcStaff?: boolean;
  collapsed?: boolean;
  workspace?: WorkspaceMode;
  /** /home and /home/news: Home's own dests (Home · Industry news). */
  homeOwned?: boolean;
  /** Social DM unread total: the Messages row's dot and accessible name. */
  messagesUnread?: number;
  /** Social Create's composer author: the shell's account name and photo. */
  composerName?: string | null;
  composerPhotoUrl?: string | null;
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

  const row = (item: NavItem, index: number) => {
    const active = index === activeIndex;
    const create = social && isSocialCreateDest(item);
    const unread = social && isSocialMessagesDest(item) && messagesUnread > 0;
    const rowClass = cn(
      collapsed ? HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS : HOUSE_DEST_RAIL_ROW_CLASS,
      active ? HOUSE_DEST_RAIL_ACTIVE_CLASS : HOUSE_DEST_RAIL_IDLE_CLASS,
    );
    const glyphItem = create ? { ...item, icon: SOCIAL_RAIL_CREATE_ICON } : item;
    const glyph = collapsed ? (
      <span data-side-nav-icon="" data-side-nav-icon-active={active ? "" : undefined} className="contents">
        <NavGlyph item={glyphItem} active={active} />
      </span>
    ) : (
      <span
        data-side-nav-icon=""
        data-side-nav-icon-active={active ? "" : undefined}
        className={HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS}
      >
        <NavGlyph item={glyphItem} active={active} />
      </span>
    );
    const label = !collapsed ? (
      <span data-side-nav-label="" className={HOUSE_DEST_RAIL_LABEL_CLASS}>
        {item.label}
      </span>
    ) : null;
    const dot = unread ? (
      <span
        aria-hidden="true"
        data-side-nav-unread=""
        className={collapsed ? HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS : HOUSE_DEST_RAIL_UNREAD_DOT_CLASS}
      />
    ) : null;
    const name = unread ? socialMessagesNavLabel(item.label, messagesUnread) : undefined;
    if (create) {
      return (
        <SocialRailCreate
          key={item.href}
          authorName={composerName}
          authorPhotoUrl={composerPhotoUrl}
          trigger={
            <button
              type="button"
              title={collapsed ? item.label : undefined}
              aria-label={item.ariaLabel ?? item.label}
              aria-current={active ? "page" : undefined}
              data-social-create-compose="dest"
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
        // dashboard skeleton. Create opens the composer window.
        prefetch={social}
        onMouseEnter={social ? undefined : () => warm(item.href)}
        onFocus={social ? undefined : () => warm(item.href)}
        onClick={(event) => markPending(item.href, event)}
        title={collapsed ? item.label : undefined}
        aria-label={name ?? item.ariaLabel ?? (collapsed ? item.label : undefined)}
        aria-current={active ? "page" : undefined}
        data-social-rail-pending={social && pendingHref === item.href ? "" : undefined}
        className={rowClass}
      >
        <SocialNavPendingProbe href={item.href} onPending={markPending} />
        {glyph}
        {label}
        {dot}
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
