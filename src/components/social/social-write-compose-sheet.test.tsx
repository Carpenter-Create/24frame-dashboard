import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialCreateCompose } from "./social-create-compose";
import { SocialHomeComposer } from "./social-home-composer";
import { SocialWriteComposeSheet } from "./social-write-compose-sheet";
import { SOCIAL } from "@/lib/social";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "@/lib/house-lead-chrome";
import { SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_ICON_SIZE_HEADER } from "@/lib/social-icons";
import {
  SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS,
  SOCIAL_WRITE_COMPOSE_DIALOG_TOOLS_CLASS,
  SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS,
} from "@/lib/social-write-compose-sheet";

const composerSrc = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
const sheetSrc = readFileSync("src/components/social/social-write-compose-sheet.tsx", "utf8");
const navSrc = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");

describe("Share something write compose sheet", () => {
  it("opens kind=text write compose in the phone AppSheet and does not mount the create page", () => {
    const html = renderToStaticMarkup(
      createElement(SocialWriteComposeSheet, {
        open: true,
        onClose: () => undefined,
        titleId: "write-compose-title",
        authorName: "Ada Lovelace",
        authorHandle: "ada",
      }),
    );
    expect(html).toContain('data-social-write-compose-sheet=""');
    expect(html).toContain('data-house-overlay-host="app-sheet"');
    expect(html).toContain('data-social-write-compose-sheet-presentation="responsive"');
    expect(html).toContain('data-social-create-kind="text"');
    expect(html).toContain('data-social-write-compose-presentation="sheet"');
    expect(html).toContain('data-social-create-attach="library"');
    expect(html).toContain('data-social-create-dismiss=""');
    expect(html).toContain("app-sheet-rise");
    expect(html).toContain("rounded-t-[16px]");
    expect(html).toContain("max-h-[90vh]");
    expect(html).toContain("h-[90vh]");
    expect(html).toContain("shadow-none");
    expect(html).toContain("bg-ink/40");
    expect(html).toContain(SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS);
    expect(SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS).toContain("md:hidden");
    expect(SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS).toContain("justify-end");
    expect(html).toContain(`id="write-compose-title"`);
    expect(html).toContain(SOCIAL.create.title);
    expect(html).toContain("autofocus");
    expect(html).not.toContain('data-social-create=""');
    expect(html).not.toContain("data-social-create-tiles");
    expect(html).not.toContain("data-social-create-sheet");
    expect(html).not.toContain("h-dvh max-h-dvh");
    expect(html).not.toContain("backdrop-blur");
    expect(html).not.toContain("truncate");
    const formAt = html.indexOf('data-social-create-form=""');
    expect(formAt).toBeGreaterThan(html.indexOf('data-house-overlay-host="app-sheet"'));
    expect(html.slice(formAt, formAt + 400)).not.toContain("h-dvh");
  });

  it("keeps the Home prompt a sheet trigger and leaves Photo, Camera, and Create + alone", () => {
    const html = renderToStaticMarkup(
      createElement(SocialHomeComposer, { authorName: "Ada Lovelace", authorHandle: "ada" }),
    );
    expect(html).toContain("data-social-composer-prompt-row");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(SOCIAL.home.composerPromptNamed);
    expect(html).not.toContain('href="/social/create?kind=text"');
    expect(html).not.toContain("data-social-write-compose-sheet");
    expect(html).not.toContain("data-social-create-form");
    expect(html).toContain('data-social-composer-affordance="photo"');
    expect(html).toContain('data-social-composer-affordance="camera"');
    expect(composerSrc).toContain("setWriteOpen(true)");
    expect(composerSrc).toContain("SocialWriteComposeSheet");
    expect(composerSrc).not.toContain("socialCreateHref");
    expect(composerSrc).not.toContain("SocialCreateSheet");
    expect(composerSrc).not.toContain('data-social-create-sheet="composer"');
    expect(sheetSrc).toContain("HouseDialogFrame");
    expect(sheetSrc).toContain('data-house-overlay-host="app-sheet"');
    expect(sheetSrc).toContain("useHouseDesktop");
    expect(sheetSrc).toContain("Escape");
    expect(sheetSrc).toContain("HouseScrim");
    expect(sheetSrc).toContain('presentation={desktop ? "dialog" : "sheet"}');
    expect(sheetSrc).toContain("panelClassName={SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS}");
    expect(sheetSrc).toContain("onDismiss={onClose}");
    expect(sheetSrc).not.toContain("SocialCreateSheet");
    expect(sheetSrc).not.toContain("backdrop-blur");
    expect(sheetSrc).not.toContain("shadow-[");
    expect(navSrc).toContain("SocialCreateFan");
    expect(navSrc).toContain('data-social-create-fan-trigger=""');
    expect(navSrc).not.toContain("SocialCreateSheet");
    expect(navSrc).not.toContain('data-social-create-sheet="dest"');
  });
});

