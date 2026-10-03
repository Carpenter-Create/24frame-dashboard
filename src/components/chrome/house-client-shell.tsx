"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  HOUSE_CLIENT_SHELL,
  houseClientHistoryState,
  houseExactHref,
  houseHomePeriodHop,
  houseHop,
  houseHrefKey,
  houseMayClientOwnHop,
  housePathFromLocation,
  houseReadScroll,
  houseReconcileOwnedHref,
  houseRememberScroll,
  houseScreenKey,
  houseSocialHomePanelHop,
  parseHouseHref,
} from "@/lib/house-client-shell";
import { houseNavIgnorePendingClick, type HouseNavClickLike } from "@/lib/house-nav-pending";

type HouseClientApi = {
  pathname: string;
  search: string;
  href: string;
  screenKey: string;
  nextPathname: string;
  nextSearch: string;
  nextKey: string;
  navigateOwned: (href: string, event?: HouseNavClickLike) => boolean;
};

const HouseClientContext = createContext<HouseClientApi | null>(null);

export function useHousePathname(): string {
  const house = useContext(HouseClientContext);
  const next = usePathname();
  return house?.pathname ?? next;
}

export function useHouseClient(): HouseClientApi | null {
  return useContext(HouseClientContext);
}

function captureLeadScroll(key: string): void {
  const scroller = document.querySelector(`[${HOUSE_CLIENT_SHELL.scrollAttr}]`);
  if (scroller instanceof HTMLElement) houseRememberScroll(key, scroller.scrollTop);
}

// useSearchParams must stay in this gated child. Always-mounted chrome
// and static Settings RSC (agreements, theme, refer, …) prerender
// through the empty-search fallback. Do not call the hook from
// HouseScreenOutlet or AppShell.
export function HousePathProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<HousePathProviderCore nextSearch="">{children}</HousePathProviderCore>}>
      <HousePathSearchBound>{children}</HousePathSearchBound>
    </Suspense>
  );
}

function HousePathSearchBound({ children }: { children: ReactNode }) {
  const nextSearchParams = useSearchParams();
  const nextSearch = nextSearchParams.toString();
  return (
    <HousePathProviderCore nextSearch={nextSearch ? `?${nextSearch}` : ""}>
      {children}
    </HousePathProviderCore>
  );
}

