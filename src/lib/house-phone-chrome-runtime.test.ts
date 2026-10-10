import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HOUSE_PHONE_CHROME_HEIGHT_VAR,
  HOUSE_PHONE_CHROME_VISIBLE_VAR,
  HOUSE_PHONE_DOCK_HIDDEN_ATTR,
  HOUSE_PHONE_SHEET_SETTLE_ATTR,
  HOUSE_PHONE_SHEET_Y_VAR,
} from "./house-lead-chrome";
import { HOUSE_PHONE_CHROME_DRAG_ZONE, type HousePhoneChromeState } from "./house-phone-chrome";
import {
  createHousePhoneChromeRuntime,
  housePhoneChromeRestMode,
  housePhoneSheetCoverFromTranslate,
  housePhoneSheetGlideY,
  type HousePhoneChromeRestMode,
} from "./house-phone-chrome-runtime";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md §5 and G14 (v1.5,
// Adam 2026-10-09: "fix and change everything that you recommend").
//
// The rig emulates the browser: tick() is one rendering update. Timers run
// first (tasks), then the scroll event for a scroller the runtime (or a
// raw setTop) left dirty, then the animation frames asked for before the
// update. A frame asked for during a frame runs in the next update.

type Listener = (event: unknown) => void;

function touchTarget(zone: boolean) {
  const listeners = new Map<string, Listener>();
  return {
    isConnected: true,
    closest: (selector: string) => (zone && selector === HOUSE_PHONE_CHROME_DRAG_ZONE ? {} : null),
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string, listener: Listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    listeners,
  };
}

const CHROME_H = 130;

function rig({ mode = "scrollend", range = 2000 }: { mode?: HousePhoneChromeRestMode; range?: number } = {}) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  let top = 0;
  let dirty = false;
  let ignoreWrites = false;
  let reduce = false;
  let live: number | null = null;
  // Every write the runtime attempts, with its time.
  const writes: Array<{ y: number; at: number }> = [];
  const smooth: number[] = [];
  const scroller = {
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      writes.push({ y: value, at: Date.now() });
      if (ignoreWrites) return;
      const next = Math.round(Math.min(range, Math.max(0, value)));
      if (next !== top) {
        top = next;
        dirty = true;
      }
    },
    get scrollHeight() {
      return range + 800;
    },
    clientHeight: 800,
    scrollTo: ({ top: y }: { top: number; behavior: "smooth" }) => {
      smooth.push(y);
    },
  };

  const attrs = new Set<string>();
  const vars = new Map<string, string>();
  const attrSets: string[] = [];
  const yLog: string[] = [];
  const root = {
    setAttribute: (name: string) => {
      attrSets.push(name);
      attrs.add(name);
    },
    removeAttribute: (name: string) => {
      attrs.delete(name);
    },
    style: {
      setProperty: (name: string, value: string) => {
        if (name === HOUSE_PHONE_SHEET_Y_VAR) yLog.push(value);
        vars.set(name, value);
      },
    },
  };

  let frameId = 0;
  const frames = new Map<number, (time: number) => void>();
  const changes: HousePhoneChromeState[] = [];
  const runtime = createHousePhoneChromeRuntime({
    root,
    scroller,
    readY: () => top,
    readLiveCover: () => live,
    restMode: mode,
    reduceMotion: () => reduce,
    clock: {
      now: () => Date.now(),
      setTimeout: (callback, ms) => setTimeout(callback, ms),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      requestFrame: (callback) => {
        frameId += 1;
        frames.set(frameId, callback);
        return frameId;
      },
      cancelFrame: (handle) => {
        frames.delete(handle as number);
      },
    },
    onChange: (next) => changes.push(next),
  });
  runtime.setChromeHeight(CHROME_H);

  const zone = touchTarget(true);
  const main = touchTarget(false);
  const points = (...list: Array<[number, number]>) => list.map(([clientX, clientY]) => ({ clientX, clientY }));
  let touched: unknown = null;

  const r = {
    runtime,
    writes,
    smooth,
    attrs,
    attrSets,
    vars,
    yLog,
    changes,
    zone,
    main,
    target: touchTarget,
    top: () => top,
    now: () => Date.now(),
    cover: () => Number.parseFloat(vars.get(HOUSE_PHONE_SHEET_Y_VAR) ?? "NaN"),
    settles: () => attrSets.filter((name) => name === HOUSE_PHONE_SHEET_SETTLE_ATTR).length,
    setLive: (value: number | null) => {
      live = value;
    },
    setReduce: (value: boolean) => {
      reduce = value;
    },
    setIgnoreWrites: (value: boolean) => {
      ignoreWrites = value;
    },
    /** The user scrolls the page: the position and its event, now. */
    userScroll(y: number) {
      top = y;
      dirty = false;
      runtime.onScroll();
    },
    /** The page moved; its event comes with the next update. */
    setTop(y: number) {
      top = y;
      dirty = true;
    },
    scrollEnd: () => runtime.onScrollEnd(),
    foreign: () => runtime.onForeignScroll(),
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    tick(ms = 16, stamp?: number) {
      vi.advanceTimersByTime(ms);
      if (dirty) {
        dirty = false;
        runtime.onScroll();
      }
      const time = stamp ?? Date.now();
      for (const id of [...frames.keys()]) {
        const callback = frames.get(id);
        if (!callback) continue;
        frames.delete(id);
        callback(time);
      }
    },
    ticks(ms: number) {
      for (let spent = 0; spent < ms; spent += 16) r.tick();
    },
    frameCount: () => frames.size,
    touchStart(target: unknown, ...at: Array<[number, number]>) {
      touched = target;
      runtime.onTouchStart({ touches: points(...at), target });
    },
    touchMove(...at: Array<[number, number]>) {
      runtime.onTouchMove({ touches: points(...at), target: touched });
    },
    touchEnd(...left: Array<[number, number]>) {
      runtime.onTouchEnd({ touches: points(...left), target: touched });
    },
  };
  return r;
}

