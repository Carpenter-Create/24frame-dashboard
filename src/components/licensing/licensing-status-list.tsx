"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useHouseWindowEntry } from "@/components/chrome/house-window";
import { DeliverWindow, type DeliverVendor } from "@/components/licensing/deliver-window";
import { TitlesLandscapeArt } from "@/components/titles/titles-catalog";
import { StatusProgressTrack } from "@/components/ui/status-progress-track";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  deliverWindowClosedHref,
  deliverWindowOpenHref,
  parseDeliverWindow,
  parseDeliverWindowIds,
  type DeliverActions,
} from "@/lib/deliver-stepper";
import {
  LICENSING_VENDOR_INDENT_CLASS,
  LICENSING_VENDOR_NEW_CLASS,
  licensingActivityDate,
  licensingDeliverLabel,
  licensingDeliverVisible,
  licensingPruneSelection,
  licensingShownSelection,
  licensingTitleMeta,
  type LicensingTitleGroup,
} from "@/lib/gc-deliveries";
import {
  TITLES_LIST_CLASS,
  TITLES_LIST_ROW_CLASS,
  TITLES_ROW_COPY_CLASS,
  TITLES_ROW_META_CLASS,
  TITLES_ROW_NAME_CLASS,
  TITLES_THUMB_CLASS,
} from "@/lib/titles-catalog";

// Titles catalog parent + indented vendor sub-rows. Phone stacks art /
// title / track / date — never a horizontal meta cram. Deliver · N only
// when ≥1 drawn title is ticked, and only for staff with operate: it opens the
// Deliver window over this list (docs/design-locks/staff-licensing-deliver-window-lock-v1.md).

/** Deliver's own history flag (a shell entry is never one). */
const DELIVER_ENTRY_FLAG = "deliverWindow";

