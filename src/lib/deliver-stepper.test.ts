import { describe, expect, it } from "vitest";

import { licensingPruneSelection } from "./gc-deliveries";
import {
  DELIVER_BATCH,
  DELIVER_GROUP_FROM,
  DELIVER_MAX_TITLES,
  DELIVER_PROGRESS_SEG_ON_CLASS,
  DELIVER_RPC_MESSAGES,
  DELIVER_STEPPER,
  DELIVER_STEPPER_STEPS,
  deliverBatches,
  deliverCanContinue,
  deliverChangedSteps,
  deliverCloseOutcome,
  deliverDiscardLine,
  deliverEmptyOutcome,
  deliverFaces,
  deliverFailureReason,
  deliverGroupHint,
  deliverHandOverHref,
  deliverIndexFace,
  deliverItemCount,
  deliverItems,
  deliverMergeOutcome,
  deliverNotReadyLines,
  deliverOutcomeLines,
  deliverPick,
  deliverPrimaryLabel,
  deliverProgressFilled,
  deliverResultTitle,
  deliverStops,
  deliverWindowClosedHref,
  deliverWindowOpenHref,
  grantActiveAt,
  grantChoiceLabel,
  grantTerritoryChoices,
  grantTerritoryUsesCards,
  parseDeliverTitleIds,
  parseDeliverWindow,
  parseDeliverWindowIds,
  planDeliver,
  type DeliverDraft,
  type DeliverOutcome,
  type DeliverReason,
  type DeliverTitleRow,
  type GrantChoice,
} from "./deliver-stepper";
import { TITLE_DETAILS } from "./title-details";
import type { TitleStatus } from "./titles";

const TITLE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const TITLE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const NOW = new Date("2026-10-09T12:00:00.000Z");

function tid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function title(n: number, status: TitleStatus = "in_delivery"): DeliverTitleRow {
  return { id: tid(n), title: `Title ${n}`, status };
}

function grant(n: number, titleN: number, rights: string, extra: Partial<GrantChoice> = {}): GrantChoice {
  return {
    id: `g-${n}`,
    title_id: tid(titleN),
    rights_type: rights,
    territory_mode: "world",
    territories: [],
    ...extra,
  };
}

/** Each title holds AVOD · Worldwide and SVOD · Worldwide. */
function worldPair(count: number): { titles: DeliverTitleRow[]; grants: GrantChoice[] } {
  const titles = Array.from({ length: count }, (_, i) => title(i + 1));
  const grants = titles.flatMap((_, i) => [grant(2 * i + 1, i + 1, "avod"), grant(2 * i + 2, i + 1, "svod")]);
  return { titles, grants };
}

describe("Deliver window address", () => {
  it("opens on a bare ?deliver, keeps other params, and hands over with ids once", () => {
    expect(parseDeliverWindow("?q=x&deliver")).toBe("channel");
    expect(parseDeliverWindow(`?deliver=${TITLE_A}`)).toBe("channel");
    expect(parseDeliverWindow("?q=x")).toBeNull();
    expect(parseDeliverWindow("")).toBeNull();
    expect(deliverWindowOpenHref("/staff/gc/deliveries", "?q=star&status=pending&channel=v1")).toBe(
      "/staff/gc/deliveries?q=star&status=pending&channel=v1&deliver",
    );
    expect(deliverWindowOpenHref("/staff/gc/deliveries", "")).toBe("/staff/gc/deliveries?deliver");
    expect(deliverWindowClosedHref("/staff/gc/deliveries", "?q=star&deliver&status=live")).toBe(
      "/staff/gc/deliveries?q=star&status=live",
    );
    expect(deliverWindowClosedHref("/staff/gc/deliveries", "?deliver")).toBe("/staff/gc/deliveries");
    expect(parseDeliverWindowIds(`?deliver=${TITLE_A},${TITLE_B},junk`)).toEqual([TITLE_A, TITLE_B]);
    expect(parseDeliverWindowIds("?deliver")).toEqual([]);
    expect(deliverHandOverHref([TITLE_A, TITLE_B])).toBe(`/staff/gc/deliveries?deliver=${TITLE_A},${TITLE_B}`);
    expect(deliverHandOverHref([])).toBe("/staff/gc/deliveries");
  });
});

