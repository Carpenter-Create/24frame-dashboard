"use client";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { HOUSE_ASK_AI_HEADER_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_ASK_AI_MARK_CLASS } from "@/lib/house-phone-shell";
import { HouseAiMark } from "./house-ai-mark";
import { AskAiOpenButton } from "./ask-ai-overlay";

// Same Ask 24Frame AI product as the shell overlay. Header entry so
// Home, Social, Education, and Aggregation toggle one panel via
// AskAiOpenButton toggle → openAskAi / closeAskAi on the current
// path + overlay query. Never a workspace hop. Never a second
// window. Glyph is the house Adam sparkle cluster.
// H register (Adam 2026-10-05, decision 1): a round grey 44 with
// the 20 accent sparkle (one stroke mark on phone and desktop). No
// visible label at any width: "Ask 24Frame AI" is the accessible name
// and the tooltip. Bell and search keep the button's ink.
export function AskAssistantHeaderLink() {
  return (
    <AskAiOpenButton
      aria-label={ASK_FRAME_AI.headline}
      title={ASK_FRAME_AI.headline}
      data-ask-assistant-header=""
      toggle
      className={HOUSE_ASK_AI_HEADER_CLASS}
    >
      <HouseAiMark className={HOUSE_ASK_AI_MARK_CLASS} register="stroke" />
    </AskAiOpenButton>
  );
}