// docs/design-locks/social-desktop-create-composer-lock-v1.md (Adam 2026-10-08).
describe("Desktop composer window", () => {
  const html = renderToStaticMarkup(
    createElement(SocialCreateCompose, {
      authorName: "Ada Lovelace",
      initialKind: "text",
      presentation: "dialog",
      onDismiss: () => undefined,
    }),
  );
  const at = (needle: string) => html.indexOf(needle);

  it("reads top to bottom: close, the avatar beside the field, then the tool row", () => {
    expect(html).toContain('data-social-write-compose-presentation="dialog"');
    expect(at('data-social-create-dismiss=""')).toBeGreaterThan(-1);
    expect(at('data-social-create-dismiss=""')).toBeLessThan(at('data-social-create-author=""'));
    const fieldAt = at("data-social-write-compose-field");
    expect(at('data-social-create-author=""')).toBeLessThan(fieldAt);
    expect(fieldAt).toBeLessThan(at("data-social-write-compose-tools"));
    const field = html.slice(html.lastIndexOf("<textarea", fieldAt), html.indexOf(">", fieldAt));
    // Its own id: the window can open over the Create page's field.
    expect(field).not.toContain('id="social-create-body"');
    const fieldId = field.match(/ id="([^"]+)"/)?.[1];
    expect(fieldId).toBeTruthy();
    expect(html).toContain(`for="${fieldId}"`);
    for (const token of SOCIAL_WRITE_COMPOSE_DIALOG_FIELD_CLASS.split(" ")) expect(field).toContain(token);
    expect(html).toContain(`placeholder="${SOCIAL.home.composerPrompt}"`);
    // The phone sheet's top bar and bottom field are not in the window.
    expect(html).not.toContain("data-social-write-compose-row");
    expect(html).not.toContain("data-social-write-stage");
  });

  it("puts Media and Go live in the tool row as round grey 44s, and Post at its end", () => {
    const tools = html.slice(at("data-social-write-compose-tools"));
    expect(html).toContain(`class="${SOCIAL_WRITE_COMPOSE_DIALOG_TOOLS_CLASS}"`);
    expect(tools.indexOf('data-social-create-attach="library"')).toBeLessThan(tools.indexOf("data-social-create-live"));
    expect(tools.indexOf("data-social-create-live")).toBeLessThan(tools.indexOf('type="submit"'));
    expect(tools).toContain(`aria-label="${SOCIAL.home.attach}"`);
    expect(tools).toContain(`href="${SOCIAL_ROUTES.createLive}"`);
    expect(tools).toContain(`aria-label="${SOCIAL.create.goLive}"`);
    expect(tools).toContain('data-social-icon="image"');
    expect(tools).toContain('data-social-icon="broadcast"');
    expect(tools.match(new RegExp(`class="${HOUSE_HEADER_ROUND_BUTTON_CLASS.replace(/[[\]().*+?^$|]/g, "\\$&")}"`, "g"))).toHaveLength(2);
    expect(tools.match(new RegExp(`width="${SOCIAL_ICON_SIZE_HEADER}"`, "g"))).toHaveLength(2);
    const post = tools.slice(tools.lastIndexOf("<button", tools.indexOf('type="submit"')), tools.indexOf("</button>", tools.indexOf('type="submit"')));
    // Post stays live while empty, like the sheet (disabled only mid-upload).
    expect(post).not.toMatch(/\sdisabled(=""|\s|>)/);
    expect(post).toContain(SOCIAL.home.submit);
  });

  it("remembers where Go live was opened from, then closes the window", () => {
    const composeSrc = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const liveAt = composeSrc.indexOf("data-social-create-live");
    const live = composeSrc.slice(composeSrc.lastIndexOf("<HouseLink", liveAt), composeSrc.indexOf("</HouseLink>", liveAt));
    expect(live).toContain("href={SOCIAL_ROUTES.createLive}");
    expect(live.indexOf("rememberSocialGoLiveOpener(")).toBeGreaterThan(-1);
    expect(live.indexOf("rememberSocialGoLiveOpener(")).toBeLessThan(live.indexOf("onDismiss?.()"));
  });

  it("hugs its content: only the full page pins the form to the viewport", () => {
    const composeSrc = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const pin = composeSrc.indexOf("bindSocialWriteComposeViewport(form");
    const effect = composeSrc.slice(composeSrc.lastIndexOf("useEffect(", pin), pin);
    expect(effect).toContain('if (presentation !== "page") return undefined;');
  });

  it("is the house dialog at the card grammar: 600, radius 24, no edge", () => {
    expect(SOCIAL_WRITE_COMPOSE_DIALOG_PANEL_CLASS).toBe(
      "w-[min(92vw,600px)] rounded-[var(--radius-xl)] border-0 p-[var(--space-4)]",
    );
  });

  // The side menu is a Suspense fallback until the chrome resolves, then it
  // is swapped for the resolved one: a window inside it would lose a draft.
  it("is owned by the shell, above the side menu's swap; the Create row only asks it to open", () => {
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const nav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    expect(shell).toContain("<SocialWriteComposeSheet");
    expect(shell).toContain("compose={{ open: createOpen, onOpen: openCreate, controls: createTitleId }}");
    const slot = shell.slice(shell.indexOf("function SideNavSlot("));
    expect(slot).not.toContain("SocialWriteComposeSheet");
    expect(slot).not.toContain("useState");
    expect(nav).not.toContain("SocialWriteComposeSheet");
    expect(nav).toContain("onClick={compose?.onOpen}");
  });
});
