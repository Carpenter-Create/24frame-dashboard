"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CaretLeft, X } from "@phosphor-icons/react";

import { useHouseDesktop } from "@/components/chrome/house-overlay";
import {
  HouseWindowAsk,
  HouseWindowFrame,
  pushHouseWindowEntry,
  useHouseWindow,
  useHouseWindowEntry,
  type HouseWindowRequest,
} from "@/components/chrome/house-window";
import { SettingsDrillRow } from "@/components/settings/settings-drill";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HOUSE_WINDOW_CARD_CLASS, type HouseWindowMotion } from "@/lib/house-window";
import { METADATA_FIELDS, type FieldDef, type Tier } from "@/lib/metadata";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import {
  RELEASE_TYPE_LABEL,
  formatReleaseDate,
  latestOriginalReleaseDate,
  type ReleaseInfo,
  type ReleaseType,
} from "@/lib/releases";
import {
  RELEASE_FIELD,
  TITLE_DETAILS,
  TITLE_DETAILS_TIERS,
  checkTitleDetails,
  metadataChanges,
  metadataToDraft,
  parseTitleDetailsWindow,
  releaseChanged,
  releaseDraft,
  releaseInfoFromDraft,
  titleDetailsChangedRows,
  titleDetailsClosedHref,
  titleDetailsDiscardLine,
  titleDetailsFaceForField,
  titleDetailsOpenHref,
  titleDetailsReleaseSummary,
  titleDetailsTierSummary,
  type MetadataDraft,
  type ReleaseDraft,
  type TitleDetailsFace,
  type TitleDetailsProblem,
} from "@/lib/title-details";
import { saveTitleDetails } from "./actions";

// The title's Metadata window (docs/design-locks/aggregation-title-details-window-lock-v1.md):
// the house window shell over the title page on a computer, the same window as
// the full AppSheet on a phone. One draft; one Done saves what changed and the
// page behind already shows it as the window leaves.

/** The window's own history flag (a shell entry is never one). */
const ENTRY_FLAG = "titleDetailsWindow";

// The control that opened the window, so focus goes back to it on close.
let opener: HTMLElement | null = null;

function takeOpener(): HTMLElement | null {
  const node = opener;
  opener = null;
  return node?.isConnected ? node : null;
}

/** A link into the window at a face (the notice, Release's Edit). Its href
 *  still works in a new tab; a plain click pushes the window's own entry. */
export function TitleDetailsLink({
  face,
  className,
  children,
}: {
  face: TitleDetailsFace;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <a
      href={titleDetailsOpenHref(pathname, "", face)}
      // The shell's own click owner would take this same-screen hop first
      // (an entry Next cannot see): the house-link mark leaves it here.
      data-house-link=""
      data-title-details-link={face}
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (parseTitleDetailsWindow(window.location.search) !== null) return;
        opener = event.currentTarget;
        pushHouseWindowEntry(ENTRY_FLAG, titleDetailsOpenHref(window.location.pathname, window.location.search, face));
      }}
    >
      {children}
    </a>
  );
}

export type TitleDetailsProps = {
  titleId: string;
  metadata: Record<string, unknown>;
  release: ReleaseInfo;
  /** GC-owned; shown read-only on Release. */
  releaseDate: string | null;
};

/** The Edit control on the Metadata card, and the window it opens. Operators
 *  only: the page never mounts it for anyone else or under view-as. */
export function TitleDetailsEntry(props: TitleDetailsProps) {
  const router = useRouter();
  const editRef = useRef<HTMLButtonElement>(null);
  const entry = useHouseWindowEntry<TitleDetailsFace>({
    flag: ENTRY_FLAG,
    indexFace: "index",
    parse: parseTitleDetailsWindow,
    openHref: titleDetailsOpenHref,
    closedHref: titleDetailsClosedHref,
    // A computer gets the window, a phone the full sheet: both open here.
    opensOnArrival: () => true,
    returnFocus: () => takeOpener() ?? editRef.current,
  });
  const win = entry.win;

  return (
    <>
      <button
        ref={editRef}
        type="button"
        data-title-details-entry=""
        aria-haspopup="dialog"
        aria-expanded={win !== null}
        className="t-body-sm text-accent"
        onClick={() => {
          opener = editRef.current;
          entry.openFromPage("index");
        }}
      >
        {TITLE_DETAILS.edit}
      </button>
      {win ? (
        <TitleDetailsWindow
          key={win.key}
          {...props}
          initialFace={win.face}
          requestRef={entry.requestRef}
          onClose={(saved) =>
            // The page under the entry was painted before the save: once Back
            // lands there, take the saved values.
            entry.close(win.key, saved ? () => router.refresh() : undefined)
          }
        />
      ) : null}
    </>
  );
}

