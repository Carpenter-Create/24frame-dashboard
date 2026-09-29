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

import { SocialHomeComposer } from "./social-home-composer";
import { SocialWriteComposeSheet } from "./social-write-compose-sheet";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_WRITE_COMPOSE_SHEET_HOST_CLASS } from "@/lib/social-write-compose-sheet";

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
    expect(html).toContain("Share something");
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
    expect(sheetSrc).toContain('presentation="sheet"');
    expect(sheetSrc).toContain("onDismiss={onClose}");
    expect(sheetSrc).not.toContain("SocialCreateSheet");
    expect(sheetSrc).not.toContain("backdrop-blur");
    expect(sheetSrc).not.toContain("shadow-[");
    expect(navSrc).toContain("SocialCreateSheet");
    expect(navSrc).toContain('data-social-create-sheet="dest"');
  });
});
