import { staffPath } from "@/lib/workspace";
import { isCanonicalUuid } from "@/lib/deliveries-browse";
import { GC_DELIVERIES_HREF, licensingDeliverLabel } from "@/lib/gc-deliveries";
import { houseWindowClosedHref, houseWindowOpenHref, parseHouseWindowParam } from "@/lib/house-window";
import { EXPORT_MAX_TITLES } from "@/lib/list-bounds";
import type { RightsType } from "@/lib/rights";
import { RIGHTS_META } from "@/lib/rights";
import type { TerritoryMode } from "@/lib/territories";
import { describeTerritory, ISO_COUNTRIES } from "@/lib/territories";
import { gcTitleStatusLabel, type TitleStatus } from "@/lib/titles";

// Deliver: the window over Licensing Status
// (docs/design-locks/staff-licensing-deliver-window-lock-v1.md). The house
// window shell with linear faces. Step order is locked: Channel → Rights →
// Territory → Done (every Rights face, then every Territory face). One
// decision per face. The Channel step's key stays "vendor" internally.

export const DELIVER_STEPPER_STEPS = [
  { key: "vendor", label: "Channel" },
  { key: "rights", label: "Rights" },
  { key: "territory", label: "Territory" },
  { key: "done", label: "Done" },
] as const;

export type DeliverStepperStep = (typeof DELIVER_STEPPER_STEPS)[number]["key"];

/** The window's address: a bare `?deliver` (its own history entry). The
 *  hand-over from the old route carries ids once: `?deliver=<id,id,…>`. */
export const DELIVER_PARAM = "deliver";

/** From this many deliverable titles, titles with an identical set of grant
 *  choices share one Rights face and one Territory face. */
export const DELIVER_GROUP_FROM = 6;

/** One Deliver covers at most the metadata sheet's own cap. */
export const DELIVER_MAX_TITLES = EXPORT_MAX_TITLES;

/** Items per server action call: a timeout loses at most one batch's answer. */
export const DELIVER_BATCH = 25;

/** Ids per read (titles, grants): no very long `.in` query strings. */
export const DELIVER_CHUNK = 50;

/** Why a title was not delivered (or why a run stopped). Lines live in
 *  DELIVER_STEPPER.reasons. */
export type DeliverReason =
  | "not_authenticated"
  | "not_authorized"
  | "invalid"
  | "not_found"
  | "not_ready"
  | "vendor_inactive"
  | "no_cover"
  | "conflict"
  | "existing"
  | "unknown"
  | "save_failed";

/** Why the window could not load the selection. */
export type DeliverLoadReason = "not_authenticated" | "not_authorized" | "invalid" | "load_failed" | "load_too_many";

const STEP_LABEL = Object.fromEntries(DELIVER_STEPPER_STEPS.map((row) => [row.key, row.label])) as Record<
  DeliverStepperStep,
  string
>;

