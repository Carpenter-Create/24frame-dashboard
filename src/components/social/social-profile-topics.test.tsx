import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { SOCIAL_CATEGORY_TOPICS, sortTopicsAlpha } from "@/lib/social-categories";
import {
  SOCIAL_PROFILE_CHIP_FACE_CLASS,
  SOCIAL_TOPIC_CHIP_BANK_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_PROFILE_TOPICS_MAX } from "@/lib/social-profile-topics";
import { SocialProfileTopicsEditor, SocialProfileTopicsField } from "./social-profile-topics";

describe("SocialProfileTopicsField", () => {
  it("renders Topics search and selected house chips, never Professions slugs or checkboxes", () => {
    const html = renderToStaticMarkup(
      <SocialProfileTopicsField value={["Acting", "Financing"]} onChange={() => undefined} />,
    );
    expect(html).toContain("data-social-profile-edit-topics");
    expect(html).toContain("data-social-profile-chip-face");
    expect(html).toContain(SOCIAL_PROFILE_CHIP_FACE_CLASS);
    expect(html).toContain(SOCIAL.profile.topicsSearch);
    expect(html).toContain(SOCIAL.profile.topicsHint);
    expect(html).toContain("data-social-profile-edit-topics-count");
    expect(html).toContain("2 / 8");
    expect(html).toContain('id="social-edit-topics-search"');
    expect(html).toContain('aria-label="Search topics"');
    expect(html).toContain("data-social-profile-edit-topics-selected");
    expect(html).toContain('data-social-profile-topic-chip="Acting"');
    expect(html).toContain("Acting");
    expect(html).toContain("Financing");
    expect(html).toContain(SOCIAL_TOPIC_CHIP_BANK_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_CHIP_SELECT_IDLE_CLASS);
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("t-body-sm");
    expect(html).not.toContain("text-[11px]");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("type=\"checkbox\"");
    expect(html).not.toContain("Professions");
    expect(html).not.toContain("Actor");
    expect(html).not.toContain(SOCIAL.profile.roles);
    expect(html).not.toContain("t-label");
  });

  it("omits selected chips when empty", () => {
    const html = renderToStaticMarkup(
      <SocialProfileTopicsField value={[]} onChange={() => undefined} />,
    );
    expect(html).toContain(SOCIAL.profile.topicsHint);
    expect(html).toContain("0 / 8");
    expect(html).not.toContain("data-social-profile-edit-topics-selected");
    expect(html).not.toContain(SOCIAL.profile.topicsLimit);
    expect(html).not.toContain("type=\"checkbox\"");
    const chips = [...html.matchAll(/data-social-profile-topic="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(chips).toEqual([...SOCIAL_CATEGORY_TOPICS]);
    expect(chips).toEqual(sortTopicsAlpha(chips));
  });

  it("blocks a ninth Topics pick with the locked notice and keeps extras already saved", () => {
    const atCap = SOCIAL_CATEGORY_TOPICS.slice(0, SOCIAL_PROFILE_TOPICS_MAX);
    const over = SOCIAL_CATEGORY_TOPICS.slice(0, SOCIAL_PROFILE_TOPICS_MAX + 1);
    const capped = renderToStaticMarkup(
      <SocialProfileTopicsField value={atCap} onChange={() => undefined} />,
    );
    expect(capped).toContain(SOCIAL.profile.topicsLimit);
    expect(capped).toContain(SOCIAL.profile.topicsLimit);
    expect(capped).toContain("8 / 8");
    expect(capped).not.toContain(SOCIAL.profile.topicsHint);
    expect(capped).toContain("disabled");
    expect(capped).toContain('data-social-profile-topic-chip="Acting"');

    const kept = renderToStaticMarkup(
      <SocialProfileTopicsField value={over} onChange={() => undefined} />,
    );
    expect(kept).toContain(`data-social-profile-topic-chip="${over[8]}"`);
    expect(kept).toContain(SOCIAL.profile.topicsLimit);
  });

  it("opens Topics on the shared chip-select face with a back affordance", () => {
    const html = renderToStaticMarkup(
      <SocialProfileTopicsEditor
        value={["Acting"]}
        onChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-topics");
    expect(html).toContain("data-social-profile-topics-back");
    expect(html).toContain("data-social-profile-chip-face");
    expect(html).toContain(SOCIAL.profile.topics);
    expect(html).toContain(SOCIAL.profile.topicsSearch);
    expect(html).toContain('id="social-edit-topics-search"');
    expect(html).toContain("data-social-profile-edit-topics-selected");
    expect(html).toContain('data-social-icon="caret-left"');
  });
});
