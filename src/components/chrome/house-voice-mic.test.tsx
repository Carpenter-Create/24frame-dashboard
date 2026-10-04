import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HouseVoiceMic } from "./house-voice-mic";
import { cn } from "@/lib/cn";
import { FORM_CONTROL_FOCUS_CLASS, HOUSE_VOICE_MIC_CLASS } from "@/lib/form-control";
import { HOUSE_VOICE } from "@/lib/house-voice";
import {
  SOCIAL_WRITE_COMPOSE_MIC_CLASS,
  SOCIAL_WRITE_COMPOSE_MIC_LISTENING_CLASS,
  SOCIAL_WRITE_COMPOSE_MIC_RECORDING_CLASS,
  SOCIAL_WRITE_VOICE_HERO_CLASS,
  SOCIAL_WRITE_VOICE_HERO_LISTENING_CLASS,
  SOCIAL_WRITE_VOICE_HERO_RECORDING_CLASS,
} from "@/lib/social-chrome";

const src = readFileSync("src/components/chrome/house-voice-mic.tsx", "utf8");

describe("HouseVoiceMic graceful fallback", () => {
  it("hides the circular mic when SpeechRecognition is unsupported", () => {
    const hidden = renderToStaticMarkup(
      createElement(HouseVoiceMic, {
        surface: "search",
        workspace: "social",
        supported: false,
        getValue: () => "",
        onValue: () => undefined,
      }),
    );
    expect(hidden).toBe("");
    expect(hidden).not.toContain("data-house-voice-mic");
  });

  it("renders a circular mic with calm focus when supported", () => {
    const html = renderToStaticMarkup(
      createElement(HouseVoiceMic, {
        surface: "search",
        workspace: "social",
        supported: true,
        getValue: () => "",
        onValue: () => undefined,
      }),
    );
    expect(html).toContain('data-house-voice-mic="search"');
    expect(html).toContain(HOUSE_VOICE.search);
    expect(html).toContain(HOUSE_VOICE_MIC_CLASS);
    expect(html).toContain(FORM_CONTROL_FOCUS_CLASS);
    expect(html).toContain("rounded-full");
    expect(html).not.toContain("ring-accent");
    expect(html).not.toContain("focus:ring-2");
    expect(html).not.toContain("focus:ring-accent");
  });

  it("uses dictate labeling on the Social composer surface", () => {
    const html = renderToStaticMarkup(
      createElement(HouseVoiceMic, {
        surface: "dictate",
        workspace: "social",
        supported: true,
        getValue: () => "",
        onValue: () => undefined,
      }),
    );
    expect(html).toContain('data-house-voice-mic="dictate"');
    expect(html).toContain(HOUSE_VOICE.dictate);
  });

  it("puts the recording glyph on the 10% tint in --accent-ink, not Sporty Blue (founder pick 2026-10-04)", () => {
    // bg-accent/10 over the white compose paints the wash: --accent glyph
    // there is 4.07:1, --accent-ink 4.61:1 painted. Tint and ring stay --accent.
    for (const recording of [SOCIAL_WRITE_VOICE_HERO_RECORDING_CLASS, SOCIAL_WRITE_COMPOSE_MIC_RECORDING_CLASS]) {
      expect(recording).toBe("bg-accent/10 text-accent-ink ring-2 ring-accent");
    }
    // What the button actually gets (cn merges the idle ink and the hero fill away).
    const hero = cn(SOCIAL_WRITE_VOICE_HERO_CLASS, SOCIAL_WRITE_VOICE_HERO_LISTENING_CLASS, SOCIAL_WRITE_VOICE_HERO_RECORDING_CLASS).split(" ");
    const footer = cn(
      cn(SOCIAL_WRITE_COMPOSE_MIC_CLASS, FORM_CONTROL_FOCUS_CLASS),
      SOCIAL_WRITE_COMPOSE_MIC_LISTENING_CLASS,
      SOCIAL_WRITE_COMPOSE_MIC_RECORDING_CLASS,
    ).split(" ");
    for (const merged of [hero, footer]) {
      expect(merged).toEqual(expect.arrayContaining(["bg-accent/10", "text-accent-ink", "ring-accent"]));
      expect(merged).not.toContain("text-accent");
      expect(merged).not.toContain("text-ink");
      expect(merged.filter((c) => c.startsWith("bg-"))).toEqual(["bg-accent/10"]);
    }
    expect(src).toContain("hero && recording && SOCIAL_WRITE_VOICE_HERO_RECORDING_CLASS");
    expect(src).toContain("footer && recording && SOCIAL_WRITE_COMPOSE_MIC_RECORDING_CLASS");
  });

  it("does not restart a closed-over recognizer after error or a newer start", () => {
    expect(src).toContain("recRef.current !== rec");
    expect(src).toContain("recRef.current === rec");
    expect(src).toContain("speechRecognitionErrorEndsSession");
    expect(src).toContain("spokenRef");
  });
});