export const DELIVER_STEPPER = {
  vendorQuestion: "Which channel for these titles?",
  vendorHint: (n: number) =>
    n === 1 ? "1 title selected · one channel per delivery" : `${n} titles selected · one channel per delivery`,
  rightsQuestion: "Which rights grant?",
  rightsHint: (title: string, index: number, total: number) =>
    total > 1 ? `${title} · ${index + 1} of ${total}` : title,
  territoryQuestion: "Which territory?",
  territoryHint: (title: string, index: number, total: number) =>
    total > 1 ? `${title} · ${index + 1} of ${total}` : title,
  continue: "Continue",
  creating: "Creating…",
  successTitle: "Delivery created",
  successId: (id: string) => `ID · ${id}`,
  download: "Download metadata sheet",
  preparing: "Preparing…",
  exportFailed: "Export failed.",
  done: "Done",
  doneHint: "Returns to Licensing Status",
  listHref: staffPath("gc/deliveries"),
  noVendors: "No active channels.",
  noTitles: "Select at least one title to deliver.",
  selectTerritory: "Select territory",
  check: "✓",
  // The house window's chrome and ask, duplicated by value from TITLE_DETAILS
  // (a test pins the equality).
  close: "Close",
  back: "Back",
  discardTitle: "Discard changes?",
  discardOne: "{rows} isn't saved.",
  discardMany: "{rows} aren't saved.",
  discardAnd: "and",
  discardKeep: "Keep editing",
  discardConfirm: "Discard",
  notAuthenticated: "Not authenticated.",
  notAuthorized: "Not authorized.",
  saveFailed: "Could not save.",
  // New with this window (the lock's Copy).
  groupHint: (n: number, index: number, total: number) => `${n} titles · ${index + 1} of ${total}`,
  setAsideNotReady: (n: number) =>
    n === 1
      ? "1 title isn't ready to deliver and is left out."
      : `${n} titles aren't ready to deliver and are left out.`,
  setAsideNoGrants: (n: number) =>
    n === 1 ? "1 title has no active grant and is left out." : `${n} titles have no active grants and are left out.`,
  setAsideNotFound: (n: number) =>
    n === 1
      ? "1 selected title could not be found and is left out."
      : `${n} selected titles could not be found and are left out.`,
  overCap: `Select up to ${DELIVER_MAX_TITLES} titles at a time.`,
  loadFailed: "Could not load these titles.",
  loadTooMany: "Too many grants to load at once. Select fewer titles.",
  successMany: (n: number) => `${n} deliveries created`,
  partial: (created: number, total: number) => `${created} of ${total} deliveries created`,
  titleLine: (title: string, detail: string) => `${title} · ${detail}`,
  reasons: {
    not_authenticated: "Not authenticated.",
    not_authorized: "Not authorized.",
    invalid: "Could not create this delivery.",
    not_found: "Could not create this delivery.",
    not_ready: "Not ready to deliver.",
    vendor_inactive: "This channel is no longer active.",
    no_cover: "No active grant covers this territory.",
    conflict: "Another rights holder holds an exclusive claim on this work here.",
    existing: "Delivery already exists.",
    unknown: "Could not create this delivery.",
    save_failed: "Could not save.",
  } satisfies Record<DeliverReason, string>,
} as const;

export const DELIVER_PROGRESS_TRACK_CLASS = "flex items-center gap-[6px]";
export const DELIVER_PROGRESS_SEG_ON_CLASS =
  "h-[6px] w-8 rounded-full bg-accent md:w-8";
export const DELIVER_PROGRESS_SEG_OFF_CLASS =
  "h-[6px] w-8 rounded-full bg-surface-muted md:w-8";

export const DELIVER_OPTION_CLASS =
  "flex w-full flex-col gap-[var(--space-2)] rounded-[12px] border border-hairline bg-surface p-[var(--space-4)] text-left";
export const DELIVER_OPTION_SELECTED_CLASS =
  "flex w-full flex-col gap-[var(--space-2)] rounded-[12px] border-2 border-accent bg-surface p-[var(--space-4)] text-left";

function uniqueTitleIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function parseDeliverTitleIds(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return uniqueTitleIds(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => isCanonicalUuid(part)),
  );
}

// ---- Address ---------------------------------------------------------------

/** The window's one address face: a bare `?deliver` (any value opens it).
 *  Faces are window state, never in the address. */
export function parseDeliverWindow(search: string): "channel" | null {
  return parseHouseWindowParam(search, DELIVER_PARAM, () => "channel" as const);
}

/** The ids a hand-over carries (`?deliver=<id,id,…>`), canonical UUIDs only. */
export function parseDeliverWindowIds(search: string): string[] {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return parseDeliverTitleIds(params.get(DELIVER_PARAM) ?? "");
}

/** The address with the window open: a bare `?deliver`, other params kept. */
export function deliverWindowOpenHref(pathname: string, search: string): string {
  return houseWindowOpenHref(pathname, search, DELIVER_PARAM, "channel", "channel");
}

export function deliverWindowClosedHref(pathname: string, search: string): string {
  return houseWindowClosedHref(pathname, search, DELIVER_PARAM);
}

