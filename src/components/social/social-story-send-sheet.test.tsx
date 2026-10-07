import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

import { SOCIAL } from "@/lib/social";
import { SocialStorySendSheet } from "./social-story-send-sheet";
import { SocialStorySentToast } from "./social-story-sent-toast";
import { HOUSE_PHONE_WRAP_CLASS, housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { ASSISTANT_NAME } from "@/lib/product";
import {
  SOCIAL_PERSON_NAME_CLASS,
  SOCIAL_STORY_SEND_CELL_NAME_CLASS,
  SOCIAL_STORY_SEND_HANDLE_CLASS,
  SOCIAL_STORY_SEND_NAME_CLASS,
} from "@/lib/social-chrome";

const person = {
  id: "u2",
  name: "Ada Lovelace",
  handle: "ada",
  photoUrl: null,
};

const self = {
  id: "u1",
  name: "Grace Hopper",
  handle: "grace",
  photoUrl: null,
};

describe("SocialStorySendSheet", () => {
  it("opens one dark drawer with a 3-column grid, self, and the group affordance", () => {
    const src = readFileSync("src/components/social/social-story-send-sheet.tsx", "utf8");
    const html = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: true,
        onClose: () => undefined,
        directory: [self, person],
      }),
    );
    expect(html).toContain('data-social-story-send-host="ig-drawer"');
    expect(html).toContain("z-[60]");
    expect(html).toContain("items-end");
    expect(html).not.toContain("md:items-center");
    expect(html).toContain("bg-[#181818]");
    expect(html).toContain("rounded-t-[16px]");
    expect(html).toContain("h-[70vh]");
    expect(html).toContain("max-h-[90vh]");
    expect(html).toContain("shadow-none");
    expect(html).toContain("bg-ink/40");
    expect(html).toContain("data-social-story-send-grab");
    expect(html).toContain("h-10");
    expect(html).toContain("rounded-[20px]");
    expect(html).toContain("bg-[#2A2A2E]");
    expect(html).toContain(SOCIAL.stories.search);
    expect(html).toContain("data-social-story-send-group");
    expect(html).toContain("grid-cols-3");
    expect(html).toContain("gap-4");
    expect(html).toContain("size-14");
    expect(html).toContain('data-social-story-send-cell="u1"');
    expect(html).toContain('data-social-story-send-cell="u2"');
    const ai = html.indexOf('data-social-story-send-cell="24frame-ai"');
    const firstHuman = html.indexOf('data-social-story-send-cell="u1"');
    expect(ai).toBeGreaterThan(-1);
    expect(ai).toBeLessThan(firstHuman);
    expect(html).toContain('href="/social/dms/24frame-ai?story=s1"');
    expect(html).not.toContain("?ai=1");
    expect(html).toContain("data-social-frame-ai");
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain(ASSISTANT_NAME);
    expect(src).not.toContain("router");
    // Names under the faces wrap; none is cut to one line (house gospel
    // 2026-09-19 over the craft lock's old 1-line rule).
    expect(housePhoneForbidsTruncate(html)).toBe(true);
    expect(html).toContain(`class="${SOCIAL_STORY_SEND_CELL_NAME_CLASS}">${person.name}<`);
    expect(html).toContain(`class="${SOCIAL_STORY_SEND_CELL_NAME_CLASS}">${ASSISTANT_NAME}<`);
    expect(html).toContain('data-social-story-send-footer="closed"');
    expect(html).toContain("duration-200");
    expect(html).toMatch(/data-social-story-send-submit=""\s+disabled/);
    expect(src).toContain("storySendUiAfter");
    expect(src).toContain("if (outcome.close)");
    expect(src).toContain("onClose()");
    expect(src).not.toContain("document.body.style.overflow");
    expect(src).toContain("holdSheetFieldViewport");
    expect(src).toContain("window.scrollTo");
    expect(src).toContain('event.key === "Enter"');
    expect(src).toContain('variant="bare"');
    expect(src).not.toContain("fontSize: 16");
    expect(src).not.toContain("<input");
    expect(src).toContain('selected ? "min-h-0" : "min-h-0 overflow-hidden"');
    expect(src).not.toContain("router");
    expect(src).not.toContain("HouseDialogFrame");
    expect(src).not.toContain("AppSheet");
    expect(src).not.toMatch(/Copy link|Add to story|Facebook|share-network|type="checkbox"/);
  });

  it("morphs the same drawer when someone is selected, including a searched self", () => {
    const html = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: true,
        onClose: () => undefined,
        directory: [self, person],
        initialQuery: "grace",
        initialSelectedId: "u1",
      }),
    );
    expect(html).toContain('data-social-story-send-result="u1"');
    expect(html).toContain("@grace");
    expect(html).toContain("size-10");
    expect(html).toContain(SOCIAL.stories.cancel);
    expect(html).not.toContain("data-social-story-send-group");
    expect(html).not.toContain("data-social-story-send-grid");
    expect(html).toContain("data-social-story-send-check");
    expect(html).toContain("bg-[#1769FF]");
    expect(html).toContain("size-5");
    expect(html).toContain('data-social-story-send-footer="open"');
    expect(html).toContain(SOCIAL.stories.writeMessage);
    expect(html).toContain("rounded-[24px]");
    expect(html).toContain("h-12");
    expect(html).toContain(SOCIAL.stories.sendCta);
    expect(html).not.toMatch(/data-social-story-send-submit=""\s+disabled/);
    expect(html).toContain('data-social-story-send-note=""');
    expect(html).not.toContain("HouseDialog");
  });

  // House SoT auditor 2026-10-05, P0: on phone a person's name never
  // truncates. Every name and handle in the sheet is the house person
  // name (the phone wrap) with the sheet's type and white ink.
  it("wraps every name and handle, in the grid and in the search list", () => {
    // The house person name is the house phone wrap, nothing more.
    expect(SOCIAL_PERSON_NAME_CLASS).toBe(`block ${HOUSE_PHONE_WRAP_CLASS}`);
    expect(SOCIAL_STORY_SEND_CELL_NAME_CLASS).toBe(
      `${SOCIAL_PERSON_NAME_CLASS} w-full text-center t-body-sm text-white`,
    );
    expect(SOCIAL_STORY_SEND_NAME_CLASS).toBe(`${SOCIAL_PERSON_NAME_CLASS} t-body font-medium text-white`);
    expect(SOCIAL_STORY_SEND_HANDLE_CLASS).toBe(`${SOCIAL_PERSON_NAME_CLASS} t-body-sm text-white/60`);
    const long = {
      id: "u9",
      name: "Maximilian Alexander Featherstonehaugh-Smythe",
      handle: "maximilianalexanderfeatherstonehaugh",
      photoUrl: null,
    };
    const searched = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: true,
        onClose: () => undefined,
        directory: [self, long],
        initialQuery: "max",
      }),
    );
    expect(searched).toContain(`data-social-story-send-result="${long.id}"`);
    expect(searched).toContain(`class="${SOCIAL_STORY_SEND_NAME_CLASS}">${long.name}<`);
    expect(searched).toContain(`class="${SOCIAL_STORY_SEND_HANDLE_CLASS}">@${long.handle}<`);
    expect(housePhoneForbidsTruncate(searched)).toBe(true);
    const src = readFileSync("src/components/social/social-story-send-sheet.tsx", "utf8");
    expect(housePhoneForbidsTruncate(src)).toBe(true);
    // The 24Frame AI cell and row take the same constants (no hand-typed copy).
    expect(src).not.toMatch(/labelClassName="/);
    expect(src).toContain("labelClassName={SOCIAL_STORY_SEND_NAME_CLASS}");
    expect(src).toContain("labelClassName={SOCIAL_STORY_SEND_CELL_NAME_CLASS}");
  });

  it("keeps 24Frame AI when nobody else is available", () => {
    const html = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: true,
        onClose: () => undefined,
        directory: [],
      }),
    );
    expect(html).not.toContain("data-social-story-send-empty");
    expect(html).not.toContain(SOCIAL.stories.sendEmpty);
    expect(html).toContain('data-social-story-send-cell="24frame-ai"');
    const missed = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: true,
        onClose: () => undefined,
        directory: [],
        initialQuery: "zzzz",
      }),
    );
    expect(missed).toContain("data-social-story-send-empty");
    expect(missed).toContain(SOCIAL.search.noResults);
  });

  it("centers a dark Sent capsule and does not use the bottom notice", () => {
    const src = readFileSync("src/components/social/social-story-send-sheet.tsx", "utf8");
    const viewer = readFileSync("src/components/social/social-story-viewer.tsx", "utf8");
    const toastSrc = readFileSync("src/components/social/social-story-sent-toast.tsx", "utf8");
    const closeAt = src.indexOf("if (outcome.close)");
    const sentAt = src.indexOf("onSent?.()");
    const errAt = src.indexOf("setError(outcome.error)");
    expect(closeAt).toBeGreaterThan(-1);
    expect(sentAt).toBeGreaterThan(closeAt);
    expect(errAt).toBeGreaterThan(sentAt);
    expect(src.slice(errAt)).not.toContain("onSent");
    expect(viewer).toContain("STORY_SEND_TOAST_MS");
    expect(viewer).toContain("setSentToast(true)");
    expect(toastSrc).toContain("z-[60]");
    expect(toastSrc).toContain("inset-0");
    expect(toastSrc).toContain("items-center");
    expect(toastSrc).toContain("justify-center");
    expect(toastSrc).toContain("bg-[#181820]");
    expect(toastSrc).toContain("px-4");
    expect(toastSrc).toContain("py-2");
    expect(toastSrc).toContain("rounded-[8px]");
    expect(toastSrc).not.toContain("InlineNotice");
    expect(toastSrc).not.toContain("bottom-");
    const html = renderToStaticMarkup(createElement(SocialStorySentToast));
    expect(html).toContain("data-social-story-sent-toast");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("bg-[#181820]");
    expect(html).toContain(SOCIAL.stories.sent);
    expect(html).not.toContain("bottom-");
    expect(html).not.toMatch(/confetti|text-green|bg-green|shadow-lg|shadow-md|InlineNotice/);
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      createElement(SocialStorySendSheet, {
        storyId: "s1",
        open: false,
        onClose: () => undefined,
        directory: [person],
      }),
    );
    expect(html).toBe("");
  });
});
