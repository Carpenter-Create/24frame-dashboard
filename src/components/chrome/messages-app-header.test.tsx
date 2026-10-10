import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/messages",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/app/(app)/aggregation/messages/ask-frame-ai-actions", () => ({
  startAskFrameAiConversation: vi.fn(),
  appendAskFrameAiTurn: vi.fn(),
  completeAskFrameAiTurn: vi.fn(),
  setAskFrameAiThumb: vi.fn(),
  renameAskFrameAiConversation: vi.fn(),
  pinAskFrameAiConversation: vi.fn(),
  deleteAskFrameAiConversation: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { AskAssistantChromeProvider } from "@/components/messages/ask-frame-ai-chrome";
import { MessagesAppHeader } from "./messages-app-header";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "messages-app-header.tsx"), "utf8");
const houseSheetSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../lib/house-sheet.ts"),
  "utf8",
);

const THREAD = "2f1c8b6a-4d3e-4a11-9c22-7b8e1d0a5f44";

function visible(html: string): string {
  return html.replaceAll("&#x27;", "'");
}

describe("MessagesAppHeader", () => {
  it("restores Search only on the Access gate, even with a thread query", () => {
    navigation.search = `thread=${THREAD}`;
    const html = renderToStaticMarkup(<MessagesAppHeader surface="access-gate" />);
    expect(html).toContain("data-header-search");
    expect(html).toContain(ASK_FRAME_AI.headerSearchPlaceholder);
    expect(html).toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain("data-header-thread");
    expect(html).not.toContain(ASK_FRAME_AI.threadTitle);
    expect(html).not.toContain(ASK_FRAME_AI.need);
    expect(html).not.toContain(ASK_FRAME_AI.historyLabel);
  });

  it("keeps the 7:73 landing header as spacer + avatar only", () => {
    navigation.search = "";
    const html = renderToStaticMarkup(<MessagesAppHeader surface="ask-frame-ai-landing" />);
    expect(html).toBe("");
    expect(html).not.toContain("data-header-search");
    expect(html).not.toContain("data-header-thread");
    expect(html).not.toContain("data-ask-frame-ai-download");
    expect(html).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(html).not.toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain(ASK_FRAME_AI.threadTitle);
  });

  it("shows back + the conversation title on the unlocked thread, with no Search", () => {
    navigation.search = `thread=${THREAD}`;
    const html = visible(
      renderToStaticMarkup(
        <AskAssistantChromeProvider
          initialChrome={{ id: THREAD, title: "What needs attention", pinned_at: null }}
        >
          <MessagesAppHeader surface="ask-frame-ai-landing" />
        </AskAssistantChromeProvider>,
      ),
    );
    expect(html).toContain("data-header-thread");
    expect(html).toContain("What needs attention");
    expect(html).toContain("data-ask-frame-ai-history-title");
    expect(html).toContain('href="?ai=1"');
    expect(html).not.toContain('href="/messages"');
    expect(html).toContain(ASK_FRAME_AI.backLabel);
    expect(html).toContain(ASK_FRAME_AI.downloadLabel);
    expect(html).toContain("data-ask-frame-ai-download");
    expect(html).toContain("data-ask-frame-ai-header-chrome");
    expect(html).toContain("data-ask-frame-ai-title-cluster");
    expect(html).toContain("flex-1");
    expect(html).toContain(ASK_FRAME_AI.moreLabel);
    const titleClusterStart = html.indexOf("data-ask-frame-ai-title-cluster");
    const chromeStart = html.indexOf("data-ask-frame-ai-header-chrome");
    const titleClusterHtml = html.slice(titleClusterStart, chromeStart);
    expect(titleClusterHtml).toContain("data-ask-frame-ai-history-title");
    expect(titleClusterHtml).not.toContain(ASK_FRAME_AI.moreLabel);
    expect(html.slice(chromeStart)).toContain(ASK_FRAME_AI.moreLabel);
    expect(html).toContain("t-heading");
    expect(html).not.toContain("t-title");
    expect(src).toContain("Download");
    expect(src).toContain("saveAskFrameAiDownload");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).toContain("AskFrameAiHistoryPopover");
    expect(src).toContain("CaretDown");
    expect(src).toContain("CaretUp");
    expect(html).toContain('aria-expanded="false"');
    expect(src).toContain("historyOpen ? (");
    expect(src).toContain("<CaretDown");
    expect(src).toContain("truncate t-heading text-ink max-md:hidden");
    expect(src).toContain(
      'className="flex min-w-0 flex-1 items-center gap-[var(--space-4)]"',
    );
    expect(src).toContain("flex shrink-0 items-center gap-[var(--space-4)]");
    expect(src).toContain('<DownloadSimple className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(src).toContain('<DotsThree className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(src).not.toContain("truncate t-body-sm text-ink");
    expect(src).not.toContain("size-5");
    expect(src).not.toContain("size-6");
    expect(html).not.toContain("data-ask-frame-ai-history-popover");
    expect(html).toContain(ASK_FRAME_AI.deleteTitle);
    expect(html).toContain(ASK_FRAME_AI.deleteBody);
    expect(html).toContain(ASK_FRAME_AI.deleteConfirm);
    expect(html).toContain(ASK_FRAME_AI.cancelLabel);
    expect(src).toContain("ASK_FRAME_AI.downloadPdfLabel");
    expect(src).toContain("ASK_FRAME_AI.renameLabel");
    expect(src).toContain("ASK_FRAME_AI.pinLabel");
    expect(src).toContain("ASK_FRAME_AI.deleteLabel");
    expect(src).not.toMatch(/Archive/);
    expect(html).not.toContain("data-header-search");
    expect(html).not.toContain(ASK_FRAME_AI.headerSearchHint);
    expect(html).not.toContain("SearchField");
    expect(html).not.toContain(ASK_FRAME_AI.threadTitle);
    expect(html).not.toContain("Winter Line");
    if (src.includes("data-ask-frame-ai-new")) {
      expect(html).toContain("data-ask-frame-ai-new");
      expect(html).toContain(ASK_FRAME_AI.newConversationLabel);
    }
  });

  it("locks delete confirm to one-line copy and thin danger text, not a filled accent", () => {
    navigation.search = `thread=${THREAD}`;
    const html = visible(
      renderToStaticMarkup(
        <AskAssistantChromeProvider
          initialChrome={{ id: THREAD, title: "What needs attention", pinned_at: null }}
        >
          <MessagesAppHeader surface="ask-frame-ai-landing" />
        </AskAssistantChromeProvider>,
      ),
    );
    const deleteDialog = src.slice(
      src.indexOf("open={deleteOpen}"),
      src.indexOf("function MessagesAppHeaderInner"),
    );
    const confirmHtml = html.slice(
      html.indexOf("data-ask-frame-ai-delete-confirm"),
      html.indexOf("</button>", html.indexOf("data-ask-frame-ai-delete-confirm")) + 9,
    );
    const cancelHtml = html.slice(
      html.indexOf("data-ask-frame-ai-delete-cancel"),
      html.indexOf("</button>", html.indexOf("data-ask-frame-ai-delete-cancel")) + 9,
    );
    // The open tag that carries an attribute: its class sits before the
    // attribute, so the slices above never see it.
    const tagOf = (needle: string) => {
      const at = html.indexOf(needle);
      expect(at, needle).toBeGreaterThan(-1);
      return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
    };

    expect(html).toContain(ASK_FRAME_AI.deleteTitle);
    expect(html).toContain(ASK_FRAME_AI.deleteBody);
    expect(html).toContain(ASK_FRAME_AI.deleteConfirm);
    expect(html).toContain(ASK_FRAME_AI.cancelLabel);
    expect(html).toContain('aria-label="Close"');
    expect(src).toContain('from "@/components/ui/dialog"');
    expect(deleteDialog).toContain("</Dialog>");
    expect(deleteDialog).toContain("title={ASK_FRAME_AI.deleteTitle}");
    expect(deleteDialog).toContain("ASK_FRAME_AI.deleteConfirm");
    expect(deleteDialog).toContain("ASK_FRAME_AI.cancelLabel");
    expect(deleteDialog).toContain("<Button");
    expect(deleteDialog).toContain("DialogFooter");
    expect(deleteDialog).toContain('variant="secondary"');
    expect(deleteDialog).toContain('variant="danger"');
    expect(deleteDialog).toContain("data-ask-frame-ai-delete-confirm");
    expect(deleteDialog).not.toContain("MENU_SURFACE_ITEM_CLASS");
    expect(deleteDialog).not.toContain("MENU_SURFACE_ITEM_DANGER_CLASS");
    expect(deleteDialog).not.toContain("bg-accent");
    expect(deleteDialog).not.toContain('variant="primary"');
    expect(confirmHtml).toContain(ASK_FRAME_AI.deleteConfirm);
    expect(tagOf("data-ask-frame-ai-delete-confirm")).toContain("text-danger");
    expect(confirmHtml).not.toContain("bg-accent");
    expect(confirmHtml).not.toContain("bg-primary");
    expect(cancelHtml).toContain(ASK_FRAME_AI.cancelLabel);
    expect(cancelHtml).not.toContain("bg-accent");
    expect(cancelHtml).not.toContain("bg-primary");
    expect(tagOf("data-ask-frame-ai-delete-cancel")).not.toContain("text-danger");
  });

  it("keeps desktop title on t-heading 17 and mobile 531:542 on t-body 15", () => {
    expect(src).toContain("truncate t-heading text-ink max-md:hidden");
    expect(src).toContain("truncate t-body text-ink md:hidden");
    expect(src).not.toContain("truncate t-body-sm text-ink");
    expect(src).not.toContain("t-title");
  });

  it("locks mobile 531:542 to thin ink and PDF inside the existing ···", () => {
    const shell = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "app-shell.tsx"),
      "utf8",
    );
    const lead = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "house-lead-chrome.tsx"),
      "utf8",
    );
    const leadLib = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../lib/house-lead-chrome.ts"),
      "utf8",
    );
    const landing = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../messages/ask-frame-ai-landing.tsx"),
      "utf8",
    );
    const titles = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../titles/titles-catalog.tsx"),
      "utf8",
    );

    expect(src).toContain(
      'className="flex min-w-0 flex-1 items-center gap-[var(--space-4)]"',
    );
    expect(src).toContain(
      'className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]"',
    );
    expect(src).toContain('data-ask-frame-ai-title-cluster=""');
    expect(src.indexOf("data-ask-frame-ai-title-cluster")).toBeLessThan(
      src.indexOf("data-ask-frame-ai-header-chrome"),
    );
    expect(src.indexOf("<DotsThree")).toBeGreaterThan(
      src.indexOf("data-ask-frame-ai-header-chrome"),
    );
    expect(src.indexOf("<DotsThree")).toBeGreaterThan(
      src.lastIndexOf("</AskFrameAiHistoryPopover>"),
    );
    expect(src).toContain('className="hidden size-4 shrink-0 items-center justify-center text-ink-3 md:flex"');
    expect(src).toContain('className="flex size-4 shrink-0 items-center justify-center text-ink-3"');
    expect(src).toContain('<CaretDown className="size-4 shrink-0 text-ink-3" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(src).toContain('<DotsThree className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(src).toContain("ASK_FRAME_AI.downloadPdfLabel");
    expect(src).toContain("<ThreadPopoverContent");
    expect(src).toContain("<ThreadPopoverItem");
    expect(src).toContain("<ThreadPopoverSeparator");
    expect(src).toContain("THREAD_POPOVER_ICON_CLASS");
    expect(src).toContain("THREAD_POPOVER_DELETE_ICON_CLASS");
    expect(houseSheetSrc).toContain("text-danger");
    expect(src).toContain("ASK_FRAME_AI.deleteBody");
    expect(src).not.toContain("MessagesThreadOverflow");
    expect(src).not.toContain("data-ask-frame-ai-mobile-overflow");
    expect(src).toContain("text-ink max-md:text-ink-3");
    expect(src).toContain("text-ink-3");
    expect(src).not.toContain("font-bold");
    expect(src).not.toContain("strokeWidth={2}");
    expect((src.match(/<DotsThree/g) ?? []).length).toBe(1);
    expect(shell).not.toContain("MessagesThreadOverflow");
    expect(lead).not.toContain('presentation="sheet" tone="pill"');
    expect(lead).toContain('presentation="slider"');
    expect(lead).toContain('presentation="waffle"');
    // H register: at least 24 between the slider and the trailing controls.
    expect(leadLib).toContain("justify-end gap-0 md:gap-[var(--space-6)]");
    expect(leadLib).toContain("HOUSE_LEAD_PHONE_PAD_CLASS");
    expect(leadLib).toContain("HOUSE_PHONE_TRAILING_GUTTER_CLASS");
    expect(leadLib).toContain("HOUSE_SHELL_GUTTER_X_CLASS");
    // One side-menu column on every workspace; the menu pads itself and
    // Settings keeps its own pad, in the scroll body between the brand
    // band and the collapse foot (H register).
    expect(shell).toContain("cn(HOUSE_RAIL_BODY_CLASS, settingsPage ? SETTINGS_RAIL_PAD_CLASS : undefined)");
    expect(shell).not.toContain('"gap-3 p-4"');
    expect(landing).not.toContain("MessagesThreadOverflow");
    expect(landing).not.toContain("data-ask-frame-ai-title-cluster");
    expect(titles).not.toContain("MessagesThreadOverflow");
    expect(titles).not.toContain("data-ask-frame-ai-title-cluster");
  });

  it("docks desktop download/··· 16 from the avatar; title stays left", () => {
    navigation.search = `thread=${THREAD}`;
    const html = visible(
      renderToStaticMarkup(
        <AskAssistantChromeProvider
          initialChrome={{ id: THREAD, title: "What needs attention", pinned_at: null }}
        >
          <MessagesAppHeader surface="ask-frame-ai-landing" />
        </AskAssistantChromeProvider>,
      ),
    );
    const shell = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "app-shell.tsx"),
      "utf8",
    );
    const lead = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "house-lead-chrome.tsx"),
      "utf8",
    );
    const userMenu = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "user-menu.tsx"),
      "utf8",
    );

    expect(src).toContain(
      'className="flex min-w-0 flex-1 items-center gap-[var(--space-4)]"',
    );
    expect(src).toContain(
      'className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]"',
    );
    expect(src).not.toContain(
      'className="flex min-w-0 items-center gap-[var(--space-4)] max-md:flex-1"',
    );
    expect(src).not.toContain(
      'className="flex min-w-0 items-center gap-[var(--space-2)] max-md:flex-1"',
    );
    expect(src).toContain("flex shrink-0 items-center gap-[var(--space-4)]");
    expect(html).toContain("data-ask-frame-ai-title-cluster");
    expect(html).toContain("data-ask-frame-ai-header-chrome");
    expect(html).toContain("data-ask-frame-ai-download");
    expect(html).toContain(ASK_FRAME_AI.moreLabel);
    const titleClusterStart = html.indexOf("data-ask-frame-ai-title-cluster");
    const chromeStart = html.indexOf("data-ask-frame-ai-header-chrome");
    expect(titleClusterStart).toBeGreaterThan(-1);
    expect(chromeStart).toBeGreaterThan(titleClusterStart);
    expect(html.slice(titleClusterStart, chromeStart)).toContain("data-ask-frame-ai-history-title");
    expect(src.indexOf("<CaretDown")).toBeGreaterThan(src.indexOf("data-ask-frame-ai-title-cluster"));
    expect(src.indexOf("<CaretDown")).toBeLessThan(src.indexOf("data-ask-frame-ai-header-chrome"));
    expect(html.slice(titleClusterStart, chromeStart)).not.toContain(ASK_FRAME_AI.downloadLabel);
    expect(html.slice(titleClusterStart, chromeStart)).not.toContain(ASK_FRAME_AI.moreLabel);
    expect(html.slice(chromeStart)).toContain(ASK_FRAME_AI.downloadLabel);
    expect(html.slice(chromeStart)).toContain(ASK_FRAME_AI.moreLabel);
    expect(html.slice(chromeStart).indexOf(ASK_FRAME_AI.downloadLabel)).toBeLessThan(
      html.slice(chromeStart).indexOf(ASK_FRAME_AI.moreLabel),
    );
    expect(src).toContain('className="hidden size-4 shrink-0 items-center justify-center text-ink-3 md:flex"');
    expect(src.indexOf("data-ask-frame-ai-download")).toBeLessThan(src.indexOf("<DotsThree"));
    expect(lead).toContain("HOUSE_LEAD_CHROME_CLASS");
    expect(lead).toContain("APP_HEADER_LEADING_CLASS");
    expect(lead).not.toContain('presentation="sheet" tone="pill"');
    expect(lead).toContain('presentation="slider"');
    expect(lead).toContain('presentation="waffle"');
    expect(shell.indexOf("<MessagesAppHeader")).toBeLessThan(shell.indexOf("<UserMenu"));
    expect(userMenu).not.toContain("data-ask-frame-ai-title-cluster");
    expect(userMenu).not.toContain("data-header-thread");
    expect(userMenu).not.toContain("data-ask-frame-ai-header-chrome");
  });

  it("instances the shared menu surface; items stay thread-only", () => {
    const houseSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "house.tsx"), "utf8");
    const surfaceSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "menu-surface.tsx"),
      "utf8",
    );
    const userMenu = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "user-menu.tsx"),
      "utf8",
    );

    expect(src).toContain("from \"./menu-surface\"");
    expect(src).toContain("<ThreadPopoverContent");
    expect(src).toContain("<ThreadPopoverItem");
    expect(src).toContain("<ThreadPopoverSeparator");
    expect(src).toContain("THREAD_POPOVER_ICON_CLASS");
    expect(src).toContain("THREAD_POPOVER_DELETE_ICON_CLASS");
    expect(src).toContain("ASK_FRAME_AI.downloadPdfLabel");
    expect(src).toContain("ASK_FRAME_AI.renameLabel");
    expect(src).toContain("ASK_FRAME_AI.pinLabel");
    expect(src).toContain("ASK_FRAME_AI.deleteLabel");
    expect(surfaceSrc).toContain("<MenuSurfaceContent data-thread-popover=\"\"");
    expect(surfaceSrc).toContain("<MenuSurfaceItem");
    expect(surfaceSrc).toContain("MENU_SURFACE_ITEM_CLASS");
    expect(surfaceSrc).toContain("danger && MENU_SURFACE_ITEM_DANGER_CLASS");
    expect(houseSrc).not.toContain("ThreadPopoverContent");
    expect(houseSrc).not.toContain("DropdownMenuPrimitive");
    expect(houseSheetSrc).not.toContain("THREAD_POPOVER_CONTENT_CLASS");
    expect(houseSheetSrc).not.toContain("THREAD_POPOVER_ITEM_CLASS");
    expect(houseSheetSrc).not.toContain("THREAD_POPOVER_DELETE_CLASS");
    expect(houseSheetSrc).not.toContain("min-w-[17.5rem]");
    expect(houseSheetSrc).toContain("text-danger");
    expect(src).not.toContain("min-w-[17.5rem]");
    expect(src).not.toContain("data-user-menu");
    expect(src).not.toContain("UserMenuIdentity");
    expect(src).not.toContain("USER_MENU.agreements");
    expect(src).not.toContain("USER_MENU.appearance");
    expect(src).not.toContain("USER_MENU.logOut");
    expect(src).not.toContain("Agreements");
    expect(src).not.toContain("Appearance");
    expect(src).not.toContain("Log out");
    expect(src).not.toContain("sideOffset={10}");
    expect(userMenu).toContain("DesktopAccountMenu");
    expect(userMenu).not.toContain("<MenuSurfaceContent");
    expect(userMenu).not.toContain("min-w-[17.5rem]");
    expect(userMenu).not.toContain("ThreadPopoverContent");
    expect(src).not.toContain("MenuSurfaceAccent");
    expect(src).not.toContain("data-menu-surface-accent");
    expect(surfaceSrc).toContain("{...props} accent={false}");
  });

  it("renders nothing for the staff inbox", () => {
    navigation.search = `thread=${THREAD}`;
    const html = renderToStaticMarkup(<MessagesAppHeader surface="staff-inbox" />);
    expect(html).toBe("");
  });
});