/** The old /deliver?titles=… address hands operate staff to the window on
 *  the list (the ids once; the window drops them from the address). */
export function deliverHandOverHref(titleIds: readonly string[]): string {
  const ids = uniqueTitleIds(titleIds);
  if (ids.length === 0) return GC_DELIVERIES_HREF;
  return `${GC_DELIVERIES_HREF}?${DELIVER_PARAM}=${ids.join(",")}`;
}

export function deliverProgressIndex(step: DeliverStepperStep): number {
  return DELIVER_STEPPER_STEPS.findIndex((row) => row.key === step);
}

export function deliverProgressFilled(step: DeliverStepperStep): number {
  return deliverProgressIndex(step) + 1;
}

export type GrantChoice = {
  id: string;
  title_id: string;
  rights_type: string;
  territory_mode: string;
  territories: string[] | null;
  window_start?: string | null;
  window_end?: string | null;
};

/** The grant's window holds now: the create_delivery predicate (rule 12:
 *  window_start null or passed, window_end null or not yet). */
export function grantActiveAt(grant: GrantChoice, now: Date): boolean {
  const at = now.getTime();
  if (grant.window_start) {
    const start = new Date(grant.window_start).getTime();
    if (!Number.isNaN(start) && at < start) return false;
  }
  if (grant.window_end) {
    const end = new Date(grant.window_end).getTime();
    if (!Number.isNaN(end) && at > end) return false;
  }
  return true;
}

/** What a grant offers: rights type, territory mode and its territories. */
export function grantShapeKey(grant: GrantChoice): string {
  return `${grant.rights_type}|${grant.territory_mode}|${[...(grant.territories ?? [])].sort().join(",")}`;
}

export function grantChoiceLabel(grant: GrantChoice): string {
  const rights =
    grant.rights_type in RIGHTS_META
      ? RIGHTS_META[grant.rights_type as RightsType].label
      : grant.rights_type;
  return `${rights} · ${describeTerritory(
    grant.territory_mode as TerritoryMode,
    grant.territories ?? [],
  )}`;
}

export type TerritoryChoice = { key: string; label: string };

const TERRITORY_CARD_CAP = 16;

export function grantTerritoryChoices(grant: GrantChoice): TerritoryChoice[] {
  const listed = (grant.territories ?? []).filter((code) => code in ISO_COUNTRIES);
  if (grant.territory_mode === "include" && listed.length > 0) {
    return listed.map((key) => ({ key, label: ISO_COUNTRIES[key] ?? key }));
  }
  if (grant.territory_mode === "exclude" && listed.length > 0) {
    return Object.entries(ISO_COUNTRIES)
      .filter(([key]) => !listed.includes(key))
      .map(([key, label]) => ({ key, label }));
  }
  return Object.entries(ISO_COUNTRIES).map(([key, label]) => ({ key, label }));
}

export function grantTerritoryUsesCards(choices: readonly TerritoryChoice[]): boolean {
  return choices.length > 0 && choices.length <= TERRITORY_CARD_CAP;
}

// ---- The plan --------------------------------------------------------------

/** A selected title as the window reads it (under row security, never a
 *  deleted one). */
export type DeliverTitleRow = { id: string; title: string; status: TitleStatus };

/** One choice on a Rights face. `grant` stands for the option's territories
 *  (identical across a group by construction). */
export type DeliverOption = { key: string; label: string; grant: GrantChoice };

/** One Rights face and one Territory face. `grantIds` resolves an option to
 *  EACH title's own grant id (a shape option differs per title). */
export type DeliverGroup = {
  titleIds: string[];
  options: DeliverOption[];
  grantIds: Record<string, Record<string, string>>;
};

export type DeliverPlan = {
  groups: DeliverGroup[];
  /** Set aside: status other than in_delivery (the create_delivery gate). */
  notReady: { id: string; title: string; status: TitleStatus }[];
  /** Set aside: no grant active now. */
  noGrants: { id: string; title: string }[];
  /** Selected ids the titles read did not return (deleted, or out of reach). */
  notFound: number;
  overCap: boolean;
  grouped: boolean;
};

