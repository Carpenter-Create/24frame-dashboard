"use client";

import {
  createContext,
  isValidElement,
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
  HOUSE_BLANK_OUTLET_RETRY_MS,
  HOUSE_CLIENT_SHELL,
  HOUSE_OUTLET_RECOVERY_MS,
  houseApplyCachedChild,
  houseBlankOutlet,
  houseBlankOutletRepeats,
  houseOutletNeedsRecovery,
  houseClientHistoryState,
  houseCommitHop,
  houseExactHref,
  houseFocusBelongsToInactiveScreen,
  houseHomePeriodHop,
  type HouseChildSeen,
  houseHrefKey,
  houseMayClientOwnHop,
  housePaintedKeys,
  housePathFromLocation,
  houseReadScroll,
  houseReconcileOwnedHref,
  houseRememberScroll,
  houseScreenKey,
  houseShouldClientNavigate,
  houseSocialHomePanelHop,
  houseSyncPainted,
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
  hasScreen: (href: string) => boolean;
  navigateOwned: (href: string, event?: HouseNavClickLike) => boolean;
};

type ScreenStore = {
  order: string[];
  nodes: Record<string, ReactNode>;
};

const EMPTY_STORE: ScreenStore = { order: [], nodes: {} };

const HouseClientContext = createContext<HouseClientApi | null>(null);

export function useHousePathname(): string {
  const house = useContext(HouseClientContext);
  const next = usePathname();
  return house?.pathname ?? next;
}

export function useHouseClient(): HouseClientApi | null {
  return useContext(HouseClientContext);
}

export function isHouseRscFallback(node: ReactNode): boolean {
  if (!node) return false;
  if (Array.isArray(node)) return node.some(isHouseRscFallback);
  if (!isValidElement(node)) return false;
  const props = node.props as { [HOUSE_CLIENT_SHELL.rscFallbackAttr]?: unknown; children?: ReactNode };
  if (props[HOUSE_CLIENT_SHELL.rscFallbackAttr] !== undefined) return true;
  return isHouseRscFallback(props.children);
}

function captureLeadScroll(key: string): void {
  const scroller = document.querySelector(`[${HOUSE_CLIENT_SHELL.scrollAttr}]`);
  if (scroller instanceof HTMLElement) houseRememberScroll(key, scroller.scrollTop);
}