const SETTLE = HOUSE_PHONE_SHEET_SETTLE_ATTR;
const DOCK = HOUSE_PHONE_DOCK_HIDDEN_ATTR;
const Y = HOUSE_PHONE_SHEET_Y_VAR;

// A near-top rest at 20, then the two quiet frames: the glide is asked for.
function glideFrom20(mode: HousePhoneChromeRestMode = "scrollend") {
  const r = rig({ mode });
  r.userScroll(20);
  r.scrollEnd();
  r.tick();
  r.tick();
  return r;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("phone chrome runtime — rest (v1.5)", () => {
  it("R1: picks scrollend where the scroller has it, the 120ms timer otherwise", () => {
    expect(housePhoneChromeRestMode({ onscrollend: null })).toBe("scrollend");
    expect(housePhoneChromeRestMode({})).toBe("timer");

    const r = rig({ mode: "scrollend" });
    r.userScroll(400);
    r.userScroll(380);
    r.ticks(200);
    expect(r.cover()).toBe(36);
    expect(r.settles()).toBe(0);
    r.scrollEnd();
    r.tick();
    r.tick();
    expect(r.attrs.has(SETTLE)).toBe(true);
    expect(r.vars.get(Y)).toBe("0px");

    const t = rig({ mode: "timer" });
    t.userScroll(400);
    t.userScroll(380);
    t.advance(120);
    t.tick(0);
    expect(t.attrs.has(SETTLE)).toBe(true);
    expect(t.vars.get(Y)).toBe("0px");
  });

  it("R2: never both — scrollend mode ignores 120ms; timer mode ignores scrollend", () => {
    const r = rig({ mode: "scrollend" });
    r.userScroll(400);
    r.userScroll(380);
    r.ticks(130);
    expect(r.settles()).toBe(0);
    expect(r.cover()).toBe(36);

    const t = rig({ mode: "timer" });
    t.userScroll(400);
    t.userScroll(380);
    t.scrollEnd();
    t.tick();
    t.tick();
    expect(t.settles()).toBe(0);
  });

  it("R3: one settle per rest — a scrollend mid-glide never restarts it", () => {
    const r = glideFrom20();
    r.tick(); // the glide's first frame: its t0
    const t0 = r.now();
    r.tick();
    r.tick();
    r.scrollEnd(); // mid-glide
    r.ticks(400);
    expect(r.top()).toBe(56);
    expect(r.writes.length).toBeGreaterThan(0);
    // No write after the first frame at or past 180ms from its own t0.
    for (const write of r.writes) expect(write.at - t0).toBeLessThanOrEqual(192);
    const landed = r.writes.length;
    r.scrollEnd();
    r.ticks(700);
    expect(r.writes).toHaveLength(landed);
  });

  it("R4: the 600ms watchdog stands in for a scrollend that never comes; never under a finger", () => {
    const r = rig();
    r.userScroll(400);
    r.userScroll(380);
    r.advance(599);
    r.tick(0);
    expect(r.settles()).toBe(0);
    r.advance(1);
    r.tick(0);
    expect(r.settles()).toBe(1);
    expect(r.vars.get(Y)).toBe("0px");

    const s = rig();
    s.userScroll(400);
    s.userScroll(380);
    s.touchStart(s.main, [0, 300]);
    s.scrollEnd();
    s.tick();
    s.tick();
    expect(s.settles()).toBe(0);
    s.ticks(2000); // a touch held 2s
    expect(s.settles()).toBe(0);
    expect(s.cover()).toBe(36);
  });

  it("R21: a scroll event late after a long task is a move, not a rest", () => {
    for (const [mode, wait] of [
      ["scrollend", 600],
      ["timer", 120],
    ] as const) {
      const r = rig({ mode });
      r.userScroll(400);
      r.userScroll(380);
      r.advance(wait);
      r.setTop(390);
      r.tick(0);
      expect(r.cover(), mode).toBe(46);
      expect(r.settles(), mode).toBe(0);
    }
  });
});

describe("phone chrome runtime — the near-top glide (v1.5)", () => {
  it("R5: the page and the cover in the same frame, 180ms, landing covered with the dock", () => {
    const r = rig();
    r.userScroll(20);
    r.scrollEnd();
    const writtenAt: number[] = [];
    let t0: number | null = null;
    for (let i = 0; i < 30; i += 1) {
      const before = r.frameCount();
      r.tick();
      if (i === 2) {
        // The glide's first frame (after two quiet frames) writes nothing.
        expect(before).toBe(1);
        expect(r.writes).toHaveLength(0);
        t0 = r.now();
      }
      expect(r.vars.get(Y), `tick ${i}`).toBe(`${r.top()}px`);
      if (r.writes.length > writtenAt.length) writtenAt.push(r.now());
    }
    const ys = r.writes.map((write) => write.y);
    for (let i = 1; i < ys.length; i += 1) expect(ys[i]).toBeGreaterThan(ys[i - 1] ?? Infinity);
    expect(t0).not.toBeNull();
    for (const at of writtenAt) expect(at - (t0 ?? 0)).toBeLessThan(192);
    expect(r.top()).toBe(56);
    expect(r.cover()).toBe(56);
    expect(r.attrs.has(DOCK)).toBe(true);
  });

  it("R5b: 180ms count from the glide's first frame, not from when it was asked", () => {
    const r = glideFrom20();
    const asked = r.now();
    r.tick(0, asked - 8);
    r.tick(16, asked + 8);
    expect(housePhoneSheetGlideY(20, 56, 16)).toBe(30);
    expect(r.writes.at(-1)?.y).toBe(30);
  });

  it("R6/R7/R22: the 120ms timer never glides: the browser's smooth settle, landed 120ms after it starts", () => {
    const t = rig({ mode: "timer" });
    t.userScroll(20);
    t.advance(120);
    t.tick(0);
    expect(t.smooth).toEqual([56]);
    for (let i = 0; i < 6; i += 1) t.tick();
    expect(t.writes).toHaveLength(0);
    // No scroll event ever came (a cut-short smooth scroll): it lands at once.
    t.tick();
    t.tick();
    expect(t.writes.map((write) => write.y)).toEqual([56]);
    expect(t.top()).toBe(56);
    expect(t.cover()).toBe(56);
    expect(t.attrs.has(DOCK)).toBe(true);
    // R22: its echo starts nothing.
    const settles = t.settles();
    t.ticks(2000);
    expect(t.smooth).toEqual([56]);
    expect(t.writes).toHaveLength(1);
    expect(t.settles()).toBe(settles);
  });

  it("R8: the smooth settle follows its events and lands 120ms after the last", () => {
    const t = rig({ mode: "timer" });
    t.userScroll(20);
    t.advance(120);
    t.tick(0);
    t.userScroll(30);
    expect(t.cover()).toBe(30);
    t.advance(16);
    t.userScroll(40);
    expect(t.cover()).toBe(40);
    t.advance(119);
    expect(t.writes).toHaveLength(0);
    expect(t.cover()).toBe(40);
    t.advance(1);
    expect(t.top()).toBe(56);
    expect(t.cover()).toBe(56);
  });

  it("R9: a page that ignores the glide's writes still ends covered, the dock with it", () => {
    const r = rig();
    r.setIgnoreWrites(true);
    r.userScroll(20);
    r.scrollEnd();
    r.ticks(250);
    expect(r.top()).toBe(20);
    expect(r.cover()).toBe(56);
    expect(r.attrs.has(DOCK)).toBe(true);
    const attempts = r.writes.length;
    r.ticks(2000);
    expect(r.writes).toHaveLength(attempts);
  });

  it("R10: a touch stops the glide where it is; the lift settles again", () => {
    const r = glideFrom20();
    r.tick();
    r.tick();
    expect(r.writes.length).toBeGreaterThan(0);
    r.touchStart(r.main, [0, 400]);
    const writes = r.writes.length;
    r.ticks(300);
    expect(r.writes).toHaveLength(writes);
    expect(r.cover()).toBe(r.top());
    r.touchEnd();
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.writes.length).toBeGreaterThan(writes);
  });

  it("R11: a scroll the glide did not make takes over; the next rest re-settles", () => {
    const r = glideFrom20();
    r.tick();
    r.tick();
    const writes = r.writes.length;
    r.userScroll(r.top() + 40);
    expect(r.cover()).toBe(56);
    r.ticks(300);
    expect(r.writes).toHaveLength(writes);
    r.advance(600);
    r.tick();
    expect(r.writes).toHaveLength(writes);
    expect(r.cover()).toBe(56);
  });

  it("R12: the status-bar tap's signal stops a settle before its smooth scroll", () => {
    const r = glideFrom20();
    r.tick();
    r.tick();
    const writes = r.writes.length;
    r.foreign();
    r.tick();
    r.tick();
    expect(r.writes).toHaveLength(writes);
    // The bridge's smooth scroll to the top.
    r.userScroll(10);
    r.userScroll(0);
    expect(r.cover()).toBe(0);
    r.scrollEnd();
    r.tick();
    r.tick();
    r.ticks(200);
    expect(r.writes).toHaveLength(writes);

    const t = rig({ mode: "timer" });
    t.userScroll(20);
    t.advance(120);
    t.tick(0);
    expect(t.smooth).toEqual([56]);
    t.foreign();
    t.userScroll(10);
    t.userScroll(0);
    t.ticks(200);
    expect(t.writes).toHaveLength(0);
    expect(t.cover()).toBe(0);
  });

  it("R24: reduced motion, read at every settle: an instant landing, then a glide again", () => {
    const r = rig();
    r.setReduce(true);
    r.userScroll(20);
    r.scrollEnd();
    r.tick();
    r.tick();
    expect(r.writes.map((write) => write.y)).toEqual([56]);
    r.ticks(300);
    expect(r.writes).toHaveLength(1);
    expect(r.cover()).toBe(56);
    expect(r.attrs.has(DOCK)).toBe(true);

    r.setReduce(false);
    r.userScroll(30);
    r.scrollEnd();
    r.ticks(300);
    expect(r.writes.length).toBeGreaterThan(2);
    expect(r.top()).toBe(0);
  });

  it("R25: open() stops a glide and eases the bar open", () => {
    const r = glideFrom20();
    r.tick();
    r.tick();
    const writes = r.writes.length;
    r.runtime.open();
    r.ticks(300);
    expect(r.writes).toHaveLength(writes);
    expect(r.settles()).toBe(1);
    expect(r.vars.get(Y)).toBe("0px");
  });
});