/** Faces in order: Channel (the index), every Rights face, every Territory
 *  face. "done" is pushed after a create. */
export type DeliverFace = "channel" | "done" | `rights-${number}` | `territory-${number}`;

export function planDeliver(
  titles: readonly DeliverTitleRow[],
  notFound: readonly string[],
  grants: readonly GrantChoice[],
  now: Date,
): DeliverPlan {
  const byTitle = new Map<string, GrantChoice[]>();
  for (const grant of grants) {
    if (!grantActiveAt(grant, now)) continue;
    const rows = byTitle.get(grant.title_id);
    if (rows) rows.push(grant);
    else byTitle.set(grant.title_id, [grant]);
  }

  const notReady: DeliverPlan["notReady"] = [];
  const noGrants: DeliverPlan["noGrants"] = [];
  const ready: { id: string; grants: GrantChoice[] }[] = [];
  for (const title of titles) {
    if (title.status !== "in_delivery") {
      notReady.push({ id: title.id, title: title.title, status: title.status });
      continue;
    }
    const active = byTitle.get(title.id) ?? [];
    if (active.length === 0) {
      noGrants.push({ id: title.id, title: title.title });
      continue;
    }
    ready.push({ id: title.id, grants: active });
  }

  const grouped = ready.length >= DELIVER_GROUP_FROM;
  const groups: DeliverGroup[] = [];
  const bySet = new Map<string, DeliverGroup>();
  for (const row of ready) {
    const shapes = row.grants.map(grantShapeKey);
    // Two grants of one shape read the same: the title keeps its own face,
    // keyed by grant id, so the pick stays unambiguous.
    const byShape = grouped && new Set(shapes).size === shapes.length;
    if (!byShape) {
      groups.push({
        titleIds: [row.id],
        options: row.grants.map((grant) => ({ key: grant.id, label: grantChoiceLabel(grant), grant })),
        grantIds: Object.fromEntries(row.grants.map((grant) => [grant.id, { [row.id]: grant.id }])),
      });
      continue;
    }
    const setKey = [...shapes].sort().join("\n");
    const same = bySet.get(setKey);
    if (same) {
      same.titleIds.push(row.id);
      row.grants.forEach((grant, index) => {
        same.grantIds[shapes[index]!]![row.id] = grant.id;
      });
      continue;
    }
    const group: DeliverGroup = {
      titleIds: [row.id],
      options: row.grants.map((grant, index) => ({ key: shapes[index]!, label: grantChoiceLabel(grant), grant })),
      grantIds: Object.fromEntries(row.grants.map((grant, index) => [shapes[index]!, { [row.id]: grant.id }])),
    };
    bySet.set(setKey, group);
    groups.push(group);
  }

  return {
    groups,
    notReady,
    noGrants,
    notFound: notFound.length,
    overCap: titles.length + notFound.length > DELIVER_MAX_TITLES,
    grouped,
  };
}

export function deliverFaces(plan: DeliverPlan): DeliverFace[] {
  return [
    "channel",
    ...plan.groups.map((_, index): DeliverFace => `rights-${index}`),
    ...plan.groups.map((_, index): DeliverFace => `territory-${index}`),
  ];
}

/** The result face is the window's closing face: ✕ and Esc close there, and
 *  Back can never return to a submitted face. */
export function deliverIndexFace(face: DeliverFace): "channel" | "done" {
  return face === "done" ? "done" : "channel";
}

/** The step a face belongs to, and its group. */
export function deliverFaceStep(face: DeliverFace): { step: DeliverStepperStep; group: number } {
  if (face === "channel") return { step: "vendor", group: -1 };
  if (face === "done") return { step: "done", group: -1 };
  const [kind, index] = face.split("-");
  return { step: kind === "rights" ? "rights" : "territory", group: Number(index) };
}

/** The header title of a step's faces: Channel, Rights, Territory. */
export function deliverStepLabel(step: DeliverStepperStep): string {
  return STEP_LABEL[step];
}