// useSearchParams must stay in this gated child. Always-mounted chrome
// and static Settings RSC (agreements, theme, refer, …) prerender
// through the empty-search fallback. Do not call the hook from
// HouseScreenCache or AppShell.
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
      hasScreen: (dest: string) => houseShouldClientNavigate(dest, housePaintedKeys()),
      navigateOwned: (dest: string, event?: HouseNavClickLike) => {
        if (event && houseNavIgnorePendingClick(event)) return false;
        // Cold create must not pushState. Next has to replace the RSC tree.
        if (!houseMayClientOwnHop(parsed.pathname, nextPath)) return false;
        const parsedDest = parseHouseHref(dest);
        const next = housePathFromLocation(parsedDest.pathname, parsedDest.search);
        const hop = houseCommitHop({
          fromHref: href,
          destHref: dest,
          painted: housePaintedKeys(),
          ownedIsDest: houseExactHref(href) === houseExactHref(dest),
          nextIsDest: houseExactHref(nextHref) === houseExactHref(dest),
          sameScreen: houseHrefKey(href) === houseHrefKey(dest),
        });
        if (hop === "next") return false;
        if (hop === "stay") return true;
        // Panel queries stay on the mounted screen. pushState would
        // not fetch; the provider effect router.pushes a Home period.
        if (houseSocialHomePanelHop(href, next) || houseHomePeriodHop(href, next)) {
          setOwnedHref(next);
          return true;
        }
        if (hop === "refresh-next") {
          setOwnedHref(null);
          router.refresh();
          return true;
        }
        captureLeadScroll(screenKey);
        window.history.pushState(houseClientHistoryState(window.history.state), "", next);
        setOwnedHref(next);
        return true;
      },
    }),
    [href, nextHref, nextKey, nextPath, nextSearch, parsed.pathname, parsed.search, router, screenKey],
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

  useEffect(() => {
    const onPop = () => {
      const href = `${window.location.pathname}${window.location.search}`;
      captureLeadScroll(screenKey);
      if (houseShouldClientNavigate(href, housePaintedKeys())) {
        setOwnedHref(href);
        return;
      }
      // History landed on a screen this instance never stored. Owning it
      // paints the rail and leaves the slot empty.
      setOwnedHref(null);
      router.replace(href);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [router, screenKey]);

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
      if (!api.navigateOwned(dest, event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [api, screenKey]);

  return <HouseClientContext.Provider value={api}>{children}</HouseClientContext.Provider>;
}

function paintedSlots(store: ScreenStore): string[] {
  return store.order.filter((key) => store.nodes[key] != null);
}

export function HouseScreenCache({ children }: { children: ReactNode }) {
  const fallbackPath = usePathname();
  const house = useHouseClient();
  const router = useRouter();
  const nextPath = house?.nextPathname ?? fallbackPath;
  const nextKey = house?.nextKey ?? houseScreenKey(nextPath, house?.nextSearch ?? "");
  const [store, setStore] = useState<ScreenStore>(EMPTY_STORE);
  const scrollRef = useRef<string | null>(null);
  const fallback = isHouseRscFallback(children);
  const activeKey = house?.screenKey ?? nextKey;
  const [registryBound, setRegistryBound] = useState(false);

  // `houseApplyCachedChild` decides staleness from the committed guard
  // on this render. setState is only the record for the next pass.
  const [childSeen, setChildSeen] = useState<HouseChildSeen | null>(null);
  // A blank outlet revalidates first. The next kick treats an unchanged
  // tree as this URL's screen so the retry does not run forever.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const recoveredOutlet = useRef<string | null>(null);
  const acceptStale = settledKey === activeKey && activeKey === nextKey;
  const applied = houseApplyCachedChild({
    seen: childSeen,
    nextKey,
    activeKey,
    nextPath,
    child: children,
    fallback,
    order: store.order,
    nodes: store.nodes,
    acceptStale,
  });
  if (applied.seen !== childSeen) setChildSeen(applied.seen);
  if (settledKey !== null && (applied.displayKey !== null || applied.showIngress || !acceptStale)) {
    setSettledKey(null);
  }
  const nextStore: ScreenStore =
    applied.nodes === store.nodes && applied.order === store.order
      ? store
      : { order: [...applied.order], nodes: applied.nodes };
  if (!registryBound) {
    setRegistryBound(true);
    if (nextStore === store) houseSyncPainted(paintedSlots(store));
  }
  if (nextStore !== store) {
    setStore(nextStore);
    houseSyncPainted(paintedSlots(nextStore));
  }

  const { displayKey, showIngress } = applied;
  const ingress = showIngress ? children : null;
  const activeNode = displayKey != null ? nextStore.nodes[displayKey] : null;

  useEffect(() => {
    const action = houseBlankOutlet(
      displayKey,
      showIngress,
      activeKey,
      nextKey,
      applied.waitForSlot,
    );
    if (action === "load") {
      // One push. An interval of the same href aborts the RSC hop,
      // so the slot stays blank and the click looks stuck.
      if (house?.href) router.push(house.href);
      return;
    }
    if (action === "none") {
      const recover = houseOutletNeedsRecovery({
        displayKey,
        showIngress,
        waitForSlot: applied.waitForSlot,
        activeKey,
        nextKey,
      });
      if (!recover) {
        if (displayKey !== null) recoveredOutlet.current = null;
        return;
      }
      // One later refresh. Not the same tick — that aborts the hop
      // and must not accept the previous workspace as this screen.
      if (recoveredOutlet.current === activeKey) return;
      let ticks = 0;
      const need = Math.max(1, Math.round(HOUSE_OUTLET_RECOVERY_MS / HOUSE_BLANK_OUTLET_RETRY_MS));
      const id = window.setInterval(() => {
        ticks += 1;
        if (ticks < need) return;
        window.clearInterval(id);
        recoveredOutlet.current = activeKey;
        router.refresh();
      }, HOUSE_BLANK_OUTLET_RETRY_MS);
      return () => window.clearInterval(id);
    }
    if (!houseBlankOutletRepeats(action)) return;
    let kicks = 0;
    const kick = () => {
      kicks += 1;
      if (kicks > 1) setSettledKey(activeKey);
      router.refresh();
    };
    kick();
    const retry = window.setInterval(kick, HOUSE_BLANK_OUTLET_RETRY_MS);
    return () => window.clearInterval(retry);
  }, [activeKey, applied.waitForSlot, displayKey, house?.href, nextKey, router, showIngress]);

  useEffect(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const screen = active.closest(`[${HOUSE_CLIENT_SHELL.screenAttr}]`);
    if (!(screen instanceof HTMLElement)) return;
    if (!houseFocusBelongsToInactiveScreen(screen.hasAttribute("hidden"), screen.contains(active))) return;
    active.blur();
  }, [displayKey]);

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
    <>
      {nextStore.order.map((key) => {
        const node = nextStore.nodes[key];
        if (node == null) return null;
        // The active outlet owns this element. A hidden twin stays display:none
        // and React will not paint the same element in the visible slot.
        if (key !== displayKey && (node === activeNode || node === children)) return null;
        return (
          <div
            key={key}
            hidden={key !== displayKey}
            inert={key !== displayKey ? true : undefined}
            {...{ [HOUSE_CLIENT_SHELL.screenAttr]: key }}
            {...(key === displayKey ? { [HOUSE_CLIENT_SHELL.screenActiveAttr]: "" } : {})}
          >
            {node}
          </div>
        );
      })}
      {ingress}
    </>
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
