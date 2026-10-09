"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, X } from "@phosphor-icons/react";

import { useHouseDesktop } from "@/components/chrome/house-overlay";
import { HousePageSelectOptions } from "@/components/chrome/house-page-select";
import {
  HouseWindowAsk,
  HouseWindowFrame,
  useHouseWindow,
  useHouseWindowEntry,
  type HouseWindowRequest,
} from "@/components/chrome/house-window";
import { SettingsDrillRow } from "@/components/settings/settings-drill";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import {
  ADD_RIGHT,
  ADD_RIGHT_CHOICE_CLASS,
  ADD_RIGHT_CHOICES_CLASS,
  ADD_RIGHT_NOTE_CLASS,
  ADD_RIGHT_ROWS,
  ADD_RIGHT_SEARCH_CLASS,
  ADD_RIGHT_TERRITORY_LINE_CLASS,
  EMPTY_ADD_RIGHT,
  addRightChangedRows,
  addRightClosedHref,
  addRightCodes,
  addRightCountryGroups,
  addRightDiscardLine,
  addRightOpenHref,
  addRightRequest,
  addRightSummary,
  addRightTogglePick,
  addRightType,
  addRightTypeGroups,
  addRightValues,
  checkAddRight,
  parseAddRightWindow,
  type AddRightDraft,
  type AddRightFace,
  type AddRightProblem,
} from "@/lib/add-right";
import { HOUSE_WINDOW_CARD_CLASS, type HouseWindowMotion } from "@/lib/house-window";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { exclusivityLabel, type RightsType } from "@/lib/rights";
import { TERRITORY_MODES, TERRITORY_MODE_LABEL, territoryLine, type TerritoryMode } from "@/lib/territories";
import { parseTitleDetailsWindow } from "@/lib/title-details";
import { addRights, type AddRightResult } from "./actions";

// The title's Add right window (docs/design-locks/aggregation-add-right-window-lock-v1.md):
// the house window shell over the title page on a computer (held at 80vh, so
// the long lists have room), the same window as the full AppSheet on a phone.
// One draft; Done checks in face order, returns a complete draft to the index
// (the review), and only there adds the grant. Never optimistic: a grant is
// a permanent record, so the row appears behind only once the database has it.

/** The window's own history flag (a shell entry is never one). */
const ENTRY_FLAG = "addRightWindow";

/** The Add right control on the Rights card, and the window it opens.
 *  Operators only: the page never mounts it for anyone else or under view-as. */
export function AddRightEntry({ titleId }: { titleId: string }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const entry = useHouseWindowEntry<AddRightFace>({
    flag: ENTRY_FLAG,
    indexFace: "index",
    parse: parseAddRightWindow,
    openHref: addRightOpenHref,
    closedHref: addRightClosedHref,
    // Both widths open here. An address that also names the Metadata window
    // opens only that one (no dialog over a dialog); Metadata's own entry
    // strips this query from the page under it.
    opensOnArrival: () => parseTitleDetailsWindow(window.location.search) === null,
    returnFocus: () => buttonRef.current,
  });
  const win = entry.win;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-add-right-entry=""
        aria-haspopup="dialog"
        aria-expanded={win !== null}
        className="t-body-sm text-accent"
        onClick={() => entry.openFromPage("index")}
      >
        {ADD_RIGHT.entry}
      </button>
      {win ? (
        <AddRightWindow
          key={win.key}
          titleId={titleId}
          initialFace={win.face}
          requestRef={entry.requestRef}
          onClose={(refresh) =>
            // The page under the entry was painted before the grant: once
            // Back lands there, take the new row.
            entry.close(win.key, refresh ? () => router.refresh() : undefined)
          }
        />
      ) : null}
    </>
  );
}