/** A Rights or Territory face's hint: "{n} titles · {i} of {g}" for a group
 *  of titles, "{title} · {i} of {g}" (or the title alone) for one title. */
export function deliverGroupHint(
  plan: DeliverPlan,
  group: number,
  names: ReadonlyMap<string, string>,
  step: "rights" | "territory",
): string {
  const row = plan.groups[group];
  if (!row) return "";
  if (row.titleIds.length > 1) return DELIVER_STEPPER.groupHint(row.titleIds.length, group, plan.groups.length);
  const id = row.titleIds[0]!;
  const hint = step === "rights" ? DELIVER_STEPPER.rightsHint : DELIVER_STEPPER.territoryHint;
  return hint(names.get(id) ?? id, group, plan.groups.length);
}

/** Each title set aside as not ready, with its status: "{title} · Approved". */
export function deliverNotReadyLines(plan: DeliverPlan): string[] {
  return plan.notReady.map((row) => DELIVER_STEPPER.titleLine(row.title, gcTitleStatusLabel(row.status)));
}

// ---- The draft -------------------------------------------------------------

export type DeliverDraft = {
  vendorId: string;
  /** Group index → option key. */
  picks: Record<number, string>;
  /** Group index → ISO-2 territory. */
  territories: Record<number, string>;
};

export const DELIVER_EMPTY_DRAFT: DeliverDraft = { vendorId: "", picks: {}, territories: {} };

export type DeliverItem = { titleId: string; grantId: string; territory: string };

/** The territories a group's pick offers. */
export function deliverTerritoryChoices(plan: DeliverPlan, group: number, key: string | undefined): TerritoryChoice[] {
  const option = key ? plan.groups[group]?.options.find((row) => row.key === key) : undefined;
  return option ? grantTerritoryChoices(option.grant) : [];
}

/** Pick a group's grant; a territory the new pick no longer offers clears. */
export function deliverPick(plan: DeliverPlan, draft: DeliverDraft, group: number, key: string): DeliverDraft {
  const territories = { ...draft.territories };
  const territory = territories[group];
  if (territory && !deliverTerritoryChoices(plan, group, key).some((choice) => choice.key === territory)) {
    delete territories[group];
  }
  return { ...draft, picks: { ...draft.picks, [group]: key }, territories };
}

/** What Deliver sends: each title with its own grant and its group's territory. */
export function deliverItems(plan: DeliverPlan, draft: DeliverDraft): DeliverItem[] {
  const items: DeliverItem[] = [];
  plan.groups.forEach((group, index) => {
    const key = draft.picks[index];
    const territory = draft.territories[index];
    if (!key || !territory) return;
    for (const titleId of group.titleIds) {
      const grantId = group.grantIds[key]?.[titleId];
      if (grantId) items.push({ titleId, grantId, territory });
    }
  });
  return items;
}

/** How many titles Deliver will send (every title in every group). */
export function deliverItemCount(plan: DeliverPlan | null): number {
  return plan ? plan.groups.reduce((sum, group) => sum + group.titleIds.length, 0) : 0;
}

/** One server action call per batch, sent one after another. */
export function deliverBatches<T>(items: readonly T[], size: number = DELIVER_BATCH): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function groupAnswered(plan: DeliverPlan, draft: DeliverDraft, group: number, step: "rights" | "territory"): boolean {
  const row = plan.groups[group];
  const key = draft.picks[group];
  if (!row || !key || !row.options.some((option) => option.key === key)) return false;
  if (step === "rights") return true;
  const territory = draft.territories[group];
  return Boolean(territory) && deliverTerritoryChoices(plan, group, key).some((choice) => choice.key === territory);
}

/** Whether the header's action may run on this face. The last face also needs
 *  every group answered (the commit sends them all). */