describe("phone chrome runtime — interrupts and drags (v1.5)", () => {
  // Deep in the page, a rest eases the bar open (the settle mark on).
  function deepEase() {
    const r = rig();
    r.userScroll(400);
    r.userScroll(370);
    r.scrollEnd();
    r.tick();
    r.tick();
    expect(r.attrs.has(SETTLE)).toBe(true);
    expect(r.vars.get(Y)).toBe("0px");
    return r;
  }

  it("R13: a scroll during the deep ease carries on from the bar on screen", () => {
    const r = deepEase();
    r.setLive(12);
    r.userScroll(372);
    expect(r.cover()).toBe(14);
    expect(r.attrs.has(SETTLE)).toBe(false);
  });

  it("R13b: a drag during the deep ease starts from the bar on screen", () => {
    const r = deepEase();
    r.setLive(20);
    r.touchStart(r.zone, [0, 100]);
    r.touchMove([0, 92]);
    r.tick();
    expect(r.cover()).toBe(28);
  });

  it("R14: a drag writes once per frame; the release flushes it, then glides", () => {
    const r = rig();
    const mark = r.yLog.length;
    r.touchStart(r.zone, [0, 100]);
    r.touchMove([0, 90]);
    r.touchMove([0, 80]);
    expect(r.yLog.length - mark).toBe(0);
    r.tick();
    expect(r.yLog.length - mark).toBe(1);
    expect(r.top()).toBe(20);
    expect(r.cover()).toBe(20);
    r.tick(); // the drag write's own scroll event, during the touch
    r.touchMove([0, 70]);
    r.touchEnd();
    expect(r.top()).toBe(30);
    expect(r.cover()).toBe(30);
    const before = r.writes.length;
    for (let i = 0; i < 4; i += 1) r.tick();
    const glide = r.writes.slice(before).map((write) => write.y);
    expect(glide.length).toBeGreaterThan(0);
    expect(glide.every((y) => y > 30)).toBe(true);
  });

  it("R15: a release after another scroll during the touch waits for the rest", () => {
    for (const mode of ["scrollend", "timer"] as const) {
      const r = rig({ mode });
      r.touchStart(r.zone, [0, 100]);
      r.touchMove([0, 80]);
      r.tick();
      r.tick();
      r.userScroll(35); // momentum under the chrome, not the drag's
      r.touchEnd();
      const writes = r.writes.length;
      r.ticks(96);
      expect(r.writes, mode).toHaveLength(writes);
      if (mode === "scrollend") {
        r.scrollEnd();
        for (let i = 0; i < 4; i += 1) r.tick();
        expect(r.writes.length).toBeGreaterThan(writes);
      } else {
        r.advance(24);
        r.tick(0);
        expect(r.smooth).toEqual([56]);
        expect(r.writes).toHaveLength(writes);
      }
    }
  });

  it("R16: a drag that ends on a removed element still settles; a connected one ends at the root", () => {
    const r = rig();
    const t = r.target(true);
    r.touchStart(t, [0, 100]);
    r.touchMove([0, 80]);
    r.tick();
    t.isConnected = false;
    t.listeners.get("touchend")?.({ touches: [] });
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.top()).toBeGreaterThan(20);
    r.touchEnd(); // the root: a no-op now
    r.ticks(300);
    expect(r.top()).toBe(56);

    const c = rig();
    const ct = c.target(true);
    c.touchStart(ct, [0, 100]);
    c.touchMove([0, 80]);
    c.tick();
    ct.listeners.get("touchend")?.({ touches: [] });
    // Still the drag: the finger keeps moving the bar.
    c.touchMove([0, 70]);
    c.tick();
    expect(c.cover()).toBe(30);
  });

  it("R17: a removed element's touchmove still moves the bar; a connected one leaves it to the root", () => {
    const r = rig();
    const t = r.target(true);
    r.touchStart(t, [0, 100]);
    r.touchMove([0, 90]);
    r.tick();
    expect(r.cover()).toBe(10);
    t.isConnected = false;
    t.listeners.get("touchmove")?.({ touches: [{ clientX: 0, clientY: 70 }] });
    r.tick();
    expect(r.cover()).toBe(30);

    const c = rig();
    const ct = c.target(true);
    c.touchStart(ct, [0, 100]);
    c.touchMove([0, 90]);
    c.tick();
    ct.listeners.get("touchmove")?.({ touches: [{ clientX: 0, clientY: 70 }] });
    c.tick();
    expect(c.cover()).toBe(10);
  });

  it("R18: a second finger ends the drag where it is; the last lift settles", () => {
    const r = rig();
    r.touchStart(r.zone, [0, 100]);
    r.touchMove([0, 90]);
    r.tick();
    expect(r.cover()).toBe(10);
    r.touchStart(r.zone, [0, 90], [0, 300]);
    r.touchEnd([0, 300]);
    r.touchMove([0, 310]);
    r.tick();
    expect(r.cover()).toBe(10);
    r.touchEnd();
    r.ticks(400);
    expect(r.top()).toBe(56);
    expect(r.cover()).toBe(56);

    // After the second finger the page's own moves turn the way again: two
    // fingers scroll it back 6, and the rest opens.
    const p = rig();
    p.touchStart(p.zone, [0, 100]);
    p.touchMove([0, 90]);
    p.tick();
    p.tick();
    p.touchStart(p.zone, [0, 90], [0, 300]);
    p.userScroll(4);
    p.touchEnd([0, 300]);
    p.touchEnd();
    p.scrollEnd();
    p.ticks(400);
    expect(p.top()).toBe(0);
    expect(p.cover()).toBe(0);
  });

  it("R19: a lift after scrollend came during the touch is a rest; momentum after it is not", () => {
    const r = rig();
    r.touchStart(r.main, [0, 400]);
    r.userScroll(20);
    r.scrollEnd();
    r.touchEnd();
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.writes.length).toBeGreaterThan(0);

    // The two quiet frames pass, then momentum moves the page: the glide
    // it would have started has written nothing yet, and stops.
    const m = rig();
    m.touchStart(m.main, [0, 400]);
    m.userScroll(20);
    m.scrollEnd();
    m.touchEnd();
    m.tick();
    m.tick();
    m.userScroll(25); // momentum after the lift
    for (let i = 0; i < 8; i += 1) m.tick();
    expect(m.writes).toHaveLength(0);
    m.scrollEnd();
    for (let i = 0; i < 4; i += 1) m.tick();
    expect(m.writes.length).toBeGreaterThan(0);

    // A momentum event right after the lift: the lift is not a rest.
    const n = rig();
    n.touchStart(n.main, [0, 400]);
    n.userScroll(20);
    n.touchEnd(); // no scrollend during the touch
    n.tick();
    n.userScroll(30);
    for (let i = 0; i < 8; i += 1) n.tick();
    expect(n.writes).toHaveLength(0);
  });

  it("R20: a tap that stops a fling settles with no scrollend ever", () => {
    const r = rig();
    r.userScroll(30);
    r.touchStart(r.main, [0, 400]);
    r.touchEnd();
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.writes.length).toBeGreaterThan(0);
  });

  it("R23: the dock's mark goes on and off in the same handler as the cover; stop() clears it", () => {
    const r = rig();
    r.userScroll(40);
    expect(r.attrs.has(DOCK)).toBe(true);
    expect(r.vars.get(Y)).toBe("40px");
    r.userScroll(20);
    expect(r.attrs.has(DOCK)).toBe(false);
    r.userScroll(60);
    expect(r.attrs.has(DOCK)).toBe(true);
    r.runtime.stop();
    expect(r.attrs.has(DOCK)).toBe(false);
    expect(r.vars.get(Y)).toBe("0px");
    expect(r.vars.get(HOUSE_PHONE_CHROME_VISIBLE_VAR)).toBe(`${CHROME_H}px`);
    expect(r.vars.get(HOUSE_PHONE_CHROME_HEIGHT_VAR)).toBe(`${CHROME_H}px`);
    // The chrome reads open after the stop.
    expect(r.changes.at(-1)).toEqual({ dockHidden: false, bandTucked: false });
  });

  it("R26: stop() ends a glide, a pending drag frame and a rest timer; later events do nothing", () => {
    const g = glideFrom20();
    g.tick();
    g.tick();
    const writes = g.writes.length;
    g.runtime.stop();
    g.ticks(2000);
    expect(g.writes).toHaveLength(writes);
    expect(g.attrs.size).toBe(0);
    g.userScroll(300);
    g.scrollEnd();
    g.ticks(700);
    expect(g.vars.get(Y)).toBe("0px");
    expect(g.writes).toHaveLength(writes);

    // A rest timer armed (the page moving, no finger).
    const m = rig({ mode: "timer" });
    m.userScroll(400);
    m.userScroll(380);
    m.runtime.stop();
    m.ticks(2000);
    expect(m.settles()).toBe(0);
    expect(m.smooth).toEqual([]);

    const d = rig();
    d.userScroll(400);
    d.userScroll(380);
    d.touchStart(d.zone, [0, 100]);
    d.touchMove([0, 90]); // a drag frame is pending
    d.runtime.stop();
    d.ticks(2000);
    expect(d.writes).toHaveLength(0);
    expect(d.settles()).toBe(0);
    expect(d.vars.get(Y)).toBe("0px");
    d.touchMove([0, 50]);
    d.touchEnd();
    d.runtime.open();
    d.ticks(700);
    expect(d.vars.get(Y)).toBe("0px");
    expect(d.attrs.size).toBe(0);
  });

  it("R27: a finger counted down for 10s with no touch event is lifted", () => {
    const r = rig();
    r.userScroll(20);
    r.touchStart(r.main, [0, 400]);
    r.advance(9999);
    r.tick(0);
    r.tick(0);
    r.tick(0);
    expect(r.writes).toHaveLength(0);
    r.advance(1);
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.writes.length).toBeGreaterThan(0);

    const m = rig();
    m.userScroll(20);
    m.touchStart(m.main, [0, 400]);
    for (let i = 0; i < 12; i += 1) {
      m.advance(1000);
      m.touchMove([0, 400]);
    }
    for (let i = 0; i < 4; i += 1) m.tick();
    expect(m.writes).toHaveLength(0);
  });

  it("R29: a finger the stale guard lifted that moves again is down: nothing settles or writes under it", () => {
    for (const mode of ["scrollend", "timer"] as const) {
      const r = rig({ mode });
      r.userScroll(20);
      r.touchStart(r.main, [0, 400]);
      r.advance(10_000); // still for 10s: counted lifted, and it settles
      r.ticks(160);
      const settled = r.writes.length + r.smooth.length;
      expect(settled, mode).toBeGreaterThan(0);
      // The same thumb moves again and scrolls main back up a little (still
      // near the top), then pauses, still down.
      r.touchMove([0, 394]);
      r.userScroll(r.top() - 6);
      r.touchMove([0, 300]); // on main: the bar does not follow the finger
      const writes = r.writes.length;
      const smooth = r.smooth.length;
      const cover = r.cover();
      r.ticks(2000);
      expect(r.writes, mode).toHaveLength(writes);
      expect(r.smooth, mode).toHaveLength(smooth);
      expect(r.cover(), mode).toBe(cover);
      // The real lift settles the way it was going: open.
      r.touchEnd();
      r.ticks(1000);
      expect(r.writes.length + r.smooth.length, mode).toBeGreaterThan(writes + smooth);
      if (mode === "scrollend") expect(r.top()).toBe(0);
      else expect(r.smooth.at(-1)).toBe(0);
    }

    // Moved again but scrolled nothing: the lift still waits for a rest it
    // can prove (the 600ms watchdog), not a quick one from before the guard.
    const q = rig();
    q.touchStart(q.main, [0, 400]);
    q.userScroll(20);
    q.scrollEnd(); // a rest seen during the first part of the touch
    q.advance(10_000);
    for (let i = 0; i < 4; i += 1) q.tick();
    q.touchMove([0, 401]);
    const before = q.writes.length;
    q.touchEnd();
    q.ticks(96);
    expect(q.writes).toHaveLength(before);
    q.ticks(1000);
    expect(q.writes.length).toBeGreaterThan(before);
  });

  it("R29b: a drag the stale guard lifted carries on under the finger; its release waits for the rest", () => {
    const r = rig();
    r.touchStart(r.zone, [0, 100]);
    r.touchMove([0, 90]);
    r.tick();
    expect(r.cover()).toBe(10);
    r.advance(10_000); // held still: counted lifted, and the release glides
    for (let i = 0; i < 4; i += 1) r.tick();
    expect(r.top()).toBeGreaterThan(10);
    const top = r.top();
    expect(r.cover()).toBe(top);
    // The finger moves again: the glide stops, and the bar follows it from there.
    r.touchMove([0, 80]);
    r.ticks(300);
    expect(r.top()).toBe(top);
    r.touchMove([0, 76]); // under the 6 lock: the drag is still vertical
    r.tick();
    expect(r.cover()).toBe(top + 4);
    r.touchMove([0, 70]);
    r.tick();
    expect(r.cover()).toBe(top + 10);
    expect(r.top()).toBe(top + 10);
    // No rest is proven after the guard: the release waits for one.
    const writes = r.writes.length;
    r.touchEnd();
    r.ticks(96);
    expect(r.writes).toHaveLength(writes);
    r.ticks(1000);
    expect(r.top()).toBe(56);
    expect(r.cover()).toBe(56);
    expect(r.attrs.has(DOCK)).toBe(true);
    // The heal used that drag up: a later finger with no touchstart seen is
    // a plain touch (finger down would open the bar if it were a drag).
    r.runtime.onTouchMove({ touches: [{ clientX: 0, clientY: 300 }], target: r.zone });
    r.runtime.onTouchMove({ touches: [{ clientX: 0, clientY: 350 }], target: r.zone });
    r.tick();
    expect(r.cover()).toBe(56);

    // A new touch ends that drag for good: a later finger with no touchstart
    // seen is a plain touch, and the bar does not follow it.
    const n = rig();
    n.touchStart(n.zone, [0, 100]);
    n.touchMove([0, 90]);
    n.tick();
    n.advance(10_000);
    n.ticks(400);
    n.touchEnd(); // that finger's own lift, after the guard: nothing to do
    n.touchStart(n.main, [0, 400]);
    n.touchEnd();
    n.ticks(1000);
    expect(n.cover()).toBe(56);
    n.runtime.onTouchMove({ touches: [{ clientX: 0, clientY: 300 }], target: n.zone });
    n.runtime.onTouchMove({ touches: [{ clientX: 0, clientY: 350 }], target: n.zone });
    n.tick();
    expect(n.cover()).toBe(56);
  });

  it("R29c: a touch that came down before the runtime started is a finger at its first move", () => {
    const r = rig();
    r.touchMove([0, 400]); // no touchstart was seen
    r.userScroll(20);
    r.ticks(2000);
    expect(r.writes).toHaveLength(0);
    expect(r.settles()).toBe(0);
    r.touchEnd();
    r.ticks(1000);
    expect(r.writes.length).toBeGreaterThan(0);

    // The healed finger has the 10s guard too: a lift lost after it still lands.
    const g = rig();
    g.touchMove([0, 400]);
    g.userScroll(20);
    g.ticks(2000);
    expect(g.writes).toHaveLength(0);
    g.advance(10_000);
    g.ticks(400);
    expect(g.writes.length).toBeGreaterThan(0);

    // A move with no touches, or after stop(), heals nothing.
    const s = rig();
    s.runtime.onTouchMove({ touches: [], target: s.main });
    s.userScroll(20);
    s.ticks(1000);
    expect(s.writes.length).toBeGreaterThan(0);
    const t = rig();
    t.userScroll(20);
    t.runtime.stop();
    t.touchMove([0, 400]);
    t.userScroll(30);
    t.touchEnd();
    t.ticks(1000);
    expect(t.vars.get(Y)).toBe("0px");
    expect(t.attrs.size).toBe(0);
    expect(t.writes).toHaveLength(0);
  });
});

