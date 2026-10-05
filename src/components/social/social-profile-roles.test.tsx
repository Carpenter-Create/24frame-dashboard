import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_PROFILE_CHIP_FACE_CLASS,
  SOCIAL_PROFILE_CHIP_GROUP_LABEL_CLASS,
  SOCIAL_TOPIC_CHIP_BANK_CLASS,
  SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS,
} from "@/lib/social-chrome";
import { SocialProfileRolesEditor, SocialProfileRolesField } from "./social-profile-roles";

describe("SocialProfileRolesField", () => {
  it("renders Professions search, grouped pill bank, and selected house chips in order", () => {
    const html = renderToStaticMarkup(
      <SocialProfileRolesField value={["investor", "actor"]} onChange={() => undefined} />,
    );
    expect(html).toContain("data-social-profile-edit-roles");
    expect(html).toContain("data-social-profile-chip-face");
    expect(html).toContain(SOCIAL_PROFILE_CHIP_FACE_CLASS);
    expect(html).toContain(SOCIAL.profile.rolesSearch);
    expect(html).toContain(SOCIAL.profile.rolesHint);
    expect(html).toContain("data-social-profile-edit-roles-count");
    expect(html).toContain("2 / 5");
    expect(html).toContain("draggable");
    expect(html).toContain('id="social-edit-roles-search"');
    expect(html).toContain("data-social-profile-edit-roles-selected");
    expect(html).toContain('data-social-profile-role-chip="investor"');
    expect(html).toContain('data-social-profile-role-chip="actor"');
    expect(html.indexOf('data-social-profile-role-chip="actor"')).toBeLessThan(
      html.indexOf('data-social-profile-role-chip="investor"'),
    );
    expect(html).toContain(SOCIAL_TOPIC_CHIP_SELECT_ON_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_CHIP_BANK_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_CHIP_GROUP_LABEL_CLASS);
    expect(html).toContain('data-social-profile-role-group="actor"');
    expect(html).toContain('data-social-profile-role-group="writer"');
    expect(html).toContain('data-social-profile-role-group="business"');
    expect(html).toContain('data-social-profile-role="actor"');
    expect(html).toContain('data-social-profile-role-selected=""');
    expect(html).toContain("Actor");
    expect(html).toContain("Actress");
    expect(html).toContain("Writer: Screenplay");
    expect(html).toContain("Writer: Story");
    expect(html).not.toContain("Category");
    expect(html).not.toContain("t-label");
    expect(html).not.toContain("uppercase");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("t-body-sm");
    expect(html).not.toContain("text-[11px]");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("type=\"checkbox\"");
  });

  it("sorts the selected profession chips A→Z and leaves the category bank grouped", () => {
    const html = renderToStaticMarkup(
      <SocialProfileRolesField
        value={[
          "executive_producer",
          "music_supervisor",
          "composer",
          "executive",
          "investor",
        ]}
        onChange={() => undefined}
      />,
    );
    const selected = html.slice(
      html.indexOf("data-social-profile-edit-roles-selected"),
      html.indexOf("data-social-profile-edit-roles-count"),
    );
    const order = [
      "composer",
      "executive",
      "executive_producer",
      "investor",
      "music_supervisor",
    ];
    let at = -1;
    for (const slug of order) {
      const next = selected.indexOf(`data-social-profile-role-chip="${slug}"`);
      expect(next, slug).toBeGreaterThan(at);
      at = next;
    }
    expect(html.indexOf('data-social-profile-role-group="actor"')).toBeLessThan(
      html.indexOf('data-social-profile-role-group="writer"'),
    );
    expect(html.indexOf('data-social-profile-role-group="writer"')).toBeLessThan(
      html.indexOf('data-social-profile-role-group="business"'),
    );
  });

  it("omits the selected-chip row when none are chosen", () => {
    const html = renderToStaticMarkup(
      <SocialProfileRolesField value={[]} onChange={() => undefined} />,
    );
    expect(html).toContain("0 / 5");
    expect(html).not.toContain("data-social-profile-edit-roles-selected");
    expect(html).not.toContain(SOCIAL.profile.rolesLimit);
    expect(html).not.toContain("type=\"checkbox\"");
  });

  it("shows the professions cap notice at 5 and keeps house chips", () => {
    const html = renderToStaticMarkup(
      <SocialProfileRolesField
        value={["actor", "producer", "director", "editor", "investor"]}
        onChange={() => undefined}
      />,
    );
    expect(html).toContain(SOCIAL.profile.rolesLimit);
    expect(html).toContain("5 / 5");
    expect(html).toContain(SOCIAL.profile.rolesLimit);
    expect(html).not.toContain(SOCIAL.profile.rolesHint);
    expect(html).toContain('data-social-profile-role-chip="investor"');
    expect(html).toContain("disabled");
  });

  it("keeps the existing chip bank on the professions select face with a back affordance", () => {
    const html = renderToStaticMarkup(
      <SocialProfileRolesEditor
        value={["investor", "actor"]}
        onChange={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(html).toContain("data-social-profile-roles");
    expect(html).toContain("data-social-profile-roles-back");
    expect(html).toContain("data-social-profile-edit-roles");
    expect(html).toContain(SOCIAL.profile.roles);
    expect(html).toContain(SOCIAL.profile.rolesSearch);
    expect(html).toContain('id="social-edit-roles-search"');
    expect(html).toContain("data-social-profile-edit-roles-selected");
    expect(html).toContain('data-social-profile-role-group="writer"');
    expect(html).toContain('data-social-icon="caret-left"');
  });

  it("shares the chip-select face SoT with Topics", () => {
    const rolesSrc = readFileSync("src/components/social/social-profile-roles.tsx", "utf8");
    const topicsSrc = readFileSync("src/components/social/social-profile-topics.tsx", "utf8");
    const faceSrc = readFileSync("src/components/social/social-profile-chip-select.tsx", "utf8");
    expect(rolesSrc).toContain("SocialProfileChipSelectFace");
    expect(topicsSrc).toContain("SocialProfileChipSelectFace");
    expect(faceSrc).toContain("export function SocialProfileChipSelectFace");
    expect(faceSrc).toContain("SOCIAL_PROFILE_CHIP_FACE_CLASS");
    expect(faceSrc).not.toContain("t-label");
  });
});
