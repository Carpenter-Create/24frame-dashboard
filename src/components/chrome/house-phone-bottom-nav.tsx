"use client";

import { useEffect, useState } from "react";
import { HouseLink } from "./house-link";
import { useRouter } from "next/navigation";
import { useHousePathname } from "./house-client-shell";

import {
  HouseNavPendingProbe,
  useHouseNavPending,
} from "@/components/chrome/use-house-nav-pending";
import { prefetchHrefList } from "@/lib/house-nav-pending";

import { SocialCreateFan } from "@/components/social/social-create-fan";
import { cn } from "@/lib/cn";
import {
  HOUSE_PHONE_BOTTOM_NAV,
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_WEIGHT,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_GLYPH_HOST_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT,
  HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS,
  housePhoneDestActive,
  housePhoneDestGlyph,
  housePhoneDestIsCreate,
  housePhoneDockDestinations,
  housePhoneDockLabel,
  housePhonePrefetchDestHrefs,
  housePhoneShowsBottomDests,
} from "@/lib/house-phone-shell";
import {
  createSocialTabBarScrollTracker,
  stepSocialTabBarScroll,
} from "@/lib/social-tab-bar-scroll";
import {
  isSocialDmImmersivePath,
  isSocialStoryCreatePath,
  isSocialStoryOpenPath,
  isSocialWriteComposePath,
  socialMessagesNavLabel,
} from "@/lib/social";
import { isSocialMessagesDest } from "@/lib/nav";
import { clampWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";

// Prior Social float: hide on scroll-down, show on scroll-up.
// G9 page scroll lives on main (`[data-house-lead-scroll]`), not window.
// Shared across every workspace that mounts this bar.
// IA A: dests inside the current workspace only. No workspace item.
// Icons only, with accessible names. Every dock: the current dest is
// the FILLED glyph painted accent — no dot, no chip (H register,
// Adam 2026-10-05, the shell register lock v1 in docs/design-locks).
// Each target fills the 56 pill row. Social alone has Create, the 44
// accent circle inside the pill. Messages shows an 8 accent unread dot
// (2px dock-surface ring) at the glyph's top-right; the count stays in
// the accessible name.

function useHousePhoneBottomNavHidden(pathname: string) {
  const [nav, setNav] = useState({ path: pathname, hidden: false });
  if (nav.path !== pathname) {
    setNav({ path: pathname, hidden: false });
  }

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-house-lead-scroll]");
    const readY = () => (scroller ? scroller.scrollTop : window.scrollY);
    const target: EventTarget = scroller ?? window;
    let tracker = createSocialTabBarScrollTracker(readY());

    const onScroll = () => {
      const next = stepSocialTabBarScroll(tracker, readY());
      const changed = next.state !== tracker.state;
      tracker = next;
      if (changed) {
        setNav((current) =>
          current.path !== pathname
            ? current
            : { path: pathname, hidden: next.state === "hidden" },
        );
      }
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return nav.path === pathname ? nav.hidden : false;
}

export function HousePhoneBottomNav({
  workspace: requestedWorkspace,
  isGcStaff = false,
  homeOwned = false,
  accountChrome = false,
  coProductions = false,
  messagesUnread = 0,
}: {
  workspace: WorkspaceMode;
  isGcStaff?: boolean;
  homeOwned?: boolean;
  accountChrome?: boolean;
  coProductions?: boolean;
  /** Social DM unread total: the Messages dot and accessible name. */
  messagesUnread?: number;
}) {
  const workspace = clampWorkspaceMode(requestedWorkspace, isGcStaff);
  const pathname = useHousePathname();
  const router = useRouter();
  const { activePath, markPending } = useHouseNavPending();
  const hidden = useHousePhoneBottomNavHidden(pathname);
  const visible =
    !isSocialStoryCreatePath(pathname) &&
    !isSocialStoryOpenPath(pathname) &&
    !isSocialDmImmersivePath(pathname) &&
    !isSocialWriteComposePath(pathname) &&
    housePhoneShowsBottomDests({
      workspace,
      homeOwned,
      accountChrome,
      coProductions,
    });
  const items = housePhoneDockDestinations({ isGcStaff, workspace, homeOwned });
  const destWorkspace = homeOwned ? "aggregation" : workspace;

  useEffect(() => {
    if (!visible) return;
    prefetchHrefList(router.prefetch, housePhonePrefetchDestHrefs(items));
  }, [items, router, visible]);

  if (!visible) return null;

  return (
    <nav
      data-house-phone-bottom-nav=""
      data-house-phone-bottom-nav-hidden={hidden ? "" : undefined}
      aria-label={housePhoneDockLabel({ workspace, homeOwned }) || HOUSE_PHONE_BOTTOM_NAV.label}
      aria-hidden={hidden || undefined}
      className={cn(HOUSE_PHONE_BOTTOM_NAV_CLASS, hidden && HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS)}
    >
      <div data-house-phone-bottom-nav-pill="" className={HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS}>
        <div className={HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS}>
          {items.map((item) => {
            const active = housePhoneDestActive(activePath, item, destWorkspace);
            const Glyph = housePhoneDestGlyph(item);
            const unread = isSocialMessagesDest(item) && messagesUnread > 0;
            const glyph = (
              <Glyph
                className={HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS}
                weight={active ? HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT : HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT}
              />
            );
            // The unread dot hangs off the glyph's own box, so the
            // glyph stays centred in every slot.
            const face = !unread ? (
              glyph
            ) : (
              <span className={HOUSE_PHONE_BOTTOM_NAV_GLYPH_HOST_CLASS}>
                {glyph}
                <span
                  aria-hidden
                  data-house-phone-bottom-nav-unread=""
                  className={HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS}
                />
              </span>
            );
            const destClass = cn(
              HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS,
              active
                ? HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS
                : HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS,
            );
            if (housePhoneDestIsCreate(item)) {
              return (
                <SocialCreateFan
                  key={item.href}
                  hidden={hidden}
                  trigger={
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      tabIndex={hidden ? -1 : undefined}
                      data-house-phone-bottom-nav-item={item.href}
                      data-house-phone-bottom-nav-item-active={active ? "" : undefined}
                      data-house-phone-dest={item.label}
                      data-house-phone-dest-create=""
                      data-social-create-fan-trigger=""
                      className={HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS}
                    >
                      <span
                        data-house-phone-bottom-nav-create=""
                        className={cn(
                          HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS,
                          active && HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS,
                        )}
                      >
                        <Glyph
                          className={HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS}
                          weight={HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_WEIGHT}
                        />
                      </span>
                    </button>
                  }
                />
              );
            }
            return (
              <HouseLink
                key={item.href}
                href={item.href}
                prefetch
                aria-label={unread ? socialMessagesNavLabel(item.label, messagesUnread) : item.label}
                aria-current={active ? "page" : undefined}
                tabIndex={hidden ? -1 : undefined}
                data-house-phone-bottom-nav-item={item.href}
                data-house-phone-bottom-nav-item-active={active ? "" : undefined}
                data-house-phone-dest={item.label}
                onClick={(event) => markPending(item.href, event)}
                className={destClass}
              >
                <HouseNavPendingProbe href={item.href} onPending={markPending} />
                {face}
              </HouseLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
