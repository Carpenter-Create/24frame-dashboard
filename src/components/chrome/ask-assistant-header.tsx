"use client";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { HOUSE_ASK_AI_HEADER_CLASS } from "@/lib/house-lead-chrome";
import {
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_CLASS,
} from "@/lib/house-phone-shell";
import { HouseAiMark } from "./house-ai-mark";
import { AskAiOpenButton } from "./ask-ai-overlay";

// Same Ask 24Frame AI product as the shell overlay. Header entry so
// Home, Social, Education, and Aggregation toggle one panel via
// AskAiOpenButton toggle → openAskAi / closeAskAi on the current
// path + overlay query. Never a workspace hop. Never a second
// window. Glyph is the house Adam sparkle cluster. Phone trailing
// is Regular-stroke; desktop header stays filled. Pressed ink
// follows open.
export function AskAssistantHeaderLink() {
  return (
    <AskAiOpenButton
      aria-label={ASK_FRAME_AI.headline}
      data-ask-assistant-header=""
      toggle
      className={HOUSE_ASK_AI_HEADER_CLASS}
    >
      <HouseAiMark className={HOUSE_HEADER_TRAILING_PHONE_CLASS} register="stroke" />
      <HouseAiMark className={HOUSE_HEADER_TRAILING_DESKTOP_CLASS} register="fill" />
    </AskAiOpenButton>
  );
}
