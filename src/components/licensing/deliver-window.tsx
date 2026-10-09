"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CaretLeft, X } from "@phosphor-icons/react";

import { useHouseDesktop } from "@/components/chrome/house-overlay";
import {
  HouseWindowAsk,
  HouseWindowFrame,
  useHouseWindow,
  type HouseWindowRequest,
} from "@/components/chrome/house-window";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  DELIVER_EMPTY_DRAFT,
  DELIVER_EXPORT_FILENAME,
  DELIVER_EXPORT_HREF,
  DELIVER_MAX_TITLES,
  DELIVER_OPTION_CLASS,
  DELIVER_OPTION_SELECTED_CLASS,
  DELIVER_PROGRESS_SEG_OFF_CLASS,
  DELIVER_PROGRESS_SEG_ON_CLASS,
  DELIVER_PROGRESS_TRACK_CLASS,
  DELIVER_STEPPER,
  DELIVER_STEPPER_STEPS,
  deliverBatches,
  deliverCanContinue,
  deliverChangedSteps,
  deliverCloseOutcome,
  deliverDiscardLine,
  deliverEmptyOutcome,
  deliverFaceStep,
  deliverFaces,
  deliverGroupHint,
  deliverIndexFace,
  deliverItemCount,
  deliverItems,
  deliverLoadLine,
  deliverMergeOutcome,
  deliverNotReadyLines,
  deliverOutcomeDelivered,
  deliverOutcomeLines,
  deliverPick,
  deliverPrimaryLabel,
  deliverProgressFilled,
  deliverProgressLine,
  deliverReasonLine,
  deliverResultTitle,
  deliverStepLabel,
  deliverTerritoryChoices,
  grantTerritoryUsesCards,
  planDeliver,
  type DeliverActions,
  type DeliverChoicesResult,
  type DeliverCloseOutcome,
  type DeliverDraft,
  type DeliverFace,
  type DeliverItem,
  type DeliverLoadReason,
  type DeliverOutcome,
  type DeliverPlan,
  type DeliverStepperStep,
} from "@/lib/deliver-stepper";
import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import type { HouseWindowMotion } from "@/lib/house-window";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";

// Deliver: the window over Licensing Status
// (docs/design-locks/staff-licensing-deliver-window-lock-v1.md). The house
// window shell on a computer, the same window as the full AppSheet on a
// phone. Linear faces: Channel (the index) → every Rights face → every
// Territory face → the result. One commit ("Deliver · N") sends batches of
// 25 and waits for each; a part that saved stays saved. The server actions
// arrive as props: this file imports no server code.

export type DeliverVendor = { id: string; name: string };

type Loaded = { plan: DeliverPlan; names: ReadonlyMap<string, string> };

const NO_NAMES: ReadonlyMap<string, string> = new Map();

