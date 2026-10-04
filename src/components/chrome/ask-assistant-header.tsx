"use client";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import {
  HOUSE_ASK_AI_HEADER_CLASS,
  HOUSE_ASK_AI_HEADER_LABEL_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_ASK_AI_MARK_DESKTOP_CLASS,
  HOUSE_ASK_AI_MARK_PHONE_CLASS,
} from "@/lib/house-phone-shell";
import { HouseAiMark } from "./house-ai-mark";
import { AskAiOpenButton } from "./ask-ai-overlay";

// Same Ask 24Frame AI product as the shell overlay. Header entry so
// Home, Social, Education, and Aggregation toggle one panel via
// AskAiOpenButton toggle → openAskAi / closeAskAi on the current
// path + overlay query. Never a workspace hop. Never a second
// window. Glyph is the house Adam sparkle cluster. Phone trailing
// is Regular-stroke; desktop header stays filled. The sparkle is
// accent on phone and desktop, in both desktop forms (Adam
// 2026-10-04, "Blue, as in the mockup"); bell and search keep their
// idle ink. From xl the same control shows the headline as a
// visible label (shell-unified-chrome-lock-v1); below xl it is the
// icon-only circle and the headline stays the accessible name.
export function AskAssistantHeaderLink() {
  return (
    <AskAiOpenButton
      aria-label={ASK_FRAME_AI.headline}
      data-ask-assistant-header=""
      toggle
      className={HOUSE_ASK_AI_HEADER_CLASS}
    >
      <HouseAiMark className={HOUSE_ASK_AI_MARK_PHONE_CLASS} register="stroke" />
      <HouseAiMark className={HOUSE_ASK_AI_MARK_DESKTOP_CLASS} register="fill" />
      <span aria-hidden="true" data-ask-assistant-header-label="" className={HOUSE_ASK_AI_HEADER_LABEL_CLASS}>
        {ASK_FRAME_AI.headline}
      </span>
    </AskAiOpenButton>
  );
}