export function deliverCanContinue(face: DeliverFace, draft: DeliverDraft, plan: DeliverPlan | null): boolean {
  if (face === "done") return true;
  if (!plan) return false;
  if (face === "channel") return !plan.overCap && plan.groups.length > 0 && draft.vendorId !== "";
  const { step, group } = deliverFaceStep(face);
  if (step !== "rights" && step !== "territory") return false;
  if (!groupAnswered(plan, draft, group, step)) return false;
  const faces = deliverFaces(plan);
  if (face !== faces[faces.length - 1]) return true;
  return draft.vendorId !== "" && plan.groups.every((_, index) => groupAnswered(plan, draft, index, "territory"));
}

/** The header's one action: Continue, "Deliver · N" on the last Territory
 *  face, "Creating…" while the server answers, Done on the result. */
export function deliverPrimaryLabel(
  face: DeliverFace,
  faces: readonly DeliverFace[],
  itemCount: number,
  pending: boolean,
): string {
  if (pending) return DELIVER_STEPPER.creating;
  if (face === "done") return DELIVER_STEPPER.done;
  if (face !== "channel" && face === faces[faces.length - 1]) return licensingDeliverLabel(itemCount);
  return DELIVER_STEPPER.continue;
}

/** The steps the draft has answered (the ask names them). */
export function deliverChangedSteps(draft: DeliverDraft): DeliverStepperStep[] {
  const rows: DeliverStepperStep[] = [];
  if (draft.vendorId) rows.push("vendor");
  if (Object.values(draft.picks).some(Boolean)) rows.push("rights");
  if (Object.values(draft.territories).some(Boolean)) rows.push("territory");
  return rows;
}

/** "Channel isn't saved." · "Channel and Rights aren't saved." */
export function deliverDiscardLine(rows: readonly DeliverStepperStep[]): string {
  if (rows.length === 0) return "";
  const labels = rows.map((row) => STEP_LABEL[row]);
  const joined =
    labels.length === 1
      ? labels[0]!
      : `${labels.slice(0, -1).join(", ")} ${DELIVER_STEPPER.discardAnd} ${labels[labels.length - 1]}`;
  const template = labels.length === 1 ? DELIVER_STEPPER.discardOne : DELIVER_STEPPER.discardMany;
  return template.replace("{rows}", joined);
}

// ---- Failures --------------------------------------------------------------

/** create_delivery's RAISE texts, matched by prefix. A test reads the LAST
 *  definition across supabase/migrations, so a changed text fails CI. */
export const DELIVER_RPC_MESSAGES: readonly (readonly [string, DeliverReason])[] = [
  ["Not authenticated", "not_authenticated"],
  ["Not authorized", "not_authorized"],
  ["Territory must be", "invalid"],
  ["Title not found", "not_found"],
  ["Chain of title:", "not_ready"],
  ["Vendor not found or inactive", "vendor_inactive"],
  ["No active grant on this title covers", "no_cover"],
  ["Blocked: another client holds", "conflict"],
];

/** unique (title_id, vendor_id, territory, grant_id): the delivery exists. */
export const DELIVER_DUPLICATE_CODE = "23505";

export function deliverFailureReason(error: { code?: string | null; message?: string | null }): DeliverReason {
  if (error.code === DELIVER_DUPLICATE_CODE) return "existing";
  const message = error.message ?? "";
  for (const [prefix, reason] of DELIVER_RPC_MESSAGES) {
    if (message.startsWith(prefix)) return reason;
  }
  return "unknown";
}

/** Nothing after this would pass: the run stops and the rest are not sent. */
export function deliverStops(reason: DeliverReason): boolean {
  return (
    reason === "not_authenticated" || reason === "not_authorized" || reason === "vendor_inactive" || reason === "invalid"
  );
}

export function deliverReasonLine(reason: DeliverReason): string {
  return DELIVER_STEPPER.reasons[reason];
}

export function deliverLoadLine(reason: DeliverLoadReason): string {
  if (reason === "not_authenticated") return DELIVER_STEPPER.notAuthenticated;
  if (reason === "not_authorized") return DELIVER_STEPPER.notAuthorized;
  if (reason === "load_too_many") return DELIVER_STEPPER.loadTooMany;
  return DELIVER_STEPPER.loadFailed;
}