describe("planDeliver", () => {
  it("gives five titles five per-title faces keyed by grant id", () => {
    const { titles, grants } = worldPair(5);
    const plan = planDeliver(titles, [], grants, NOW);
    expect(plan.grouped).toBe(false);
    expect(plan.groups.map((group) => group.titleIds)).toEqual(titles.map((row) => [row.id]));
    expect(plan.groups[0]!.options.map((option) => option.key)).toEqual(["g-1", "g-2"]);
    expect(plan.groups[0]!.options.map((option) => option.label)).toEqual(["AVOD · Worldwide", "SVOD · Worldwide"]);
  });

  it(`groups ${DELIVER_GROUP_FROM} titles with the same grant choices into one face keyed by shape`, () => {
    const { titles, grants } = worldPair(6);
    const plan = planDeliver(titles, [], grants, NOW);
    expect(plan.grouped).toBe(true);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.titleIds).toEqual(titles.map((row) => row.id));
    expect(plan.groups[0]!.options.map((option) => option.key)).toEqual(["avod|world|", "svod|world|"]);
    expect(deliverFaces(plan)).toEqual(["channel", "rights-0", "territory-0"]);
  });

  it("keeps a title holding two grants of one shape on its own face, keyed by grant id", () => {
    const { titles, grants } = worldPair(6);
    const twin = grant(99, 3, "avod");
    const plan = planDeliver(titles, [], [...grants, twin], NOW);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0]!.titleIds).toEqual([tid(1), tid(2), tid(4), tid(5), tid(6)]);
    expect(plan.groups[1]!.titleIds).toEqual([tid(3)]);
    expect(plan.groups[1]!.options.map((option) => option.key)).toEqual(["g-5", "g-6", "g-99"]);
  });

  it("sets aside titles not ready (live, in review) with their status, no active grant, and not found", () => {
    const titles = [title(1), title(2, "live"), title(3, "in_review"), title(4)];
    const grants = [
      grant(1, 1, "avod"),
      grant(2, 2, "avod"),
      grant(3, 3, "avod"),
      grant(4, 4, "avod", { window_end: "2026-10-01T00:00:00.000Z" }),
    ];
    const plan = planDeliver(titles, [tid(9), tid(10)], grants, NOW);
    expect(plan.notReady).toEqual([
      { id: tid(2), title: "Title 2", status: "live" },
      { id: tid(3), title: "Title 3", status: "in_review" },
    ]);
    expect(deliverNotReadyLines(plan)).toEqual(["Title 2 · Approved", "Title 3 · Needs review"]);
    expect(plan.noGrants).toEqual([{ id: tid(4), title: "Title 4" }]);
    expect(plan.notFound).toBe(2);
    expect(plan.groups.map((group) => group.titleIds)).toEqual([[tid(1)]]);
  });

  it("reads a grant's window as create_delivery does", () => {
    const base = grant(1, 1, "avod");
    expect(grantActiveAt(base, NOW)).toBe(true);
    expect(grantActiveAt({ ...base, window_start: "2026-11-01T00:00:00.000Z" }, NOW)).toBe(false);
    expect(grantActiveAt({ ...base, window_end: "2026-10-01T00:00:00.000Z" }, NOW)).toBe(false);
    expect(
      grantActiveAt({ ...base, window_start: "2026-01-01T00:00:00.000Z", window_end: "2027-01-01T00:00:00.000Z" }, NOW),
    ).toBe(true);
  });

  it(`flags more than ${DELIVER_MAX_TITLES} titles as over the cap`, () => {
    const { titles, grants } = worldPair(DELIVER_MAX_TITLES);
    expect(planDeliver(titles, [], grants, NOW).overCap).toBe(false);
    expect(planDeliver(titles, [tid(9999)], grants, NOW).overCap).toBe(true);
  });

  it("keeps selection order", () => {
    const titles = [title(3), title(1), title(2)];
    const grants = [grant(1, 1, "avod"), grant(2, 2, "svod"), grant(3, 3, "tvod")];
    const plan = planDeliver(titles, [], grants, NOW);
    expect(plan.groups.map((group) => group.titleIds[0])).toEqual([tid(3), tid(1), tid(2)]);
  });
});

