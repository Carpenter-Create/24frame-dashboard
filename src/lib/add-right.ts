import { HOUSE_PHONE_STACK_CLASS, HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import { houseWindowClosedHref, houseWindowOpenHref, parseHouseWindowParam } from "@/lib/house-window";
import type { HousePageSelectGroup } from "@/lib/house-page-select";
import { RIGHTS_CATEGORIES, RIGHTS_META, RIGHTS_TYPE_CODES, exclusivityLabel, type RightsType } from "@/lib/rights";
import { COUNTRY_GROUPS, matchCountries, territoryLine, type TerritoryMode } from "@/lib/territories";
import { TITLE_DETAILS } from "@/lib/title-details";
import { TITLE_PAGE_WINDOW_PARAMS } from "@/lib/titles";

// The title's Add right window (docs/design-locks/aggregation-add-right-window-lock-v1.md):
// one window over the title page that adds one rights grant. The index shows
// Rights type, Territory and Exclusivity; each opens its face. A grant is a
// permanent record (insert only), so nothing here edits or removes one.

export const ADD_RIGHT_PARAM = "add-right";

export type AddRightFace = "index" | "type" | "territory" | "exclusivity";

/** The index rows, in face (and check) order. */
export const ADD_RIGHT_ROWS = ["type", "territory", "exclusivity"] as const satisfies readonly AddRightFace[];

export type AddRightRow = (typeof ADD_RIGHT_ROWS)[number];

const FACES: readonly AddRightFace[] = ["index", ...ADD_RIGHT_ROWS];

export const ADD_RIGHT = {
  entry: "Add right",
  faces: {
    index: "Add right",
    type: "Rights type",
    territory: "Territory",
    exclusivity: "Exclusivity",
  } satisfies Record<AddRightFace, string>,
  intro: "Add one right at a time — each carries its own territory and exclusivity.",
  explanation:
    "Exclusive: only you may distribute this right in these territories. Non-exclusive: others may too.",
  unset: "—",
  typeRequired: "Select a rights type.",
  exclusivityRequired: "Choose exclusive or non-exclusive.",
  // New lines (Adam 2026-10-09, "approved, use the defaults"; the lock's Copy).
  countryRequired: "Choose at least one country.",
  search: "Search countries",
  noMatch: "No countries match.",
  onTitle: (grant: string) => `${grant} is already on this title.`,
  // The window's chrome, the ask and the refusals: the Metadata window's own.
  close: TITLE_DETAILS.close,
  back: TITLE_DETAILS.back,
  done: TITLE_DETAILS.done,
  discardTitle: TITLE_DETAILS.discardTitle,
  discardKeep: TITLE_DETAILS.discardKeep,
  discardConfirm: TITLE_DETAILS.discardConfirm,
  notAuthenticated: TITLE_DETAILS.notAuthenticated,
  notAuthorized: TITLE_DETAILS.notAuthorized,
  saveFailed: TITLE_DETAILS.saveFailed,
} as const;

// ---- Faces ---------------------------------------------------------------------

// Radios in the Release grammar (44 rows, each label wrapping): stacked on a
// phone, one wrapping row on a computer.
export const ADD_RIGHT_CHOICES_CLASS = `${HOUSE_PHONE_STACK_CLASS} md:flex-row md:flex-wrap md:gap-x-[var(--space-4)]`;

export const ADD_RIGHT_CHOICE_CLASS = `flex min-h-11 items-center gap-[var(--space-2)] t-body-sm text-ink-2 ${HOUSE_PHONE_WRAP_CLASS}`;

// The chosen countries in full, above the list.
export const ADD_RIGHT_TERRITORY_LINE_CLASS = `${HOUSE_PHONE_WRAP_CLASS} t-body-sm text-ink`;

// The search stays in view while the countries scroll under it (the window
// body is the scroll container on both hosts).
export const ADD_RIGHT_SEARCH_CLASS = "sticky top-0 z-10 bg-bg py-[var(--space-2)]";

// The countries under that search: an option the keys move to (↑, Home,
// typing; scrolled to the nearest edge) stops below the search, never under
// it. 4.5rem clears the search (58px) and the focus ring (5px).
export const ADD_RIGHT_COUNTRIES_CLASS = "[&_[data-house-page-select-option]]:scroll-mt-18";

export const ADD_RIGHT_NOTE_CLASS = "t-body-sm text-ink-3";

export function parseAddRightFace(value: string | null): AddRightFace {
  return FACES.includes(value as AddRightFace) ? (value as AddRightFace) : "index";
}

/** `?add-right` / `?add-right=<face>`: the window and its face, or null when
 *  absent. An unknown face opens the index. */
export function parseAddRightWindow(search: string): AddRightFace | null {
  return parseHouseWindowParam(search, ADD_RIGHT_PARAM, parseAddRightFace);
}

/** The window open at `face`. The other title-page window's query goes, so
 *  one address never opens two windows. */
export function addRightOpenHref(pathname: string, search: string, face: AddRightFace = "index"): string {
  const rest = houseWindowClosedHref("", search, TITLE_PAGE_WINDOW_PARAMS);
  return houseWindowOpenHref(pathname, rest, ADD_RIGHT_PARAM, face, "index");
}

/** The page under the window: neither title-page window's query. */
export function addRightClosedHref(pathname: string, search: string): string {
  return houseWindowClosedHref(pathname, search, TITLE_PAGE_WINDOW_PARAMS);
}

// ---- The draft ---------------------------------------------------------------

export type AddRightDraft = {
  type: RightsType | null;
  mode: TerritoryMode;
  /** Each mode keeps its own countries, so a switch never turns "Only these
   *  countries" into exclusions, and switching back loses nothing. */
  picks: { include: readonly string[]; exclude: readonly string[] };
  exclusive: boolean | null;
};

/** Every open starts here: Worldwide (today's default), nothing else set. */
export const EMPTY_ADD_RIGHT: AddRightDraft = {
  type: null,
  mode: "world",
  picks: { include: [], exclude: [] },
  exclusive: null,
};

/** The countries the draft would send: none for Worldwide, else the current
 *  mode's own picks. */
export function addRightCodes(draft: AddRightDraft): readonly string[] {
  return draft.mode === "world" ? [] : draft.picks[draft.mode];
}

/** A country ticked or unticked under the current mode only. */
export function addRightTogglePick(draft: AddRightDraft, code: string): AddRightDraft {
  if (draft.mode === "world") return draft;
  const current = draft.picks[draft.mode];
  const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
  return { ...draft, picks: { ...draft.picks, [draft.mode]: next } };
}

/** The rows with changes, in row order (for the ask's line). Effective values
 *  only: countries held under a mode not chosen are not a change, so the ask
 *  never names a row that reads Worldwide. */
export function addRightChangedRows(draft: AddRightDraft): AddRightRow[] {
  const rows: AddRightRow[] = [];
  if (draft.type !== null) rows.push("type");
  if (draft.mode !== "world") rows.push("territory");
  if (draft.exclusive !== null) rows.push("exclusivity");
  return rows;
}

/** "Rights type isn't saved." · "Rights type and Exclusivity aren't saved."
 *  (the approved Metadata template, with this window's row names). */
export function addRightDiscardLine(rows: readonly AddRightRow[]): string {
  if (rows.length === 0) return "";
  const labels = rows.map((row) => ADD_RIGHT.faces[row]);
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} ${TITLE_DETAILS.discardAnd} ${labels[labels.length - 1]}`;
  const template = labels.length === 1 ? TITLE_DETAILS.discardOne : TITLE_DETAILS.discardMany;
  return template.replace("{rows}", joined);
}

// ---- Checks ------------------------------------------------------------------

export type AddRightProblem = { face: AddRightFace; error: string };

export type AddRightValues = {
  type: RightsType | null;
  mode: TerritoryMode;
  codes: readonly string[];
  exclusive: boolean | null;
};

export function addRightValues(draft: AddRightDraft): AddRightValues {
  return { type: draft.type, mode: draft.mode, codes: addRightCodes(draft), exclusive: draft.exclusive };
}

/** The first thing Done would refuse, in face order (Rights type → Territory
 *  → Exclusivity), or null. The server runs the same check. */
export function checkAddRight(values: AddRightValues): AddRightProblem | null {
  if (values.type === null) return { face: "type", error: ADD_RIGHT.typeRequired };
  if (values.mode !== "world" && values.codes.length === 0) {
    return { face: "territory", error: ADD_RIGHT.countryRequired };
  }
  if (values.exclusive === null) return { face: "exclusivity", error: ADD_RIGHT.exclusivityRequired };
  return null;
}

// ---- The index rows ----------------------------------------------------------

/** A row's live summary. Territory is the full line (the index is the review:
 *  nothing is capped or cut), or the mode alone while no country is chosen. */
export function addRightSummary(draft: AddRightDraft, row: AddRightRow): string {
  if (row === "type") return draft.type === null ? ADD_RIGHT.unset : RIGHTS_META[draft.type].label;
  if (row === "territory") return territoryLine(draft.mode, addRightCodes(draft));
  return draft.exclusive === null ? ADD_RIGHT.unset : exclusivityLabel(draft.exclusive);
}

// ---- The lists ---------------------------------------------------------------

/** A picked option's key as a rights type, or null for anything else. */
export function addRightType(key: string): RightsType | null {
  return RIGHTS_TYPE_CODES.find((code) => code === key) ?? null;
}

/** The §9 taxonomy as the Rights type face lists it: one group per category,
 *  each right with its description. */
export function addRightTypeGroups(): HousePageSelectGroup[] {
  return RIGHTS_CATEGORIES.map((category) => ({
    id: category.category,
    label: category.category,
    options: category.types.map((type) => ({ key: type.code, label: type.label, detail: type.description })),
  }));
}

/** The countries a search finds, by continent; an empty continent drops out. */
export function addRightCountryGroups(query: string): HousePageSelectGroup[] {
  const found = matchCountries(query);
  return COUNTRY_GROUPS.map((group) => ({
    id: group.continent,
    label: group.continent,
    options: group.countries
      .filter((country) => found.has(country.code))
      .map((country) => ({ key: country.code, label: country.name })),
  })).filter((group) => group.options.length > 0);
}

// ---- The request -------------------------------------------------------------

export type AddRightRequest = {
  titleId: string;
  rightsType: RightsType;
  mode: TerritoryMode;
  countryCodes: string[];
  exclusive: boolean;
};

/** What Done sends, or null while the draft is incomplete. No org (the server
 *  reads it from the title row) and no window dates (v1 adds none). */
export function addRightRequest(titleId: string, draft: AddRightDraft): AddRightRequest | null {
  const values = addRightValues(draft);
  if (checkAddRight(values) || values.type === null || values.exclusive === null) return null;
  return {
    titleId,
    rightsType: values.type,
    mode: values.mode,
    countryCodes: [...values.codes],
    exclusive: values.exclusive,
  };
}

// ---- Already on the title ----------------------------------------------------

export type AddRightGrant = {
  rights_type: RightsType;
  territory_mode: TerritoryMode;
  territories: readonly string[];
  exclusive: boolean;
};

function territoryKey(codes: readonly string[]): string {
  return [...new Set(codes.map((code) => code.trim().toUpperCase()))].sort().join(",");
}

/** An active grant with the same right and the same territory set (either
 *  exclusivity), or null. A grant inside a broader one (US under Worldwide)
 *  is not the same scope. */
export function addRightGrantOnTitle<G extends AddRightGrant>(
  grants: readonly G[],
  scope: { rightsType: RightsType; mode: TerritoryMode; territories: readonly string[] },
): G | null {
  const key = territoryKey(scope.territories);
  return (
    grants.find(
      (grant) =>
        grant.rights_type === scope.rightsType &&
        grant.territory_mode === scope.mode &&
        territoryKey(grant.territories ?? []) === key,
    ) ?? null
  );
}

/** "SVOD · Exclusive · Ireland, United Kingdom is already on this title.":
 *  the grant named in full, so a retry or a contradictory add shows its work. */
export function addRightOnTitleLine(grant: AddRightGrant): string {
  const parts = [
    RIGHTS_META[grant.rights_type]?.label ?? grant.rights_type,
    exclusivityLabel(grant.exclusive),
    territoryLine(grant.territory_mode, grant.territories ?? []),
  ];
  return ADD_RIGHT.onTitle(parts.join(" · "));
}

/** The approved line for a refused add_rights_grant. It never repeats the
 *  database's text. */
export function mapAddRightsRpcError(message: string): string {
  if (message.startsWith("Not authenticated")) return ADD_RIGHT.notAuthenticated;
  if (message.startsWith("Not authorized") || message.startsWith("Title does not belong")) {
    return ADD_RIGHT.notAuthorized;
  }
  return ADD_RIGHT.saveFailed;
}