function SelectMark({
  titleId,
  selected,
  onToggle,
}: {
  titleId: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${titleId}`}
      data-gc-licensing-select={titleId}
      onClick={() => onToggle(titleId)}
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[4px]",
        selected ? "bg-accent text-accent-contrast" : "border-[1.5px] border-hairline bg-surface",
      )}
    >
      {selected ? (
        <span aria-hidden className="t-label font-bold">
          ✓
        </span>
      ) : null}
    </button>
  );
}

export function VendorSubRow({
  deliveryId,
  vendorName,
  status,
  submittedAt,
  isNew = false,
}: {
  deliveryId: string;
  vendorName: string;
  status: string;
  submittedAt: string | null;
  /** Deliver just created it: it fades in once the window has left. */
  isNew?: boolean;
}) {
  const submitted = licensingActivityDate(submittedAt);
  return (
    <div
      data-gc-licensing-vendor={deliveryId}
      data-gc-licensing-indent=""
      data-gc-licensing-new={isNew ? "" : undefined}
      className={cn(
        LICENSING_VENDOR_INDENT_CLASS,
        "flex flex-col gap-[var(--space-2)] py-[var(--space-3)] pr-[var(--space-4)] md:flex-row md:items-center md:justify-between",
        isNew && LICENSING_VENDOR_NEW_CLASS,
      )}
    >
      <span className="t-body-sm font-medium text-ink">{vendorName}</span>
      <span className="flex flex-col gap-[var(--space-2)] md:flex-row md:items-center md:gap-[var(--space-4)]">
        <StatusProgressTrack
          pipeline="delivery"
          status={status}
          data-gc-licensing-track=""
        />
        {submitted ? (
          <span className="t-body-sm text-ink-3" data-gc-licensing-submitted="">
            {submitted}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function TitleGroup({
  group,
  canSelect,
  selected,
  painted,
  onToggle,
}: {
  group: LicensingTitleGroup;
  canSelect: boolean;
  selected: boolean;
  painted: readonly string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div data-gc-licensing-title={group.id} className="flex flex-col">
      <div
        className={cn(
          TITLES_LIST_ROW_CLASS,
          "md:border-b-0",
        )}
        data-gc-licensing-parent=""
      >
        <TitlesLandscapeArt
          title={group.title}
          stillUrl={group.stillUrl}
          className={TITLES_THUMB_CLASS}
        />
        <span className={TITLES_ROW_META_CLASS}>
          <span className={TITLES_ROW_COPY_CLASS}>
            <span className={TITLES_ROW_NAME_CLASS} data-gc-licensing-name="">
              {group.title}
            </span>
            {licensingTitleMeta(group) ? (
              <span className="t-body-sm text-ink-3" data-gc-licensing-meta="">
                {licensingTitleMeta(group)}
              </span>
            ) : null}
          </span>
          {canSelect ? <SelectMark titleId={group.id} selected={selected} onToggle={onToggle} /> : null}
        </span>
      </div>
      {group.vendors.map((row) => (
        <VendorSubRow
          key={row.deliveryId}
          deliveryId={row.deliveryId}
          vendorName={row.vendorName}
          status={row.status}
          submittedAt={row.submittedAt}
          isNew={painted.includes(row.deliveryId)}
        />
      ))}
    </div>
  );
}

export function LicensingStatusList({
  groups,
  vendors,
  canDeliver,
  deliverActions,
  empty = null,
}: {
  groups: readonly LicensingTitleGroup[];
  /** Active channels, for the Deliver window's Channel face. */
  vendors: readonly DeliverVendor[];
  /** gc_can(operate), literally true. A hint only: the actions and the RPC
   *  enforce. Without it there are no ticks, no Deliver and no window. */
  canDeliver: boolean;
  /** The server actions, passed only when canDeliver. */
  deliverActions: DeliverActions | null;
  /** Drawn when there are no titles (the list stays mounted). */
  empty?: ReactNode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  // The window's titles: set by the click or the hand-over, never a ref read
  // during render.
  const [windowIds, setWindowIds] = useState<string[]>([]);
  // Deliveries the window just created: they fade in after it leaves.
  const [painted, setPainted] = useState<string[]>([]);
  const deliverButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastDeliveredRef = useRef<string | null>(null);
  const scrolledRef = useRef<readonly string[] | null>(null);
  const groupIds = groups.map((group) => group.id);
  // Only the ticks drawn now count and go: a search or filter that hides a
  // ticked row (or every row) leaves it out, and the bar goes with the rows.
  const ticked = licensingShownSelection(selected, groupIds);

  // The page without ?deliver (no window entry, no flags).
  function stripDeliver() {
    window.history.replaceState({}, "", deliverWindowClosedHref(window.location.pathname, window.location.search));
  }

  function opensOnArrival(): boolean {
    // No overlay over an empty list, and nothing for staff without operate.
    if (!canDeliver || groups.length === 0) {
      stripDeliver();
      return false;
    }
    // The hand-over (?deliver=<ids>): tick the ids this list shows; the
    // window takes them all and the shell drops them from the address.
    const handed = parseDeliverWindowIds(window.location.search);
    if (handed.length > 0) {
      const shown = new Set(groupIds);
      setSelected(handed.filter((id) => shown.has(id)));
      setWindowIds(handed);
      setPainted([]);
      return true;
    }
    // Forward onto a bare ?deliver with the ticks still here.
    if (ticked.length > 0) {
      setWindowIds(ticked);
      setPainted([]);
      return true;
    }
    // A reload or a new tab on a bare ?deliver: the ticks are gone.
    stripDeliver();
    return false;
  }

  const entry = useHouseWindowEntry<"channel">({
    flag: DELIVER_ENTRY_FLAG,
    indexFace: "channel",
    parse: parseDeliverWindow,
    openHref: deliverWindowOpenHref,
    closedHref: deliverWindowClosedHref,
    opensOnArrival,
    // Deliver, or the delivered title's tick when the bar has gone.
    returnFocus: () =>
      deliverButtonRef.current ??
      (lastDeliveredRef.current
        ? listRef.current?.querySelector<HTMLElement>(`[data-gc-licensing-select="${lastDeliveredRef.current}"]`)
        : null) ??
      listRef.current,
  });
  const win = entry.win;

  // The first new channel row comes into view once per paint.
  useEffect(() => {
    if (painted.length === 0 || scrolledRef.current === painted) return;
    const row = listRef.current?.querySelector<HTMLElement>("[data-gc-licensing-new]");
    if (!row) return;
    scrolledRef.current = painted;
    row.scrollIntoView?.({ block: "nearest" });
  }, [painted, groups]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  }

  const showDeliver = canDeliver && licensingDeliverVisible(ticked.length);

  return (
    <div data-gc-licensing-list="" ref={listRef} tabIndex={-1} className="outline-none">
      {groups.length === 0 ? (
        empty
      ) : (
        <div className={TITLES_LIST_CLASS}>
          {groups.map((group) => (
            <TitleGroup
              key={group.id}
              group={group}
              canSelect={canDeliver}
              selected={selected.includes(group.id)}
              painted={painted}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
      {showDeliver ? (
        <div
          data-gc-licensing-deliver-bar=""
          className="sticky bottom-0 z-10 mt-[var(--space-4)] flex justify-end bg-bg py-[var(--space-3)] max-md:w-full"
        >
          <Button
            ref={deliverButtonRef}
            type="button"
            data-gc-licensing-deliver=""
            aria-haspopup="dialog"
            aria-expanded={win !== null}
            className="max-md:w-full"
            onClick={() => {
              setPainted([]);
              setWindowIds(ticked);
              entry.openFromPage("channel");
            }}
          >
            {licensingDeliverLabel(ticked.length)}
          </Button>
        </div>
      ) : null}
      {win && canDeliver && deliverActions ? (
        <DeliverWindow
          key={win.key}
          titleIds={windowIds}
          vendors={vendors}
          actions={deliverActions}
          requestRef={entry.requestRef}
          onClose={(outcome) => {
            // Delivered titles un-tick as the window closes; failed, unsent
            // and set-aside titles stay ticked.
            lastDeliveredRef.current = outcome.delivered[0] ?? null;
            setSelected(licensingPruneSelection(selected, groupIds, outcome.delivered));
            // Back restores the page as it was before the window: once it
            // lands, refresh, and the new channel rows fade in (never hidden
            // behind the window).
            entry.close(
              win.key,
              outcome.saved
                ? () => {
                    setPainted(outcome.created);
                    router.refresh();
                  }
                : undefined,
            );
          }}
        />
      ) : null}
    </div>
  );
}
