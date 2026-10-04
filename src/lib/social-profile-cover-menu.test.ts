import { describe, expect, it } from "vitest";

import {
  coverMenuToggleSequence,
  coverRepositionAction,
  coverTrailTarget,
  COVER_TRAIL_SELECTOR,
  nextCoverPillMode,
  reduceCoverMenu,
  type CoverMenuMachine,
} from "./social-profile-cover-menu";

const idle: CoverMenuMachine = { mode: "idle", listener: "idle" };

describe("cover menu toggle", () => {
  it("opens on a pill click and ignores a same-gesture outside press", () => {
    let state = reduceCoverMenu(idle, { type: "pill-click" });
    expect(state).toEqual({ mode: "menu", listener: "idle" });
    state = reduceCoverMenu(state, { type: "document-press", inside: false });
    expect(state.mode).toBe("menu");
  });

  it("closes on an outside press only after the listener is armed", () => {
    let state = reduceCoverMenu(idle, { type: "pill-click" });
    state = reduceCoverMenu(state, { type: "arm-listener" });
    state = reduceCoverMenu(state, { type: "document-press", inside: false });
    expect(state).toEqual({ mode: "idle", listener: "idle" });
  });

  it("does not treat a press on the pill as an outside close", () => {
    let state: CoverMenuMachine = { mode: "menu", listener: "armed" };
    state = reduceCoverMenu(state, { type: "document-press", inside: true });
    expect(state.mode).toBe("menu");
    state = reduceCoverMenu(state, { type: "pill-click" });
    expect(state).toEqual({ mode: "idle", listener: "idle" });
  });

  it("reopens after an outside close", () => {
    let state: CoverMenuMachine = { mode: "menu", listener: "armed" };
    state = reduceCoverMenu(state, { type: "document-press", inside: false });
    state = reduceCoverMenu(state, { type: "pill-click" });
    expect(state.mode).toBe("menu");
    expect(state.listener).toBe("idle");
  });

  it("escape closes and the next pill click opens", () => {
    let state: CoverMenuMachine = { mode: "menu", listener: "armed" };
    state = reduceCoverMenu(state, { type: "escape" });
    expect(state).toEqual({ mode: "idle", listener: "idle" });
    state = reduceCoverMenu(state, { type: "pill-click" });
    expect(state.mode).toBe("menu");
  });

  it("toggles open and closed more than ten times without sticking", () => {
    const seen = coverMenuToggleSequence(12);
    expect(seen).toHaveLength(24);
    expect(seen.every((mode) => mode === "menu")).toBe(true);
    expect(nextCoverPillMode("menu")).toBe("idle");
    expect(nextCoverPillMode("idle")).toBe("menu");
  });
});

describe("cover Reposition (keep the original)", () => {
  it("reopens a kept original and opens the picker for a cover without one", () => {
    expect(coverRepositionAction({ hasCover: true, hasSource: true })).toBe("reopen");
    expect(coverRepositionAction({ hasCover: true, hasSource: false })).toBe("pick");
    expect(coverRepositionAction({ hasCover: false, hasSource: false })).toBeNull();
    expect(coverRepositionAction({ hasCover: false, hasSource: true })).toBeNull();
  });

  it("finds the head trail inside the same identity block", () => {
    const trail = { id: "trail" } as unknown as HTMLElement;
    const host = {
      querySelector: (selector: string) => (selector === COVER_TRAIL_SELECTOR ? trail : null),
    };
    const node = {
      closest: (selector: string) => (selector === "[data-social-profile-identity]" ? host : null),
    } as unknown as Element;
    expect(COVER_TRAIL_SELECTOR).toBe("[data-social-profile-head-trail]");
    expect(coverTrailTarget(node)).toBe(trail);
    expect(coverTrailTarget(null)).toBeNull();
    const orphan = { closest: () => null } as unknown as Element;
    expect(coverTrailTarget(orphan)).toBeNull();
  });
});