describe("Deliver faces, items and labels", () => {
  it("orders faces Channel → every Rights → every Territory, and closes from the result", () => {
    const titles = [title(1), title(2), title(3)];
    const grants = [grant(1, 1, "avod"), grant(2, 2, "avod"), grant(3, 3, "avod")];
    const plan = planDeliver(titles, [], grants, NOW);
    expect(deliverFaces(plan)).toEqual([
      "channel",
      "rights-0",
      "rights-1",
      "rights-2",
      "territory-0",
      "territory-1",
      "territory-2",
    ]);
    expect(deliverIndexFace("done")).toBe("done");
    expect(deliverIndexFace("channel")).toBe("channel");
    expect(deliverIndexFace("rights-1")).toBe("channel");
    expect(deliverIndexFace("territory-2")).toBe("channel");
  });

  it("resolves a shape pick to EACH title's own grant id", () => {
    const { titles, grants } = worldPair(6);
    const plan = planDeliver(titles, [], grants, NOW);
    const draft: DeliverDraft = { vendorId: "v1", picks: { 0: "svod|world|" }, territories: { 0: "US" } };
    expect(deliverItems(plan, draft)).toEqual(
      titles.map((row, i) => ({ titleId: row.id, grantId: `g-${2 * i + 2}`, territory: "US" })),
    );
    expect(deliverItemCount(plan)).toBe(6);
  });

  it("clears a territory the new pick no longer offers, and keeps one it still offers", () => {
    const titles = [title(1)];
    const grants = [
      grant(1, 1, "avod", { territory_mode: "include", territories: ["US", "CA"] }),
      grant(2, 1, "svod", { territory_mode: "include", territories: ["US"] }),
    ];
    const plan = planDeliver(titles, [], grants, NOW);
    const start: DeliverDraft = { vendorId: "v1", picks: { 0: "g-1" }, territories: { 0: "CA" } };
    expect(deliverPick(plan, start, 0, "g-2").territories).toEqual({});
    const us: DeliverDraft = { ...start, territories: { 0: "US" } };
    expect(deliverPick(plan, us, 0, "g-2").territories).toEqual({ 0: "US" });
  });

  it("only continues on an answered face, and Deliver needs every group answered", () => {
    const titles = [title(1), title(2)];
    const grants = [grant(1, 1, "avod"), grant(2, 2, "avod")];
    const plan = planDeliver(titles, [], grants, NOW);
    const empty: DeliverDraft = { vendorId: "", picks: {}, territories: {} };
    expect(deliverCanContinue("channel", empty, null)).toBe(false);
    expect(deliverCanContinue("channel", empty, plan)).toBe(false);
    expect(deliverCanContinue("channel", { ...empty, vendorId: "v1" }, plan)).toBe(true);
    expect(deliverCanContinue("rights-0", { ...empty, vendorId: "v1" }, plan)).toBe(false);
    expect(deliverCanContinue("rights-0", { ...empty, vendorId: "v1", picks: { 0: "g-1" } }, plan)).toBe(true);
    expect(deliverCanContinue("rights-0", { ...empty, vendorId: "v1", picks: { 0: "g-2" } }, plan)).toBe(false);
    const oneAnswered: DeliverDraft = { vendorId: "v1", picks: { 0: "g-1", 1: "g-2" }, territories: { 1: "US" } };
    expect(deliverCanContinue("territory-1", oneAnswered, plan)).toBe(false);
    const both: DeliverDraft = { ...oneAnswered, territories: { 0: "CA", 1: "US" } };
    expect(deliverCanContinue("territory-1", both, plan)).toBe(true);
    expect(deliverCanContinue("territory-0", { ...both, territories: { 0: "ZZ" } }, plan)).toBe(false);
    expect(deliverCanContinue("done", empty, null)).toBe(true);
  });

  it(`sends batches of ${DELIVER_BATCH}`, () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    expect(deliverBatches(items).map((batch) => batch.length)).toEqual([25, 25, 10]);
    expect(deliverBatches([])).toEqual([]);
  });

  it("labels the header's one action: Continue, Deliver · N, Creating…, Done", () => {
    const faces = ["channel", "rights-0", "territory-0"] as const;
    expect(deliverPrimaryLabel("channel", faces, 6, false)).toBe("Continue");
    expect(deliverPrimaryLabel("rights-0", faces, 6, false)).toBe("Continue");
    expect(deliverPrimaryLabel("territory-0", faces, 6, false)).toBe("Deliver · 6");
    expect(deliverPrimaryLabel("territory-0", faces, 6, true)).toBe("Creating…");
    expect(deliverPrimaryLabel("done", faces, 6, false)).toBe("Done");
    expect(deliverPrimaryLabel("channel", ["channel"], 0, false)).toBe("Continue");
  });

  it("names a group on its face, or the one title", () => {
    const { titles, grants } = worldPair(6);
    const grouped = planDeliver(titles, [], grants, NOW);
    const names = new Map(titles.map((row) => [row.id, row.title]));
    expect(deliverGroupHint(grouped, 0, names, "rights")).toBe("6 titles · 1 of 1");
    const single = planDeliver(titles.slice(0, 3), [], grants, NOW);
    expect(deliverGroupHint(single, 0, names, "rights")).toBe("Title 1 · 1 of 3");
    expect(deliverGroupHint(single, 2, names, "territory")).toBe("Title 3 · 3 of 3");
    const one = planDeliver(titles.slice(0, 1), [], grants, NOW);
    expect(deliverGroupHint(one, 0, names, "rights")).toBe("Title 1");
  });

  it("titles the result: one created, all created, or part of them", () => {
    const outcome = (created: number, total: number, existing = 0): DeliverOutcome => ({
      ...deliverEmptyOutcome(total),
      created: Array.from({ length: created }, (_, i) => ({ titleId: tid(i), deliveryId: `d-${i}` })),
      existing: Array.from({ length: existing }, (_, i) => ({ titleId: tid(100 + i), deliveryId: null })),
    });
    expect(deliverResultTitle(outcome(1, 1))).toBe("Delivery created");
    expect(deliverResultTitle(outcome(3, 3))).toBe("3 deliveries created");
    expect(deliverResultTitle(outcome(2, 3))).toBe("2 of 3 deliveries created");
    expect(deliverResultTitle(outcome(1, 3, 2))).toBe("1 of 3 deliveries created");
  });

  it("adds batches up, lists failures then existing, and hands the list what it needs on close", () => {
    let outcome = deliverEmptyOutcome(3);
    outcome = deliverMergeOutcome(outcome, {
      created: [{ titleId: tid(1), deliveryId: "d-1" }],
      existing: [{ titleId: tid(2), deliveryId: null }],
      failed: [],
      stop: null,
    });
    outcome = deliverMergeOutcome(outcome, {
      created: [],
      existing: [],
      failed: [{ titleId: tid(3), reason: "no_cover" }],
      stop: "vendor_inactive",
    });
    const names = new Map([
      [tid(1), "North Star"],
      [tid(2), "Harbor"],
      [tid(3), "Late Frost"],
    ]);
    expect(deliverOutcomeLines(outcome, names)).toEqual([
      "Late Frost · No active grant covers this territory.",
      "Harbor · Delivery already exists.",
    ]);
    expect(outcome.stop).toBe("vendor_inactive");
    expect(deliverCloseOutcome(outcome, true)).toEqual({ saved: true, delivered: [tid(1), tid(2)], created: ["d-1"] });
    expect(deliverCloseOutcome(null, false)).toEqual({ saved: false, delivered: [], created: [] });
  });

  it("names the steps in the ask", () => {
    const draft: DeliverDraft = { vendorId: "v1", picks: { 0: "g-1" }, territories: {} };
    expect(deliverDiscardLine(deliverChangedSteps(draft))).toBe("Channel and Rights aren't saved.");
    expect(deliverDiscardLine(deliverChangedSteps({ vendorId: "v1", picks: {}, territories: {} }))).toBe(
      "Channel isn't saved.",
    );
    expect(deliverDiscardLine(["vendor", "rights", "territory"])).toBe("Channel, Rights and Territory aren't saved.");
    expect(deliverDiscardLine([])).toBe("");
  });

  it("un-ticks delivered titles and ids the list does not draw", () => {
    expect(licensingPruneSelection([TITLE_A, TITLE_B, tid(1)], [TITLE_A, TITLE_B], [TITLE_B])).toEqual([TITLE_A]);
    expect(licensingPruneSelection([TITLE_A], [TITLE_A], [])).toEqual([TITLE_A]);
  });
});

