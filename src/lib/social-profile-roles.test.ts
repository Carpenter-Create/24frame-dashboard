import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { sortByLabelAlpha } from "@/lib/social-categories";
import {
  SOCIAL_PROFILE_ROLES,
  SOCIAL_PROFILE_ROLES_COUNT,
  SOCIAL_PROFILE_ROLES_MAX,
  SOCIAL_PROFILE_ROLE_GROUPS,
  SOCIAL_PROFILE_ROLE_SLUG_ALIASES,
  canonicalSocialProfileRoleSlug,
  filterSocialProfileRoleGroups,
  moveSocialProfileRole,
  parseSocialProfileRoles,
  socialProfileRoleChips,
  socialProfileRoleLabel,
  socialProfileRolesCountLabel,
  socialProfileRolesRailItems,
  socialProfileRolesRowSummary,
  socialProfileRolesSelectedLabel,
  socialProfileRolesWrite,
  toggleSocialProfileRole,
} from "./social-profile-roles";

describe("social profile roles", () => {
  it("locks an IMDb-shaped bank with Writer credit compounds and Investor", () => {
    const slugs = SOCIAL_PROFILE_ROLES.map((role) => role.slug);
    const labels = SOCIAL_PROFILE_ROLES.map((role) => role.label);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(105);
    expect(SOCIAL_PROFILE_ROLE_GROUPS).toHaveLength(13);
    expect(socialProfileRoleLabel("actor")).toBe("Actor");
    expect(socialProfileRoleLabel("actress")).toBe("Actress");
    expect(socialProfileRoleLabel("writer")).toBe("Writer");
    expect(socialProfileRoleLabel("screenwriter")).toBe("Screenwriter");
    expect(socialProfileRoleLabel("head_writer")).toBe("Head Writer");
    expect(socialProfileRoleLabel("story_editor")).toBe("Story Editor");
    expect(socialProfileRoleLabel("writer_screenplay")).toBe("Writer: Screenplay");
    expect(socialProfileRoleLabel("writer_story")).toBe("Writer: Story");
    expect(socialProfileRoleLabel("writer_written_by")).toBe("Writer: Written by");
    expect(socialProfileRoleLabel("writer_teleplay")).toBe("Writer: Teleplay");
    expect(socialProfileRoleLabel("writer_screen_story")).toBe("Writer: Screen Story");
    expect(socialProfileRoleLabel("cinematographer")).toBe("Cinematographer");
    expect(socialProfileRoleLabel("executive_producer")).toBe("Executive Producer");
    expect(socialProfileRoleLabel("investor")).toBe("Investor");
    expect(labels).toContain("Actress");
    expect(labels.join(" ")).not.toContain("Cinematographer / DP");
    expect(labels.join(" ")).not.toContain("Host / Presenter");
    expect(labels.join(" ")).not.toContain("PrefViz");
    expect(slugs).not.toContain("previs");
    expect(SOCIAL_PROFILE_ROLES_MAX).toBe(5);
    expect(SOCIAL_PROFILE_ROLES_COUNT).toBe("{n} / {max}");
    expect(socialProfileRolesCountLabel(3)).toBe("3 / 5");
    expect(socialProfileRolesSelectedLabel(5)).toBe("5 selected");
    expect(socialProfileRolesRowSummary([])).toBe("Add");
    expect(socialProfileRolesRowSummary(["executive_producer"])).toBe("Executive Producer");
    expect(
      socialProfileRolesRowSummary([
        "executive_producer",
        "music_supervisor",
        "composer",
        "executive",
        "investor",
      ]),
    ).toBe("Executive Producer +4");
    expect(
      SOCIAL_PROFILE_ROLE_GROUPS.map((group) => [
        group.id,
        group.roles.map((role) => `${role.slug} — ${role.label}`),
      ]),
    ).toEqual([
      [
        "actor",
        [
          "actor — Actor",
          "actress — Actress",
          "voice_actor — Voice Actor",
          "stunt_performer — Stunt Performer",
          "choreographer — Choreographer",
        ],
      ],
      [
        "writer",
        [
          "writer — Writer",
          "screenwriter — Screenwriter",
          "head_writer — Head Writer",
          "story_editor — Story Editor",
          "executive_story_editor — Executive Story Editor",
          "staff_writer — Staff Writer",
          "script_writer — Script Writer",
          "supervising_writer — Supervising Writer",
          "creator — Creator",
          "dramaturge — Dramaturge",
          "script_editor — Script Editor",
          "story_coordinator — Story Coordinator",
          "writer_written_by — Writer: Written by",
          "writer_screenplay — Writer: Screenplay",
          "writer_story — Writer: Story",
          "writer_teleplay — Writer: Teleplay",
          "writer_screen_story — Writer: Screen Story",
        ],
      ],
      [
        "director",
        [
          "director — Director",
          "supervising_director — Supervising Director",
          "executive_director — Executive Director",
          "second_unit_director — Second Unit Director",
          "assistant_director — Assistant Director",
          "script_supervisor — Script Supervisor",
        ],
      ],
      [
        "producer",
        [
          "producer — Producer",
          "executive_producer — Executive Producer",
          "coordinating_producer — Coordinating Producer",
          "line_producer — Line Producer",
          "supervising_producer — Supervising Producer",
          "associate_producer — Associate Producer",
          "field_producer — Field Producer",
          "story_producer — Story Producer",
          "development_producer — Development Producer",
          "post_production_producer — Post Production Producer",
          "showrunner — Showrunner",
        ],
      ],
      [
        "camera",
        [
          "cinematographer — Cinematographer",
          "director_of_photography — Director of Photography",
          "camera_operator — Camera Operator",
          "steadicam_operator — Steadicam Operator",
          "gaffer — Gaffer",
          "grip — Grip",
          "first_assistant_camera — First Assistant Camera",
        ],
      ],
      [
        "editorial",
        [
          "editor — Editor",
          "supervising_editor — Supervising Editor",
          "assistant_editor — Assistant Editor",
          "post_producer — Post Producer",
          "post_production_supervisor — Post-Production Supervisor",
          "colorist — Colorist",
          "digital_colorist — Digital Colorist",
        ],
      ],
      [
        "art",
        [
          "production_designer — Production Designer",
          "art_director — Art Director",
          "creative_director — Creative Director",
          "storyboard_artist — Storyboard Artist",
          "set_designer — Set Designer",
          "set_decorator — Set Decorator",
          "property_master — Property Master",
          "costume_designer — Costume Designer",
          "costume_supervisor — Costume Supervisor",
          "makeup_artist — Makeup Artist",
          "hairdresser — Hairdresser",
          "hair_and_makeup_artist — Hair and Makeup Artist",
        ],
      ],
      [
        "sound",
        [
          "sound_mixer — Sound Mixer",
          "boom_operator — Boom Operator",
          "re_recording_mixer — Re-Recording Mixer",
          "sound_editor — Sound Editor",
          "sound_supervisor — Sound Supervisor",
          "composer — Composer",
          "music_director — Music Director",
          "musician — Musician",
          "music_supervisor — Music Supervisor",
          "soundtrack — Soundtrack",
          "music_artist — Music Artist",
        ],
      ],
      [
        "visual_effects",
        [
          "visual_effects_supervisor — Visual Effects Supervisor",
          "visual_effects_artist — Visual Effects Artist",
          "visual_effects_editor — Visual Effects Editor",
          "motion_graphics_artist — Motion Graphics Artist",
          "animator — Animator",
          "animation_director — Animation Director",
          "special_effects_technician — Special Effects Technician",
          "special_effects_supervisor — Special Effects Supervisor",
        ],
      ],
      [
        "production",
        [
          "production_coordinator — Production Coordinator",
          "production_assistant — Production Assistant",
          "production_manager — Production Manager",
          "location_manager — Location Manager",
          "intimacy_coordinator — Intimacy Coordinator",
          "script_consultant — Script Consultant",
          "talent_coordinator — Talent Coordinator",
        ],
      ],
      ["casting", ["casting_director — Casting Director", "casting_associate — Casting Associate"]],
      [
        "digital",
        [
          "digital_creator — Digital Creator",
          "influencer — Influencer",
          "podcaster — Podcaster",
        ],
      ],
      [
        "business",
        [
          "executive — Executive",
          "lawyer — Lawyer",
          "attorney — Attorney",
          "publicist — Publicist",
          "talent_agent — Talent Agent",
          "manager — Manager",
          "accountant — Accountant",
          "production_accountant — Production Accountant",
          "investor — Investor",
        ],
      ],
    ]);
  });

  it("maps renamed slugs and keeps unknown legacy slugs displayable", () => {
    expect(canonicalSocialProfileRoleSlug("steadicam")).toBe("steadicam_operator");
    expect(SOCIAL_PROFILE_ROLE_SLUG_ALIASES.previs).toBe("storyboard_artist");
    expect(parseSocialProfileRoles(["producer", "actor", "producer", "host"])).toEqual([
      "producer",
      "actor",
      "host",
    ]);
    expect(parseSocialProfileRoles(["steadicam", "vfx_supervisor", "prop_master"])).toEqual([
      "steadicam_operator",
      "visual_effects_supervisor",
      "property_master",
    ]);
    expect(
      parseSocialProfileRoles(["actor", "producer", "writer", "director", "editor", "investor"]),
    ).toEqual(["actor", "producer", "writer", "director", "editor"]);
    expect(parseSocialProfileRoles('["screenwriter","investor"]')).toEqual([
      "screenwriter",
      "investor",
    ]);
    expect(parseSocialProfileRoles("")).toEqual([]);
    expect(parseSocialProfileRoles(null)).toEqual([]);
    expect(socialProfileRoleLabel("host")).toBe("Host");
    expect(socialProfileRoleLabel("dit")).toBe("DIT");
    expect(socialProfileRoleLabel("previs")).toBe("Storyboard Artist");
    expect(socialProfileRoleLabel("co_executive_producer")).toBe("Co Executive Producer");
    expect(socialProfileRoleChips(["host", "cinematographer"])).toEqual([
      { slug: "cinematographer", label: "Cinematographer" },
      { slug: "host", label: "Host" },
    ]);
  });

  it("writes crafts plus primary_role as the first selected slug", () => {
    expect(socialProfileRolesWrite(["director", "producer"])).toEqual({
      crafts: ["director", "producer"],
      primary_role: "director",
    });
    expect(socialProfileRolesWrite(["tv_writer", "host"])).toEqual({
      crafts: ["writer", "host"],
      primary_role: "writer",
    });
    expect(socialProfileRolesWrite([])).toEqual({ crafts: [], primary_role: null });
  });

  it("toggles in selection order and refuses a sixth", () => {
    expect(toggleSocialProfileRole([], "actor")).toEqual(["actor"]);
    expect(toggleSocialProfileRole(["actor"], "actor")).toEqual([]);
    expect(toggleSocialProfileRole(["actor"], "producer")).toEqual(["actor", "producer"]);
    expect(toggleSocialProfileRole(["host"], "host")).toEqual([]);
    expect(
      toggleSocialProfileRole(
        ["actor", "producer", "director", "editor", "investor"],
        "screenwriter",
      ),
    ).toEqual(["actor", "producer", "director", "editor", "investor"]);
    expect(toggleSocialProfileRole(["actor"], "nope")).toEqual(["actor"]);
  });

  it("lists every selected Role on the profile rail and omits when empty", () => {
    expect(socialProfileRolesRailItems([])).toEqual([]);
    expect(socialProfileRolesRailItems(null)).toEqual([]);
    expect(socialProfileRolesRailItems(["actor"])).toEqual([
      { kind: "role", slug: "actor", label: "Actor" },
    ]);
    expect(socialProfileRolesRailItems(["actor", "producer"])).toEqual([
      { kind: "role", slug: "actor", label: "Actor" },
      { kind: "role", slug: "producer", label: "Producer" },
    ]);
    expect(socialProfileRolesRailItems(["actor", "producer", "screenwriter"])).toEqual([
      { kind: "role", slug: "actor", label: "Actor" },
      { kind: "role", slug: "producer", label: "Producer" },
      { kind: "role", slug: "screenwriter", label: "Screenwriter" },
    ]);
    expect(
      socialProfileRolesRailItems(["actor", "producer", "screenwriter", "investor"]),
    ).toEqual([
      { kind: "role", slug: "actor", label: "Actor" },
      { kind: "role", slug: "investor", label: "Investor" },
      { kind: "role", slug: "producer", label: "Producer" },
      { kind: "role", slug: "screenwriter", label: "Screenwriter" },
    ]);
    const five = socialProfileRolesRailItems([
      "executive_producer",
      "music_supervisor",
      "composer",
      "musician",
      "music_director",
    ]);
    expect(five).toEqual([
      { kind: "role", slug: "composer", label: "Composer" },
      { kind: "role", slug: "executive_producer", label: "Executive Producer" },
      { kind: "role", slug: "music_director", label: "Music Director" },
      { kind: "role", slug: "music_supervisor", label: "Music Supervisor" },
      { kind: "role", slug: "musician", label: "Musician" },
    ]);
    expect(five).toHaveLength(5);
    expect(five.every((item) => item.kind === "role")).toBe(true);
    expect(five.map((role) => role.label)).toEqual(
      sortByLabelAlpha(five, (role) => role.label).map((role) => role.label),
    );
    expect(socialProfileRolesRailItems(["investor", "actor", "producer"]).map((role) => role.slug)).toEqual([
      "actor",
      "investor",
      "producer",
    ]);
    expect(parseSocialProfileRoles(["investor", "actor", "producer"])).toEqual([
      "investor",
      "actor",
      "producer",
    ]);
    expect(socialProfileRolesRailItems(["screenwriter", "investor"]).map((role) => role.slug)).toEqual([
      "investor",
      "screenwriter",
    ]);
  });

  it("lists every selected Profession A→Z for display and moves persisted order by id", () => {
    expect(socialProfileRoleChips([])).toEqual([]);
    expect(socialProfileRoleChips(["actor"])).toEqual([{ slug: "actor", label: "Actor" }]);
    expect(socialProfileRolesRailItems([])).toEqual([]);
    expect(socialProfileRolesRailItems(["actor", "producer"])).toEqual([
      { kind: "role", slug: "actor", label: "Actor" },
      { kind: "role", slug: "producer", label: "Producer" },
    ]);
    expect(
      socialProfileRoleChips(["actor", "producer", "screenwriter", "investor", "director"]),
    ).toEqual([
      { slug: "actor", label: "Actor" },
      { slug: "director", label: "Director" },
      { slug: "investor", label: "Investor" },
      { slug: "producer", label: "Producer" },
      { slug: "screenwriter", label: "Screenwriter" },
    ]);
    expect(socialProfileRoleChips(["dit", "director"]).map((role) => role.label)).toEqual([
      "Director",
      "DIT",
    ]);
    expect(moveSocialProfileRole(["actor", "producer", "director"], "director", "actor")).toEqual([
      "director",
      "actor",
      "producer",
    ]);
    expect(moveSocialProfileRole(["actor", "producer"], "actor", "actor")).toEqual([
      "actor",
      "producer",
    ]);
    expect(moveSocialProfileRole(["actor"], "nope", "actor")).toEqual(["actor"]);
  });

  it("filters groups by label or slug and hides empty groups", () => {
    const hits = filterSocialProfileRoleGroups("invest");
    expect(hits.map((group) => group.id)).toEqual(["business"]);
    expect(hits[0]?.roles.map((role) => role.slug)).toEqual(["investor"]);
    expect(filterSocialProfileRoleGroups("cast").map((group) => group.id)).toEqual([
      "casting",
      "digital",
    ]);
    expect(filterSocialProfileRoleGroups("screenplay").map((group) => group.id)).toEqual(["writer"]);
    expect(
      filterSocialProfileRoleGroups("screenplay")[0]?.roles.map((role) => role.slug),
    ).toEqual(["writer_screenplay"]);
    expect(filterSocialProfileRoleGroups("zzzz")).toEqual([]);
  });

  it("keeps one professions SoT and a sync select/write path", () => {
    const rolesSrc = readFileSync("src/lib/social-profile-roles.ts", "utf8");
    const affinitySrc = readFileSync("src/lib/social-role-affinity.ts", "utf8");
    const fieldSrc = readFileSync("src/components/social/social-profile-roles.tsx", "utf8");
    const editSrc = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
    const chromeSrc = readFileSync("src/lib/social-chrome.ts", "utf8");
    const identitySrc = readFileSync("src/components/social/social-profile-identity.tsx", "utf8");
    expect(rolesSrc).toContain("socialProfileRolesRailItems");
    expect(rolesSrc).not.toContain("socialProfileRolesFace");
    expect(rolesSrc).not.toContain("socialProfileRolesMoreLabel");
    expect(rolesSrc).not.toContain("socialProfileRolesLine");
    expect(rolesSrc).not.toContain("SOCIAL_PROFILE_ROLES_SEP");
    expect(rolesSrc).not.toContain("SOCIAL_PROFILE_ROLES_DISPLAY_CAP");
    expect(rolesSrc).not.toContain('kind: "more"');
    expect(chromeSrc).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_FACE_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_LINKS_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_LINK_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_LINKS_MORE_CLASS");
    expect(chromeSrc).toContain("never +N");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_STATS_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_STATS_GRID_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_ROLES_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_ROLES_RAIL_ROWS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_ROLE_PILL_CLASS");
    expect(chromeSrc).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(chromeSrc).toContain("HOUSE_CHIP_RAIL_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_ROLES_RAIL_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_ROLES_LINE_CLASS");
    expect(chromeSrc).not.toContain("SOCIAL_PROFILE_ROLES_PILL_CLASS");
    expect(identitySrc).toContain("socialProfileRolesRailItems");
    // Stage lock: wrapping chips, not the one-row scroll rail.
    expect(identitySrc).not.toContain("HouseChipRail");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ROLES_CLASS");
    expect(identitySrc).not.toContain("socialProfileRolesLine");
    expect(identitySrc).not.toContain("data-social-profile-roles-more");
    expect(identitySrc).not.toContain('item.kind === "more"');
    expect(identitySrc).toContain("data-social-profile-head");
    expect(identitySrc).not.toContain("data-social-profile-meta");
    expect(identitySrc).toContain("data-social-profile-actions");
    expect(identitySrc).toContain("SOCIAL_PROFILE_FACE_CLASS");
    expect(identitySrc).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(identitySrc).not.toContain("SOCIAL_PROFILE_ROLES_RAIL_CLASS");
    const rolesBlock = identitySrc.slice(
      identitySrc.indexOf('data-social-profile-roles=""'),
      identitySrc.indexOf("<SocialProfileLinkRow"),
    );
    expect(rolesBlock).toContain("className={SOCIAL_PROFILE_ROLES_CLASS}");
    expect(rolesBlock).toContain("data-social-profile-role={item.slug}");
    expect(rolesSrc.match(/export const SOCIAL_PROFILE_ROLE_GROUPS/g)).toEqual([
      "export const SOCIAL_PROFILE_ROLE_GROUPS",
    ]);
    expect(affinitySrc).toContain("SOCIAL_PROFILE_ROLE_GROUPS");
    expect(affinitySrc).toContain("satisfies Record<SocialProfileRoleGroupId");
    expect(affinitySrc).not.toContain('slug: "actor"');
    expect(rolesSrc).toContain("sortByLabelAlpha");
    expect(rolesSrc).not.toContain("localeCompare");
    expect(fieldSrc).toContain("socialProfileRoleChips");
    expect(fieldSrc).not.toContain("localeCompare");
    expect(fieldSrc).toContain("toggleSocialProfileRole");
    expect(fieldSrc).toContain("onChange(toggleSocialProfileRole");
    expect(fieldSrc).toContain("SocialProfileRolesEditor");
    expect(fieldSrc).toContain("SocialProfileChipSelectFace");
    expect(fieldSrc).toContain("SocialProfileEditFace");
    expect(fieldSrc).not.toContain("createSocialProfile");
    expect(fieldSrc).not.toContain("await");
    const saveSoT = readFileSync("src/lib/social-profile-edit.ts", "utf8");
    expect(saveSoT).toContain('form.set("crafts"');
    expect(saveSoT).toContain("parseSocialProfileRoles");
    expect(editSrc).toContain("checkSocialProfileEditSave");
    expect(editSrc).toContain("SettingsDrillRow");
    expect(editSrc).toContain("socialProfileRolesRowSummary");
    expect(editSrc).toContain("SocialProfileRolesEditor");
    expect(editSrc).toContain("onChange={setRoles}");
    expect(editSrc).not.toContain("SocialProfileRolesField");
    expect(editSrc).not.toContain("createSocialProfile");
    expect(editSrc).toContain("persistSocialProfileEdit");
    expect(socialProfileRolesWrite.toString()).not.toMatch(/await|Promise|then/);
    expect(toggleSocialProfileRole.toString()).not.toMatch(/await|Promise|then/);
    expect(socialProfileRolesWrite(["actor", "producer"])).toEqual({
      crafts: ["actor", "producer"],
      primary_role: "actor",
    });
  });
});