function HousePathProviderCore({
  children,
  nextSearch,
}: {
  children: ReactNode;
  nextSearch: string;
}) {
  const nextPath = usePathname();
  const router = useRouter();
  const nextHref = housePathFromLocation(nextPath, nextSearch);
  const nextKey = houseScreenKey(nextPath, nextSearch);
  const [ownedHref, setOwnedHref] = useState<string | null>(null);
  const [seenNextHref, setSeenNextHref] = useState(nextHref);
  const pushedPeriod = useRef<string | null>(null);

  const reconciled = houseReconcileOwnedHref(ownedHref, nextHref, seenNextHref);
  if (reconciled !== ownedHref) {
    setOwnedHref(reconciled);
  }
  if (houseExactHref(seenNextHref) !== houseExactHref(nextHref)) {
    setSeenNextHref(nextHref);
  }

  const href = ownedHref ?? nextHref;
  const parsed = parseHouseHref(href);
  const screenKey = houseScreenKey(parsed.pathname, parsed.search);

  const api = useMemo<HouseClientApi>(
    () => ({
      pathname: parsed.pathname,
      search: parsed.search,
      href,
      screenKey,
      nextPathname: nextPath,
      nextSearch,
      nextKey,
      navigateOwned: (dest: string, event?: HouseNavClickLike) => {
        if (event && houseNavIgnorePendingClick(event)) return false;
        // Cold create must not pushState. Next has to replace the RSC tree.
        if (!houseMayClientOwnHop(parsed.pathname, nextPath)) return false;
        const hop = houseHop(href, dest);
        // Another screen is a Next navigation; the caller's Link or push runs.
        if (hop === "next") return false;
        if (hop === "stay") return true;
        const parsedDest = parseHouseHref(dest);
        const next = housePathFromLocation(parsedDest.pathname, parsedDest.search);
        // Panel queries stay on the mounted screen. pushState would
        // not fetch; the provider effect router.pushes a Home period.
        if (houseSocialHomePanelHop(href, next) || houseHomePeriodHop(href, next)) {
          setOwnedHref(next);
          return true;
        }
        window.history.pushState(houseClientHistoryState(window.history.state), "", next);
        setOwnedHref(next);
        return true;
      },
    }),
    [href, nextKey, nextPath, nextSearch, parsed.pathname, parsed.search, screenKey],
  );

  // Owned Home period must fetch. The click only setOwnedHref so the
  // Revenue chip can flip before RSC. Do not swap the mounted screen
  // for home/loading.tsx while that query is in flight.
  useEffect(() => {
    if (!houseHomePeriodHop(nextHref, href)) {
      pushedPeriod.current = null;
      return;
    }
    // Router identity can change while the hop is still open. A second
    // push of the same href aborts the fetch and the period never lands.
    if (pushedPeriod.current === href) return;
    pushedPeriod.current = href;
    router.push(href, { scroll: false });
  }, [href, nextHref, router]);

  // Back and Forward: Next restores every entry (the shell's panel
  // entries carry the flight tree they were pushed over), so the address
  // Next shows is the screen. Drop the owned panel query.
  useEffect(() => {
    const onPop = () => {
      captureLeadScroll(screenKey);
      setOwnedHref(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [screenKey]);

  useEffect(() => {
    const onClick = (event: globalThis.MouseEvent) => {
      if (houseNavIgnorePendingClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      let dest: string;
      try {
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin) return;
        dest = `${url.pathname}${url.search}`;
      } catch {
        return;
      }
      if (houseHrefKey(dest) !== screenKey) captureLeadScroll(screenKey);
      // HouseLink owns its hop in its own onClick, after the caller's
      // handler. Owning it here first stops propagation, and React's root
      // is document, so that handler never ran: menus stayed open and the
      // workspace cookie was never written.
      if (anchor.hasAttribute("data-house-link")) return;
      if (!api.navigateOwned(dest, event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [api, screenKey]);

  return <HouseClientContext.Provider value={api}>{children}</HouseClientContext.Provider>;
}

// The center outlet: Next's current screen, one at a time.
//
// It used to keep visited screens mounted and pushState between them. A
// stored copy of the layout's children is Next's router outlet, which
// renders Next's current route, not the screen it was stored for. So a
// warm hop showed the screen being left under the new address (after
// leaving view-as, the impersonated screen), and every cold hop blanked
// the outlet and refreshed the whole tree to tell the copies apart.
// Next's router cache keeps revisits and Back fast instead.
//
// Scroll stays per screen: the lead scroller is shared chrome.
export function HouseScreenOutlet({ children }: { children: ReactNode }) {
  const fallbackPath = usePathname();
  const house = useHouseClient();
  const activeKey = house?.screenKey ?? houseScreenKey(fallbackPath, house?.nextSearch ?? "");
  const scrollRef = useRef<string | null>(null);

  useEffect(() => {
    const scroller = document.querySelector(`[${HOUSE_CLIENT_SHELL.scrollAttr}]`);
    if (!(scroller instanceof HTMLElement)) {
      scrollRef.current = activeKey;
      return;
    }
    const from = scrollRef.current;
    if (from && from !== activeKey) {
      scroller.scrollTop = houseReadScroll(activeKey);
    }
    scrollRef.current = activeKey;
  }, [activeKey]);

  return (
    <div
      {...{
        [HOUSE_CLIENT_SHELL.screenAttr]: activeKey,
        [HOUSE_CLIENT_SHELL.screenActiveAttr]: "",
      }}
    >
      {children}
    </div>
  );
}

export function houseOwnedClick(
  href: string,
  event: MouseEvent<HTMLElement> | HouseNavClickLike | undefined,
  navigateOwned: ((dest: string, click?: HouseNavClickLike) => boolean) | undefined,
): boolean {
  if (!navigateOwned) return false;
  return navigateOwned(href, event);
}
