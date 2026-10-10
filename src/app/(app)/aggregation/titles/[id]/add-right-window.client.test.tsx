import "@/test/minimal-document";

import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HouseWindowOptions } from "@/components/chrome/house-window";
import { minimalDocument, serializeElement } from "@/test/minimal-document";
import type { AddRightResult } from "./actions";

// The Add right window mounted with a fake addRights: what Done does once
// the server answers (docs/design-locks/aggregation-add-right-window-lock-v1.md
// §3). The shell is a stub that hands the test its Done (as the header or
// ⌘/Ctrl+Enter would) and its close; the shell has its own tests.

const shell = vi.hoisted(() => ({ options: null as HouseWindowOptions | null }));
type AddRights = (input: unknown) => Promise<AddRightResult>;
const server = vi.hoisted(() => ({ addRights: null as unknown as AddRights }));

vi.mock("./actions", () => ({ addRights: (input: unknown) => server.addRights(input) }));

vi.mock("@/components/chrome/house-window", async (importActual) => {
  const { createElement } = await import("react");
  return {
    ...(await importActual<typeof import("@/components/chrome/house-window")>()),
    useHouseWindow: (options: HouseWindowOptions) => {
      shell.options = options;
      return [
        { askTitleId: "ask", keepEditing: () => undefined, discard: () => undefined },
        { frameRef: { current: null }, bodyRef: { current: null } },
      ];
    },
    HouseWindowFrame: ({ title, children }: { title: string; children: ReactNode }) =>
      createElement("section", { "data-stub-frame": "", "data-title": title }, children),
    HouseWindowAsk: () => null,
  };
});

vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => true,
}));

import { AddRightWindow } from "./add-right-window";

const TITLE = "22222222-2222-4222-8222-222222222222";
const ON_TITLE = "SVOD · Non-exclusive · Worldwide is already on this title.";

type MiniNode = {
  nodeType: number;
  childNodes: MiniNode[];
  getAttribute?(name: string): string | null;
};

const miniDocument = minimalDocument();
let container: ReturnType<typeof miniDocument.createElement>;
let root: Root;

function html(): string {
  return serializeElement(container);
}

function find(test: (node: MiniNode) => boolean): MiniNode[] {
  const out: MiniNode[] = [];
  const walk = (node: MiniNode) => {
    if (node.nodeType === 1 && test(node)) out.push(node);
    node.childNodes.forEach(walk);
  };
  walk(container as unknown as MiniNode);
  return out;
}

/** The face on screen: the stub frame's title (the window's own face names). */
function title(): string | null {
  return find((node) => node.getAttribute?.("data-stub-frame") !== null)[0]?.getAttribute?.("data-title") ?? null;
}

// A radio's choice: its own onChange, as React gives it. (React turns a
// radio's click into onChange only on a real input with a `type` property,
// which the minimal document has not.)
function choose(radio: MiniNode) {
  const key = Object.keys(radio).find((name) => name.startsWith("__reactProps$"));
  const props = (radio as unknown as Record<string, { onChange?: () => void }>)[key!];
  act(() => props!.onChange!());
}

// React listens at its root: a click there with the node as target runs its
// onClick.
function click(target: MiniNode) {
  const event = {
    type: "click",
    target,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    timeStamp: 0,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {},
  };
  act(() => {
    container.dispatchEvent(event as unknown as Event);
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Done, as the header or ⌘/Ctrl+Enter gives it. */
async function done() {
  act(() => shell.options!.onDone());
  await settle();
}

function mount(answer: AddRights) {
  const addRights = vi.fn(answer);
  server.addRights = addRights;
  const onClose = vi.fn();
  act(() =>
    root.render(
      createElement(AddRightWindow, { titleId: TITLE, initialFace: "index", requestRef: { current: null }, onClose }),
    ),
  );
  return { addRights, onClose };
}

/** Empty draft → Rights type (SVOD) → Exclusivity (Non-exclusive) → the
 *  index review: Done checks in face order and sends nothing on the way. */
async function walkToReview(addRights: ReturnType<typeof vi.fn<AddRights>>) {
  await done();
  expect(title()).toBe("Rights type");
  expect(html()).toContain("Select a rights type.");
  click(find((node) => node.getAttribute?.("data-house-page-select-option") === "svod")[0]!);

  await done();
  // Worldwide passes; Exclusivity has nothing chosen.
  expect(title()).toBe("Exclusivity");
  expect(html()).toContain("Choose exclusive or non-exclusive.");
  // React sets an input's value as a property.
  choose(find((node) => (node as unknown as { value?: string }).value === "non_exclusive")[0]!);

  // A complete draft on a face returns to the index: nothing is sent.
  await done();
  expect(title()).toBe("Add right");
  expect(addRights).not.toHaveBeenCalled();
}

beforeEach(() => {
  shell.options = null;
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Add right Done (mounted, fake addRights)", () => {
  it("adds only from the index, sends one grant with no org, and closes with a refresh", async () => {
    const { addRights, onClose } = mount(async () => ({ ok: true }));
    await walkToReview(addRights);

    await done();
    expect(addRights).toHaveBeenCalledTimes(1);
    expect(addRights.mock.calls[0]![0]).toEqual({
      titleId: TITLE,
      rightsType: "svod",
      mode: "world",
      countryCodes: [],
      exclusive: false,
    });
    // The page behind takes the new row once Back lands there.
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("waits for the server: busy and held open, and a second Done sends nothing", async () => {
    let answer: (result: AddRightResult) => void = () => undefined;
    const { addRights, onClose } = mount(
      () =>
        new Promise<AddRightResult>((resolve) => {
          answer = resolve;
        }),
    );
    await walkToReview(addRights);

    await done();
    expect(shell.options!.busy).toBe(true);
    expect(shell.options!.holdOpen).toBe(true);
    await done();
    expect(addRights).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => answer({ ok: true }));
    await settle();
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("the same grant already on the title: stays open on the index with the line, and closing refreshes", async () => {
    const { addRights, onClose } = mount(async () => ({ ok: false, face: "index", error: ON_TITLE, onTitle: true }));
    await walkToReview(addRights);

    await done();
    expect(addRights).toHaveBeenCalledTimes(1);
    expect(title()).toBe("Add right");
    expect(html()).toContain(ON_TITLE);
    expect(shell.options!.busy).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    act(() => shell.options!.onClose());
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("a request that fails outright says Could not save., never waits, and closing refreshes", async () => {
    const { addRights, onClose } = mount(async () => {
      throw new Error("network");
    });
    await walkToReview(addRights);

    await done();
    expect(addRights).toHaveBeenCalledTimes(1);
    expect(title()).toBe("Add right");
    expect(html()).toContain("Could not save.");
    expect(shell.options!.busy).toBe(false);
    expect(shell.options!.holdOpen).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    // What the server kept is unknown: the page refreshes on close.
    act(() => shell.options!.onClose());
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("a refusal at a face goes to that face with its line; nothing was kept, so no refresh", async () => {
    const { addRights, onClose } = mount(async () => ({
      ok: false,
      face: "territory",
      error: "Could not save.",
      onTitle: false,
    }));
    await walkToReview(addRights);

    await done();
    expect(title()).toBe("Territory");
    expect(html()).toContain("Could not save.");
    act(() => shell.options!.onClose());
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