// ---- The two actions' answers ----------------------------------------------

export type DeliverChoicesResult =
  | { ok: true; titles: DeliverTitleRow[]; notFound: string[]; grants: GrantChoice[] }
  | { ok: false; reason: DeliverLoadReason };

export type DeliverCreated = { titleId: string; deliveryId: string };

/** Found by the pre-read (with its id) or by the unique key (id unknown). */
export type DeliverExisting = { titleId: string; deliveryId: string | null };

export type DeliverFailed = { titleId: string; reason: DeliverReason };

export type DeliverTitlesResult = {
  created: DeliverCreated[];
  existing: DeliverExisting[];
  failed: DeliverFailed[];
  /** Set when the run stopped: the items after it were not sent. */
  stop: DeliverReason | null;
};

/** The server actions, passed to the window as props (never imported by it). */
export type DeliverActions = {
  load: (input: { titleIds: string[] }) => Promise<DeliverChoicesResult>;
  deliver: (input: { vendorId: string; items: DeliverItem[] }) => Promise<DeliverTitlesResult>;
};

// ---- Outcomes --------------------------------------------------------------

/** Every batch's answer added up, against the items Deliver sent. */
export type DeliverOutcome = DeliverTitlesResult & { total: number };

export function deliverEmptyOutcome(total: number): DeliverOutcome {
  return { total, created: [], existing: [], failed: [], stop: null };
}

export function deliverMergeOutcome(outcome: DeliverOutcome, batch: DeliverTitlesResult): DeliverOutcome {
  return {
    total: outcome.total,
    created: [...outcome.created, ...batch.created],
    existing: [...outcome.existing, ...batch.existing],
    failed: [...outcome.failed, ...batch.failed],
    stop: batch.stop ?? outcome.stop,
  };
}

/** A part that went through: the result face shows (an existing delivery
 *  counts as done). */
export function deliverOutcomeDelivered(outcome: DeliverOutcome): boolean {
  return outcome.created.length + outcome.existing.length > 0;
}

/** "Delivery created" · "{n} deliveries created" · "{c} of {t} deliveries created". */
export function deliverResultTitle(outcome: DeliverOutcome): string {
  const created = outcome.created.length;
  if (created === outcome.total) {
    return created === 1 ? DELIVER_STEPPER.successTitle : DELIVER_STEPPER.successMany(created);
  }
  return DELIVER_STEPPER.partial(created, outcome.total);
}

/** "{c} of {t} deliveries created", while the batches run. */
export function deliverProgressLine(outcome: DeliverOutcome): string {
  return DELIVER_STEPPER.partial(outcome.created.length, outcome.total);
}

/** "{title} · {reason}" for each title that failed, then each that already
 *  existed. */
export function deliverOutcomeLines(outcome: DeliverOutcome, names: ReadonlyMap<string, string>): string[] {
  const line = (titleId: string, reason: DeliverReason) =>
    DELIVER_STEPPER.titleLine(names.get(titleId) ?? titleId, deliverReasonLine(reason));
  return [
    ...outcome.failed.map((row) => line(row.titleId, row.reason)),
    ...outcome.existing.map((row) => line(row.titleId, "existing")),
  ];
}

/** What the list needs when the window closes: whether to refresh, the titles
 *  delivered (they un-tick) and the deliveries created (they paint in). */
export type DeliverCloseOutcome = { saved: boolean; delivered: string[]; created: string[] };

export function deliverCloseOutcome(outcome: DeliverOutcome | null, saved: boolean): DeliverCloseOutcome {
  if (!outcome) return { saved, delivered: [], created: [] };
  return {
    saved,
    delivered: [...outcome.created, ...outcome.existing].map((row) => row.titleId),
    created: outcome.created.map((row) => row.deliveryId),
  };
}

/** The metadata sheet for what was delivered (staff-checked, capped at
 *  EXPORT_MAX_TITLES, complete or refused). */
export const DELIVER_EXPORT_HREF = "/api/gc/export";
export const DELIVER_EXPORT_FILENAME = "metadata.xlsx";