describe("phone chrome runtime — pure helpers (v1.5)", () => {
  it("R28: the glide's whole-pixel ease, and the cover from a computed translate", () => {
    expect(housePhoneSheetGlideY(20, 56, 0)).toBe(20);
    const mid = housePhoneSheetGlideY(20, 56, 90);
    expect(Number.isInteger(mid)).toBe(true);
    expect(mid).toBeGreaterThan(20);
    expect(mid).toBeLessThan(56);
    expect(housePhoneSheetGlideY(20, 56, 180)).toBe(56);
    expect(housePhoneSheetGlideY(20, 56, 500)).toBe(56);
    expect(housePhoneSheetGlideY(56, 30, 16)).toBe(49);

    expect(housePhoneSheetCoverFromTranslate("0px -23.5px")).toBe(23.5);
    expect(housePhoneSheetCoverFromTranslate("0px")).toBe(0);
    expect(housePhoneSheetCoverFromTranslate("none")).toBe(0);
    expect(housePhoneSheetCoverFromTranslate("0px -56px 0px")).toBe(56);
    expect(housePhoneSheetCoverFromTranslate("0px 0px")).toBe(0);
    expect(housePhoneSheetCoverFromTranslate("junk")).toBeNull();
    expect(housePhoneSheetCoverFromTranslate(undefined)).toBeNull();
  });
});