export function DeliverWindow({
  titleIds,
  vendors,
  actions,
  requestRef,
  onClose,
}: {
  titleIds: readonly string[];
  vendors: readonly DeliverVendor[];
  actions: DeliverActions;
  requestRef: HouseWindowRequest;
  onClose: (outcome: DeliverCloseOutcome) => void;
}) {
  const desktop = useHouseDesktop();
  const ids = useId();
  const [face, setFace] = useState<DeliverFace>("channel");
  const [motion, setMotion] = useState<HouseWindowMotion>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadReason, setLoadReason] = useState<DeliverLoadReason | null>(null);
  const [draft, setDraft] = useState<DeliverDraft>(DELIVER_EMPTY_DRAFT);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<DeliverOutcome | null>(null);
  const [outcome, setOutcome] = useState<DeliverOutcome | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  // Something may be stored: the list refreshes when the window closes.
  const savedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The page re-renders under the window after each batch, and the actions
  // arrive again with it: the load runs once, with the latest actions.
  const actionsRef = useRef(actions);
  useLayoutEffect(() => {
    actionsRef.current = actions;
  });

  const overCap = titleIds.length > DELIVER_MAX_TITLES;

  // Channel draws at once from the page's channels; Continue waits for the
  // selection's titles and grants.
  useEffect(() => {
    if (overCap) return undefined;
    let live = true;
    void (async () => {
      let result: DeliverChoicesResult;
      try {
        result = await actionsRef.current.load({ titleIds: [...titleIds] });
      } catch {
        result = { ok: false, reason: "load_failed" };
      }
      if (!live || !mountedRef.current) return;
      if (!result.ok) {
        setLoadReason(result.reason);
        return;
      }
      // Planned here, once, at the time it loaded (never in render).
      const plan = planDeliver(result.titles, result.notFound, result.grants, new Date());
      setLoaded({ plan, names: new Map(result.titles.map((row) => [row.id, row.title])) });
    })();
    return () => {
      live = false;
    };
  }, [overCap, titleIds]);

  const plan = loaded?.plan ?? null;
  const names = loaded?.names ?? NO_NAMES;
  const faces = useMemo<DeliverFace[]>(() => (plan ? deliverFaces(plan) : ["channel"]), [plan]);
  const itemCount = deliverItemCount(plan);
  const canContinue = deliverCanContinue(face, draft, plan);
  const changedSteps = deliverChangedSteps(draft);

  function go(next: DeliverFace, nextMotion: HouseWindowMotion) {
    // A failed commit's lines belong to the face it ran on.
    if (next !== "done") setOutcome(null);
    setMotion(nextMotion);
    setFace(next);
  }

  function back() {
    if (pending || face === "done") return;
    const at = faces.indexOf(face);
    if (at <= 0) return;
    go(faces[at - 1]!, "pop");
  }

  function closeOutcome(): DeliverCloseOutcome {
    return deliverCloseOutcome(outcome, savedRef.current);
  }

  async function primary() {
    if (pending) return;
    if (face === "done") {
      onClose(closeOutcome());
      return;
    }
    // ⌘/Ctrl+Enter reaches here even while the action is disabled.
    if (!deliverCanContinue(face, draft, plan)) return;
    const at = faces.indexOf(face);
    if (at >= 0 && at < faces.length - 1) {
      go(faces[at + 1]!, "push");
      return;
    }
    if (plan) await commit(plan);
  }

  async function commit(current: DeliverPlan) {
    const items = deliverItems(current, draft);
    if (items.length === 0) return;
    const vendorId = draft.vendorId;
    let result = deliverEmptyOutcome(items.length);
    let sending: DeliverItem[] = [];
    setOutcome(null);
    setProgress(result);
    setPending(true);
    try {
      for (const batch of deliverBatches(items)) {
        sending = batch;
        const answer = await actions.deliver({ vendorId, items: batch });
        result = deliverMergeOutcome(result, answer);
        if (answer.created.length > 0) savedRef.current = true;
        if (mountedRef.current) setProgress(result);
        if (answer.stop) break;
      }
    } catch {
      // The request itself failed (a timeout, a dropped connection, a new
      // deploy): what the server kept of this batch is unknown, so the list
      // refreshes on close, and its titles read "Could not save." and stay
      // ticked. A retry never duplicates (the pre-read and the unique key).
      savedRef.current = true;
      result = deliverMergeOutcome(result, {
        created: [],
        existing: [],
        failed: sending.map((item) => ({ titleId: item.titleId, reason: "save_failed" as const })),
        stop: null,
      });
    } finally {
      if (mountedRef.current) setPending(false);
    }
    if (!mountedRef.current) return;
    setProgress(null);
    setOutcome(result);
    // Nothing went through: stay on this face with the reasons; the draft is
    // kept, and a retry is one press.
    if (deliverOutcomeDelivered(result)) go("done", "push");
  }

  async function download() {
    if (!outcome || exporting) return;
    const delivered = [...outcome.created, ...outcome.existing].map((row) => row.titleId);
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch(DELIVER_EXPORT_HREF, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendorId: draft.vendorId, titleIds: delivered }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (mountedRef.current) setExportError(body.error ?? DELIVER_STEPPER.exportFailed);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = DELIVER_EXPORT_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      if (mountedRef.current) setExportError(DELIVER_STEPPER.exportFailed);
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  }

  const [win, winRefs] = useHouseWindow({
    attr: "deliver",
    face,
    // On the result the window closes from its closing face: ✕, and Esc
    // closes; Back can never return to a submitted face.
    indexFace: deliverIndexFace(face),
    cameFrom: null,
    dirty: face !== "done" && changedSteps.length > 0,
    busy: pending,
    holdOpen: pending || exporting,
    onDone: () => void primary(),
    onBack: back,
    onClose: () => onClose(closeOutcome()),
    // The draft goes with the window.
    onDiscard: () => undefined,
    requestRef,
    phone: "sheet",
  });

  // After the shell's own first-focusable focus: the chosen option, or the
  // result's Download.
  const faceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = faceRef.current?.querySelector<HTMLElement>(
      face === "done" ? "[data-deliver-download]" : "[data-deliver-option-selected]",
    );
    target?.focus();
  }, [face]);

  const { step, group } = deliverFaceStep(face);
  const title = face === "done" && outcome ? deliverResultTitle(outcome) : deliverStepLabel(step);
  const questionId = `${ids}-question`;

  return (
    <HouseWindowFrame
      win={win}
      refs={winRefs}
      title={title}
      motion={motion}
      closeLabel={DELIVER_STEPPER.close}
      backLabel={DELIVER_STEPPER.back}
      doneLabel={deliverPrimaryLabel(face, faces, itemCount, pending)}
      doneDisabled={!canContinue}
      closeIcon={<X size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      backIcon={<CaretLeft size={20} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />}
      ask={
        <HouseWindowAsk
          attr="deliver"
          variant={desktop ? "strip" : "sheet"}
          titleId={win.askTitleId}
          title={DELIVER_STEPPER.discardTitle}
          lines={[deliverDiscardLine(changedSteps)].filter(Boolean)}
          keepLabel={DELIVER_STEPPER.discardKeep}
          discardLabel={DELIVER_STEPPER.discardConfirm}
          onKeep={win.keepEditing}
          onDiscard={win.discard}
        />
      }
    >
      <div ref={faceRef} data-deliver-face={face} className="flex flex-col gap-[var(--space-4)]">
        <DeliverTrack step={step} />
        {face === "channel" ? (
          <DeliverChannelFace
            questionId={questionId}
            selectedCount={titleIds.length}
            vendors={vendors}
            vendorId={draft.vendorId}
            plan={plan}
            overCap={overCap || Boolean(plan?.overCap)}
            loadReason={loadReason}
            onPick={(vendorId) => setDraft((current) => ({ ...current, vendorId }))}
          />
        ) : face === "done" ? (
          outcome ? (
            <DeliverResultFace
              outcome={outcome}
              names={names}
              exporting={exporting}
              exportError={exportError}
              onDownload={() => void download()}
            />
          ) : null
        ) : plan && plan.groups[group] ? (
          step === "rights" ? (
            <DeliverRightsFace
              questionId={questionId}
              plan={plan}
              group={group}
              names={names}
              pick={draft.picks[group]}
              onPick={(key) => setDraft((current) => deliverPick(plan, current, group, key))}
            />
          ) : (
            <DeliverTerritoryFace
              ids={ids}
              questionId={questionId}
              plan={plan}
              group={group}
              names={names}
              pick={draft.picks[group]}
              territory={draft.territories[group] ?? ""}
              onPick={(territory) =>
                setDraft((current) => ({ ...current, territories: { ...current.territories, [group]: territory } }))
              }
            />
          )
        ) : null}
        {pending && progress ? (
          <p data-deliver-progress="" role="status" className="t-body-sm text-ink-3">
            {deliverProgressLine(progress)}
          </p>
        ) : null}
        {face !== "done" && outcome ? <DeliverProblem outcome={outcome} names={names} /> : null}
      </div>
    </HouseWindowFrame>
  );
}