export function TitleDetailsWindow({
  titleId,
  metadata,
  release,
  releaseDate,
  initialFace,
  requestRef,
  onClose,
}: TitleDetailsProps & {
  initialFace: TitleDetailsFace;
  requestRef: HouseWindowRequest;
  onClose: (saved: boolean) => void;
}) {
  const desktop = useHouseDesktop();
  const ids = useId();
  const [face, setFace] = useState<TitleDetailsFace>(initialFace);
  const [motion, setMotion] = useState<HouseWindowMotion>(null);
  const [cameFrom, setCameFrom] = useState<TitleDetailsFace | null>(null);
  // What is stored: the window opened on it, and a part that saved moves it.
  const [baseline, setBaseline] = useState(() => ({ metadata, release }));
  const [draft, setDraft] = useState(() => ({
    metadata: metadataToDraft(metadata),
    release: releaseDraft(release),
  }));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<TitleDetailsProblem | null>(null);
  const savedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const changedRows = titleDetailsChangedRows(baseline, draft);

  function openFace(next: TitleDetailsFace) {
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
    const issue = checkTitleDetails(draft);
    if (issue) {
      setProblem(issue);
      if (issue.face !== face) openFace(issue.face);
      return;
    }
    const changes = metadataChanges(baseline.metadata, draft.metadata);
    const releaseNext = releaseChanged(baseline.release, draft.release) ? releaseInfoFromDraft(draft.release) : null;
    if (Object.keys(changes).length === 0 && releaseNext === null) {
      onClose(savedRef.current);
      return;
    }
    setProblem(null);
    setPending(true);
    const result = await saveTitleDetails({ titleId, metadata: changes, release: releaseNext });
    if (!mountedRef.current) return;
    setPending(false);
    if (result.ok) {
      onClose(true);
      return;
    }
    if (result.metadataSaved) {
      // Metadata is stored; only Release is left to save (and to ask about).
      savedRef.current = true;
      setBaseline((current) => ({ ...current, metadata: applyChanges(current.metadata, changes) }));
    }
    const at: TitleDetailsFace = result.field
      ? titleDetailsFaceForField(result.field)
      : result.part === "release"
        ? "release"
        : face;
    setProblem({ face: at, field: result.field ?? "", error: result.error });
    if (at !== face) openFace(at);
  }

  const [win, winRefs] = useHouseWindow({
    attr: "title-details",
    face,
    indexFace: "index",
    cameFrom,
    dirty: changedRows.length > 0,
    busy: pending,
    holdOpen: pending,
    onDone: () => void done(),
    onBack: back,
    onClose: () => onClose(savedRef.current),
    // The draft goes with the window.
    onDiscard: () => undefined,
    requestRef,
    phone: "sheet",
  });

  // The field at fault takes focus (after the face's own first-field focus).
  useEffect(() => {
    if (!problem?.field) return;
    document.getElementById(fieldId(ids, problem.field))?.focus();
  }, [problem, ids]);

  function setField(key: string, value: string) {
    setDraft((current) => ({ ...current, metadata: { ...current.metadata, [key]: value } }));
    if (problem?.field === key) setProblem(null);
  }

  function setRelease(next: Partial<ReleaseDraft>) {
    setDraft((current) => ({ ...current, release: { ...current.release, ...next } }));
    if (problem?.face === "release") setProblem(null);
  }

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={TITLE_DETAILS.faces[face]}
      motion={motion}
      closeLabel={TITLE_DETAILS.close}
      backLabel={TITLE_DETAILS.back}
      doneLabel={TITLE_DETAILS.done}
      closeIcon={<X size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      backIcon={<CaretLeft size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      ask={
        <HouseWindowAsk
          attr="title-details"
          variant={desktop ? "strip" : "sheet"}
          titleId={win.askTitleId}
          title={TITLE_DETAILS.discardTitle}
          lines={[titleDetailsDiscardLine(changedRows)].filter(Boolean)}
          keepLabel={TITLE_DETAILS.discardKeep}
          discardLabel={TITLE_DETAILS.discardConfirm}
          onKeep={win.keepEditing}
          onDiscard={win.discard}
        />
      }
    >
      {face === "index" ? (
        <TitleDetailsIndex draft={draft} onOpen={openFace} />
      ) : face === "release" ? (
        <ReleaseFace
          ids={ids}
          draft={draft.release}
          releaseDate={releaseDate}
          problem={problem}
          onChange={setRelease}
        />
      ) : (
        <TierFace ids={ids} tier={face} draft={draft.metadata} problem={problem} onChange={setField} />
      )}
      {problem && !problem.field ? <InlineNotice tone="error">{problem.error}</InlineNotice> : null}
    </HouseWindowFrame>
  );
}

function applyChanges(stored: Record<string, unknown>, changes: Record<string, unknown>): Record<string, unknown> {
  const next = { ...stored };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
}

function fieldId(ids: string, key: string): string {
  return `${ids}-${key}`;
}

function errorId(ids: string, key: string): string {
  return `${ids}-${key}-error`;
}

function TitleDetailsIndex({
  draft,
  onOpen,
}: {
  draft: { metadata: MetadataDraft; release: ReleaseDraft };
  onOpen: (face: TitleDetailsFace) => void;
}) {
  const rows: { face: TitleDetailsFace; value: string }[] = [
    ...TITLE_DETAILS_TIERS.map((tier) => ({ face: tier, value: titleDetailsTierSummary(draft.metadata, tier) })),
    { face: "release", value: titleDetailsReleaseSummary(draft.release) },
  ];
  return (
    <div data-title-details-rows="" className={HOUSE_WINDOW_CARD_CLASS}>
      {rows.map((row, index) => (
        <div key={row.face}>
          {index > 0 ? <div className="h-px bg-hairline" /> : null}
          <SettingsDrillRow
            kind={row.face}
            label={TITLE_DETAILS.faces[row.face]}
            value={row.value}
            itemAttr={`data-title-details-${row.face}-open`}
            onClick={() => onOpen(row.face)}
          />
        </div>
      ))}
    </div>
  );
}

function FieldError({ ids, field, problem }: { ids: string; field: string; problem: TitleDetailsProblem | null }) {
  if (problem?.field !== field) return null;
  return (
    <InlineNotice tone="error" id={errorId(ids, field)}>
      {problem.error}
    </InlineNotice>
  );
}

function TierFace({
  ids,
  tier,
  draft,
  problem,
  onChange,
}: {
  ids: string;
  tier: Tier;
  draft: MetadataDraft;
  problem: TitleDetailsProblem | null;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div data-title-details-face={tier} className="flex flex-col gap-[var(--space-4)]">
      {METADATA_FIELDS.filter((f) => f.tier === tier).map((f) => (
        <div key={f.key} className="flex flex-col gap-[var(--space-2)]">
          <Label htmlFor={fieldId(ids, f.key)}>{f.label}</Label>
          <MetadataControl ids={ids} field={f} value={draft[f.key] ?? ""} problem={problem} onChange={onChange} />
          <FieldError ids={ids} field={f.key} problem={problem} />
        </div>
      ))}
    </div>
  );
}

function MetadataControl({
  ids,
  field,
  value,
  problem,
  onChange,
}: {
  ids: string;
  field: FieldDef;
  value: string;
  problem: TitleDetailsProblem | null;
  onChange: (key: string, value: string) => void;
}) {
  const id = fieldId(ids, field.key);
  const invalid = problem?.field === field.key;
  const describedBy = invalid ? errorId(ids, field.key) : undefined;
  if (field.type === "select") {
    return (
      <Select
        id={id}
        value={value}
        options={[{ value: "", label: "—" }, ...(field.vocab ?? [])]}
        aria-describedby={describedBy}
        onChange={(next) => onChange(field.key, next)}
      />
    );
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        id={id}
        rows={6}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(field.key, event.target.value)}
      />
    );
  }
  return (
    <Input
      id={id}
      type={field.type === "number" ? "number" : "text"}
      inputMode={field.type === "number" ? "numeric" : undefined}
      step={field.type === "number" ? 1 : undefined}
      value={value}
      placeholder={field.type === "list" ? TITLE_DETAILS.listHint : undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(field.key, event.target.value)}
    />
  );
}

