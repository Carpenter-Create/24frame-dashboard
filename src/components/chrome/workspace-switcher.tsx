"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { BookOpen, DotsNine, FilmStrip, House, Tray, Users } from "@phosphor-icons/react";
import { HouseLink } from "./house-link";
import { useRouter } from "next/navigation";
import { useHouseClient, useHousePathname } from "./house-client-shell";

import { AppearanceCheck } from "./appearance-check";
import { SegmentedTrack } from "@/components/ui/segmented-track";
import { SEGMENTED_TRACK_PERSIST, segmentedItemOn } from "@/lib/segmented-track";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { overviewLeadActiveIndex, overviewLeadSelected } from "@/lib/overview";
import { clampWorkspaceMode, resolveWorkspaceMode, type WorkspaceMode } from "@/lib/workspace";
import { prefetchHrefList, type HouseNavClickLike } from "@/lib/house-nav-pending";
import {
  HouseNavPendingProbe,
  useHouseNavPending,
} from "@/components/chrome/use-house-nav-pending";
import {
  availableWorkspaceOptions,
  type WorkspaceMenuOption,
} from "@/lib/workspace-menu";
import {
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_CLASS,
  HOUSE_PHONE_CHROME_ICON_WEIGHT,
} from "@/lib/house-phone-shell";
import { cn } from "@/lib/cn";
import {
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_SWITCHER_HOST_CLASS,
  WORKSPACE_SWITCHER_OPTION_CHECK_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS,
  WORKSPACE_SWITCHER_SEGMENTS_CLASS,
  WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS,
  WORKSPACE_SWITCHER_SHEET_HOST_CLASS,
  WORKSPACE_SWITCHER_SHEET_SCRIM_CLASS,
  WORKSPACE_SWITCHER_SHEET_SURFACE_CLASS,
  WORKSPACE_SWITCHER_STATIC_CLASS,
  WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS,
  WORKSPACE_WAFFLE_GRID_CLASS,
  WORKSPACE_WAFFLE_HOME,
  WORKSPACE_WAFFLE_HOME_ROW_CLASS,
  WORKSPACE_WAFFLE_HOME_ROW_CURRENT_CLASS,
  WORKSPACE_WAFFLE_ICON_CLASS,
  WORKSPACE_WAFFLE_TILE_CLASS,
  WORKSPACE_WAFFLE_TILE_CURRENT_CLASS,
  WORKSPACE_WAFFLE_TILE_LABEL_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
  phoneWorkspaceSwitcherPrefetchHrefs,
  workspaceWaffleHomeDest,
  workspaceSwitcherChromeClearanceBottoms,
  workspaceSwitcherMenuStyle,
  workspaceSwitcherNextSegmentIndex,
  workspaceSwitcherPersistLane,
  workspaceSwitcherSegmentClass,
  workspaceSwitcherSegmentTabIndex,
  workspaceSliderSegments,
  workspaceWaffleTiles,
  workspacePillClickDest,
} from "@/lib/workspace-switcher";

const WORKSPACE_WAFFLE_ICON = {
  social: Users,
  education: BookOpen,
  aggregation: FilmStrip,
  staff: Tray,
} as const;

function selectWorkspaceTile(
  current: WorkspaceMode,
  tile: WorkspaceMenuOption,
  options: readonly WorkspaceMenuOption[],
  router: ReturnType<typeof useRouter>,
  shellPath: string,
  isGcStaff?: boolean,
  markPending?: (href: string, event?: HouseNavClickLike) => void,
  event?: HouseNavClickLike,
  navigateOwned?: (href: string, click?: HouseNavClickLike) => boolean,
) {
  const dest = workspacePillClickDest({
    shellPath,
    workspace: current,
    pill: { id: tile.mode, href: tile.href },
    options,
  });
  if (!dest) return;
  workspaceSwitcherPersistLane(tile.mode, isGcStaff);
  markPending?.(dest, event);
  if (navigateOwned?.(dest, event)) return;
  router.push(dest);
}

function WorkspaceWaffleHomeRow({
  current,
  chromePath,
  onNavigate,
}: {
  current: WorkspaceMode;
  chromePath: string;
  onNavigate: () => void;
}) {
  const { markPending } = useHouseNavPending();
  const dest = workspaceWaffleHomeDest(chromePath, current);
  const onHome = overviewLeadSelected("home", chromePath, current);
  const className = cn(
    WORKSPACE_WAFFLE_HOME_ROW_CLASS,
    onHome && WORKSPACE_WAFFLE_HOME_ROW_CURRENT_CLASS,
  );
  const body = (
    <>
      <House className={WORKSPACE_WAFFLE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} aria-hidden="true" />
      <span data-workspace-waffle-home-label="" className={WORKSPACE_WAFFLE_TILE_LABEL_CLASS}>
        {WORKSPACE_WAFFLE_HOME.label}
      </span>
      <AppearanceCheck
        selected={onHome}
        className={cn(WORKSPACE_SWITCHER_OPTION_CHECK_CLASS, "ml-auto")}
      />
    </>
  );
  if (!dest) {
    return (
      <button
        type="button"
        data-workspace-waffle-home=""
        data-workspace-waffle-home-current=""
        aria-current="page"
        className={className}
        onClick={onNavigate}
      >
        {body}
      </button>
    );
  }
  return (
    <HouseLink
      href={dest}
      prefetch
      data-workspace-waffle-home=""
      className={className}
      onClick={(event) => {
        workspaceSwitcherPersistLane("home");
        markPending(dest, event);
        onNavigate();
      }}
    >
      <HouseNavPendingProbe href={dest} onPending={markPending} />
      {body}
    </HouseLink>
  );
}