/** The 4-segment track (filled 1/2/3/4): no caption, no wordmark. */
function DeliverTrack({ step }: { step: DeliverStepperStep }) {
  const filled = deliverProgressFilled(step);
  return (
    <div data-deliver-progress-track="" aria-hidden className={DELIVER_PROGRESS_TRACK_CLASS}>
      {DELIVER_STEPPER_STEPS.map((row, index) => (
        <span
          key={row.key}
          data-deliver-progress-seg={index < filled ? "filled" : "empty"}
          className={index < filled ? DELIVER_PROGRESS_SEG_ON_CLASS : DELIVER_PROGRESS_SEG_OFF_CLASS}
        />
      ))}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return <p className={cn("t-body-sm text-ink-3", HOUSE_PHONE_WRAP_CLASS)}>{text}</p>;
}

/** Every line stacked, one per line, never truncated. */
function Lines({ attr, lines }: { attr: string; lines: readonly string[] }) {
  return (
    <ul {...{ [`data-deliver-${attr}`]: "" }} className="flex w-full flex-col gap-[var(--space-1)] text-left">
      {lines.map((line, index) => (
        <li key={index} className={cn("t-body-sm text-ink-2", HOUSE_PHONE_WRAP_CLASS)}>
          {line}
        </li>
      ))}
    </ul>
  );
}

function OptionCard({ selected, label, onSelect }: { selected: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-deliver-option=""
      data-deliver-option-selected={selected ? "" : undefined}
      onClick={onSelect}
      className={selected ? DELIVER_OPTION_SELECTED_CLASS : DELIVER_OPTION_CLASS}
    >
      <span className="flex items-center justify-between gap-[var(--space-3)]">
        <span className={cn("t-body font-medium", HOUSE_PHONE_WRAP_CLASS, selected ? "text-accent" : "text-ink")}>
          {label}
        </span>
        {selected ? (
          <span className="t-body font-bold text-accent" aria-hidden>
            {DELIVER_STEPPER.check}
          </span>
        ) : (
          <span className="size-5 shrink-0 rounded-full border border-hairline" aria-hidden />
        )}
      </span>
    </button>
  );
}

function SetAside({ kind, line, lines }: { kind: string; line: string; lines?: readonly string[] }) {
  return (
    <div data-deliver-set-aside={kind} className="flex flex-col gap-[var(--space-2)]">
      <p className={cn("t-body-sm text-ink-2", HOUSE_PHONE_WRAP_CLASS)}>{line}</p>
      {lines && lines.length > 0 ? <Lines attr="names" lines={lines} /> : null}
    </div>
  );
}

export function DeliverChannelFace({
  questionId,
  selectedCount,
  vendors,
  vendorId,
  plan,
  overCap,
  loadReason,
  onPick,
}: {
  questionId: string;
  selectedCount: number;
  vendors: readonly DeliverVendor[];
  vendorId: string;
  plan: DeliverPlan | null;
  overCap: boolean;
  loadReason: DeliverLoadReason | null;
  onPick: (vendorId: string) => void;
}) {
  return (
    <>
      <p id={questionId} className="t-body text-ink">
        {DELIVER_STEPPER.vendorQuestion}
      </p>
      <Hint text={DELIVER_STEPPER.vendorHint(selectedCount)} />
      {vendors.length > 0 ? (
        <div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-[var(--space-3)]">
          {vendors.map((vendor) => (
            <OptionCard
              key={vendor.id}
              selected={vendorId === vendor.id}
              label={vendor.name}
              onSelect={() => onPick(vendor.id)}
            />
          ))}
        </div>
      ) : (
        <Hint text={DELIVER_STEPPER.noVendors} />
      )}
      {overCap ? <InlineNotice data-deliver-over-cap="">{DELIVER_STEPPER.overCap}</InlineNotice> : null}
      {loadReason ? (
        <InlineNotice tone="error" data-deliver-load-problem="">
          {deliverLoadLine(loadReason)}
        </InlineNotice>
      ) : null}
      {plan && plan.notReady.length > 0 ? (
        <SetAside
          kind="not-ready"
          line={DELIVER_STEPPER.setAsideNotReady(plan.notReady.length)}
          lines={deliverNotReadyLines(plan)}
        />
      ) : null}
      {plan && plan.noGrants.length > 0 ? (
        <SetAside
          kind="no-grants"
          line={DELIVER_STEPPER.setAsideNoGrants(plan.noGrants.length)}
          lines={plan.noGrants.map((row) => row.title)}
        />
      ) : null}
      {plan && plan.notFound > 0 ? (
        <SetAside kind="not-found" line={DELIVER_STEPPER.setAsideNotFound(plan.notFound)} />
      ) : null}
      {plan && !overCap && plan.groups.length === 0 ? (
        <InlineNotice data-deliver-no-titles="">{DELIVER_STEPPER.noTitles}</InlineNotice>
      ) : null}
    </>
  );
}

export function DeliverRightsFace({
  questionId,
  plan,
  group,
  names,
  pick,
  onPick,
}: {
  questionId: string;
  plan: DeliverPlan;
  group: number;
  names: ReadonlyMap<string, string>;
  pick: string | undefined;
  onPick: (key: string) => void;
}) {
  const row = plan.groups[group];
  if (!row) return null;
  return (
    <>
      <p id={questionId} className="t-body text-ink">
        {DELIVER_STEPPER.rightsQuestion}
      </p>
      <Hint text={deliverGroupHint(plan, group, names, "rights")} />
      {row.titleIds.length > 1 ? <Lines attr="names" lines={row.titleIds.map((id) => names.get(id) ?? id)} /> : null}
      <div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-[var(--space-3)]">
        {row.options.map((option) => (
          <OptionCard
            key={option.key}
            selected={pick === option.key}
            label={option.label}
            onSelect={() => onPick(option.key)}
          />
        ))}
      </div>
    </>
  );
}

export function DeliverTerritoryFace({
  ids,
  questionId,
  plan,
  group,
  names,
  pick,
  territory,
  onPick,
}: {
  ids: string;
  questionId: string;
  plan: DeliverPlan;
  group: number;
  names: ReadonlyMap<string, string>;
  pick: string | undefined;
  territory: string;
  onPick: (territory: string) => void;
}) {
  const row = plan.groups[group];
  if (!row) return null;
  const choices = deliverTerritoryChoices(plan, group, pick);
  const cards = grantTerritoryUsesCards(choices);
  const selectId = `${ids}-territory`;
  return (
    <>
      {cards ? (
        <p id={questionId} className="t-body text-ink">
          {DELIVER_STEPPER.territoryQuestion}
        </p>
      ) : (
        <Label htmlFor={selectId}>{DELIVER_STEPPER.territoryQuestion}</Label>
      )}
      <Hint text={deliverGroupHint(plan, group, names, "territory")} />
      {row.titleIds.length > 1 ? <Lines attr="names" lines={row.titleIds.map((id) => names.get(id) ?? id)} /> : null}
      {cards ? (
        <div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-[var(--space-3)]">
          {choices.map((choice) => (
            <OptionCard
              key={choice.key}
              selected={territory === choice.key}
              label={choice.label}
              onSelect={() => onPick(choice.key)}
            />
          ))}
        </div>
      ) : (
        // The house form Select: its menu draws inline, so the shell's Esc
        // defers to it, and it opens inside the phone sheet.
        <Select
          id={selectId}
          value={territory}
          options={[
            { value: "", label: DELIVER_STEPPER.selectTerritory },
            ...choices.map((choice) => ({ value: choice.key, label: choice.label })),
          ]}
          onChange={onPick}
        />
      )}
    </>
  );
}

/** Nothing went through: the stop line and each title's reason, on the face
 *  the commit ran from. */
function DeliverProblem({ outcome, names }: { outcome: DeliverOutcome; names: ReadonlyMap<string, string> }) {
  const lines = deliverOutcomeLines(outcome, names);
  return (
    <div data-deliver-problem="" className="flex flex-col gap-[var(--space-2)]">
      {outcome.stop ? (
        <InlineNotice tone="error" data-deliver-stop="">
          {deliverReasonLine(outcome.stop)}
        </InlineNotice>
      ) : null}
      {lines.length > 0 ? <Lines attr="lines" lines={lines} /> : null}
    </div>
  );
}

export function DeliverResultFace({
  outcome,
  names,
  exporting,
  exportError,
  onDownload,
}: {
  outcome: DeliverOutcome;
  names: ReadonlyMap<string, string>;
  exporting: boolean;
  exportError: string;
  onDownload: () => void;
}) {
  const allCreated = outcome.created.length === outcome.total;
  const single = outcome.created.length === 1 ? outcome.created[0]! : null;
  const lines = deliverOutcomeLines(outcome, names);
  return (
    <div data-deliver-result="" className="flex flex-col items-center gap-[var(--space-4)] text-center">
      {allCreated ? (
        <div
          data-deliver-check=""
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-contrast t-title"
        >
          {DELIVER_STEPPER.check}
        </div>
      ) : null}
      {single ? (
        <p className={cn("t-body-sm text-ink-3", HOUSE_PHONE_WRAP_CLASS)} data-deliver-id="">
          {DELIVER_STEPPER.successId(single.deliveryId)}
        </p>
      ) : null}
      {lines.length > 0 ? <Lines attr="lines" lines={lines} /> : null}
      {outcome.stop ? (
        <InlineNotice tone="error" data-deliver-stop="" className="w-full text-left">
          {deliverReasonLine(outcome.stop)}
        </InlineNotice>
      ) : null}
      <Button type="button" data-deliver-download="" className="w-full" disabled={exporting} onClick={onDownload}>
        {exporting ? DELIVER_STEPPER.preparing : DELIVER_STEPPER.download}
      </Button>
      <p className="t-body-sm text-ink-3">{DELIVER_STEPPER.doneHint}</p>
      {exportError ? (
        <InlineNotice tone="error" className="w-full text-left">
          {exportError}
        </InlineNotice>
      ) : null}
    </div>
  );
}