export function AddRightWindow({
  titleId,
  initialFace,
  requestRef,
  onClose,
}: {
  titleId: string;
  initialFace: AddRightFace;
  requestRef: HouseWindowRequest;
  /** `refresh`: the page behind may have a new row (added, or unknown). */
  onClose: (refresh: boolean) => void;
}) {
  const desktop = useHouseDesktop();
  const ids = useId();
  const [face, setFace] = useState<AddRightFace>(initialFace);
  const [motion, setMotion] = useState<HouseWindowMotion>(null);
  const [cameFrom, setCameFrom] = useState<AddRightFace | null>(null);
  // Starts empty on every open; never taken from the address.
  const [draft, setDraft] = useState<AddRightDraft>(EMPTY_ADD_RIGHT);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<AddRightProblem | null>(null);
  // The page behind refreshes on close: a request that failed outright (what
  // the server kept is unknown) or a grant found already on the title.
  const refreshRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const changedRows = addRightChangedRows(draft);
  const errorId = `${ids}-error`;
  const faceProblem = problem?.face === face ? problem : null;

  function openFace(next: AddRightFace) {
    setMotion(next === "index" ? "pop" : "push");
    setCameFrom(next === "index" ? face : null);
    setFace(next);
  }

  function back() {
    if (pending) return;
    openFace("index");
  }

  async function done() {
    if (pending) return;
    const issue = checkAddRight(addRightValues(draft));
    if (issue) {
      setProblem(issue);
      if (issue.face !== face) openFace(issue.face);
      return;
    }
    // A complete draft returns to the index first: all three summaries are in
    // view before a permanent record is written. Nothing is sent from a face.
    if (face !== "index") {
      setProblem(null);
      openFace("index");
      return;
    }
    const request = addRightRequest(titleId, draft);
    if (!request) return;
    setProblem(null);
    setPending(true);
    let result: AddRightResult;
    try {
      result = await addRights(request);
    } catch {
      // The request itself failed (a dropped connection, a new deploy): what
      // the server kept is unknown, so the page refreshes when the window
      // closes, and the window is never left waiting.
      refreshRef.current = true;
      result = { ok: false, face: null, error: ADD_RIGHT.saveFailed, onTitle: false };
    } finally {
      if (mountedRef.current) setPending(false);
    }
    if (!mountedRef.current) return;
    if (result.ok) {
      onClose(true);
      return;
    }
    if (result.onTitle) refreshRef.current = true;
    const at = result.face ?? "index";
    setProblem({ face: at, error: result.error });
    if (at !== face) openFace(at);
  }

  const [win, winRefs] = useHouseWindow({
    attr: "add-right",
    face,
    indexFace: "index",
    cameFrom,
    dirty: changedRows.length > 0,
    busy: pending,
    holdOpen: pending,
    onDone: () => void done(),
    onBack: back,
    onClose: () => onClose(refreshRef.current),
    // The draft goes with the window.
    onDiscard: () => undefined,
    requestRef,
    phone: "sheet",
  });

  // A face's value changed: its line (if any) goes, and so does the index's
  // (it named the draft as it was).
  function change(next: (current: AddRightDraft) => AddRightDraft, at: AddRightFace) {
    setDraft(next);
    if (problem?.face === at || problem?.face === "index") setProblem(null);
  }

  const notice = faceProblem ? (
    <InlineNotice tone="error" id={errorId}>
      {faceProblem.error}
    </InlineNotice>
  ) : null;
  const describedBy = faceProblem ? errorId : undefined;

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={ADD_RIGHT.faces[face]}
      motion={motion}
      closeLabel={ADD_RIGHT.close}
      backLabel={ADD_RIGHT.back}
      doneLabel={ADD_RIGHT.done}
      closeIcon={<X size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      backIcon={<CaretLeft size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      fill
      ask={
        <HouseWindowAsk
          attr="add-right"
          variant={desktop ? "strip" : "sheet"}
          titleId={win.askTitleId}
          title={ADD_RIGHT.discardTitle}
          lines={[addRightDiscardLine(changedRows)].filter(Boolean)}
          keepLabel={ADD_RIGHT.discardKeep}
          discardLabel={ADD_RIGHT.discardConfirm}
          onKeep={win.keepEditing}
          onDiscard={win.discard}
        />
      }
    >
      {face === "index" ? (
        <AddRightIndex draft={draft} notice={notice} onOpen={openFace} />
      ) : face === "type" ? (
        <AddRightTypeFace
          ids={ids}
          value={draft.type}
          notice={notice}
          describedBy={describedBy}
          onChange={(type) => change((current) => ({ ...current, type }), "type")}
        />
      ) : face === "territory" ? (
        <AddRightTerritoryFace
          ids={ids}
          draft={draft}
          query={query}
          notice={notice}
          describedBy={describedBy}
          onMode={(mode) => change((current) => ({ ...current, mode }), "territory")}
          onToggle={(code) => change((current) => addRightTogglePick(current, code), "territory")}
          onQuery={setQuery}
        />
      ) : (
        <AddRightExclusivityFace
          ids={ids}
          value={draft.exclusive}
          notice={notice}
          describedBy={describedBy}
          onChange={(exclusive) => change((current) => ({ ...current, exclusive }), "exclusivity")}
        />
      )}
    </HouseWindowFrame>
  );
}

export function AddRightIndex({
  draft,
  notice = null,
  onOpen,
}: {
  draft: AddRightDraft;
  notice?: ReactNode;
  onOpen: (face: AddRightFace) => void;
}) {
  return (
    <>
      <div data-add-right-rows="" className={HOUSE_WINDOW_CARD_CLASS}>
        {ADD_RIGHT_ROWS.map((row, index) => (
          <div key={row}>
            {index > 0 ? <div className="h-px bg-hairline" /> : null}
            <SettingsDrillRow
              kind={row}
              label={ADD_RIGHT.faces[row]}
              value={addRightSummary(draft, row)}
              itemAttr={`data-add-right-${row}-open`}
              onClick={() => onOpen(row)}
            />
          </div>
        ))}
      </div>
      <p className={ADD_RIGHT_NOTE_CLASS}>{ADD_RIGHT.intro}</p>
      {notice}
    </>
  );
}

export function AddRightTypeFace({
  ids,
  value,
  notice = null,
  describedBy,
  onChange,
}: {
  ids: string;
  value: RightsType | null;
  notice?: ReactNode;
  describedBy?: string;
  onChange: (type: RightsType) => void;
}) {
  const groups = useMemo(() => addRightTypeGroups(), []);
  return (
    <div data-add-right-face="type" className="flex flex-col gap-[var(--space-4)]">
      {/* Above the list, so it is in view when Done lands here. */}
      {notice}
      <HousePageSelectOptions
        inline={{ id: `${ids}-type`, "aria-describedby": describedBy }}
        groups={groups}
        value={value ?? undefined}
        ariaLabel={ADD_RIGHT.faces.type}
        onPick={(key) => {
          const type = addRightType(key);
          if (type) onChange(type);
        }}
      />
    </div>
  );
}

export function AddRightTerritoryFace({
  ids,
  draft,
  query,
  notice = null,
  describedBy,
  onMode,
  onToggle,
  onQuery,
}: {
  ids: string;
  draft: AddRightDraft;
  query: string;
  notice?: ReactNode;
  describedBy?: string;
  onMode: (mode: TerritoryMode) => void;
  onToggle: (code: string) => void;
  onQuery: (query: string) => void;
}) {
  const groups = useMemo(() => addRightCountryGroups(query), [query]);
  const codes = addRightCodes(draft);
  const searchId = `${ids}-search`;
  return (
    <div data-add-right-face="territory" className="flex flex-col gap-[var(--space-4)]">
      <fieldset className="flex flex-col gap-[var(--space-2)]">
        <legend className="sr-only">{ADD_RIGHT.faces.territory}</legend>
        <div className={ADD_RIGHT_CHOICES_CLASS}>
          {TERRITORY_MODES.map((mode) => (
            <label key={mode} className={ADD_RIGHT_CHOICE_CLASS}>
              <input
                type="radio"
                name={`${ids}-territory-mode`}
                value={mode}
                checked={draft.mode === mode}
                onChange={() => onMode(mode)}
              />
              {TERRITORY_MODE_LABEL[mode]}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Above the countries, so it is in view when Done lands here. */}
      {notice}
      {draft.mode !== "world" ? (
        <>
          {codes.length > 0 ? (
            <p data-add-right-territory-line="" className={ADD_RIGHT_TERRITORY_LINE_CLASS}>
              {territoryLine(draft.mode, codes)}
            </p>
          ) : null}
          <div data-add-right-search="" className={ADD_RIGHT_SEARCH_CLASS}>
            <Input
              id={searchId}
              type="search"
              aria-label={ADD_RIGHT.search}
              placeholder={ADD_RIGHT.search}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
            />
          </div>
          {groups.length > 0 ? (
            <HousePageSelectOptions
              inline={{ id: `${ids}-countries`, "aria-describedby": describedBy }}
              multiple
              values={codes}
              groups={groups}
              ariaLabel={TERRITORY_MODE_LABEL[draft.mode]}
              onPick={onToggle}
            />
          ) : (
            <p data-add-right-no-match="" className={ADD_RIGHT_NOTE_CLASS}>
              {ADD_RIGHT.noMatch}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

export function AddRightExclusivityFace({
  ids,
  value,
  notice = null,
  describedBy,
  onChange,
}: {
  ids: string;
  value: boolean | null;
  notice?: ReactNode;
  describedBy?: string;
  onChange: (exclusive: boolean) => void;
}) {
  return (
    <div data-add-right-face="exclusivity" className="flex flex-col gap-[var(--space-4)]">
      <fieldset className="flex flex-col gap-[var(--space-2)]" aria-describedby={describedBy}>
        <legend className="sr-only">{ADD_RIGHT.faces.exclusivity}</legend>
        <div className={ADD_RIGHT_CHOICES_CLASS}>
          {[true, false].map((exclusive) => (
            <label key={String(exclusive)} className={ADD_RIGHT_CHOICE_CLASS}>
              <input
                type="radio"
                name={`${ids}-exclusivity`}
                value={exclusive ? "exclusive" : "non_exclusive"}
                checked={value === exclusive}
                onChange={() => onChange(exclusive)}
              />
              {exclusivityLabel(exclusive)}
            </label>
          ))}
        </div>
      </fieldset>
      <p className={ADD_RIGHT_NOTE_CLASS}>{ADD_RIGHT.explanation}</p>
      {notice}
    </div>
  );
}