function WorkspaceWaffleTiles({
  tiles,
  current,
  chromePath,
  staffGate,
  onNavigate,
}: {
  tiles: readonly WorkspaceMenuOption[];
  current: WorkspaceMode;
  chromePath: string;
  staffGate: boolean;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pathname = useHousePathname();
  const house = useHouseClient();
  const { markPending } = useHouseNavPending();

  return (
    <>
      <div data-workspace-switcher-header="" className={WORKSPACE_SWITCHER_HEADER_CLASS}>
        {WORKSPACE_SWITCHER.heading}
      </div>
      <div
        role="listbox"
        aria-label={WORKSPACE_SWITCHER.heading}
        data-workspace-waffle-grid=""
        className={WORKSPACE_WAFFLE_GRID_CLASS}
      >
        {tiles.map((tile) => {
          const selected = overviewLeadSelected(tile.mode, chromePath, current);
          const Icon = WORKSPACE_WAFFLE_ICON[tile.mode];
          const body = (
            <>
              <Icon className={WORKSPACE_WAFFLE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} aria-hidden="true" />
              <span data-workspace-waffle-label="" className={WORKSPACE_WAFFLE_TILE_LABEL_CLASS}>
                {tile.label}
              </span>
              <AppearanceCheck selected={selected} className={WORKSPACE_SWITCHER_OPTION_CHECK_CLASS} />
            </>
          );
          const className = cn(
            WORKSPACE_WAFFLE_TILE_CLASS,
            selected && WORKSPACE_WAFFLE_TILE_CURRENT_CLASS,
          );
          if (!selected) {
            return (
              <HouseLink
                key={tile.mode}
                href={tile.href}
                prefetch
                role="option"
                data-workspace-waffle-tile={tile.mode}
                aria-selected={false}
                className={className}
                onClick={(event) => {
                  workspaceSwitcherPersistLane(tile.mode, staffGate);
                  markPending(tile.href, event);
                  onNavigate();
                }}
              >
                <HouseNavPendingProbe href={tile.href} onPending={markPending} />
                {body}
              </HouseLink>
            );
          }
          return (
            <button
              key={tile.mode}
              type="button"
              role="option"
              data-workspace-waffle-tile={tile.mode}
              data-workspace-waffle-current=""
              aria-selected
              className={className}
              onClick={(event) => {
                selectWorkspaceTile(
                  current,
                  tile,
                  tiles,
                  router,
                  pathname,
                  staffGate,
                  undefined,
                  event,
                  house?.navigateOwned,
                );
                onNavigate();
              }}
            >
              {body}
            </button>
          );
        })}
      </div>
    </>
  );
}

function WorkspaceSlider({
  current,
  options,
  isGcStaff = false,
}: {
  current: WorkspaceMode;
  options: readonly WorkspaceMenuOption[];
  isGcStaff?: boolean;
}) {
  const router = useRouter();
  const shellPath = useHousePathname();
  const house = useHouseClient();
  const { activePath, markPending } = useHouseNavPending();
  const segmentRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tiles = workspaceSliderSegments(options);
  const pills = tiles.map((tile) => ({ id: tile.mode, label: tile.label, href: tile.href }));
  const routeWorkspace = resolveWorkspaceMode(activePath, current);
  const routeIndex = overviewLeadActiveIndex(activePath, routeWorkspace, pills);

  function onSegmentKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = workspaceSwitcherNextSegmentIndex(
      index,
      pills.length,
      event.key === "ArrowRight" ? 1 : -1,
    );
    segmentRefs.current[next]?.focus();
  }

  if (pills.length <= 1) {
    const only = pills[0];
    if (!only) return null;
    return (
      <span
        data-workspace-switcher=""
        data-workspace-switcher-presentation="pills"
        className={WORKSPACE_SWITCHER_STATIC_CLASS}
      >
        <span data-workspace-switcher-current="" className={WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS}>
          {only.label}
        </span>
      </span>
    );
  }

  return (
    <SegmentedTrack
      activeIndex={routeIndex}
      persistKey={SEGMENTED_TRACK_PERSIST.workspace}
      trackClass={WORKSPACE_SWITCHER_SEGMENTS_CLASS}
      thumbClass={WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS}
      data-workspace-switcher=""
      data-workspace-switcher-presentation="pills"
      data-workspace-switcher-pills=""
      role="tablist"
      aria-label={WORKSPACE_SWITCHER.label}
    >
      {({ selectedIndex }) =>
        pills.map((pill, index) => {
          const selected = segmentedItemOn(index, selectedIndex);
          return (
            <button
              key={pill.id}
              ref={(node) => {
                segmentRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              data-segmented-item=""
              data-workspace-switcher-segment={pill.id}
              aria-selected={selected}
              tabIndex={workspaceSwitcherSegmentTabIndex(selected)}
              className={workspaceSwitcherSegmentClass(selected)}
              onClick={(event) => {
                const tile = tiles.find((row) => row.mode === pill.id);
                if (!tile) return;
                selectWorkspaceTile(
                  current,
                  tile,
                  tiles,
                  router,
                  shellPath,
                  isGcStaff,
                  markPending,
                  event,
                  house?.navigateOwned,
                );
              }}
              onKeyDown={(event) => onSegmentKeyDown(event, index)}
            >
              {pill.label}
            </button>
          );
        })
      }
    </SegmentedTrack>
  );
}

export function WorkspaceSwitcher({
  current: requestedCurrent,
  isGcStaff = false,
  options = availableWorkspaceOptions(),
  defaultOpen = false,
  presentation = "waffle",
}: {
  current: WorkspaceMode;
  isGcStaff?: boolean;
  options?: readonly WorkspaceMenuOption[];
  defaultOpen?: boolean;
  presentation?: "waffle" | "pills";
}) {
  const staffGate = isGcStaff || options.some((option) => option.mode === "staff");
  const current = clampWorkspaceMode(requestedCurrent, staffGate);
  const router = useRouter();
  const pathname = useHousePathname();
  const { activePath } = useHouseNavPending();
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const tiles = workspaceWaffleTiles(options);
  const chromePath = activePath || pathname;

  useEffect(() => {
    prefetchHrefList(router.prefetch, phoneWorkspaceSwitcherPrefetchHrefs(options));
  }, [options, router]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setPanelStyle(
        workspaceSwitcherMenuStyle({
          trigger: trigger.getBoundingClientRect(),
          chromeBottoms: workspaceSwitcherChromeClearanceBottoms(),
          viewportWidth: window.innerWidth,
        }),
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      const host = hostRef.current;
      const panel = panelRef.current;
      if (host?.contains(target) || panel?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (options.length === 0) return null;

  if (presentation === "pills") {
    return <WorkspaceSlider current={current} options={options} isGcStaff={staffGate} />;
  }

  const faces = (key: string) => (
    <WorkspaceWaffleTiles
      key={key}
      tiles={tiles}
      current={current}
      chromePath={chromePath}
      staffGate={staffGate}
      onNavigate={() => setOpen(false)}
    />
  );

  const panel = (
    <div ref={panelRef} className="contents">
      <div
        data-workspace-switcher-popover=""
        data-workspace-switcher-presentation="waffle"
        className={WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS}
        style={panelStyle}
      >
        {faces("desktop")}
      </div>
      <div
        data-workspace-switcher-sheet=""
        data-workspace-switcher-presentation="waffle"
        className={WORKSPACE_SWITCHER_SHEET_HOST_CLASS}
      >
        <button
          type="button"
          aria-label={WORKSPACE_SWITCHER.close}
          data-workspace-switcher-sheet-scrim=""
          className={WORKSPACE_SWITCHER_SHEET_SCRIM_CLASS}
          onClick={() => setOpen(false)}
        />
        <div
          data-workspace-waffle-sheet=""
          className={`relative z-10 ${WORKSPACE_SWITCHER_SHEET_SURFACE_CLASS}`}
        >
          <div data-workspace-waffle-phone="" className="flex flex-col gap-[var(--space-2)]">
            <WorkspaceWaffleHomeRow
              current={current}
              chromePath={chromePath}
              onNavigate={() => setOpen(false)}
            />
            {faces("phone")}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={hostRef}
      data-workspace-switcher=""
      data-workspace-switcher-presentation="waffle"
      className={WORKSPACE_SWITCHER_HOST_CLASS}
    >
      <button
        ref={triggerRef}
        type="button"
        data-workspace-switcher-trigger=""
        data-workspace-waffle=""
        aria-label={WORKSPACE_SWITCHER.heading}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((next) => !next)}
        className={cn(WORKSPACE_WAFFLE_TRIGGER_CLASS, open && WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS)}
      >
        <DotsNine
          data-workspace-waffle-icon="phone"
          className={HOUSE_HEADER_TRAILING_PHONE_CLASS}
          weight={HOUSE_PHONE_CHROME_ICON_WEIGHT}
        />
        <DotsNine
          data-workspace-waffle-icon="desktop"
          className={HOUSE_HEADER_TRAILING_DESKTOP_CLASS}
          weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
        />
      </button>
      {open
        ? typeof document !== "undefined"
          ? createPortal(panel, document.body)
          : panel
        : null}
    </div>
  );
}
