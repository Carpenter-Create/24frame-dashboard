import { minimalDocument } from "@/test/minimal-document";

import { act, createRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A post's ⋯, mounted with its hook stubbed
// (docs/design-locks/social-post-owner-menu-lock-v1.md §3, §6): what each
// way out of the confirm runs, on both widths. The confirm's scrim runs the
// hook's guarded dismissFromScrim (no close in the first 500 ms), never the
// plain dismiss, so a double-click on the popover's Remove cannot open the
// confirm and close it at once. The minimal document has no focus, so this
// file gives its element one (the ask focuses Keep when it appears).

const hook = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("@/components/social/use-social-post-owner", () => ({
  useSocialPostOwner: () => hook.value,
}));
// Radix's menu is not under test here: the popover stays closed.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/chrome/menu-surface", () => ({
  ThreadPopoverContent: () => null,
  ThreadPopoverItem: () => null,
}));

import { SOCIAL } from "@/lib/social";
import { SocialPostOwnerMenu } from "./social-post-owner";

type MiniNode = {
  nodeType: number;
  tagName?: string;
  childNodes: MiniNode[];
  getAttribute?(name: string): string | null;
  hasAttribute?(name: string): boolean;
};

const miniDocument = minimalDocument() as unknown as MiniNode & {
  body: MiniNode & { appendChild(node: unknown): unknown };
  createElement(tag: string): MiniNode & { remove(): void };
};
const elementProto = Object.getPrototypeOf(miniDocument.createElement("div")) as { focus?: () => void };

let container: MiniNode & { remove(): void };
let root: Root;
let handlers: {
  dismiss: ReturnType<typeof vi.fn>;
  dismissFromScrim: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function draw(host: "sheet" | "dialog") {
  hook.value = {
    state: { step: "confirm", surface: null, pending: false, error: "" },
    host,
    canEdit: true,
    surfaceRef: createRef<HTMLDivElement>(),
    panelRef: createRef<HTMLDivElement>(),
    phoneTriggerRef: createRef<HTMLButtonElement>(),
    desktopTriggerRef: createRef<HTMLButtonElement>(),
    openSheet: vi.fn(),
    onPopoverOpenChange: vi.fn(),
    chooseEdit: vi.fn(),
    chooseRemove: vi.fn(),
    dismiss: handlers.dismiss,
    dismissFromScrim: handlers.dismissFromScrim,
    remove: handlers.remove,
    onDesktopCloseAutoFocus: vi.fn(),
  };
  act(() =>
    root.render(
      <SocialPostOwnerMenu
        postId="p1"
        serverBody="words"
        hasMedia={false}
        media={[]}
        authorName="Ada"
        authorPhotoUrl={null}
        groupSlug={null}
      />,
    ),
  );
}

/** Every element under the body (the confirm is portalled there). */
function elements(): MiniNode[] {
  const found: MiniNode[] = [];
  const stack: MiniNode[] = [miniDocument.body];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeType === 1) found.push(node);
    stack.push(...node.childNodes);
  }
  return found;
}

/** The confirm's one scrim: the house scrim button. */
function scrim(): MiniNode {
  const scrims = elements().filter(
    (node) => node.tagName === "BUTTON" && (node.getAttribute?.("class") ?? "").split(" ").includes("app-sheet-scrim-fade"),
  );
  expect(scrims).toHaveLength(1);
  return scrims[0]!;
}

function byAttr(attr: string): MiniNode {
  const node = elements().find((element) => element.hasAttribute?.(attr));
  expect(node, attr).toBeTruthy();
  return node!;
}

/** The node's own onClick, as React holds it. */
function press(node: MiniNode) {
  const key = Object.keys(node).find((name) => name.startsWith("__reactProps$"));
  const props = (node as unknown as Record<string, { onClick?: () => void }>)[key!];
  act(() => props!.onClick!());
}

beforeEach(() => {
  elementProto.focus = () => undefined;
  handlers = { dismiss: vi.fn(), dismissFromScrim: vi.fn(), remove: vi.fn(async () => undefined) };
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete elementProto.focus;
  hook.value = null;
});

describe("the Remove confirm's ways out", () => {
  for (const host of ["sheet", "dialog"] as const) {
    const width = host === "sheet" ? "phone (the AppSheet card)" : "desktop (HouseDialog's 400)";

    it(`${width}: the scrim is Keep and runs the guarded dismissFromScrim, never the plain dismiss`, () => {
      draw(host);
      const button = scrim();
      expect(button.getAttribute?.("aria-label")).toBe(SOCIAL.post.deleteKeep);
      press(button);
      expect(handlers.dismissFromScrim).toHaveBeenCalledTimes(1);
      expect(handlers.dismiss).not.toHaveBeenCalled();
      expect(handlers.remove).not.toHaveBeenCalled();
    });

    it(`${width}: Keep runs dismiss and Remove runs remove`, () => {
      draw(host);
      press(byAttr("data-social-post-remove-keep"));
      expect(handlers.dismiss).toHaveBeenCalledTimes(1);
      expect(handlers.remove).not.toHaveBeenCalled();
      press(byAttr("data-social-post-remove-discard"));
      expect(handlers.remove).toHaveBeenCalledTimes(1);
      expect(handlers.dismissFromScrim).not.toHaveBeenCalled();
    });
  }
});
