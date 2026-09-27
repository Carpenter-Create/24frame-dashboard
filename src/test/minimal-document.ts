// Node Vitest has no DOM. This is enough for react-dom/client to commit a
// span or img and flush useEffect. Import this module before react-dom/client
// so that module captures document at init.
//
// Globals are installed at import and removed in afterAll. Vitest reuses the
// worker global, so leaving document/window set leaks into later files.

import { afterAll } from "vitest";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_NODE = 9;

class MiniNode {
  nodeType: number;
  parentNode: MiniNode | null = null;
  childNodes: MiniNode[] = [];
  ownerDocument: MiniDocument;
  nodeValue: string | null = null;

  constructor(nodeType: number, ownerDocument: MiniDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
  }

  get firstChild(): MiniNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): MiniNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  appendChild<T extends MiniNode>(child: T): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<T extends MiniNode>(child: T, ref: MiniNode | null): T {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    if (!ref) {
      this.childNodes.push(child);
      return child;
    }
    const index = this.childNodes.indexOf(ref);
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild<T extends MiniNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  contains(other: MiniNode | null): boolean {
    let current: MiniNode | null = other;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  get textContent(): string {
    if (this.nodeType === TEXT_NODE) return this.nodeValue ?? "";
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    this.childNodes = [];
    if (!value) return;
    const text = this.ownerDocument.createTextNode(value);
    text.parentNode = this;
    this.childNodes.push(text);
  }

  getRootNode(): MiniDocument {
    return this.ownerDocument;
  }

  private listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    return true;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }
}

class MiniElement extends MiniNode {
  override nodeType = ELEMENT_NODE;
  tagName: string;
  nodeName: string;
  namespaceURI = "http://www.w3.org/1999/xhtml";
  style: Record<string, string> = {};
  onclick: unknown = null;
  private attrs = new Map<string, string>();

  constructor(tag: string, ownerDocument: MiniDocument) {
    super(ELEMENT_NODE, ownerDocument);
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this.attrs.has(name) ? (this.attrs.get(name) ?? null) : null;
  }

  removeAttribute(name: string) {
    this.attrs.delete(name);
  }

  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }

  setAttributeNS(_namespace: string, name: string, value: string) {
    this.setAttribute(name, value);
  }

  querySelector(): null {
    return null;
  }

  attributeEntries(): [string, string][] {
    return [...this.attrs.entries()];
  }
}

class MiniText extends MiniNode {
  override nodeType = TEXT_NODE;
  nodeName = "#text";

  constructor(value: string, ownerDocument: MiniDocument) {
    super(TEXT_NODE, ownerDocument);
    this.nodeValue = value;
  }
}

class MiniDocument extends MiniNode {
  override nodeType = DOCUMENT_NODE;
  nodeName = "#document";
  documentElement: MiniElement;
  head: MiniElement;
  body: MiniElement;

  constructor() {
    super(DOCUMENT_NODE, undefined as unknown as MiniDocument);
    this.ownerDocument = this;
    this.documentElement = new MiniElement("html", this);
    this.head = new MiniElement("head", this);
    this.body = new MiniElement("body", this);
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  createElement(tag: string): MiniElement {
    return new MiniElement(tag, this);
  }

  createElementNS(_namespace: string, tag: string): MiniElement {
    return this.createElement(tag);
  }

  createTextNode(text: string): MiniText {
    return new MiniText(text, this);
  }

  querySelector(): null {
    return null;
  }
}

class HTMLIFrameElementStub {}

const documentHost = new MiniDocument();

const globals = globalThis as unknown as {
  document: MiniDocument;
  window: typeof globalThis;
  HTMLIFrameElement: typeof HTMLIFrameElementStub;
  IS_REACT_ACT_ENVIRONMENT: boolean;
};
export function installMinimalDocument() {
  globals.document = documentHost;
  globals.window = globalThis;
  globals.HTMLIFrameElement = HTMLIFrameElementStub;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
}

export function uninstallMinimalDocument() {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement;
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT;
}

installMinimalDocument();
afterAll(() => {
  uninstallMinimalDocument();
});

export function minimalDocument(): MiniDocument {
  return documentHost;
}

export function serializeElement(node: MiniNode): string {
  if (node.nodeType === TEXT_NODE) return node.nodeValue ?? "";
  if (!(node instanceof MiniElement)) {
    return node.childNodes.map((child) => serializeElement(child)).join("");
  }
  const attrs = node
    .attributeEntries()
    .map(([name, value]) => (value === "" ? `${name}=""` : `${name}="${value}"`))
    .join(" ");
  const children = node.childNodes.map((child) => serializeElement(child)).join("");
  const tag = node.tagName.toLowerCase();
  return `<${tag}${attrs ? ` ${attrs}` : ""}>${children}</${tag}>`;
}