describe("Deliver failure mapping", () => {
  it("maps the unique key to existing and each RAISE prefix to its reason", () => {
    expect(deliverFailureReason({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(
      "existing",
    );
    const cases: [string, DeliverReason][] = [
      ["Not authenticated", "not_authenticated"],
      ["Not authorized", "not_authorized"],
      ["Territory must be an ISO 3166-1 alpha-2 code", "invalid"],
      ["Title not found", "not_found"],
      ['Chain of title: "x" has not been approved for delivery (status: live)', "not_ready"],
      ["Vendor not found or inactive", "vendor_inactive"],
      ["No active grant on this title covers US (g-1)", "no_cover"],
      ["Blocked: another client holds a conflicting exclusive claim on this work for avod in US", "conflict"],
    ];
    for (const [message, reason] of cases) {
      expect(deliverFailureReason({ code: "P0001", message })).toBe(reason);
    }
    expect(DELIVER_RPC_MESSAGES.map(([, reason]) => reason)).toEqual(cases.map(([, reason]) => reason));
    expect(deliverFailureReason({ code: "57014", message: "canceling statement due to statement timeout" })).toBe(
      "unknown",
    );
    expect(deliverFailureReason({})).toBe("unknown");
  });

  it("stops only on sign-out, lost permission, an inactive channel and invalid input", () => {
    const all = Object.keys(DELIVER_STEPPER.reasons) as DeliverReason[];
    expect(all.filter(deliverStops).sort()).toEqual(
      ["invalid", "not_authenticated", "not_authorized", "vendor_inactive"].sort(),
    );
  });
});

describe("Deliver copy", () => {
  it("keeps the house window's chrome and ask strings equal to the Metadata window's", () => {
    expect(DELIVER_STEPPER.close).toBe(TITLE_DETAILS.close);
    expect(DELIVER_STEPPER.back).toBe(TITLE_DETAILS.back);
    expect(DELIVER_STEPPER.discardTitle).toBe(TITLE_DETAILS.discardTitle);
    expect(DELIVER_STEPPER.discardOne).toBe(TITLE_DETAILS.discardOne);
    expect(DELIVER_STEPPER.discardMany).toBe(TITLE_DETAILS.discardMany);
    expect(DELIVER_STEPPER.discardAnd).toBe(TITLE_DETAILS.discardAnd);
    expect(DELIVER_STEPPER.discardKeep).toBe(TITLE_DETAILS.discardKeep);
    expect(DELIVER_STEPPER.discardConfirm).toBe(TITLE_DETAILS.discardConfirm);
    expect(DELIVER_STEPPER.notAuthenticated).toBe(TITLE_DETAILS.notAuthenticated);
    expect(DELIVER_STEPPER.notAuthorized).toBe(TITLE_DETAILS.notAuthorized);
    expect(DELIVER_STEPPER.saveFailed).toBe(TITLE_DETAILS.saveFailed);
    expect(DELIVER_STEPPER.reasons.save_failed).toBe(TITLE_DETAILS.saveFailed);
  });

  it("keeps the existing lines and drops the takeover's", () => {
    expect(DELIVER_STEPPER.vendorQuestion).toBe("Which channel for these titles?");
    expect(DELIVER_STEPPER.vendorHint(1)).toBe("1 title selected · one channel per delivery");
    expect(DELIVER_STEPPER.vendorHint(3)).toBe("3 titles selected · one channel per delivery");
    expect(DELIVER_STEPPER.rightsQuestion).toBe("Which rights grant?");
    expect(DELIVER_STEPPER.territoryQuestion).toBe("Which territory?");
    expect(DELIVER_STEPPER.continue).toBe("Continue");
    expect(DELIVER_STEPPER.creating).toBe("Creating…");
    expect(DELIVER_STEPPER.successTitle).toBe("Delivery created");
    expect(DELIVER_STEPPER.successId("abc")).toBe("ID · abc");
    expect(DELIVER_STEPPER.download).toBe("Download metadata sheet");
    expect(DELIVER_STEPPER.preparing).toBe("Preparing…");
    expect(DELIVER_STEPPER.exportFailed).toBe("Export failed.");
    expect(DELIVER_STEPPER.done).toBe("Done");
    expect(DELIVER_STEPPER.doneHint).toBe("Returns to Licensing Status");
    expect(DELIVER_STEPPER.noVendors).toBe("No active channels.");
    expect(DELIVER_STEPPER.noTitles).toBe("Select at least one title to deliver.");
    expect(DELIVER_STEPPER.selectTerritory).toBe("Select territory");
    for (const gone of ["progressCaption", "vendorQuestionPhone", "noGrants"]) {
      expect(DELIVER_STEPPER).not.toHaveProperty(gone);
    }
    expect(DELIVER_STEPPER.back).not.toContain("←");
  });

  it("holds the new lines as the lock lists them", () => {
    expect(DELIVER_STEPPER.groupHint(12, 0, 2)).toBe("12 titles · 1 of 2");
    expect(DELIVER_STEPPER.setAsideNoGrants(1)).toBe("1 title has no active grant and is left out.");
    expect(DELIVER_STEPPER.setAsideNoGrants(2)).toBe("2 titles have no active grants and are left out.");
    expect(DELIVER_STEPPER.setAsideNotReady(1)).toBe("1 title isn't ready to deliver and is left out.");
    expect(DELIVER_STEPPER.setAsideNotReady(2)).toBe("2 titles aren't ready to deliver and are left out.");
    expect(DELIVER_STEPPER.setAsideNotFound(1)).toBe("1 selected title could not be found and is left out.");
    expect(DELIVER_STEPPER.setAsideNotFound(2)).toBe("2 selected titles could not be found and are left out.");
    expect(DELIVER_STEPPER.overCap).toBe("Select up to 500 titles at a time.");
    expect(DELIVER_STEPPER.loadFailed).toBe("Could not load these titles.");
    expect(DELIVER_STEPPER.loadTooMany).toBe("Too many grants to load at once. Select fewer titles.");
    expect(DELIVER_STEPPER.successMany(3)).toBe("3 deliveries created");
    expect(DELIVER_STEPPER.partial(2, 3)).toBe("2 of 3 deliveries created");
    expect(DELIVER_STEPPER.titleLine("North Star", "Approved")).toBe("North Star · Approved");
    expect(DELIVER_STEPPER.reasons).toEqual({
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
    });
  });
});

describe("Deliver steps", () => {
  it("locks Channel → Rights → Territory → Done with Sporty Blue fill", () => {
    expect(DELIVER_STEPPER_STEPS.map((step) => step.key)).toEqual([
      "vendor",
      "rights",
      "territory",
      "done",
    ]);
    expect(deliverProgressFilled("vendor")).toBe(1);
    expect(deliverProgressFilled("rights")).toBe(2);
    expect(deliverProgressFilled("territory")).toBe(3);
    expect(deliverProgressFilled("done")).toBe(4);
    expect(DELIVER_PROGRESS_SEG_ON_CLASS).toContain("bg-accent");
    expect(DELIVER_PROGRESS_SEG_ON_CLASS).not.toContain("#635BFF");
    expect(DELIVER_STEPPER_STEPS.map((step) => step.label)).toEqual([
      "Channel",
      "Rights",
      "Territory",
      "Done",
    ]);
  });

  it("parses selected title ids (canonical UUIDs only, once each)", () => {
    expect(parseDeliverTitleIds(`${TITLE_A},${TITLE_B},not-an-id,${TITLE_A}`)).toEqual([TITLE_A, TITLE_B]);
    expect(parseDeliverTitleIds(undefined)).toEqual([]);
  });

  it("labels grants from house rights + territory, and cards only for short include lists", () => {
    expect(
      grantChoiceLabel({
        id: "g1",
        title_id: TITLE_A,
        rights_type: "avod",
        territory_mode: "world",
        territories: [],
      }),
    ).toBe("AVOD · Worldwide");
    const include = grantTerritoryChoices({
      id: "g1",
      title_id: TITLE_A,
      rights_type: "avod",
      territory_mode: "include",
      territories: ["US", "CA"],
    });
    expect(include).toEqual([
      { key: "US", label: "United States" },
      { key: "CA", label: "Canada" },
    ]);
    expect(grantTerritoryUsesCards(include)).toBe(true);
    expect(
      grantTerritoryUsesCards(
        grantTerritoryChoices({
          id: "g2",
          title_id: TITLE_A,
          rights_type: "avod",
          territory_mode: "world",
          territories: [],
        }),
      ),
    ).toBe(false);
  });
});