function ReleaseFace({
  ids,
  draft,
  releaseDate,
  problem,
  onChange,
}: {
  ids: string;
  draft: ReleaseDraft;
  releaseDate: string | null;
  problem: TitleDetailsProblem | null;
  onChange: (next: Partial<ReleaseDraft>) => void;
}) {
  const types: ReleaseType[] = ["new_release", "re_release"];
  const dateId = fieldId(ids, RELEASE_FIELD);
  const invalid = problem?.field === RELEASE_FIELD;
  return (
    <div data-title-details-face="release" className="flex flex-col gap-[var(--space-4)]">
      <fieldset className="flex flex-col gap-[var(--space-2)]">
        <legend className="t-label text-ink-2">{TITLE_DETAILS.releaseType}</legend>
        <div className="flex flex-wrap gap-[var(--space-4)]">
          {types.map((type) => (
            <label key={type} className="flex min-h-11 items-center gap-[var(--space-2)] t-body-sm text-ink-2">
              <input
                type="radio"
                name={`${ids}-release-type`}
                value={type}
                checked={draft.type === type}
                onChange={() => onChange({ type })}
              />
              {RELEASE_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </fieldset>
      {draft.type === "re_release" ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          <Label htmlFor={dateId}>{TITLE_DETAILS.originalReleaseDate}</Label>
          <Input
            id={dateId}
            type="date"
            max={latestOriginalReleaseDate()}
            value={draft.originalDate}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId(ids, RELEASE_FIELD) : undefined}
            onChange={(event) => onChange({ originalDate: event.target.value })}
          />
          <FieldError ids={ids} field={RELEASE_FIELD} problem={problem} />
        </div>
      ) : null}
      <div className="flex flex-col gap-[var(--space-1)]">
        <span className="t-label text-ink-2">{TITLE_DETAILS.releaseDate}</span>
        <span className="t-body-sm text-ink-3">
          {releaseDate ? formatReleaseDate(releaseDate) : TITLE_DETAILS.releaseDateSetBy}
        </span>
      </div>
    </div>
  );
}
